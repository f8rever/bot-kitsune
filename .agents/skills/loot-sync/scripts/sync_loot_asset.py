#!/usr/bin/env python3
"""
Sync Loot Asset Script - Kitsune Bot
Baixa a imagem oficial da Riot Games do novo Passe ou Orbe, redimensiona para 128x128 PNG com LANCZOS,
e chama o uploader do Discord para criar o Application Emoji correspondente.

Uso:
  python sync_loot_asset.py --name lol_worlds_orb --url https://d392eissrffsyf.cloudfront.net/storeImages/bundles/69901083.png
  ou
  python sync_loot_asset.py --name lol_item_bundle --id 69901084
"""

import os
import sys
import argparse
import io
import urllib.request
import subprocess
from PIL import Image

def main():
    parser = argparse.ArgumentParser(description="Baixar e registrar ícone oficial de passe/orbe")
    parser.add_argument("--name", required=True, help="Nome do emoji no Discord (ex: lol_worlds_orb)")
    parser.add_argument("--url", help="URL direta da imagem oficial")
    parser.add_argument("--id", help="Item ID da Riot Games (usa URL padrão de bundles)")
    args = parser.parse_args()

    image_url = args.url
    if not image_url and args.id:
        image_url = f"https://d392eissrffsyf.cloudfront.net/storeImages/bundles/{args.id}.png"

    if not image_url:
        print("❌ Erro: Forneça --url ou --id")
        sys.exit(1)

    print(f"📥 Baixando asset oficial de: {image_url}")
    headers = {'User-Agent': 'Mozilla/5.0'}
    req = urllib.request.Request(image_url, headers=headers)
    try:
        with urllib.request.urlopen(req) as resp:
            data = resp.read()
    except Exception as e:
        print(f"❌ Falha ao baixar imagem: {e}")
        sys.exit(1)

    # Processar com Pillow (128x128 RGBA com LANCZOS)
    img = Image.open(io.BytesIO(data)).convert('RGBA')
    img = img.resize((128, 128), Image.Resampling.LANCZOS)

    out_dir = os.path.join(os.path.dirname(__file__), "..", "..", "..", "temp_loot_icons")
    os.makedirs(out_dir, exist_ok=True)
    out_file = os.path.join(out_dir, f"{args.name}.png")
    img.save(out_file, format="PNG", optimize=True)
    print(f"✅ Imagem salva e otimizada: {out_file} ({os.path.getsize(out_file)} bytes)")

    print(f"🚀 Para fazer o upload direto no Discord, execute:")
    print(f"   node scripts/upload_loot_emojis.js")

if __name__ == "__main__":
    main()
