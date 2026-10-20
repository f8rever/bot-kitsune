---
name: loot-sync
description: >-
  Rules and automated workflow for adding, updating, and synchronizing League of Legends event passes,
  orbs, capsules, grab bags, and bundles into Kitsune Bot. Enforces the MANDATORY rule that every new
  pass or orb MUST have its corresponding official Riot icon downloaded, resized, uploaded to Discord
  Application Emojis, and mapped into emojis.json and index.js.
---

# League of Legends Event Passes & Loot Sync Skill

This skill enforces and documents the mandatory procedure for adding, updating, and managing event passes, orbs, capsules, grab bags, and bundles in the Kitsune Bot ecosystem.

---

## 📌 REGRA DE OURO (GOLDEN RULE)
> [!IMPORTANT]
> **SEMPRE que for adicionar ou atualizar um Passe de Evento ou Orbe no bot, é OBRIGATÓRIO ter o ícone oficial correspondente da Riot Games cadastrado como emoji no Discord e vinculado no catálogo.**
> 
> **NUNCA** reutilize ícones genéricos ou antigos de outras temporadas (ex: ícone azul genérico de 2024 para passes/orbes de 2026). Cada passe e orbe deve exibir sua arte real oficial em alta definição tanto no select menu quanto nas prévias de embeds.

---

## 🔄 Fluxo de Trabalho Passo a Passo

### 1. Obtenção do Asset Oficial da Riot Games
Os ícones oficiais de passes e orbes do LoL são hospedados nos servidores da Riot (CDN CloudFront ou CommunityDragon):
* **Bundles / Passes / Orbes:** `https://d392eissrffsyf.cloudfront.net/storeImages/bundles/{itemId}.png`
* **Hextech Crafting / Baús:** `https://d392eissrffsyf.cloudfront.net/storeImages/hextechCrafting/{itemId}.png`
* **CommunityDragon:** `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/loot/{name}.png`

### 2. Redimensionamento e Otimização para Discord
Emojis do Discord exigem imagens quadradas (PNG ou GIF) com peso inferior a 256 KB:
* Utilize o script auxiliar `.agents/skills/loot-sync/scripts/sync_loot_asset.py`:
  ```bash
  python .agents/skills/loot-sync/scripts/sync_loot_asset.py --name lol_novo_orbe --url <URL_DA_RIOT>
  ```
* O script converte automaticamente para `128x128 RGBA PNG` com interpolação `LANCZOS`, garantindo máxima nitidez e peso entre 15 KB e 35 KB.

### 3. Upload para Application Emojis do Bot
* Utilize `scripts/upload_loot_emojis.js` para registrar o emoji diretamente nos **Application Emojis** do bot (`kitsune#9755`).
* Os Application Emojis funcionam em qualquer servidor e canal sem consumir os slots limitados de guilds.

### 4. Configuração em `config/emojis.json`
* Registre a chave no objeto `"loot"` de `config/emojis.json`:
  ```json
  "loot": {
    "worlds_orb": "<:lol_worlds_orb:...>",
    "worlds_pass": "<:lol_worlds_pass:...>",
    "deluxe": "<:lol_worlds_deluxe:...>",
    "premium": "<:lol_worlds_premium:...>",
    "megaorb": "<:lol_worlds_mega:...>"
  }
  ```

### 5. Mapeamento no `index.js:obterDetalhesItem`
* No arquivo `index.js`, dentro da função `obterDetalhesItem(nome, tipoFiltro, ...)`, verifique as palavras-chave do novo evento e associe ao emoji correto:
  ```javascript
  if (nameLower.includes('pass') || nameLower.includes('passe')) {
      if (nameLower.includes('worlds') || nameLower.includes('mundial')) {
          lootIcon = customEmojis?.loot?.worlds_pass;
      }
  }
  ```

### 6. Persistência e Sincronização Contínua
Sempre execute após atualizar os arquivos:
1. Sincronizar com o banco: `node scripts/push_configs_to_mongo.js`
2. Git commit & push: `git add . && git commit -m "feat(loot): add official icons for new event" && git push origin main`
3. Reiniciar bot local se necessário.

---

## 🛠️ Scripts de Referência
* [sync_loot_asset.py](./scripts/sync_loot_asset.py): Download e redimensionamento automático de imagens Riot para 128x128.
* [upload_loot_emojis.js](../../scripts/upload_loot_emojis.js): Upload automático dos PNGs para a API de Application Emojis do Discord.
* [push_configs_to_mongo.js](../../scripts/push_configs_to_mongo.js): Sincronização das configurações locais com o MongoDB Atlas.
