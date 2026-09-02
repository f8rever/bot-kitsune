require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');
const { saveBotConfigToMongo } = require('../utils/mongoStorage.js');

const uri = process.env.MONGO_URI || "mongodb+srv://monarch:dias1999@cluster0.zwknr9a.mongodb.net/gift_api_keys?retryWrites=true&w=majority&appName=Cluster0";

async function checkSingleKey(key) {
  // 1. Check 2Captcha first (most common format 32 hex chars)
  try {
    const res = await axios.get(`https://2captcha.com/res.php?key=${key}&action=getbalance&json=1`, { timeout: 4000 });
    if (res.data && res.data.status === 1) {
      const bal = parseFloat(res.data.request);
      if (!isNaN(bal) && bal > 0) {
        return { provider: '2Captcha', key, balance: bal, currency: 'USD' };
      }
    }
  } catch(e) {}

  // 2. Check CapMonster
  try {
    const res = await axios.post('https://api.capmonster.cloud/getBalance', { clientKey: key }, { timeout: 4000 });
    if (res.data && res.data.errorId === 0) {
      const bal = parseFloat(res.data.balance);
      if (!isNaN(bal) && bal > 0) {
        return { provider: 'CapMonster', key, balance: bal, currency: 'USD' };
      }
    }
  } catch(e) {}

  // 3. Check CapSolver
  try {
    const res = await axios.post('https://api.capsolver.com/getBalance', { clientKey: key }, { timeout: 4000 });
    if (res.data && res.data.errorId === 0) {
      const bal = parseFloat(res.data.balance);
      if (!isNaN(bal) && bal > 0) {
        return { provider: 'CapSolver', key, balance: bal, currency: 'USD' };
      }
    }
  } catch(e) {}

  // 4. Check Anti-Captcha
  try {
    const res = await axios.post('https://api.anti-captcha.com/getBalance', { clientKey: key }, { timeout: 4000 });
    if (res.data && res.data.errorId === 0) {
      const bal = parseFloat(res.data.balance);
      if (!isNaN(bal) && bal > 0) {
        return { provider: 'Anti-Captcha', key, balance: bal, currency: 'USD' };
      }
    }
  } catch(e) {}

  return null;
}

async function organizeCaptchaKeys() {
  console.log('🔍 Coletando todas as chaves de Captcha (cap_keys.txt e MongoDB)...');
  const keysToCheck = new Set();

  // 1. Ler cap_keys.txt
  const capKeysPath = path.join(__dirname, '../lol_giftapi-main/cap_keys.txt');
  if (fs.existsSync(capKeysPath)) {
    fs.readFileSync(capKeysPath, 'utf8').split(/\r?\n/).forEach(line => {
      const k = line.trim();
      if (k && k.length >= 20 && k.length <= 64 && !k.includes(' ')) {
        keysToCheck.add(k);
      }
    });
  }

  // 2. Ler MongoDB coleções de chaves antigas
  try {
    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db('gift_api_keys');

    const captchas = await db.collection('users_captcha').find({}).toArray();
    captchas.forEach(c => {
      if (c.captcha_key && typeof c.captcha_key === 'string' && c.captcha_key.length >= 20) keysToCheck.add(c.captcha_key.trim());
      if (c.key_api && typeof c.key_api === 'string' && c.key_api.length >= 20) keysToCheck.add(c.key_api.trim());
    });

    const usersKey = await db.collection('users_key').find({}).toArray();
    usersKey.forEach(u => {
      if (u.api_key && typeof u.api_key === 'string' && u.api_key.length >= 20) keysToCheck.add(u.api_key.trim());
    });

    await client.close();
  } catch (e) {
    console.warn('⚠️ Aviso ao buscar chaves adicionais do Mongo:', e.message);
  }

  console.log(`Encontradas ${keysToCheck.size} chaves únicas. Verificando saldos em paralelo...`);

  // Checar saldos em lotes de 10
  const keyList = Array.from(keysToCheck);
  const activeKeys = [];
  const chunkSize = 10;

  for (let i = 0; i < keyList.length; i += chunkSize) {
    const chunk = keyList.slice(i, i + chunkSize);
    const results = await Promise.all(chunk.map(checkSingleKey));
    results.forEach(res => {
      if (res && res.balance > 0) {
        activeKeys.push(res);
        console.log(`  [${res.provider}] ✅ Key: ${res.key.substring(0, 8)}...${res.key.substring(res.key.length - 4)} | Saldo: $${res.balance.toFixed(2)} USD`);
      }
    });
  }

  // Ordenar em ordem decrescente (do MAIOR saldo para o MENOR saldo)
  activeKeys.sort((a, b) => b.balance - a.balance);

  console.log('\n========================================');
  console.log(`🏆 RANKING DAS CHAVES ATIVAS (DO MAIOR PARA O MENOR SALDO):`);
  console.log('========================================');
  activeKeys.forEach((k, idx) => {
    console.log(`${idx + 1}º. [${k.provider}] $${k.balance.toFixed(2)} USD | Key: ${k.key}`);
  });

  const poolData = {
    updatedAt: new Date().toISOString(),
    totalActiveKeys: activeKeys.length,
    primaryKey: activeKeys[0] || null,
    queue: activeKeys
  };

  // 1. Salvar pool completo em config/captcha_keys_pool.json
  const poolPath = path.join(__dirname, '../config/captcha_keys_pool.json');
  fs.writeFileSync(poolPath, JSON.stringify(poolData, null, 2), 'utf8');
  console.log(`\n💾 Salvo em: config/captcha_keys_pool.json`);

  // 2. Salvar chave principal em config/captcha_config.json
  if (activeKeys.length > 0) {
    const configPath = path.join(__dirname, '../config/captcha_config.json');
    fs.writeFileSync(configPath, JSON.stringify(activeKeys[0], null, 2), 'utf8');
    console.log(`💾 Chave principal com maior saldo atualizada em: config/captcha_config.json`);
  }

  // 3. Salvar no MongoDB Atlas (kitsune_bot -> bot_configurations -> captcha_keys)
  try {
    await saveBotConfigToMongo('captcha_keys', poolData);
    console.log(`☁️ Pool ordenado de chaves sincronizado no MongoDB Atlas!`);
  } catch(e) {
    console.error('Erro ao sincronizar chaves no MongoDB Atlas:', e.message);
  }

  console.log('\n✅ Organização concluída com sucesso!');
  return poolData;
}

if (require.main === module) {
  organizeCaptchaKeys().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
  });
}

module.exports = { organizeCaptchaKeys };
