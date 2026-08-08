import json
import os
import random
from secrets import token_urlsafe
import aiohttp
from flask import Flask, request, jsonify, render_template, redirect, url_for
from flask_jwt_extended import JWTManager, create_access_token, decode_token, get_jwt, jwt_required, set_access_cookies, unset_jwt_cookies, get_jwt_identity, jwt_manager, verify_jwt_in_request
from flask_apscheduler import  APScheduler


from pymongo import MongoClient
from pymongo.errors import PyMongoError

from datetime import datetime, timezone, timedelta
import datetime as dt
from api_files.riot_tokens import RiotAuth
from api_files.xmpp import RiotChatClient
from api_files.gift import Gift
from aiohttp import ClientResponseError
from bson import ObjectId
import uuid
import logging
from asyncio import run
import httpx
import time

import asyncio
import threading

# Configure o Scheduler com o executor assíncrono

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)




uri = "mongodb+srv://monarch:dias1999@cluster0.zwknr9a.mongodb.net/gift_api_keys?retryWrites=true&w=majority&appName=Cluster0"
#broker_url = 'pyamqp://guest@localhost//'

app = Flask(__name__)
app.config['JWT_SECRET_KEY'] = 'as123j9qfas6asfd54 as0-112*4125521615asdas¨*+_qwe*qwea+s'  # Troque isso por uma chave secreta segura
app.config['JWT_TOKEN_LOCATION'] = ['headers', 'cookies']
app.config['JWT_ACCESS_COOKIE_PATH'] = '/'
app.config['JWT_COOKIE_CSRF_PROTECT'] = False  # Desabilitar CSRF para simplificar, mas idealmente você deve habilitar isso
app.config['MONGO_URI'] = uri
#app.config['CELERY_BROKER'] = broker_url

app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(days=30)  
app.config['JWT_REFRESH_TOKEN_EXPIRES'] = timedelta(days=30)  

# Disable caching for development
app.config['TEMPLATES_AUTO_RELOAD'] = True
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0







# Dicionário para armazenar objetos RiotAuth por user_id
auth_objects = {}
auth_lock = threading.Lock()
session_objects = {}
cookies_objects = {}
teste_porra = {}

versions = None



jwt = JWTManager(app)

client = MongoClient(uri)
db = client.gift_api_keys
users_key_collection = db.users_key
transactions_collection = db.transactions
user_accounts = db.user_accounts
gift_log = db.gift_log

account_tokens = db.account_tokens

captcha_collection = db.users_captcha

API_KEY = 'key_for_update_catalog'



if os.path.exists(RiotAuth.PROXY_FILE):
    with open(RiotAuth.PROXY_FILE, 'r') as f:
        data = json.load(f)

        proxy_url = data.get('proxy_url', False)
        #proxy_url = ''
        proxy_url = proxy_url[7:]
        creds, addr = proxy_url.rsplit('@')
        PROXY_LOGIN, PROXY_PASSWORD = creds.rsplit(':')
        PROXY_ADDRESS, PROXY_PORT = addr.rsplit(':')
        PROXY_ADDRESS_IP_BR = "103.88.235.25"





#Updating versions

versions_collection = db.versions

riotClientBuild = versions_collection.find_one({'name': 'riotClientBuild'})
if riotClientBuild:
    # Tentar acessar o atributo 'version'
    version_riotClientBuild = riotClientBuild.get("version")
else:
    version_riotClientBuild = '91.0.2.1870.3774'


sdkdocument = versions_collection.find_one({'name': 'sdk'})
if sdkdocument:
    # Tentar acessar o atributo 'version'
    sdk_version = sdkdocument.get("version")
else:
    sdk_version = '24.6.1.3774'



hcaptcha_document = versions_collection.find_one({'name': 'hcaptcha_key'})
if hcaptcha_document:
    # Tentar acessar o atributo 'version'
    HCAPTCHA_KEY_RIOT = hcaptcha_document.get("key")
else:
    HCAPTCHA_KEY_RIOT = '019f1553-3845-481c-a6f5-5a60ccf6d830'








# Função utilitária para converter ObjectId para string
def convert_objectid_to_str(data):
    if isinstance(data, list):
        for item in data:
            item['_id'] = str(item['_id'])
    else:
        data['_id'] = str(data['_id'])
    return data


@app.route("/", methods=['GET'])
def login_page():

    current_identity = None
    valid = False
    
    # Tentativa de verificar o JWT
    try:
        verify_jwt_in_request()
        current_identity = get_jwt_identity()
        if current_identity:
            #print("\n JWT encontrado")
            valid, error_response, status_code = validate_session(current_identity)
            #print("\n current identity encontrado")
    except Exception as e:
        print(f"\n Erro ao verificar JWT: {e}")

    if 'access_token_cookie' in request.cookies:
        access_token = request.cookies.get('access_token_cookie')
        #print(f"\n access token encontrado: {access_token}")

        try:
            decoded_token = decode_token(access_token)
            #print(f"\n decoded token: {decoded_token}")
            expiration_time = decoded_token.get('exp')  # Verifica se o campo 'exp' está presente no payload
            #print(f"\n exp time: {expiration_time}")
            if expiration_time:
                current_time = datetime.now(timezone.utc).timestamp()
                if expiration_time > current_time and valid:
                    #print("\n Redirecione a porra da pagina")
                    # O token ainda não expirou, redireciona para gift_api
                    return redirect(url_for('gift_page'))
            else:
                # O campo 'exp' não está presente, redireciona para gift_api
                return redirect(url_for('gift_api'))
        except Exception as e:
            # O token expirou, redireciona para a tela de login
            print(f"\n Erro exceção: {e}")
            return render_template("login_tab.html")
        
    return render_template("login_tab.html")


def validate_session(current_identity):
    login = current_identity[0]
    key = current_identity[1]
    session_id = current_identity[2]

    document = users_key_collection.find_one({"key_api": key})

    users_api_val = document.get('users_api')
    if isinstance(users_api_val, list):
        if login not in users_api_val:
            return False, jsonify({"message": "Invalid credentials"}), 401
    else:
        if str(login).strip().lower() != str(users_api_val).strip().lower():
            return False, jsonify({"message": "Invalid credentials"}), 401

    #if document['session_id'] != session_id:
        #return False, jsonify({"message": "Session invalid or expired"}), 401
    
    sessions = document.get("sessions", [])
    session = next((s for s in sessions if s["session_id"] == session_id), None)
    if not session:
        return False, jsonify({"message": "Session invalid or expired"}), 401

    # Atualiza last_accessed se a sessão é válida
    #session['last_accessed'] = datetime.now(timezone.utc)
    users_key_collection.update_one({"key_api": key}, {"$set": {"sessions": sessions}})


        # Verifica se a credencial expirou
    if 'expires_at' in document:
        expires_at = document['expires_at']
        if isinstance(expires_at, datetime):
            # Garante que expires_at seja offset-aware
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            if expires_at <= datetime.now(timezone.utc):
                # Credencial expirada
                return False, jsonify({"message": "Key expired"}), 401
        else:
            # Formato de 'expires_at' inválido
            return False, jsonify({"message": "Key expiration data is invalid"}), 401
    
    return True, None, None

@app.route("/login", methods=["POST"])
def login():
    data = request.json
    login = data.get("login_api")
    key = data.get("key_api")

    # Verificar se as credenciais são válidas no banco de dados
    document = users_key_collection.find_one({"key_api": key})

    if not document:
        return jsonify({"message": "Invalid credentials"}), 401
    
    users_api_val = document.get('users_api')
    if isinstance(users_api_val, list):
        if login not in users_api_val:
            return jsonify({"message": "Invalid credentials"}), 401
    else:
        if str(login).strip().lower() != str(users_api_val).strip().lower():
            return jsonify({"message": "Invalid credentials"}), 401
    
    # Verifica se a credencial expirou
    if 'expires_at' in document:
        expires_at = document['expires_at']
        if isinstance(expires_at, datetime):
            # Garante que expires_at seja offset-aware
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            if expires_at <= datetime.now(timezone.utc):
                # Credencial expirada
                return jsonify({"message": "Key expired"}), 401
        else:
            # Formato de 'expires_at' inválido
            return jsonify({"message": "Key expiration data is invalid"}), 401
    


    new_session_id = str(uuid.uuid4())
    new_session = {"session_id": new_session_id, "last_accessed": datetime.now(timezone.utc)}

    # Gerencia múltiplas sessões
    sessions = document.get("sessions", [])
    if len(sessions) >= 3:
        # Ordena as sessões por last_accessed e remove a mais antiga
        sessions.sort(key=lambda x: x["last_accessed"], reverse = False)
        sessions.pop(0)  # Remove a sessão mais antiga

    sessions.append(new_session)
    users_key_collection.update_one({"key_api": key}, {"$set": {"sessions": sessions}})

    #users_key_collection.update_one({"key_api": key}, {"$set": {"session_id": session_id}})

    # Criar access token com o novo session_id
    #access_token = create_access_token(identity=[login, key, session_id], expires_delta=dt.timedelta(days=30, hours=0, minutes=0))
    
    access_token = create_access_token(identity=[login, key, new_session_id], expires_delta=timedelta(days=30))
    response = jsonify(access_token=access_token)
    set_access_cookies(response, access_token, max_age=timedelta(days=30))

    return response


#@app.route("/logout", methods=["POST"])
#def logout():
    #response = jsonify({"message": "logout successful"})
    #unset_jwt_cookies(response)
    #return response



@app.route("/logout", methods=["POST"])
@jwt_required()  # Garante que o endpoint requer um JWT válido
def logout():
    # Obtém a identidade do JWT, que inclui o login, key e session_id
    current_identity = get_jwt_identity()
    login, key, session_id = current_identity

    # Atualiza o documento do usuário no banco de dados para remover o session_id
    if session_id:
        document = users_key_collection.find_one({"key_api": key})
        if document:
            # Filtra a lista de sessões para excluir a sessão que está fazendo logout
            updated_sessions = [s for s in document.get("sessions", []) if s['session_id'] != session_id]
            users_key_collection.update_one({"key_api": key}, {"$set": {"sessions": updated_sessions}})

    # Limpa os cookies de JWT para encerrar a sessão no lado do cliente
    response = jsonify({"message": "Logout successful"})
    unset_jwt_cookies(response)
    return response

@app.route("/api_frontend", endpoint='gift_page')
@jwt_required()
def gift_page():
    try:
        

        # Obtém a identidade do usuário a partir do token JWT
        current_identity = get_jwt_identity()  # Isso deve retornar uma lista como ["fourier", "socafofo"]
        if current_identity:

            valid, error_response, status_code = validate_session(current_identity)
            if valid is not True:
                return error_response, status_code  # Retorna o erro se a sessão for inválida
            

            user_name = current_identity[0]  # Assumindo que o nome do usuário está no primeiro índice
            key = current_identity[1]
            document = users_key_collection.find_one({"key_api": key})
            avatar_url = document.get(f"avatar_url_{user_name}", "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%235c6a7a'%3E%3Cpath d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z'/%3E%3C/svg%3E") if document else "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%235c6a7a'%3E%3Cpath d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z'/%3E%3C/svg%3E"
            return render_template("gift_tab.html", user=user_name, avatar_url=avatar_url)
    except jwt_manager.ExpiredSignatureError:
        # O token expirou, redireciona para a tela de login
        return redirect(url_for('login_page'))
    
@jwt.expired_token_loader
def expired_token_callback(jwt_header, jwt_payload):
    # Redireciona o usuário para a tela de login
    return redirect(url_for('login_page'))


@jwt.unauthorized_loader
def unauthorized_callback(callback):
    return redirect('/')


@app.route('/update_balance', methods=['POST'])
@jwt_required()
def update_balance():
    try:
        # Obtém a identidade do usuário a partir do token JWT
        current_identity = get_jwt_identity()
        if current_identity:
            key = current_identity[1]  # Assumindo que a chave está no segundo índice
            document = users_key_collection.find_one({"key_api": key})
            if not document:
                return jsonify({"message": "Document not found"}), 404

            data = request.json
            amount_to_subtract = data.get("rp_spent")

            if not isinstance(amount_to_subtract, (int, float)):
                return jsonify({"message": "Invalid amount"}), 400

            current_balance = document.get("balance", 0)

            if amount_to_subtract > current_balance:
                return jsonify({"message": "Insufficient key balance"}), 400

            new_balance = current_balance - amount_to_subtract

            # Atualiza o saldo no banco de dados
            users_key_collection.update_one(
                {"key_api": key},
                {"$set": {"balance": new_balance}}
            )

            return jsonify({"message": "Balance updated successfully", "new_balance": new_balance}), 200
    except Exception as e:
        return jsonify({"message": "Error updating balance", "error": str(e)}), 500



##################################################################################################################################################################################################################

def get_acc_orders(username, password):
    try:
        query = {
            "sender": username,
            "sender_pass": password  # Assumindo que a senha do remetente é armazenada sob este campo
        }
        transactions = transactions_collection.find(query)
        
        total_price = 0  # Inicializa a soma dos preços
        orders = []
        for transaction in transactions:
            '''
            order = {
                "id": str(transaction["_id"]),
                "sender": transaction["sender"],
                "receiver": transaction["receiver"],
                "item_name": transaction["item_name"],
                "item_price": transaction["item_price"],
                "date_order": transaction["date_order"].isoformat(),
                "date_finished": transaction["date_finished"].isoformat(),
                "status": transaction["status"]
            }
            
            orders.append(order)

            '''
            if transaction["status"]=="Pending" or transaction["status"]=="Awaiting":
                total_price += int(transaction["item_price"])  # Adiciona o preço do item ao total

        # Retorna a lista de pedidos junto com o preço total
        #return jsonify({"orders": orders, "total_price": total_price}), 200

        # Retorna apenas o preço total
        return total_price, 200  # Retorna um dicionário e um status

    except Exception as e:
        # Retorna uma resposta JSON com detalhes do erro
        return {"status": "error", "message": "Error fetching orders", "error": str(e)}, 500


@app.route('/get_orders', methods=['GET'])
@jwt_required()
def get_orders():
    try:

        current_identity = get_jwt_identity()
        if current_identity:

            valid, error_response, status_code = validate_session(current_identity)
            if valid is not True:
                return error_response, status_code  # Retorna o erro se a sessão for inválida

            user_id = current_identity[0]
            key = current_identity[1]

            # Buscar todas as transações associadas ao usuário e chave
            transactions = transactions_collection.find({"user": user_id, "key": key})
            
            orders = []
            for transaction in transactions:
                order = {
                    "id": str(transaction["_id"]),
                    "sender": transaction["sender"],
                    "receiver": transaction["receiver"],
                    "item_name": transaction["item_name"],
                    "item_price": transaction["item_price"],
                    "date_order": transaction["date_order"].isoformat(),
                    "date_finished": transaction["date_finished"],
                    "status": transaction["status"],
                    "retry": 0
                }

                # Verifica se 'date_finished' é uma instância de datetime antes de chamar isoformat()
                if isinstance(transaction["date_finished"], datetime):
                    order["date_finished"] = transaction["date_finished"].isoformat()


                orders.append(order)

            return jsonify(orders), 200
        else:
            return jsonify({"status": "error", "message": "Unauthorized"}), 401
    except Exception as e:
        return jsonify({"status": "error", "message": "Error fetching orders", "error": str(e)}), 500



@app.route('/cancel_order/<order_id>', methods=['DELETE'])
@jwt_required()
def cancel_order(order_id):
    try:

        
        current_identity = get_jwt_identity()
        if current_identity:

            valid, error_response, status_code = validate_session(current_identity)
            if valid is not True:
                return error_response, status_code  # Retorna o erro se a sessão for inválida

            user_id = current_identity[0]
            key = current_identity[1]

            # Verifica e remove a transação específica associada ao usuário, chave e order_id
            result = transactions_collection.delete_one({"user": user_id, "key": key, "_id": ObjectId(order_id)})

            if result.deleted_count:
                return jsonify({"message": "Order canceled successfully", "deleted_count": result.deleted_count}), 200
            else:
                return jsonify({"message": "No order found with the given ID"}), 404
        else:
            return jsonify({"message": "Unauthorized"}), 401
    except Exception as e:
        return jsonify({"message": "Error cancelling order", "error": str(e)}), 500


@app.route('/clear_orders', methods=['POST'])
@jwt_required()
def clear_orders():
    try:
        
        
        current_identity = get_jwt_identity()

        
        if current_identity:

            valid, error_response, status_code = validate_session(current_identity)
            if valid is not True:
                return error_response, status_code  # Retorna o erro se a sessão for inválida

            user_id = current_identity[0]
            key = current_identity[1]

            # Remove todas as transações associadas ao usuário e chave
            result = transactions_collection.delete_many({"user": user_id, "key": key})

            return jsonify({"message": "Transactions cleared", "deleted_count": result.deleted_count}), 200
        else:
            return jsonify({"message": "Unauthorized"}), 401
    except Exception as e:
        return jsonify({"message": "Error clearing orders", "error": str(e)}), 500



@app.route('/export_orders', methods=['GET'])
@jwt_required()
def export_orders():
    try:
        current_identity = get_jwt_identity()
        if current_identity:
            user_id = current_identity[0]
            key = current_identity[1]

            # Buscar todas as transações associadas ao usuário e chave
            transactions = transactions_collection.find({"user": user_id, "key": key})
            
            # Formatar as transações em texto
            orders_text = ""
            for transaction in transactions:
                order = f"Sender: {transaction['sender']}\n" \
                        f"Receiver: {transaction['receiver']}\n" \
                        f"Item: {transaction['item_name']}\n" \
                        f"Price: {transaction['item_price']}\n" \
                        f"Order Date: {transaction['date_order']}\n" \
                        f"Finish Date: {transaction['date_finished']}\n" \
                        f"Status: {transaction['status']}\n\n"
                orders_text += order

            return orders_text, 200, {
                'Content-Type': 'text/plain',
                'Content-Disposition': 'attachment; filename="orders.txt"'
            }
        else:
            return jsonify({"msg": "Unauthorized"}), 401
    except Exception as e:
        return jsonify({"msg": "Error exporting orders", "error": str(e)}), 500





####################################################################################################################################################################################



@app.route('/save_account', methods=['POST'])
@jwt_required()
def register_account():
    try:
        current_identity = get_jwt_identity()
        if current_identity:
            valid, error_response, status_code = validate_session(current_identity)
            if valid is not True:
                return error_response, status_code  # Retorna o erro se a sessão for inválida

            user_id = current_identity[0]
            key = current_identity[1]

            data = request.get_json()

            user_pass = data.get("user_pass")

            # Cria um ObjectId para o novo documento
            account_id = ObjectId()

            # Cria um documento de conta
            new_account = {
                "_id": account_id,
                "user": user_id,
                "key": key,
                "user_pass": user_pass,
                "region": "",
                "rp_balance": "",
                "rp_ordered": "",
                "rp_remaining": "",
            }

            # Insere o documento na coleção de contas do usuário
            user_accounts.insert_one(new_account)
            return jsonify({"status": "success", "message": "Account saved successfully"}), 200
        else:
            return jsonify({"status": "error", "message": "Unauthorized"}), 401
    except Exception as e:
        return jsonify({"status": "error", "message": "Error saving account", "error": str(e)}), 500




@app.route('/get_accounts', methods=['GET'])
@jwt_required()
def get_accounts():
    try:
        current_identity = get_jwt_identity()
        if current_identity:
            valid, error_response, status_code = validate_session(current_identity)
            if valid is not True:
                return error_response, status_code  # Retorna o erro se a sessão for inválida

            user_id = current_identity[0]
            key = current_identity[1]

            # Buscar todas as contas associadas ao usuário e chave
            accounts = user_accounts.find({"user": user_id, "key": key})
            
            account_data = []
            for account in accounts:
                account_details = {
                    "id": str(account["_id"]),
                    "user_pass": account["user_pass"],
                    "region": account["region"],
                    "rp_balance": account["rp_balance"],
                    "rp_ordered": account["rp_ordered"],
                    "rp_remaining": account["rp_remaining"]
                }
                account_data.append(account_details)

            return jsonify(account_data), 200
        else:
            return jsonify({"status": "error", "message": "Unauthorized"}), 401
    except Exception as e:
        return jsonify({"status": "error", "message": "Error fetching accounts", "error": str(e)}), 500



@app.route('/cancel_account/<id>', methods=['DELETE'])
@jwt_required()
def cancel_account(id):
    try:
        current_identity = get_jwt_identity()
        if current_identity:
            valid, error_response, status_code = validate_session(current_identity)
            if valid is not True:
                return error_response, status_code  # Retorna o erro se a sessão for inválida

            user_id = current_identity[0]
            key = current_identity[1]

            # Verifica e remove uma conta específica
            result = user_accounts.delete_one({"user": user_id, "key": key, "_id": ObjectId(id)})
            if result.deleted_count:
                return jsonify({"message": "Account canceled successfully", "deleted_count": result.deleted_count}), 200
            else:
                return jsonify({"message": "No account found with the given user_pass"}), 404
        else:
            return jsonify({"message": "Unauthorized"}), 401
    except Exception as e:
        return jsonify({"message": "Error cancelling account", "error": str(e)}), 500


@app.route('/clear_accounts', methods=['POST'])
@jwt_required()
def clear_accounts():
    try:
        current_identity = get_jwt_identity()
        if current_identity:
            valid, error_response, status_code = validate_session(current_identity)
            if valid is not True:
                return error_response, status_code  # Retorna o erro se a sessão for inválida

            user_id = current_identity[0]
            key = current_identity[1]

            # Remove todas as contas associadas ao usuário e chave
            result = user_accounts.delete_many({"user": user_id, "key": key})
            return jsonify({"message": "Accounts cleared", "deleted_count": result.deleted_count}), 200
        else:
            return jsonify({"message": "Unauthorized"}), 401
    except Exception as e:
        return jsonify({"message": "Error clearing accounts", "error": str(e)}), 500



@app.route('/export_accounts', methods=['GET'])
@jwt_required()
def export_accounts():
    try:
        current_identity = get_jwt_identity()
        if current_identity:
            user_id = current_identity[0]
            key = current_identity[1]

            # Buscar todas as contas associadas ao usuário e chave
            accounts = user_accounts.find({"user": user_id, "key": key})
            
            # Formatar as contas em texto
            accounts_text = ""
            for account in accounts:
                account_details = f"User:Pass: {account['user_pass']}\n" \
                                  f"Region: {account['region']}\n" \
                                  f"RP Balance: {account['rp_balance']}\n" \
                                  f"RP Ordered: {account['rp_ordered']}\n" \
                                  f"RP Remaining: {account['rp_remaining']}\n\n"
                accounts_text += account_details

            return accounts_text, 200, {
                'Content-Type': 'text/plain',
                'Content-Disposition': 'attachment; filename="accounts.txt"'
            }
        else:
            return jsonify({"msg": "Unauthorized"}), 401
    except Exception as e:
        return jsonify({"msg": "Error exporting accounts", "error": str(e)}), 500








@app.route('/run-script', methods=['POST'])
@jwt_required()
async def gift_send():
    try:

        auth = None
        Giftobj = None

        current_identity = get_jwt_identity()  # Isso deve retornar uma lista como ["fourier", "socafofo"]
        if current_identity:

            valid, error_response, status_code = validate_session(current_identity)
            if valid is not True:
                return error_response, status_code  # Retorna o erro se a sessão for inválida

            user_id = current_identity[0]  # Assumindo que o nome do usuário está no primeiro índice
            key = current_identity[1]  # Obtendo a chave do token JWT

        data = request.json

        if data.get("task") == "save_avatar":
            new_avatar = data.get("avatar_url")
            if new_avatar:
                users_key_collection.update_one({"key_api": key}, {"$set": {f"avatar_url_{user_id}": new_avatar}})
                return jsonify({"status": "success", "message": "Avatar updated successfully", "avatar_url": new_avatar}), 200

        if data.get("task") in ( "gift","order"):
            sender = data.get("username")
            sender_pass = data.get("password")
            receiver_name = data.get("name")
            receiver_tag = data.get("tag")
            item_name = data.get("item_name")
            item_offerid = data.get("offer_id")
            item_price = data.get("price")
            gift_message = data.get("giftmessage")
            item_id = data.get("item_id")
            inventory_type = data.get("inventory_type")
            

            date_order = datetime.now(timezone.utc)
            
            date_finished = date_order + dt.timedelta(days=0, hours=0, minutes=2)

            status = "Awaiting"

            # Cria um ObjectId para o novo documento
            transaction_id = ObjectId()
            
            # Cria um documento de transação
            new_transaction = {
                "_id": transaction_id,
                "user": user_id,
                "key": key,
                "date_order": date_order,
                "date_finished": "-",
                "sender": sender,
                "username": "-",
                "sender_pass": sender_pass,
                "receiver_name": receiver_name,
                "receiver_tag": receiver_tag,
                "receiver": f"{receiver_name}#{receiver_tag}",
                "receiver_puuid": "",
                "item_name": item_name,
                "item_offerid": item_offerid,
                "item_price": item_price,
                "gift_message": gift_message,
                "item_id": item_id,
                "inventory_type": inventory_type,
                "status": status,
                "retry": 0,
                "server": "",
            }

            # Insere o documento na coleção de transações
            #transactions_collection.insert_one(new_transaction)

            #FinishOrderGift.delay(str(transaction_id))
            #return jsonify({"status": "success", "message": "Transaction registered successfully"}), 200

        
            

        if data.get("task") in ( "gift","order"):
            user_document = users_key_collection.find_one({"key_api": key})
            if user_document:
                key_balance = user_document.get("balance", 0)  # Obtendo o saldo atual
            if key_balance < data.get("price"):
                return jsonify({"status": "error", "message": "Insufficient key balance"}), 401



        username = data.get("username"); password =  data.get("password")
        name = data.get("name"); tag = data.get("tag")
        
        userpass_value = f"{username}:{password}"


        result, status_code = get_acc_orders(username, password)
        if status_code == 200:
            # Processamento normal
            #print("Total Price:", result['total_price'])
            total_ordered = result
        elif status_code == 500:
            # Erro na obtenção dos dados
            print("Error:", result['message'])
            total_ordered = -1



        captcha_code = data.get("captcha_solved")
        lol_token = data.get("lol_token")
        id_token = data.get("id_token")
        session_id = data.get("session_id")

        # Recuperar cookies mongodb
            
        tokens_document = account_tokens.find_one({'userpass': userpass_value})

        cookies = aiohttp.CookieJar(unsafe=True)

        if tokens_document and 'cookies' in tokens_document:
            database_cookies = tokens_document.get('cookies')
            #logger.info(f"\n Updating Cookies \n")

            for cookie_name, value in database_cookies.items():
                cookies.update_cookies({cookie_name: value})
        


        '''
        if session_id in cookies_objects:
            cookies = cookies_objects[session_id]
            logger.info("cookie_object finded with session_id")
        else:
            cookies = aiohttp.CookieJar(unsafe=True)
            logger.info("cookie_object not find with session_id")
            '''



        #logger.info(f"Cookies before creating RiotAuth: {cookies}")


        #cookies_dict = {cookie.key: cookie.value for cookie in cookies}

        # Print the cookies
        #logger.info(f"Cookies stored for session ID: {session_id}")
        #for key, value in cookies_dict.items():
            #logger.info(f"{key}: {value}")


        # Recupera ou cria um novo objeto RiotAuth
        #with auth_lock:

        auth_res = None
        max_attempts=1

        for attempt in range(max_attempts):
            auth = RiotAuth(username, password, cookies, lol_token=lol_token, id_token=id_token)
            auth_res = await auth.initialize(catalog=False)
            if auth_res == "Wrong credentials: Invalid username or password":
                print("\n Falha na autenticação: credenciais inválidas.")
                break  # Sai do loop se as credenciais estiverem incorretas
            if auth.auth_result:
                print("\n Autenticação bem-sucedida.")
                break  # Sai do loop se a autenticação for bem-sucedida
            else:
                print(f"\n Tentativa {attempt + 1} falhou, tentando novamente...")
                await auth.close_resources()



        if not auth.auth_result:
            print("\n Todas as tentativas de autenticação falharam.")


        if auth.auth_result:
            if(data.get("task")=="saldo"):
                rp_remaining = auth.rp_amount - total_ordered
                acc_info = {
                    "$set": {
                        "region": auth.region,
                        "rp_balance": auth.rp_amount,
                        "rp_ordered": total_ordered,
                        "rp_remaining": rp_remaining
                    }
                }
                user_accounts.update_many({"user_pass": f"{username}:{password}"}, acc_info)
                
                account_doc = user_accounts.find_one({"user_pass": f"{username}:{password}"})
                avatar_url = account_doc.get("avatar_url", "") if account_doc else ""
                
                return jsonify({"status": "success", "message": f"Authenticated as {username} Lv {auth.summnerLevel} {auth.riotId} ({auth.region})", "saldo": auth.rp_amount, "region": auth.region, "total_ordered": total_ordered, "rp_remaining": rp_remaining, "riot_id": auth.riotId, "avatar_url": avatar_url }), 200


            print(f"Authenticated as {username} ({auth.riotId})")
            ChatXmpp = RiotChatClient(auth.chat_uri, auth.chat_dom, 5223, 1)

            friend_task = 'friend_request'
            friend_id = None
            friend_id_list = None
            friend_message = None

            if (data.get("task")=="friend_list"):
                friend_task = 'friend_list'

            if (data.get("task")=="send_all"):
                friend_task = 'send_all'
                friend_id_list = data.get("friend_ids")
            
            if (data.get("task")=="accept_friend"):
                friend_id = data.get('friend_id')
                friend_task = 'accept_friend'

            if (data.get("task")=="accept_all"):
                friend_id = None
                friend_task = 'accept_all'

            if (data.get("task")=="remove_one"):
                friend_id = data.get('friend_id')
                friend_task = 'remove_one'

            if (data.get("task")=="remove_all"):
                friend_task = 'remove_all'
                friend_id_list = data.get("friend_ids")
                
            if (data.get("task")=="mass_message"):
                friend_task = 'mass_message'
                friend_message = data.get("friend_message")

            

            ChatXmpp.friend_result = await ChatXmpp.Initialize_friend_request(name, tag, auth.lol_token, auth.chat_dom, auth.geopas_token, task=friend_task, id=friend_id , id_list=friend_id_list, message=friend_message)

            if (ChatXmpp.friend_result and "Error" in ChatXmpp.friend_result): return jsonify({"status": "error", "message": f"{ChatXmpp.friend_result}"}), 500

            if (data.get("task")=="remove_one"): return jsonify({"status": "success", "message": f"{ChatXmpp.friend_result}"}), 200

            if (data.get("task")=="remove_all"): return jsonify({"status": "success", "message": f"{ChatXmpp.friend_result}"}), 200

            if (data.get("task")=="friend"): return jsonify({"status": "success", "message": f"{ChatXmpp.friend_result}"}), 200

            if (data.get("task")=="send_all"): return jsonify({"status": "success", "message": f"{ChatXmpp.friend_result}"}), 200

            if (data.get("task")=="accept_friend"): return jsonify({"status": "success", "message": f"{ChatXmpp.friend_result}"}), 200

            if (data.get("task")=="accept_all"): return jsonify({"status": "success", "message": f"{ChatXmpp.friend_result}"}), 200

            if (data.get("task")=="mass_message"): return jsonify({"status": "success", "message": f"{ChatXmpp.friend_result}"}), 200


            if (data.get("task")=="friend_list"):
                if ChatXmpp.account_status == 'account-disabled':
                    return jsonify({"status": "error", "message": f"{ChatXmpp.friend_result}"}), 401


                gift_info = await auth.friendlist_gift_info()
                #print(f"\n{gift_info}")
                # Itera sobre cada amigo no JSON
                for friend in gift_info['friends']:
                    # Cria a chave como nome#tagline
                    friend_key = friend['nick']
                    # Verifica se essa chave existe no dicionário
                    if friend_key in ChatXmpp.friend_result:
                        # Atualiza o valor de 'friendship time' com 'friendsSince'
                        ChatXmpp.friend_result[friend_key]['friendship_time'] = format_time_difference(calculate_time_difference(friend))

                return jsonify({"status": "success", "friendlist": f"{ChatXmpp.friend_result}"}), 200


            if (data.get("task")=="order"):

                document = users_key_collection.find_one({"key_api": key})
                if document:
                    key_balance = document.get("balance", 0)  # Obtendo o saldo atual
                if key_balance < data.get("price"):
                    return jsonify({"status": "error", "message": "Insufficient key balance"}), 401
                

                if ChatXmpp.friend_result == "The player is already added to the friends list":

                    # Insere o documento na coleção de transações
                    new_transaction["receiver_puuid"] = ChatXmpp.receiver_puuid
                    new_transaction["server"] = auth.region
                    new_transaction["username"] = auth.riotId

                    if auth.region == "BR1":
                        #date_finished = date_order + dt.timedelta(days=14, hours=0, minutes=10)
                        time_delta = timedelta(days=14)
                    else:
                        #date_finished = date_order + dt.timedelta(days=1, hours=0, minutes=10)
                        #time_delta = timedelta(hours=1)
                        time_delta = timedelta(days=7)


                    gift_info = await auth.friendlist_gift_info()

                    found_flag = False

                    for friend in gift_info['friends']:
                        
                        #print(f"\n Comparing {friend['nick']} with {new_transaction["receiver"]} ")
                        friend_key = friend['nick'].replace(" ", "").lower()
                        if friend_key == new_transaction["receiver"].replace(" ", "").lower():
                            found_flag = True
                            if friend['friendsSince'] is None or friend['friendsSince'] == "":
                                return jsonify({"status": "error", "message": "The recipient is from a different server"}), 401

                            time_friend = calculate_time_difference(friend)
                            if time_friend > time_delta:
                                date_finished = date_order + dt.timedelta(days=0, hours=0, minutes=0, seconds=0)

                            else:
                                remaining_time = time_delta - time_friend
                                date_finished = date_order + remaining_time

                    if not found_flag:

                        print(f"\n Cannot found friend information (Less than 1 day or different servers)")
                        date_finished = date_order + time_delta
                        #return jsonify({"status": "error", "message": "Cannot found friend information (Probably different servers)"}), 401
                    
                    new_transaction["date_finished"] = date_finished

                    new_transaction["status"] = "Pending"

                    transactions_collection.insert_one(new_transaction)

                    new_balance = key_balance - item_price

                    users_key_collection.update_one(
                        {"key_api": key},
                        {"$set": {"balance": new_balance}}
                    )

                    print(f"\n Transaction registered successfully from {sender} to {new_transaction["receiver"]}")
                    return jsonify({"status": "success", "message": "Order registered successfully"}), 200
                
                else:

                    '''
                    new_balance = key_balance - item_price

                    users_key_collection.update_one(
                        {"key_api": key},
                        {"$set": {"balance": new_balance}}
                    )

                    new_transaction["date_check"] = date_order + timedelta(hours=0, minutes=5)

                    transactions_collection.insert_one(new_transaction)
                    
                    print("\n Order registered (waiting for customer acceptance)")

                    return jsonify({"status": "success", "message": "Order registered (waiting for customer acceptance)"}), 200
                    '''


                    return jsonify({"status": "error", "message": "Customer is not on friendlist"}), 401
                
                
                
            # Executa quando a task for "gift"
            if ChatXmpp.friend_result == "The player is already added to the friends list":

                # Insere o documento na coleção de transações
                new_transaction["receiver_puuid"] = ChatXmpp.receiver_puuid
                new_transaction["server"] = auth.region
                new_transaction["username"] = auth.riotId

                Giftobj = Gift(auth)
                offer_id = data.get("offer_id")
                gift_message = data.get("giftmessage")
                quantity = data.get("quantity")
                

                print(f"\n \n Sender: {username} ({auth.riotId}) \n Receiver: {name}#{tag} \n Receiver_puuid: {ChatXmpp.receiver_puuid} \n Item: {data.get("item_name")} ({data.get("price")}) \n Offer Id: {offer_id} \n Gift message: {gift_message}\n ")

                currencySelected = data.get("currency")
                if currencySelected == 'EA':
                    
                    gift_info = await auth.friendlist_gift_info()
                    receiver_summoner_id = get_summoner_id(gift_info, f"{name}#{tag}")
                    item_id = data.get("item_id")
                    inventory_type = data.get("inventory_type")
                    item_price_rp = data.get("price")
                    item_price_ip = data.get("price_ip")

                    await Giftobj.send_gift_v3(auth, receiver_summoner_id, item_id, item_price_ip,inventory_type, gift_message) 
                else:
                    await Giftobj.send_gift(auth, ChatXmpp.receiver_puuid, offer_id, gift_message, quantity)
                    
                    #gift_info = await auth.friendlist_gift_info()
                    #receiver_summoner_id = get_summoner_id(gift_info, f"{name}#{tag}")
                    #item_id = data.get("item_id")
                    #inventory_type = data.get("inventory_type")
                    #item_price_rp = data.get("price")
                    #await Giftobj.send_gift_v3(auth, receiver_summoner_id, item_id, item_price_rp,inventory_type, gift_message)

                #await Giftobj.session.close()
                #await Giftobj.tcp_connector.close()

                await asyncio.sleep(3)
                new_saldo_rp, new_saldo_ip = await auth.get_saldo_rp()
                if currencySelected == 'RP':
                    if new_saldo_rp<auth.rp_amount:
                        rp_spent = auth.rp_amount - new_saldo_rp

                        new_transaction["status"] = "Completed"

                        if new_transaction["user"] not in ['domas', 'elogator']:
                            new_transaction.pop('sender_pass', None)


                        new_transaction.pop('date_finished', None)
                        new_transaction.pop('retry', None)

                        gift_log.insert_one(new_transaction)


                        print("\nGift bem sucedido")
                        logger.info(f"\n Gift bem sucedido \n Sender: {username} ({auth.riotId}) \n Receiver: {name}#{tag} \n Item: {data.get("item_name")} \n Spend: {rp_spent}, New balance: {new_saldo_rp}")
                        
                        return jsonify({"status": "success", "message": "Gift sent successfully", "saldo": new_saldo_rp, "rp_spent": rp_spent }), 200
                    else:
                        print("Falha ao enviar presente")
                        return jsonify({"status": "error", "message": "Failed to send gift"}), 401
                if currencySelected == 'EA':
                    if new_saldo_ip<auth.ip_amount:
                        ip_spent = auth.ip_amount - new_saldo_ip

                        new_transaction["status"] = "Completed"

                        if new_transaction["user"] not in ['domas', 'elogator']:
                            new_transaction.pop('sender_pass', None)


                        new_transaction.pop('date_finished', None)
                        new_transaction.pop('retry', None)

                        gift_log.insert_one(new_transaction)


                        print("\nGift bem sucedido")
                        logger.info(f"\n Gift bem sucedido \n Sender: {username} ({auth.riotId}) \n Receiver: {name}#{tag} \n Item: {data.get("item_name")} \n Spend: {ip_spent}, New balance: {new_saldo_ip}")
                        
                        return jsonify({"status": "success", "message": "Gift sent successfully", "saldo": new_saldo_rp, "ip_spent": ip_spent }), 200
                    else:
                        print("Falha ao enviar presente")
                        return jsonify({"status": "error", "message": "Failed to send gift"}), 401

                
            else:
                
                # TENTANDO MANDAR, CASO O GIFT SEJA BONUS DE XP

                # Pegando PUUID por fora do xmpp
                
                ChatXmpp.receiver_puuid = await auth.get_puuid_player(name,tag)

                print(f"\n Puuid outside xmpp: {ChatXmpp.receiver_puuid}")

                # Insere o documento na coleção de transações
                new_transaction["receiver_puuid"] = ChatXmpp.receiver_puuid
                new_transaction["server"] = auth.region
                new_transaction["username"] = auth.riotId

                Giftobj = Gift(auth)
                offer_id = data.get("offer_id")
                gift_message = data.get("giftmessage")
                quantity = data.get("quantity")
                print(f"\n \n Sender: {username} ({auth.riotId}) \n Receiver: {name}#{tag} \n Receiver_puuid: {ChatXmpp.receiver_puuid} \n Item: {data.get("item_name")} ({data.get("price")}) \n Offer Id: {offer_id} \n Gift message: {gift_message}\n ")
                




                if auth.region == '':
                    
                    gift_info = await auth.friendlist_gift_info()
                    receiver_summoner_id = get_summoner_id(gift_info, f"{name}#{tag}")
                    item_id = data.get("item_id")
                    inventory_type = data.get("inventory_type")
                    item_price = data.get("price")

                    await Giftobj.send_gift_v3(auth, receiver_summoner_id, item_id, item_price,inventory_type, gift_message) 
                else:
                    await Giftobj.send_gift(auth, ChatXmpp.receiver_puuid, offer_id, gift_message, quantity)


                #await Giftobj.session.close()
                #await Giftobj.tcp_connector.close()

                await asyncio.sleep(3)
                new_saldo_rp, new_saldo_ip = await auth.get_saldo_rp()
                
                if new_saldo_rp<auth.rp_amount:
                    rp_spent = auth.rp_amount - new_saldo_rp

                    new_transaction["status"] = "Completed"
                    
                    if new_transaction["user"] not in ['domas', 'elogator']:
                        new_transaction.pop('sender_pass', None)


                    new_transaction.pop('date_finished', None)
                    new_transaction.pop('retry', None)

                    gift_log.insert_one(new_transaction)

                    print("\nGift bem sucedido")
                    logger.info(f"\n Gift bem sucedido \n Sender: {username} ({auth.riotId}) \n Receiver: {name}#{tag} \n Item: {data.get("item_name")} \n Spend: {rp_spent}, New balance: {new_saldo_rp}")
                                        
                    return jsonify({"status": "success", "message": "Gift sent successfully", "saldo": new_saldo_rp, "rp_spent": rp_spent }), 200
                else:
                    print("Falha ao enviar presente")
                    return jsonify({"status": "error", "message": "Failed to send gift (Check if the receiver is already a friend)"}), 401



            
        elif isinstance(auth_res, str) and 'Wrong credentials' in auth_res:
            print(f"Error: {auth_res}")
            return jsonify({"status": "error", "message": f"{auth_res}"}), 401
        else:
            print(f"Error: {auth_res}")
            return jsonify({"status": "error", "message": "Unknown error on authentication"}), 401
    except ClientResponseError as e:
        print(f"ClientResponseError on authentication: {e}")
        return jsonify({"status": "error", "message": f"Client response error: {e.message}", "url": str(e.request_info.url)}), 500 
    except Exception as e:
            print(f"Error on authentication: {e}")
            return jsonify({"status": "error", "message": "Internal Server Error", "exception": str(e)}), 500
    finally:
        if auth is not None:
            await auth.close_resources()
        if Giftobj is not None:
            await Giftobj.session.close()
            await Giftobj.tcp_connector.close()




catalog_cache_pt = {}  # Cache em memória para português
catalog_cache_en = {}  # Cache em memória para inglês


async def update_catalog_cache(username, password, file_name):
    auth = None
    userpass_value = f'{username}:{password}'
    
    cookies = aiohttp.CookieJar(unsafe=True)
    
    # Injetar os cookies de sessão ativos fornecidos
    raw_cookies = {
        'asid': '5QrCcKI2yxGFtzjEs8pAwn2xFZEQNNyGnmHb-aQ3vmI',
        'csid': 'C7s8fqnRXSfsKyJpYa8YtQ.3CX0kXbX2v-BzK7AIZRXJw',
        'ssid': 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxYWZkZDM1Ni03NTAzLTViOWItOTRlMC05Y2MyZDQ5NzFhZjMiLCJzc2lkIjoiQzdzOGZxblJYU2ZzS3lKcFlhOFl0US4zQ1gwa1hiWDJ2LUJ6SzdBSVpSWEp3IiwiaWF0IjoxNzg1OTYwOTk4fQ.q0YGfjK2w7wYE2Rd72FZYLZ0KzLry7CtNE2fSteWoZ0',
        'ccid': 'lol',
        'clid': 'uw1',
        'tdid': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk5MGViNmNlLWJhYjQtNDMwNC04NzhjLTBhNmI5NGM3ZjMyYSIsIm5vbmNlIjoiZ21VQ3JDeTZJTk09IiwiaWF0IjoxNzg1OTYwOTk3fQ.Hd7SFVtxYcXGJA2QuEwTux4AJqr9pw2JsQTclqx6Qv4'
    }
    
    for c_name, c_val in raw_cookies.items():
        cookies.update_cookies({c_name: c_val})

    tokens_document = None
    if 'account_tokens' in globals() and account_tokens is not None:
        try: tokens_document = account_tokens.find_one({'userpass': userpass_value})
        except Exception: pass

    if tokens_document and 'cookies' in tokens_document:
        for cookie_name, value in tokens_document.get('cookies', {}).items():
            cookies.update_cookies({cookie_name: value})

    try:
        print(f"\n [Auth] Autenticando {username} via Cookies de Sessao...")
        auth = RiotAuth(username, password, cookies, None)
        auth_res = await auth.initialize()

        if auth and getattr(auth, 'auth_result', False):
            print(f"\n [Success] Sessao de {username} autenticada com sucesso! Baixando catalogo...")
            await auth.set_lol_version()
            await auth.get_catalog()
        else:
            print(f"\n [Info] Sessao expirada para {username}. Resolvendo hCaptcha com CapMonster ($292.71 USD)...")
            captcha_token = await captcha_solver_login('c1d7b1ce8249daff22cb67cec1dc9312', userpass_value)
            if captcha_token and not captcha_token.startswith('Exception'):
                auth = RiotAuth(username, password, cookies, captcha_token)
                auth_res = await auth.initialize()
                if auth and getattr(auth, 'auth_result', False):
                    print(f"\n [Success] Login via CapMonster bem-sucedido para {username}! Baixando catalogo...")
                    await auth.set_lol_version()
                    await auth.get_catalog()
    except Exception as e:
        print(f"\n Aviso na autenticação: {e}")

    finally:
        if auth is not None:
            try: await auth.close_resources()
            except Exception: pass

    if auth and getattr(auth, 'catalog_map', None) is not None:
        with open(file_name, 'w', encoding='utf-8', errors='ignore') as f:
            json.dump(auth.catalog_map, f)
        print(f"🎉 Catálogo salvo com sucesso em {file_name}!")


async def fetch_catalogs(lang=None):
    accounts_file = 'catalog_accounts.json'
    if os.path.exists(accounts_file):
        with open(accounts_file, 'r', encoding='utf-8') as f:
            accounts_config = json.load(f)

        for key, acc in accounts_config.items():
            if lang and key != lang:
                continue
            if not acc.get('enabled', True):
                print(f"\n Skipping catalog fetch for {key} (disabled in config)")
                continue

            user = acc.get('username')
            pwd = acc.get('password')
            out_file = acc.get('file_name', f'catalog_cache_{key}.json')

            if user and str(user).startswith('#'):
                print(f"\n Skipping catalog fetch for {key} (username disabled with #)")
                continue

            print(f"\n Starting catalog fetch for {key} ({user})...\n")
            await update_catalog_cache(user, pwd, out_file)
            print(f"\n Catalog fetch for {key} completed\n")
            await asyncio.sleep(2)
    else:
        print("\n Starting catalog fetch for EN (Tuan8539)\n")
        await update_catalog_cache("Tuan8539", "cucudz001", 'catalog_cache_en.json')
        print("\n Catalog fetch completed\n")


async def load_catalog():
    print("\n loading catalog")
    global catalog_cache_pt, catalog_cache_en
    try:
        if os.path.getsize('catalog_cache_pt.json') > 0:
            with open('catalog_cache_pt.json', 'r', encoding='utf-8', errors='ignore') as f:
                catalog_cache_pt = json.load(f)
                print("\nCatalog pt encontrado")
        else:
            print("\nArquivo 'catalog_cache_pt.json' está vazio")

        if os.path.getsize('catalog_cache_en.json') > 0:
            with open('catalog_cache_en.json', 'r', encoding='utf-8', errors='ignore') as f:
                catalog_cache_en = json.load(f)
                print("\nCatalog en encontrado")
        else:
            print("\nArquivo 'catalog_cache_en.json' está vazio")

        # Auto-merge missing items from EN into PT so PT catalog is 100% complete
        # (Disabled because it causes English items to duplicate inside the PT catalog due to name differences)
        # if catalog_cache_en and catalog_cache_pt:
        #     for cat, items in catalog_cache_en.items():
        #         if cat not in catalog_cache_pt:
        #             catalog_cache_pt[cat] = {}
        #         for item_name, item_data in items.items():
        #             if item_name not in catalog_cache_pt[cat]:
        #                 catalog_cache_pt[cat][item_name] = item_data

    except (FileNotFoundError, json.JSONDecodeError) as e:
        print(f"\nErro ao carregar catálogo ({type(e).__name__}), obtendo um novo...\n")
        await fetch_catalogs()
        # Após tentar baixar, carrega manualmente para a memória sem recursão
        try:
            if os.path.exists('catalog_cache_pt.json') and os.path.getsize('catalog_cache_pt.json') > 0:
                with open('catalog_cache_pt.json', 'r', encoding='utf-8', errors='ignore') as f:
                    catalog_cache_pt = json.load(f)
            if os.path.exists('catalog_cache_en.json') and os.path.getsize('catalog_cache_en.json') > 0:
                with open('catalog_cache_en.json', 'r', encoding='utf-8', errors='ignore') as f:
                    catalog_cache_en = json.load(f)
        except Exception as e2:
            print(f"\nFalha final ao carregar catálogos após o fetch: {str(e2)}\n")

    except Exception as e:
        print(f"\nOcorreu um erro inesperado: {str(e)}\n")


def calculate_time_difference(friend):
    friends_since=friend['friendsSince']
    # Suponha que friends_since vem como uma string de data e hora ISO
    friends_since_date = datetime.fromisoformat(friends_since)

    # Assegura que friends_since_date seja offset-aware
    if friends_since_date.tzinfo is None or friends_since_date.tzinfo.utcoffset(friends_since_date) is None:
        friends_since_date = friends_since_date.replace(tzinfo=timezone.utc)

    # Pega a data e hora atual como offset-aware
    current_date = datetime.now(timezone.utc)


    # Calcula a diferença
    time_difference = current_date - friends_since_date


    return time_difference

def format_time_difference(time_difference):
    # Extrai dias e horas
    days = time_difference.days
    hours = time_difference.seconds // 3600  # converte segundos em horas

    # Formata a saída para mostrar dias e horas
    return f"{days} days and {hours} hours"

def get_summoner_id(gift_info, receiver_riotId):

    for friend in gift_info['friends']:
        
        #print(f"\n Comparing {friend['nick']} with {new_transaction["receiver"]} ")
        friend_key = friend['nick'].replace(" ", "").lower()

        if friend_key == receiver_riotId.replace(" ", "").lower():
            found_flag = True
            if friend['friendsSince'] is None or friend['friendsSince'] == "":
                return "No Time"
            else:
                summonerId = friend['summonerId']
                return summonerId
    
    return "Not giftable"



async def fetch_catalog_with_token(lol_token, region='RU', lang='en'):
    auth = RiotAuth('catalog_user', 'dummy', None, lol_token=lol_token)
    auth.region = region
    auth.locale = 'en_US' if lang == 'en' else 'pt_BR'
    auth.league_edge_url, _ = auth.get_league_urls()
    if not auth.league_edge_url:
        auth.league_edge_url = "na-red.lol.sgp.pvp.net"

    await auth.set_lol_version()
    await auth.get_catalog()

    if auth.catalog_map:
        out_file = 'catalog_cache_en.json' if lang == 'en' else 'catalog_cache_pt.json'
        with open(out_file, 'w', encoding='utf-8', errors='ignore') as f:
            json.dump(auth.catalog_map, f)
        await load_catalog()
        await auth.close_resources()
        return True, len(auth.catalog_map)
    await auth.close_resources()
    return False, 0


@app.route('/update-catalog', methods=['POST'])
async def update_catalog():
    api_key = request.headers.get('x-api-key')
    if api_key != API_KEY:
        return jsonify({"message": "Unauthorized"}), 401

    data = request.json or {}
    lol_token = data.get('lol_token')
    region = data.get('region', 'RU')
    lang = data.get('lang', 'en')

    if lol_token:
        success, count = await fetch_catalog_with_token(lol_token, region=region, lang=lang)
        if success:
            return jsonify({"status": "success", "message": f"Catalog updated via provided token ({count} categories)"}), 200
        else:
            return jsonify({"status": "error", "message": "Failed to fetch catalog with provided token"}), 400

    await fetch_catalogs(lang=lang)
    return jsonify({"message": "Catalog updated successfully"}), 200


@app.route('/get-catalog')
@jwt_required()
def get_catalog():
    lang = request.args.get('lang', 'pt')
    if lang == 'en':
        return jsonify(catalog_cache_en)
    return jsonify(catalog_cache_pt)


###############################################################################################################################################################################################
###############################################################################################################################################################################################
###############################################################################################################################################################################################
###############################################################################################################################################################################################
###############################################################################################################################################################################################



async def check_pending_orders():

    '''
    print(f"\n Checking awaiting orders...")
    awaiting_transactions = transactions_collection.find({
    'status': 'Awaiting',
    'date_check': {'$lt': datetime.now(timezone.utc)},
    'retry': {'$lt': 2}
    })
    for transaction in awaiting_transactions:
        await updating_order(transaction)
    '''





    print(f"\n Checking pending orders...")
    pending_transactions = transactions_collection.find({
    'status': 'Pending',
    'date_finished': {'$lt': datetime.now(timezone.utc)},
    'retry': {'$lt': 5}
    })
    for transaction in pending_transactions:
        await send_gift_order(transaction)











async def updating_order(transaction):
    logger.info("Checking awaiting orders...")

    transaction_id = str(transaction["_id"])
    sender = transaction["sender"]
    sender_pass = transaction["sender_pass"]
    receiver = transaction["receiver"]
    receiver_puuid = transaction["receiver_puuid"]
    retry = transaction["retry"]
    user_id = transaction["user"]

    logger.info("Try checking order id: %s", transaction_id)

    retry = transaction["retry"]


    user_id = transaction["user"]

    try:
        auth = None
        # Recupera ou cria um novo objeto RiotAuth
        with auth_lock:
            auth = auth_objects.get(user_id)

            if auth and (auth.username == sender and auth.password == sender_pass):
                print("\n Credenciais de auth ja encontradas, reiniciando objeto auth \n")
                # Se credenciais são as mesmas, reinicia o objeto Auth
            elif auth:
                print("\n Objeto auth encontrado, porem com credenciais diferentes \n")
                # Se credenciais são diferentes, fecha recursos e cria um novo objeto
                del auth_objects[user_id]
            else:
                print("\n Objeto auth não encontrado, criando novas credenciais \n")
                # Se não existe objeto Auth, cria um novo
            
            auth = RiotAuth(sender, sender_pass)
            auth_objects[user_id] = auth


        auth_res = None

        max_attempts=10

        for attempt in range(max_attempts):
            auth_res = await auth.initialize(catalog=False)
            if auth_res == "Wrong credentials: Invalid username or password":
                print("\n Falha na autenticação: credenciais inválidas.")
                break  # Sai do loop se as credenciais estiverem incorretas
            if auth.auth_result:
                print("\n Autenticação bem-sucedida.")
                break  # Sai do loop se a autenticação for bem-sucedida
            else:
                print(f"\n Tentativa {attempt + 1} falhou, tentando novamente...")

        if not auth.auth_result:
            print("\n Todas as tentativas de autenticação falharam.")

        
        if auth.auth_result:
            print(f"\n Authenticated as {sender}")

            ChatXmpp = RiotChatClient(auth.chat_uri, auth.chat_dom, 5223, 1)


            friend_task = 'friend_request'
            friend_id = None
            friend_id_list = None

            name = transaction["receiver_name"]
            tag = transaction["receiver_tag"]

            ChatXmpp.friend_result = await ChatXmpp.Initialize_friend_request(name, tag, auth.lol_token, auth.chat_dom, auth.geopas_token, task=friend_task, id=friend_id , id_list=friend_id_list)

            if ChatXmpp.friend_result == "The player is already added to the friends list":

                receiver_puuid = ChatXmpp.receiver_puuid
                region = auth.region

                if auth.region == "BR1":
                    #date_finished = date_order + dt.timedelta(days=14, hours=0, minutes=10)
                    time_delta = timedelta(days=14)
                else:
                    #date_finished = date_order + dt.timedelta(days=1, hours=0, minutes=10)
                    #time_delta = timedelta(hours=1)
                    time_delta = timedelta(days=7)


                date_finished = datetime.now(timezone.utc) + time_delta


                transactions_collection.update_one({"_id": ObjectId(transaction_id)}, {"$set": {"receiver_puuid": receiver_puuid,"date_finished": date_finished, "status": "Pending", "server": region}})


                logger.info(f"\n Transaction registered successfully from {sender} to {receiver}")
                with app.app_context():
                    return jsonify({"status": "success", "message": "Order registered successfully"}), 200
            
            else:
                logger.info(f"\n Chat friend result: {ChatXmpp.friend_result}")

                date_check = datetime.now(timezone.utc) + timedelta(hours=1)
                transactions_collection.update_one({"_id": ObjectId(transaction_id)}, {"$set": {"date_check": date_check}})

                logger.info(f"\n Transaction is awaiting from {sender} to {receiver}")
                with app.app_context():
                    return jsonify({"status": "success", "message": "Order is still awaiting"}), 200

        elif 'Wrong credentials' in auth_res:
            logger.error("Error: %s", auth_res)
            transactions_collection.update_one({"_id": ObjectId(transaction_id)}, {"$set": {"retry": 2}})

            with app.app_context():
                return jsonify({"status": "error", "message": f"{auth_res}"}), 401
        
        else:
            logger.error("Error: %s", auth_res)
            #retry+=1
            #transactions_collection.update_one({"_id": ObjectId(transaction_id)}, {"$set": {"retry": retry}})
            with app.app_context():
                return jsonify({"status": "error", "message": "Unknown error on authentication"}), 401
        

    except ClientResponseError as e:
        logger.error("ClientResponseError on authentication: %s", str(e))
        #retry+=1
        #transactions_collection.update_one({"_id": ObjectId(transaction_id)}, {"$set": {"retry": retry}})
        with app.app_context():
            return jsonify({"status": "error", "message": f"Client response error: {e.message}", "url": str(e.request_info.url)}), 500 
        
    except Exception as e:
            logger.error("Error on authentication: %s", str(e))
            #retry+=1
            #transactions_collection.update_one({"_id": ObjectId(transaction_id)}, {"$set": {"retry": retry}})
            with app.app_context():
                return jsonify({"status": "error", "message": "Internal Server Error", "exception": e}), 500
    finally:

        if retry==2:
            transactions_collection.update_one({"_id": ObjectId(transaction_id)}, {"$set": {"status": "Failed"}})

        if auth is not None:
            await auth.close_resources()








async def send_gift_order(transaction):

    logger.info("Starting sending gift order...")

    transaction_id = str(transaction["_id"])
    sender = transaction["sender"]
    sender_pass = transaction["sender_pass"]
    receiver = transaction["receiver"]
    receiver_puuid = transaction["receiver_puuid"]
    gift_message = transaction["gift_message"]
    item_name = transaction["item_name"]
    item_price = transaction["item_price"]
    item_offerid = transaction["item_offerid"]
    server = transaction["server"]
    date_finished = transaction["date_finished"]

    
    item_id = transaction.get("item_id")
    inventory_type = transaction.get("inventory_type")

    logger.info("Try sending order id: %s", transaction_id)

    retry = transaction["retry"]

    user_id = transaction["user"]


    try:

        userpass_value = f'{sender}:{sender_pass}'

        captcha_key_document = captcha_collection.find_one({"user_api": user_id})

        if captcha_key_document:
            user_captcha_key = captcha_key_document['captcha_key']
        else:
            retry=5
            transactions_collection.update_one({"_id": ObjectId(transaction_id)}, {"$set": {"retry": retry}})
            with app.app_context():
                return jsonify({"status": "error", "message": "Captcha key not found"}), 404


        captcha_response = await captcha_solver_login(captcha_solver_key=user_captcha_key, userpass=userpass_value)

        print(captcha_response)


        # Recuperar cookies mongodb
            
        tokens_document = account_tokens.find_one({'userpass': userpass_value})

        cookies = aiohttp.CookieJar(unsafe=True)

        if tokens_document and 'cookies' in tokens_document:
            database_cookies = tokens_document.get('cookies')
            #logger.info(f"\n Updating Cookies \n")
            print("update cookies ok")

            for cookie_name, value in database_cookies.items():
                cookies.update_cookies({cookie_name: value})

        auth_res = None
        max_attempts=1

        auth = RiotAuth(sender, sender_pass, cookies, captcha_response)
        auth_res = await auth.initialize(catalog=False)

        
        if auth.auth_result:
            print(f"\n Authenticated as {sender}")

            '''
            if server != 'BR1':
                logger.info("\n Server gringo")
                found_flag = False
                gift_info = await auth.friendlist_gift_info()
                for friend in gift_info['friends']:      
                    #print(f"\n Comparing {friend['nick']} with {receiver} ")
                    friend_key = friend['nick'].replace(" ", "").lower()
                    if friend_key == receiver.replace(" ", "").lower():
                        found_flag = True
                        break

                if not found_flag:
                    logger.info("\n Ainda não é possível executar a order (<24h)")

                    date_finished = date_finished + dt.timedelta(days=0, hours=1, minutes=0, seconds=0)
                    transactions_collection.update_one({"_id": ObjectId(transaction_id)}, {"$set": {"date_finished": date_finished}})
                    with app.app_context():
                        return jsonify({"status": "error", "message": "Not giftable yet (Less than 24h friendship)"}), 401
                    '''



            Giftobj = Gift(auth)
            logger.info(f"\n Attempting to deliver gift order: {transaction_id}")
            logger.info(f"\n Sender: {sender} ({auth.riotId}) ({server})\n Receiver RiotId: {receiver} \n Receiver Puuid: {receiver_puuid} \n Item name: {item_name} ({item_price}) \n Item OfferId: {item_offerid} \n Gift Message: {gift_message}")




            if auth.region == 'ASDASDASDAS':
                
                gift_info = await auth.friendlist_gift_info()
                receiver_summoner_id = get_summoner_id(gift_info, receiver)

                await Giftobj.send_gift_v3(auth, receiver_summoner_id, item_id, item_price,inventory_type, gift_message) 
            else:
                await Giftobj.send_gift(auth, receiver_puuid, item_offerid, gift_message)
            

            await asyncio.sleep(3)
            new_saldo = await auth.get_saldo_rp()
            
            if new_saldo<auth.rp_amount:
                rp_spent = auth.rp_amount - new_saldo
                logger.info(f"\n Gift bem sucedido \n Sender: {sender} ({auth.riotId}) \n Receiver: {receiver} \n Item: {item_name} \n Spend: {rp_spent}, New balance: {new_saldo}")

                transactions_collection.update_one({"_id": ObjectId(transaction_id)}, {"$set": {"status": "Completed"}})


                transaction["status"] = "Completed"

                if transaction["user"] not in ['domas', 'elogator']:
                    transaction.pop('sender_pass', None)

                transaction.pop('retry', None)

                gift_log.insert_one(transaction)
                

                with app.app_context():
                    return jsonify({"status": "success", "message": "Gift sent successfully", "saldo": new_saldo, "rp_spent": rp_spent }), 200
            else:
                logger.error("Falha ao enviar presente")
                retry+=1
                transactions_collection.update_one({"_id": ObjectId(transaction_id)}, {"$set": {"retry": retry}})
                with app.app_context():
                    return jsonify({"status": "error", "message": "Failed to send gift"}), 401
            
        elif 'Wrong credentials' in auth_res:
            logger.error("Error: %s", auth_res)
            retry+=3
            transactions_collection.update_one({"_id": ObjectId(transaction_id)}, {"$set": {"retry": retry}})

            with app.app_context():
                return jsonify({"status": "error", "message": f"{auth_res}"}), 401
        
        else:
            logger.error("Error: %s", auth_res)
            retry+=1
            transactions_collection.update_one({"_id": ObjectId(transaction_id)}, {"$set": {"retry": retry}})
            with app.app_context():
                return jsonify({"status": "error", "message": "Unknown error on authentication"}), 401
        

    except ClientResponseError as e:
        logger.error("ClientResponseError on authentication: %s", str(e))
        retry+=1
        transactions_collection.update_one({"_id": ObjectId(transaction_id)}, {"$set": {"retry": retry}})
        with app.app_context():
            return jsonify({"status": "error", "message": f"Client response error: {e.message}", "url": str(e.request_info.url)}), 500 
        
    except Exception as e:
            logger.error("Error on authentication: %s", str(e))
            retry+=1
            transactions_collection.update_one({"_id": ObjectId(transaction_id)}, {"$set": {"retry": retry}})
            with app.app_context():
                return jsonify({"status": "error", "message": "Internal Server Error", "exception": e}), 500
    finally:

        if retry>=5:
            transactions_collection.update_one({"_id": ObjectId(transaction_id)}, {"$set": {"status": "Failed"}})

        if auth is not None:
            await auth.close_resources()
        if Giftobj is not None:
            await Giftobj.session.close()
            await Giftobj.tcp_connector.close()


###############################################################################################################################################################################################
###############################################################################################################################################################################################

async def create_session(header):
    # Cria um identificador único
    
    # Cria o conector e a sessão
    Connector = aiohttp.TCPConnector(ssl=RiotAuth.create_riot_auth_ssl_ctx())

    cookie_jar = aiohttp.CookieJar(unsafe=True)

    cookie_jar.clear()

    Session = aiohttp.ClientSession(connector=Connector,raise_for_status=True,cookie_jar=cookie_jar, headers=header)

    session_id= str(uuid.uuid4())

    session_objects[session_id] = (Session, Connector)
    
    # Retorna o ID da sessão para o frontend
    return session_id

async def close_session(session_id):
    # Fecha a sessão e remove-a do dicionário
    if session_id in session_objects:
        session, connector = session_objects.pop(session_id)
        await session.close()
        await connector.close()



@app.route('/get-auth-captcha', methods=['POST'])
@jwt_required()
async def handle_captcha():
    try:
        logger.info("\n Iniciando captcha")

        current_identity = get_jwt_identity()  # Isso deve retornar uma lista como ["fourier", "socafofo"]
        if current_identity:

            valid, error_response, status_code = validate_session(current_identity)
            if valid is not True:
                return error_response, status_code  # Retorna o erro se a sessão for inválida

            user_id = current_identity[0]  # Assumindo que o nome do usuário está no primeiro índice
            key = current_identity[1]  # Obtendo a chave do token JWT



        new_port = random.randint(10000, 19998)
        proxy_url = f'http://{PROXY_LOGIN}:{PROXY_PASSWORD}@{PROXY_ADDRESS}:{new_port}'


        '''async with Session.get("https://valorant-api.com/internal/ritoclientversion") as response:
            versions = await response.json()
            Version_riotClientBuild = versions['data']['userAgentVersion']
            sdk_version = versions['data']['riotGamesApiInfo']['VS_FIXEDFILEINFO']['FileVersion']'''
        



        setup_header = {
            #"User-Agent": f"RiotClient/{version_riotClientBuild} rso-auth (Windows;10;;Professional, x64)",
            "User-Agent": f"ASSDSAD46SA5DAS DAS65D4AS DAS5D4AS564DAS",
            "Cache-Control": "no-cache",
            "Accept": "application/json",
            "Content-Type": "application/json"
        }

        session_id = await create_session(setup_header)

        Session, Connector = session_objects[session_id]

        # Check token expiration from database

        data = request.json

        userpass_value = data.get('userpass')

        tokens_document = account_tokens.find_one({'userpass': userpass_value})

        current_timestamp = time.time()

        if tokens_document:
            expire_time_lol = tokens_document.get('lol_token_expire')
            if expire_time_lol and expire_time_lol - 60 > current_timestamp:
                return jsonify({"status": "success", "message": "Already authenticated", "auth": True, "session_id": session_id}), 200



        setup_body = {
            "client_id": "lol",
            "nonce": token_urlsafe(16),
            "redirect_uri": "http://localhost/redirect",
            "response_type": "token id_token",
            "scope": "account openid",
        }

        post_args = {
            'url': "https://auth.riotgames.com/api/v1/authorization",
            'json': setup_body,
            'headers': setup_header,
            'proxy': proxy_url if proxy_url else ""
        }

        async with Session.post(**post_args) as r:
            response = await r.json()
            print(f"\nInit auth flow: {response}")

        ##### Captcha

        get_captcha_body = {
            "clientId": "riot-client",
            "language": "en_GB",
            "platform": "web",
            "remember": False,
            "riot_identity": {
                "language": "en_GB",
                "state": "auth",
            },
            "sdkVersion": sdk_version,
            "type": "auth",
        }


        post_args = {
            'url': "https://authenticate.riotgames.com/api/v1/login",
            'json': get_captcha_body,
            'headers': setup_header,
            'proxy': proxy_url if proxy_url else ""
        }


        #print(post_args)
        async with Session.post(**post_args) as r:
        #async with Session.get(**post_args) as r:
            token = None
            key = None
            captcha_response = await r.json()
            print(f"\n captcha response: {captcha_response}")
            token = captcha_response["captcha"]["hcaptcha"]["data"]
            key = captcha_response["captcha"]["hcaptcha"]["key"]
            cookie_jar = Session.cookie_jar

            cookies_dict = {cookie.key: cookie.value for cookie in cookie_jar}

            print(f"\n cookies dict: {cookies_dict}")


            result = account_tokens.update_one(
                    {'userpass': userpass_value},  # condição de busca
                    {'$set': {'cookies': cookies_dict, 'proxy_url': proxy_url}},  # operação de atualização
                    upsert=True  # inserir se não existir
                    )

        if key and token:
            return jsonify({"status": "success", "message": "Captcha token get successfully", "auth": False, "token": token, "key": key, "session_id": session_id}), 200
        else:
            await close_session(session_id)
            return jsonify({"status": "error", "message": "Error on fetching captcha token"}), 401

    except aiohttp.ClientResponseError as e:
        print(f"Erro na resposta do cliente: {e}")
        return jsonify({"status": "error", "message": f"Error on fetching captcha token: {e}"}), 401


    except Exception as e:
        await close_session(session_id)
        return jsonify({"status": "error", "message": f"Error on fetching captcha token: {e}"}), 401
    
    finally:
        print("end")
        await close_session(session_id)
        logger.info("\n Finalizando captcha")



async def update_version_document():
    # Criar um cliente HTTP assíncrono
    async with httpx.AsyncClient(timeout=httpx.Timeout(10.0)) as client:
        # Fazer a requisição GET
        response = await client.get("https://valorant-api.com/internal/ritoclientversion")
        if response.status_code == 200:
            versions = response.json()
            version_riotClientBuild = versions['data']['userAgentVersion']
            sdk_version = versions['data']['riotGamesApiInfo']['VS_FIXEDFILEINFO']['FileVersion']
        else:
            print("\n Failed to fetch versions")
            


    # Criar ou atualizar o documento na coleção
    riotClientdocument = {
        "name": "riotClientBuild",
        "version": version_riotClientBuild
    }

    result1 = versions_collection.update_one(
        {"name": "riotClientBuild"},
        {"$set": riotClientdocument},
        upsert=True
    )

    sdkdocument = {
        "name": "sdk",
        "version": sdk_version
    }

    result2 = versions_collection.update_one(
        {"name": "sdk"},
        {"$set": sdkdocument},
        upsert=True
    )

    '''# Criar um cliente HTTP assíncrono
    async with httpx.AsyncClient(timeout=httpx.Timeout(10.0)) as client:
        # Fazer a requisição GET
        response = await client.get("https://authenticate.riotgames.com/api/v1/login")
        if response.status_code == 200:
            data = response.json()
            # Extrair o campo de chave do hCaptcha
            hcaptcha_key = data['captcha']['hcaptcha']['key']
            print(f"\n hCaptcha Key: {hcaptcha_key}")

            
        else:
            print("\n Failed to fetch hCaptcha key")
            
    

    # Criar ou atualizar o documento na coleção
    hcaptcha_riot_key = {
        "name": "hcaptcha_key",
        "key": hcaptcha_key
    }
    

    result3 = versions_collection.update_one(
    {"name": "hcaptcha_key"},
    {"$set": hcaptcha_riot_key},
    upsert=True
    )

    print("\n Updated versions")'''





async def captcha_solver_login(captcha_solver_key, userpass):

    try:
        new_port = random.randint(10000, 19998)
        proxy_url = f'http://{PROXY_LOGIN}:{PROXY_PASSWORD}@{PROXY_ADDRESS}:{new_port}'

        setup_header = {
        #"User-Agent": f"RiotClient/{version_riotClientBuild} rso-auth (Windows;10;;Professional, x64)",
        'User-Agent': "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        "Cache-Control": "no-cache",
        "Accept": "application/json",
        "Content-Type": "application/json"
        }

        session_id = await create_session(setup_header)

        Session, Connector = session_objects[session_id]

        # Check token expiration from database


        userpass_value = userpass

        tokens_document = account_tokens.find_one({'userpass': userpass_value})

        current_timestamp = time.time()

        if tokens_document:
            expire_time_lol = tokens_document.get('lol_token_expire')
            if expire_time_lol and expire_time_lol - 60 > current_timestamp:
                return 'Authenticated'



        setup_body = {
            "client_id": "lol",
            "nonce": token_urlsafe(16),
            "redirect_uri": "http://localhost/redirect",
            "response_type": "token id_token",
            "scope": "account openid",
        }

        post_args = {
            'url': "https://auth.riotgames.com/api/v1/authorization",
            'json': setup_body,
            'headers': setup_header,
            'proxy': proxy_url if proxy_url else ""
        }

        async with Session.post(**post_args) as r:
            response = await r.json()
            print(f"\nInit auth flow: {response}")


        get_captcha_body = {
            "clientId": "riot-client",
            "language": "",
            "platform": "web",
            "remember": True,
            "riot_identity": {
                "language": "en_GB",
                "state": "auth",
            },
            "sdkVersion": sdk_version,
            "type": "auth",
        }


        post_args = {
            'url': "https://authenticate.riotgames.com/api/v1/login",
            'json': get_captcha_body,
            'headers': setup_header,
            'proxy': proxy_url if proxy_url else ""
        }


        #print(post_args)

        async with Session.post(**post_args) as r:
            cookie_jar = Session.cookie_jar
            captcha_response = await r.json()
            print(f"\n captcha response: {captcha_response}")
            rqDataValue = captcha_response["captcha"]["hcaptcha"]["data"]
            site_key = captcha_response["captcha"]["hcaptcha"]["key"]


        #cookie_jar = Session.cookie_jar

        cookies_dict = {cookie.key: cookie.value for cookie in cookie_jar}


        result = account_tokens.update_one(
                {'userpass': userpass_value},  # condição de busca
                {'$set': {'cookies': cookies_dict, 'proxy_url': proxy_url}},  # operação de atualização
                upsert=True  # inserir se não existir
                )
        


        headers = {"Content-Type": "application/json"}

        captcha_solver_key = '299fbccc536b3a4591f1a71f2df8200e'

        url = "https://api.2captcha.com/createTask"
        data = {
            "clientKey": captcha_solver_key,
            "task": {
                "type": "HCaptchaTaskProxyless",
                "websiteURL": "https://authenticate.riotgames.com/api/v1/login",
                "websiteKey": site_key,
                "isInvisible": True,
                "data": rqDataValue
            }
        }

        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=data, headers=headers) as response:
                try:
                    task_response = await response.json()
                    print("CapMonster createTask response:", task_response)
                except aiohttp.ContentTypeError:
                    resp_text = await response.text()
                    print(f"create task response is not json: {resp_text}")
                    task_response = json.loads(resp_text)

        if task_response.get('errorId') == 0:
            task_id = task_response['taskId']
            data_res = {
                "clientKey": captcha_solver_key,
                "taskId": task_id
            }
            res_url = "https://api.2captcha.com/getTaskResult"
            i = 1
        
            async with aiohttp.ClientSession() as session:
                while True:
                    async with session.post(res_url, json=data_res, headers=headers) as response:
                        try: get_task_result = await response.json()
                        except Exception: get_task_result = json.loads(await response.text())

                        if get_task_result.get('status') == 'processing':
                            if i > 60: # Timeout de 5 minutos (60 attempts * 5 seconds)
                                print("❌ Tempo limite excedido aguardando CapMonster.")
                                break
                            await asyncio.sleep(5)
                            print(f"Aguardando resolução do Captcha (CapMonster)... [{i}]")
                            i += 1
                        else:
                            if get_task_result.get('status') == 'ready':
                                print("✅ Captcha resolvido pelo CapMonster com sucesso!")
                                break
                            elif get_task_result.get('errorId', 0) != 0:
                                print(f"Erro no CapMonster: {get_task_result}")
                                break

        solution = get_task_result.get('solution', {})
        captcha_token = solution.get('gRecaptchaResponse') or solution.get('token')
        return captcha_token

    except aiohttp.ClientResponseError as e:
        return f'Captcha response Exception: {e}'


    except Exception as e:
        await close_session(session_id)
        return f'Exception: {e}'
    
    finally:
        await close_session(session_id)
        logger.info("\n Finalizando captcha solver")



@app.route("/save-user-captcha", methods=["POST"])
@jwt_required()  # Garante que o endpoint requer um JWT válido
def save_user_captcha():
    try:
        # Obtém a identidade do JWT
        current_identity = get_jwt_identity()
        login, key, session_id = current_identity

        # Obtém o texto do captcha do corpo da requisição
        captcha_key = request.json.get('captchaKey')

        # Cria ou atualiza um documento com o texto do captcha e informações do usuário
        captcha_collection.update_one(
            {'user_api': login, 'key_api': key},  # condição de busca
            {'$set': {'captcha_key': captcha_key}},  # operação de atualização
            upsert=True  # inserir se não existir
        )

        return jsonify({"message": "Captcha saved successfully"}), 200

    except PyMongoError as e:
        return jsonify({"error": "Database error", "message": str(e)}), 500
    except Exception as e:
        return jsonify({"error": "Server error", "message": str(e)}), 500

        
@app.route("/send-rp-gift", methods=["POST"])
@jwt_required()
async def send_rp_method():
    try: 
        current_identity = get_jwt_identity()  # Isso deve retornar uma lista como ["fourier", "socafofo"]
        if current_identity:

            valid, error_response, status_code = validate_session(current_identity)
            if valid is not True:
                return error_response, status_code  # Retorna o erro se a sessão for inválida

            user_id = current_identity[0]  # Assumindo que o nome do usuário está no primeiro índice
            key = current_identity[1]  # Obtendo a chave do token JWT

        data = request.json

        username = data.get("username"); password =  data.get("password")

        receiver_id = data.get("receiver_id")


        cookies = aiohttp.CookieJar(unsafe=True)
        

        auth_res = None
        max_attempts=1

        for attempt in range(max_attempts):
            auth = RiotAuth(username, password, cookies)
            auth_res = await auth.initialize(catalog=False)
            if auth_res == "Wrong credentials: Invalid username or password":
                print("\n Falha na autenticação: credenciais inválidas.")
                break  # Sai do loop se as credenciais estiverem incorretas
            if auth.auth_result:
                print("\n Autenticação bem-sucedida.")
                break  # Sai do loop se a autenticação for bem-sucedida
            else:
                print(f"\n Tentativa {attempt + 1} falhou, tentando novamente...")
                await auth.close_resources()
        
        if auth.auth_result:

            Giftobj = Gift(auth)

            gift_rp_response = await Giftobj.send_rp(receiver_id)

            return jsonify({"status": "success", "message": f"{gift_rp_response}", "account": f"{username}"}), 200


        elif isinstance(auth_res, str) and 'Wrong credentials' in auth_res:
            print(f"Error: {auth_res}")
            return jsonify({"status": "error", "message": f"{auth_res}"}), 401
        else:
            print(f"Error: {auth_res}")
            return jsonify({"status": "error", "message": "Unknown error on authentication"}), 401
    except ClientResponseError as e:
        print(f"ClientResponseError on authentication: {e}")
        return jsonify({"status": "error", "message": f"Client response error: {e.message}", "url": str(e.request_info.url)}), 500 
    except Exception as e:
            print(f"Error on authentication: {e}")
            return jsonify({"status": "error", "message": "Internal Server Error", "exception": str(e)}), 500
    
    finally:
        if auth is not None:
            await auth.close_resources()
        if Giftobj is not None:
            await Giftobj.session.close()
            await Giftobj.tcp_connector.close()



@app.route("/documentos/carteira_estudante/<institution>/<name>/<code>", methods=["GET"])
def load_carteira(institution, name, code):
        
        nome_formatado = name.replace('_', ' ')
        
        data_atual = datetime.now()
        ano_atual = data_atual.year
        data_referencia = datetime(ano_atual, 3, 31)
        if data_atual <= data_referencia:
            validade = data_referencia
        else:
            validade = datetime(ano_atual + 1, 3, 31)
        return render_template(
        'style2/est.html',
        universidade=institution,
        nome=nome_formatado,
        codigo_uso =code,
        data=validade.strftime('%d/%m/%Y')
    )













@app.route('/auth_2captcha', methods=['POST'])
@jwt_required()
async def auth_capsolver():
    try:

        auth = None
        Giftobj = None

        current_identity = get_jwt_identity()  # Isso deve retornar uma lista como ["fourier", "socafofo"]
        if current_identity:

            valid, error_response, status_code = validate_session(current_identity)
            if valid is not True:
                return error_response, status_code  # Retorna o erro se a sessão for inválida

            user_id = current_identity[0]  # Assumindo que o nome do usuário está no primeiro índice
            key = current_identity[1]  # Obtendo a chave do token JWT


        data = request.json


        username = data.get("username"); password =  data.get("password")

        userpass_value = f'{username}:{password}'

        captcha_key_document = captcha_collection.find_one({"user_api": user_id})

        if captcha_key_document:
            user_captcha_key = captcha_key_document['captcha_key']
        else:
            return jsonify({"status": "error", "message": "Captcha key not found"}), 404


        captcha_response = await captcha_solver_login(captcha_solver_key=user_captcha_key, userpass=userpass_value)

        #print(captcha_response)
        logger.info(captcha_response)

        if 'Exception' in captcha_response:
            return jsonify({"error": "Error on getting Captcha ", "message": captcha_response}), 500





        # Recuperar cookies mongodb
            
        tokens_document = account_tokens.find_one({'userpass': userpass_value})

        cookies = aiohttp.CookieJar(unsafe=True)

        if tokens_document and 'cookies' in tokens_document:
            database_cookies = tokens_document.get('cookies')
            #logger.info(f"\n Updating Cookies \n")
            print("update cookies ok")

            for cookie_name, value in database_cookies.items():
                cookies.update_cookies({cookie_name: value})

        auth_res = None
        max_attempts=1

        auth = RiotAuth(username, password, cookies, captcha_response)
        auth_res = await auth.initialize(catalog=False)



        if auth.auth_result:
            return jsonify({"status": "success", "message": f"Authenticated as {username} Lv {auth.summnerLevel} {auth.riotId} ({auth.region})"}), 200

        elif isinstance(auth_res, str) and 'Wrong credentials' in auth_res:
            print(f"Error: {auth_res}")
            return jsonify({"status": "error", "message": f"{auth_res}"}), 401
        else:
            print(f"Error: {auth_res}")
            return jsonify({"status": "error", "message": "Unknown error on authentication"}), 401
    

    except Exception as e:
        return jsonify({"error": "Server error", "message": str(e)}), 500
    
    finally:
        if auth is not None:
            await auth.close_resources()





scheduler = APScheduler()

#scheduler = AsyncIOScheduler()

with app.app_context():
    #loop = asyncio.get_event_loop()
    
    #loop.run_until_complete(load_catalog())
    
    #asyncio.run(update_version_document())
    asyncio.run(load_catalog())
    
    #asyncio.run(fetch_catalogs())
    #scheduler.add_job(func=lambda: run(check_pending_orders()), trigger='interval', minutes=3, id='orders_check_job')
    #scheduler.add_job(func=lambda: run(fetch_catalogs()), trigger='interval', minutes=15, id='catalog_fetch_job')'
    
    scheduler.start()

if __name__ == "__main__":
    #scheduler = AsyncIOScheduler()
    #scheduler.configure(executors={'default': AsyncIOExecutor()})
    #scheduler.add_job(func=check_pending_orders, trigger='interval', seconds=10, id='orders_check_job')
    #scheduler.add_job()
    #scheduler.start()
    #asyncio.run(scheduler.start())
    #scheduler.add_job(func=lambda: run(check_pending_orders()), trigger='interval', seconds=15, id='orders_check_job')
    #scheduler.add_job(func=lambda: run(fetch_catalogs()), trigger='interval', minutes=15, id='catalog_fetch_job')
    #scheduler.start()

    app.run(debug=False, use_reloader=False, host="127.0.0.1", port=5000)