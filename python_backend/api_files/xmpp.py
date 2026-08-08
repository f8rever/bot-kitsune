import asyncio
import ssl
from lxml import etree
import random


class RiotChatClient:
    def __init__(self, chaturi, chatdom, port, timeout):
        self.chaturi = chaturi
        self.chatdom = chatdom
        self.port = port
        self.timeout = timeout
        self.friend_list_xml = self.friend_list_message()
        self.receiver_puuid = None
        self.friend_result = None
        self.task = 'friend_request'

        # Criação de um contexto SSL para desativar a verificação de certificado
        self.context = ssl.create_default_context()
        self.context.check_hostname = False
        self.context.verify_mode = ssl.CERT_NONE

        # Inicializando loop de eventos do asyncio
        self.loop = asyncio.get_running_loop()  # Captura o loop de eventos atual
        self.chat_connected = False
        self.reader, self.writer = None, None
        self.account_status = None
    





###### Initialize

    async def Initialize_chat(self, riot_token, chat_dom, geopas_token):
        """ Assegura que a conexão está ativa antes de qualquer operação. """
        if not self.chat_connected or self.reader is None or self.writer is None:
            await self.connect()
            if not await self.connect_xmpp(self.get_connection_message(riot_token, chat_dom, geopas_token)):
                print("Falha ao conectar")
                self.chat_connected = False
                if self.account_status == 'account-disabled':
                    return
                raise Exception("Connection failed")
            self.chat_connected = True
    

    async def Initialize_friend_request(self, name, tag, riot_token, chat_dom, geopas_token, task, id=None, id_list=None, message=None):
        
        await self.Initialize_chat(riot_token, chat_dom, geopas_token)
        self.task = task
        asyncio.set_event_loop(self.loop)

        print(f"\n Chat Task: {self.task}")

        if self.account_status == 'account-disabled':

            return 'Account banned or disabled'

        if self.task=='friend_request':
            friend_list = await self.get_friend_list()
            if isinstance(friend_list, str):

                return friend_list
            
            friend_info = self.check_friend_status(friend_list, name, tag)

            self.receiver_puuid = friend_info["puuid"]
            friend_status = friend_info["status"]

            print("\n\nFriend status:", friend_status)
            if friend_status == "Not found" or friend_status=="Friend request":
                friend_request_response = await self.send_friend_request(name, tag)
                print("Friend request response:", friend_request_response)
                friend_request_result = self.process_friend_request_response(friend_request_response)
                print("\n\nFriend request result:", friend_request_result)
                return friend_request_result
            
            if friend_status == "Friend":
                return "The player is already added to the friends list"

            if friend_status == "Pending":
                return "Friend request sent"
            
            else:
                return "Unknown result"

        
        elif self.task=='send_all':
            send_response = await self.send_all_friend_request(id_list)
            if send_response:
                return "All requests sended"
        
        elif self.task=='friend_list':
            friend_list = await self.get_friend_list()
            if friend_list:
                return friend_list
        
        elif self.task=='accept_friend':
            accept_friend = await self.accept_friend_request(id)
            if accept_friend:
                return "Friend accepted"
        
        elif self.task=='accept_all':
            accept_all = await self.accept_all_friend_request()
            if accept_all:
                return "All requests accepted"
        
        elif self.task=='remove_one':
            remove_response = await self.remove_friend_request(id)
            if remove_response:
                return "Friend removed"
            
        elif self.task =='mass_message':
            mass_message_result = await self.mass_message(message)
            if mass_message_result:
                return "Sucessful mass message"
        
        elif self.task=='remove_all':
            remove_response = await self.remove_all_friends()
            if remove_response:
                return "All friends removed"
            

        

###### Xmpp Connection/Negotiation

    def get_connection_message(self, riot_token, chat_dom, geopas_token):
        connection_xml = [f'''<?xml version="1.0"?>
    <stream:stream to="{chat_dom}.pvp.net" xml:lang="en" version="1.0" xmlns="jabber:client" xmlns:stream="http://etherx.jabber.org/streams">''',

    f'''<auth mechanism="X-Riot-RSO-PAS" xmlns="urn:ietf:params:xml:ns:xmpp-sasl">
        <rso_token>{riot_token}</rso_token>
        <pas_token>{geopas_token}</pas_token>
    </auth>''',

    f'''<?xml version="1.0"?>
    <stream:stream to="{chat_dom}.pvp.net" xml:lang="en" version="1.0" xmlns="jabber:client" xmlns:stream="http://etherx.jabber.org/streams">''',

    f'''<iq id="_xmpp_bind1" type="set">
        <bind xmlns="urn:ietf:params:xml:ns:xmpp-bind">
            <puuid-mode enabled="true"/>
            <resource>RC-397159864</resource>
        </bind>
    </iq>''',

    f'''<iq id="_xmpp_session1" type="set">
        <session xmlns="urn:ietf:params:xml:ns:xmpp-session"/>
    </iq>''']
        
    #    '''<iq type="get" id="2">
    #    <query xmlns="jabber:iq:riotgames:roster" last_state="true" />
    #</iq>'''
        return connection_xml

    async def connect_xmpp(self, connection_message):
        print("\n\n Starting Xmpp connection")
        response = None
        for idx, piece in enumerate(connection_message):
            self.writer.write(piece.encode())
            await self.writer.drain()
            #print("\n\nMensagem enviada:", piece)

            while True:
                try:
                    response_cache = await asyncio.wait_for(self.receive_response(), timeout=self.timeout)
                    if response_cache:
                        response = response_cache
                        #print("\n\nResposta do servidor recebida com sucesso:", response)
                        continue
                        # Se uma resposta válida for recebida, salve ela e printe
                    break    
                except asyncio.TimeoutError:
                    #print("\n\nNão foi recebida uma resposta do servidor ou a resposta estava vazia.")
                    break
            if response and 'account-disabled' in response:
                self.account_status = 'account-disabled'
                break
        if response:
            if self.account_status == 'account-disabled':
                print("\n Account banned or disabled")
                return False
            print("\n Successful Xmpp connection")
            return True
        # Se nenhum resposta válida for recebida, retorna False
        return False         

###### Send Friend Request


    def check_friend_status(self, friendlist_info, name,tag):
        # Remove espaços e converte para minúsculas

        target_friend = f"{name}#{tag}".replace(" ", "").lower()

        # Itera sobre as chaves do dicionário
        for key in friendlist_info:
            # Remove espaços e converte para minúsculas
            formatted_key = key.replace(" ", "").lower()
            if formatted_key == target_friend:
                return friendlist_info[key]

        return {
                "puuid": None,
                "status": "Not found"
                }

    def get_friend_request_xml(self, name,tag):

        #Converter non ascii characteres

        name = ''.join(f'&#{ord(char)};' if ord(char) > 127 else char for char in name)
        tag = ''.join(f'&#{ord(char)};' if ord(char) > 127 else char for char in tag)


        friend_request = f'''<iq id='roster_add_11' type='set'><query xmlns='jabber:iq:riotgames:roster'><item subscription='pending_out'><id name='{name}' tagline='{tag}'/></item></query></iq>'''
        return friend_request

    async def send_friend_request(self, name, tag):
        print("\n\n Starting send friend request")
        response = None
        piece = self.get_friend_request_xml(name, tag)
        self.writer.write(piece.encode())
        await self.writer.drain()
        #print("\nMensagem enviada:", piece)
        
        # Receber respostas do servidor até que não haja mais dados
        while True:
            try:
                response_cache = await asyncio.wait_for(self.receive_response(), timeout=3)
                if response_cache:
                    response = response_cache
                    #print("Resposta:", response)
                    continue
                    # Se uma resposta válida for recebida, salve ela e printe
                break    
            except asyncio.TimeoutError:
                #print("\n\nNão foi recebida uma resposta do servidor ou a resposta estava vazia.")
                break
        print("\n Finish send friend request")
        return response

    def process_friend_request_response(self, response):
        if response:    
            if 'item-not-found' in response:
                return "User not found"
            elif 'max_roster_size_receiver' in response:
                return "User's friend list is full"
            elif '<iq' in response and 'type=\'set\'' in response and 'subscription=\'pending_out\'' in response:
                return "Request sent successfully"
            elif 'type=\'result\'' in response:
                return "Request has already been sent, awaiting acceptance"
            else:
                return "Unknown response: " + response
            



    def get_accept_friend_request_xml(self, puuid):
        accept_friend_request = f'''<iq id='roster_add_11' type='set'><query xmlns='jabber:iq:riotgames:roster'><item subscription="pending_out" puuid='{puuid}'/></query></iq>'''
        return accept_friend_request
    

    async def accept_friend_request(self, puuid):

        print("\n\n Starting accepting friend request")
        response = None
        piece = self.get_accept_friend_request_xml(puuid)
        self.writer.write(piece.encode())
        await self.writer.drain()
        #print("\nMensagem enviada:", piece)
        
        # Receber respostas do servidor até que não haja mais dados
        while True:
            try:
                response_cache = await asyncio.wait_for(self.receive_response(), timeout=self.timeout)
                if response_cache:
                    response = response_cache
                    #print("Resposta:", response)
                    continue
                    # Se uma resposta válida for recebida, salve ela e printe
                break    
            except asyncio.TimeoutError:
                #print("\n\nNão foi recebida uma resposta do servidor ou a resposta estava vazia.")
                break
        print("\nFinish accepting friend request")        
        return response
    


    def get_accept_all_xml(self, friendlist):
        # Lista para armazenar as mensagens XML
        xml_messages = []
        
        # Itera sobre o dicionário friendlist
        for key, info in friendlist.items():
            if info['status'] == "Friend request":
                puuid = info['puuid']  # Pega o puuid da key
                # Cria a mensagem XML
                xml_message = f'''<iq id='roster_add_11' type='set'><query xmlns='jabber:iq:riotgames:roster'><item subscription="pending_out" puuid='{puuid}'/></query></iq>'''
                xml_messages.append(xml_message)
        
        return xml_messages


    async def accept_all_friend_request(self):

        print("\n\n Starting accepting all friend requests")
        response = None
        friend_list = await self.get_friend_list()
        if isinstance(friend_list, str):
            return friend_list
        xml_messages = self.get_accept_all_xml(friend_list)
       # print(f"\n {xml_messages}")
        for idx, piece in enumerate(xml_messages):
            self.writer.write(piece.encode())
            await self.writer.drain()
            #print("\n\nMensagem enviada:", piece)
            
            while True:
                try:
                    response_cache = await asyncio.wait_for(self.receive_response(), timeout=2)
                    if response_cache:
                        response = response_cache
                        #print("\n\nResposta do servidor recebida com sucesso:", response)
                        continue
                        # Se uma resposta válida for recebida, salve ela e printe
                    break    
                except asyncio.TimeoutError:
                    #print("\n\nNão foi recebida uma resposta do servidor ou a resposta estava vazia.")
                    break
        print("\nFinish accept all friend requests")        
        return True
    


    

    
    def get_send_list_xml(self, id_list):
        # Lista para armazenar as mensagens XML
        xml_messages = []

        # Itera sobre cada ID na lista de IDs
        for index, id in enumerate(id_list, start=1):
            # Divide cada 'id' pelo '#' para separar 'nick' e 'tag'
            parts = id.split('#')
            if len(parts) == 2:  # Assegura que há exatamente duas partes
                nick, tag = parts

                nick = ''.join(f'&#{ord(char)};' if ord(char) > 127 else char for char in nick)
                tag = ''.join(f'&#{ord(char)};' if ord(char) > 127 else char for char in tag)

                # Formata a mensagem XML com o 'nick' e 'tag' separados
                xml_message = f'''<iq id='roster_add_{index}' type='set'><query xmlns='jabber:iq:riotgames:roster'><item subscription='pending_out'><id name='{nick}' tagline='{tag}'/></item></query></iq>'''
                # Adiciona a mensagem formatada à lista de mensagens
                xml_messages.append(xml_message)
            else:
                print(f"Erro ao processar o item: {id}")  # Caso o formato não seja adequado

        # Retorna a lista de mensagens XML
        return xml_messages
        
    async def send_all_friend_request(self, id_list):

        print("\n\n Starting send all friend requests")
        send_list = self.get_send_list_xml(id_list)
        #print(id_list)
        #print(send_list)
        for idx, piece in enumerate(send_list):
            self.writer.write(piece.encode())
            await self.writer.drain()
            #print("\n\nMensagem enviada:", piece)

            while True:
                try:
                    response_cache = await asyncio.wait_for(self.receive_response(), timeout=4)
                    if response_cache:
                        response = response_cache
                        #print("\n\nResposta do servidor recebida com sucesso:", response)
                        continue
                        # Se uma resposta válida for recebida, salve ela e printe
                    break    
                except asyncio.TimeoutError:
                    #print("\n\nNão foi recebida uma resposta do servidor ou a resposta estava vazia.")
                    break

        print("\nFinish send all friend requests")        
        return True



###### Remove Friend

    def get_remove_friend_xml(self, id):

        if "pvp.net" in id:
            remove_request = f'''<iq type="set" id="roster_remove_10"><query xmlns="jabber:iq:riotgames:roster"><item jid='{id}' subscription="remove"/></query></iq>'''

        else:
            remove_request = f'''<iq id="roster_remove_10" type="set"><query xmlns="jabber:iq:riotgames:roster"><item subscription="remove" puuid='{id}'/></query></iq>'''

        return remove_request

    async def remove_friend_request(self, id):
        print("\n\n Starting remove friend requests")
        response = None
        piece = self.get_remove_friend_xml(id)
        self.writer.write(piece.encode())
        await self.writer.drain()
        #print("\n\nMensagem enviada:", piece)
        
        # Receber respostas do servidor até que não haja mais dados
        while True:
            try:
                response_cache = await asyncio.wait_for(self.receive_response(), timeout=self.timeout)
                if response_cache:
                    response = response_cache
                    #print("Resposta:", response)
                    continue
                    # Se uma resposta válida for recebida, salve ela e printe
                break    
            except asyncio.TimeoutError:
                #print("\n\nNão foi recebida uma resposta do servidor ou a resposta estava vazia.")
                break
        print("\n Finished remove friend requests")
        return response
    




    def get_remove_all_xml(self, friendlist):
        # Lista para armazenar as mensagens XML
        xml_messages = []
        
        # Itera sobre o dicionário friendlist
        for key, info in friendlist.items():
            puuid = info['puuid']  # Pega o puuid da key
            # Cria a mensagem XML
            xml_message = f'''<iq id="roster_remove_1" type="set"><query xmlns="jabber:iq:riotgames:roster"><item subscription="remove" puuid="{puuid}"/></query></iq>'''
            xml_messages.append(xml_message)
        return xml_messages


    async def remove_all_friends(self):
        print("\n\n Starting remove all friends")
        response = None
        friend_list = await self.get_friend_list()
        if isinstance(friend_list, str):
            return friend_list

        xml_messages = self.get_remove_all_xml(friend_list)


        #print(f"\n {xml_messages}")
        for idx, piece in enumerate(xml_messages):
            self.writer.write(piece.encode())
            await self.writer.drain()
            #print("\n\nMensagem enviada:", piece)
            
            while True:
                try:
                    response_cache = await asyncio.wait_for(self.receive_response(), timeout=4)
                    if response_cache:
                        response = response_cache
                        #print("\n\nResposta do servidor recebida com sucesso:", response)
                        continue
                        # Se uma resposta válida for recebida, salve ela e printe
                    break    
                except asyncio.TimeoutError:
                    #print("\n\nNão foi recebida uma resposta do servidor ou a resposta estava vazia.")
                    break
        print("\n Finished remove all friends")                    
        return True
        # Se nenhum resposta válida for recebida, retorna False
        #return False 
    
#### Mass Message

    def mass_message_xml(self, random_timestamps, jid, message):
        # Lista para armazenar as mensagens XML
        xml_message = f'''<message id="{random_timestamps}:1" to="{jid}" type="chat"><body>{message}</body></message>'''
        return xml_message

    async def mass_message(self, message):
        print("\n\n Starting mass message")
        response = None
        friend_list = await self.get_friend_list()
        #print(friend_list)
        if isinstance(friend_list, str):
            return friend_list

        messages_xml_list = []  # Lista para armazenar as mensagens


        for key, info in friend_list.items():
            jid = info['jid']  # Pega o jid da key
            timestamp = self.gerar_string_x_digitos(x=13)
            #print("key: ",key )
            #print("info: ",info )
            print(timestamp)
            print(jid)
            print(message)
            xml = self.mass_message_xml(random_timestamps=timestamp, jid=jid, message=message)

            messages_xml_list.append(xml)


        #print(f"\n {xml_messages}")
        for idx, piece in enumerate(messages_xml_list):
            self.writer.write(piece.encode())
            await self.writer.drain()
            #print("\n\nMensagem enviada:", piece)
            
            while True:
                try:
                    response_cache = await asyncio.wait_for(self.receive_response(), timeout=4)
                    if response_cache:
                        response = response_cache
                        #print("\n\nResposta do servidor recebida com sucesso:", response)
                        continue
                        # Se uma resposta válida for recebida, salve ela e printe
                    break    
                except asyncio.TimeoutError:
                    #print("\n\nNão foi recebida uma resposta do servidor ou a resposta estava vazia.")
                    break
        print("\n Finished mass messages")                    
        return True
        # Se nenhum resposta válida for recebida, retorna False
        #return False 









###### Check Friend List

    def friend_list_message(self):
        friend_list = '''<iq type="get" id="2">
        <query xmlns="jabber:iq:riotgames:roster" last_state="true" />
    </iq>'''
        return friend_list
    '''
    async def get_friend_list(self):
            print("\n\n Starting get friendlist")
            response = None
            piece = self.friend_list_xml
            self.writer.write(piece.encode())
            await self.writer.drain()
            #print("\n\nMensagem enviada:", piece)

            try:
                #await asyncio.sleep(0.25)  # Pequeno atraso antes de receber a resposta
                response = await asyncio.wait_for(self.receive_response(), timeout=2)
                #response_task = asyncio.create_task(self.receive_response())
                #response = await asyncio.wait_for(response_task, timeout=self.timeout)
                #response = await self.receive_response()
                #print("wait_for passed")
            except asyncio.TimeoutError:
                response = None

            if response:
                result = await self.process_roster_response(response)
                #print("\n Friend list obtida")
                #print(f"\n {result}")
                print("\n Finished getting friendlist")                    
                return result
            return f"failed to get response: {response}" '''
    
    async def get_friend_list(self):
        print("\n\nStarting get friendlist")
        piece = self.friend_list_xml

        try:

            if not self.writer:
                raise Exception("Connection is not established")
            # Envia o pedido para o servidor XMPP
            self.writer.write(piece.encode())
            await self.writer.drain()
        except Exception as e:
            # Captura erros de escrita/dreno que podem indicar problemas na conexão
            print(f"Error while sending data: {e}")
            return f"Error while sending data: {e}"

        response = None
        # Executar pelo menos uma vez o loop, que vai executar mais vezes caso a primeira response não seja a correta
        result = "Wrong response:"
        while("Wrong response:" in result):
            try:
                # Tenta receber a resposta dentro de um tempo limite
                response = await asyncio.wait_for(self.receive_response(), timeout=2)
            except asyncio.TimeoutError:
                # Captura timeout específico para a resposta
                print("Timeout occurred while waiting for response")
                return "Error: Timeout occurred while waiting for response (or wrong response)"
            except Exception as e:
                # Captura outros erros genéricos que possam ocorrer
                print(f"Error while receiving data: {e}")
                return f"Error while receiving data: {e}"

            if response:
                try:
                    # Processa a resposta recebida
                    result = await self.process_roster_response(response)
                    if "Wrong response:" not in result:
                        print("\nFinished getting friendlist")
                        return result
                    
                except Exception as e:
                    # Captura erros que podem ocorrer durante o processamento da resposta
                    print(f"Error processing roster response: {e}")
                    return f"Error processing roster response: {e}"
            else:
                # Caso response seja None por outro motivo além do timeout
                print("Failed to get response")
                return "Error: Failed to get response"



###### Utils


    async def receive_response(self):
        # Receber dados do servidor
        try:
            response = await self.reader.read(409600)
            return response.decode('utf-8', errors='replace')
        except asyncio.TimeoutError:
            return None
   
    async def connect(self):
        # Criação do socket SSL assíncrono
        asyncio.set_event_loop(self.loop)
        self.reader, self.writer = await asyncio.open_connection(self.chaturi, self.port, ssl=self.context, server_hostname= self.chaturi)   

    async def process_roster_response(self, response):
        friendlist_info = {}
        if 'jabber:iq:riotgames:roster' in response:
            buffer = ""
            flag = True
            while flag:
                if response.strip().endswith('</iq>'):
                    flag = False
                    buffer += response
                    print("\n\nLista de amigos completa encontrada")
                    #print(f'\n {buffer}')
                    root = etree.fromstring(buffer)
                    for item in root.findall(".//{jabber:iq:riotgames:roster}item"):
                        subscription = item.attrib.get('subscription')
                        jid = item.attrib.get('jid')
                        platforms = item.find(".//{jabber:iq:riotgames:roster}platforms")
                        puuid = item.attrib.get('puuid')
                        if platforms is not None:
                            # Acessar os elementos riot dentro de platforms
                            for riot in platforms.findall(".//{jabber:iq:riotgames:roster}riot"):
                                # Formata o nome e a tagline removendo espaços e convertendo para minúsculas
                                name = riot.attrib.get('name')
                                tagline = riot.attrib.get('tagline')
                                key = f"{name}#{tagline}"  # Cria a chave no formato especificado
                                status_value = "Friend" if subscription == "both" else "Pending" if subscription == "pending_out" else "Friend request" if subscription == "pending_in" else "Unknown"
                                riot_data = {
                                    "status": status_value,  # Exemplo de placeholder
                                    "friendship_time": "",  # Exemplo de placeholder
                                    "jid": jid,
                                    "puuid": puuid

                                }

                                # Armazena o dicionário de dados no dicionário principal usando a chave formada
                                friendlist_info[key] = riot_data
        
                    return friendlist_info
                else:
                    buffer += response

                    try:
                        #await asyncio.sleep(0.25)
                        response = await asyncio.wait_for(self.receive_response(), timeout=self.timeout)
                    except asyncio.TimeoutError:
                        response = None

                    if not response:
                        break
        
        return f"wrong response: {response}"
        
    async def close_connection(self):
        if self.writer:
            self.writer.close()
            await self.writer.wait_closed()
        if self.reader:
            self.reader.feed_eof()


    def gerar_string_x_digitos(self, x):
        return ''.join(str(random.randint(0, 9)) for _ in range(x))