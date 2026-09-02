import json
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_DIR = os.path.join(BASE_DIR, '..', 'config')
POOL_PATH = os.path.join(CONFIG_DIR, 'captcha_keys_pool.json')
CONFIG_PATH = os.path.join(CONFIG_DIR, 'captcha_config.json')

DEFAULT_KEY = {
    'provider': '2Captcha',
    'key': '299fbccc536b3a4591f1a71f2df8200e',
    'balance': 290.47
}

def get_captcha_keys_queue():
    """
    Retorna a fila ordenada de chaves de Captcha ativas (do maior para o menor saldo).
    """
    try:
        if os.path.exists(POOL_PATH):
            with open(POOL_PATH, 'r', encoding='utf-8') as f:
                data = json.load(f)
                queue = data.get('queue', [])
                if queue:
                    return sorted(queue, key=lambda x: x.get('balance', 0), reverse=True)
        if os.path.exists(CONFIG_PATH):
            with open(CONFIG_PATH, 'r', encoding='utf-8') as f:
                conf = json.load(f)
                if conf.get('key'):
                    return [conf]
    except Exception as e:
        print(f"[CaptchaManager Error] Falha ao ler pool de chaves: {e}")
    return [DEFAULT_KEY]

def get_best_captcha_key():
    """
    Retorna a melhor chave (maior saldo disponível).
    """
    queue = get_captcha_keys_queue()
    if queue:
        return queue[0]
    return DEFAULT_KEY
