import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {optimizedImageUrl} from "../scripts/lib/image-url.mjs";

test("Shopify source images are downsized to requested widths without upscaling",()=>{
  const source="https://cdn.shopify.com/s/files/1/0012/product.jpg?width=1800&variant=ab";
  const card=new URL(optimizedImageUrl(source,640));
  const hero=new URL(optimizedImageUrl(source,420));
  assert.equal(card.searchParams.get("width"),"640");
  assert.equal(hero.searchParams.get("width"),"420");
  assert.equal(card.searchParams.get("variant"),"ab");
  const alreadySmall=new URL(optimizedImageUrl("https://cdn.shopify.com/s/files/1/0012/product.jpg?width=320",640));
  assert.equal(alreadySmall.searchParams.get("width"),"320");
});

test("non-Shopify official media URLs and unsafe/unrecognized hosts are not rewritten",()=>{
  for(const source of [
    "https://www.martinic.com/wp-content/uploads/product.jpg?token=opaque",
    "https://cdn.other.example/s/files/1/item.jpg?width=2000",
    "http://cdn.shopify.com/s/files/1/item.jpg",
    "https://cdn.shopify.com/other-path/item.jpg",
    "broken/not-a-url"
  ]) assert.equal(optimizedImageUrl(source,640),source);
});

test("rendering uses provider-safe image optimizer for product cards and hero",()=>{
  const source=fs.readFileSync("scripts/build.mjs","utf8");
  assert.ok(source.includes("optimizedImageUrl(mainUrl,includeGallery?960:640)"));
  assert.ok(source.includes("optimizedImageUrl(o.imageUrl,420)"));
});
