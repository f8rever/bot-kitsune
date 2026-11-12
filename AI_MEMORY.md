# AI MEMORY — KITSUNE V2 BOT

> **Documento Central de Memória Técnica, Decisões de Arquitetura e Regras Operacionais do Projeto.**
> *Última Organização Geral:* Novembro de 2026

---

## 📑 Índice Rápido
1. [Visão Geral do Projeto](#-visão-geral-do-projeto)
2. [Estrutura de Diretórios (Oficial e Limpa)](#-estrutura-de-diretórios)
3. [Stack Tecnológica](#-stack-tecnológica)
4. [Arquitetura & Regras de Negócio Críticas](#-arquitetura--regras-de-negócio-críticas)
   - [4.1 Motor de Gifting da Riot Games (Storefront V3 & Auto-Unlock)](#41-motor-de-gifting-da-riot-games-storefront-v3--auto-unlock)
   - [4.2 Interface Discord: Padrão Obrigatório Components V2](#42-interface-discord-padrão-obrigatório-components-v2)
   - [4.3 Catálogo Store-First & Pipeline de Sincronização](#43-catálogo-store-first--pipeline-de-sincronização)
   - [4.4 Persistência em Nuvem (MongoDB Atlas & Smart Merge)](#44-persistência-em-nuvem-mongodb-atlas--smart-merge)
   - [4.5 Sistema de Emojis de Aplicação (Application Emojis)](#45-sistema-de-emojis-de-aplicação-application-emojis)
   - [4.6 Fluxo de Loja e Atendimento em Tickets](#46-fluxo-de-loja-e-atendimento-em-tickets)
5. [Comandos Slash Auditados (18 Comandos)](#-comandos-slash-auditados)
6. [Histórico Consolidado de Marcos e Evolução](#-histórico-consolidado-de-marcos-e-evolução)
7. [Próximos Passos & Roadmap](#-próximos-passos--roadmap)
8. [Regras Obrigatórias para o Agente](#-regras-obrigatórias-para-o-agente)

---

## 🦊 Visão Geral do Projeto

* **Nome Oficial:** Kitsune V2 Bot
* **Tipo:** Discord Bot & Painel Web de Gifting Automatizado de League of Legends (LoL Storefront API)
* **Objetivo:** 
  Fornecer uma experiência de loja e envio de presentes de League of Legends para a comunidade *Kitsune Store*. O sistema permite que administradores vinculem contas Riot mantidas online 24/7 com renovação automática de tokens via SSID. No Discord, clientes navegam pelo catálogo oficial da Riot Games, selecionam produtos (skins, cromas, passes, orbes, etc.) através de menus nativos modernos em **Discord Components V2** e realizam pedidos. Os presentes são enviados in-game automaticamente através do backend web em Python conectado diretamente aos endpoints da Riot Games.
* **Preços e Conversão:** Exibidos em Euros (€) com sistema de descontos configuráveis por categoria em `config/loja.json`.

---

## 📁 Estrutura de Diretórios

```
KITSUNE V2 BOT/
├── .agents/                    # Habilidades e agentes Antigravity (lol-client, loot-sync)
│   ├── skills/lol-client/      # Detecção de LCU, extração de lockfile e sync ao vivo
│   └── skills/loot-sync/       # Padronização e upload obrigatório de ícones oficiais de passes/orbes
├── commands/                   # Comandos Slash modulares do Discord
│   ├── admin/                  # anuncio, anuncio-blacklist, config, deploy, desconto, embeds, emojis, verify-panel
│   ├── loja/                   # addfriend, checar-amizade, friendlist, gift, link, login
│   ├── moderacao/              # clear
│   ├── suporte/                # fechar, ticket
│   └── utilidade/              # invites
├── config/                     # Configurações ativas do bot e catálogos mestres
│   ├── catalog.json            # Catálogo bruto da LoL Storefront API (10.600+ ofertas)
│   ├── catalog_cache_pt.json   # Catálogo formatado em Português
│   ├── catalog_cache_en.json   # Catálogo formatado em Inglês
│   ├── emojis.json             # Mapeamento oficial de emojis do bot
│   ├── embeds.json             # 43+ templates de mensagens editáveis via /embeds
│   ├── loja.json               # Configurações de margens, preços e descontos
│   ├── weekly_sales.json       # Promoções ativas da semana da Riot Games
│   ├── featured_bundles.json   # Pacotes e destaques curados
│   ├── cosmetic_emojis.json    # Mapeamento de wards, emotes e ícones
│   ├── wallpapers.json         # Banners animados e splash arts oficiais
│   ├── broadcast_blacklist.json# Lista de exclusão de membros para Mass DM
│   ├── captcha_config.json     # Configuração de solvers de captcha
│   ├── captcha_keys_pool.json  # Pool de chaves 2Captcha ativas
│   └── riot_accounts.json      # Sessões e tokens de contas Riot persistidos (gitignored)
├── data/                       # Dados persistentes locais do bot
│   ├── banners/                # Cache de GIFs animados sRGB 680p pré-renderizados
│   ├── championMap.json        # Mapeamento de IDs para nomes de campeões
│   └── skins_rarity.json       # Tabela de raridades oficiais da Riot
├── database/                   # Banco local de fallback
│   └── database.json           # Configurações locais, usuários, XP e moedas
├── events/                     # Manipuladores de eventos Discord (guildMemberAdd, etc.)
├── python_backend/             # Servidor Web & API de Presentes (Flask - Porta 5000)
│   ├── api_files/              # Apenas módulos Python (gift.py, riot_tokens.py, xmpp.py)
│   ├── static/                 # Estilos dark-glass (style.css), script.js e ícones oficiais
│   ├── templates/              # Páginas Jinja2 (gift_tab.html, login_tab.html)
│   ├── main_backend.py         # Servidor principal Flask (Gifting, Auth, Catalog)
│   ├── proxy_file.json         # Configurações de proxy de rede
│   └── requirements.txt        # Dependências Python
├── scripts/                    # Scripts de manutenção e esteiras de sincronização
│   ├── sync_all_catalog.py     # Pipeline mestre de sincronização do catálogo
│   ├── sync_mirrors.py         # Sincronizador de espelhos entre diretórios
│   ├── restore_official_passes_and_loot.py # Injeção de passes e artes da CDN
│   ├── push_configs_to_mongo.js# Atualização forçada de configs no MongoDB Atlas
│   ├── pull_from_mongo.js      # Resgate de dados do MongoDB Atlas para o disco
│   ├── deploy.js               # Registro global de comandos slash na API Discord
│   └── upload_cosmetics_emojis.js # Upload de cosméticos para Application Emojis
├── utils/                      # Módulos utilitários do Bot Discord
│   ├── componentsV2.js         # Motor Universal de Discord Components V2
│   ├── buildFullCatalog.js     # Compilador Store-First do catálogo Riot
│   ├── friendshipChecker.js    # Verificador de amizade e tempo de elegibilidade
│   ├── mongoStorage.js         # Gerenciador de conexão e Smart-Merge do MongoDB Atlas
│   ├── riotAuth.js             # Autenticação TLS, refresh e sessões Riot (Node.js)
│   ├── riotXmpp.js             # Conexão e chat Riot XMPP
│   ├── syncWeeklySales.js      # Sincronizador de promoções da semana
│   └── webmToGif.js            # Conversor FFmpeg WebM/MP4 -> GIF sRGB 680p
├── index.js                    # Ponto de entrada monolítico do Bot Discord
├── iniciar_bot.bat             # Inicializador do Bot do Discord (com auto-restarter)
├── iniciar_bot_oculto.vbs      # Inicializador invisível em segundo plano do Bot
├── iniciar_painel.bat          # Inicializador do Painel Web / API Flask (com auto-restarter)
├── package.json                # Dependências Node.js
└── AI_MEMORY.md                # Este documento de memória persistente
```

---

## 🛠️ Stack Tecnológica

### Node.js (Bot do Discord — Principal)
* **Runtime:** Node.js v22.14.0 LTS
* **discord.js** v14.27.0 — framework oficial de interação com o Discord.
* **express** v5.2.1 — servidor web leve para health check do UptimeRobot e bind no Render (`0.0.0.0:$PORT`).
* **mongodb** v7.6.0 — driver nativo do MongoDB Atlas.
* **axios** v1.18.1 — requisições HTTP seguras para APIs da Riot Games.
* **puppeteer** v25.3.0 + stealth plugins — automação de login Riot com Chrome nativo.
* **@xmpp/client** v0.14.0 & **xml2js** v0.6.2 — comunicação em tempo real via chat XMPP da Riot.
* **ffmpeg-static**, **gif-encoder-2**, **pngjs** — geração e otimização de banners animados em alta definição.

### Python (Backend Web & API de Presentes)
* **Runtime:** Python 3.12.8 (64-bit)
* **Flask** v3.0.3 & **Flask-JWT-Extended** — servidor web REST e autenticação por tokens.
* **Flask-PyMongo** & **pymongo** v4.7.3 — conexão com o MongoDB Atlas.
* **aiohttp** v3.9.5 & **httpx** v0.27.0 — requisições assíncronas TLS personalizadas com ciphers da Riot.
* **Flask-APScheduler** — execução agendada de rotinas de manutenção.

### Persistência & Hospedagem
* **MongoDB Atlas (Cluster0):** Coleções `bot_configurations`, `riot_accounts`, `invites`, `member_joins`, `verified_members`, `transactions_collection`, `account_tokens` e `gift_logs`.
* **Render (Nuvem 24/7):** Hospeda o Bot Node.js conectado à branch `main` do GitHub.
* **Localhost (Porta 5000):** Painel Web e API de presentes rodando localmente no PC da loja.

---

## 🧠 Arquitetura & Regras de Negócio Críticas

### 4.1 Motor de Gifting da Riot Games (Storefront V3 & Auto-Unlock)

1. **Rota Direta Storefront V3 Obrigatória:**
   - O envio de presentes (`task == "gift"` e `send_gift_order`) utiliza **estritamente** `POST /storefront/v3/gift` implementado em `Gift.send_gift_v3` ([`python_backend/api_files/gift.py`](file:///c:/Users/jeff/Documents/KITSUNE%20V2%20BOT/python_backend/api_files/gift.py)).
   - **NUNCA** reverter para a rota legada CAP Orders V2 (`/services/cap/orders/...`), pois ela é rejeitada pelo Cloudflare da Riot com `403 Forbidden (RBAC: access denied)`.
   - **NUNCA** descomentar o retorno antecipado `"Transaction registered successfully"` nas linhas 807-808 de `main_backend.py`.
2. **Mapeamento de `giftItemId` por Categoria & Prevenção de Colisão com TFT:**
   - Campeão base: `giftItemId: 1` (`inventoryType: "CHAMPION"`, `ipCost: 0`).
   - Skins normais: `giftItemId: 2` (`inventoryType: "CHAMPION_SKIN"`, `ipCost: 0`).
   - **REGRA CRÍTICA DE COLISÃO COM TFT:** A Riot Games reaproveita os mesmos números de `itemId` para Skins e itens de TFT (Arenas `TFT_MAP_SKIN` e Little Legends `COMPANION`). **NUNCA usar fallback `1010` em skins normais**, pois se o código `1010` for enviado com o ID de uma skin, o servidor da Riot interpreta o ID na tabela de TFT e entrega itens de TFT (Arenas/Pequenas Lendas) no lugar da skin, consumindo RP e estourando o limite diário da conta! Skins usam estritamente `giftItemId: 2` com seu `offer_id` (UUID oficial do catálogo).
   - Passes, Orbes, Pacotes, Emotes e Cromas: `giftItemId: 1010` (`ipCost: None`).
3. **Desbloqueio Automático do Campeão Base (Auto-Unlock Inteligente):**
   - Se o destinatário não possui o campeão base de uma skin presenteada, a Riot rejeita com `["exchange.items.itemTypeNotAvailable"] [BAD_PATH_PARAMETER]`.
   - O sistema detecta automaticamente o ID do campeão pai no catálogo oficial (`itemRequirements` / `parent.itemId`).
   - Se o remetente possuir saldo para ambos (`saldo >= skin_rp + champ_rp`), o sistema **presenteia o campeão base primeiro** (`giftItemId: 1`), aguarda `1.8s` para registrar no inventário da Riot e **reenvia a skin imediatamente** (`giftItemId: 2`) em um único clique.
   - O painel exibe o aviso claro: `(+ Campeão base {Nome} desbloqueado automaticamente)`.

---

### 4.2 Interface Discord: Padrão Obrigatório Components V2

1. **Ativação Global:**
   - Toda a interface do bot utiliza a biblioteca de **Discord Components V2** (`utils/componentsV2.js`), ativada no boot do bot via `enableGlobalComponentsV2()`.
   - Toda resposta de comando, painel, catálogo e ticket é renderizada através de `ContainerBuilder` com a flag `MessageFlags.IsComponentsV2`.
2. **Componentes Estruturais:**
   - Barras laterais coloridas dinâmicas (`accent_color`), separadores nativos (`SeparatorBuilder`), seções com thumbnails embutidas à direita (`SectionBuilder` + `ThumbnailBuilder`) e galerias de mídia/banners (`MediaGalleryBuilder`).
   - **Integração Total com `/embeds`:** Todas as cores, títulos e descrições editados no comando `/embeds` (`config/embeds.json`) refletem instantaneamente nos Containers V2.

---

### 4.3 Catálogo Store-First & Pipeline de Sincronização

1. **Filosofia Store-First:**
   - A Loja da Riot Games (`catalog.json` bruto com mais de 10.600 ofertas obtidas via `/storefront/v1/catalog`) é a fonte primária e absoluta de verdade. Dados estáticos de DDragon/CDragon servem apenas para enriquecer nomes e imagens.
   - Todo item possui `offer_id` UUID real da Riot para envio de presentes, preço oficial em RP e status de disponibilidade (`available` ou `off`).
2. **Pipeline Automatizado (`scripts/sync_all_catalog.py`):**
   - Roda sequencialmente:
     1. `node utils/buildFullCatalog.js` (recompila catálogo PT/EN e gera delta em `catalog_last_diff.json`).
     2. `python scripts/restore_official_passes_and_loot.py` (injeta passes ativos e URLs oficiais da CDN).
     3. `python scripts/sync_mirrors.py` (sincroniza arquivos com integridade SHA-256).
     4. `node scripts/push_configs_to_mongo.js` (persiste as configurações no MongoDB Atlas).

---

### 4.4 Persistência em Nuvem (MongoDB Atlas & Smart Merge)

1. **Prevenção de Rollbacks (Smart-Merge):**
   - No startup (`utils/mongoStorage.js`), o bot realiza um *deep merge* recursivo entre o disco local e o MongoDB Atlas. Novas chaves ou produtos adicionados ao código local nunca são sobrescritos por versões antigas da nuvem.
2. **Sincronização em Tempo Real:**
   - Qualquer modificação efetuada nos comandos `/embeds`, `/emojis`, `/desconto` ou `/anuncio-blacklist` é gravada simultaneamente no disco e no MongoDB Atlas na coleção `bot_configurations`.

---

### 4.5 Sistema de Emojis de Aplicação (Application Emojis)

1. **Uso de Application Emojis em vez de Guild Emojis:**
   - Todos os 720+ emojis oficiais do bot (skins, orbes, passes, raridades, cosméticos, setas e botões) são cadastrados como **Application Emojis** diretamente na aplicação do bot no Discord.
   - Isso elimina limites de slots de servidores (50 slots por guilda) e garante que os emojis nunca quebrem ou fiquem com a tag vazia `:nome_emoji:`.
2. **Regra Obrigatória da Skill `loot-sync`:**
   - **MANDATÓRIO:** Todo e qualquer novo passe, orbe ou cápsula adicionado à loja DEVE ter sua arte oficial baixada, redimensionada para 128x128 PNG com interpolação Lanczos, enviada para Application Emojis e mapeada em `config/emojis.json`. É proibido usar ícones genéricos ou reutilizar artes de eventos antigos.

---

### 4.6 Fluxo de Loja e Atendimento em Tickets

1. **Estrutura das 5 Categorias Oficiais do Cliente do LoL:**
   - 🌟 **Featured & Offers (`cat_highlights`):** Passes do evento ativo, Pacotes especiais, Orbes e as 20 Promoções da Semana da Riot (-27% a -60% OFF).
   - 👕 **Champion Skins & Chromas (`cat_skins`):** Catálogo de todas as skins e cromas de 290 RP com busca por campeão.
   - 📦 **Loot, Passes & Chests (`cat_loot`):** Passes do evento ativo, Orbes, Baús Hextec e Presentes Misteriosos.
   - ⚔️ **Champions & Eternals (`cat_champions`):** Todos os 173 Campeões e Séries de Estatísticas Eternos.
   - 🎭 **Summoner Accessories (`cat_accessories`):** Emotes (350 RP), Sentinelas (640 RP) e Ícones de Invocador (250 RP).
2. **UX de Tela Fixa:**
   - A tela principal `Catalog of Gifts` permanece fixa ao navegar entre categorias. Apenas os Select Menus e a fileira de botões são alternados, evitando transições pesadas e recarregamentos visuais.
3. **Resiliência de Tickets:**
   - Criação protegida por mutex (`global.activeTicketCreations`) impedindo abertura de canais duplicados.
   - Botão `Refresh` (`🔄`) com restauração do carrinho diretamente do histórico do canal, mesmo que o bot tenha sido reiniciado.
   - Fechamento seguro (`/fechar`, botão ou comandos de texto `!close`) com sanitização de quebras de linha para auditoria do Discord.

---

## ⚡ Comandos Slash Auditados

Todos os 18 comandos abaixo possuem permissões estritas de Staff (`Administrator` ou `ManageMessages`), exceto `/invites`:

| Comando | Categoria | Descrição |
|---|---|---|
| `/anuncio` | Admin | Disparo de comunicados e novidades com delay seguro anti-ban e prévia ao vivo |
| `/anuncio-blacklist` | Admin | Gerenciamento da lista de membros que não devem receber anúncios |
| `/config` | Admin | Configuração do cargo verificado e staff do servidor |
| `/deploy` | Admin | Registro e deploy forçado dos comandos slash na API global do Discord |
| `/desconto` | Admin | Ajuste dinâmico de margens de desconto (%) por categoria de produto |
| `/embeds` | Admin | Editor visual dos 43+ templates de mensagens com prévia e seletor agrupado |
| `/emojis` | Admin | Gerenciador e visualizador de mapeamento de emojis do sistema |
| `/verify-panel` | Admin | Envio do painel fixo de verificação de membros |
| `/addfriend` | Loja | Envio automatizado de solicitação de amizade Riot via chat XMPP |
| `/checar-amizade` | Loja | Consulta oficial na Riot Store do tempo de amizade e contagem regressiva de 24h |
| `/friendlist` | Loja | Listagem paginada de amigos adicionados em contas Riot vinculadas |
| `/gift` | Loja | Disparo manual de presentes via API com logs de auditoria |
| `/link` | Loja | Vinculação segura de contas Riot via token ou cookies de sessão 24/7 |
| `/login` | Loja | Autenticação direta de contas Riot com suporte a 2FA e Captcha |
| `/clear` | Moderação | Limpeza em massa segura de mensagens no canal |
| `/fechar` | Suporte | Encerramento seguro de canais de atendimento e tickets |
| `/ticket` | Suporte | Envio do painel oficial fixo da loja no canal de vendas (`Buy here`) |
| `/invites` | Utilidade | Estatísticas detalhadas de convites e membros convidados pelo usuário |

---

## 📜 Histórico Consolidado de Marcos e Evolução

* **Fase 1 (Estruturação e Base do Bot):** Migração do bot para modelo monolítico no `index.js`, integração do express para pings do Render e UptimeRobot, conexão inicial com o cluster MongoDB Atlas e suporte básico a comandos slash.
* **Fase 2 (Catálogo Store-First & Purga de Itens Expirados):** Abandono de listas estáticas de DDragon em prol da leitura direta da Storefront API da Riot Games. Implementação do rastreamento de deltas (`catalog_last_diff.json`), normalização de UUIDs reais de compra e eliminação de eventos e passes encerrados (como Hall of Legends 2026/Faker e passes de 2024).
* **Fase 3 (Migração para Application Emojis):** Migração massiva de todos os emojis do servidor para os Application Emojis da aplicação Discord (mais de 720 emojis oficiais em alta definição), blindando o sistema contra quebras de ícones e liberando espaço nos servidores.
* **Fase 4 (Resiliência do Gifting & Restauração da Storefront V3):** Descoberta do bloqueio RBAC 403 na rota CAP Orders V2 e restauração definitiva do endpoint direto `POST /storefront/v3/gift`. Correção do fluxo de saldo RP e exibição de contadores em tempo real.
* **Fase 5 (Discord Components V2):** Transformação estética universal de todos os comandos, painéis, tabelas de preços e tickets para **Discord Components V2** (`ContainerBuilder`), integrando banners animados sRGB em 680p e layout moderno.
* **Fase 6 (Sincronização Multi-Idioma & Auto-Unlock de Campeões):** Implementação da esteira de catálogo PT-BR e EN-US a partir de uma única conta autenticada. Criação do sistema inteligente de auto-unlock de campeões base ao enviar skins para destinatários que ainda não possuem o personagem.
* **Fase 7 (Limpeza Estrutural e Higienização):** Eliminação de mais de 35 MB de dados obsoletos e arquivos duplicados em `python_backend/api_files/` e na raiz. Criação do inicializador `iniciar_painel.bat` com auto-restarter e atualização das políticas de `.gitignore`.

---

## 🎯 Próximos Passos & Roadmap

- [x] Sincronização automatizada da Loja Riot em tempo real via LCU (`lol-client`).
- [x] Resolução automática de campeões base faltantes em compras de skins (Auto-Unlock).
- [x] Migração universal de comandos e embeds para Discord Components V2.
- [x] Otimização e limpeza estrutural de diretórios e espelhos.
- [ ] **Essências e Saldos Avançados (Opcional):** Exibição de saldos adicionais (Essência Mítica e Essência Azul) no painel web para contas de catálogo.
- [ ] **Painel de Controle White-Label (Futuro):** Provisionamento de instâncias e personalização dinâmica de bot para revenda comercial.

---

## 📌 Regras Obrigatórias para o Agente

1. **Fonte da Verdade:** Sempre ler este arquivo antes de iniciar qualquer trabalho. Usar os arquivos atuais do projeto e a base de código real como fonte da verdade, sem assumir estados que não estão documentados aqui.
2. **Deploy Contínuo no Render:** Sempre que realizar alterações no código, executar `git commit` e `git push origin main` para acionar a esteira de deploy automático do bot em produção no Render.
3. **Regra de Concorrência (Render vs Local):** Não manter o processo `node index.js` rodando localmente enquanto o deploy de produção no Render estiver ativo, para evitar duplicidade de instâncias respondendo à Discord Gateway.
4. **PADRÃO OBRIGATÓRIO DE UI (Discord Components V2):** Todo e qualquer comando, painel, resposta, ticket ou mensagem do bot DEVE utilizar Discord Components V2 (`ContainerBuilder` / `MessageFlags.IsComponentsV2` via `utils/componentsV2.js`). Nunca criar telas fora do padrão V2.
5. **PADRÃO OBRIGATÓRIO DA WEB API DE PRESENTES (`main_backend.py` & `api_files/gift.py`):**
   - Nunca descomentar o retorno antecipado `Transaction registered successfully` nas linhas 807-808 de `main_backend.py`.
   - O envio de presentes (`task == "gift"`) deve sempre utilizar a rota direta Storefront V3 (`Giftobj.send_gift_v3` -> `POST /storefront/v3/gift`).
   - Manter sempre sincronizados os diretórios `C:\Users\jeff\Documents\lol_giftapi-main` e `c:\Users\jeff\Documents\KITSUNE V2 BOT\python_backend` utilizando `scripts/sync_mirrors.py`.
6. **REGRA OBRIGATÓRIA DA SKILL `loot-sync`:** Todo novo passe ou orbe adicionado à loja DEVE ter seu ícone oficial da Riot CDN baixado, redimensionado para 128x128 PNG com interpolação Lanczos, enviado para os Application Emojis da aplicação Discord e registrado em `config/emojis.json`. É estritamente proibido o uso de artes genéricas ou placeholders.
7. **REGRA DO AUTO-UNLOCK DE CAMPEÕES BASE:** Ao enviar uma skin de campeão (`CHAMPION_SKIN`), nunca utilizar o fallback com `giftItemId: 1010`. Em caso de erro de campeão ausente no destinatário (`itemTypeNotAvailable`), disparar primeiro o presente do campeão base (`giftItemId: 1`) e, após `1.8s`, enviar a skin (`giftItemId: 2`).
8. **Preservação de Integridade:** Não apagar informações históricas importantes e registrar todas as alterações estruturais neste documento ao final de cada intervenção relevante.
