// Experimental connector. The caller must verify the gateway's launch ticket.
export function createSiteAuthorizer({ siteOrigin, serviceToken, fetcher = fetch }) {
  const site = new URL(siteOrigin);
  if (site.protocol !== 'https:' || site.username || site.password || site.pathname !== '/' || site.search || site.hash || typeof serviceToken !== 'string' || Buffer.byteLength(serviceToken) < 32) throw new Error('invalid_site_authorizer_config');
  const endpoint = new URL('/api/space-access/authorize', site);
  return async principal => {
    try {
      const response = await fetcher(endpoint, {
        method: 'POST', redirect: 'manual', signal: AbortSignal.timeout(5000),
        headers: { authorization: `Bearer ${serviceToken}`, 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify(principal),
      });
      if (!response.ok) return null;
      const payload = await response.json();
      return payload?.allowed === true && ['owner', 'admin', 'teacher', 'student', 'guest'].includes(payload.role) ? payload.role : null;
    } catch { return null; }
  };
}
