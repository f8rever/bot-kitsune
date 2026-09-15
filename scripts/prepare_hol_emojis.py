import os
import urllib.request
from PIL import Image
import io

os.makedirs('temp_emojis', exist_ok=True)

emojis = {
    'lol_pass_hol': 'https://d392eissrffsyf.cloudfront.net/storeImages/bundles/69901079_1.png',
    'lol_orb_hol': 'https://d392eissrffsyf.cloudfront.net/storeImages/bundles/69901075.png',
    'lol_deluxe_hol': 'https://d392eissrffsyf.cloudfront.net/storeImages/bundles/69901076.png',
    'lol_premium_hol': 'https://d392eissrffsyf.cloudfront.net/storeImages/bundles/69901077.png',
    'lol_megaorb_hol': 'https://d392eissrffsyf.cloudfront.net/storeImages/bundles/69901078.png'
}

for name, url in emojis.items():
    print(f"Downloading and resizing {name} from {url}...")
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req) as resp:
        data = resp.read()
        im = Image.open(io.BytesIO(data)).convert("RGBA")
        im_resized = im.resize((128, 128), Image.Resampling.LANCZOS)
        out_path = os.path.join('temp_emojis', f"{name}.png")
        im_resized.save(out_path, format='PNG', optimize=True)
        print(f"Saved {out_path} ({os.path.getsize(out_path)} bytes)")

print("All emojis prepared successfully!")
