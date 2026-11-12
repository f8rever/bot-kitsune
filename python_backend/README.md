# Kitsune V2 - Python Backend & Riot Gift API

Backend web em Python (Flask) responsável pelo gerenciamento de sessões da Riot Games, painel web de envio de presentes (`/tab/gifts`) e autenticação de contas Riot.

---

## 📁 Estrutura de Pastas

```
python_backend/
├── api_files/              # Módulos centrais de interação com a Riot Games
│   ├── gift.py             # Lógica de envio de presentes (/storefront/v3/gift) e auto-unlock de campeões
│   ├── riot_tokens.py      # Autenticação TLS, refresh de tokens e sessões Riot
│   └── xmpp.py             # Conexão XMPP (chat / status / presença de amigos no LoL)
├── static/                 # Arquivos estáticos do painel web
│   ├── bootstrap/          # Framework Bootstrap 5.3.3
│   ├── images/             # Ícones e logos oficiais (icon-rp, etc.)
│   ├── raridades/          # Selos webp de raridades (epic, legendary, mythic, ultimate, chroma)
│   ├── script.js           # Lógica do painel de presentes (busca, filtros, cards, envio)
│   └── style.css           # Tema sleek dark-glass moderno (Preto/Branco/Prata)
├── templates/              # Templates HTML renderizados pelo Flask (Jinja2)
│   ├── gift_tab.html       # Painel principal de envio de presentes
│   └── login_tab.html      # Página moderna de login Riot em inglês
├── catalog.json            # Catálogo bruto da LoL Storefront API da Riot
├── catalog_accounts.json   # Contas usadas para download automatizado de catálogo
├── catalog_cache_pt.json   # Catálogo formatado em Português
├── catalog_cache_en.json   # Catálogo formatado em Inglês
├── main_backend.py         # Servidor principal Flask (Porta 5000)
├── proxy_file.json         # Configuração de proxy de rede
└── requirements.txt        # Dependências Python (Flask, PyMongo, requests, etc.)
```

---

## 🚀 Como Iniciar

### Opção 1: Via Inicializador (Recomendado)
Na raiz do projeto `KITSUNE V2 BOT`, execute:
```cmd
iniciar_painel.bat
```

### Opção 2: Via Terminal
```cmd
cd python_backend
python -u main_backend.py
```
O servidor será iniciado na porta **5000** (`http://localhost:5000` ou `http://0.0.0.0:5000`).

---

## 🛡️ Funcionalidades Principais

1. **Envio Inteligente de Skins (Auto-Unlock):**
   - Se o destinatário não possui o Campeão base ao receber uma Skin, a API detecta automaticamente o ID do campeão pai no catálogo, presenteia o campeão base primeiro (`giftItemId: 1`), aguarda o registro na Riot e reenvia a Skin (`giftItemId: 2`) em um único clique.
2. **Multi-Idioma Automático:**
   - Suporte completo a Catálogo em Português (`pt_BR`) e Inglês (`en_US`).
3. **Sincronização Contínua:**
   - Sincroniza automaticamente com o bot do Discord e com o MongoDB Atlas via pipeline `scripts/sync_all_catalog.py`.
