import { createHmac } from 'node:crypto';

/** Derive scoped gateway credentials without granting Docker manager access. */
export function deriveGatewaySecrets(token) {
  if (typeof token !== 'string' || Buffer.byteLength(token) < 32) throw new Error('invalid_manager_token');
  const derive = purpose => createHmac('sha256', token).update(`aula-kanban:gateway:v1:${purpose}`).digest('base64url');
  return { ticketSecret: derive('ticket'), serviceToken: derive('service') };
}
