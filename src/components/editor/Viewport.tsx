import { useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import {
  GizmoHelper,
  GizmoViewport,
  Grid,
  OrbitControls,
  OrthographicCamera,
  PerspectiveCamera,
} from "@react-three/drei";
import * as THREE from "three";
import { WebGPURenderer } from "three/webgpu";
import { useEditorStore, type ViewAxis } from "./store";
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

const VIEW_DIRECTION: Record<ViewAxis, THREE.Vector3> = {
  front: new THREE.Vector3(0, 0, 1),
  right: new THREE.Vector3(1, 0, 0),
  top: new THREE.Vector3(0, 1, 0),
};
const NUMPAD_VIEW: Record<string, ViewAxis> = { "1": "front", "3": "right", "7": "top" };

// Numpad<n> is the natural key; with "emular teclado numérico" the matching
// top-row digit also works, for keyboards without a physical numpad.
function matchedDigit(e: KeyboardEvent, emulateNumpad: boolean): string | null {
  const numpad = /^Numpad([0-9])$/.exec(e.code);
  if (numpad?.[1]) return numpad[1];
  if (emulateNumpad) {
    const digit = /^Digit([0-9])$/.exec(e.code);
    if (digit?.[1]) return digit[1];
  }
  return null;
}

export default function Viewport() {
  const objects = useEditorStore((s) => s.history.present.scene.objects),
    selection = useEditorStore((s) => s.history.present.selection),
    select = useEditorStore((s) => s.select),
    editable = useEditorStore((s) => s.editable),
    emulateNumpad = useEditorStore((s) => s.emulateNumpad),
    preview = useEditorStore((s) => s.transformPreview),
    setPreview = useEditorStore((s) => s.setTransformPreview),
    setVector = useEditorStore((s) => s.setVector),
    setGraphicsMode = useEditorStore((s) => s.setGraphicsMode),
    ortho = useEditorStore((s) => s.ortho),
    setOrtho = useEditorStore((s) => s.setOrtho),
    viewRequest = useEditorStore((s) => s.viewRequest),
    requestView = useEditorStore((s) => s.requestView),
    requestToggleOrtho = useEditorStore((s) => s.requestToggleOrtho);
  const [modal, setModal] = useState<TransformModalState | null>(null);
  const hoveringRef = useRef(false);
  const cameraRef = useRef<THREE.PerspectiveCamera | THREE.OrthographicCamera | null>(null);
  const controlsRef = useRef<React.ComponentRef<typeof OrbitControls>>(null);
  const lastPositionRef = useRef<[number, number, number]>([5, 4, 6]);
  // Keydown/mousemove handlers only close over the latest values via this ref,
  // so the single window-level effect below never needs to be re-subscribed.
  const latestRef = useRef({
    objects,
    selection,
    editable,
    modal,
    emulateNumpad,
    setVector,
    setPreview,
    requestView,
    requestToggleOrtho,
  });
  latestRef.current = {
    objects,
    selection,
    editable,
    modal,
    emulateNumpad,
    setVector,
    setPreview,
    requestView,
    requestToggleOrtho,
  };

  // Reacts to view changes from anywhere — this Viewport's own hover-scoped
  // keyboard shortcuts, or the Visualizar menu (which has no notion of "which
  // viewport" and just broadcasts). Every mounted Viewport applies it to its
  // own camera; `ortho` itself is shared, but each keeps its own last
  // position so switching camera type doesn't jump.
  useEffect(() => {
    if (!viewRequest) return;
    if (viewRequest.type === "toggle-ortho") {
      const camera = cameraRef.current;
      if (camera) lastPositionRef.current = camera.position.toArray();
      setOrtho(!ortho);
      return;
    }
    const camera = cameraRef.current;
    if (!camera) return;
    const distance = camera.position.length() || 8;
    const direction = VIEW_DIRECTION[viewRequest.axis]
      .clone()
      .multiplyScalar(viewRequest.invert ? -1 : 1);
    camera.position.copy(direction).multiplyScalar(distance);
    camera.lookAt(0, 0, 0);
    controlsRef.current?.update();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewRequest]);

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
      const { editable, modal, emulateNumpad } = latestRef.current;
      if (!modal) {
        if (!hoveringRef.current) return;
        // Grabbing/rotating/scaling the scene needs edit rights; looking
        // around (view switches below) is fine for readers too.
        if (editable) {
          const mode = KEY_TO_MODE[e.key.toLowerCase()];
          const object = selectedObject();
          if (mode && object) {
            e.preventDefault();
            setModal(startTransform(mode, object[FIELD_BY_MODE[mode]]));
            return;
          }
        }
        const digit = matchedDigit(e, emulateNumpad);
        if (digit === "5") {
          e.preventDefault();
          latestRef.current.requestToggleOrtho();
          return;
        }
        const axis = digit ? NUMPAD_VIEW[digit] : undefined;
        if (axis) {
          e.preventDefault();
          latestRef.current.requestView(axis, e.ctrlKey || e.metaKey);
        }
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
      <Canvas
        onPointerMissed={() => {}}
        gl={async (defaultProps) => {
          // WebGPURenderer already falls back to a WebGL2 backend on its own
          // when WebGPU isn't available — this just reports which one it
          // actually picked, instead of guessing from `navigator.gpu` alone.
          const renderer = new WebGPURenderer({
            canvas: defaultProps.canvas as HTMLCanvasElement,
            antialias: defaultProps.antialias,
            alpha: defaultProps.alpha,
          });
          await renderer.init();
          const backend = (renderer as unknown as { backend?: { isWebGPUBackend?: boolean } })
            .backend;
          setGraphicsMode(backend?.isWebGPUBackend ? "WebGPU" : "Modo compatível — WebGL2");
          return renderer;
        }}
      >
        <color attach="background" args={["#202226"]} />
        <ambientLight intensity={1.5} />
        <directionalLight position={[4, 8, 3]} intensity={2} />
        <Grid infiniteGrid fadeDistance={30} sectionColor="#6f737a" cellColor="#41444a" />
        <axesHelper args={[2]} />
        {objects
          .filter((o) => o.visible)
          .map((o) => {
            const t = transformOf(o);
            const selected = selection.includes(o.id);
            return (
              <group key={o.id}>
                <mesh
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
                  <meshStandardMaterial color={selected ? "#f2a93b" : "#a9adb4"} side={2} />
                </mesh>
                {selected && (
                  // A plain scaled-up backface duplicate ("inverted hull"), not
                  // drei's <Outlines> — that uses a hand-written GLSL
                  // ShaderMaterial, which three.js's WebGPURenderer can't
                  // convert automatically, only its built-in material types.
                  <mesh
                    position={t.position}
                    rotation={t.rotation}
                    scale={t.scale.map((v) => v * 1.05) as Vec3}
                  >
                    {o.type === "cube" ? (
                      <boxGeometry />
                    ) : o.type === "sphere" ? (
                      <sphereGeometry args={[0.65, 32, 16]} />
                    ) : (
                      <planeGeometry args={[2, 2]} />
                    )}
                    <meshBasicMaterial color="#f7bd55" side={THREE.BackSide} />
                  </mesh>
                )}
              </group>
            );
          })}
        {ortho ? (
          <OrthographicCamera
            makeDefault
            position={lastPositionRef.current}
            zoom={80}
            ref={cameraRef as React.Ref<THREE.OrthographicCamera>}
          />
        ) : (
          <PerspectiveCamera
            makeDefault
            position={lastPositionRef.current}
            fov={50}
            ref={cameraRef as React.Ref<THREE.PerspectiveCamera>}
          />
        )}
        <OrbitControls
          ref={controlsRef}
          enabled={!modal}
          target={[0, 0, 0]}
          mouseButtons={{ MIDDLE: 0 }}
          enableDamping
        />
        <GizmoHelper alignment="top-right" margin={[70, 70]}>
          <GizmoViewport axisColors={["#d85a5a", "#61ad68", "#5c81cf"]} labelColor="#f7f7f7" />
        </GizmoHelper>
      </Canvas>
    </div>
  );
}
