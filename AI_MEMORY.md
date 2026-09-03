# AI MEMORY — KITSUNE V2 BOT

## PROJETO

Nome: Kitsune V2 Bot

Tipo: Discord Bot (Loja de Gifting de League of Legends)

Objetivo:
Bot de Discord para a "Kitsune Store" — uma loja automatizada de presentes (gifting) de League of Legends. O bot permite que um staff/admin vincule contas Riot ao sistema e, através de interações no Discord (botões, menus, modals), clientes possam navegar um catálogo completo de itens do LoL (skins, chromas, passes, orbes, etc.), selecionar produtos, e receber presentes in-game enviados via API da Riot. Preços são exibidos em Euros (€) com sistema de descontos configuráveis por categoria.

---

## ESTRUTURA DO PROJETO

Principais diretórios:

- `commands/admin/` — comandos administrativos (config, config-store, deploy, desconto, embeds)
- `commands/loja/` — comandos da loja Riot (addfriend, friendlist, gift, link, login)
- `commands/moderacao/` — comandos de moderação (clear, lock)
- `commands/suporte/` — comandos de suporte (emojis, ticket)
- `commands/utilidade/` — comandos utilitários (join, leave, table)
- `config/` — configurações (config.json, loja.json, emojis.json, embeds.json, catalogs cache, riot_accounts.json)
- `data/` — dados estáticos (catalogo.json, champion.json, championMap.json, skins_rarity.json)
- `database/` — banco de dados local (database.json em JSON, catalogo.db em SQLite)
- `events/` — event handlers do Discord (guildMemberAdd, messageCreate)
- `python_backend/` — backend Python completo (Flask + MongoDB) — versão original/legada da API de gifting
- `lol_giftapi-main/` — cópia/fork da API Python de gifting (mesma estrutura do python_backend, redundante)
- `scripts/` — scripts auxiliares (deploy.js, check_db.js, checkSchema.js, download_catalog_pngs.js, importBundles.js)
- `utils/` — módulos utilitários (riotAuth.js, riotXmpp.js, catalog.js, catalogSync.js, customEmbeds.js, embedFormat.js)
- `pngs_catalogos/` — imagens PNG dos itens do catálogo organizadas por categoria (skins, cromas, passes, etc.)

Arquivo principal: `index.js` (~3123 linhas, 171KB) — contém TODA a lógica principal do bot monolítica.

---

## TECNOLOGIAS

### Node.js (Bot Discord — Principal)
- **discord.js** v14.27.0 — framework do bot Discord
- **express** v5.2.1 — servidor web (health check para UptimeRobot/Render)
- **axios** v1.18.1 — requisições HTTP para APIs da Riot
- **puppeteer** v25.3.0 + plugins stealth — automação de browser (login Riot)
- **sqlite3** v6.0.1 — banco de dados SQLite (catálogo)
- **dotenv** v17.4.2 — variáveis de ambiente
- **xml2js** v0.6.2 — parsing XML para XMPP
- **@xmpp/client** v0.14.0 — cliente XMPP (chat Riot)
- **@discordjs/voice** + opusscript + libsodium — áudio/voz (join/leave channels)

### Python (Backend Legado/Auxiliar)
- **Flask** 3.0.3 — API REST
- **MongoDB** (pymongo 4.7.3) — banco de dados na nuvem (Atlas)
- **Flask-JWT-Extended** — autenticação JWT
- **Flask-APScheduler** — tarefas agendadas
- **aiohttp** / **httpx** — requisições async para API Riot
- **Celery** — fila de tarefas (configurado mas possivelmente não ativo)

### Banco de Dados
- **database.json** — banco local JSON (config, usuarios, warns, tickets, XP/nível/moedas)
- **catalogo.db** — SQLite (catálogo de itens do LoL)
- **MongoDB Atlas** — usado pelo backend Python (chaves de API, transações, contas, logs de gift)
- **riot_accounts.json** — contas Riot vinculadas persistidas em JSON (tokens, sessões 24/7)

### Hospedagem
- Preparado para **Render** (web server Express na porta 3000 para pings do UptimeRobot)
- Backend Python preparado para **Vercel** (vercel.json) e **Google Cloud** (app.yaml)

---

## DECISÕES IMPORTANTES

### Arquitetura
- O bot é **monolítico** — toda a lógica de interação (loja, catálogo, ticket, gift, etc.) está concentrada no `index.js` (~3123 linhas)
- Os comandos em `commands/` exportam apenas `name`, `description`, `options` e `execute()` — são carregados dinamicamente pelo index.js
- A maior parte da lógica de catálogo, preços, filtros, raridade e fluxo de compra está dentro do index.js

### Catálogo
- Usa `catalog_cache_en.json` como catálogo principal (forçado inglês para evitar problemas de localização/raridade)
- Fallback de múltiplos caminhos para encontrar o catálogo (config/, lol_giftapi-main/, python_backend/, data/)
- Sistema de raridade baseado em `data/skins_rarity.json` com categorias: kTranscendent, kExalted, kUltimate, kMythic, kLegendary, kEpic, kRare
- Detecção de chromas via nome, parent_id e subInventoryType
- Catálogo suporta sincronização via Python backend ou direto pela Store API da Riot (catalogSync.js)

### Autenticação Riot
- Login via URL de redirecionamento (access_token na URL) — comando `/link`
- Suporte a SSID cookie para renovação automática 24/7 sem expirar
- Heartbeat automático a cada 60 segundos para manter sessões ativas (refreshAccountsTask)
- Refresh automático de tokens: SSID → Username/Password → Entitlements → Balance → Geopas → Friendlist

### Preços e Descontos
- Preços em Euros (€) — público-alvo parece ser Portugal/Europa
- Conversão RP → EUR via fórmula base: `rpCost * 0.0060`
- O bot é **monolítico** (`index.js` com ~3817 linhas).
- Sistema de catálogo atualizado com 10.242 itens.
- **Configuração de Emojis:** 136 linhas, 12 categorias (`menu_principal`, `skins`, `loot`, `acessorios`, `bundles`, `ticket`, `loja_produtos`, `loja_status`, `utilidades`, `staff_e_suporte`, `lol_roles`, `lol_regions`).
- Persistência via **MongoDB Atlas** para Contas Riot, Convites e Verificações.

---

## FUNCIONALIDADES IMPLEMENTADAS

### Loja / Gifting (Core)
- [x] Painel fixo da loja no chat (`/ticket`)
- [x] Central de vendas com 14 categorias presentes
- [x] Catálogo paginado com 25 itens/página
- [x] Envio de presente via API Riot (`/gift`) com logs de auditoria
- [x] Ícone/imagem do item no catálogo (HD)

### Administração
- [x] Configuração centralizada (`/config`, `/config-store`, `/desconto`, `/embeds`, `/emojis`)
- [x] Gerenciamento de 12 categorias de emojis
- [x] Deploy/re-deploy de comandos Slash

### Moderação & Utilidades
- [x] `/clear`, `/join`, `/leave`, `/table`, `/invites`, `/verify-panel`

---

## ESTADO ATUAL (2026-09-03)

**Estado funcional/operacional**:
- **21 Comandos Slash 100% Válidos** (inclui `/anuncio`, `/anuncio-blacklist` e `/checar-amizade`).
- **Sistema de Verificação de Amizade & Elegibilidade de Gifting (`commands/loja/checar-amizade.js` & `utils/friendshipChecker.js`):**
  - Acionamento direto pelo botão `⏱️ Checar Amizade & 24h` (`btn_check_friendship`) na embed do ticket ou via slash command `/checar-amizade`.
  - Suporte a seleção de conta Riot (`alt`) com menu e autocomplete interativo com saldo de RP e status em tempo real.
  - Renovação automática de tokens via `SSID` caso estejam perto de expirar.
  - Consulta direta à API oficial de presentes da Riot (`storefront/v3/gift/friends`) com extração do timestamp exato de início de amizade (`friendsSince`).
  - Cálculo automático de tempo decorrido de amizade e cálculo duplo de cooldown:
    - **Regra 24 Horas (LoL Padrão):** Indica se já liberou ou quantas horas/minutos restam e a data/hora exata de liberação.
    - **Regra 7 Dias (Eventos Especiais):** Indica se já liberou ou quantos dias/horas restam.
  - Atualização em tempo real do campo `⏱️ Status de Gifting (24h)` na embed principal do canal do ticket.
  - Caso o cliente não esteja adicionado: alerta explicativo e botão direto `➕ Enviar Pedido de Amizade` que dispara o envio pelo chat Riot XMPP.
- **Sistema de Anúncio / Mass DM com Proteção Anti-Ban (`commands/admin/anuncio.js`):**
  - Modal interativo para criação de título, descrição, banner, botões com link e cor.
  - Prévia do visual com confirmação antes do envio.
  - Delay seguro inteligente de 3 segundos por membro para evitar restrição ou quarentena da API do Discord.
  - Tratamento automático para membros com DM fechada (erro 50007 ignorado sem travar).
  - Suporte a disparo local (apenas no servidor atual) ou global (em todos os servidores onde o bot está).
  - **Sistema de Blacklist / Exclusão de Membros (`commands/admin/anuncio-blacklist.js` & `utils/broadcastBlacklist.js`):**
    - Blacklist permanente em `config/broadcast_blacklist.json` sincronizada no MongoDB Atlas (`bot_configurations -> broadcast_blacklist`).
    - Opções no `/anuncio` para `ignorar_staff: true` (não envia para moderadores/admins) e `ignorar_ids` (IDs temporários extras).
    - Comando `/anuncio-blacklist` com ações de adicionar, remover, listar e limpar.
    - Exibe contagem de membros bloqueados/ignorados na prévia e no relatório final.
- **Gerenciador de Embeds (/embeds):**
  - Expandido para 3 menus estruturados cobrindo todos os 43+ embeds do bot (Loja, Pedidos, Catálogos, Tabelas, Verificação, Convites e Anúncios).
  - Botão `voltar_menu_embeds_inicio` ("⬅️ Voltar para Todos os Embeds") corrigido no `index.js` para retornar sempre os 3 menus modernos sem regredir para 2.
  - Todos os embeds para clientes em Inglês com descrições de comandos em Português.
- **10.242 itens** no catálogo em PT e EN.
- Python Backend — Python 3.12 funcional.
- **Persistência 24/7 no MongoDB Atlas ativa:**
  - Coleção `bot_configurations` armazena `embeds`, `emojis`, `loja`, `config` e `broadcast_blacklist` na nuvem em tempo real.
  - Índices únicos automáticos criados e garantidos em todas as coleções: `bot_configurations` (`configType`), `riot_accounts` (`accountName`), `invites` (`guildId + userId`), `member_joins` (`guildId + memberId`), `verified_members` (`guildId + userId`), e `gift_logs` (`timestamp`).
  - O bot sincroniza automaticamente no boot e persiste qualquer alteração feita via `/embeds`, `/emojis`, `/config-store`, `/desconto` diretamente no MongoDB Atlas.
  - Edições personalizadas do usuário preservadas com sucesso: `store_authentication` (Irelia Florescer Espiritual) e `store_sales_center` (Catalog of Gifts).
  - Script `scripts/pull_from_mongo.js` para sincronizar a nuvem com os arquivos locais a qualquer momento.
  - Script `scripts/setup_mongo_indexes.js` para otimização e verificação dos índices do banco.
- Solver 2Captcha ativo com fila ordenada de 11 chaves ativas ($373.21 USD no total, chave principal com $290.47 USD).
- Pool e fila de fallback automática de Captcha (`utils/captchaManager.js`, `python_backend/captcha_manager.py` e `config/captcha_keys_pool.json`).
- `config/emojis.json` com 136 linhas — 12 categorias totalmente modulares.
- Emojis Oficiais da Riot em Alta Resolução enviados para `Zed Store` e `KITSUNE x GAMING v2`:
  - 🎁 **Mystery Skin Box:** `<:lol_mystery_skin:1544591070204010598>`
  - 😃 **Mystery Emote Box:** `<:lol_mystery_emote:1544591072485842964>`
  - 🏟️ **TFT Arena Bilgewater:** `<:lol_tft_arena:1544591074100645948>`
  - 🎶 **TFT Neon DJ Arena:** `<:lol_neon_arena:1544591076197793863>`
  - 🌟 **Hextech Bundle Set (Highlights):** `<:lol_bundle_set:1544591078622236763>`
  - 🛍️ **Chaos Grab Bag:** `<:lol_grab_bag:1544591084200534116>`
  - 📦 **Order Exclusive Pack:** `<:lol_exclusive_pack:1544591088084590636>`
  - 🥊 **Chibi Vi:** `<:lol_chibi_vi:1544493291205173358>`
  - 🌸 **Chibi Ahri:** `<:lol_chibi_ahri:1544493294543704184>`
  - ✂️ **Chibi Gwen:** `<:lol_chibi_gwen:1544495555370291273>`
  - 🌌 **Dark Star Ao Shin:** `<:lol_dark_star:1544495563288871074>`
  - 🦇 **Bat-o-lantern Ward:** `<:lol_bat_ward:1544495566149390336>`
  - 🐝 **Bee Happy Poro:** `<:lol_bee_happy:1544495569274142741>`
  - 🎫 **Passe Season 3:** `<:lol_pass_s3:1544493308015804429>`
  - 🔮 **Orbe Season 3:** `<:lol_orb_s3:1544493304983322736>`
  - 🎟️ **Clash Ticket:** `<:lol_clash_ticket:1544493301334278145>`
- `index.js` com ~4110 linhas — submenus de Loot, Acessórios e Highlights 100% integrados.

### Servidores do Bot:
- `1128760372741034114` — Kitsune | Gifting Service
- `1482818033838719201` — KITSUNE x GAMING v2
- `1540159601817817168` — Zed Store | Cheap Gifiting Service

---

## PRÓXIMOS PASSOS

### Emojis & Cosméticos (Opcional / Futuro)
1. [ ] Cristais de Raridade (Ultimate, Lendária, Épica, Comum) — já mapeados com os emojis oficiais existentes no servidor.
2. [ ] Essências (Azul, Laranja, Mítica) caso deseje customizar além dos emojis de cor.

### Venda White-Label (Futuro)
3. [ ] Sistema de provisionamento de instâncias brancas do bot quando o usuário for vender para terceiros.

---

## REGRAS PARA O AGENTE

1. Sempre ler este arquivo antes de trabalhar no projeto.
2. Não assumir que o histórico da conversa ainda está disponível.
3. Usar os arquivos atuais do projeto como fonte da verdade.
4. Não desfazer decisões registradas aqui sem explicar o motivo.
5. Ao terminar uma sessão importante, atualizar este arquivo.
6. Registrar alterações importantes.
7. Registrar problemas encontrados.
8. Registrar o próximo passo.
9. Não apagar informações históricas importantes.
10. Se o contexto da conversa tiver sido perdido, reconstruir o contexto usando este arquivo e os arquivos do projeto.