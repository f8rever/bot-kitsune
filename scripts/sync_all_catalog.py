import os
import sys
import subprocess

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

def run_step(cmd, desc):
    print(f"\n--- {desc} ---")
    try:
        res = subprocess.run(cmd, check=True, text=True, capture_output=True, encoding='utf-8', errors='replace')
        if res.stdout:
            print(res.stdout.strip())
        return True
    except subprocess.CalledProcessError as e:
        print(f"Erro em {desc}: {e}")
        if e.stdout:
            print("STDOUT:", e.stdout)
        if e.stderr:
            print("STDERR:", e.stderr)
        return False

def main():
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    os.chdir(root_dir)
    print(f"[Catalog Sync] Iniciando Pipeline Completo no diretorio: {root_dir}")

    # 1. Compilação Store-First + Geração de Diff
    run_step(["node", "utils/buildFullCatalog.js"], "1. Compilando Catalogo Store-First e Gerando Diff")

    # 2. Injeção de Imagens Oficiais de Passes e Espólios
    run_step([sys.executable, "scripts/restore_official_passes_and_loot.py"], "2. Injetando Imagens Oficiais e UUIDs dos Itens Ativos")

    # 3. Sincronização de Espelhos (Python Backend e lol_giftapi-main)
    run_step([sys.executable, "scripts/sync_mirrors.py"], "3. Sincronizando Espelhos Locais e Externos")

    # 4. Sincronização com MongoDB Atlas
    run_step(["node", "scripts/push_configs_to_mongo.js"], "4. Atualizando Banco na Nuvem (MongoDB Atlas)")

    print("\n[Catalog Sync] Concluido com sucesso! Catalogo, Bot e API 100% atualizados.")

if __name__ == '__main__':
    main()
