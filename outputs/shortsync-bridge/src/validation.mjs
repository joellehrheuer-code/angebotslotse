import { fail } from './errors.mjs';
export const platforms = ['instagram', 'tiktok', 'youtube', 'snapchat'];
const fields = new Set(['video', 'platforms', 'publish_mode', 'scheduled_for', 'instagram_caption', 'tiktok_caption', 'youtube_title', 'youtube_description', 'snapchat_caption', 'first_comment', 'youtube_notify_subscribers', 'tiktok_privacy_level', 'tiktok_post_mode', 'tiktok_disable_comment', 'tiktok_disable_duet', 'tiktok_disable_stitch', 'tiktok_is_branded_content', 'tiktok_is_your_brand', 'tiktok_is_aigc']);
export async function validate(form, maxBytes) {
  const data = {};
  for (const [key, value] of form) {
    if (!fields.has(key) || Object.hasOwn(data, key)) fail(400, 'UNKNOWN_OR_DUPLICATE_FIELD');
    if (key !== 'video' && (typeof value !== 'string' || value.length > 6000)) fail(400, 'INVALID_FIELD');
    data[key] = value;
  }
  const asset = await validateVideo(data.video, maxBytes);
  delete data.video;
  return { ...asset, ...validateContent(data) };
}
export async function validateVideo(file, maxBytes) {
  if (!(file instanceof File)) fail(400, 'VIDEO_REQUIRED');
  if (!file.size || file.size > maxBytes) fail(413, 'VIDEO_SIZE_INVALID');
  const filename = file.name.split(/[\\/]/).pop().replace(/[^A-Za-z0-9._-]/g, '_').slice(-100);
  const ext = filename.split('.').pop()?.toLowerCase();
  const mime = { mp4: 'video/mp4', mov: 'video/quicktime' }[ext];
  if (!mime || file.type !== mime) fail(415, 'VIDEO_TYPE_INVALID');
  const video = Buffer.from(await file.arrayBuffer());
  // ISO BMFF: bounded box traversal; require a video track, media payload and
  // ftyp. This is structural validation, not codec/duration compliance testing.
  const boxes = [];
  for (let offset = 0; offset < video.length;) {
    if (offset + 8 > video.length) fail(415, 'VIDEO_CONTAINER_INVALID');
    let size = video.readUInt32BE(offset), header = 8;
    if (size === 1) {
      if (offset + 16 > video.length) fail(415, 'VIDEO_CONTAINER_INVALID');
      const big = video.readBigUInt64BE(offset + 8);
      if (big > BigInt(video.length)) fail(415, 'VIDEO_CONTAINER_INVALID');
      size = Number(big); header = 16;
    }
    if (!size) size = video.length - offset;
    if (size < header || offset + size > video.length) fail(415, 'VIDEO_CONTAINER_INVALID');
    boxes.push({ type: video.toString('ascii', offset + 4, offset + 8), payload: video.subarray(offset + header, offset + size) });
    offset += size;
    if (boxes.length > 10000) fail(415, 'VIDEO_CONTAINER_INVALID');
  }
  const ftyp = boxes.find(b => b.type === 'ftyp');
  const moov = boxes.find(b => b.type === 'moov');
  if (!ftyp || ftyp.payload.length < 8 || !moov || !moov.payload.includes(Buffer.from('vide')) || !boxes.some(b => b.type === 'mdat' && b.payload.length)) fail(415, 'VIDEO_CONTAINER_INVALID');
  const brand = ftyp.payload.toString('ascii', 0, 4);
  if (ext === 'mov' ? brand !== 'qt  ' : !['isom', 'iso2', 'iso4', 'iso5', 'iso6', 'mp41', 'mp42', 'avc1', 'M4V ', 'MSNV'].includes(brand)) fail(415, 'VIDEO_CONTAINER_INVALID');
  return { video, filename, mime };
}
export function validateContent(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) fail(400, 'INVALID_FIELDS');
  const data = { ...input };
  for (const [key, value] of Object.entries(data)) {
    if (key === 'video' || !fields.has(key)) fail(400, 'UNKNOWN_OR_DUPLICATE_FIELD');
    if (key === 'platforms' && Array.isArray(value)) data[key] = JSON.stringify(value);
    else if (typeof value !== 'string' || value.length > 6000) fail(400, 'INVALID_FIELD');
  }
  let selected;
  try { selected = JSON.parse(data.platforms); } catch { fail(400, 'PLATFORMS_INVALID'); }
  if (!Array.isArray(selected) || !selected.length || selected.length > 4 || new Set(selected).size !== selected.length || selected.some(p => !platforms.includes(p))) fail(400, 'PLATFORMS_INVALID');
  selected.sort();
  const mode = data.publish_mode ?? 'immediate';
  if (!['immediate', 'scheduled', 'draft'].includes(mode)) fail(400, 'PUBLISH_MODE_INVALID');
  if (mode === 'scheduled') {
    if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?(?:Z|[+-]\d\d:\d\d)$/.test(data.scheduled_for ?? '') || !Number.isFinite(Date.parse(data.scheduled_for))) fail(400, 'SCHEDULE_INVALID');
  } else if (data.scheduled_for) fail(400, 'SCHEDULE_UNEXPECTED');
  const limits = { instagram_caption: 2200, tiktok_caption: 2200, youtube_title: 100, youtube_description: 5000, snapchat_caption: 160, first_comment: 2200 };
  for (const [key, max] of Object.entries(limits)) if (data[key]?.length > max) fail(400, 'CONTENT_TOO_LONG');
  if (selected.includes('youtube') && !data.youtube_title?.trim()) fail(400, 'YOUTUBE_TITLE_REQUIRED');
  const boolean = key => {
    if (data[key] !== undefined && !['true', 'false'].includes(data[key])) fail(400, 'BOOLEAN_INVALID');
    return data[key] === 'true';
  };
  const youtube = { privacy_status: 'public', made_for_kids: false, notify_subscribers: boolean('youtube_notify_subscribers') };
  const tiktok = { privacy_level: data.tiktok_privacy_level ?? 'SELF_ONLY', post_mode: data.tiktok_post_mode ?? 'direct' };
  if (!['SELF_ONLY', 'PUBLIC_TO_EVERYONE', 'MUTUAL_FOLLOW_FRIENDS', 'FOLLOWER_OF_CREATOR'].includes(tiktok.privacy_level) || !['direct', 'draft'].includes(tiktok.post_mode)) fail(400, 'TIKTOK_OPTIONS_INVALID');
  for (const key of ['disable_comment', 'disable_duet', 'disable_stitch', 'is_branded_content', 'is_your_brand', 'is_aigc']) tiktok[key] = boolean('tiktok_' + key);
  const targets = selected.map(platform => {
    const target = platform === 'youtube' ? { title: data.youtube_title, description: data.youtube_description ?? '', platform_options: { youtube } }
      : { caption: data[platform + '_caption'] ?? '' };
    if (platform === 'tiktok') target.platform_options = { tiktok };
    if (platform === 'instagram') target.platform_options = { instagram: { share_to_feed: true, story_only: false } };
    if (['instagram', 'youtube'].includes(platform) && data.first_comment) target.first_comment = data.first_comment;
    return { platform, target };
  });
  return { mode, scheduled_for: data.scheduled_for, targets };
}
