const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

const DEFAULT_MONGO_URI = "mongodb+srv://monarch:dias1999@cluster0.zwknr9a.mongodb.net/gift_api_keys?retryWrites=true&w=majority&appName=Cluster0";
const DB_NAME = "kitsune_bot";
const COLLECTION_NAME = "riot_accounts";

let mongoClient = null;
let dbInstance = null;
let isConnecting = false;

async function getDb() {
    if (dbInstance) return dbInstance;
    if (isConnecting) {
        // Wait briefly if already connecting
        await new Promise(r => setTimeout(r, 1000));
        if (dbInstance) return dbInstance;
    }

    isConnecting = true;
    try {
        const uri = process.env.MONGO_URI || DEFAULT_MONGO_URI;
        mongoClient = new MongoClient(uri, {
            serverSelectionTimeoutMS: 8000,
            connectTimeoutMS: 10000
        });
        await mongoClient.connect();
        dbInstance = mongoClient.db(DB_NAME);
        console.log('[MongoDB] 🍃 Conectado com sucesso ao MongoDB Atlas (Kitsune Store)!');
        return dbInstance;
    } catch (err) {
        console.error('[MongoDB Error] Falha ao conectar ao MongoDB Atlas:', err.message);
        return null;
    } finally {
        isConnecting = false;
    }
}

/**
 * Salva ou atualiza uma conta Riot específica no MongoDB Atlas
 */
async function saveAccountToMongo(accountName, accountData) {
    try {
        const db = await getDb();
        if (!db) return false;

        const collection = db.collection(COLLECTION_NAME);
        const dataToSave = {
            ...accountData,
            accountName: accountName,
            updatedAt: new Date().toISOString()
        };

        await collection.updateOne(
            { accountName: accountName },
            { $set: dataToSave },
            { upsert: true }
        );
        console.log(`[MongoDB] 💾 Conta '${accountName}' sincronizada com a nuvem (MongoDB Atlas)!`);
        return true;
    } catch (err) {
        console.error(`[MongoDB Error] Erro ao salvar conta '${accountName}':`, err.message);
        return false;
    }
}

/**
 * Salva todas as contas de um objeto dictionary no MongoDB Atlas
 */
async function saveAllAccountsToMongo(accountsObject) {
    if (!accountsObject || typeof accountsObject !== 'object') return false;
    try {
        const db = await getDb();
        if (!db) return false;

        const collection = db.collection(COLLECTION_NAME);
        for (const [accName, accData] of Object.entries(accountsObject)) {
            await collection.updateOne(
                { accountName: accName },
                { $set: { ...accData, accountName: accName, updatedAt: new Date().toISOString() } },
                { upsert: true }
            );
        }
        return true;
    } catch (err) {
        console.error('[MongoDB Error] Erro ao salvar múltiplas contas no MongoDB:', err.message);
        return false;
    }
}

/**
 * Carrega todas as contas Riot salvas no MongoDB Atlas
 */
async function loadAccountsFromMongo() {
    try {
        const db = await getDb();
        if (!db) return null;

        const collection = db.collection(COLLECTION_NAME);
        const docs = await collection.find({}).toArray();

        const accounts = {};
        for (const doc of docs) {
            const { _id, accountName, ...data } = doc;
            const key = accountName || doc.riotId || doc.username || `Account_${_id}`;
            accounts[key] = data;
        }
        return accounts;
    } catch (err) {
        console.error('[MongoDB Error] Erro ao carregar contas do MongoDB:', err.message);
        return null;
    }
}

/**
 * Sincroniza contas entre o MongoDB e o arquivo local no disco (riot_accounts.json)
 * - Restaura contas da nuvem para o disco caso o disco seja efêmero (Render restart)
 * - Envia contas do disco para a nuvem caso existam apenas localmente
 */
async function syncMongoAndDisk(accountsPath) {
    try {
        let diskAccounts = {};
        if (fs.existsSync(accountsPath)) {
            try {
                diskAccounts = JSON.parse(fs.readFileSync(accountsPath, 'utf8'));
            } catch (e) {
                diskAccounts = {};
            }
        }

        const mongoAccounts = await loadAccountsFromMongo();

        if (mongoAccounts && Object.keys(mongoAccounts).length > 0) {
            // Unir dados: prioriza os dados mais recentes
            const merged = { ...mongoAccounts, ...diskAccounts };

            // Escrever no disco para uso síncrono rápido
            fs.writeFileSync(accountsPath, JSON.stringify(merged, null, 2), 'utf8');
            console.log(`[MongoDB Sync] 🔄 ${Object.keys(merged).length} conta(s) Riot restaurada(s)/sincronizada(s) da nuvem com o disco!`);

            // Se o disco tinha alguma conta que não estava no Mongo, sobe pro Mongo
            await saveAllAccountsToMongo(merged);
            return merged;
        } else if (Object.keys(diskAccounts).length > 0) {
            // Se o Mongo estava vazio mas o disco tem contas, sobe pro Mongo
            await saveAllAccountsToMongo(diskAccounts);
            console.log(`[MongoDB Sync] ⬆️ ${Object.keys(diskAccounts).length} conta(s) do disco enviadas para o MongoDB Atlas.`);
            return diskAccounts;
        }

        return diskAccounts;
    } catch (err) {
        console.error('[MongoDB Sync Error]', err.message);
        return {};
    }
}

/**
 * Remove uma conta do MongoDB Atlas (caso seja desvinculada)
 */
async function deleteAccountFromMongo(accountName) {
    try {
        const db = await getDb();
        if (!db) return false;

        const collection = db.collection(COLLECTION_NAME);
        await collection.deleteOne({ accountName: accountName });
        console.log(`[MongoDB] 🗑️ Conta '${accountName}' removida do MongoDB Atlas.`);
        return true;
    } catch (err) {
        console.error(`[MongoDB Error] Erro ao deletar conta '${accountName}':`, err.message);
        return false;
    }
}

module.exports = {
    getDb,
    saveAccountToMongo,
    saveAllAccountsToMongo,
    loadAccountsFromMongo,
    syncMongoAndDisk,
    deleteAccountFromMongo
};
