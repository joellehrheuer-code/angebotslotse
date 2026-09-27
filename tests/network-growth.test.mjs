import test from "node:test";
import assert from "node:assert/strict";
import { rankDaisyconPrograms, buildNetworkMarketplaceSearches, buildNetworkApplicationDraft } from "../scripts/lib/network-growth.mjs";

test("Daisycon-Ranking markiert nur klar erkennbare offene Programme als bewerbbar", () => {
  const rows = rankDaisyconPrograms([
    { id: 1, name: "Gaming Hardware Shop", status: "available", category: "electronics" },
    { id: 2, name: "Home Store", status: "joined", category: "home" },
    { id: 3, name: "Unklar", status: "unknown" }
  ]);
  const gaming = rows.find(row => row.programId === 1);
  const joined = rows.find(row => row.programId === 2);
  const unknown = rows.find(row => row.programId === 3);
  assert.equal(gaming.applicationPossible, true);
  assert.equal(joined.applicationPossible, false);
  assert.equal(unknown.applicationPossible, false);
  assert.ok(gaming.score > unknown.score);
});

test("Netzwerk-Suche priorisiert Kategorien anhand echter Angebotsabdeckung", () => {
  const rows = buildNetworkMarketplaceSearches({
    network: "Webgains",
    connected: true,
    siteCategoryStats: { technik: 50, computer: 25, zubehoer: 10, gaming: 12, mode: 3 }
  });
  assert.equal(rows[0].category, "Technik & Computer");
  assert.equal(rows[0].siteOffers, 85);
  assert.equal(rows[0].priority, "hoch");
  assert.match(rows[0].action, /Bedingungen vor Beitritt bestätigen/);
});

test("Bewerbungsentwurf bleibt sachlich und erfindet keine Reichweitenzahlen", () => {
  const draft = buildNetworkApplicationDraft({ network: "Daisycon", brand: "Demo Brand", category: "Gaming" });
  assert.match(draft, /Demo Brand/);
  assert.match(draft, /Daisycon/);
  assert.doesNotMatch(draft, /\d+[.,]?\d*\s*(Follower|Besucher|Views|Reichweite)/i);
});
