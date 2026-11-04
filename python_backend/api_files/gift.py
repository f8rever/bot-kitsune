import json
import uuid
import aiohttp
from api_files.riot_tokens import RiotAuth


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
    

    async def send_gift_v3(self, auth:RiotAuth, summoner_id, item_id, item_price, inventory_type, gift_message, Qtd=1, currency="RP"):

        inv_upper = str(inventory_type or "").strip().upper()
        if inv_upper in ("CHROMA", "SKIN", "CHAMPION_SKIN"):
            riot_inv_type = "CHAMPION_SKIN"
        elif inv_upper == "CHAMPION":
            riot_inv_type = "CHAMPION"
        elif inv_upper in ("WARD", "WARD_SKIN"):
            riot_inv_type = "WARD_SKIN"
        elif inv_upper in ("ICON", "SUMMONER_ICON"):
            riot_inv_type = "SUMMONER_ICON"
        elif inv_upper in ("BUNDLE", "BUNDLES"):
            riot_inv_type = "BUNDLES"
        elif inv_upper in ("HEXTECH", "HEXTECH_CRAFTING", "LOOT"):
            riot_inv_type = "HEXTECH_CRAFTING"
        else:
            riot_inv_type = str(inventory_type or "CHAMPION_SKIN")

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

        giftId = self.get_gift_id(riot_inv_type, clean_item_id)

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
        ip_cost = clean_price if is_ea else 0
        rp_cost = 0 if is_ea else clean_price

        gift_body = {
            "customMessage": str(gift_message or ""),
            "receiverSummonerId": clean_summoner_id,
            "giftItemId": giftId,
            "accountId": clean_account_id,
            "items": [
                {
                    "inventoryType": riot_inv_type,
                    "itemId": clean_item_id,
                    "ipCost": ip_cost,
                    "rpCost": rp_cost,
                    "quantity": clean_qty,
                }
            ]
        }

        post_args = {
            'url': f"https://{auth.league_edge_url}/storefront/v3/gift",
            'headers': headers,
            'json': gift_body
        }

        print(f"\n[SEND_GIFT_V3 REQUEST] URL: {post_args['url']}")
        print(f"[SEND_GIFT_V3 REQUEST] Body: {gift_body}")
        async with self.session.post(**post_args) as response:
            gift_status = response.status
            try:
                gift_response = await response.json()
            except Exception:
                gift_response = await response.text()
            print(f"\n[SEND_GIFT_V3 RESPONSE] Status: {gift_status}")
            print(f"[SEND_GIFT_V3 RESPONSE] Body: {gift_response}")
            print("\n Gift Finished (v3)")
            if gift_status in (200, 201, 202, 204):
                self.status = True
                return True, gift_response
            else:
                self.status = False
                return False, gift_response
    
    def get_gift_id(self, inventory_type, item_id):
        inv = str(inventory_type or "").strip().upper()
        try:
            iid = int(item_id)
        except Exception:
            iid = item_id

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
        elif inv in ("CHAMPION_SKIN", "CHROMA", "SKIN"):
            return 2
        elif inv in ("WARD_SKIN", "WARD"):
            return 8
        elif inv in ("SUMMONER_ICON", "ICON"):
            return 5
        elif inv in ("BUNDLES", "BUNDLE", "HEXTECH_CRAFTING", "HEXTECH", "EVENT_PASS", "PASS", "EMOTE", "STATSTONE", "COMPANION", "TFT_MAP_SKIN", "TFT_DAMAGE_SKIN"):
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






