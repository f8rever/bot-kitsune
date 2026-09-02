const fs = require('fs');
const path = require('path');
const axios = require('axios');

const POOL_PATH = path.join(__dirname, '../config/captcha_keys_pool.json');
const CONFIG_PATH = path.join(__dirname, '../config/captcha_config.json');

/**
 * Retorna a fila ordenada de chaves de captcha ativas (do maior saldo para o menor)
 */
function getCaptchaKeysQueue() {
    try {
        if (fs.existsSync(POOL_PATH)) {
            const data = JSON.parse(fs.readFileSync(POOL_PATH, 'utf8'));
            if (data.queue && Array.isArray(data.queue) && data.queue.length > 0) {
                return data.queue.sort((a, b) => b.balance - a.balance);
            }
        }
        if (fs.existsSync(CONFIG_PATH)) {
            const conf = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
            if (conf.key) return [conf];
        }
    } catch (e) {
        console.error('[CaptchaManager Error] Falha ao ler pool de chaves:', e.message);
    }
    return [{ provider: '2Captcha', key: '299fbccc536b3a4591f1a71f2df8200e', balance: 290.47 }];
}

/**
 * Retorna a chave com maior saldo disponível atualmente
 */
function getBestCaptchaKey() {
    const queue = getCaptchaKeysQueue();
    return queue[0] || { provider: '2Captcha', key: '299fbccc536b3a4591f1a71f2df8200e', balance: 290.47 };
}

/**
 * Consulta o saldo atualizado de uma chave no 2Captcha
 */
async function get2CaptchaBalance(key) {
    try {
        const res = await axios.get(`https://2captcha.com/res.php?key=${key}&action=getbalance&json=1`, { timeout: 4000 });
        if (res.data && res.data.status === 1) {
            return parseFloat(res.data.request);
        }
    } catch (e) {}
    return null;
}

module.exports = {
    getCaptchaKeysQueue,
    getBestCaptchaKey,
    get2CaptchaBalance
};
