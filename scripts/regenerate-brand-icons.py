from pathlib import Path
import base64
import io
import re
from PIL import Image, ImageOps

root = Path(__file__).resolve().parents[1]
public = root / "public"
svg = (public / "joel-logo.svg").read_text(encoding="utf-8")
match = re.search(r"data:image/(?:jpeg|jpg);base64,([^\"]+)", svg)
if not match:
    raise SystemExit("Embedded logo image not found")

source = Image.open(io.BytesIO(base64.b64decode(match.group(1)))).convert("RGB")
side = min(source.size)
left = (source.width - side) // 2
top = (source.height - side) // 2
source = source.crop((left, top, left + side, top + side))

def save_square(name, size):
    image = source.resize((size, size), Image.Resampling.LANCZOS)
    image.save(public / name, "PNG", optimize=True)

save_square("app-icon-192.png", 192)
save_square("app-icon-512.png", 512)
save_square("apple-touch-icon.png", 180)
save_square("favicon-32.png", 32)

mask_bg = Image.new("RGB", (512, 512), "#0b0f16")
inner = source.resize((410, 410), Image.Resampling.LANCZOS)
mask_bg.paste(inner, ((512 - 410) // 2, (512 - 410) // 2))
mask_bg.save(public / "app-icon-maskable-512.png", "PNG", optimize=True)

ico = source.resize((256, 256), Image.Resampling.LANCZOS)
ico.save(public / "favicon.ico", format="ICO", sizes=[(16,16),(24,24),(32,32),(48,48),(64,64),(128,128),(256,256)])

(public / "favicon.svg").write_text(svg, encoding="utf-8")
print("Brand icons regenerated from joel-logo.svg")
