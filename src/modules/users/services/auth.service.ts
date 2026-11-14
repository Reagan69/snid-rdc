import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { Errors, AppError } from "@/lib/errors";
import { burnPasswordCheck, hashPassword, verifyPassword } from "@/lib/password";
import { validatePassword } from "@/lib/password-policy";
import { createSession, revokeAllSessions } from "@/lib/session";
import { decrypt, encrypt } from "@/lib/encryption";
import { generateSecret, otpauthUri, verifyTotp } from "@/lib/totp";
import { rateLimit } from "@/lib/rate-limit";
import { writeAudit, auditBestEffort } from "@/modules/audit/services/audit.service";
import type { AuthContext, RequestMeta } from "@/types/auth";

const MAX_FAILURES = 5;
const LOCK_MINUTES = 15;
const GENERIC = "Identifiant, mot de passe ou code invalide, ou compte verrouillé.";

export async function login(input: { username: string; password: string; totp?: string }, meta: RequestMeta) {
  const username = input.username.trim().toLowerCase();
  // Limitation par identifiant (en plus de la limite par IP posée sur la route) : freine le bourrage d'identifiants.
  const rl = await rateLimit(`login:${username}`, 8, 900);
  if (!rl.ok) throw Errors.tooMany(rl.retryAfter);

  const user = await prisma.utilisateur.findUnique({ where: { username } });
  const fail = async (reason: string, u?: { id: string; roleCode: string } | null) => {
    await auditBestEffort(null, { action: "CONNEXION_ECHEC", entite: "Utilisateur", entiteId: u?.id, details: { username, raison: reason, ip: meta.ip } });
    throw new AppError(401, "INVALID_CREDENTIALS", GENERIC);
  };

  if (!user || user.supprimeLe) {
    await burnPasswordCheck(input.password);
    return fail("inconnu");
  }
  if (user.verrouilleJusqua && user.verrouilleJusqua > new Date()) {
    await burnPasswordCheck(input.password);
    return fail("verrouille", user);
  }
  const passwordOk = await verifyPassword(user.passwordHash, input.password);
  let totpOk = true;
  if (passwordOk && user.totpActif) {
    if (!input.totp) throw new AppError(401, "MFA_REQUIRED", "Saisissez le code de votre application d'authentification.");
    totpOk = !!user.totpSecretChiffre && verifyTotp(decrypt(user.totpSecretChiffre), input.totp);
  }
  if (!passwordOk || !totpOk) {
    const echecs = user.echecsConnexion + 1;
    await prisma.utilisateur.update({
      where: { id: user.id },
      data: { echecsConnexion: echecs, ...(echecs >= MAX_FAILURES ? { verrouilleJusqua: new Date(Date.now() + LOCK_MINUTES * 60_000), echecsConnexion: 0 } : {}) },
    });
    return fail(passwordOk ? "totp" : "mot_de_passe", user);
  }
  if (!user.actif) return fail("suspendu", user);

  const session = await createSession(user.id, meta);
  await prisma.$transaction(async (tx) => {
    await tx.utilisateur.update({ where: { id: user.id }, data: { echecsConnexion: 0, verrouilleJusqua: null, derniereConnexion: new Date() } });
    await writeAudit(tx, { user: { id: user.id, username: user.username, roleCode: user.roleCode }, meta }, { action: "CONNEXION", entite: "Utilisateur", entiteId: user.id });
  });
  return { session, user: { id: user.id, nomComplet: user.nomComplet, roleCode: user.roleCode, mustChangePassword: user.mustChangePassword } };
}

export async function changePassword(ctx: AuthContext, input: { currentPassword: string; newPassword: string }) {
  const user = await prisma.utilisateur.findUniqueOrThrow({ where: { id: ctx.user.id }, select: { passwordHash: true, username: true } });
  if (!(await verifyPassword(user.passwordHash, input.currentPassword))) {
    await auditBestEffort(ctx, { action: "CHANGEMENT_MDP_ECHEC", entite: "Utilisateur", entiteId: ctx.user.id });
    throw Errors.validation([{ champ: "currentPassword", message: "Mot de passe actuel incorrect" }]);
  }
  const issue = validatePassword(input.newPassword, user.username);
  if (issue) throw Errors.validation([{ champ: "newPassword", message: issue }]);
  if (input.newPassword === input.currentPassword) throw Errors.validation([{ champ: "newPassword", message: "Le nouveau mot de passe doit différer de l'ancien" }]);
  const passwordHash = await hashPassword(input.newPassword);
  await prisma.$transaction(async (tx) => {
    await tx.utilisateur.update({ where: { id: ctx.user.id }, data: { passwordHash, mustChangePassword: false } });
    await writeAudit(tx, ctx, { action: "MOT_DE_PASSE_CHANGE", entite: "Utilisateur", entiteId: ctx.user.id });
  });
  await revokeAllSessions(ctx.user.id, ctx.sessionId); // les autres appareils doivent se reconnecter
}

/** Étape 1 MFA : génère un secret (chiffré en base) ; il n'est actif qu'après confirmation d'un code. */
export async function mfaSetup(ctx: AuthContext) {
  if (ctx.user.totpActif) throw Errors.conflict("L'authentification multifacteur est déjà activée.");
  const secret = generateSecret();
  await prisma.utilisateur.update({ where: { id: ctx.user.id }, data: { totpSecretChiffre: encrypt(secret) } });
  const uri = otpauthUri("SNID-RDC", ctx.user.username, secret);
  return { secret, uri, qrDataUrl: await QRCode.toDataURL(uri, { margin: 1, width: 220 }) };
}

export async function mfaEnable(ctx: AuthContext, code: string) {
  const u = await prisma.utilisateur.findUniqueOrThrow({ where: { id: ctx.user.id }, select: { totpSecretChiffre: true, totpActif: true } });
  if (u.totpActif) throw Errors.conflict("Déjà activée.");
  if (!u.totpSecretChiffre) throw Errors.badRequest("Lancez d'abord la configuration.");
  if (!verifyTotp(decrypt(u.totpSecretChiffre), code)) throw Errors.validation([{ champ: "code", message: "Code incorrect" }]);
  await prisma.$transaction(async (tx) => {
    await tx.utilisateur.update({ where: { id: ctx.user.id }, data: { totpActif: true } });
    await writeAudit(tx, ctx, { action: "MFA_ACTIVEE", entite: "Utilisateur", entiteId: ctx.user.id });
  });
  await revokeAllSessions(ctx.user.id, ctx.sessionId);
}
