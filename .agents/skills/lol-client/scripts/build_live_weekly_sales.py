import json
import sys
import os
import requests

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

workspace_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../..'))

# Fetch CDragon skins mapping
print("🌐 Carregando nomes e ícones oficiais em inglês (CDragon)...")
try:
    cdragon_skins = requests.get('https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/skins.json', timeout=10).json()
except Exception:
    cdragon_skins = {}

with open(os.path.join(workspace_root, 'config', 'catalog.json'), encoding='utf-8') as f:
    cat_items = json.load(f)
    cat = {f"{item.get('inventoryType')}_{item.get('itemId')}": item for item in cat_items}

with open(os.path.join(workspace_root, 'config', 'raw_client_sales.json'), encoding='utf-8') as f:
    sales = json.load(f)

formatted_sales = []

for i, s in enumerate(sales):
    inv = s['item']['inventoryType']
    item_id = s['item']['itemId']
    cat_item = cat.get(f"{inv}_{item_id}", {})
    loc = cat_item.get('localizations') or {}
    name_pt = loc.get('pt_BR', {}).get('name') or cat_item.get('name') or f"{inv} {item_id}"
    
    # Get official English name from CDragon
    cd_skin = cdragon_skins.get(str(item_id), {})
    name_en = cd_skin.get('name') or loc.get('en_US', {}).get('name') or name_pt
    
    regular_rp = next((p['cost'] for p in cat_item.get('prices', []) if p.get('currency') == 'RP'), 0)
    sale_rp = next((p['cost'] for p in s.get('sale', {}).get('prices', []) if p.get('currency') == 'RP'), 0)
    disc = int(round((1 - sale_rp/regular_rp)*100)) if regular_rp > 0 else 0
    offer_id = cat_item.get('id')
    
    # High-res splash / icon
    icon_url = None
    if cd_skin.get('splashPath'):
        p = cd_skin['splashPath'].lower()
        if '/champion/' in p:
            parts = p.split('/champion/')[1].split('/')
            champ = parts[0]
            skin_num = parts[-1].replace('.jpg', '').replace('.png', '').split('_')[-1]
            icon_url = f"https://ddragon.leagueoflegends.com/cdn/img/champion/splash/{champ.capitalize()}_{skin_num}.jpg"
    
    if not icon_url:
        icon_url = cat_item.get('iconUrl')
        if icon_url and not icon_url.startswith('http'):
            icon_url = 'https:' + icon_url

    print(f"[{i+1}] {name_en} ({name_pt}) | {sale_rp} RP (era {regular_rp} RP) | -{disc}% | {inv} | ID: {item_id}")
    formatted_sales.append({
        'id': item_id,
        'name': name_en,
        'name_pt': name_pt,
        'inventoryType': inv,
        'regular_rp': regular_rp,
        'sale_rp': sale_rp,
        'price_rp': sale_rp,
        'discount_percent': disc,
        'offer_id': offer_id,
        'iconUrl': icon_url
    })

sales_path = os.path.join(workspace_root, 'config', 'weekly_sales.json')
with open(sales_path, 'w', encoding='utf-8') as f:
    json.dump(formatted_sales, f, ensure_ascii=False, indent=2)

print(f"\n💾 Salvo {len(formatted_sales)} promoções reais em config/weekly_sales.json com nomes EN/PT!")
