import os
import sys
import subprocess
import json
import urllib3
import requests
import asyncio
from typing import Optional, Dict, Any, List, Tuple

urllib3.disable_warnings()

class LCUManager:
    """
    Gerenciador de conexão com o League Client Update (LCU) via lockfile local.
    Permite:
    1. Detectar o LoL Client aberto.
    2. Obter Invocador ativo (Nick, Nível, Ícone, PUUID).
    3. Obter Carteira (RP e Essência Azul).
    4. Obter Lista de Amigos in-game (/lol-chat/v1/friends).
    5. Baixar o catálogo completo ao vivo (/lol-store/v1/catalog) em 2 segundos.
    6. Obter Bearer Token ativo para envio de presentes (Storefront V3).
    """

    KNOWN_DIRS = [
        r"F:\Riot Games\League of Legends",
        r"C:\Riot Games\League of Legends",
        r"D:\Riot Games\League of Legends",
        r"E:\Riot Games\League of Legends",
    ]

    def __init__(self):
        self.lockfile_path: Optional[str] = None
        self.port: Optional[str] = None
        self.password: Optional[str] = None
        self.protocol: str = "https"
        self.pid: Optional[str] = None
        self.base_url: Optional[str] = None

    def find_lockfile(self) -> Optional[str]:
        # 1. Tentar via processo ativo (PowerShell)
        try:
            ps_cmd = 'Get-Process -Name LeagueClientUx, LeagueClient -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Path'
            res = subprocess.run(['powershell', '-NoProfile', '-Command', ps_cmd], capture_output=True, text=True, timeout=3)
            paths = [p.strip() for p in res.stdout.strip().splitlines() if p.strip()]
            for p in paths:
                dir_path = os.path.dirname(p)
                lf = os.path.join(dir_path, 'lockfile')
                if os.path.exists(lf):
                    return lf
        except Exception:
            pass

        # 2. Tentar caminhos conhecidos de instalação
        for d in self.KNOWN_DIRS:
            lf = os.path.join(d, 'lockfile')
            if os.path.exists(lf):
                return lf

        return None

    def refresh_connection(self) -> bool:
        lf = self.find_lockfile()
        if not lf:
            self.lockfile_path = None
            self.base_url = None
            return False

        try:
            with open(lf, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read().strip()
            parts = content.split(':')
            if len(parts) >= 5:
                self.lockfile_path = lf
                self.pid = parts[1]
                self.port = parts[2]
                self.password = parts[3]
                self.protocol = parts[4]
                self.base_url = f"{self.protocol}://127.0.0.1:{self.port}"
                return True
        except Exception as e:
            print(f"[LCU] Erro ao ler lockfile: {e}")

        return False

    def request(self, endpoint: str, method: str = "GET", json_data: Any = None, timeout: int = 5) -> Optional[requests.Response]:
        if not self.base_url and not self.refresh_connection():
            return None

        url = f"{self.base_url}{endpoint}"
        try:
            res = requests.request(
                method=method,
                url=url,
                auth=('riot', self.password),
                verify=False,
                json=json_data,
                timeout=timeout
            )
            return res
        except Exception:
            # Tenta reconectar uma vez se a porta mudou
            if self.refresh_connection():
                try:
                    return requests.request(
                        method=method,
                        url=f"{self.base_url}{endpoint}",
                        auth=('riot', self.password),
                        verify=False,
                        json=json_data,
                        timeout=timeout
                    )
                except Exception:
                    pass
        return None

    def get_status(self) -> Dict[str, Any]:
        """Retorna o status completo da conexão com o cliente e dados do invocador."""
        if not self.refresh_connection():
            return {"connected": False, "message": "League of Legends não detectado em execução."}

        # 1. Invocador
        res_sum = self.request("/lol-summoner/v1/current-summoner", timeout=4)
        if not res_sum or res_sum.status_code != 200:
            return {"connected": False, "message": "LoL detectado, mas aguardando login da conta..."}

        sum_data = res_sum.json()
        name = sum_data.get('displayName') or sum_data.get('gameName') or 'Invocador'
        tag = sum_data.get('tagLine') or ''
        riot_id = f"{name}#{tag}" if tag else name

        # 2. Carteira (RP e EA)
        rp = 0
        ea = 0
        res_wal = self.request("/lol-inventory/v1/wallet", timeout=3)
        if res_wal and res_wal.status_code == 200:
            wal_data = res_wal.json()
            rp = wal_data.get('RP', 0)
            ea = wal_data.get('lol_blue_essence', 0)

        return {
            "connected": True,
            "riot_id": riot_id,
            "name": name,
            "tag": tag,
            "level": sum_data.get('summonerLevel', 0),
            "profile_icon_id": sum_data.get('profileIconId', 29),
            "puuid": sum_data.get('puuid', ''),
            "summoner_id": sum_data.get('summonerId', 0),
            "account_id": sum_data.get('accountId', 0),
            "rp": rp,
            "blue_essence": ea,
            "port": self.port
        }

    def get_friends(self) -> List[Dict[str, Any]]:
        """Retorna a lista de amigos conectada no cliente do LoL."""
        res = self.request("/lol-chat/v1/friends", timeout=5)
        if not res or res.status_code != 200:
            return []

        friends_raw = res.json()
        friends = []
        for f in friends_raw:
            g_name = f.get('gameName') or f.get('name') or ''
            g_tag = f.get('gameTag') or ''
            disp = f"{g_name}#{g_tag}" if (g_name and g_tag) else (g_name or f.get('name') or 'Desconhecido')
            friends.append({
                "name": disp,
                "gameName": g_name,
                "gameTag": g_tag,
                "summonerId": f.get('summonerId') or f.get('id'),
                "puuid": f.get('puuid', ''),
                "icon": f.get('icon', 29),
                "availability": f.get('availability', 'offline'),
                "statusMessage": f.get('statusMessage', '')
            })

        # Ordenar: online primeiro, depois por nome
        avail_order = {"chat": 0, "dnd": 1, "away": 2, "offline": 3, "mobile": 4}
        friends.sort(key=lambda x: (avail_order.get(x['availability'], 9), x['name'].lower()))
        return friends

    def get_access_token(self) -> Optional[str]:
        """Obtém o Bearer token ativo da sessão do LoL."""
        res = self.request("/lol-rso-auth/v1/authorization/access-token", timeout=4)
        if res and res.status_code == 200:
            data = res.json()
            return data.get('token')
        return None

    def fetch_live_catalog(self) -> Tuple[bool, Any]:
        """Baixa o catálogo completo (10.600+ itens) direto do LoL aberto."""
        res = self.request("/lol-store/v1/catalog", timeout=25)
        if not res or res.status_code != 200:
            return False, f"Falha ao obter catálogo: Status {getattr(res, 'status_code', 'Sem resposta')}"

        try:
            data = res.json()
            if isinstance(data, list) and len(data) > 0:
                return True, data
            return False, "Catálogo retornado está vazio ou inválido."
        except Exception as e:
            return False, f"Erro ao decodificar JSON do catálogo: {e}"

    def sync_catalog(self, base_dir: str) -> Tuple[bool, str]:
        """
        1. Puxa catálogo ao vivo do LoL.
        2. Salva em catalog.json local e no config do bot.
        3. Executa sync_all_catalog.py se disponível.
        """
        ok, result = self.fetch_live_catalog()
        if not ok:
            return False, str(result)

        catalog_data = result
        count = len(catalog_data)

        # Salva em catalog.json local
        local_cat_path = os.path.join(base_dir, 'catalog.json')
        try:
            with open(local_cat_path, 'w', encoding='utf-8') as f:
                json.dump(catalog_data, f, ensure_ascii=False, indent=2)
            print(f"[LCU Catalog] Salvo em {local_cat_path} ({count} ofertas)")
        except Exception as e:
            return False, f"Erro ao salvar catalog.json local: {e}"

        # Salva também no config do bot se existir
        bot_cat_candidates = [
            r"c:\Users\jeff\Documents\KITSUNE V2 BOT\config\catalog.json",
            os.path.abspath(os.path.join(base_dir, '..', 'KITSUNE V2 BOT', 'config', 'catalog.json'))
        ]
        for bc in bot_cat_candidates:
            if os.path.exists(os.path.dirname(bc)):
                try:
                    with open(bc, 'w', encoding='utf-8') as f:
                        json.dump(catalog_data, f, ensure_ascii=False, indent=2)
                    print(f"[LCU Catalog] Atualizado espelho do bot: {bc}")
                except Exception:
                    pass

        # Dispara pipeline de compilação
        sync_candidates = [
            r"c:\Users\jeff\Documents\KITSUNE V2 BOT\scripts\sync_all_catalog.py",
            os.path.abspath(os.path.join(base_dir, '..', 'KITSUNE V2 BOT', 'scripts', 'sync_all_catalog.py'))
        ]
        sync_script = next((s for s in sync_candidates if os.path.exists(s)), None)
        if sync_script:
            print(f"[LCU Catalog] Executando pipeline: {sync_script}")
            try:
                sub_res = subprocess.run([sys.executable, sync_script], cwd=os.path.dirname(os.path.dirname(sync_script)), capture_output=True, text=True, timeout=45)
                if sub_res.returncode == 0:
                    return True, f"Catálogo sincronizado com sucesso diretamente do LoL Client ({count} itens) e pipeline compilado!"
                else:
                    return True, f"Catálogo salvo ({count} itens), mas o compilador retornou aviso: {sub_res.stderr[:200]}"
            except Exception as e:
                return True, f"Catálogo salvo ({count} itens), mas falha ao disparar sync_all_catalog: {e}"

        return True, f"Catálogo atualizado com sucesso via LoL Client! ({count} ofertas recebidas)"

# Instância Singleton
lcu_instance = LCUManager()
