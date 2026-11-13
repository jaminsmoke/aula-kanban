// Experimental authorization core. It is not an HTTP proxy or a running service.
import { randomBytes } from 'node:crypto';
import { verifyLaunchTicket } from './access-tickets.mjs';

const MAX_SESSIONS = 10000;
const SESSION_LIFETIME_MS = 15 * 60 * 1000;
const SESSION_ID = /^[A-Za-z0-9_-]{43}$/;

/**
 * A local session never grants access by itself: live authorization must pass on
 * every request, and errors are denials. Restarting drops all sessions.
 */
export function createSessionGate({ secret, audience, app, consume, authorize, now = () => Date.now(), setupOnly = true }) {
  if (!['affine', 'n8n', 'nodum'].includes(app) || typeof consume !== 'function' || typeof authorize !== 'function') throw new Error('invalid_gate_config');
  const sessions = new Map();
  const roleAllowed = role => ['owner', 'admin', ...(!setupOnly ? ['teacher', 'student', 'guest'] : [])].includes(role);
  const sweep = () => { for (const [id, session] of sessions) if (session.expires <= now()) sessions.delete(id); };
  const checkRole = async principal => {
    try { return roleAllowed(await authorize(principal)); } catch { return false; }
  };
  return {
    async launch(ticket) {
      sweep();
      if (sessions.size >= MAX_SESSIONS) return null;
      const claims = verifyLaunchTicket(ticket, { secret, audience, now: now(), consume });
      if (!claims || claims.app !== app) return null;
      const principal = { userId: claims.sub, email: claims.email, projectId: claims.project, app };
      if (!await checkRole(principal) || Math.floor(now() / 1000) >= claims.exp) return null;
      const id = randomBytes(32).toString('base64url');
      sessions.set(id, { principal, expires: now() + SESSION_LIFETIME_MS });
      return id;
    },
    async check(id) {
      if (typeof id !== 'string' || !SESSION_ID.test(id)) return false;
      const session = sessions.get(id);
      if (!session || session.expires <= now()) { sessions.delete(id); return false; }
      if (!await checkRole(session.principal)) { sessions.delete(id); return false; }
      return sessions.get(id) === session && session.expires > now();
    },
    revoke(id) { sessions.delete(id); },
  };
}
