import { useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { GizmoHelper, GizmoViewport, Grid, OrbitControls, Outlines } from "@react-three/drei";
import { useEditorStore } from "./store";
import {
  applyMouseDelta,
  backspace,
  computeResult,
  setAxis,
  startTransform,
  typeDigit,
  type Axis,
  type TransformMode,
  type TransformModalState,
} from "@/core/transformModal";
import type { SceneObject, Vec3 } from "@/core/document";

const FIELD_BY_MODE: Record<TransformMode, "position" | "rotation" | "scale"> = {
  grab: "position",
  rotate: "rotation",
  scale: "scale",
};
const KEY_TO_MODE: Record<string, TransformMode> = { g: "grab", r: "rotate", s: "scale" };

export default function Viewport() {
  const objects = useEditorStore((s) => s.history.present.scene.objects),
    selection = useEditorStore((s) => s.history.present.selection),
    select = useEditorStore((s) => s.select),
    editable = useEditorStore((s) => s.editable),
    preview = useEditorStore((s) => s.transformPreview),
    setPreview = useEditorStore((s) => s.setTransformPreview),
    setVector = useEditorStore((s) => s.setVector);
  const [modal, setModal] = useState<TransformModalState | null>(null);
  const hoveringRef = useRef(false);
  // Keydown/mousemove handlers only close over the latest values via this ref,
  // so the single window-level effect below never needs to be re-subscribed.
  const latestRef = useRef({ objects, selection, editable, modal, setVector, setPreview });
  latestRef.current = { objects, selection, editable, modal, setVector, setPreview };

  useEffect(() => {
    function selectedObject(): SceneObject | undefined {
      const { objects, selection } = latestRef.current;
      return objects.find((o) => o.id === selection[0]);
    }
    function updatePreview(state: TransformModalState) {
      const object = selectedObject();
      if (!object) return;
      const field = FIELD_BY_MODE[state.mode];
      latestRef.current.setPreview({ id: object.id, key: field, value: computeResult(state) });
    }
    function endModal() {
      setModal(null);
      latestRef.current.setPreview(null);
    }
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.matches("input,textarea,[contenteditable=true]")) return;
      const { editable, modal } = latestRef.current;
      if (!editable) return;
      if (!modal) {
        if (!hoveringRef.current) return;
        const mode = KEY_TO_MODE[e.key.toLowerCase()];
        const object = selectedObject();
        if (!mode || !object) return;
        e.preventDefault();
        setModal(startTransform(mode, object[FIELD_BY_MODE[mode]]));
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        endModal();
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const object = selectedObject();
        if (object)
          latestRef.current.setVector(object.id, FIELD_BY_MODE[modal.mode], computeResult(modal));
        endModal();
        return;
      }
      if (["x", "y", "z"].includes(e.key.toLowerCase())) {
        e.preventDefault();
        const next = setAxis(modal, e.key.toLowerCase() as Axis);
        setModal(next);
        updatePreview(next);
        return;
      }
      if (e.key === "Backspace") {
        e.preventDefault();
        const next = backspace(modal);
        setModal(next);
        updatePreview(next);
        return;
      }
      if (e.key.length === 1 && /^[0-9.-]$/.test(e.key)) {
        e.preventDefault();
        const next = typeDigit(modal, e.key);
        setModal(next);
        updatePreview(next);
      }
    }
    function onMouseMove(e: MouseEvent) {
      const { modal } = latestRef.current;
      if (!modal) return;
      const next = applyMouseDelta(modal, e.movementX);
      setModal(next);
      updatePreview(next);
    }
    function onMouseDown(e: MouseEvent) {
      const { modal } = latestRef.current;
      if (!modal) return;
      e.preventDefault();
      if (e.button === 2) {
        endModal();
        return;
      }
      if (e.button === 0) {
        const object = selectedObject();
        if (object)
          latestRef.current.setVector(object.id, FIELD_BY_MODE[modal.mode], computeResult(modal));
        endModal();
      }
    }
    function onContextMenu(e: MouseEvent) {
      if (latestRef.current.modal) e.preventDefault();
    }
    addEventListener("keydown", onKeyDown);
    addEventListener("mousemove", onMouseMove);
    addEventListener("mousedown", onMouseDown);
    addEventListener("contextmenu", onContextMenu);
    return () => {
      removeEventListener("keydown", onKeyDown);
      removeEventListener("mousemove", onMouseMove);
      removeEventListener("mousedown", onMouseDown);
      removeEventListener("contextmenu", onContextMenu);
    };
  }, []);

  function transformOf(o: SceneObject): { position: Vec3; rotation: Vec3; scale: Vec3 } {
    if (preview?.id === o.id) return { ...o, [preview.key]: preview.value };
    return o;
  }

  return (
    <div
      className="h-full w-full"
      onMouseEnter={() => (hoveringRef.current = true)}
      onMouseLeave={() => (hoveringRef.current = false)}
    >
      <Canvas camera={{ position: [5, 4, 6], fov: 50 }} onPointerMissed={() => {}}>
        <color attach="background" args={["#202226"]} />
        <ambientLight intensity={1.5} />
        <directionalLight position={[4, 8, 3]} intensity={2} />
        <Grid infiniteGrid fadeDistance={30} sectionColor="#6f737a" cellColor="#41444a" />
        <axesHelper args={[2]} />
        {objects
          .filter((o) => o.visible)
          .map((o) => {
            const t = transformOf(o);
            return (
              <mesh
                key={o.id}
                position={t.position}
                rotation={t.rotation}
                scale={t.scale}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!modal) select(o.id, e.shiftKey);
                }}
              >
                {o.type === "cube" ? (
                  <boxGeometry />
                ) : o.type === "sphere" ? (
                  <sphereGeometry args={[0.65, 32, 16]} />
                ) : (
                  <planeGeometry args={[2, 2]} />
                )}
                <meshStandardMaterial
                  color={selection.includes(o.id) ? "#f2a93b" : "#a9adb4"}
                  side={2}
                />
                {selection.includes(o.id) && <Outlines thickness={3} color="#f7bd55" />}
              </mesh>
            );
          })}
        <OrbitControls
          enabled={!modal}
          mouseButtons={{ LEFT: 0, MIDDLE: 0, RIGHT: 2 }}
          enableDamping
        />
        <GizmoHelper alignment="top-right" margin={[70, 70]}>
          <GizmoViewport axisColors={["#d85a5a", "#61ad68", "#5c81cf"]} labelColor="#f7f7f7" />
        </GizmoHelper>
      </Canvas>
    </div>
  );
}
