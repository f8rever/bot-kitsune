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
- `index.js` com submenus de Loot, Acessórios e Highlights 100% integrados.
- **Navegação Hierárquica da Loja & Editor `/embeds` (2026-09-04):**
  - **Navegação Hierárquica do Botão Voltar (`⬅️ Menu`):**
    - Corrigido o fluxo do botão `⬅️ Menu` em catálogos (`enviarPaginaCatalogo`) e telas de busca (`buscarEExibirItens`): agora volta para o menu intermediário da categoria (`voltar_cat_loot`, `voltar_cat_skins`, `voltar_cat_champions`, `voltar_cat_accessories`), em vez de saltar direto para a raiz `Catalog of Gifts`.
    - Nos menus de categoria, o botão `⬅️ Back to Main Categories` (`voltar_menu_modal`) retorna com segurança à raiz.
  - **Templates de Categoria Customizáveis via `/embeds`:**
    - Cadastrados em `config/embeds.json` e sincronizados no MongoDB Atlas: `category_skins`, `category_loot`, `category_champions`, `category_accessories`, `category_highlights`.
    - Menus da loja agora utilizam `buildCustomEmbed`, refletindo imediatamente qualquer alteração feita pela staff.
  - **Seleção Agrupada por Categoria no `/embeds`:**
    - O menu de catálogos no `/embeds` foi reorganizado em 5 subgrupos de categorias (`subgroup_skins`, `subgroup_loot`, `subgroup_champions`, `subgroup_accessories`, `subgroup_highlights`). Ao escolher uma categoria, o bot exibe o submenu com os embeds daquela categoria + botão de voltar.
- **Seção Highlights & Bundles Alinhada com o Client Oficial do LoL (2026-09-04):**
  - O menu da categoria **Highlights & Bundles** (`category_highlights`) foi atualizado para oferecer 3 opções temáticas:
    1. 🌟 **Featured & Launch Bundles (`compra_highlights`):** Pacotes de lançamento e conjuntos especiais em destaque.
    2. 🏷️ **Weekly Sales (On Sale) (`compra_sales`):** As 15 skins com desconto oficial da Riot da semana (-27% a -60%), configuradas em `config/weekly_sales.json`.
    3. 🔥 **Most Popular (`compra_most_popular`):** Os 13 itens mais procurados e vendidos (Baús Hextech, Passes de Temporada e Orbes de Invocador).
  - **Correção Crítica de Fluxo de Loja (Modal Riot ID):** A submissão do modal de Riot ID (`modal_riot_id`) enviava um menu plano obsoleto de 15 opções. Foi corrigido para chamar a função hierárquica `buildStoreMainMenu(customEmojis)`, exibindo as 5 categorias oficiais.
  - **Categoria "Featured" e Emojis Oficiais:**
    - Categoria 5 renomeada oficialmente para **`Featured`** (`Launch Bundles, Weekly Sales & Most Popular`) com o emoji `<:lol_bundle_set:1544591078622236763>`.
    - Emojis integrados e sincronizados:
      - **TFT Arenas:** `<:lol_tft_arena:1544591074100645948>` (em `acessorios.arenas`, `utilidades.arenas`, `utilidades.tabuleiros` e cabeçalhos).
      - **Most Popular:** `<:lol_exclusive_pack:1544591088084590636>` (em `bundles.most_popular`, `bundles.exclusive_pack`, `formatarStr` e cabeçalhos).
      - **Featured & Launch Bundles:** `<:lol_bundle_set:1544591078622236763>`.
  - **Cálculo de Desconto Dinâmico no Checkout:** A função `getItemRpValue` verifica automaticamente se o item está em promoção semanal e aplica o `sale_rp` com a conversão proporcional em Euros (€).
  - **Destaques & Pacotes de Lançamento (Featured & Launch Bundles):**
    - Criado `config/featured_bundles.json` com os 14 pacotes e conjuntos de lançamento oficiais ativos na loja da Riot (Heartsong Seraphine Border Set, Chroma Bundles, Faerie Court Bel'Veth/Lulu, Ocean Song, etc.), eliminando os 210 pacotes legados de cromas de 2017 que poluíam a aba de destaques.
    - A aba `Featured & Launch Bundles` (`compra_highlights`) exibe exclusivamente estes 14 pacotes de destaque, enquanto `Pacotes de Skins & Cromas` (`compra_bundles`) em `Skins & Chromas` mantém os mais de 800 pacotes legados de skins/cromas.
  - **Tabuleiros & Arenas TFT (TFT Arenas) e Correção de Loading Infinito:**
    - Criado `config/tft_arenas.json` com as 22 arenas oficiais compráveis do TFT com custos em RP, ícones CDragon e tipo `TFT_MAP_SKIN`.
    - **Causa Raiz do Loading Infinito Resolvida:** Quando uma categoria vazia ou erro ocorria, `enviarPaginaCatalogo` chamava `interaction.reply()`, mas a interação já havia sido respondida/atualizada por `menu_vendas` com "⏳ Loading the catalog...", disparando o erro 40060 da API do Discord (`InteractionAlreadyReplied`) e deixando a mensagem travada no loading para sempre. Corrigido com verificação segura de `interaction.replied || interaction.deferred` chamando `interaction.editReply()`, protegido por bloco global `try/catch`.
  - **Sincronização ao Vivo do Catálogo da Riot Games (2026-09-05):**
    - **Autenticação e Sessões das Contas de Catálogo:**
      - A conta internacional `Tuan8539` (RU) foi autenticada no painel web, gravando os cookies de sessão ativos no MongoDB Atlas (`account_tokens`).
      - A conta brasileira `lucasgg112` (BR1) foi autenticada no painel web, gravando sua sessão ativa no MongoDB Atlas.
      - Executado o fetch direto da Storefront API da Riot Games (`/storefront/v1/catalog`), atualizando o dump bruto `catalog.json` e os caches com dados em tempo real tanto para EN (RU) quanto para PT (BR1).
    - **Compilação e UUIDs Oficiais da Riot:**
      - O compilador `utils/buildFullCatalog.js` recompilou o catálogo unindo DDragon com a API oficial da loja.
      - O total de itens subiu para **10.341 itens** ativos em PT e EN (**1.736 Skins**, **826 Pacotes**, **6.647 Cromas** e **173 Campeões**).
      - **Heartsong Seraphine (`147069`):** Anteriormente possuía um placeholder provisório (`skin_147069`) que impedia o envio de presentes. Agora possui o UUID oficial real da Loja da Riot: `"offer_id": "6e199f43-39c9-4709-97de-aadded6602c5"`.
      - Todos os pacotes e cromas da Heartsong Seraphine (*Heartsong Seraphine Border Set* `247c9f4f-eb89-453f-9725-68f0b190e7ce`, *Chroma Bundle* `bba11048-c7c5-485c-911b-c2fd1fe86bdf`) e skins recentes (*Panda Pal Lux*, *Faerie Court Lux*, etc.) receberam seus UUIDs reais da Riot.
    - **Preservação de Metadados de Promoções no Catálogo:**
      - `buildFullCatalog.js` armazena `regular_rp`, `sale_rp`, `discount_percent` e o objeto `sale` da Riot para cada item.
      - No `index.js`, a categoria `compra_sales` agora detecta automaticamente as skins com promoção ativa da Riot direto do catálogo em tempo real, com fallback seguro para `config/weekly_sales.json`.
    - **Inclusão de Tabuleiros TFT no Catálogo Compilado:**
      - Adicionada a categoria `TFTArena` diretamente aos catálogos compilados `catalog_cache_en.json` e `catalog_cache_pt.json` a partir de `config/tft_arenas.json`, permitindo suporte nativo e consistente tanto no bot do Discord quanto no painel web.
  - **Painel Web da API (Categorias do Catálogo corrigidas no Frontend):**
    - Identificada a causa raiz de os itens aparecerem apenas em "Todos" e sumirem ao clicar em categorias individuais (`Skins`, `Chromas`, `Pacotes`, etc.): no HTML (`gift_tab.html`), os botões tinham valores no singular (`value="Skin"`, `value="Chroma"`, etc.), enquanto os catálogos JSON usavam chaves no plural (`"Skins"`, `"Chromas"`), fazendo a comparação direta `item.category === selectedCategory` falhar sempre.
    - Implementada a função `matchesCategory(item, sel)` em `static/script.js` (tanto em `lol_giftapi-main` quanto em `python_backend`), mapeando com precisão todas as 14 categorias (Skins, Cromas, Pacotes, Passes, Campeões, Emotes, Ícones, Sentinelas, Pequenas Lendas, Tabuleiros TFT, Boosts, Eternos, Mistério e Hextec).
    - O catálogo e lógica do bot do Discord permaneceram 100% isolados, intactos e sem qualquer impacto.
  - **Persistência Cloud:** `emojis`, `embeds`, `weekly_sales`, `featured_bundles` e `tft_arenas` sincronizados com sucesso no MongoDB Atlas (`bot_configurations`).
  - **Reconstrução Definitiva Store-First do Catálogo da Riot Games (2026-09-05):**
    - **Causa Raiz do Problema Anterior Resolvida:**
      - O catálogo anteriormente era gerado a partir da lista de assets estáticos do DDragon (`championFull.json`). No caso da Seraphine, o DDragon possui 3 modelos 3D internos (`Indie`, `Rising Star`, `Superstar`), gerando 3 entradas falsas no bot a 1820 RP cada com `offerId` falso (`skin_147001`, `skin_147002`, `skin_147003`). Na Loja da Riot, existe **apenas 1 item oficial** (*Seraphine K/DA ALL OUT*, itemId `147001`, offerId real UUID `795ac4dc-77ef-4d9b-8503-0dab9ae37b46`, preço real de 3250 RP - Ultimate).
      - Além disso, `isUnpurchasableOrMythic` continha `n.includes('t1 ')`, o que excluía indevidamente a skin **T1 Seraphine** (que está 100% ativa na loja da Riot por 1350 RP).
    - **Nova Arquitetura 100% Store-First (`utils/buildFullCatalog.js`):**
      - A Loja da Riot (`catalog.json` bruto com 10.012 ofertas) agora é a **fonte primária e definitiva de verdade**.
      - Itens são gerados diretamente do `catalog.json` e enriquecidos com metadados do CommunityDragon (`pt_br` e `default` para EN).
      - Indexados mais de 7.000 nomes oficiais de cromas em PT e EN (`cdChromaMapPt` e `cdChromaMapEn`).
      - Cada item agora possui: `item_id`, `offer_id` real, `parent_id` (ID do campeão pai), `price_rp`, `regular_rp`, `sale_rp`, `discount_percent`, `rarity` oficial (`kUltimate`, `kLegendary`, `kEpic`, `kRare`), `rarity_label`, `icon_url`, `is_available` (`true` se ativo e dentro da validade) e `status` (`'available'` ou `'off'`).
    - **Verificação de Disponibilidade (Ativo vs Ausente/OFF):**
      - Itens ativos na loja oficial são marcados como `is_available: true`, `status: 'available'`.
      - Itens sem preço em RP (como prestígios exclusivos de ME) ou fora da loja são marcados como `is_available: false`, `status: 'off'`.
      - Na busca e menus do Discord (`index.js` e `utils/catalog.js`):
        - Itens ausentes/fora da loja recebem badge `[🔴 Ausente]`.
        - A busca prioriza itens disponíveis, skins base e correspondências diretas de nome.
        - Tentativas de adicionar ou presentear itens marcados como ausentes/off são bloqueadas preventivamente com mensagem clara para o usuário antes de bater na API da Riot.
    - **Comparação e Superação do Concorrente:**
      - A busca por `seraphine` no bot agora retorna **exatamente as 10 skins base reais ativas na Loja da Riot**:
        1. Battle Dove Seraphine (1820 RP | Lendária)
        2. Dumpling Darlings Seraphine (1350 RP | Épica)
        3. Faerie Court Seraphine (1350 RP | Épica)
        4. Firecracker Seraphine (1350 RP | Épica)
        5. Graceful Phoenix Seraphine (1350 RP | Épica)
        6. Heartsong Seraphine (1820 RP | Lendária)
        7. K/DA ALL OUT Seraphine (3250 RP | Ultimate)
        8. Ocean Song Seraphine (1350 RP | Épica)
        9. Star Guardian Seraphine (1350 RP | Épica)
        10. T1 Seraphine (1350 RP | Épica)
      - Todas com UUIDs reais de compra da Riot, preços e raridades 100% corretos, tanto em inglês quanto em português.
  - **Navegação:** O botão `⬅️ Menu` nas páginas de `sales` e `most_popular` retorna diretamente ao menu intermediário `voltar_cat_highlights`.
  - **UX Clean & Unificado da Loja (2026-09-05):**
    - A pedido do usuário, a tela principal `Catalog of Gifts` (`store_sales_center`) agora permanece **fixa** e intacta visualmente ao navegar pelas 5 categorias principais (`cat_skins`, `cat_loot`, `cat_champions`, `cat_accessories`, `cat_highlights`).
    - Em vez de substituir o embed por telas intermediárias pesadas com imagens diferentes (`category_skins`, etc.), a função `exibirMenuCategoriaLoja` mantém o embed `store_sales_center` e altera **apenas os componentes**:
      1. Substitui o Select Menu principal pelo Select Menu específico da subcategoria selecionada (`Select a Skins option`, `Select a Loot option`, etc.).
      2. Adiciona o botão `⬅️ Back to Main Categories` (`voltar_menu_modal`).
    - Ao clicar em `⬅️ Back to Main Categories`, o menu volta imediatamente para o Select Menu raiz das 5 categorias (`buildStoreMainMenu`), mantendo o embed `Catalog of Gifts` perfeitamente estável e limpo.
  - **Correção Crítica de `isChroma` & Busca Dinâmica com Embed Persistente (2026-09-05):**
    - **Causa Raiz de "No items found in this category" Identificada:** A função `isChroma(x)` em `index.js` possuía uma condição errônea `if (x.parent_id || raw.parent_id) { if (t === 'CHAMPION_SKIN') return true; }`. Como TODAS as skins de campeões possuem `parent_id` (o ID do campeão pai), todas as 1.314 skins eram incorretamente classificadas como croma e filtradas fora da busca e do catálogo de skins.
    - **Correção:** Removida a checagem incorreta de `parent_id` para skins. A detecção de cromas agora baseia-se exclusivamente em `t === 'CHROMA'`, `sub === 'RECOLOR'` e marcações oficiais da Riot. Validado que exatamente 1.314 skins e 5.532 cromas são devidamente reconhecidos.
    - **Modal de Busca para Skins & Cromas (`abrirModalBusca`):** Ao escolher "Champion Skins" ou "Chromas" no menu, o bot agora abre o modal oficial de busca para digitar o nome do campeão (ex: "Seraphine" ou "Ahri"), permitindo encontrar diretamente as skins desejadas.
    - **Embed `Catalog of Gifts` 100% Persistente em Todas as Telas:** Tanto em `buscarEExibirItens` quanto em `enviarPaginaCatalogo`, o embed na tela permanece fixo como `store_sales_center` ("Catalog of Gifts"), trocando apenas os Select Menus e os botões de navegação, e mantendo o botão de voltar caso alguma categoria esteja vazia. Ao selecionar um item, prossegue diretamente para a finalização / abertura do ticket.
  - **Setas Animadas Brancas para TODOS os Botões de Back / Next (2026-09-05):**
    - Configuradas as setas brancas animadas (`<a:l_arrow_white:1545877594170335304>` e `<a:51047animatedarrowwhite:1545491753002475591>`) em **absolutamente todos** os botões de retorno e avanço do bot:
      1. `Back to Main Categories` (`voltar_menu_modal`) nas 5 subcategorias;
      2. `Menu` / `Back to Menu` nos catálogos e buscas;
      3. `Previous` / `Next` na paginação do catálogo e das buscas;
      4. `Voltar para Categorias` e `Voltar para Todos os Embeds` nos menus de configuração;
      5. `Anterior` / `Próxima` na lista de amigos de contas Riot.
  - **Botões de Navegação Globais (Back, Previous, Next) Totalmente Editáveis no /embeds (2026-09-06):**
    - Criados os templates independentes no `config/embeds.json` e MongoDB Atlas:
      1. `"global_back_button"` / `"store_back_button"`: Botão Voltar Global (`Back to Menu`, `Back to Main Categories`, `Menu`) aplicado a todas as telas e subcategorias.
      2. `"global_prev_button"`: Botão Anterior Global (`Previous`, `Anterior`) aplicado a todas as paginações e catálogos.
      3. `"global_next_button"`: Botão Próximo Global (`Next`, `Próxima`) aplicado a todas as paginações e catálogos.
    - Adicionados os 3 itens dedicados nos Menus 1 e 2 do `/embeds`.
    - No `/embeds`, ao selecionar qualquer um deles, o bot renderiza uma prévia ao vivo com a fileira completa dos 3 botões: `[Back to Menu] [Previous] [Next]`.
    - Implementadas as funções universais `buildStoreBackButton`, `buildStorePrevButton`, `buildStoreNextButton` e `buildNavButtonsPreviewRow` em `index.js`.
    - MongoDB Atlas e `config/emojis.json` sincronizados com as setas brancas animadas (`<a:l_arrow_white:1545877594170335304>` e `<a:51047animatedarrowwhite:1545491753002475591>`).
  - **Remoção Temporária de "Skin & Chroma Bundles" (`compra_bundles`) (2026-09-06):**
    - **Motivo:** O usuário solicitou a remoção temporária da opção de Pacotes de Skins & Cromas do menu da loja do Discord devido a problemas recorrentes com bundles (preços flexíveis da Riot baseados em itens já possuídos, incompatibilidade do endpoint de envio de presentes para determinados pacotes legados e erros no checkout).
    - **Alterações Realizadas:**
      1. `index.js` (`exibirMenuCategoriaLoja`): Removida a opção `{ label: 'Skin & Chroma Bundles', value: 'compra_bundles', ... }` do Select Menu de `cat_skins`. A categoria `Skins & Chromas` agora exibe de forma limpa apenas `Champion Skins` e `Chromas`.
      2. `index.js` (`buildStoreMainMenu`): Ajustada a descrição de `cat_skins` no menu principal de `'Champion Skins, Chromas & Skin Bundles'` para `'Champion Skins & Chromas'`.
      3. `config/embeds.json`: Atualizado o embed `category_skins`, removendo a linha de texto de pacotes.
      4. MongoDB Atlas: Sincronizada a coleção `bot_configurations` (`embeds`) para garantir que os deploys no Render mantenham o texto atualizado sem pacotes.
    - **Observação Futura:** A lógica interna do backend foi mantida intacta caso se decida reativar no futuro após resolver os problemas de gifting de bundles na API da Riot.
  - **Catálogo 100% em Inglês e Resolução Completa dos Eternos (2026-09-06):**
    - **Demanda do Usuário:** O usuário relatou que os Eternos não estavam encontrando o campeão digitado e pediu para que todo o catálogo do bot fosse padronizado em inglês (já que havia muitos itens aparecendo em português).
    - **Causa Raiz 1 (Eternos não encontravam o campeão):**
      1. No compilador `utils/buildFullCatalog.js`, itens do tipo `STATSTONE` eram completamente ignorados e a chave `Eternals: {}` não existia nas estruturas de catálogo.
      2. O bot não possuía nenhum Eterno real no catálogo compilado, restando apenas skins/cromas que continham a palavra "Eterno" em português ("Diana Aspecto Eterno", etc.), fazendo a busca falhar ou retornar itens inexistentes/incorretos.
    - **Causa Raiz 2 (Itens aparecendo em português no bot):**
      1. As sessões do Discord (`userStoreSessions`) e canais de ticket usavam como fallback a região `BR`, forçando `lang = (userRegiao === 'BR') ? 'pt' : 'en'`, fazendo o bot carregar o cache `catalog_cache_pt.json`.
      2. O `buildFullCatalog.js` carregava preferencialmente `lol_giftapi-main/catalog.json` (extraído por conta brasileira com `pt_BR`), e por não cruzar com os dados em inglês do `python_backend/catalog.json`, os pacotes, passes, ícones e sentinelas no `catalog_cache_en.json` acabavam herdando nomes em português.
    - **Soluções Implementadas:**
      1. **Transição 100% Inglês:**
         - Em `index.js`, todas as rotinas de catálogo (`enviarPaginaCatalogo`, `obterDetalhesCarrinho`, `interactionCreate`, `buscarEExibirItens`) e `utils/catalog.js` foram travadas com `lang = 'en'` por padrão.
         - `utils/buildFullCatalog.js` agora indexa os mais de 18.000 nomes oficiais em inglês a partir de `python_backend/catalog.json` (`enCatalogMap`) e traduz resíduos de sentinelas e ícones, zerando completamente termos em português no `catalog_cache_en.json`.
      2. **Suporte Completo a Eternos (`STATSTONE`):**
         - Adicionada a categoria `Eternals` ao catálogo com todos os **522 Statstones oficiais da Riot Games** compilados.
         - Cada Eterno possui seu UUID de compra oficial (`offer_id`), preço oficial (600 RP para Série 1 e 2, 225 RP para Série Inicial), `parent_id` do campeão pai e ícone oficial do campeão extraído do DDragon.
         - Nomenclatura oficial em inglês padronizada: `{Champion} - Series 1`, `{Champion} - Series 2`, `{Champion} - Starter Series`.
         - Aprimorada a busca em `buscarEExibirItens` com normalização de texto (`buscaNorm`), localizando campeões mesmo com digitação sem pontuação (ex: "khazix", "mundo", "kaisa", "dr mundo", "nunu") e listando instantaneamente suas 3 séries de Eternos ordenadas.
  - **Emojis Oficiais em Cosméticos (Sentinelas, Emotes e Ícones) + Busca Rápida + Prévia HD (2026-09-06):**
    - **Demanda do Usuário:** Cada item de sentinela, emote e ícone possuir seu próprio emoji oficial da Riot no select menu para identificação rápida, além de busca e prévia em alta resolução.
    - **Solução Implementada:**
      1. **Upload Automático de Emojis:**
         - Criado `scripts/upload_cosmetics_emojis.js` que indexa os slots de Application Emojis (50 slots) e servidores do bot (`Zed Store` e `KITSUNE x GAMING v2`).
         - **100% de todas as 68 Sentinelas** da Riot Games hospedadas com emojis personalizados próprios (`ward_${id}`).
         - Emotes oficiais mapeados com emojis dedicados (`emote_${id}`).
         - Salvamento automático em `config/cosmetic_emojis.json` e persistência na nuvem via MongoDB Atlas (`bot_configurations`).
      2. **Integração no Bot (`index.js`):**
         - Carregamento na inicialização e sincronização contínua com `client.application.emojis` e `client.emojis.cache`.
         - Em `obterDetalhesItem`, `tipoFiltro === 'wards'`, `emotes` e `icones` agora consultam `getCosmeticEmoji()`, equipando o select menu de páginas (`enviarPaginaCatalogo`) e de busca (`buscarEExibirItens`) com o ícone exato de cada item.
         - Fallback automático para o emoji padrão da categoria caso não haja emoji customizado disponível.
      3. **Busca Rápida Normalizada (`btn_search_cat_`):**
         - Botão `🔍 Search` habilitado em Sentinelas, Emotes, Ícones, TFT Arenas e Little Legends abrindo modal de texto.
         - Suporte a busca fuzzy sem acentos (`buscaNorm`), localizando itens por qualquer fragmento de texto.
      4. **Prévia Visual em HD (`atualizarEmbedTicket`):**
         - Ícones oficiais em alta resolução extraídos diretamente da CDN da Riot Games (CommunityDragon e DDragon) via `buildFullCatalog.js`.
         - Exibição de arte oficial em HD como thumbnail (`setThumbnail`) para Little Legends, Chibis, Wards, Emotes e Ícones.
         - Exibição panorâmica do campo de batalha (`setImage`) para TFT Arenas nos embeds de ticket e carrinho de compras.
      5. **Remoção de Arenas e Lendas dos Emojis (Solicitação do Usuário):**
         - Conforme solicitado pelo usuário ("remova essas arenas do discord e as lendas dos emojis, pq ta td preto"), todos os 64 emojis animados criados (`arena_` e `legend_`) foram 100% deletados das guilds do Discord (`Kitsune Service`, `Gaming v2`, `Zed Store`).
         - O arquivo [`config/cosmetic_emojis.json`](file:///c:/Users/irwin/Documents/KITSUNE%20V2%20BOT/config/cosmetic_emojis.json) foi limpo (mantendo apenas as 68 Wards e 43 Emotes nítidos) e sincronizado com o MongoDB Atlas (`bot_configurations`).
         - Em [`index.js`](file:///c:/Users/irwin/Documents/KITSUNE%20V2%20BOT/index.js), `tft_arena` voltou ao emoji limpo padrão oficial (`<:lol_tft_arena:1544591074100645948>`), e `little_legends` utiliza os mascotes nítidos (`chibi_ahri`, `chibi_vi`, `chibi_gwen`, `poro` ou `🐥`).
       6. **Restauração e Blindagem do Painel Customizado `/ticket` (ticket_welcome) (2026-09-06):**
          - **Problema Relatado:** O painel `/ticket` deu rollback e voltou para a versão antiga da Ahri Flor Espiritual (`#FFC0CB`), sobrepondo a personalização feita pelo usuário com a Zeri Winterblessed (`#FFFFFF`).
          - **Causa Raiz:** No startup do bot (`utils/mongoStorage.js:syncAllBotConfigs`), as configurações de `bot_configurations` no MongoDB Atlas eram baixadas e sobrescreviam `config/embeds.json`. Como no MongoDB Atlas a chave `ticket_welcome` ainda guardava a versão anterior com Ahri de um commit antigo, ao reiniciar o bot a versão da Ahri era restaurada em disco.
          - **Solução Implementada:**
            1. Os dados exatos do painel customizado pelo usuário foram resgatados do Discord (`🛒・buy-here`):
               - Título: `<a:white_claim:1545847197445136386> **Buy skins & loots quickly and easily!**`
               - Descrição: `Welcome to **Kitsune Bot**!\n<a:51047animatedarrowwhite:1545491753002475591> At our store, we offer several options for you to purchase skins and loot easily and reliably. Check out our options\n<a:51047animatedarrowwhite:1545491753002475591> (The menu will only appear for you!)`
               - Cor: `#FFFFFF`
               - Imagem: Banner Zeri Winterblessed
               - Botão: `Buy here` com estilo Secondary e emoji `<:dinheiro:1527368514057408713>`
               - Rodapé: `© Kitsune - Copyright 2026`
            2. Atualizado [`config/embeds.json`](file:///c:/Users/irwin/Documents/KITSUNE%20V2%20BOT/config/embeds.json) com a configuração recuperada.
            3. Sincronizado imediatamente no MongoDB Atlas (`bot_configurations -> embeds`), garantindo que qualquer reinício ou deploy preserve a personalização da Zeri sem risco de rollback.
       7. **Atualização dos Emojis Oficiais de Orbes e Pacotes (Summoner's Orbs) (2026-09-07):**
          - **Demanda do Usuário:** Substituir os ícones/emojis antigos de orbes (`Summoner's Mega Orb Bundle`, `Premium Orb Bundle`, `Deluxe Orb Bundle`, `Summoner's Orb`) pelos novos ícones oficiais da loja da Riot Games, adicionando-os ao servidor e deletando os antigos em seguida.
          - **Execução:**
            1. Baixados os 4 ícones oficiais em alta resolução diretamente da CDN da Riot Games (`d392eissrffsyf.cloudfront.net/storeImages/bundles/`).
            2. Redimensionados para 128x128 PNG (~18-27 KB) com interpolação bilinear nítida e otimizada para Discord.
            3. Criados os novos emojis estáticos na guild **Zed Store | Cheap Gifiting Service** (`1540159601817817168`):
               - `lol_megaorb` (`<:lol_megaorb:1546370593983697108>`) para Mega Orb Bundle (12500 RP).
               - `lol_premium_orb` (`<:lol_premium_orb:1546370596789682307>`) para Premium Orb Bundle (6250 RP).
               - `lol_deluxe_orb` (`<:lol_deluxe_orb:1546370599054737478>`) para Deluxe Orb Bundle (2500 RP).
               - `lol_summoner_orb` (`<:lol_summoner_orb:1546370600652771459>`) para Summoner's Orb individual (250 RP).
            4. Atualizado [`config/emojis.json`](file:///c:/Users/irwin/Documents/KITSUNE%20V2%20BOT/config/emojis.json) e sincronizado com o **MongoDB Atlas** (`bot_configurations -> emojis`).
            5. Deletados com sucesso os emojis antigos do servidor Zed Store (`lol_orb_s3`) e Kitsune Service (`megaorb`, `premium`, `deluxe`, `orb`, `orb10x`, `orb25x`, `orb50x`, `orb1`).
       8. **Restauração Completa do Ambiente Pós-Formatação (2026-09-09):**
          - **Situação:** Computador recém-formatado pelo usuário, sem Node.js, Python ou ferramentas no PATH.
          - **Ações Realizadas:**
            1. **Node.js LTS:** Instalado **v22.14.0 LTS** (npm v10.9.2) em `%LOCALAPPDATA%\Programs\nodejs` e registrado de forma persistente no PATH do usuário.
            2. **Python:** Instalado **Python 3.12.8** de 64-bits com `pip 24.3.1` em `%LOCALAPPDATA%\Programs\Python\Python312` e registrado no PATH do usuário.
            3. **Puppeteer:** Configurado e baixado o binário oficial do navegador Chrome (`win64-150.0.7871.24`) para viabilizar as automações e login Riot.
            4. **PowerShell:** Configurada política de execução `RemoteSigned` no escopo `CurrentUser` para permitir execução de scripts npm e venv sem restrições.
            5. **Python Backend & lol_giftapi-main:** Instaladas 100% das dependências de `requirements.txt` tanto globalmente no Python 3.12 quanto no ambiente virtual `python_backend/venv` (Flask 3.0.3, pymongo 4.7.3, aiohttp 3.9.5, httpx 0.27.0, APScheduler 3.10.4, celery, etc.), permitindo executar `main_backend.py` diretamente de qualquer pasta (`lol_giftapi-main` ou `python_backend`).
            6. **Validação:** Módulos nativos (`sqlite3`, `discord.js`, `mongodb`) validados com sucesso; sintaxe do `index.js` íntegra; conexão com o MongoDB Atlas testada e operando normalmente.
            7. **Atualização de Emojis:** Configurado o emoji `search` como `<:lupaazul:1547287331030171818>` em `config/emojis.json` (categoria `utilidades`), integrado dinamicamente no botão de busca do catálogo em `index.js` e sincronizado na coleção `bot_configurations` do MongoDB Atlas.
            8. **Texto de Carregamento da Busca:** Alterado o texto de loading da busca (`getLoadStr('search')`) de `"Fetching data from the void..."` para `"loading catalog..."`.
            9. **Ajuste de Categoria de Skins:** Alterado o label da opção no select menu da categoria `cat_skins` de `"Champion Skins"` para apenas `"Skins"`, com descrição `"Browse all giftable skins"`.
            10. **Migração Total para Application Emojis (647 Cosméticos):**
                - Identificado que o Discord liberou **2.000 slots** para Application Emojis (removendo o gargalo antigo de 50).
                - Removidas com sucesso as 18 wards do servidor `Zed Store` (deixando todos os servidores 100% limpos de emojis auxiliares).
                - Enviados diretamente para o **Application Emojis** do bot: **68 Wards** (`ward_${id}`), **170 Emotes** (`emote_${id}`) e **409 Ícones** (`icon_${id}`), totalizando **647 emojis oficiais da Riot Games** criados na aplicação.
                - Atualizado [`config/cosmetic_emojis.json`](file:///c:/Users/jeff/Documents/KITSUNE%20V2%20BOT/config/cosmetic_emojis.json) e sincronizado na coleção `bot_configurations` do **MongoDB Atlas**.
                - Bot reiniciado com sucesso carregando o cache de 647 Application Emojis diretamente no Discord.
            11. **Remoção de Itens Não-Presenteáveis de TFT e XP Boosts do Catálogo (2026-09-09):**
                - **Motivo / Verificação na API da Riot:** O endpoint oficial de gifting da Riot Games (`/storefront/v3/gift`) rejeita presentes com `inventoryType: 'COMPANION'` (Little Legends / Chibis) e `'TFT_MAP_SKIN'` (Arenas do TFT) com erro `400 Bad Request` / `NOT_GIFTABLE`. O TFT não possui suporte a presentes no League of Legends. Além disso, boosts de XP (duração/vitórias) não possuem endpoints de gifting.
                - **Ação Realizada:** Removidas as opções `Little Legends & Chibis`, `TFT Arenas` e `XP Boosts` do Select Menu de Acessórios (`cat_accessories`) e do embed de descrição (`category_accessories` em `config/embeds.json`).
                - **Sincronização:** `embeds.json` sincronizado com o **MongoDB Atlas** (`bot_configurations -> embeds`) e atualizado na interface do bot para exibir apenas os 3 tipos 100% presenteáveis e com cobertura total de emojis oficiais: **Emotes**, **Ward Skins** e **Summoner Icons**.
            12. **Sistema 100% Automático de "Most Popular" e "Weekly Sales" da Riot Games (2026-09-09):**
                - **Estrutura Idêntica ao Cliente do LoL:** A vitrine **Most Popular** no cliente oficial do LoL é composta por exatamente 25 itens: os 5 consumíveis Hextech fixos (Baú, Chave, 1x, 5x, 10x) + as 15 skins com promoção ativa da semana (`item.sale`) + os 5 campeões em promoção da semana.
                - **Módulo Automatizado:** Criado [`utils/syncWeeklySales.js`](file:///c:/Users/jeff/Documents/KITSUNE%20V2%20BOT/utils/syncWeeklySales.js) com:
                  - `syncWeeklySalesFromRiot(accessToken, region)`: consulta a Storefront API da Riot Games (`/storefront/v1/catalog`), extrai os itens com a tag `sale` ativa, salva em `config/weekly_sales.json` e sincroniza automaticamente com o **MongoDB Atlas** (`bot_configurations -> weekly_sales`).
                  - `getLoLMostPopularItems(currentCatalog)`: gera os 25 itens dinamicamente direto dos dados da Riot.
                - **Gatilhos Automáticos:**
                  - Conectado em `refreshAccountsTask` para rodar a cada 6 horas no background sempre que uma conta Riot estiver ativa.
                  - Conectado no comando `/link` para rodar imediatamente ao vincular uma nova conta.
                - **Menu do Discord:** Atualizados os filtros `sales` (mostra as 15 skins em promoção) e `most_popular` (mostra os 25 itens idênticos ao cliente oficial do jogo) em `index.js`.
            13. **Ajuste Exclusivo da Vitrine "Featured & Launch Bundles" (2026-09-09):**
                - **Alinhamento 100% com a aba Featured do Cliente do LoL:** Removidos todos os pacotes antigos e mantidos **apenas** os itens em destaque na loja da Riot:
                  1. `Heartsong Seraphine` (1820 RP, Skin Lendária)
                  2. `Heartsong Seraphine Border Set` (2720 RP)
                  3. `Heartsong Seraphine Chroma Bundle` (3035 RP)
                  4. `Ocean Song Soraka Chroma Bundle` (2795 RP)
                  5. `Ocean Song Jinx Chroma Bundle` (2795 RP)
                - **Sincronização:** Atualizado [`config/featured_bundles.json`](file:///c:/Users/jeff/Documents/KITSUNE%20V2%20BOT/config/featured_bundles.json) e sincronizado com o **MongoDB Atlas** (`bot_configurations -> featured_bundles`), além de atualizar o embed `category_highlights` em `config/embeds.json` e o select menu em `index.js`.
            14. **Novos Emojis Oficiais do LoL para o Menu Principal (2026-09-09):**
                - **Accessories:** Atualizado de `19bau` para `<:lol_poro_emote:1544493296879935489>` (Poro Emote oficial da Riot).
                - **Featured:** Atualizado de `lol_bundle_set` para `<:lol_exclusive_pack:1544591088084590636>` (Exclusive Pack VIP dourado oficial da Riot).
                - **Sincronização:** Atualizado [`config/emojis.json`](file:///c:/Users/jeff/Documents/KITSUNE%20V2%20BOT/config/emojis.json) e sincronizado com o **MongoDB Atlas** (`bot_configurations -> emojis`).
            15. **Diferenciação e Melhoria dos Emojis do Submenu Featured / Destaques (2026-09-09):**
                - O submenu `cat_highlights` apresentava duplicidade (opção 1 e opção 3 usando o mesmo emoji `lol_exclusive_pack`) e a opção 2 com o emoji genérico `🏷️`.
                - **Featured & Launch Bundles:** Mantido `<:lol_exclusive_pack:1544591088084590636>` (Pacote Exclusivo do LoL).
                - **Weekly Sales (On Sale):** Criado e registrado no Discord Application Emojis o emoji oficial `<:lol_sale:1547388458488823868>` (badge vermelho de desconto estilo `-50%` do LoL).
                - **Most Popular:** Atualizado para `<a:pr_fire01:1527367612168802374>` (fogo animado Hot/Trending).
                - **Consistência do Catálogo:** Atualizados os títulos de páginas do catálogo (`enviarPaginaCatalogo`) e os itens do select menu (`obterDetalhesItem`) em [`index.js`](file:///c:/Users/jeff/Documents/KITSUNE%20V2%20BOT/index.js) para usarem os novos emojis.
                - **Sincronização:** Salvo em [`config/emojis.json`](file:///c:/Users/jeff/Documents/KITSUNE%20V2%20BOT/config/emojis.json) e sincronizado com o **MongoDB Atlas** (`bot_configurations -> emojis`).
            16. **Correção de Duplicidade de Itens no Catálogo Most Popular (2026-09-09):**
                - **Erro:** `COMPONENT_OPTION_VALUE_DUPLICATED: The specified option value is already used` ao carregar o catálogo de `most_popular`.
                - **Causa:** A busca por `Hextech Chest` usava `.includes()` e capturava `1 Hextech Chest and Key Bundle`, duplicando o item do pacote.
                - **Correção:** Priorizado match exato de nome em [`utils/syncWeeklySales.js`](file:///c:/Users/jeff/Documents/KITSUNE%20V2%20BOT/utils/syncWeeklySales.js), identificando corretamente o Baú individual (`id: 1`) e a Chave (`id: 3`).
                - **Proteção Extra:** Adicionada deduplicação preventiva via `Set` em `opcoesMenu` dentro de `enviarPaginaCatalogo` em [`index.js`](file:///c:/Users/jeff/Documents/KITSUNE%20V2%20BOT/index.js) contra qualquer valor repetido.
            17. **Exibição Dinâmica de Raridade para Skins em Destaques e Mais Populares (2026-09-09):**
                - Em `cat_highlights` (`Featured & Launch Bundles`), skins individuais como *Heartsong Seraphine* antes exibiam o prefixo genérico `Highlight` e o emoji de sacola.
                - Agora, qualquer skin avulsa nos Destaques ou no *Most Popular* identifica sua raridade oficial do LoL (`Legendary`, `Epic`, `Ultimate`, etc.) e exibe o cristal correspondente (`<:legendary:...>`, etc.).
                - Ajustado o mapeamento de `featured_bundles.json` em [`index.js`](file:///c:/Users/jeff/Documents/KITSUNE%20V2%20BOT/index.js) para preservar o `inventoryType` real (`CHAMPION_SKIN`) em vez de forçar como `BUNDLES`.
                - No catálogo *Most Popular*, itens Hextech exibem `Hextech Loot` com ícone de baú/chave, campeões exibem `Champion` e skins exibem sua raridade oficial.
            18. **Remoção de Checagem de Amizade 24h & Adição do Botão Refresh no Ticket (2026-09-09):**
                - Removido o campo `⏱️ Status de Gifting (24h)` do embed de pedido do ticket (`ticket_order_received` em [`config/embeds.json`](file:///c:/Users/jeff/Documents/KITSUNE%20V2%20BOT/config/embeds.json) e sincronizado com o MongoDB Atlas).
                - Removido o botão de checagem de amizade (`btn_check_friendship`).
                - Adicionado o botão **`Refresh`** (`btn_refresh_ticket`) com emoji `🔄` na primeira linha de botões do ticket (`Close Ticket`, `Payment Methods`, `Refresh`).
                - Implementada recuperação automática de carrinho (`global.ticketCarts`) a partir das mensagens do canal caso o bot tenha sido reiniciado, garantindo que o botão `Refresh` funcione sem falhas mesmo após reinicialização.
                - O botão `Refresh` recalcula preços, restaura imagens e atualiza o embed do ticket em tempo real.
            19. **Correção de Criação de Tickets Duplicados no Catálogo (2026-09-09):**
                - **Problema:** Ao selecionar um item para finalizar o pedido no catálogo, o bot criava 2 canais de tickets simultaneamente (~300ms a 500ms de diferença).
                - **Causa Raiz Identificada:**
                  1. **Instâncias Duplicadas do Bot (Render + Local):** O bot já está hospedado e rodando 24/7 no Render (conectado ao GitHub `main`). Quando uma instância local era mantida ativa em background no PC de desenvolvimento, ambas as instâncias recebiam o mesmo evento de interação da Discord Gateway e disparavam a criação de canal em paralelo.
                  2. **Sanitização de Nomes de Canal no Discord:** O regex `/[^a-z0-9_-]/g` removia o emoji `🎫` de `🎫-${username}`, resultando em `-${username}`, e a API do Discord removia o hífen inicial, gerando apenas `${username}` (ex: `monarchjeff`). A verificação anterior comparava apenas contra `🎫-${username}`, não detectando o canal já aberto.
                - **Solução Implementada:**
                  1. Mutex de criação ativa (`global.activeTicketCreations`) que bloqueia chamadas concorrentes para o mesmo usuário enquanto o ticket está sendo gerado.
                  2. Verificação prévia e robusta de ticket ativo (`existingTicket` por tópico `Ticket-Owner: ID` e compatibilidade com múltiplos formatos de nome: `🎫-user`, `user`, `-user`), redirecionando o usuário com link direto caso já possua um canal aberto.
                  3. Mutex de criação de categorias por região (`global.creatingCategories`) para impedir criação concorrente de categorias idênticas.
                  4. Tratamento seguro de respostas (`interaction.deferred || interaction.replied`) para prevenir exceções `40060` e `InteractionNotReplied`.
                  5. **Regra Operacional:** Não manter processo `node index.js` rodando localmente enquanto o deploy de produção no Render estiver ativo.
            20. **Remoção do Botão Não-Solicitado no Embed de Formas de Pagamento (2026-09-09):**
                - **Problema:** Ao clicar em `Payment Methods` no ticket, o bot anexava automaticamente um botão verde `[ 📩 I Have Paid / Notificar Pagamento ]` que não foi configurado pelo usuário no template do embed.
                - **Solução Implementada:**
                  1. Removido o botão fixo hardcoded em `btn_payment_methods`. Agora, o bot exibe estritamente o embed configurado pelo usuário, e só anexa botão caso o usuário tenha explicitamente preenchido `buttonLabel` no template do `/embeds`.
                  2. Sincronizado [`config/embeds.json`](file:///c:/Users/jeff/Documents/KITSUNE%20V2%20BOT/config/embeds.json) com o conteúdo real salvo pelo usuário no MongoDB Atlas (título `Payment Methods`, chaves de pagamento de PayPal, Revolut, Crypto USDT e splash art do Viktor).
            21. **Painel Exclusivo Hall of Legends 2026 (Caps - 3ª Edição) 100% em Inglês & Customizável (2026-09-10):**
                - **Novo Comando `/halloflegends`:** Criado em [`commands/suporte/halloflegends.js`](file:///c:/Users/jeff/Documents/KITSUNE%20V2%20BOT/commands/suporte/halloflegends.js), similar ao `/ticket`, permitindo enviar um painel fixo de venda para qualquer canal de texto (`canal` opcional, restrito a Staff/Admin).
                - **100% em Inglês:** Textos do comando, embed, select menu, placeholders, modals e mensagens efêmeras de confirmação totalmente em inglês, alinhados com o padrão internacional da Kitsune Store.
                - **Embed Separada & Customizável:** Registrado `hall_of_legends` em [`config/embeds.json`](file:///c:/Users/jeff/Documents/KITSUNE%20V2%20BOT/config/embeds.json) com todos os detalhes e preços oficiais do evento em RP, personalizável separadamente no comando `/embeds` (disponível tanto no menu principal quanto na subcategoria *Featured & Special Offers*), sincronizado com o MongoDB Atlas.
                - **Select Menu de Compra Imediata (`menu_hall_of_legends_select`):**
                  1. `Hall of Legends 2026 Pass (Caps)` (1,950 RP) — Risen Legend Orianna + 100 levels + 125 ME + 11 Orbs.
                  2. `Risen Legend Tristana Collection` (5,035 RP) — Pass + Risen Legend Tristana + Border + Icon + Emote.
                  3. `Immortalized Legend Tristana Collection` (32,035 RP) — Risen Collection + Immortalized Legend Tristana (3 forms) + custom voicelines + finisher.
                  4. `Signature Immortalized Tristana Collection` (58,865 RP) — Complete collection + 100 levels instant unlock + Caps Signature on Nexus/Splash + Holographic border + "Claps" title.
                - **Fluxo de Abertura Inteligente:**
                  - Se o usuário já possuir um ticket aberto, o bot bloqueia duplicidade e fornece o botão direto `[Go to Ticket]`.
                  - Se selecionado dentro do ticket, o pacote é adicionado ao carrinho com recálculo automático de preço.
                  - Fora do ticket, exibe modal rápido em inglês (`🏆 Hall of Legends 2026 - Order`) para confirmação de Riot ID e Região (com pré-preenchimento automático se já houver sessão) e cria o ticket instantaneamente com botão de acesso direto.
                - **Splash Arts Oficiais em HD (Data Dragon):**
                  - Banner (`image`): Splash art oficial da **Immortalized Legend Tristana / Signature Edition** em alta resolução (`https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Tristana_80.jpg`).
                  - Thumbnail (`thumbnail`): Splash art oficial da **Risen Legend Orianna** (`https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Orianna_40.jpg`).
                  - Ícones dos pacotes em [`config/featured_bundles.json`](file:///c:/Users/jeff/Documents/KITSUNE%20V2%20BOT/config/featured_bundles.json) atualizados para suas respectivas artes em HD (`Orianna_40.jpg`, `Tristana_79.jpg`, `Tristana_80.jpg`), sincronizados no MongoDB Atlas.

### Servidores do Bot:
- `1128760372741034114` — Kitsune | Gifting Service
- `1482818033838719201` — KITSUNE x GAMING v2
- `1540159601817817168` — Zed Store | Cheap Gifiting Service

---

## PRÓXIMOS PASSOS

### Bundles & Pacotes (Para resolver depois)
1. [ ] Investigar e solucionar problemas com gifting e precificação dinâmica dos pacotes (`Skin & Chroma Bundles`) na API da Riot antes de reativar na loja do Discord.

### Emojis & Cosméticos (Opcional / Futuro)
2. [ ] Cristais de Raridade (Ultimate, Lendária, Épica, Comum) — já mapeados com os emojis oficiais existentes no servidor.
3. [ ] Essências (Azul, Laranja, Mítica) caso deseje customizar além dos emojis de cor.

### Venda White-Label (Futuro)
4. [ ] Sistema de provisionamento de instâncias brancas do bot quando o usuário for vender para terceiros.

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