import json
import os
import random
import string
import re
import uuid
import jwt
import requests
import aiohttp
import ssl
import sys
import contextlib
from typing import Dict, List, Optional, Sequence, Tuple, Union
import ctypes
import warnings
import certifi
import httpx
from pymongo import MongoClient
import urllib.parse
from urllib.parse import urlparse, parse_qs


from secrets import token_urlsafe
import time
import logging


logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

PROXY_FILE = "proxy_file.json"

uri = "mongodb+srv://thiagovaillant:lolzinho123.@cluster0.32wntaj.mongodb.net/monkeywitdb?retryWrites=true&w=majority&appName=Cluster0"
client = MongoClient(uri)
db = client.gift_api_keys
account_tokens = db.account_tokens
versions_collection = db.versions

versions_document = versions_collection.find_one({'name': 'riotClientBuild'})

if versions_document:
    # Tentar acessar o atributo 'version'
    version_riotClientBuild = versions_document.get("version")
else:
    version_riotClientBuild = 'xxxx'



# Dicionário global para armazenar tokens e timestamps
token_cache: Dict[str, Tuple[float, Dict[str, Optional[str]]]] = {}



class RiotAuth:
    PROXY_FILE = "proxy_file.json"
    #RIOT_CLIENT_USER_AGENT = token_urlsafe(111)
    RIOT_CLIENT_USER_AGENT = token_urlsafe(111)
    CIPHERS13 = ":".join(  # https://docs.python.org/3/library/ssl.html#tls-1-3
        (
            "TLS_CHACHA20_POLY1305_SHA256",
            "TLS_AES_128_GCM_SHA256",
            "TLS_AES_256_GCM_SHA384",
        )
    )
    CIPHERS = ":".join(
        (
            "ECDHE-ECDSA-CHACHA20-POLY1305",
            "ECDHE-RSA-CHACHA20-POLY1305",
            "ECDHE-ECDSA-AES128-GCM-SHA256",
            "ECDHE-RSA-AES128-GCM-SHA256",
            "ECDHE-ECDSA-AES256-GCM-SHA384",
            "ECDHE-RSA-AES256-GCM-SHA384",
            "ECDHE-ECDSA-AES128-SHA",
            "ECDHE-RSA-AES128-SHA",
            "ECDHE-ECDSA-AES256-SHA",
            "ECDHE-RSA-AES256-SHA",
            "AES128-GCM-SHA256",
            "AES256-GCM-SHA384",
            "AES128-SHA",
            "AES256-SHA",
            "DES-CBC3-SHA",  # most likely not available
        )
    )
    SIGALGS = ":".join(
        (
            "ecdsa_secp256r1_sha256",
            "rsa_pss_rsae_sha256",
            "rsa_pkcs1_sha256",
            "ecdsa_secp384r1_sha384",
            "rsa_pss_rsae_sha384",
            "rsa_pkcs1_sha384",
            "rsa_pss_rsae_sha512",
            "rsa_pkcs1_sha512",
            "rsa_pkcs1_sha1",  # will get ignored and won't be negotiated
        )
    )


    def __init__(self, username:str , password: str, cookies: aiohttp.CookieJar, captcha=None, ssid=None, lol_token=None, id_token=None):
        self.username = username
        self.password = password
        self._auth_ssl_ctx = RiotAuth.create_riot_auth_ssl_ctx()
        self._cookie_jar = cookies
        self.riot_header = None
        self.riot_token: Optional[str] = None
        self.lol_token: Optional[str] = lol_token
        self.id_token: Optional[str] = id_token
        self.geopas_token: Optional[str] = None
        self.geopas_afinity: Optional[str] = None
        self.entitlements_token: int = 0
        self.auth_result: Optional[bool] = False
        self.chat_dom: Optional[str] = None
        self.chat_uri: Optional[str] = None
        self.proxy = True
        self.proxy_url: Optional[str] = None
        self.tcp_connector = aiohttp.TCPConnector(ssl=self._auth_ssl_ctx)
        self.session = aiohttp.ClientSession(connector=self.tcp_connector,raise_for_status=True,cookie_jar=self._cookie_jar)
        self.catalog_map = None
        self.last_response = None
        self.rp_amount = None
        self.offerid_item = None
        self.region = None
        self.locale = None
        self.league_edge_url = None
        self.aws_prod = None

        self.riotId = None
        self.summnerLevel = None
        self.accountId = None

        self.captcha = captcha
        self.ssid = ssid
        #self.session = session





    async def initialize(self, catalog: bool = True):
        """Método async para inicializar a autenticação."""

        print(f"\n Initializing authentication as {self.username}\n")
        # Verifica se já existem tokens válidos para o username fornecido


        #cookie_jar = self._cookie_jar
        #cookies = {}
        #for cookie in cookie_jar:
            #cookies[cookie.key] = cookie.value
        
        #logger.info(f"Initial coorkies on auth: {cookies}")
        
        self.last_response = await self.authentication(self.username, self.password)

        print(f"\n Auth Result: {self.auth_result}")

        if self.last_response and isinstance(self.last_response, dict): 
            try:
                if self.last_response['error'] == "auth_failure":
                    return "Wrong credentials: Invalid username or password"
                    # Processar o erro de autenticação
            except KeyError:
                print("A chave 'error' não foi encontrada no dicionário.")

        if not self.auth_result:
            #print(f"\n Authentication Failed: {self.last_response}")
            return self.last_response
        
        await self.set_lol_version()
        await self.get_user_info()

        if catalog:
            print("\n Pegando o catalogo... \n")
            await self.get_catalog()

        print("\n Pegando o saldo... \n")

        self.rp_amount, self.ip_amount = await self.get_saldo_rp()


        return None

                     
    



    def _reuse_tokens(self, tokens: Dict[str, Optional[str]]):
        """Reutiliza os tokens armazenados no cache."""
        self.riot_token = tokens.get('riot_token')
        self.lol_token = tokens.get('lol_token')
        self.id_token = tokens.get('id_token')
        self.geopas_token = tokens.get('geopas_token')
        self.geopas_afinity = tokens.get('geopas_afinity')
        self.auth_result = tokens.get('auth_result')
        self.chat_dom = tokens.get('chat_dom')
        self.chat_uri = tokens.get('chat_uri')
        self.league_edge_url = tokens.get('league_edge_url')
        self.aws_prod = tokens.get('league_aws_prod')
        self.region = tokens.get('region')
        self.locale = tokens.get('locale')


    async def authentication(self, username: str, password: str):
        #if username and password:
            #self._cookie_jar.clear()




        # Find account tokens document
        self.userpass_value = f"{self.username}:{self.password}"
        
        tokens_document = account_tokens.find_one({'userpass': self.userpass_value})

        '''
        proxy_used = tokens_document.get('proxy_url')
        if proxy_used:
            self.proxy_url = proxy_used
        else:
            self.set_proxy_url()
        '''

        self.set_proxy_url()


        self.riot_response = None
        self.lol_response = None
        self.riot_token = 'riot_token'



        try:
            session = self.session
            #async with aiohttp.ClientSession(connector=self.tcp_connector, raise_for_status=True, cookie_jar=self._cookie_jar) as session:
                # Obtendo o token da Riot
            '''
            try:
                self.riot_response = await self.riot_auth_response(session, username, password)
                self.riot_token = self.get_riot_token(self.riot_response)
                #print(f"\n Riot token: {self.riot_token}")
                if not self.riot_token and self.riot_response:
                    #print("\n\n",self.riot_response)
                    print("\n\n Riot Token não encontrado na response",self.riot_response)

                    return self.riot_response
                
            except Exception as riot_error:
                print(f"Erro ao obter o token da Riot: {riot_error}")
                if self.riot_response:
                    return self.riot_response
                return f"Erro ao obter o token da Riot: {riot_error}"
            '''

            # Obtendo o token do LoL
            try:
                logger.info(f"\n \n Start the lol token flow")
                current_timestamp = time.time()


                #ssid_token = tokens_document.get('ssid')
                #ssid_token_expire = tokens_document.get('ssid_expire')

                if self.lol_token and self.id_token:
                    lol_token_decoded = jwt.decode(self.lol_token, algorithms=['HS256'], options={"verify_signature": False})
                    lol_token_expire_timestamp = lol_token_decoded.get("exp")
                    document = {
                        'lol_token': self.lol_token,
                        'id_token': self.id_token,
                        'lol_token_expire': lol_token_expire_timestamp,
                        } 
                    
                    result = account_tokens.update_one(
                        {'userpass': self.userpass_value},  # condição de busca
                        {'$set': document},  # operação de atualização
                        upsert=True  # inserir se não existir
                    )
                elif tokens_document:

                    expire_time_lol = tokens_document.get('lol_token_expire')

                    if expire_time_lol and expire_time_lol - 60 > current_timestamp:
                        self.lol_token = tokens_document.get('lol_token')
                        self.id_token = tokens_document.get('id_token')

                    else:
                        return "Token not found or expired, please generate a new one."
                ''''  
                elif ssid_token and ssid_token_expire and ssid_token_expire - 5000 > current_timestamp:
                    self.lol_response = await self.lol_auth_response(session, username, password, self.captcha)
                    #res_type = self.lol_response.get("type")
                    #if res_type == "response":
                    #print(f"\n lol token:  {self.lol_token}")

                elif self.ssid:
                    self.lol_response = await self.lol_auth_response(session, username, password, self.captcha, ssid=self.ssid)

                else:
                    return "SSID expired, please generate a new one"
                
                if self.lol_response:
                    print(self.lol_response)
                    #self.lol_token, self.id_token = self.get_lol_token(self.lol_response)
                    self.lol_token, self.id_token = self.extract_lol_tokens(self.lol_response)

                if not self.lol_token and self.lol_response:
                    #print("\n\n Lol Token não encontrado na response",self.lol_response)
                    logger.info(f"\n \n erro na lol response: {self.lol_response}")
                    '''
                
            except Exception as lol_error:
                print(f"Erro ao obter o token do LoL: {lol_error}")
                if self.lol_response:
                    return self.lol_response
                return f"Erro ao obter o token do LoL: {lol_error}"

            # Obtendo o token do GeoPas
            try:
                current_timestamp = time.time()
                if tokens_document:
                    expire_time_geopas = tokens_document.get('geopas_token_expire')
                expire_time_geopas = None

                if expire_time_geopas and expire_time_geopas-60 > current_timestamp:
                    self.geopas_token = tokens_document.get('geopas_token')
                    self.geopas_afinity = tokens_document.get('geopas_afinity')
                    self.chat_dom = tokens_document.get('chat_dom')
                    self.chat_uri = tokens_document.get('chat_uri')
                else:
                    self.geopas_token = await self.get_geopas_token(session, self.lol_token)
                    self.geopas_afinity = self.get_affinity(self.geopas_token)
                    self.chat_dom = self.get_chat_dom()
                    self.chat_uri = self.get_chat_uri()

                #print(f"\n Geopas token: {self.geopas_token}")
            except Exception as geopas_error:
                print(f"Erro ao obter o token do GeoPas: {geopas_error}")

            if self.lol_token:
                self.auth_result = True

                # Salva os tokens no cache com o timestamp atual
                '''
                token_cache[self.username] = (
                time.time(), 
                {
                    'riot_token': self.riot_token,
                    'lol_token': self.lol_token,
                    'id_token': self.id_token,
                    'geopas_token': self.geopas_token,
                    'geopas_afinity': self.geopas_afinity,
                    'auth_result': self.auth_result,
                    'chat_dom': self.chat_dom,
                    'chat_uri': self.chat_uri,
                    'league_edge_url': self.league_edge_url,
                    'league_aws_prod': self.aws_prod,
                    'region': self.region,
                    'locale': self.locale
                }
                )'''

                lol_token_decoded = jwt.decode(self.lol_token, algorithms=['HS256'], options={"verify_signature": False})
                lol_token_expire_timestamp = lol_token_decoded.get("exp")

                geopas_token_decoded = jwt.decode(self.geopas_token, algorithms=['HS256'], options={"verify_signature": False})
                geopas_token_expire_timestamp = geopas_token_decoded.get("exp")

                ssid_expire_timestamp = current_timestamp + 604800

                document = {
                    'riot_token': self.riot_token,
                    'lol_token': self.lol_token,
                    'id_token': self.id_token,
                    'geopas_token': self.geopas_token,
                    'geopas_afinity': self.geopas_afinity,
                    'auth_result': self.auth_result,
                    'chat_dom': self.chat_dom,
                    'chat_uri': self.chat_uri,
                    'league_edge_url': self.league_edge_url,
                    'league_aws_prod': self.aws_prod,
                    'region': self.region,
                    'locale': self.locale,
                    'lol_token_expire': lol_token_expire_timestamp,
                    'geopas_token_expire': geopas_token_expire_timestamp,
                    'ssid': self.ssid,
                    'ssid_expire': ssid_expire_timestamp,
                } 



                result = account_tokens.update_one(
                    {'userpass': self.userpass_value},  # condição de busca
                    {'$set': document},  # operação de atualização
                    upsert=True  # inserir se não existir
                )


            else:
                self.auth_result = False

        except aiohttp.ClientResponseError as client_error:
            print(f"Erro de resposta do cliente HTTP: {client_error}")
            return f"Erro de resposta do cliente HTTP: {client_error}"
        except aiohttp.ClientConnectionError as connection_error:
            print(f"Erro de conexão do cliente HTTP: {connection_error}")
            return f"Erro de conexão do cliente HTTP: {connection_error}"
        except Exception as error:
            print(f"Erro desconhecido: {error}")
            return f"Erro desconhecido: {error}"


        return None


#############################################################################

    async def get_riot_header(self, session: aiohttp.ClientSession):
        async with session.get("https://valorant-api.com/v1/version") as response:
            valo_api = await response.text()

        regex_str = r'"riotClientBuild":"(.*?)"'
        match = re.search(regex_str, valo_api)
        if match:
            riot_client_build = match.group(1)
            auth_header = {
                "Content-Type": "application/json",
                "Accept-Encoding": "deflate",
                "User-Agent": f"RiotClient/{riot_client_build} rso-auth (Windows;10;;Home, x64)",
                "Pragma": "no-cache",
                "Accept-Language": "en-GB,en,*",
                "Accept": "application/json, text/plain, */*"
            }
            return auth_header

    def get_riot_body(self):
        auth_data = {
            "acr_values": "",
            "claims": "",
            "client_id": "riot-client",
            "nonce": self.random_string(22),
            "code_challenge": "",
            "code_challenge_method": "",
            "redirect_uri": "http://localhost/redirect",
            "response_type": "token id_token",
            "scope": "openid offline_access lol ban profile email phone birthdate summoner link lol_region"
        }

        return auth_data

    async def riot_auth_response(self, session: aiohttp.ClientSession, username, password):
        headers = {
                "Accept-Encoding": "deflate, gzip, zstd",
                # "user-agent": RiotAuth.RIOT_CLIENT_USER_AGENT % "rso-auth",
                "user-agent": RiotAuth.RIOT_CLIENT_USER_AGENT,
                "Cache-Control": "no-cache",
                "Accept": "application/json",
            }
        #print("\n self cookie before auth:", session._cookie_jar.__dict__)
        self.riot_header = headers

        post_args = {
            'url': "https://auth.riotgames.com/api/v1/authorization",
            'json': self.get_riot_body(),
            'headers': headers
        }

        if self.proxy:
            post_args['proxy'] = self.proxy_url

        #print(f"\n Post args:{post_args}")

        #"https://auth.riotgames.com/api/v1/authorization",json=self.get_riot_body(), headers=headers

        async with session.post(**post_args) as resp:
            response = await resp.json()
            # Extrai os cookies da resposta
            #cookies = response.cookies
            #string_cookie = cookies.get("cfbm")
            # Atualiza o cabeçalho com o cookie
            #print("\n resp cookie riot auth:", resp.cookies)
            self._cookie_jar = session.cookie_jar
            #print("\n self cookie riot auth:", self._cookie_jar.__dict__)
            
            # O header da função get_riot_header não funciona mais para o Put da Auth.
            # Agora é necessário usar o mesmo header do Post no Put
            #self.riot_header = await self.get_riot_header(session)

            #auth_header["Set-Cookie"] = string_cookie

        post_args = {
            'url': "https://auth.riotgames.com/api/v1/authorization",
            'json': self.get_auth_body(username, password),
            'headers': headers
        }

        if self.proxy:
            post_args['proxy'] = self.proxy_url

        #auth_body = self.get_auth_body(username, password)
        async with session.put(**post_args) as response:

            #if response.status == 200:
                #response = await response.json()
                #print(await response.json())
            return await response.json()
            #else:
                #print(response)
                #return None

    def get_riot_token(self, response_json):
        # Verifica se a chave 'response' está presente na resposta
        if 'response' in response_json:
            response_data = response_json['response']

            # Verifica se a chave 'parameters' está presente na resposta
            if 'parameters' in response_data:
                parameters = response_data['parameters']

                # Verifica se a chave 'uri' está presente nos parâmetros
                if 'uri' in parameters:
                    uri = parameters['uri']

                    # Encontra o índice do início do access_token
                    start_index = uri.find('access_token=')
                    if start_index != -1:
                        # Encontra o índice do primeiro '&' após o access_token
                        end_index = uri.find('&', start_index)
                        if end_index != -1:
                            # Extrai o access_token e retorna
                            access_token = uri[start_index + len('access_token='):end_index]
                            return access_token

        # Se algo der errado ou o access_token não for encontrado, retorna None
        return None

    def get_auth_body(self, username, password):
        auth_body = {
            "language": "en_GB",
            "password": password,
            "region": None,
            "remember": False,
            "type": "auth",
            "username": username
        }
        return auth_body


#############################################################################


    def get_lol_body(self):
        auth_data = {
            "acr_values": "",
            "claims": "",
            "client_id": "lol",
            "nonce": self.random_string(22),
            "code_challenge": "",
            "code_challenge_method": "",
            "redirect_uri": "http://localhost/redirect",
            "response_type": "token id_token",
            "scope": "lol_region account openid ban lol summoner offline_access"
        }
        return auth_data
   
    async def lol_auth_response(self, session: aiohttp.ClientSession, username: str, password: str, captcha, ssid):

        try:
            '''
            # SSID AUTHENTICATION


            headers_ssid = {
            "User-Agent": (
                "Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) "
                "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.1502.79 Mobile "
                "Safari/537.36"
            ),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Accept-Encoding": "gzip, deflate",
            "Cookie": f"ssid={ssid}",  # O cookie será definido aqui
            }


            url = (
            f"https://auth.riotgames.com/authorize?redirect_uri=http://localhost/redirect&"
            f"client_id=lol&response_type=token%20id_token&nonce={self.random_string()}&"
            f"scope=openid%20link%20ban%20lol_region%20account"
            )


            get_args = {
                'url': url,
                'headers': headers_ssid,
                'proxy': self.proxy_url if self.proxy_url else ""
            }

            async with session.get(**get_args) as response:
                # Verifica o status da resposta
                if response.status == 303:
                    # Obtém o cabeçalho de redirecionamento
                    redirect_url = response.headers.get("Location", "")
                    if redirect_url:
                        return await self.process_redirect_url(redirect_url)
                    else:
                        print("Cabeçalho de redirecionamento não encontrado.")
                        return None
                else:
                    # Imprime mensagem de erro se não for redirecionado
                    print(f"Erro na autenticação: {response.status}")
                    response_text = await response.text()
                    print(response_text)
                    return None
            '''



            #new_cookie_jar = aiohttp.CookieJar()
            #new_tcp_connector = aiohttp.TCPConnector(ssl=self._auth_ssl_ctx)
            #session = aiohttp.ClientSession(connector=new_tcp_connector,raise_for_status=True,cookie_jar=self._cookie_jar)
            '''
            headers = {
                "Accept-Encoding": "deflate, gzip, zstd",
                # "user-agent": RiotAuth.RIOT_CLIENT_USER_AGENT % "rso-auth",
                "user-agent": token_urlsafe(111),
                "Cache-Control": "no-cache",
                "Accept": "application/json",
            }'''


            header = {
                "Accept-Encoding": "gzip",
                "Connection": "keep-alive",
                "User-Agent": f"RiotClient/{version_riotClientBuild} rso-auth (Windows;10;;Professional, x64)",
                #"User-Agent": f"ASSDSAD46SA5DAS DAS65D4AS DAS5D4AS564DAS",
                #"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
                "Cache-Control": "no-cache",
                "Accept": "application/json",
                "Content-Type": "application/json"
            }
            

            body = {
            "riot_identity": {
                "captcha": f"hcaptcha {captcha}",
                "language": "en_GB",
                "password": password,
                "remember": False,
                "username": username,
            },
                "type": "auth"
            }

            put_args = {
                'url': "https://authenticate.riotgames.com/api/v1/login",
                'json': body,
                'headers': header,
                'proxy': self.proxy_url if self.proxy_url else ""
            }

            print(put_args)
            print('\n')
            #print(f"Cookies stored in session:\n {session.cookie_jar.__dict__}")

            #logger.info(f"\n \n Put args to get login token: \n {put_args}")

            
            async with session.put(**put_args) as resp:
                #logger.info(f"\n \n Put resp: \n {resp}")

                response = await resp.json()
                #print(f"\n \n response login token: {response}")

                #logger.info(f"\n \n response login token: {response}")
                res_type = response.get("type")
                if res_type not in ["success"]:
                    raise Exception(f"\n Error on response type: {res_type}")
                else:
                    logger.info(f"\n \n Success on getting login token")

                
            



            cookie_jar = session.cookie_jar
            cookies = {}
            for cookie in cookie_jar:
                cookies[cookie.key] = cookie.value
            

            #logger.info(f"Session before put cookies: {cookies}")
            #response = await self.new_put_request(body, header, cookies)


            login_token = response["success"]["login_token"]


            login_token_body = {
                "authentication_type": "RiotAuth",
                "code_verifier": "",
                "login_token": login_token,
                "persist_login": False,
            }


            post_login_token_args = {
                'url': "https://auth.riotgames.com/api/v1/login-token",
                'json': login_token_body,
                'headers': header,
                'proxy': self.proxy_url if self.proxy_url else ""
            }

            async with session.post(**post_login_token_args) as resp:
                print("")

            setup_body = {
                "client_id": "lol",
                "nonce": token_urlsafe(16),
                "redirect_uri": "http://localhost/redirect",
                "response_type": "token id_token",
                "scope": "account openid",
            }

            setup_args = {
                'url': "https://auth.riotgames.com/api/v1/authorization",
                'json': setup_body,
                'headers': header,
                'proxy': self.proxy_url if self.proxy_url else ""
            }

            async with session.post(**setup_args) as resp:
                cookies = resp.cookies
                response = await resp.json()
                res_type = response.get("type")
                if res_type != "response":
                    raise Exception(f"\n Error on response type: {res_type}")
                return response


        except aiohttp.ClientResponseError as e:
            print(f"Erro na resposta do cliente: {e}")
            logger.info(f"\n Erro na resposta do cliente: {e}")
            logger.info(f"Status: {e.status}")
            logger.info(f"Mensagem: {e.message}")
            logger.info(f"Headers: {e.headers}")

                    # Tentar ler o corpo da resposta de erro
            try:
                error_body = await e.response.json()
                print(f"Corpo da resposta de erro: {error_body}")
            except Exception as error_body_exception:
                print(f"Erro ao ler o corpo da resposta de erro: {error_body_exception}")



        except Exception as e:
            print(f"exception: {e}")
            self.auth_result = False
        finally:
            print("")
            #await session.close()
            #await new_tcp_connector.close()

        return response  
   
    def get_lol_token(self, response_json):

        uri = response_json["response"]["parameters"]["uri"]
        access_token = uri.split("access_token=")[1].split("&scope")[0]
        id_token = uri.split("id_token=")[1].split("&")[0]

        return access_token, id_token

        
    def extract_lol_tokens(self, response_json):
        access_token = response_json.get("access_token")
        id_token = response_json.get("id_token")
        return access_token, id_token 


 ############################################################################

    async def get_geopas_token(self, session: aiohttp.ClientSession, loltoken: str):
        if loltoken is None:
            return None
        
        auth_header = {
            "Authorization": "Bearer " + loltoken,
        }

        post_args = {
            'url': "https://riot-geo.pas.si.riotgames.com/pas/v1/service/chat",
            'headers': auth_header
        }

        if self.proxy:
            post_args['proxy'] = self.proxy_url

        async with session.get(**post_args) as resp:
                response_text = await resp.text()

        return response_text

    def get_affinity(self, geopas_token):
        if geopas_token is None:
            return None
        try:
            # Decodifica o token JWT
            decoded_geopas_token = jwt.decode(geopas_token, algorithms=['HS256'], options={"verify_signature": False})
            # Obtém a reivindicação "affinity" do payload
            affinity = decoded_geopas_token.get("affinity")
            return affinity
        except jwt.exceptions.JWSDecodeError:
            # Trata exceções de decodificação
            return None

    def get_chat_uri(self):
        affinity_to_uri = {
            "as2": "as2.chat.si.riotgames.com",
            "asia": "jp1.chat.si.riotgames.com",
            "br1": "br.chat.si.riotgames.com",
            "eu": "euw1.chat.si.riotgames.com",
            "eu3": "eu3.chat.si.riotgames.com",
            "eun1": "eun1.chat.si.riotgames.com",
            "euw1": "euw1.chat.si.riotgames.com",
            "jp1": "jp1.chat.si.riotgames.com",
            "la1": "la1.chat.si.riotgames.com",
            "la2": "la2.chat.si.riotgames.com",
            "na1": "na2.chat.si.riotgames.com",
            "oc1": "kr1.chat.si.riotgames.com",
            "ru1": "euw1.chat.si.riotgames.com",
            "sea1": "sa1.chat.si.riotgames.com",
            "sea2": "sa2.chat.si.riotgames.com",
            "sea3": "sa3.chat.si.riotgames.com",
            "sea4": "sa4.chat.si.riotgames.com",
            "tr1": "euw1.chat.si.riotgames.com",
            "us": "la1.chat.si.riotgames.com",
            "us-br1": "br.chat.si.riotgames.com",
            "us-la2": "la2.chat.si.riotgames.com",
            "us2": "us2.chat.si.riotgames.com",
            "pbe1": "pbe1.chat.si.riotgames.com",
        }

        #VN2 affinity=asia  chaturi=sa1.chat.si.riotgames.com
        #TH2 affinity=sea3  chaturi=sa1.chat.si.riotgames.com
        if self.region in ['VH2','TH2','SG2', 'PH2']:
            return 'sa1.chat.si.riotgames.com'
        else:
            return affinity_to_uri.get(self.geopas_afinity, "")

    def get_chat_dom(self):
        affinity_to_dom = {
            "as2": "as2",
            "asia": "jp1",
            "br1": "br1",
            "eu": "eu1",
            "eu3": "eu3",
            "eun1": "eu2",
            "euw1": "eu1",
            "jp1": "jp1",
            "la1": "la1",
            "la2": "la2",
            "na1": "na1",
            "oc1": "kr1",
            "ru1": "eu1",
            "sea1": "sa1",
            "sea2": "sa2",
            "sea3": "sa3",
            "sea4": "sa4",
            "tr1": "eu1",
            "us": "la1",
            "us-br1": "br1",
            "us-la2": "la2",
            "us2": "us2",
            "pbe1": "pb1",
            "ph2": "ph2"
        }
        return affinity_to_dom.get(self.geopas_afinity, "")

    async def get_catalog(self):
        if not hasattr(self, 'lol_version') or not self.lol_version:
            await self.set_lol_version()

        
        headers = {
            "Host": f"{self.league_edge_url}",
            "user-agent": f"LeagueOfLegendsClient/{self.lol_version} (rcp-be-lol-store)",
            "Accept-Encoding": "deflate, gzip, zstd",
            "Accept": "application/json",
            "Connection": "keep-alive",
            "Authorization": f"Bearer {self.lol_token}"
        }

        if self.region == 'BR1':
            catalog_locale='pt_BR'
        else:
            catalog_locale='en_US'
        
        post_args = {
            'url': f"https://{self.league_edge_url}/storefront/v1/catalog?region={self.region}&language={catalog_locale}",
            'headers': headers
        }

        #?region=BR1&language=pt_BR
        #?region=NA1&language=en_US

        #if self.proxy:
            #post_args['proxy'] = self.proxy_url

        async with self.session.get(**post_args) as response:
            catalog = await response.json()


        self.catalog_map = {}
        self.catalog_title = {}

        self.original_catalog = catalog

        for item in catalog:
            offer_id = "Null"
            name = "Null"
            price_rp = "Null"
            price_ip = "Null"
            inventory_type = "Null"
            item_id = "Null"
            
            if item.get("offerId"):
                offer_id = item["offerId"]

            if item.get("itemId"):
                item_id = item["itemId"]
            

            locs = item.get("localizations", {})
            if self.locale and self.locale in locs and "name" in locs[self.locale]:
                name = locs[self.locale]["name"]
            elif catalog_locale in locs and "name" in locs[catalog_locale]:
                name = locs[catalog_locale]["name"]
            elif locs:
                first_loc = next(iter(locs.values()))
                if isinstance(first_loc, dict) and "name" in first_loc:
                    name = first_loc["name"]
                        
            if item.get("prices") and isinstance(item["prices"], list):  # Verifica se a lista de preços é válida
                for price in item["prices"]:
                    if price.get("currency") == "RP":
                        price_rp = price.get("cost", "Null")
                    if price.get("currency") == "IP":
                        price_ip = price.get("cost", "Null")
                        #break  # Encerra o loop após encontrar o preço em RP


            # Verificar promoções e pegar preço com desconto se aplicável
            sale = item.get("sale")
            if sale:
                for sale_price in sale.get("prices", []):
                    if sale_price.get("currency") == "RP":
                        price_rp = sale_price.get("cost", "Null")
                    if sale_price.get("currency") == "IP":
                        price_ip = sale_price.get("cost", "Null")
                        # break
                        
            if item.get("inventoryType"):
                inventory_type = item["inventoryType"]


            item_data = {
                "offer_id": offer_id,
                "item_id": item_id,
                "price_rp": price_rp,
                "price_ip": price_ip,
                "inventory_type": inventory_type,
            }

            # Aplicando as regras de categorização
            display_category = self.get_display_category(item)

            if display_category not in self.catalog_map:
                self.catalog_map[display_category] = {}

            self.catalog_map[display_category][name] = item_data



            

            #print(f"Nome: {name}", file=my_file)
            #print(f"Tipo de inventário: {inventory_type}", file=my_file)
            #print(f"Preço em RP: {price_rp}", file=my_file)
            #print(f"Offer ID: {offer_id}", file=my_file)
            #print("\n", file=my_file)
        
        file_path = 'catalog.json'
        with open(file_path, 'w', encoding='utf-8', errors='ignore') as f:
            json.dump(catalog, f, indent=4)
        #catalog_json = json.dumps(catalog, indent=4, ensure_ascii=False)
            
        #print(catalog_json, file=my_file)
        #my_file.close()    

        return


    async def get_saldo_rp(self):        
        headers = {
            "Host": f"{self.league_edge_url}",
            "User-Agent": f"Mozilla/5.0 (Windows NT 6.2; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) LeagueOfLegendsClient/{self.lol_version} (CEF 91) Safari/537.36",
            "Accept-Encoding": "gzip, deflate, br",
            "Accept": "application/json",
            "Connection": "keep-alive",
            "sec-ch-ua": '"Chromium";v="91"',
            "sec-ch-ua-mobile": "?0",
            "Authorization": f"Bearer {self.lol_token}",
            "Content-Type": "application/json",
            "Origin": "https://127.0.0.1:88888",
            "Sec-Fetch-Site": "cross-site",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Dest": "empty",
            "Accept-Language": "en-US,en;q=0.9"
        }

        get_args = {
            'url': f"https://{self.league_edge_url}/storefront/v3/view/misc?language={self.locale}",
            'headers': headers
        }

        async with self.session.get(**get_args) as response:
            misc = await response.json()
            rp = misc["player"]["rp"]
            ip = misc["player"]["ip"]
            self.summnerLevel = misc["player"]["summonerLevel"]
            self.accountId = misc["player"]["accountId"]
            return rp, ip
            #return int(0)


    async def send_gift(self, receiver_puuid, offer_id):

        headers = {
            "Accept": "application/json",
            "Authorization": f"Bearer {self.lol_token}",
            "Content-Type": "application/json",
        }

        gift_body = {
            "data": {
                "id": "",
                "location": "lolriot.aws-usw2-prod.br1",
                "purchaser": {
                    "id": self.my_puuid,
                    "typeId": "fdcaeaaf-e7c1-4e68-995c-9470e1d92aa3"
                },
                "waitForRMS": True,
                "source": "lol.store.purchase",
                "subOrders": [
                    {
                        "id": "",
                        "recipientId": receiver_puuid,
                        "offer": {
                            "id": offer_id,
                            "typeId": "fb035c2d-7203-4fa8-9722-f947bc5a7a1d",
                            "label": "proxied",
                            "productId": "d1c2664a-5938-4c41-8d1b-61fd51052c22",
                            "active": True
                        },
                        "offerContext": {
                            "paymentOption": "RP",
                            "quantity": 1
                        },
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
            'url': f"https://{self.league_edge_url}/services/cap/orders/orders-api/v2/products/d1c2664a-5938-4c41-8d1b-61fd51052c22/orders",
            'headers': headers,
            'json': gift_body

        }

        async with self.session.post(**post_args) as response:
            gift_response = await response.json()
            gift_response_json = json.dumps(gift_response, ensure_ascii=False)
            print(gift_response_json)

        return
    

    async def friendlist_gift_info(self):
        headers = {
            "Host": f"{self.league_edge_url}",
            "User-Agent": f"Mozilla/5.0 (Windows NT 6.2; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) LeagueOfLegendsClient/{self.lol_version} (CEF 91) Safari/537.36",
            "Accept-Encoding": "gzip, deflate, br",
            "Accept": "application/json",
            "Connection": "keep-alive",
            "sec-ch-ua": '"Chromium";v="91"',
            "sec-ch-ua-mobile": "?0",
            "Authorization": f"Bearer {self.lol_token}",
            "Content-Type": "application/json",
            "Origin": "https://127.0.0.1:88888",
            "Sec-Fetch-Site": "cross-site",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Dest": "empty",
            "Accept-Language": "en-US,en;q=0.9"
        }

        get_args = {
            'url': f"https://{self.league_edge_url}/storefront/v3/gift/friends?language={self.locale}",
            'headers': headers
        }

        async with self.session.get(**get_args) as response:
            response_json = await response.json()
            return response_json

        return int(0)


 ############################################################################  

    def get_entitlements_token(self, riottoken):

        auth_data = {
            "urn": "urn:entitlement:%"
        }

        auth_header = {
		"Authorization": "Bearer " + riottoken,
		"Accept": "application/json",
		"Content-Type": "application/json",
		"User-Agent": "RiotClient/22.9.29.4789131 entitlements (;;;)",
		}

        response = requests.post("https://entitlements.auth.riotgames.com/api/token/v1", json=auth_data, headers=auth_header, proxies=self.get_proxy_list())

             
        response = response.json().get('entitlements_token')
        return response
 
    def get_proxy_list(self):

        proxy_host = 'gw.dataimpulse.com'
        proxy_port = 823
        proxy_login = '52e0dc00c20e0700cda7'
        proxy_password = '8840e82cec2ae040'
        proxy = f'http://{proxy_login}:{proxy_password}@{proxy_host}:{proxy_port}'

        proxies = {
            'http': proxy,
            'https': proxy
        }
        return proxies

    @staticmethod
    def random_string(length):
        letters = string.ascii_lowercase
        return ''.join(random.choice(letters) for i in range(length))

    @staticmethod
    def create_riot_auth_ssl_ctx() -> ssl.SSLContext:
        ssl_ctx = ssl.create_default_context(cafile=certifi.where())

        # https://github.com/python/cpython/issues/88068
        addr = id(ssl_ctx) + sys.getsizeof(object())
        ssl_ctx_addr = ctypes.cast(addr, ctypes.POINTER(ctypes.c_void_p)).contents

        libssl: Optional[ctypes.CDLL] = None
        if sys.platform.startswith("win32"):
            for dll_name in (
                "libssl-3.dll",
                "libssl-3-x64.dll",
                "libssl-1_1.dll",
                "libssl-1_1-x64.dll",
            ):
                with contextlib.suppress(FileNotFoundError, OSError):
                    libssl = ctypes.CDLL(dll_name)
                    break
        elif sys.platform.startswith(("linux", "darwin")):
            libssl = ctypes.CDLL(ssl._ssl.__file__)  # type: ignore
            print("\n Linux OS detected on ssl context creation: \n")
            print(ssl._ssl.__file__)
            print('\n')
            #logger.info("\n Linux OS detected on ssl context creation: \n")
            #logger.info(ssl._ssl.__file__)
            #logger.info(f"Versão do OpenSSL:  {ssl.OPENSSL_VERSION}")


            #print(libssl)

        #print(libssl)
        #print("Versão do OpenSSL:", ssl.OPENSSL_VERSION)


        if libssl is None:
            raise NotImplementedError(
                "Failed to load libssl. Your platform or distribution might be unsupported, please open an issue."
            )

        with warnings.catch_warnings():
            warnings.filterwarnings("ignore", category=DeprecationWarning)
            ssl_ctx.minimum_version = ssl.TLSVersion.TLSv1  # deprecated since 3.10
        ssl_ctx.set_alpn_protocols(["http/1.1"])
        ssl_ctx.options |= 1 << 19  # SSL_OP_NO_ENCRYPT_THEN_MAC
        ssl_ctx.options |= 1 << 14  # SSL_OP_NO_TICKET

        libssl.SSL_CTX_set_ciphersuites(ssl_ctx_addr, RiotAuth.CIPHERS13.encode())
        libssl.SSL_CTX_set_cipher_list(ssl_ctx_addr, RiotAuth.CIPHERS.encode())
        # setting SSL_CTRL_SET_SIGALGS_LIST
        libssl.SSL_CTX_ctrl(ssl_ctx_addr, 98, 0, RiotAuth.SIGALGS.encode())

        # print([cipher["name"] for cipher in ssl_ctx.get_ciphers()])

        # setting SSL_CTRL_SET_GROUPS_LIST
        libssl.SSL_CTX_ctrl(ssl_ctx_addr, 92, 0, ":".join(
            (
                "x25519",
                "secp256r1",
                "secp384r1",
            )
        ).encode())
        
        return ssl_ctx

    def set_proxy_url(self):

        if os.path.exists(PROXY_FILE):
            with open(PROXY_FILE, 'r') as f:
                data = json.load(f)
                
                self.proxy_url = data.get('proxy_url', False)
                #self.proxy_url = ''
                base_url, port = self.proxy_url.rsplit(':', 1)
                new_port = random.randint(10000, 19998)
                self.proxy_url = f"{base_url}:{new_port}"

                #self.proxy_url = 'http://fad54c41e9744d9bb2f6:42e22bbec25af6c5@gw.dataimpulse.com:10000'
                #print(self.proxy_url)
                #print(f'\n file proxy url {self.proxy_url}')

        if not self.proxy_url:
            print()
            #print(f'\n not self proxy url {self.proxy_url}')
            #self.proxy_url = f'http://fad54c41e9744d9bb2f6:42e22bbec25af6c5@gw.dataimpulse.com:823'
            #self.proxy_url = f'http://contasmurf:123456@geo.iproyal.com:12321'
            #self.proxy_url = f'http://ydDfMDeiT1gpgfr-res-any:nix0laDgLENbkbG@ispx.proxylogic.org:5959'

    def get_display_category(self, item):
        category = item.get("inventoryType", "")
        sub_category = item.get("subInventoryType", "")

        if category == "CHAMPION_SKIN":
            return "Chroma" if sub_category == "RECOLOR" else "Skin"
        elif category == "CHAMPION":
            return "Champion"
        elif category in ["BUNDLES", "EVENT_PASS"]:
            name_lower = item.get("localizations", {}).get("en_US", {}).get("name", "").lower()
            if "pass" in name_lower:
                return "Pass"
            return "Hextech" if sub_category == "HEXTECH_BUNDLE" else "Bundle"
        elif category == "EMOTE":
            return "Emote"
        elif category == "SUMMONER_ICON":
            return "Icon"
        elif category == "WARD_SKIN":
            return "Ward"
        elif category == "STATSTONE":
            return "Eternals"
        elif category == "COMPANION":
            return "LittleLegends"
        elif category in ["TFT_DAMAGE_SKIN", "TFT_MAP_SKIN"]:
            return "TFTArena"
        elif category == "BOOST":
            return "Boost"
        elif category == "MYSTERY":
            return "Mystery"
        elif category == "HEXTECH_CRAFTING":
            return "Hextech"
        else:
            return "Others"

    async def set_lol_version(self):

        async with self.session.get("https://sieve.services.riotcdn.net/api/v1/products/lol/version-sets/EUW1?q[platform]=windows") as response:
            data_json = await response.json()
            artifact_version_id = data_json['releases'][0]['release']['labels']['riot:artifact_version_id']['values'][0]
            version_number = artifact_version_id.split('+')[0]
            version_with_dot = version_number[:-4] + "." + version_number[-4:]
            self.lol_version = version_with_dot

    

    async def close_resources(self):
        """ Método para fechar explicitamente os recursos da instância. """
        if self.session:
            await self.session.close()
            self.session = None
        if self.tcp_connector:
            await self.tcp_connector.close()
            self.tcp_connector = None

    async def get_user_info(self):
        '''
        headers = {
            'Host': 'auth.riotgames.com',
            'Accept-Encoding': 'deflate, gzip, zstd',
            'Accept': 'application/json',
            'Connection': 'keep-alive',
            'Authorization': 'Bearer ' + self.lol_token,
        }

        get_args = {
            'url': "https://auth.riotgames.com/userinfo",
            'headers': headers
        }

        async with self.session.get(**get_args) as response:
            # Certifique-se de que a resposta seja tratada como JSON
            print(f"\n {response}")
            resp = await response.json()


            game_info = resp.get('acct', {})
            # Extrai 'game_name' e 'tag_line' do dicionário
            game_name = game_info.get('game_name', 'Not Available')
            tag_line = game_info.get('tag_line', 'Not Available')

            self.riotId = f"{game_name}#{tag_line}"


            # Acessa o dicionário 'lol_account' para summoner_level
            summoner_info = resp.get('lol_account', {})
            self.summnerLevel = summoner_info.get('summoner_level', 'Nível do invocador não disponível')


            #print(f"\n {self.riotId}")

            # Extraindo o valor de 'pid' dentro de 'lol'
            pid = resp.get('lol', {}).get('cpid')
            
            #print(f"\n {resp}")

            # Extraindo 'player_locale' do 'ploc' em 'lol' ou de outras fontes como fallback
            player_locale = resp.get('lol', {}).get('ploc')

            # Verifica se 'player_locale' contém '-' e não é None
            if player_locale and "-" in player_locale:
                modified_player_plocale = player_locale.replace('-', '_')
            else:
                # Se 'player_locale' for None, tenta buscar o primeiro elemento de 'locales' em 'region'
                locales = resp.get('region', {}).get('locales')
                if locales and isinstance(locales, list) and locales[0]:
                    modified_player_plocale = locales[0]
                else:
                    # Se não há 'locales' disponíveis ou são inválidos, define como 'en_GB'
                    modified_player_plocale = "en_GB"

            # Verificando se 'region' e 'locales' estão vazios
            region = resp.get('region', {})
            locales = None;is_present = None
            if region: locales = region.get('locales', [])

            if locales:
                is_present = modified_player_plocale in locales
                if not is_present:
                    locale = locales[0]
                else:
                    locale = modified_player_plocale
            else:
                locale = modified_player_plocale

            # Printando os valores e o resultado da verificação'''
        
        if self.lol_token:
            decoded_lol_token = jwt.decode(self.lol_token, algorithms=['HS256'], options={"verify_signature": False})
            self.my_puuid = decoded_lol_token.get("sub")

        if self.id_token:
            decoded_id_token = jwt.decode(self.id_token, algorithms=['HS256'], options={"verify_signature": False})
            lol = decoded_id_token.get("lol", {})

            # Acessa o primeiro dicionário da lista
            first_lol_entry = lol[0]
            cpid = first_lol_entry.get('cpid')
            locale = decoded_id_token.get("player_locale")

        
        self.region = cpid
        self.locale = self.get_full_locale(locale)

        #print(f"\n region: {cpid}   locale: {self.locale} ({locale})")

        self.league_edge_url, self.aws_prod = self.get_league_urls()

        headers = {
            'Host': 'api.account.riotgames.com',
            'Accept-Encoding': 'deflate, gzip, zstd',
            'User-Agent': RiotAuth.RIOT_CLIENT_USER_AGENT,
            'Accept': 'application/json',
            'Connection': 'keep-alive',
            'Authorization': 'Bearer ' + self.lol_token,
        }

        body = {
            "puuids": [f"{self.my_puuid}"]
        }

        post_args = {
            'url': "https://api.account.riotgames.com/namesets/v1/namesets",
            'headers': headers,
            'json': body,
            
        }

        

        async with self.session.post(**post_args) as response:
            if response.status == 200:
                data = await response.json()  # Converte a resposta para JSON
                # Verifica se a lista não está vazia e se o objeto contém a chave 'alias'
                if data and 'alias' in data[0]:
                    game_name = data[0]['alias']['game_name']
                    tag_line = data[0]['alias']['tag_line']
                    #print("Game Name:", game_name)
                    #print("Tag Line:", tag_line)
                    self.riotId = f"{game_name}#{tag_line}"
                else:
                    print("\n Dados não encontrados ou formato inesperado.")
            else:
                print("\n Falha ao obter a resposta. Status:", response.status)


            #print(resp)
            #print("\n\n")
            #print(f"PID: {pid}")
            #print(f"Modified Player Locale: {modified_player_plocale}")
            #print(f"Is Modified Player Locale present in locales? {'Yes' if is_present else 'No'}")
            #print(f"Is 'region' empty? {'Yes' if not bool(region) else 'No'}")
            #print(f"Is 'locales' empty? {'Yes' if not bool(locales) else 'No'}")
            #print(f"Locale: {locale}")


            document = {
                    'league_edge_url': self.league_edge_url,
                    'league_aws_prod': self.aws_prod,
                    'region': self.region,
                    'locale': self.locale,
                } 

            result = account_tokens.update_one(
                    {'userpass': self.userpass_value},  # condição de busca
                    {'$set': document},  # operação de atualização
                    upsert=True  # inserir se não existir
                )

    def get_league_urls(self):
        url_dict = {
            "BR1": ("br-red.lol.sgp.pvp.net", "lolriot.aws-usw2-prod.br1"),
            "EUN1": ("eune-red.lol.sgp.pvp.net", "lolriot.aws-euc1-prod.eun1"),
            "EUW1": ("euw-red.lol.sgp.pvp.net", "lolriot.aws-euc1-prod.euw1"),
            "JP1": ("jp-red.lol.sgp.pvp.net", "lolriot.aws-apne1-prod.jp1"),
            "KR": ("kr-red.lol.sgp.pvp.net", None),  # Adicionar a URL adicional aqui se disponível
            "LA1": ("lan-red.lol.sgp.pvp.net", "lolriot.aws-usw2-prod.la1"),
            "LA2": ("las-red.lol.sgp.pvp.net", "lolriot.aws-usw2-prod.la2"),
            "NA1": ("na-red.lol.sgp.pvp.net", "lolriot.aws-usw2-prod.na1"),
            "OC1": ("oce-red.lol.sgp.pvp.net", "lolriot.aws-apse1-prod.oc1"),
            "PBE1": ("pbe-red.lol.sgp.pvp.net", "lolriot.aws-usw2-prod.pbe1"),  # Adicionar a URL adicional aqui se disponível
            "RU": ("ru-red.lol.sgp.pvp.net", "lolriot.aws-euc1-prod.ru"),
            "TR1": ("tr-red.lol.sgp.pvp.net", "lolriot.aws-euc1-prod.tr1"),
            "ME1": ("me1-red.lol.sgp.pvp.net", "lolriot.aws-euc1-prod.me1"),
            "TH2": ("th2-red.lol.sgp.pvp.net", "lolriot.aws-apse1-prod.th2"),
            "VN2": ("vn2-red.lol.sgp.pvp.net", "lolriot.aws-apse1-prod.vn2"),
            "SG2": ("sg2-red.lol.sgp.pvp.net", "lolriot.aws-apse1-prod.sg2"),
            "PH2": ("ph2-red.lol.sgp.pvp.net", "lolriot.aws-apse1-prod.ph2")  # Adicionar a URL principal aqui se disponível
        }
        return url_dict.get(self.region, (None, None))
    
    def get_full_locale(self,locale):

        default_locale = 'en_US'

        # Verifica se locale é None ou uma string vazia
        if not locale or locale=='null':
            return default_locale

        # Dicionário mapeando códigos de idioma para localidades completas
        locale_mapping = {
            'en': 'en_US',
            'de': 'de_DE',
            'ar': 'ar_AE',
            'es': 'es_ES',  # Supondo 'es' como Espanha por padrão
            'fr': 'fr_FR',
            'id': 'id_ID',
            'it': 'it_IT',
            'ja': 'ja_JP',
            'ko': 'ko_KR',
            'pl': 'pl_PL',
            'pt': 'pt_BR',
            'ru': 'ru_RU',
            'th': 'th_TH',
            'tr': 'tr_TR',
            'vi': 'vi_VN',
            'zh': 'zh_TW'
        }

        # Retorna a localidade completa se existir no dicionário, caso contrário retorna None
        return locale_mapping.get(locale, default_locale)
    








    async def new_put_request(self, body, header, cookies):
        #logger.info(f"Cookies recebidos como parametros: {cookies}")


        proxy_config = {"https://": self.proxy_url} if self.proxy_url else ''
        async with httpx.AsyncClient(cookies=cookies, verify=self._auth_ssl_ctx, proxies=proxy_config, http1=True) as client:

            # Imprime as configurações do cliente
            #logger.info("HTTP Client Configurations:")
            #logger.info(f"Cookies set: {client._cookies}")
            #logger.debug(f"SSL Config: {client.}")
            #logger.info(f"Headers set before request: {client._headers}")  # Headers são passados na requisição, não no cliente

            response = await client.put(
                "https://authenticate.riotgames.com/api/v1/login",
                headers=header,
                json=body,
            )

        # Process response
        response_data = response.json()
        #logger.info(f"Response Code: {response.status_code}")
        #logger.info(f"Response Headers: {response.headers}")
        #logger.info(f"Response Body: {response_data}")

        #logger.info(f"\n \n response login token: {response_data}")

        res_type = response_data.get("type")
        if res_type not in ["success"]:
            raise Exception(f"Error on response type: {res_type}")

        return response_data
    

    async def get_puuid_player(self, name, tag):


        name_url_encoded = urllib.parse.quote(name)
        tag_url_encoded = urllib.parse.quote(tag)



        header = {
                "Accept-Encoding": "gzip",
                "Host": "api.account.riotgames.com",
                "Connection": "keep-alive",
                #"User-Agent": f"RiotClient/{version_riotClientBuild} rso-auth (Windows;10;;Professional, x64)",
                "User-Agent": f"ASSDSAD46SA5DAS DAS65D4AS DAS5D4AS564DAS",
                "Authorization": f"Bearer {self.lol_token}",
                "Accept": "application/json",
            }



        proxy_config = {"https://": self.proxy_url} if self.proxy_url else ''

        async with httpx.AsyncClient(verify=self._auth_ssl_ctx, proxies=proxy_config, http1=True) as client:

            print(f' \n url encoded: https://api.account.riotgames.com/aliases/v1/aliases?gameName={name_url_encoded}&tagLine={tag_url_encoded} ')

            response = await client.get(
                f"https://api.account.riotgames.com/aliases/v1/aliases?gameName={name_url_encoded}&tagLine={tag_url_encoded}",
                headers=header
            )

            response_data = response.json()

            if response_data:
                first_item = response_data[0]
                puuid = first_item['puuid']
                return puuid
            
    def random_string(self, length=22):
        return ''.join(random.sample(string.ascii_letters + string.digits + '_', k=length))

    def process_redirect_url(self, redirect_url: str):
            url = urlparse(redirect_url)
            frag = url.fragment
            qs = parse_qs(frag)
            return {
                "access_token": qs.get("access_token", [None])[0],
                "scope": qs.get("scope", [None])[0],
                "iss": qs.get("iss", [None])[0],
                "id_token": qs.get("id_token", [None])[0],
                "token_type": qs.get("token_type", [None])[0],
                "session_state": qs.get("session_state", [None])[0],
                "expires_in": qs.get("expires_in", [None])[0],
                }



