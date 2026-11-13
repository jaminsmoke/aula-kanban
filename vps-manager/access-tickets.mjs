// Experimental: primitives only. No HTTP endpoint or application access is enabled.
import { createHmac, timingSafeEqual } from 'node:crypto';

const MAX_LIFETIME_SECONDS = 60;
const ID = /^[A-Za-z0-9_-]{1,128}$/;
const SIGNATURE = /^[A-Za-z0-9_-]{43}$/;
const ENCODED = /^[A-Za-z0-9_-]{1,2048}$/;

function validSecret(secret) {
  return typeof secret === 'string' && Buffer.byteLength(secret, 'utf8') >= 32;
}

/** Verify a short-lived, single-use launch ticket before consulting live permissions. */
export function verifyLaunchTicket(ticket, { secret, audience, now = Date.now(), consume }) {
  if (!validSecret(secret) || !ID.test(audience ?? '') || typeof consume !== 'function') return null;
  if (typeof ticket !== 'string' || ticket.length > 2100) return null;
  const parts = ticket.split('.');
  if (parts.length !== 2 || !ENCODED.test(parts[0]) || !SIGNATURE.test(parts[1])) return null;
  const expected = createHmac('sha256', secret).update(parts[0]).digest();
  const supplied = Buffer.from(parts[1], 'base64url');
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;

  let claims;
  try { claims = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8')); } catch { return null; }
  if (!claims || typeof claims !== 'object' || Array.isArray(claims)) return null;
  const keys = Object.keys(claims).sort().join(',');
  if (keys !== 'app,aud,email,exp,iat,jti,project,sub') return null;
  if (![claims.aud, claims.app, claims.project, claims.sub, claims.jti].every(value => typeof value === 'string' && ID.test(value))) return null;
  if (typeof claims.email !== 'string' || claims.email.length > 254 || !/^[^\s@]+@[^\s@]+$/.test(claims.email)) return null;
  if (claims.aud !== audience || !['affine', 'n8n', 'nodum'].includes(claims.app)) return null;
  if (!Number.isSafeInteger(claims.iat) || !Number.isSafeInteger(claims.exp)) return null;
  const current = Math.floor(now / 1000);
  if (claims.iat > current || claims.exp <= current || claims.exp <= claims.iat || claims.exp - claims.iat > MAX_LIFETIME_SECONDS) return null;
  // Only a durable, atomic replay store is suitable in production. Treat any
  // storage failure as a denial, including failure to commit the consumption.
  try { if (consume(claims.jti, claims.exp, current) !== true) return null; }
  catch { return null; }
  return claims;
}
