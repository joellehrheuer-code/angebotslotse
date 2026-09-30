import test from "node:test";
import assert from "node:assert/strict";
import { repairCreatorText, deriveCreatorThumbnail } from "../scripts/lib/creator-media.mjs";
import { sanitizeCreatorVideos } from "../scripts/lib/creator-videos.mjs";
import { sanitizeCreatorFeedItems } from "../scripts/lib/creator-feed.mjs";

test("Creator-Text repariert sichtbare Mojibake",()=>{
  const broken="Gef\uFFFDhle & \u00C3\u0153berblick";
  assert.equal(repairCreatorText(broken),"Gef\u00FChle & \u00DCberblick");
  const [row]=sanitizeCreatorFeedItems([{id:"x",type:"video",title:"Gef\uFFFDhle",summary:"#gef\uFFFDhle",platform:"YouTube",publicUrl:"https://www.youtube.com/shorts/5T0e7jzMK7o"}]);
  assert.equal(row.title,"Gef\u00FChle");
  assert.equal(row.summary,"#gef\u00FChle");
});

test("YouTube Shorts erhalten automatisch ein echtes Thumbnail",()=>{
  const url="https://www.youtube.com/shorts/5T0e7jzMK7o";
  assert.equal(deriveCreatorThumbnail(url,"YouTube"),"https://i.ytimg.com/vi/5T0e7jzMK7o/hqdefault.jpg");
  const [video]=sanitizeCreatorVideos([{id:"yt",title:"Video",platform:"YouTube",publicUrl:url}]);
  assert.equal(video.thumbnailUrl,"https://i.ytimg.com/vi/5T0e7jzMK7o/hqdefault.jpg");
});

test("Nicht-YouTube-Videos erfinden keine externen Thumbnails",()=>{
  assert.equal(deriveCreatorThumbnail("https://www.instagram.com/reel/test/","Instagram"),null);
});
