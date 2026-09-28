import test from "node:test";
import assert from "node:assert/strict";
import { sanitizeCreatorFeedItems, fetchCreatorSocialFeed } from "../scripts/lib/creator-feed.mjs";

test("Creator-Social-Feed akzeptiert nur öffentliche erlaubte Inhalte", () => {
  const rows=sanitizeCreatorFeedItems([
    {id:"ig-1",type:"post",title:"<b>Neuer Post</b>",summary:"Öffentliche Beschreibung",platform:"Instagram",publicUrl:"https://instagram.com/p/abc",thumbnailUrl:"https://cdn.example/ig.jpg",publishedAt:"2026-09-27T18:00:00Z"},
    {id:"draft",type:"draft",title:"Draft",platform:"Instagram",publicUrl:"https://instagram.com/p/draft"},
    {id:"private",type:"post",title:"Privat",platform:"Web",publicUrl:"https://user:pass@example.com/x"},
    {id:"bad",type:"post",title:"Bad",platform:"Web",publicUrl:"javascript:alert(1)"}
  ]);
  assert.equal(rows.length,1);
  assert.equal(rows[0].id,"ig-1");
  assert.equal(rows[0].type,"post");
  assert.equal(rows[0].title,"bNeuer Post/b");
  assert.equal(rows[0].platform,"Instagram");
});

test("Creator-Social-Feed dedupliziert und sortiert nach Veröffentlichung", () => {
  const rows=sanitizeCreatorFeedItems([
    {id:"old",type:"music",title:"Song alt",platform:"Spotify",publicUrl:"https://open.spotify.com/track/1",publishedAt:"2026-09-20T10:00:00Z"},
    {id:"new",type:"video",title:"Video neu",platform:"YouTube",publicUrl:"https://youtube.com/watch?v=2",publishedAt:"2026-09-27T10:00:00Z"},
    {id:"old",type:"post",title:"Doppelt",platform:"Instagram",publicUrl:"https://instagram.com/p/x"}
  ]);
  assert.deepEqual(rows.map(x=>x.id),["old","new"]);
});

test("Remote Social-Feed akzeptiert items und begrenzt die Ausgabe", async () => {
  const items=Array.from({length:30},(_,i)=>({
    id:"item-"+i,type:i%2?"post":"video",title:"Item "+i,platform:i%2?"Instagram":"YouTube",
    publicUrl:"https://example.com/item/"+i,publishedAt:new Date(Date.UTC(2026,8,1+i%20)).toISOString()
  }));
  const result=await fetchCreatorSocialFeed({
    feedUrl:"https://feed.example/social.json",
    maxItems:24,
    fetchImpl:async()=>({ok:true,status:200,json:async()=>({updatedAt:"2026-09-28T06:00:00Z",items})})
  });
  assert.equal(result.state,"ok");
  assert.equal(result.items.length,24);
  assert.equal(result.updatedAt,"2026-09-28T06:00:00.000Z");
  assert.ok(result.items.every(x=>x.publicUrl.startsWith("https://")));
});

test("Remote Social-Feed lehnt unsichere Feed-URLs ab", async () => {
  await assert.rejects(()=>fetchCreatorSocialFeed({feedUrl:"http://example.com/feed.json"}),/public HTTPS/);
  await assert.rejects(()=>fetchCreatorSocialFeed({feedUrl:"https://user:pass@example.com/feed.json"}),/public HTTPS/);
});
