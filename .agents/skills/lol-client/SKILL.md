---
name: lol-client
description: >-
  Identify and interact with the running League of Legends Client (LCU) on the host machine.
  Use this skill to detect running LeagueClient processes, read the lockfile, fetch live Riot store
  catalogs, inspect player loot, query summoner info, and sync store data directly from the game client.
---

# League of Legends Client (LCU) Inspector & Store Sync Skill

This skill allows Antigravity to interact directly with the running League of Legends game client (League Client Update - LCU) on Windows, reading live storefront offerings, active passes, orbs, player loot, summoner information, and session tokens.

---

## 1. Quick Detection & Verification

To verify if the League Client is running and read its connection parameters (Port, Password, Process ID, Summoner Profile):

```bash
python .agents/skills/lol-client/scripts/detect_lcu.py
```

### Connection Details
* **Process:** `LeagueClientUx.exe` / `LeagueClient.exe`
* **Lockfile Location:** Read automatically from the process directory (e.g., `F:\Riot Games\League of Legends\lockfile` or `C:\Riot Games\League of Legends\lockfile`).
* **Format:** `process_name:pid:port:password:protocol` (e.g., `LeagueClient:13996:50396:t64y3nn_lDNKO_rXETUjwQ:https`)
* **Authentication:** HTTP Basic Auth with username `riot` and password `<lockfile_password>`.
* **SSL:** Uses a self-signed Riot certificate; requests must disable SSL verification (`verify=False`).

---

## 2. Syncing Live Storefront Catalog to Bot

To pull the exact, active store catalog directly from the open League Client into the bot's repository and rebuild all caches:

```bash
python .agents/skills/lol-client/scripts/sync_live_catalog.py
```

This will:
1. Query `/lol-store/v1/catalog` directly from the local running client.
2. Update `config/catalog.json` with 10,000+ authoritative live items.
3. Automatically execute `scripts/sync_all_catalog.py` to compile diffs, filter passes/orbs, update `config/catalog_cache_*.json`, and push updates to MongoDB Atlas.

---

## 3. Key LCU REST API Endpoints

All endpoints are queried via `https://127.0.0.1:<port>` with `auth=('riot', <password>)`:

| Endpoint | Method | Description |
| :--- | :---: | :--- |
| `/lol-summoner/v1/current-summoner` | GET | Current logged-in summoner name, level, PUUID, and icon |
| `/lol-store/v1/catalog` | GET | Complete live storefront catalog and offers |
| `/lol-store/v1/getStoreUrl` | GET | Web store URL containing live session auth token |
| `/lol-loot/v1/player-loot` | GET | Inventory of chests, keys, tokens, and essences |
| `/lol-inventory/v1/wallet` | GET | Account RP and Blue Essence balances |
| `/lol-chat/v1/friends` | GET | Connected in-game friend list |
| `/lol-rso-auth/v1/authorization/access-token` | GET | Live RSO OAuth bearer tokens |

---

## 4. Helper Scripts Reference

* [detect_lcu.py](./scripts/detect_lcu.py): Detects LCU process, lockfile, and prints active summoner session.
* [sync_live_catalog.py](./scripts/sync_live_catalog.py): Dumps live LCU catalog and triggers full bot catalog sync pipeline.
