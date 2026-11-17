import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { Check, Copy, Link2, Loader2, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  createShareLink,
  getSharing,
  inviteMember,
  revokeShareLink,
  updateMember,
} from "@/lib/projects.functions";
type Role = "editor" | "commenter" | "viewer";
const roleLabels = { editor: "Editor", commenter: "Comentarista", viewer: "Leitor" };
export function ShareDialog({ projectId }: { projectId: string }) {
  const navigate = useNavigate(),
    get = useServerFn(getSharing),
    invite = useServerFn(inviteMember),
    createLink = useServerFn(createShareLink),
    revoke = useServerFn(revokeShareLink),
    update = useServerFn(updateMember);
  const [data, setData] = useState<Awaited<ReturnType<typeof getSharing>> | null>(null),
    [email, setEmail] = useState(""),
    [role, setRole] = useState<Role>("viewer"),
    [expiresAt, setExpiresAt] = useState(""),
    [link, setLink] = useState(""),
    [message, setMessage] = useState(""),
    [loadError, setLoadError] = useState(false);
  async function refresh() {
    setLoadError(false);
    try {
      setData(await get({ data: { projectId } }));
    } catch {
      // Sem isso, uma falha deixava o spinner de "Pessoas" girando para sempre.
      setLoadError(true);
    }
  }
  useEffect(() => {
    void refresh();
  }, [projectId]);
  async function send() {
    const r = await invite({ data: { projectId, email, role, origin: location.origin } });
    setLink(r.link ?? "");
    setMessage(
      r.joined
        ? "A pessoa já tinha conta e foi adicionada."
        : "O e-mail não foi enviado. Copie e compartilhe o link abaixo.",
    );
    await refresh();
  }
  async function generate() {
    const r = await createLink({
      data: {
        projectId,
        role,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
        origin: location.origin,
      },
    });
    setLink(r.link);
    setMessage(
      expiresAt
        ? `Link criado, válido até ${new Date(expiresAt).toLocaleDateString("pt-BR")}.`
        : "Link criado. Qualquer pessoa autenticada com o link receberá o papel escolhido.",
    );
    await refresh();
  }
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4"
      onMouseDown={() =>
        navigate({ to: "/project/$projectId", params: { projectId }, search: { share: false } })
      }
    >
      <section
        className="max-h-[85vh] w-full max-w-xl overflow-auto rounded-md border bg-popover shadow-xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="flex items-center border-b px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold">Compartilhar projeto</h2>
            <p className="text-sm text-muted-foreground">
              Gerencie quem pode acessar este projeto.
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto"
            aria-label="Fechar"
            onClick={() =>
              navigate({
                to: "/project/$projectId",
                params: { projectId },
                search: { share: false },
              })
            }
          >
            <X />
          </Button>
        </header>
        <div className="space-y-6 p-5">
          <div>
            <h3 className="mb-3 text-sm font-semibold">Convidar por e-mail</h3>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="pessoa@exemplo.com"
                className="h-9 min-w-0 flex-1 rounded-md border bg-background px-3"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <RoleSelect value={role} onChange={setRole} />
              <Button onClick={send} disabled={!email}>
                Convidar
              </Button>
            </div>
          </div>
          <div className="border-t pt-5">
            <h3 className="mb-3 text-sm font-semibold">Link de acesso</h3>
            <div className="flex flex-wrap gap-2">
              <RoleSelect value={role} onChange={setRole} />
              <label className="flex h-9 items-center gap-1.5 rounded-md border bg-background px-2 text-xs text-muted-foreground">
                Expira em
                <input
                  type="date"
                  min={new Date().toISOString().slice(0, 10)}
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="bg-transparent text-foreground outline-none"
                />
              </label>
              <Button variant="outline" onClick={generate}>
                <Link2 />
                Gerar link
              </Button>
            </div>
            {link && (
              <div className="mt-3 flex gap-2">
                <input
                  readOnly
                  value={link}
                  className="h-9 min-w-0 flex-1 rounded-md border bg-muted px-3 text-xs"
                />
                <Button
                  size="icon"
                  variant="outline"
                  aria-label="Copiar link"
                  onClick={async () => {
                    await navigator.clipboard.writeText(link);
                    setMessage("Link copiado.");
                  }}
                >
                  <Copy />
                </Button>
              </div>
            )}
            {message && <p className="mt-3 rounded-md bg-secondary p-3 text-sm">{message}</p>}
          </div>
          <div className="border-t pt-5">
            <h3 className="mb-3 text-sm font-semibold">Pessoas</h3>
            {loadError ? (
              <p className="text-sm text-destructive">
                Não foi possível carregar quem tem acesso.{" "}
                <button type="button" className="underline" onClick={() => void refresh()}>
                  Tentar de novo
                </button>
              </p>
            ) : !data ? (
              <Loader2 className="animate-spin" />
            ) : (
              <div className="space-y-2">
                {data.members.map((m) => (
                  <div key={m.user_id} className="flex items-center gap-3 rounded-md border p-3">
                    <span className="grid size-8 place-items-center rounded-full bg-secondary font-medium">
                      {m.nome.slice(0, 1).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{m.nome}</span>
                    <RoleSelect
                      value={m.role as Role}
                      onChange={async (r) => {
                        await update({ data: { projectId, userId: m.user_id, role: r } });
                        await refresh();
                      }}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Remover membro"
                      onClick={async () => {
                        await update({ data: { projectId, userId: m.user_id, role: null } });
                        await refresh();
                      }}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                ))}
                {data.invites
                  .filter((i) => i.status === "pending")
                  .map((i) => (
                    <div
                      key={i.id}
                      className="flex items-center gap-3 rounded-md border border-dashed p-3"
                    >
                      <span className="grid size-8 place-items-center rounded-full bg-secondary">
                        <Check />
                      </span>
                      <span className="min-w-0 flex-1 truncate">
                        {i.email}
                        <small className="block text-muted-foreground">Convite pendente</small>
                      </span>
                      <span>{roleLabels[i.role]}</span>
                    </div>
                  ))}
                {data.links
                  .filter((l) => !l.revoked_at)
                  .map((l) => (
                    <div
                      key={l.id}
                      className="flex items-center gap-3 rounded-md border border-dashed p-3"
                    >
                      <Link2 />
                      <span className="flex-1">
                        Link · {roleLabels[l.role]}
                        {l.expires_at &&
                          ` · expira em ${new Date(l.expires_at).toLocaleDateString("pt-BR")}`}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={async () => {
                          await revoke({ data: { id: l.id } });
                          await refresh();
                        }}
                      >
                        Revogar
                      </Button>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
function RoleSelect({ value, onChange }: { value: Role; onChange: (r: Role) => void }) {
  return (
    <select
      className="h-9 rounded-md border bg-background px-2 text-sm"
      value={value}
      onChange={(e) => onChange(e.target.value as Role)}
    >
      {Object.entries(roleLabels).map(([v, l]) => (
        <option key={v} value={v}>
          {l}
        </option>
      ))}
    </select>
  );
}
