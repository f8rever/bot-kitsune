import os
import sys
import json
import urllib.request
import re

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

def normalize_name(name):
    """Normaliza apóstrofos e espaços para comparação precisa."""
    return name.replace('’', "'").replace('`', "'").strip().lower()

def check_updates(silent=False):
    workspace_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    catalog_path = os.path.join(workspace_root, 'config', 'catalog_cache_pt.json')

    if not os.path.exists(catalog_path):
        return {'status': 'error', 'message': 'Catálogo local não encontrado.'}

    with open(catalog_path, 'r', encoding='utf-8') as f:
        local_data = json.load(f)

    local_skins_map = {normalize_name(k): k for k in local_data.get('Skins', {}).keys()}
    local_chromas = set(local_data.get('Chromas', {}).keys())

    # 1. Obter versão mais recente do Data Dragon oficial da Riot
    try:
        req = urllib.request.Request(
            'https://ddragon.leagueoflegends.com/api/versions.json',
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            versions = json.loads(resp.read().decode('utf-8'))
        latest_version = versions[0]
    except Exception as e:
        return {'status': 'error', 'message': f'Falha ao consultar versão da Riot: {e}'}

    # 2. Obter lista de campeões e skins do Data Dragon
    try:
        req = urllib.request.Request(
            f'https://ddragon.leagueoflegends.com/cdn/{latest_version}/data/pt_BR/championFull.json',
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            champ_data = json.loads(resp.read().decode('utf-8'))['data']
    except Exception as e:
        return {'status': 'error', 'message': f'Falha ao consultar dados de skins: {e}'}

    # 3. Filtrar skins e identificar ausências no catálogo local
    missing_giftable = []
    missing_special = []

    for champ_id, cinfo in champ_data.items():
        for skin in cinfo.get('skins', []):
            if skin.get('num') == 0:
                continue
            name = skin.get('name', '').strip()
            # Cromas no DDragon costumam terminar com o nome da variante entre parênteses
            if re.search(r'\([^)]+\)$', name):
                continue

            norm = normalize_name(name)
            if norm not in local_skins_map:
                skin_entry = {
                    'id': int(skin.get('id', 0)),
                    'name': name,
                    'champion': cinfo.get('name', champ_id),
                    'champion_id': champ_id
                }
                # Diferenciar skins presenteáveis normais de Prestígio/Míticas/Recompensas
                is_special = (
                    'prestígio' in norm or
                    'vitorios' in norm or
                    'das cinzas' in norm or
                    'edita' in norm
                )
                if is_special:
                    missing_special.append(skin_entry)
                else:
                    missing_giftable.append(skin_entry)

    # 4. Verificar se o cliente do LoL está aberto
    lol_client_running = False
    try:
        import subprocess
        out = subprocess.check_output('tasklist /FI "IMAGENAME eq LeagueClientUx.exe" /NH', shell=True).decode('utf-8', errors='ignore')
        lol_client_running = 'LeagueClientUx.exe' in out
    except Exception:
        lol_client_running = False

    is_outdated = len(missing_giftable) > 0

    result = {
        'status': 'success',
        'is_outdated': is_outdated,
        'latest_riot_version': latest_version,
        'total_local_skins': len(local_skins_map),
        'missing_giftable_count': len(missing_giftable),
        'missing_special_count': len(missing_special),
        'missing_giftable': missing_giftable,
        'lol_client_running': lol_client_running
    }

    if not silent:
        print("=" * 68)
        print("🔎 VERIFICADOR DE ATUALIZAÇÕES DO CATÁLOGO KITSUNE")
        print("=" * 68)
        print(f"📦 Patch Oficial Riot Games (DDragon): {latest_version}")
        print(f"📁 Skins Registradas no Catálogo Local: {len(local_skins_map)}")
        print("-" * 68)

        if is_outdated:
            print("⚠️  STATUS: CATÁLOGO DESATUALIZADO!")
            print(f"🎯 Foram identificadas skins recentes que não constam na base local.")
            print(f"📌 Destaques das Skins Mais Recentes Faltando:")
            sorted_missing = sorted(missing_giftable, key=lambda x: x['id'], reverse=True)
            for s in sorted_missing[:12]:
                print(f"   • {s['name']} ({s['champion']})")

            print("-" * 68)
            if lol_client_running:
                print("🟢 League of Legends Client ABERTO E PRONTO!")
                print("👉 Execute para atualizar tudo automaticamente:")
                print("   python .agents/skills/lol-client/scripts/sync_live_catalog.py")
            else:
                print("🟡 LoL Client Fechado no momento.")
                print("👉 Para sincronizar as novas skins e passes:")
                print("   1. Abra o League of Legends no seu computador.")
                print("   2. Execute: python .agents/skills/lol-client/scripts/sync_live_catalog.py")
        else:
            print("✅ STATUS: CATÁLOGO 100% ATUALIZADO!")
            print("Todas as skins do patch atual estão sincronizadas.")
        print("=" * 68)

    return result

if __name__ == '__main__':
    check_updates()
