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

### Até 2026-08-13

Resumo:
Projeto de bot Discord completo e funcional para loja de gifting de League of Legends. Inclui fluxo completo de compra (painel → região → categoria → item → ticket → pagamento → gift), sistema de autenticação Riot com sessão 24/7, catálogo completo com ~15 categorias de itens, sistema de descontos configuráveis, embeds e emojis 100% customizáveis pelo admin via Discord, heartbeat automático de contas Riot, e backend Python legado com MongoDB.

Arquivos principais:
- `index.js` — lógica principal do bot (3123 linhas)
- `utils/riotAuth.js` — autenticação Riot, tokens, balance, gifting (575 linhas)
- `utils/riotXmpp.js` — cliente XMPP para chat Riot (139 linhas)
- `utils/catalogSync.js` — sincronização do catálogo com a Riot Store API (153 linhas)
- `utils/catalog.js` — funções de busca no catálogo (≈80 linhas)
- `utils/customEmbeds.js` — builder de embeds customizáveis (≈100 linhas)
- `config/embeds.json` — templates de todas as embeds (452 linhas, 45+ templates)
- `config/emojis.json` — emojis customizados (110 linhas)
- `config/loja.json` — preços e descontos da loja (142 linhas)
- `python_backend/main_backend.py` — backend Flask completo (2668 linhas)

---

## ESTADO ATUAL

O projeto atualmente está em:

**Estado funcional/operacional** — o bot está estruturalmente completo com todas as funcionalidades core implementadas (loja, gifting, catálogo, autenticação Riot, tickets, gerenciamento de embeds/emojis/descontos). O código indica que foi/é usado em produção (configurações reais, tokens, servidor Express para UptimeRobot, heartbeat 24/7).

Pontos de atenção:
1. O `index.js` é monolítico (3123 linhas) e seria beneficiado por refatoração/modularização
2. Os arquivos de evento em `events/` têm extensão `.js.js` e provavelmente não são carregados automaticamente
3. Existem dois diretórios redundantes (`python_backend/` e `lol_giftapi-main/`) com código Python similar
4. Credenciais sensíveis estão hardcoded em alguns arquivos
5. O `config.json` tem placeholder não preenchido para a logo

---

## PRÓXIMO PASSO

Aguardando instrução do usuário. Possíveis melhorias identificadas:
- Refatoração do index.js monolítico em módulos separados
- Correção dos nomes de arquivo dos eventos (.js.js → .js) e carregamento automático
- Remoção/consolidação do diretório redundante lol_giftapi-main
- Extração de credenciais hardcoded para variáveis de ambiente
- Atualização do config.json (logo placeholder, referência V3→V2)

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