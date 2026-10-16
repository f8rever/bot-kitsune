import requests
import urllib3
import json
import sys
import os

urllib3.disable_warnings()

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from detect_lcu import find_lcu_lockfile

def main():
    lf = find_lcu_lockfile()
    if not lf:
        print("❌ LoL Client não encontrado!")
        sys.exit(1)
        
    with open(lf) as f:
        parts = f.read().strip().split(':')
    port, password, protocol = parts[2], parts[3], parts[4]
    base_url = f"{protocol}://127.0.0.1:{port}"

    print(f"📡 Conectado ao LCU na porta {port}. Buscando dados completos da loja...")

    # 1. Fetch Sales
    print("\n--- 1. BUSCANDO PROMOÇÕES ATIVAS (SALES) ---")
    res_sales = requests.get(f"{base_url}/lol-store/v1/catalog/sales", auth=('riot', password), verify=False)
    sales_data = res_sales.json() if res_sales.status_code == 200 else []
    print(f"Total de itens em promoção encontrados: {len(sales_data)}")
    for i, s in enumerate(sales_data):
        loc = s.get('localizations') or {}
        name = loc.get('pt_BR', {}).get('name') or loc.get('en_US', {}).get('name') or s.get('name') or s.get('itemId')
        prices = s.get('prices', [])
        rp = next((p.get('cost') for p in prices if p.get('currency') == 'RP'), 0)
        sale_rp = 0
        if s.get('sale') and s['sale'].get('prices'):
            sale_rp = next((sp.get('cost') for sp in s['sale']['prices'] if sp.get('currency') == 'RP'), 0)
        disc = int((1 - sale_rp/rp) * 100) if rp > 0 and sale_rp > 0 else 0
        inv = s.get('inventoryType')
        print(f"  [{i+1}] {name} | {sale_rp} RP (de {rp} RP) | -{disc}% | Tipo: {inv} | ID: {s.get('itemId')}")

    # 2. Fetch Featured
    print("\n--- 2. BUSCANDO DESTAQUES ATIVOS (FEATURED) ---")
    res_feat = requests.get(f"{base_url}/lol-store/v1/featured", auth=('riot', password), verify=False)
    feat_data = res_feat.json() if res_feat.status_code == 200 else {}
    print(f"Total de itens no catálogo de destaques: {len(feat_data.get('catalog', []))}")

    # 3. Fetch Full Catalog
    print("\n--- 3. BUSCANDO CATÁLOGO COMPLETO (/lol-store/v1/catalog) ---")
    res_cat = requests.get(f"{base_url}/lol-store/v1/catalog", auth=('riot', password), verify=False)
    cat_data = res_cat.json() if res_cat.status_code == 200 else []
    print(f"Total de itens no catálogo bruto do client: {len(cat_data)}")

    # Save raw outputs
    workspace_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../..'))
    with open(os.path.join(workspace_root, 'config', 'raw_client_sales.json'), 'w', encoding='utf-8') as f:
        json.dump(sales_data, f, ensure_ascii=False, indent=2)
    with open(os.path.join(workspace_root, 'config', 'raw_client_featured.json'), 'w', encoding='utf-8') as f:
        json.dump(feat_data, f, ensure_ascii=False, indent=2)
    with open(os.path.join(workspace_root, 'config', 'catalog.json'), 'w', encoding='utf-8') as f:
        json.dump(cat_data, f, ensure_ascii=False, indent=2)

    print("\n✅ Arquivos brutos salvos com sucesso em config/!")

if __name__ == '__main__':
    main()
