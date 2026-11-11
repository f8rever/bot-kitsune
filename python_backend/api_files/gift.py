import os
import json
import uuid
import asyncio
import aiohttp
from api_files.riot_tokens import RiotAuth

_CATALOG_INDEX_CACHE = {
    "mtime": 0,
    "path": None,
    "by_key": {},
    "by_id": {},
    "by_offer": {},
}

_INV_PRIORITY = {
    "BUNDLES": 1,
    "CHAMPION_SKIN": 2,
    "CHAMPION": 3,
    "HEXTECH_CRAFTING": 4,
    "EVENT_PASS": 5,
    "WARD_SKIN": 6,
    "SUMMONER_ICON": 7,
    "EMOTE": 8,
    "STATSTONE": 9,
    "COMPANION": 10,
    "TFT_MAP_SKIN": 11,
    "TFT_DAMAGE_SKIN": 12,
    "MYSTERY": 13,
    "SPELL_BOOK_PAGE": 14,
    "BOOST": 15,
}


def _get_catalog_index():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    candidates = [
        os.path.join(base_dir, "catalog.json"),
        r"c:\Users\jeff\Documents\KITSUNE V2 BOT\python_backend\catalog.json",
        r"C:\Users\jeff\Documents\lol_giftapi-main\catalog.json",
    ]
    cat_path = next((p for p in candidates if os.path.exists(p)), None)
    if not cat_path:
        return _CATALOG_INDEX_CACHE

    try:
        mtime = os.path.getmtime(cat_path)
        if _CATALOG_INDEX_CACHE["path"] == cat_path and _CATALOG_INDEX_CACHE["mtime"] == mtime and _CATALOG_INDEX_CACHE["by_key"]:
            return _CATALOG_INDEX_CACHE

        with open(cat_path, "r", encoding="utf-8") as f:
            raw = json.load(f)

        by_key = {}
        by_id = {}
        by_offer = {}

        if isinstance(raw, list):
            for entry in raw:
                if not isinstance(entry, dict):
                    continue
                inv = str(entry.get("inventoryType") or "").strip().upper()
                iid = entry.get("itemId")
                oid = entry.get("offerId") or entry.get("id")
                try:
                    iid_int = int(iid)
                except Exception:
                    iid_int = iid

                if inv and iid_int is not None:
                    by_key[(inv, iid_int)] = entry
                    existing = by_id.get(iid_int)
                    if not existing:
                        by_id[iid_int] = entry
                    else:
                        old_inv = str(existing.get("inventoryType") or "").strip().upper()
                        if _INV_PRIORITY.get(inv, 99) < _INV_PRIORITY.get(old_inv, 99):
                            by_id[iid_int] = entry

                if oid:
                    by_offer[str(oid)] = entry

        _CATALOG_INDEX_CACHE["mtime"] = mtime
        _CATALOG_INDEX_CACHE["path"] = cat_path
        _CATALOG_INDEX_CACHE["by_key"] = by_key
        _CATALOG_INDEX_CACHE["by_id"] = by_id
        _CATALOG_INDEX_CACHE["by_offer"] = by_offer
    except Exception as e:
        print(f"[GIFT CATALOG INDEX] Aviso ao indexar catalog.json: {e}")

    return _CATALOG_INDEX_CACHE



class Gift:

    def __init__(self, auth: RiotAuth):

        self._auth_ssl_ctx = auth._auth_ssl_ctx
        self.tcp_connector = aiohttp.TCPConnector(ssl=self._auth_ssl_ctx)
        self._cookie_jar = aiohttp.CookieJar()

        self.session = aiohttp.ClientSession(connector=self.tcp_connector, cookie_jar=self._cookie_jar)

        self.status = False

        self.lol_token = auth.lol_token
        self.region = auth.region




    async def send_gift(self, auth: RiotAuth, receiver_puuid, offer_id, gift_message, quantity = 1):

        headers = {
            "Accept": "application/json",
            "Authorization": f"Bearer {auth.lol_token}",
            "Content-Type": "application/json",
            "User-Agent": f"LeagueOfLegendsClient/{getattr(auth, 'lol_version', '14.23.636.9832')} (rcp-be-storefront)"
        }

        gift_body = {
            "data": {
                "id": "",
                "customMessage": str(gift_message or ""),
                "location": auth.aws_prod,
                "purchaser": {
                    "id": auth.my_puuid
                },
                "source": "lol.store.purchase",
                "subOrders": [
                    {
                        "offer": {
                            "id": str(offer_id),
                            "productId": "d1c2664a-5938-4c41-8d1b-61fd51052c22"
                        },
                        "offerContext": {
                            "paymentOption": "RP",
                            "quantity": int(quantity or 1)
                        },
                        "recipientId": receiver_puuid
                    }
                ]
            },
            "meta": {
                "correlationId": "",
                "jwt": "",
                "xid": str(uuid.uuid4())
            }
        }

        post_args = {
            'url': f"https://{auth.league_edge_url}/services/cap/orders/orders-api/v2/products/d1c2664a-5938-4c41-8d1b-61fd51052c22/orders",
            'headers': headers,
            'json': gift_body
        }

        print(f"\n[SEND_GIFT REQUEST] URL: {post_args['url']}")
        print(f"[SEND_GIFT REQUEST] OfferId: {offer_id} | Receiver: {receiver_puuid}")
        print(f"[SEND_GIFT REQUEST] Body: {json.dumps(gift_body, indent=2)}")

        async with self.session.post(**post_args) as response:
            gift_status = response.status
            try:
                gift_response = await response.json()
            except Exception:
                gift_response = await response.text()
            print(f"\n[SEND_GIFT RESPONSE] Status: {gift_status}")
            print(f"[SEND_GIFT RESPONSE] Body: {gift_response}")
            print("\n Gift Finished")
            if gift_status in (200, 201, 202, 204):
                self.status = True
                return True, gift_response
            else:
                self.status = False
                return False, gift_response
    

    async def send_gift_v3(self, auth: RiotAuth, summoner_id, item_id, item_price, inventory_type, gift_message, Qtd=1, currency="RP", offer_id=None, receiver_puuid=None):

        inv_upper = str(inventory_type or "").strip().upper()
        is_chroma = inv_upper in ("CHROMA", "CHROMAS")

        if inv_upper in ("CHROMA", "CHROMAS", "SKIN", "SKINS", "CHAMPION_SKIN"):
            riot_inv_type = "CHAMPION_SKIN"
        elif inv_upper in ("CHAMPION", "CHAMPIONS"):
            riot_inv_type = "CHAMPION"
        elif inv_upper in ("WARD", "WARDS", "WARD_SKIN", "SENTINELAS"):
            riot_inv_type = "WARD_SKIN"
        elif inv_upper in ("ICON", "ICONS", "SUMMONER_ICON", "ÍCONES", "ICONES"):
            riot_inv_type = "SUMMONER_ICON"
        elif inv_upper in ("BUNDLE", "BUNDLES", "PASS", "PASSES", "EVENT_PASS", "PACOTES"):
            riot_inv_type = "BUNDLES"
        elif inv_upper in ("HEXTECH", "HEXTECH_CRAFTING", "LOOT", "ESPÓLIOS", "ESPOLIOS"):
            riot_inv_type = "HEXTECH_CRAFTING"
        elif inv_upper in ("EMOTE", "EMOTES"):
            riot_inv_type = "EMOTE"
        elif inv_upper in ("STATSTONE", "ETERNALS", "ETERNAL", "ETERNOS"):
            riot_inv_type = "STATSTONE"
        elif inv_upper in ("COMPANION", "LITTLELEGENDS", "LITTLE_LEGENDS"):
            riot_inv_type = "COMPANION"
        elif inv_upper in ("TFT_MAP_SKIN", "TFTARENA", "TFT_ARENA"):
            riot_inv_type = "TFT_MAP_SKIN"
        elif inv_upper == "TFT_DAMAGE_SKIN":
            riot_inv_type = "TFT_DAMAGE_SKIN"
        elif inv_upper in ("BOOST", "BOOSTS", "BÔNUS", "BONUS"):
            riot_inv_type = "BOOST"
        elif inv_upper == "MYSTERY":
            riot_inv_type = "MYSTERY"
        elif inv_upper == "SPELL_BOOK_PAGE":
            riot_inv_type = "SPELL_BOOK_PAGE"
        else:
            riot_inv_type = str(inventory_type or "CHAMPION_SKIN").strip().upper()

        try:
            clean_item_id = int(item_id)
        except Exception:
            clean_item_id = item_id

        try:
            clean_summoner_id = int(summoner_id)
        except Exception:
            clean_summoner_id = summoner_id

        try:
            clean_account_id = int(auth.accountId)
        except Exception:
            clean_account_id = auth.accountId

        try:
            clean_price = int(item_price or 0)
        except Exception:
            clean_price = item_price or 0

        try:
            clean_qty = max(1, int(Qtd or 1))
        except Exception:
            clean_qty = 1

        if isinstance(clean_item_id, int) and clean_item_id >= 69900000 and riot_inv_type in ("HEXTECH_CRAFTING", "EVENT_PASS", "PASS", "PASSES", "LOOT"):
            riot_inv_type = "BUNDLES"

        # Consulta o índice do catalog.json oficial para validar inventoryType, subInventoryType, preço e itens empacotados
        cat_idx = _get_catalog_index()
        cat_entry = None
        if offer_id and str(offer_id) in cat_idx.get("by_offer", {}):
            cat_entry = cat_idx["by_offer"][str(offer_id)]
        if not cat_entry and riot_inv_type != "MYSTERY":
            cat_entry = cat_idx.get("by_key", {}).get((riot_inv_type, clean_item_id))
            if not cat_entry:
                cat_entry = cat_idx.get("by_id", {}).get(clean_item_id)

        sub_inv = ""
        cat_rp_price = None
        resolved_offer_id = offer_id

        if cat_entry and riot_inv_type != "MYSTERY":
            cat_inv = str(cat_entry.get("inventoryType") or "").strip().upper()
            if cat_inv in _INV_PRIORITY:
                riot_inv_type = cat_inv
            sub_inv = str(cat_entry.get("subInventoryType") or "").strip().upper()
            if sub_inv == "RECOLOR":
                is_chroma = True
            if not resolved_offer_id:
                resolved_offer_id = cat_entry.get("offerId") or cat_entry.get("id")

            sale_prices = (cat_entry.get("sale") or {}).get("prices") or []
            for p in sale_prices:
                if isinstance(p, dict) and p.get("currency") == "RP" and p.get("cost"):
                    cat_rp_price = int(p["cost"])
                    break
            if not cat_rp_price:
                for p in (cat_entry.get("prices") or []):
                    if isinstance(p, dict) and p.get("currency") == "RP" and p.get("cost"):
                        cat_rp_price = int(p["cost"])
                        break
            if clean_price <= 0 and cat_rp_price and cat_rp_price > 0:
                clean_price = cat_rp_price

        giftId = self.get_gift_id(riot_inv_type, clean_item_id, is_chroma=is_chroma)

        headers = {
            "Host": f"{auth.league_edge_url}",
            "User-Agent": f"Mozilla/5.0 (Windows NT 6.2; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) LeagueOfLegendsClient/{getattr(auth, 'lol_version', '14.23.636.9832')} (CEF 91) Safari/537.36",
            "Accept-Encoding": "gzip, deflate, br",
            "Accept": "application/json",
            "Connection": "keep-alive",
            "sec-ch-ua": '"Chromium";v="91"',
            "sec-ch-ua-mobile": "?0",
            "Authorization": f"Bearer {auth.lol_token}",
            "Content-Type": "application/json",
            "Origin": "https://127.0.0.1:88888",
            "Sec-Fetch-Site": "cross-site",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Dest": "empty",
            "Accept-Language": "en-US,en;q=0.9"
        }

        is_ea = str(currency or "RP").strip().upper() == "EA"
        cap_proxied_types = ("EMOTE", "STATSTONE", "COMPANION", "TFT_MAP_SKIN", "TFT_DAMAGE_SKIN", "BOOST")

        def _make_body(gid, items_list):
            return {
                "customMessage": str(gift_message or ""),
                "receiverSummonerId": clean_summoner_id,
                "giftItemId": gid,
                "accountId": clean_account_id,
                "items": items_list,
            }

        def _extract_bundle_items(entry, ip_val):
            if not entry or not isinstance(entry, dict):
                return None
            bundled_items = (entry.get("bundled") or {}).get("items") or []
            extracted = []
            for bi in bundled_items:
                if not isinstance(bi, dict):
                    continue
                b_inv = str(bi.get("inventoryType") or "").strip().upper()
                b_id = bi.get("itemId")
                b_qty = max(1, int(bi.get("quantity") or 1)) * clean_qty
                b_cost = 0
                for dp in (bi.get("discountPrices") or []):
                    if isinstance(dp, dict) and dp.get("currency") == "RP" and dp.get("cost") is not None:
                        b_cost = int(dp["cost"])
                        break
                try:
                    b_id = int(b_id)
                except Exception:
                    pass
                extracted.append({
                    "inventoryType": b_inv,
                    "itemId": b_id,
                    "ipCost": ip_val,
                    "rpCost": b_cost,
                    "quantity": b_qty,
                })
            return extracted if extracted else None

        candidate_bodies = []

        if riot_inv_type in cap_proxied_types or is_chroma:
            # 1) CAP Proxy mode (giftItemId=1010, ipCost=None para RP)
            candidate_bodies.append(_make_body(1010, [{
                "inventoryType": riot_inv_type,
                "itemId": clean_item_id,
                "ipCost": clean_price if is_ea else None,
                "rpCost": None if is_ea else clean_price,
                "quantity": clean_qty,
            }]))
            # 2) Legacy giftId com ipCost=0
            candidate_bodies.append(_make_body(self.get_gift_id(riot_inv_type, clean_item_id, is_chroma=False), [{
                "inventoryType": riot_inv_type,
                "itemId": clean_item_id,
                "ipCost": clean_price if is_ea else 0,
                "rpCost": 0 if is_ea else clean_price,
                "quantity": clean_qty,
            }]))
            # 3) giftItemId=1010 com ipCost=0
            candidate_bodies.append(_make_body(1010, [{
                "inventoryType": riot_inv_type,
                "itemId": clean_item_id,
                "ipCost": clean_price if is_ea else 0,
                "rpCost": 0 if is_ea else clean_price,
                "quantity": clean_qty,
            }]))
        elif riot_inv_type == "BUNDLES":
            extracted_zero = _extract_bundle_items(cat_entry, 0)
            extracted_null = _extract_bundle_items(cat_entry, None)
            all_hextech_items = bool(extracted_zero) and all(x.get("inventoryType") == "HEXTECH_CRAFTING" for x in extracted_zero)

            if sub_inv == "HEXTECH_BUNDLE" and all_hextech_items:
                # Regra oficial da Riot: giftingExtractBundleItemsForSubInventoryTypes = ["HEXTECH_BUNDLE"] para Orbes/Baús
                candidate_bodies.append(_make_body(1010, extracted_zero))
                candidate_bodies.append(_make_body(1010, extracted_null))

            # Envio direto como BUNDLES (funciona para Passes de Evento 69901080..69901082 e pacotes gerais)
            candidate_bodies.append(_make_body(1010, [{
                "inventoryType": "BUNDLES",
                "itemId": clean_item_id,
                "ipCost": clean_price if is_ea else 0,
                "rpCost": 0 if is_ea else clean_price,
                "quantity": clean_qty,
            }]))
            candidate_bodies.append(_make_body(1010, [{
                "inventoryType": "BUNDLES",
                "itemId": clean_item_id,
                "ipCost": clean_price if is_ea else None,
                "rpCost": None if is_ea else clean_price,
                "quantity": clean_qty,
            }]))

            if extracted_zero and not (sub_inv == "HEXTECH_BUNDLE" and all_hextech_items):
                candidate_bodies.append(_make_body(1010, extracted_zero))
                candidate_bodies.append(_make_body(1010, extracted_null))
        else:
            # Padrão para CHAMPION_SKIN, CHAMPION, WARD_SKIN, SUMMONER_ICON, HEXTECH_CRAFTING, MYSTERY
            candidate_bodies.append(_make_body(giftId, [{
                "inventoryType": riot_inv_type,
                "itemId": clean_item_id,
                "ipCost": clean_price if is_ea else 0,
                "rpCost": 0 if is_ea else clean_price,
                "quantity": clean_qty,
            }]))
            if cat_rp_price and cat_rp_price != clean_price and not is_ea:
                candidate_bodies.append(_make_body(giftId, [{
                    "inventoryType": riot_inv_type,
                    "itemId": clean_item_id,
                    "ipCost": 0,
                    "rpCost": cat_rp_price,
                    "quantity": clean_qty,
                }]))
            # Só adiciona giftItemId=1010 com ipCost=None para HEXTECH_CRAFTING (nunca para CHAMPION_SKIN/CHAMPION/MYSTERY)
            if riot_inv_type == "HEXTECH_CRAFTING":
                candidate_bodies.append(_make_body(1010, [{
                    "inventoryType": riot_inv_type,
                    "itemId": clean_item_id,
                    "ipCost": clean_price if is_ea else None,
                    "rpCost": None if is_ea else clean_price,
                    "quantity": clean_qty,
                }]))

        url = f"https://{auth.league_edge_url}/storefront/v3/gift"
        last_status = 400
        last_response = None
        self.auto_unlocked_champion = None

        non_retryable_markers = (
            "notenoughcurrency",
            "alreadyowned",
            "already_owned",
            "maxgifts",
            "limit_reached",
            "friendssince",
            "notfriends",
            "recipient",
        )

        for idx, gift_body in enumerate(candidate_bodies, start=1):
            post_args = {
                "url": url,
                "headers": headers,
                "json": gift_body,
            }
            print(f"\n[SEND_GIFT_V3 REQUEST #{idx}] URL: {url}")
            print(f"[SEND_GIFT_V3 REQUEST #{idx}] Body: {gift_body}")

            async with self.session.post(**post_args) as response:
                gift_status = response.status
                try:
                    gift_response = await response.json()
                except Exception:
                    gift_response = await response.text()

                print(f"[SEND_GIFT_V3 RESPONSE #{idx}] Status: {gift_status}")
                print(f"[SEND_GIFT_V3 RESPONSE #{idx}] Body: {gift_response}")

                last_status = gift_status
                last_response = gift_response

                if gift_status in (200, 201, 202, 204):
                    print("\n Gift Finished (v3)")
                    self.status = True
                    return True, gift_response

                resp_str = json.dumps(gift_response, ensure_ascii=False).lower() if not isinstance(gift_response, str) else gift_response.lower()
                if any(m in resp_str for m in non_retryable_markers):
                    break

        # Resolução Automática de Campeão Base quando o destinatário não possui o Campeão da Skin (itemTypeNotAvailable)
        if riot_inv_type == "CHAMPION_SKIN" and not is_chroma and not is_ea and cat_entry:
            resp_str = json.dumps(last_response, ensure_ascii=False).lower() if not isinstance(last_response, str) else str(last_response).lower()
            if "itemtypenotavailable" in resp_str:
                parent_champ_id = (cat_entry.get("parent") or {}).get("itemId")
                if not parent_champ_id:
                    for req in (cat_entry.get("itemRequirements") or []):
                        if isinstance(req, dict) and str(req.get("inventoryType") or "").upper() == "CHAMPION":
                            parent_champ_id = req.get("itemId")
                            break

                if parent_champ_id:
                    try:
                        parent_champ_id = int(parent_champ_id)
                    except Exception:
                        pass
                    champ_entry = cat_idx.get("by_key", {}).get(("CHAMPION", parent_champ_id))
                    if champ_entry:
                        champ_name = ((champ_entry.get("localizations") or {}).get("pt_BR") or {}).get("name") or f"Campeão {parent_champ_id}"
                        champ_rp = 0
                        for sp in ((champ_entry.get("sale") or {}).get("prices") or []):
                            if isinstance(sp, dict) and sp.get("currency") == "RP" and sp.get("cost"):
                                champ_rp = int(sp["cost"])
                                break
                        if not champ_rp:
                            for p in (champ_entry.get("prices") or []):
                                if isinstance(p, dict) and p.get("currency") == "RP" and p.get("cost"):
                                    champ_rp = int(p["cost"])
                                    break

                        sender_rp = int(getattr(auth, "rp_amount", 0) or 0)
                        skin_rp = int(cat_rp_price or clean_price or 0)

                        if champ_rp > 0 and sender_rp >= (skin_rp + champ_rp):
                            print(f"\n[AUTO-UNLOCK CHAMPION] Destinatário não possui o campeão base {champ_name} (ID: {parent_champ_id}, {champ_rp} RP). Enviando campeão automaticamente antes da skin...")
                            champ_body = _make_body(1, [{
                                "inventoryType": "CHAMPION",
                                "itemId": parent_champ_id,
                                "ipCost": 0,
                                "rpCost": champ_rp,
                                "quantity": 1,
                            }])
                            async with self.session.post(url=url, headers=headers, json=champ_body) as c_resp:
                                c_status = c_resp.status
                                try:
                                    c_json = await c_resp.json()
                                except Exception:
                                    c_json = await c_resp.text()
                                print(f"[AUTO-UNLOCK CHAMPION RESPONSE] Status: {c_status} | Body: {c_json}")

                                if c_status in (200, 201, 202, 204):
                                    self.auto_unlocked_champion = {
                                        "id": parent_champ_id,
                                        "name": champ_name,
                                        "rp": champ_rp,
                                    }
                                    await asyncio.sleep(1.8)
                                    skin_retry_body = _make_body(2, [{
                                        "inventoryType": "CHAMPION_SKIN",
                                        "itemId": clean_item_id,
                                        "ipCost": 0,
                                        "rpCost": skin_rp,
                                        "quantity": clean_qty,
                                    }])
                                    print(f"\n[AUTO-UNLOCK SKIN RETRY] Reenviando skin após desbloquear {champ_name}: {skin_retry_body}")
                                    async with self.session.post(url=url, headers=headers, json=skin_retry_body) as s_resp:
                                        s_status = s_resp.status
                                        try:
                                            s_json = await s_resp.json()
                                        except Exception:
                                            s_json = await s_resp.text()
                                        print(f"[AUTO-UNLOCK SKIN RETRY RESPONSE] Status: {s_status} | Body: {s_json}")
                                        if s_status in (200, 201, 202, 204):
                                            self.status = True
                                            return True, s_json
                                        last_response = s_json
                                else:
                                    c_str = json.dumps(c_json, ensure_ascii=False).lower() if not isinstance(c_json, str) else str(c_json).lower()
                                    if "itemtypenotavailable" in c_str or "alreadyowned" in c_str:
                                        last_response = {
                                            "errorCode": "ALREADY_OWNED",
                                            "message": f"O destinatário já possui o campeão {champ_name} e já possui esta skin habilitada na conta (ou a skin está temporariamente indisponível para presente)."
                                        }
                                    elif "limit_reached" in c_str:
                                        last_response = c_json
                        elif champ_rp > 0:
                            last_response = {
                                "errorCode": "MISSING_CHAMPION",
                                "message": f"O destinatário não possui o campeão {champ_name} ({champ_rp} RP). Para desbloquear o campeão + skin automaticamente são necessários {skin_rp + champ_rp} RP (saldo atual: {sender_rp} RP)."
                            }

        print("\n Gift Finished (v3 - Failed)")
        self.status = False
        return False, last_response
    
    def get_gift_id(self, inventory_type, item_id, is_chroma=False):
        inv = str(inventory_type or "").strip().upper()
        try:
            iid = int(item_id)
        except Exception:
            iid = item_id

        if is_chroma or inv in ("CHROMA", "CHROMAS"):
            return 1010
        if inv == "CHAMPION":
            return 1
        elif inv == "MYSTERY":
            if iid == 1:
                return 3
            elif iid == 4:
                return 9
            elif iid == 3:
                return 4
            elif iid == 50:
                return 100
            elif iid == 60:
                return 110
            return 3
        elif inv in ("CHAMPION_SKIN", "SKIN", "SKINS"):
            return 2
        elif inv in ("WARD_SKIN", "WARD", "WARDS"):
            return 8
        elif inv in ("SUMMONER_ICON", "ICON", "ICONS"):
            return 5
        elif inv in ("BUNDLES", "BUNDLE", "HEXTECH_CRAFTING", "HEXTECH", "LOOT", "EVENT_PASS", "PASS", "PASSES", "EMOTE", "EMOTES", "STATSTONE", "ETERNALS", "COMPANION", "LITTLELEGENDS", "TFT_MAP_SKIN", "TFTARENA", "TFT_DAMAGE_SKIN", "BOOST", "BOOSTS"):
            return 1010
        elif inv == "SPELL_BOOK_PAGE":
            return 6
        elif inv == "RP":
            return 7
        else:
            return 1010
        

    async def send_rp(self, receiver_puuid):




        pmc_urls = {
            "BR1": "edge.rgl.pmc.pay.riotgames.com",
            "SG2": "edge.rgs.pmc.pay.riotgames.com",
            "LAS": "edge.rgi.pmc.pay.riotgames.com",
            "LA2": "edge.rgi.pmc.pay.riotgames.com",
            "LAN": "edge.rgi.pmc.pay.riotgames.com",
            "LA1": "edge.rgi.pmc.pay.riotgames.com",
            "VN2": "edge.rgs.pmc.pay.riotgames.com",
            "EUN1": "edge.rgl.pmc.pay.riotgames.com",
            "EUW1": "edge.rgl.pmc.pay.riotgames.com",
            "JP1": "edge.rgj.pmc.pay.riotgames.com",
            "KR": "edge.rgk.pmc.pay.riotgames.com",
            "NA1": "edge.rgi.pmc.pay.riotgames.com",
            "OC1": "edge.rgl.pmc.pay.riotgames.com",
            "RU": "edge.rgl.pmc.pay.riotgames.com",
            "TH": "edge.rgs.pmc.pay.riotgames.com",
            "TR": "edge.rgl.pmc.pay.riotgames.com",
            "ME1": "edge.rgl.pmc.pay.riotgames.com",
        }

        pmc_host = pmc_urls.get(self.region, "edge.rgl.pmc.pay.riotgames.com")

        if self.region == "BR1":
            localeId = "pt_BR"
        else:
            localeId = "en_GB"


        headers = {
            "Host": pmc_host,
            "User-Agent": "LeagueOfLegendsClient/14.21.628.6182 (rcp-be-payments)",
            "Accept-Encoding": "gzip, deflate, zstd",
            "Accept": "application/json",
            "Authorization": f"Bearer {self.lol_token}",
            "Content-Type": "application/json",
        }

        # Define o body e adiciona o receiver_puuid se não for None

        body = {
            "game": "lol",
            "gifteeAccountId": receiver_puuid if receiver_puuid is not None else "",
            "gifteeMessage": "",
            "isPrepaid": False,
            "localeId": localeId,
            "minVirtualAmount": -1,
            "openedFrom": "navigation",
            "orderDetailsJSON": "",
            "summonerLevel": 50
        }

        post_args = {
            'url': f"https://{pmc_host}/riotpay/pmc/v2/lol/sessions",
            'headers': headers,
            'json': body
        }

        async with self.session.post(**post_args) as response:
            gift_response = await response.json()
            gift_status = response.status
            #gift_response_json = json.dumps(gift_response, ensure_ascii=False)
            print(f"\n {gift_status}")
            print(f"\n {gift_response}")
            return gift_response






