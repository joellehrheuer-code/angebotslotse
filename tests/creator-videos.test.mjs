import test from "node:test";
import assert from "node:assert/strict";
import { sanitizeCreatorVideos } from "../scripts/lib/creator-videos.mjs";

test("Creator-Video-Feed bleibt bei null Einträgen leer", () => {
  assert.deepEqual(sanitizeCreatorVideos([]), []);
  assert.deepEqual(sanitizeCreatorVideos(null), []);
});

test("Creator-Video-Feed akzeptiert einen öffentlichen Eintrag", () => {
  const [video] = sanitizeCreatorVideos([{id:"yt-1",title:"Neues Video",thumbnailUrl:"https://cdn.example/thumb.jpg",publicUrl:"https://youtube.com/watch?v=1",platform:"YouTube",publishedAt:"2026-09-15T12:00:00Z"}]);
  assert.equal(video.id, "yt-1");
  assert.equal(video.thumbnailUrl, "https://cdn.example/thumb.jpg");
  assert.equal(video.platform, "YouTube");
});

test("Creator-Video-Feed akzeptiert mehrere gültige Einträge und dedupliziert IDs", () => {
  const videos = sanitizeCreatorVideos([
    {id:"1",title:"Eins",publicUrl:"https://youtube.com/watch?v=1",platform:"YouTube"},
    {id:"2",title:"Zwei",publicUrl:"https://twitch.tv/videos/2",platform:"Twitch"},
    {id:"1",title:"Doppelt",publicUrl:"https://youtube.com/watch?v=3",platform:"YouTube"}
  ]);
  assert.deepEqual(videos.map(video => video.id), ["1", "2"]);
});

test("Creator-Video-Feed verwirft ungültige URLs und Thumbnails", () => {
  const videos = sanitizeCreatorVideos([
    {id:"http",title:"HTTP",publicUrl:"http://youtube.com/watch?v=1",platform:"YouTube"},
    {id:"private",title:"Private",publicUrl:"https://user:pass@example.com/v",platform:"Web"},
    {id:"thumb",title:"Bad thumb",thumbnailUrl:"javascript:bad",publicUrl:"https://youtube.com/watch?v=2",platform:"YouTube"},
    {id:"ok",title:"OK",publicUrl:"https://youtube.com/watch?v=3",platform:"YouTube"}
  ]);
  assert.deepEqual(videos.map(video => video.id), ["ok"]);
});
