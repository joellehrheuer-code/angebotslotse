import { Journal } from './journal.mjs';
import { UpstashJournal } from './upstash.mjs';
import { ShortSync } from './shortsync.mjs';

// Production uses environment variables only; no dotenv file is auto-loaded.
export function configuration(env = process.env) {
  const bool = (name, fallback) => {
    const raw = env[name];
    if (raw === undefined || raw === '') return fallback;
    if (!['true', 'false'].includes(raw)) throw new Error('Invalid boolean setting');
    return raw === 'true';
  };
  const dryRun = bool('DRY_RUN', true);
  const liveEnabled = bool('LIVE_PUBLISH_ENABLED', false);
  const onRender = env.RENDER === 'true';
  const backend = env.JOURNAL_BACKEND || (env.UPSTASH_REDIS_REST_URL ? 'upstash' : 'file');
  if (!['file', 'upstash'].includes(backend)) throw new Error('Invalid journal backend');
  if (onRender && !dryRun && liveEnabled && backend !== 'upstash') throw new Error('Render live mode requires persistent journal');
  const journal = backend === 'upstash'
    ? new UpstashJournal({ url: env.UPSTASH_REDIS_REST_URL, token: env.UPSTASH_REDIS_REST_TOKEN })
    : new Journal(env.DATA_DIR || './data');
  const port = Number(env.PORT || 3000);
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('Invalid port');
  return { port, host: env.HOST || '0.0.0.0', app: {
    authToken: env.AUTH_TOKEN, dryRun, liveEnabled, journal,
    maxVideoBytes: Number(env.MAX_VIDEO_BYTES || 26214400),
    rateLimit: Number(env.RATE_LIMIT_PER_MINUTE || 20),
    shortsync: new ShortSync({ apiKey: env.SHORTSYNC_API_KEY, dryRun, uploadHosts: (env.UPLOAD_ALLOWED_HOSTS || '').split(',').map(s => s.trim()).filter(Boolean) }),
  } };
}
