import os
import sys
import subprocess
import urllib3
import requests
import json

urllib3.disable_warnings()

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

# Import detector
script_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(script_dir)
from detect_lcu import find_lcu_lockfile

def main():
    print("🔄 Sincronizando catálogo ao vivo diretamente do Client do LoL...")
    lf_path = find_lcu_lockfile()
    if not lf_path:
        print("❌ Cliente do League of Legends não encontrado em execução!")
        sys.exit(1)

    with open(lf_path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read().strip()
    parts = content.split(':')
    port, password, protocol = parts[2], parts[3], parts[4]

    url = f"{protocol}://127.0.0.1:{port}/lol-store/v1/catalog"
    print(f"📡 Baixando catálogo da loja local (Porta: {port})...")
    res = requests.get(url, auth=('riot', password), verify=False, timeout=30)
    if res.status_code != 200:
        print(f"❌ Falha ao obter catálogo: Status {res.status_code}")
        sys.exit(1)

    data = res.json()
    print(f"📦 Total de itens recebidos do client: {len(data)}")

    # Target path (4 levels up from .agents/skills/lol-client/scripts to workspace root)
    workspace_root = os.path.abspath(os.path.join(script_dir, '../../../..'))
    catalog_path = os.path.join(workspace_root, 'config', 'catalog.json')

    print(f"💾 Salvando em {catalog_path}...")
    with open(catalog_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print("🚀 Executando pipeline automático de compilação e sincronização do bot...")
    sync_script = os.path.join(workspace_root, 'scripts', 'sync_all_catalog.py')
    sub_res = subprocess.run([sys.executable, sync_script], cwd=workspace_root)
    if sub_res.returncode == 0:
        print("\n🎉 Catálogo do Bot e da API atualizados com sucesso diretamente do LoL Client!")
    else:
        print(f"\n⚠️ O pipeline de compilação retornou código de erro {sub_res.returncode}")

if __name__ == '__main__':
    main()
