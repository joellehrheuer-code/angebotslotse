import test from "node:test";
import assert from "node:assert/strict";
import { updatePriceHistory, historyFor } from "../scripts/lib/price-history.mjs";
const offer={productId:"EAN-1",advertiser:"Shop",currency:"EUR",currentPrice:49.99};
test("speichert ausschließlich echte positive Produktpreise",()=>{const rows=updatePriceHistory([], [offer,{...offer,productId:null},{...offer,productId:"EAN-2",currentPrice:0}],new Date("2026-09-05T10:00:00Z"));assert.equal(rows.length,1);assert.equal(rows[0].price,49.99)});
test("speichert pro Tag keinen unveränderten Doppelwert, aber Preiswechsel",()=>{const first=updatePriceHistory([], [offer],new Date("2026-09-05T10:00:00Z"));const same=updatePriceHistory(first,[offer],new Date("2026-09-05T12:00:00Z"));const changed=updatePriceHistory(same,[{...offer,currentPrice:39.99}],new Date("2026-09-05T14:00:00Z"));assert.equal(same.length,1);assert.equal(changed.length,2)});
test("liefert nur passende Historie im Zeitfenster",()=>{const rows=[{productId:"EAN-1",merchant:"Shop",currency:"EUR",price:60,timestamp:"2026-08-01T00:00:00Z"},{productId:"EAN-1",merchant:"Shop",currency:"EUR",price:50,timestamp:"2026-09-01T00:00:00Z"}];assert.equal(historyFor(rows,offer,30,new Date("2026-09-05T00:00:00Z")).length,1)});
