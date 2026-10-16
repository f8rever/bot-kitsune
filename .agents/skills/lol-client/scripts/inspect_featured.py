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
        print("LCU not running")
        return
    with open(lf) as f:
        parts = f.read().strip().split(':')
    port, password, protocol = parts[2], parts[3], parts[4]

    url = f"{protocol}://127.0.0.1:{port}/lol-store/v1/featured"
    res = requests.get(url, auth=('riot', password), verify=False)
    if res.status_code != 200:
        print(f"Failed to get featured: {res.status_code}")
        return

    featured = res.json()
    print("=== DUMP DESTAQUES (FEATURED) DO LOL CLIENT ===")
    print("Keys:", list(featured.keys()) if isinstance(featured, dict) else len(featured))
    
    # Save a formatted copy for inspection
    with open("scratch_featured.json", "w", encoding="utf-8") as out:
        json.dump(featured, out, ensure_ascii=False, indent=2)
    print("Saved to scratch_featured.json")

    if isinstance(featured, dict):
        for k, v in featured.items():
            print(f"\n--- Seção: {k} (type={type(v).__name__}, len={len(v) if hasattr(v, '__len__') else v}) ---")
            if isinstance(v, list):
                for i, item in enumerate(v[:10]):
                    if isinstance(item, dict):
                        name = item.get('name') or item.get('title') or item.get('nameKey') or item.get('itemId')
                        rp = item.get('price') or item.get('cost') or item.get('prices')
                        print(f"  [{i+1}] Name: {name} | RP: {rp} | Type: {item.get('itemType') or item.get('type')}")
                    else:
                        print(f"  [{i+1}] {item}")
            elif isinstance(v, dict):
                for sub_k, sub_v in list(v.items())[:5]:
                    print(f"   {sub_k}: {type(sub_v).__name__}")

if __name__ == '__main__':
    main()
