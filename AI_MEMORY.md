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
- Descontos configuráveis globalmente e por categoria individual via `/desconto`
- Desconto padrão: 50% (definido em loja.json)
- Tabelas de preço fixas em loja.json para skins e loot (com preço original e desconto)

### Embeds Customizáveis
- Todas as embeds do bot são definidas em `config/embeds.json` (~452 linhas, ~45 templates)
- Sistema completo de template com variáveis dinâmicas ({accountName}, {rp}, {region}, etc.)
- Admin pode editar todas as embeds via comando `/embeds` (título, descrição, cor, imagem, thumbnail, fields, footer)

### Emojis Customizáveis
- Emojis do bot definidos em `config/emojis.json` (110 linhas)
- Organizados por categoria: skins, loot, utilidades, loja_produtos, loja_status, staff, lol_roles, lol_regions, ticket, bundles
- Admin pode editar via comando `/emojis`

---

## FUNCIONALIDADES IMPLEMENTADAS

### Loja / Gifting (Core)
- [x] Painel fixo da loja no chat (`/ticket`) — botão "Buy here" abre fluxo interativo
- [x] Seleção de região LoL (BR, NA, EUW, EUNE, LAN, LAS, OCE, TR) via menu
- [x] Central de vendas com categorias: Highlights, Skins, Chromas, Passes, Orbes, Hextech, Champions, Emotes, Icons, Wards, Little Legends, TFT Arena, Boosts, Eternos, Mystery Gifts
- [x] Catálogo paginado com 25 itens/página e navegação (prev/next)
- [x] Busca no catálogo por nome
- [x] Detalhes do item com raridade, preço RP, preço EUR (com desconto)
- [x] Ícone/imagem do item no catálogo
- [x] Criação automática de ticket (canal privado) para finalizar pedido
- [x] Resumo do pedido no ticket (produto, raridade, valor RP, preço, região, Riot ID)
- [x] Envio de presente via API Riot (`/gift`)
- [x] Autocomplete de amigos no comando /gift (cache pré-carregado)
- [x] Log de audit de presentes enviados (staff log embed)
- [x] Formas de pagamento (MBWay, PIX, PayPal, Revolut, Crypto)

### Contas Riot
- [x] Vincular conta via URL de redirecionamento (`/link`)
- [x] Suporte a SSID para sessão 24/7
- [x] Selecionar conta ativa (`/login`) com autocomplete
- [x] Heartbeat automático (60s) — renova tokens, checa saldo RP, atualiza friendlist
- [x] Exibir informações da conta (RP, BE, nível, banimento, região)
- [x] Gerenciar amigos (`/friendlist`) — listar, aceitar pedidos pendentes
- [x] Enviar pedido de amizade (`/addfriend`)
- [x] Persistência de contas em riot_accounts.json + restauração via env var SAVED_RIOT_ACCOUNTS

### Administração
- [x] Configurar cores e emojis do bot (`/config`)
- [x] Configurar preços, itens e banners da loja (`/config-store`)
- [x] Definir descontos globais ou por categoria (`/desconto`)
- [x] Gerenciar todas as embeds do bot (`/embeds`) — editor completo via Discord
- [x] Gerenciar emojis customizados (`/emojis`)
- [x] Deploy/re-deploy de comandos Slash (`/deploy`) — registra comandos globais na API Discord
- [x] Auto-deploy de comandos Slash no startup do bot (limpa guild commands duplicados)

### Moderação
- [x] Limpar mensagens (`/clear`)
- [x] Trancar canal (`/lock`)

### Utilidades
- [x] Tabela de preços de skins e loots (`/table`)
- [x] Entrar em canal de voz (`/join`)
- [x] Sair do canal de voz (`/leave`)

### Eventos
- [x] Boas-vindas automáticas ao novo membro (embed no canal boas-vindas)
- [x] Autorole automático (cargo "Viajante" configurável)
- [x] Sistema de XP por mensagem (5-15 XP/msg, level up a cada nível*500 XP)
- [x] Sistema AFK (aviso ao mencionar usuário AFK, remoção automática ao enviar mensagem)

### XMPP (Riot Chat)
- [x] Conexão direta ao chat da Riot via TLS/XMPP (riotXmpp.js)
- [x] Autenticação X-Riot-RSO-PAS
- [x] Lista de amigos via XMPP
- [x] Envio de pedido de amizade via XMPP
- [x] Aceitar pedido de amizade via XMPP
- [x] Remover amigo via XMPP
- [x] Enviar mensagem via XMPP
- [x] Detecção de conta banida (account-disabled)

---

## PROBLEMAS CONHECIDOS

### Nomes de arquivo com extensão duplicada
- `events/guildMemberAdd.js.js` e `events/messageCreate.js.js` — têm extensão `.js.js` (provavelmente não são carregados automaticamente pelo sistema de commands, pois estão fora do diretório commands/)
- Obs: Os eventos em `events/` não parecem ser carregados automaticamente pelo index.js; o carregamento dinâmico `loadCommands()` só processa `commands/`. Os eventos provavelmente precisam ser registrados manualmente.

### Código monolítico
- O `index.js` tem ~3123 linhas e 171KB — toda a lógica de catálogo, preços, interações, ticket e gifting está concentrada neste único arquivo
- Dificulta manutenção, debugging e evolução do código

### Redundância de diretórios
- `python_backend/` e `lol_giftapi-main/` contêm essencialmente o mesmo código Python (fork/cópia)
- Ambos têm `main_backend.py`, `catalog_cache_en.json`, `catalog_cache_pt.json`, etc.

### Credenciais expostas no código
- `python_backend/main_backend.py` contém URI do MongoDB Atlas e JWT secret key hardcoded no código-fonte
- `utils/catalogSync.js` contém credenciais de uma conta Riot (username/password) como fallback

### Config.json desatualizado
- O `config/config.json` referencia "Kitsune V3" no footer mas o projeto é "Kitsune V2"
- O campo `links.logo` contém placeholder "URL_DA_IMAGEM_DA_KITSUNE"

---

## O QUE JÁ FOI FEITO

### 2026-08-22
- [x] **Correção do Carregamento Infinito de Tickets:** Blindada a função `criarCanalTicket` com `try/catch` e validação dinâmica dos cargos em `guild.roles.cache`. Caso um cargo configurado no `.env` pertença a outro servidor, ele é ignorado com segurança sem travar a interação.
- [x] **Criação de Categorias Dinâmicas por Região:** Mantida a criação automática de categorias (`TICKETS - BR`, `TICKETS - NA`, etc.) com fallback seguro caso o bot não tenha permissões globais na guilda.
- [x] **Notificação de Suporte:** Adicionada menção automática do cargo de Suporte/Staff configurado e do usuário ao abrir o ticket.
- [x] **Estabilidade do Gateway / Intents Discord:** Removida a intent privilegiada `MessageContent` (que bloqueava a conexão do bot caso não estivesse marcada no Discord Developer Portal) e adicionados handlers de erro `client.on('error')` e `client.on('shardError')`.
- [x] **Deploy no GitHub:** Alterações comitadas e enviadas para `origin/main` (deploy automático no Render).

### 2026-08-27
- [x] **Comando `/addfriend` 100% Funcional:**
  - Adicionado template `addfriend_sent` que faltava em `config/embeds.json` (evitando erro/crash na confirmação).
  - Reescrita completa de `commands/loja/addfriend.js` com prioridade na sessão do usuário (`userStoreSessions`), fallback para primeira conta, auto-renovação de token via SSID, e detecção de status como `account-disabled`.
- [x] **Comando `/login` com Painel Completo:**
  - Reescrita de `commands/loja/login.js` com auto-refresh de saldo (RP/BE), renovação SSID e renderização do painel completo de botões interativos (`btn_rp`, `btn_account`, `btn_friend`, `btn_back`).
  - Adicionados todos os templates de embed de dashboard em `config/embeds.json` (`login_select`, `login_success`, `dashboard_rp`, `dashboard_account`, `dashboard_friends`).
- [x] **Aba de Amigos Multi-Região (XMPP Roster):**
  - Ajustado o handler de `btn_friend` em `index.js` para consultar o roster XMPP completo em vez do endpoint REST de gifting (que limitava amigos à mesma região).
  - Agora exibe amigos de todas as regiões com paginação e status.
- [x] **Deploy no GitHub:** Commits `79784e6`, `addf1d1`, `e92cc67` enviados para `origin/main`.

### 2026-08-28
- [x] **Persistência Durável de Contas Riot no MongoDB Atlas (`utils/mongoStorage.js`):**
  - Implementado módulo de conexão e sincronização bidirecional com a coleção `riot_accounts` no MongoDB Atlas.
  - Sincronização automática no boot do bot em `index.js`: restaura todas as contas Riot da nuvem para o disco local, garantindo que reinicializações ou deploys no Render não percam contas vinculadas.
  - Salvamento instantâneo no MongoDB ao executar `/link` e durante atualizações de tokens/saldo no `/login`.
  - Heartbeat em segundo plano (`refreshAccountsTask`) agora sincroniza renovações via SSID e alterações de saldo diretamente na nuvem.
- [x] **Comando `/friendlist` Completo e Multi-Região:**
  - Suporte a amigos de todas as regiões via XMPP Roster integrado com os timestamps de `friendsSince` da Riot Store API.
  - Cálculo de timer detalhado em dias, horas, minutos e segundos (`✅ Elegível para presentes` vs `⏱️ Aguardando 24h`).
  - Paginação interativa com botões de Próxima/Anterior.
  - Subações funcionais: Ver Amigos, Ver Pedidos Recebidos, Aceitar Todos os Pedidos e Enviar Pedido de Amizade.
- [x] **Comando `/clear` Blindado:**
  - Verificação de permissões de Gerenciar Mensagens / Administrador / Cargo de Staff configurado.
  - Tratamento de erro limpo para mensagens com mais de 14 dias.
- [x] **Comando `/deploy` Sanitizado:**
  - Remoção automática de espaços/quebras de linha no `DISCORD_TOKEN` e sincronização global de comandos.
- [x] **Comando `/table` Completo e Interativo:**
  - Separado em abas navegáveis via botões: `[🎨 Skins]`, `[📦 Espólios]`, `[👑 Acessórios]`, `[📑 Todas]`.
  - Conversão dinâmica com descontos aplicados e exibição de preços originais vs com desconto em Euros (€).
  - Remoção de skins míticas (pois não são enviáveis por presente na Riot).
- [x] **Remoção do comando `/lock`:**
  - Removido `commands/moderacao/lock.js` a pedido do usuário.
- [x] **Limpeza de Categorias não-presenteáveis:**
  - Removidas categorias de TFT e Classic da loja e dos menus de vendas.
- [x] **Sistema de Convites (Invite Tracker) com MongoDB Atlas:**
  - Rastreamento automático de quem convidou novos membros através do evento `guildMemberAdd` e `guildMemberRemove`.
  - Contagem persistida no MongoDB Atlas (`invites` e `member_joins` collections com `regular`, `left`, `fake`, `total`).
  - Notificação no canal de boas-vindas com dados completos do convite e membro (`welcome_invite`).
  - Comando `/invites` para consultar convites próprios ou de outros usuários (`invites_profile`).
- [x] **Sistema de Verificação (Verify) & RestoreCord:**
  - Comando `/verify-panel` para enviar o painel com botão de 1 clique e/ou botão Link para RestoreCord OAuth2.
  - Entrega automática do cargo de verificado com registro no MongoDB Atlas.
  - Mensagem efêmera de sucesso (`verify_success`).
- [x] **Carregamento Automático de Eventos no `index.js`:**
  - Implementado `loadEvents()` para carregar dinamicamente todos os eventos em `events/` (`guildMemberAdd.js`, `guildMemberRemove.js`, `messageCreate.js`).
- [x] **Comando `/gift` Completo & Blindado:**
  - Compatibilidade idêntica à especificação do `gift.txt` (CAP V2 Orders API com fallback para Storefront V3 API).
  - Autocomplete inteligente de amigos elegíveis com badge de timer (`[✅ Elegível]` vs `[⏱️ Faltam Xh]`).
  - Autocomplete de itens em tempo real no catálogo multilíngue.
  - Sincronização imediata do novo saldo no MongoDB Atlas (`saveAccountToMongo`) e no disco.
  - Notificação de presente (`gift_sent`), falha com motivo detalhado (`gift_failed`) e log de auditoria no canal e DM da staff (`gift_staff_log`).
- [x] **Comando `/desconto` Inteligente & Completo:**
  - Suporte a 3 ações: `📊 Ver Descontos Ativos`, `⚙️ Definir Desconto`, `🔄 Resetar Descontos`.
  - Desconto Global (`promocao_porcentagem`) e por Categorias Oficiais (Skins, Cromas, Passes, Espólios, Acessórios, Emotes, Ícones, Wards, Boosts, Eternos, Mistério, Destaques).
  - Recálculo automático instantâneo de todos os preços de itens em `config/loja.json` e sincronização com `/table`.
  - Blindagem de permissões para Administradores e Staff.
- [x] **Comando `/config-store` Atualizado:**
  - Removidas opções inválidas (skins míticas) e alinhado com as categorias presentes no catálogo.
- [x] **Templates de Embeds 100% Editáveis (`/embeds`):**
  - Cadastrados todos os novos templates em `config/embeds.json` e no menu visual do comando `/embeds`.

---

## ESTADO ATUAL (2026-08-28)

**Estado funcional/operacional**:
- `/addfriend`, `/login`, `/friendlist`, `/clear`, `/deploy`, `/link`, `/table`, `/invites`, `/verify-panel`, `/gift`, `/desconto` e `/config-store` revisados e 100% integrados.
- Persistência 24/7 ativa no MongoDB Atlas.
- Sistema de descontos automatizado com recálculo instantâneo de preços.
- Todos os embeds personalizáveis via `/embeds`.

---

## PRÓXIMO PASSO

1. Fazer o deploy para o GitHub (`origin/main`).
2. Seguir para o comando `/ticket` (painel de compras, seleção de produtos e abertura de tickets) e comandos restantes (`/embeds`, `/config`, `/emojis`, `/join`, `/leave`).

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