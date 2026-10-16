import json
import sys
import os
import requests

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

workspace_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../..'))

with open(os.path.join(workspace_root, 'config', 'catalog.json'), encoding='utf-8') as f:
    cat_items = json.load(f)
    cat_by_id = {item.get('itemId'): item for item in cat_items}

# Targeted featured items to include in Featured & Launch Bundles (Aba Destaques)
target_bundle_ids = [
    # 1. Conjuntos de Moldura HEARTSTEEL Live My Life
    99901662, # Ezreal
    99901663, # Kayn
    99901664, # Aphelios
    99901665, # Yone
    99901666, # K'Sante

    # 2. Pacotes Croma HEARTSTEEL Live My Life
    79900921, # Ezreal
    79900922, # Kayn
    79900923, # Aphelios
    79900924, # Yone
    79900925, # K'Sante

    # 3. Baú de Skin Especial
    69901087, # Baú de Skin Misteriosa de Ápice do Entretenimento

    # 4. Passes Temporada 3: Mundial 2026
    69901080, # Passe 1650 RP
    69901081, # Pacote Passe 2650 RP
    69901082, # Pacote Premium 3650 RP

    # 5. Pacotes de Orbes Mundial 2026
    69901084, # Deluxe 2500 RP
    69901085, # Premium 6250 RP
    69901086, # Mega 12500 RP

    # 6. Espólios Hextec Destaque
    69900003, # 10 Baús Hextec + 1 Bônus (1950 RP)
    69900002, # 5 Baús Hextec (975 RP)
    69900001  # 1 Baú e Chave (195 RP)
]

featured_bundles = []

bundle_en_names = {
    99901662: "HEARTSTEEL Live My Life Ezreal Border Set",
    99901663: "HEARTSTEEL Live My Life Kayn Border Set",
    99901664: "HEARTSTEEL Live My Life Aphelios Border Set",
    99901665: "HEARTSTEEL Live My Life Yone Border Set",
    99901666: "HEARTSTEEL Live My Life K'Sante Border Set",
    79900921: "HEARTSTEEL Live My Life Ezreal Chroma Bundle",
    79900922: "HEARTSTEEL Live My Life Kayn Chroma Bundle",
    79900923: "HEARTSTEEL Live My Life Aphelios Chroma Bundle",
    79900924: "HEARTSTEEL Live My Life Yone Chroma Bundle",
    79900925: "HEARTSTEEL Live My Life K'Sante Chroma Bundle",
    69901087: "Peak Entertainment Mystery Skin Chest",
    69901080: "Season 3: Worlds 2026 Pass",
    69901081: "Season 3: Worlds 2026 Pass Bundle",
    69901082: "Season 3: Worlds 2026 Premium Pass Bundle",
    69901084: "Worlds 2026 Deluxe Orb Bundle",
    69901085: "Worlds 2026 Premium Orb Bundle",
    69901086: "Worlds 2026 Mega Orb Bundle",
    69900003: "10 Hextech Chests & Keys + Bonus Set!",
    69900002: "5 Hextech Chests & Keys + Bonus Essence!",
    69900001: "1 Hextech Chest & Key Bundle"
}

bundle_pt_names = {
    99901662: "Conjunto Moldura Ezreal HEARTSTEEL Live My Life",
    99901663: "Conjunto Moldura Kayn HEARTSTEEL Live My Life",
    99901664: "Conjunto Moldura Aphelios HEARTSTEEL Live My Life",
    99901665: "Conjunto Moldura Yone HEARTSTEEL Live My Life",
    99901666: "Conjunto Moldura K'Sante HEARTSTEEL Live My Life",
    79900921: "Pacote Croma Ezreal HEARTSTEEL Live My Life",
    79900922: "Pacote Croma Kayn HEARTSTEEL Live My Life",
    79900923: "Pacote Croma Aphelios HEARTSTEEL Live My Life",
    79900924: "Pacote Croma Yone HEARTSTEEL Live My Life",
    79900925: "Pacote Croma K'Sante HEARTSTEEL Live My Life",
    69901087: "Baú de Skin Misteriosa de Ápice do Entretenimento",
    69901080: "Passe da Temporada 3: Mundial 2026",
    69901081: "Pacote Passe da Temporada 3: Mundial 2026",
    69901082: "Pacote Passe Premium da Temporada 3: Mundial 2026",
    69901084: "Pacote de Orbes Deluxe do Mundial 2026",
    69901085: "Pacote de Orbes Premium do Mundial 2026",
    69901086: "Pacote de Orbes Mega do Mundial 2026",
    69900003: "10 Baús e Chaves Hextec + 1 conjunto adicional!",
    69900002: "5 Baús e Chaves Hextec + Essência adicional!",
    69900001: "Pacote - 1 Baú Hextec e Chave"
}

for item_id in target_bundle_ids:
    item = cat_by_id.get(item_id)
    if not item:
        print(f"⚠️ Item {item_id} não encontrado no catalog.json")
        continue

    loc = item.get('localizations') or {}
    name_pt = bundle_pt_names.get(item_id) or loc.get('pt_BR', {}).get('name') or item.get('name') or f"Bundle {item_id}"
    name_en = bundle_en_names.get(item_id) or loc.get('en_US', {}).get('name') or name_pt
    prices = item.get('prices', [])
    rp = next((p.get('cost') for p in prices if p.get('currency') == 'RP'), 0)
    offer_id = item.get('offerId') or item.get('id')
    inv = item.get('inventoryType', 'BUNDLES')

    # Get official artwork
    icon_url = None
    if item_id == 69901087:
        icon_url = "https://d392eissrffsyf.cloudfront.net/storeImages/hextechCrafting/820.png"
    else:
        cf_url = f"https://d392eissrffsyf.cloudfront.net/storeImages/bundles/{item_id}.png"
        try:
            r = requests.head(cf_url, timeout=3)
            if r.status_code == 200:
                icon_url = cf_url
        except Exception:
            pass

    if not icon_url:
        raw_icon = item.get('iconUrl')
        if raw_icon:
            if raw_icon.startswith('http'):
                icon_url = raw_icon
            else:
                icon_url = 'https:' + raw_icon

    # Fallbacks for specific champions splash art
    if not icon_url:
        splash_map = {
            99901662: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Ezreal_78.jpg",
            99901663: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Kayn_32.jpg",
            99901664: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Aphelios_41.jpg",
            99901665: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Yone_77.jpg",
            99901666: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/KSante_18.jpg",
            79900921: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Ezreal_78.jpg",
            79900922: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Kayn_32.jpg",
            79900923: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Aphelios_41.jpg",
            79900924: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Yone_77.jpg",
            79900925: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/KSante_18.jpg",
            69901087: "https://d392eissrffsyf.cloudfront.net/storeImages/hextechCrafting/820.png"
        }
        icon_url = splash_map.get(item_id, "https://d392eissrffsyf.cloudfront.net/storeImages/bundles/69901080.png")

    bundle_entry = {
        'id': item_id,
        'item_id': item_id,
        'offer_id': offer_id,
        'name': name_en,
        'name_pt': name_pt,
        'inventoryType': inv,
        'price_rp': rp,
        'regular_rp': rp,
        'iconUrl': icon_url,
        'icon_url': icon_url
    }
    featured_bundles.append(bundle_entry)
    print(f"✅ [{len(featured_bundles)}] {name_en} | {rp} RP | Offer: {offer_id}")

feat_path = os.path.join(workspace_root, 'config', 'featured_bundles.json')
with open(feat_path, 'w', encoding='utf-8') as f:
    json.dump(featured_bundles, f, ensure_ascii=False, indent=2)

print(f"\n💾 Salvo {len(featured_bundles)} pacotes em destaque em config/featured_bundles.json!")
