import fs from "node:fs/promises";

export async function fetchDirectOffers(file = "data/direct-partners.json") {
  const partners = JSON.parse(await fs.readFile(file, "utf8"));
  return partners.filter(p => p.enabled).map(p => ({
    id: p.id, title: p.title, description: p.description, terms: "Preise, Verfügbarkeit und Bedingungen bitte beim Anbieter prüfen.",
    url: p.destinationUrl, urlTracking: p.trackingUrl, advertiserName: p.name, type: "promotion",
    category: p.category, regions: { list: [{ countryCode: "DE" }] }, source: "direct",
    imageUrl:p.imageUrl,imageAlt:p.imageAlt,imageSource:p.imageSource,imageRightsNote:p.imageRightsNote,
    videoUrl:p.videoUrl,videoPoster:p.videoPoster,videoProvider:p.videoProvider,videoSource:p.videoSource,videoTitle:p.videoTitle,videoEmbedType:p.videoEmbedType
  }));
}
