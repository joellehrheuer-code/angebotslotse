const replacements = new Map([
  ["Ã¤","ä"],["Ã¶","ö"],["Ã¼","ü"],["Ã„","Ä"],["Ã–","Ö"],["Ãœ","Ü"],["ÃŸ","ß"],
  ["â€“","–"],["â€”","—"],["â€ž","„"],["â€œ","“"],["â€™","’"],["Â·","·"],["Â",""]
]);

export function repairCreatorText(value){
  let text=String(value??"");
  for(const [bad,good] of replacements) text=text.split(bad).join(good);
  text=text.replace(/gef�hle/gi, m=>m[0]==="G"?"Gefühle":"gefühle");
  return text.replace(/\uFFFD/g,"").replace(/[<>]/g,"").trim();
}

export function deriveCreatorThumbnail(publicUrl, platform=""){
  let url;
  try { url=new URL(String(publicUrl||"")); } catch { return null; }
  const host=url.hostname.toLowerCase();
  if(String(platform).toLowerCase()!=="youtube" && host!=="youtu.be" && !host.endsWith(".youtube.com") && host!=="youtube.com") return null;
  let id="";
  if(host==="youtu.be") id=url.pathname.split("/").filter(Boolean)[0]||"";
  else if(url.pathname.startsWith("/shorts/")||url.pathname.startsWith("/embed/")) id=url.pathname.split("/").filter(Boolean)[1]||"";
  else id=url.searchParams.get("v")||"";
  if(!/^[A-Za-z0-9_-]{6,20}$/.test(id)) return null;
  return "https://i.ytimg.com/vi/"+id+"/hqdefault.jpg";
}
