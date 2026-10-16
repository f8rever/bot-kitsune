import os
import sys
import subprocess
import urllib3
import requests

urllib3.disable_warnings()

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

def find_lcu_lockfile():
    # 1. Try finding process via powershell
    try:
        ps_cmd = 'Get-Process -Name LeagueClientUx, LeagueClient -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Path'
        res = subprocess.run(['powershell', '-Command', ps_cmd], capture_output=True, text=True)
        paths = [p.strip() for p in res.stdout.strip().splitlines() if p.strip()]
        for p in paths:
            dir_path = os.path.dirname(p)
            lockfile_path = os.path.join(dir_path, 'lockfile')
            if os.path.exists(lockfile_path):
                return lockfile_path
    except Exception:
        pass

    # 2. Check common installation directories
    common_roots = [
        r'F:\Riot Games\League of Legends',
        r'C:\Riot Games\League of Legends',
        r'D:\Riot Games\League of Legends',
        r'E:\Riot Games\League of Legends'
    ]
    for r in common_roots:
        lf = os.path.join(r, 'lockfile')
        if os.path.exists(lf):
            return lf

    return None

def main():
    print("🔍 Procurando cliente do League of Legends ativo...")
    lf_path = find_lcu_lockfile()
    if not lf_path:
        print("❌ Nenhum cliente do League of Legends (LCU) foi detectado em execução.")
        print("💡 Inicie o LoL e tente novamente.")
        sys.exit(1)

    print(f"✅ Lockfile encontrado: {lf_path}")
    try:
        with open(lf_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read().strip()
    except Exception as e:
        print(f"❌ Erro ao ler lockfile: {e}")
        sys.exit(1)

    parts = content.split(':')
    if len(parts) < 5:
        print(f"❌ Formato de lockfile inválido: {content}")
        sys.exit(1)

    proc_name, pid, port, password, protocol = parts[0], parts[1], parts[2], parts[3], parts[4]

    print("\n--- ⚡ INFORMAÇÕES DE CONEXÃO DO LCU ---")
    print(f"• Processo: {proc_name} (PID: {pid})")
    print(f"• Porta LCU: {port}")
    print(f"• Protocolo: {protocol}")
    print(f"• Token / Auth: {password}")

    # Test API
    base_url = f"{protocol}://127.0.0.1:{port}"
    try:
        res = requests.get(f"{base_url}/lol-summoner/v1/current-summoner", auth=('riot', password), verify=False, timeout=5)
        if res.status_code == 200:
            sum_data = res.json()
            name = sum_data.get('displayName') or sum_data.get('gameName') or 'Desconhecido'
            tag = sum_data.get('tagLine') or ''
            level = sum_data.get('summonerLevel', 0)
            puuid = sum_data.get('puuid', '')
            full_name = f"{name}#{tag}" if tag else name
            print(f"\n👤 Invocador Logado: {full_name}")
            print(f"⭐ Nível: {level}")
            print(f"🔑 PUUID: {puuid}")
            print("🚀 Conexão com o LoL Client estabelecida com sucesso!")
        else:
            print(f"⚠️ Cliente detectado, mas resposta da API retornou status {res.status_code}")
    except Exception as e:
        print(f"❌ Erro ao comunicar com API do LCU: {e}")

if __name__ == '__main__':
    main()
