// Read-only by design: this helper cannot publish or reserve an upload.
const route = { status: '/shortsync/status', connections: '/shortsync/connections', health: '/health' }[process.argv[2]];
try {
  if (!route) throw new Error();
  const base = new URL(process.env.BRIDGE_URL || 'http://127.0.0.1:3000');
  if (base.protocol !== 'https:' && !(base.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname))) throw new Error();
  if (base.username || base.password || (route !== '/health' && !process.env.AUTH_TOKEN)) throw new Error();
  const response = await fetch(new URL(route, base), { redirect: 'error', headers: route === '/health' ? {} : { Authorization: 'Bearer ' + process.env.AUTH_TOKEN }, signal: AbortSignal.timeout(35000) });
  console.log('HTTP ' + response.status);
  console.log(JSON.stringify(await response.json(), null, 2));
  if (!response.ok) process.exitCode = 1;
} catch { console.error('Read-only check failed. Check URL, local server and configuration. Usage: node --env-file=.env src/client.mjs health|status|connections'); process.exitCode = 1; }
