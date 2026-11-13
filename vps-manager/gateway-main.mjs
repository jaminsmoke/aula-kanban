// Explicit opt-in and localhost binding; this process has no Docker access.
import { createGateway } from './gateway.mjs';
import { createSessionGate } from './session-gate.mjs';
import { createSiteAuthorizer } from './site-authorizer.mjs';
import { openReplayStore } from './replay-store.mjs';

const env = process.env;
if (env.AULA_GATEWAY_EXPERIMENTAL !== '1' || !process.getuid || process.getuid() === 0) throw new Error('gateway_requires_dedicated_unprivileged_user');
const port = Number(env.AULA_GATEWAY_PORT);
const upstreamPort = Number(env.AULA_GATEWAY_UPSTREAM_PORT);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('invalid_gateway_port');
if (!env.AULA_GATEWAY_TICKET_SECRET || !env.AULA_GATEWAY_SERVICE_TOKEN || env.AULA_GATEWAY_TICKET_SECRET === env.AULA_GATEWAY_SERVICE_TOKEN) throw new Error('gateway_requires_distinct_secrets');
if (!['0', '1'].includes(env.AULA_GATEWAY_SETUP_ONLY ?? '')) throw new Error('explicit_setup_policy_required');
const store = openReplayStore(env.AULA_GATEWAY_REPLAY_DB);
const authorize = createSiteAuthorizer({ siteOrigin: env.AULA_SITE_ORIGIN, serviceToken: env.AULA_GATEWAY_SERVICE_TOKEN });
const gate = createSessionGate({ secret: env.AULA_GATEWAY_TICKET_SECRET, audience: env.AULA_GATEWAY_AUDIENCE, app: env.AULA_GATEWAY_APP, consume: store.consume, authorize, setupOnly: env.AULA_GATEWAY_SETUP_ONLY !== '0' });
const server = createGateway({ gate, publicOrigin: env.AULA_GATEWAY_PUBLIC_ORIGIN, siteOrigin: env.AULA_SITE_ORIGIN, upstreamPort });
server.listen(port, '127.0.0.1');
process.on('SIGTERM', () => server.close(() => { store.close(); process.exit(0); }));
