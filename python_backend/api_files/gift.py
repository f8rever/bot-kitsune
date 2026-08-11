import json
import uuid
import aiohttp
from api_files.riot_tokens import RiotAuth


class Gift:

    def __init__(self, auth: RiotAuth):

        self._auth_ssl_ctx = auth._auth_ssl_ctx
        self.tcp_connector = aiohttp.TCPConnector(ssl=self._auth_ssl_ctx)
        self._cookie_jar = aiohttp.CookieJar()

        self.session = aiohttp.ClientSession(connector=self.tcp_connector,raise_for_status=True,cookie_jar=self._cookie_jar)

        self.status = False

        self.lol_token = auth.lol_token
        self.region = auth.region




    async def send_gift(self, auth:RiotAuth , receiver_puuid, offer_id, gift_message, quantity = 1):
        if not auth.my_puuid and auth.lol_token:
            try:
                import jwt
                decoded = jwt.decode(auth.lol_token, algorithms=['HS256'], options={"verify_signature": False})
                auth.my_puuid = decoded.get("sub")
            except Exception:
                pass

        headers = {
            "accept": "application/json",
            "authorization": f"Bearer {auth.lol_token}",
            "Content-Type": "application/json",
        }

        gift_body = {
            "data": {
                "id": "",
                "customMessage": gift_message or "",
                "location": auth.aws_prod,
                "purchaser": {
                    "id": auth.my_puuid
                },
                "source": "lol.store.purchase",
                "subOrders": [
                    {
                        "offer": {
                            "id": offer_id,
                            "productId": "d1c2664a-5938-4c41-8d1b-61fd51052c22"
                        },
                        "offerContext": {
                            "paymentOption": "RP",
                            "quantity": quantity
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

        async with self.session.post(**post_args) as response:
            try:
                gift_response = await response.json()
            except Exception:
                gift_response = await response.text()
            gift_status = response.status
            print(f"\n Gift Status V2: {gift_status}")
            print(f"\n Gift Response V2: {gift_response}")
            print("\n Gift Finished")
            if gift_status in [200, 201, 202, 204] and not (isinstance(gift_response, dict) and (gift_response.get("error") or gift_response.get("errorCode"))):
                self.status = True
            else:
                self.status = False

        return self.status
    

    async def send_gift_v3(self, auth:RiotAuth , summoner_id, item_id, item_price,inventory_type , gift_message, Qtd = 1):
        if not auth.accountId:
            try:
                await auth.get_saldo_rp()
            except Exception as e:
                print(f"Error fetching accountId in send_gift_v3: {e}")

        giftId = self.get_gift_id(inventory_type, item_id)

        try:
            rec_id = int(summoner_id)
        except (ValueError, TypeError):
            rec_id = summoner_id

        try:
            itm_id = int(item_id)
        except (ValueError, TypeError):
            itm_id = item_id

        try:
            rp_cost = int(item_price)
        except (ValueError, TypeError):
            rp_cost = item_price

        headers = {
            "Host": f"{auth.league_edge_url}",
            "User-Agent": f"Mozilla/5.0 (Windows NT 6.2; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) LeagueOfLegendsClient/{auth.lol_version} (CEF 91) Safari/537.36",
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

        gift_body = {
            "customMessage": gift_message or "",
            "receiverSummonerId": rec_id,
            "giftItemId": giftId,
            "accountId": auth.accountId,
            "items":[
                {
                    "inventoryType": str(inventory_type),
                    "itemId": itm_id,
                    "ipCost": 0,
                    "rpCost": rp_cost,
                    "quantity": 1,
                }
            ]
        }
        
        post_args = {
            'url': f"https://{auth.league_edge_url}/storefront/v3/gift",
            'headers': headers,
            'json': gift_body

        }

        print(f"\n {gift_body}")
        async with self.session.post(**post_args) as response:
            try:
                gift_response = await response.json()
            except Exception:
                gift_response = await response.text()
            gift_status = response.status
            print(f"\n Gift Status V3: {gift_status}")
            print(f"\n Gift Response V3: {gift_response}")
            print("\n Gift Finished (v3)")
            if gift_status in [200, 201, 202, 204] and not (isinstance(gift_response, dict) and (gift_response.get("error") or gift_response.get("errorCode"))):
                self.status = True
            else:
                self.status = False

        return self.status
    
    def get_gift_id(self, inventory_type, item_id):
        # Verifica as condições especificadas e retorna o GiftId apropriado
        inv_type = (str(inventory_type) if inventory_type else '').upper()
        if inv_type == "CHAMPION":
            return 1
        elif inv_type == "MYSTERY":
            if item_id == 1:
                return 3
            elif item_id == 4:
                return 9
            elif item_id == 3:
                return 4
            elif item_id == 50:
                return 100
            elif item_id == 60:
                return 110
            return 3
        elif inv_type == "CHAMPION_SKIN":
            return 2
        elif inv_type == "WARD_SKIN":
            return 8
        elif inv_type == "SUMMONER_ICON":
            return 5
        elif inv_type in ["BUNDLES", "BUNDLE", "HEXTECH_CRAFTING", "EVENT_PASS", "PASS", "FEATURED", "HIGHLIGHT", "COMPANION", "LITTLELEGENDS", "EMOTE", "EMOTES", "STATSTONE"]:
            return 1010
        elif inv_type == "SPELL_BOOK_PAGE":
            return 6
        elif inv_type == "RP":
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






