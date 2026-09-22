import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createDocument, migrateDocument, type ProjectDocument } from "@/core/document";

const roleSchema = z.enum(["editor", "commenter", "viewer"]);
const encoder = new TextEncoder();
async function tokenHash(token: string) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(token));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function token() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const listProjects = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("projects")
      .select("id,name,owner_id,updated_at,project_members(role,user_id)")
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    const ownerIds = [...new Set((data ?? []).map((p) => p.owner_id))];
    const { data: profiles } = await context.supabase
      .from("profiles")
      .select("id,nome")
      .in("id", ownerIds);
    const names = new Map((profiles ?? []).map((p) => [p.id, p.nome]));
    return (data ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      ownerId: p.owner_id,
      ownerName: names.get(p.owner_id) || (p.owner_id === context.userId ? "Você" : "Sem nome"),
      updatedAt: p.updated_at,
      role:
        p.owner_id === context.userId
          ? "owner"
          : ((p.project_members as { role: string; user_id: string }[]).find(
              (m) => m.user_id === context.userId,
            )?.role ?? "viewer"),
    }));
  });

export const bootstrapUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const email = String(context.claims.email ?? "").toLowerCase();
    const metadata = context.claims.user_metadata as
      { full_name?: string; name?: string; avatar_url?: string } | undefined;
    await context.supabase.from("profiles").upsert(
      {
        id: context.userId,
        nome: metadata?.full_name ?? metadata?.name ?? email.split("@")[0] ?? "Usuário",
        avatar_url: metadata?.avatar_url ?? null,
      },
      { onConflict: "id" },
    );
    await context.supabase
      .from("user_preferences")
      .upsert({ user_id: context.userId }, { onConflict: "user_id", ignoreDuplicates: true });
    if (email) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: pending } = await supabaseAdmin
        .from("project_invites")
        .select("id,project_id,role")
        .eq("email", email)
        .eq("status", "pending");
      for (const invite of pending ?? []) {
        await supabaseAdmin
          .from("project_members")
          .upsert({ project_id: invite.project_id, user_id: context.userId, role: invite.role });
        await supabaseAdmin
          .from("project_invites")
          .update({ status: "accepted" })
          .eq("id", invite.id);
      }
    }
    return { ok: true };
  });

export const createProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => z.object({ name: z.string().trim().min(1).max(120) }).parse(v))
  .handler(async ({ data, context }) => {
    const { data: p, error } = await context.supabase
      .from("projects")
      .insert({ name: data.name, owner_id: context.userId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    const doc = createDocument();
    const { error: uploadError } = await context.supabase.storage
      .from("projects")
      .upload(
        `${p.id}/document.json`,
        new Blob([JSON.stringify(doc)], { type: "application/json" }),
        { upsert: false },
      );
    if (uploadError) {
      await context.supabase.from("projects").delete().eq("id", p.id);
      throw new Error(uploadError.message);
    }
    return { id: p.id };
  });
export const renameProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) =>
    z.object({ id: z.string().uuid(), name: z.string().trim().min(1).max(120) }).parse(v),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("projects")
      .update({ name: data.name, updated_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
export const deleteProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => z.object({ id: z.string().uuid() }).parse(v))
  .handler(async ({ data, context }) => {
    const { error: s } = await context.supabase.storage
      .from("projects")
      .remove([`${data.id}/document.json`]);
    if (s) throw new Error(s.message);
    const { error } = await context.supabase.from("projects").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
export const duplicateProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => z.object({ id: z.string().uuid() }).parse(v))
  .handler(async ({ data, context }) => {
    const { data: source, error: e } = await context.supabase
      .from("projects")
      .select("name")
      .eq("id", data.id)
      .single();
    if (e) throw new Error(e.message);
    const { data: file, error: f } = await context.supabase.storage
      .from("projects")
      .download(`${data.id}/document.json`);
    if (f) throw new Error(f.message);
    const { data: p, error } = await context.supabase
      .from("projects")
      .insert({ name: `${source.name} — cópia`, owner_id: context.userId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    await context.supabase.storage.from("projects").upload(`${p.id}/document.json`, file);
    return { id: p.id };
  });

export const loadProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => z.object({ id: z.string().uuid() }).parse(v))
  .handler(async ({ data, context }) => {
    const { data: p, error } = await context.supabase
      .from("projects")
      .select("id,name,owner_id,document_version,project_members(role,user_id)")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);
    const { data: file, error: f } = await context.supabase.storage
      .from("projects")
      .download(`${data.id}/document.json`);
    if (f) throw new Error(f.message);
    const role =
      p.owner_id === context.userId
        ? "owner"
        : ((p.project_members as { role: string; user_id: string }[]).find(
            (m) => m.user_id === context.userId,
          )?.role ?? "viewer");
    return {
      project: { id: p.id, name: p.name, version: p.document_version, role },
      document: migrateDocument(JSON.parse(await file.text())),
    };
  });
export const saveProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) =>
    z
      .object({
        id: z.string().uuid(),
        sessionId: z.string().uuid(),
        version: z.number().int(),
        document: z.unknown(),
      })
      .parse(v),
  )
  .handler(async ({ data, context }) => {
    const doc = migrateDocument(data.document);
    const { data: locked } = await context.supabase.rpc("heartbeat_project_lock", {
      _project_id: data.id,
      _session_id: data.sessionId,
    });
    if (!locked) return { ok: false as const, reason: "lock" as const };
    const { data: p } = await context.supabase
      .from("projects")
      .select("document_version")
      .eq("id", data.id)
      .single();
    if (!p || p.document_version !== data.version)
      return { ok: false as const, reason: "conflict" as const };
    const { error: f } = await context.supabase.storage
      .from("projects")
      .upload(
        `${data.id}/document.json`,
        new Blob([JSON.stringify(doc)], { type: "application/json" }),
        { upsert: true },
      );
    if (f) throw new Error(f.message);
    const { data: updated, error } = await context.supabase
      .from("projects")
      .update({ document_version: data.version + 1, updated_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("document_version", data.version)
      .select("document_version")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return updated
      ? { ok: true as const, version: updated.document_version }
      : { ok: false as const, reason: "conflict" as const };
  });
export const acquireLock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) =>
    z
      .object({
        projectId: z.string().uuid(),
        sessionId: z.string().uuid(),
        takeover: z.boolean().default(false),
      })
      .parse(v),
  )
  .handler(async ({ data, context }) => {
    const { data: r, error } = await context.supabase.rpc("acquire_project_lock", {
      _project_id: data.projectId,
      _session_id: data.sessionId,
      _takeover: data.takeover,
    });
    if (error) throw new Error(error.message);
    return r as { status: string; holderName?: string };
  });
export const heartbeatLock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) =>
    z.object({ projectId: z.string().uuid(), sessionId: z.string().uuid() }).parse(v),
  )
  .handler(async ({ data, context }) => {
    const { data: r } = await context.supabase.rpc("heartbeat_project_lock", {
      _project_id: data.projectId,
      _session_id: data.sessionId,
    });
    return Boolean(r);
  });
export const releaseLock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) =>
    z.object({ projectId: z.string().uuid(), sessionId: z.string().uuid() }).parse(v),
  )
  .handler(async ({ data, context }) => {
    await context.supabase.rpc("release_project_lock", {
      _project_id: data.projectId,
      _session_id: data.sessionId,
    });
    return { ok: true };
  });

export const getPreferences = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("user_preferences")
      .select("prefs")
      .eq("user_id", context.userId)
      .maybeSingle();
    return (
      (data?.prefs as { emulateNumpad?: boolean; historyLimit?: number } | null) ?? {
        emulateNumpad: false,
        historyLimit: 100,
      }
    );
  });
export const savePreferences = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) =>
    z
      .object({ emulateNumpad: z.boolean(), historyLimit: z.number().int().min(1).max(1000) })
      .parse(v),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("user_preferences")
      .upsert({ user_id: context.userId, prefs: data, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getSharing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => z.object({ projectId: z.string().uuid() }).parse(v))
  .handler(async ({ data, context }) => {
    const { data: owned } = await context.supabase
      .from("projects")
      .select("id")
      .eq("id", data.projectId)
      .eq("owner_id", context.userId)
      .maybeSingle();
    if (!owned) throw new Error("Apenas o dono pode compartilhar");
    const [{ data: members }, { data: links }, { data: invites }] = await Promise.all([
      context.supabase
        .from("project_members")
        .select("user_id,role")
        .eq("project_id", data.projectId),
      context.supabase
        .from("share_links")
        .select("id,role,expires_at,revoked_at,created_at")
        .eq("project_id", data.projectId),
      context.supabase
        .from("project_invites")
        .select("id,email,role,status,expires_at")
        .eq("project_id", data.projectId),
    ]);
    const ids = (members ?? []).map((m) => m.user_id);
    const { data: profiles } = ids.length
      ? await context.supabase.from("profiles").select("id,nome").in("id", ids)
      : { data: [] };
    const names = new Map((profiles ?? []).map((p) => [p.id, p.nome]));
    return {
      members: (members ?? []).map((m) => ({ ...m, nome: names.get(m.user_id) ?? "Membro" })),
      links: links ?? [],
      invites: invites ?? [],
    };
  });
export const inviteMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) =>
    z
      .object({
        projectId: z.string().uuid(),
        email: z.string().email(),
        role: roleSchema,
        origin: z.string().url(),
      })
      .parse(v),
  )
  .handler(async ({ data, context }) => {
    const raw = token(),
      hash = await tokenHash(raw);
    const { data: owned } = await context.supabase
      .from("projects")
      .select("id")
      .eq("id", data.projectId)
      .eq("owner_id", context.userId)
      .maybeSingle();
    if (!owned) throw new Error("Apenas o dono pode compartilhar");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: users } = await supabaseAdmin.auth.admin.listUsers();
    const user = users.users.find((u) => u.email?.toLowerCase() === data.email.toLowerCase());
    if (user) {
      await supabaseAdmin
        .from("project_members")
        .upsert({ project_id: data.projectId, user_id: user.id, role: data.role });
      return { joined: true, emailSent: false, link: null };
    }
    await supabaseAdmin.from("project_invites").insert({
      project_id: data.projectId,
      email: data.email.toLowerCase(),
      role: data.role,
      token_hash: hash,
      created_by: context.userId,
    });
    return { joined: false, emailSent: false, link: `${data.origin}/invite/${raw}` };
  });
export const createShareLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) =>
    z
      .object({
        projectId: z.string().uuid(),
        role: roleSchema,
        expiresAt: z.string().datetime().nullable(),
        origin: z.string().url(),
      })
      .parse(v),
  )
  .handler(async ({ data, context }) => {
    const raw = token(),
      hash = await tokenHash(raw);
    const { data: row, error } = await context.supabase
      .from("share_links")
      .insert({
        project_id: data.projectId,
        role: data.role,
        expires_at: data.expiresAt,
        token_hash: hash,
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id, link: `${data.origin}/invite/${raw}` };
  });
export const revokeShareLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => z.object({ id: z.string().uuid() }).parse(v))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("share_links")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
export const updateMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) =>
    z
      .object({
        projectId: z.string().uuid(),
        userId: z.string().uuid(),
        role: roleSchema.nullable(),
      })
      .parse(v),
  )
  .handler(async ({ data, context }) => {
    if (data.role) {
      const { error } = await context.supabase
        .from("project_members")
        .update({ role: data.role })
        .eq("project_id", data.projectId)
        .eq("user_id", data.userId);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase
        .from("project_members")
        .delete()
        .eq("project_id", data.projectId)
        .eq("user_id", data.userId);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });
export const consumeInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => z.object({ token: z.string().min(20) }).parse(v))
  .handler(async ({ data, context }) => {
    const hash = await tokenHash(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const now = new Date().toISOString();
    const { data: link } = await supabaseAdmin
      .from("share_links")
      .select("id,project_id,role,expires_at,revoked_at")
      .eq("token_hash", hash)
      .maybeSingle();
    if (link && !link.revoked_at && (!link.expires_at || link.expires_at > now)) {
      await supabaseAdmin
        .from("project_members")
        .upsert({ project_id: link.project_id, user_id: context.userId, role: link.role });
      return { ok: true, projectId: link.project_id };
    }
    const email = String(context.claims.email ?? "").toLowerCase();
    const { data: invite } = await supabaseAdmin
      .from("project_invites")
      .select("id,project_id,role,email,expires_at,status")
      .eq("token_hash", hash)
      .eq("status", "pending")
      .maybeSingle();
    if (invite && invite.email === email && (!invite.expires_at || invite.expires_at > now)) {
      await supabaseAdmin
        .from("project_members")
        .upsert({ project_id: invite.project_id, user_id: context.userId, role: invite.role });
      await supabaseAdmin
        .from("project_invites")
        .update({ status: "accepted" })
        .eq("id", invite.id);
      return { ok: true, projectId: invite.project_id };
    }
    return { ok: false, projectId: null };
  });
