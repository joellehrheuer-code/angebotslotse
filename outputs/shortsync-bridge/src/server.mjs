import { createApp } from './app.mjs';
import { configuration } from './config.mjs';

try {
  const settings = configuration();
  const server = createApp(settings.app);
  server.listen(settings.port, settings.host, () => console.log('ShortSync bridge ready; port=' + server.address().port + '; dry_run=' + settings.app.dryRun));
  server.on('error', () => { console.error('Server startup failed. Check host/port configuration.'); process.exitCode = 1; });
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close());
} catch {
  console.error('Configuration invalid. Check .env.example; AUTH_TOKEN needs at least 32 characters.');
  process.exitCode = 1;
}
