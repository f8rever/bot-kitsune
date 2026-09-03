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
        ensureMongoIndexes(dbInstance).catch(() => {});
        return dbInstance;
    } catch (err) {
        console.error('[MongoDB Error] Falha ao conectar ao MongoDB Atlas:', err.message);
        return null;
    } finally {
        isConnecting = false;
    }
}

let indexesEnsured = false;
async function ensureMongoIndexes(db) {
    if (indexesEnsured || !db) return;
    try {
        await Promise.all([
            db.collection('bot_configurations').createIndex({ configType: 1 }, { unique: true }),
            db.collection('riot_accounts').createIndex({ accountName: 1 }, { unique: true }),
            db.collection('invites').createIndex({ guildId: 1, userId: 1 }, { unique: true }),
            db.collection('member_joins').createIndex({ guildId: 1, memberId: 1 }, { unique: true }),
            db.collection('verified_members').createIndex({ guildId: 1, userId: 1 }, { unique: true }),
            db.collection('gift_logs').createIndex({ timestamp: -1 })
        ]);
        indexesEnsured = true;
    } catch (e) {
        // Ignora silenciosamente se o índice já estiver ativo
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
            // Unir dados: prioriza os dados mais recentes e garante preservação absoluta do SSID
            const merged = {};
            const allKeys = new Set([...Object.keys(mongoAccounts), ...Object.keys(diskAccounts)]);
            for (const key of allKeys) {
                const mAcc = mongoAccounts[key] || {};
                const dAcc = diskAccounts[key] || {};

                const mTime = mAcc.updatedAt ? new Date(mAcc.updatedAt).getTime() : 0;
                const dTime = dAcc.updatedAt ? new Date(dAcc.updatedAt).getTime() : 0;

                const base = mTime >= dTime ? { ...dAcc, ...mAcc } : { ...mAcc, ...dAcc };
                base.ssid = base.ssid || mAcc.ssid || dAcc.ssid || null;
                merged[key] = base;
            }

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

/**
 * Busca estatísticas de convites de um usuário no MongoDB Atlas
 */
async function getUserInvites(guildId, userId) {
    try {
        const db = await getDb();
        if (!db) return { regular: 0, left: 0, fake: 0, total: 0 };

        const collection = db.collection('invites');
        const doc = await collection.findOne({ guildId, userId });
        if (!doc) return { regular: 0, left: 0, fake: 0, total: 0 };

        const regular = doc.regular || 0;
        const left = doc.left || 0;
        const fake = doc.fake || 0;
        const total = Math.max(0, regular - left - fake);

        return { regular, left, fake, total };
    } catch (e) {
        console.error('[MongoDB Invites Error]', e.message);
        return { regular: 0, left: 0, fake: 0, total: 0 };
    }
}

/**
 * Registra a entrada de um novo membro por convite no MongoDB Atlas
 */
async function recordInviteJoin(guildId, inviterId, memberId, isFake = false) {
    try {
        const db = await getDb();
        if (!db) return null;

        const invitesCol = db.collection('invites');
        const memberJoinCol = db.collection('member_joins');

        // Registrar quem convidou este membro
        await memberJoinCol.updateOne(
            { guildId, memberId },
            { $set: { inviterId, joinedAt: new Date().toISOString(), isFake } },
            { upsert: true }
        );

        if (!inviterId) return null;

        // Atualizar contador do inviter
        const incField = isFake ? { fake: 1 } : { regular: 1 };
        await invitesCol.updateOne(
            { guildId, userId: inviterId },
            { 
                $inc: incField,
                $set: { updatedAt: new Date().toISOString() }
            },
            { upsert: true }
        );

        return await getUserInvites(guildId, inviterId);
    } catch (e) {
        console.error('[MongoDB Record Join Error]', e.message);
        return null;
    }
}

/**
 * Registra a saída de um membro e decrementa o convite no MongoDB Atlas
 */
async function recordInviteLeave(guildId, memberId) {
    try {
        const db = await getDb();
        if (!db) return null;

        const memberJoinCol = db.collection('member_joins');
        const invitesCol = db.collection('invites');

        const joinRecord = await memberJoinCol.findOne({ guildId, memberId });
        if (!joinRecord || !joinRecord.inviterId) return null;

        const inviterId = joinRecord.inviterId;

        // Incrementar saídas ('left')
        await invitesCol.updateOne(
            { guildId, userId: inviterId },
            { 
                $inc: { left: 1 },
                $set: { updatedAt: new Date().toISOString() }
            }
        );

        await memberJoinCol.deleteOne({ guildId, memberId });

        return {
            inviterId,
            stats: await getUserInvites(guildId, inviterId)
        };
    } catch (e) {
        console.error('[MongoDB Record Leave Error]', e.message);
        return null;
    }
}

/**
 * Registra um membro verificado no MongoDB Atlas
 */
async function recordMemberVerified(guildId, userId) {
    try {
        const db = await getDb();
        if (!db) return false;

        const collection = db.collection('verified_members');
        await collection.updateOne(
            { guildId, userId },
            { $set: { verifiedAt: new Date().toISOString() } },
            { upsert: true }
        );
        return true;
    } catch (e) {
        console.error('[MongoDB Verify Error]', e.message);
        return false;
    }
}

/**
 * Salva uma configuração do bot no MongoDB Atlas (embeds, emojis, loja, config)
 */
async function saveBotConfigToMongo(configType, configData) {
    if (!configType || !configData) return false;
    try {
        const db = await getDb();
        if (!db) return false;

        const collection = db.collection('bot_configurations');
        await collection.updateOne(
            { configType: configType },
            { 
                $set: { 
                    configType: configType,
                    data: configData,
                    updatedAt: new Date().toISOString() 
                } 
            },
            { upsert: true }
        );
        console.log(`[MongoDB] 💾 Configuração '${configType}' salva com sucesso no MongoDB Atlas!`);
        return true;
    } catch (err) {
        console.error(`[MongoDB Error] Erro ao salvar config '${configType}':`, err.message);
        return false;
    }
}

/**
 * Carrega uma configuração do bot do MongoDB Atlas
 */
async function loadBotConfigFromMongo(configType) {
    try {
        const db = await getDb();
        if (!db) return null;

        const collection = db.collection('bot_configurations');
        const doc = await collection.findOne({ configType: configType });
        return doc ? doc.data : null;
    } catch (err) {
        console.error(`[MongoDB Error] Erro ao carregar config '${configType}':`, err.message);
        return null;
    }
}

/**
 * Sincroniza todas as configurações do bot entre o MongoDB Atlas e os arquivos locais em config/
 * - Se existir na nuvem, restaura para o disco
 * - Se não existir na nuvem mas existir no disco, envia para a nuvem
 */
async function syncAllBotConfigs(configDir = path.join(__dirname, '../config')) {
    const configFiles = [
        { type: 'embeds', file: 'embeds.json' },
        { type: 'emojis', file: 'emojis.json' },
        { type: 'loja', file: 'loja.json' },
        { type: 'config', file: 'config.json' },
        { type: 'broadcast_blacklist', file: 'broadcast_blacklist.json' }
    ];

    for (const item of configFiles) {
        const filePath = path.join(configDir, item.file);
        try {
            const mongoData = await loadBotConfigFromMongo(item.type);
            if (mongoData && typeof mongoData === 'object' && Object.keys(mongoData).length > 0) {
                // Nuvem tem dados: escreve no disco para uso local e rápido
                fs.writeFileSync(filePath, JSON.stringify(mongoData, null, 2), 'utf8');
                console.log(`[MongoDB Sync] 📥 Configuração '${item.file}' sincronizada da nuvem com o disco!`);
            } else if (fs.existsSync(filePath)) {
                // Nuvem não tem dados: sobe os dados locais para a nuvem
                const localData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                await saveBotConfigToMongo(item.type, localData);
                console.log(`[MongoDB Sync] ⬆️ Configuração '${item.file}' enviada do disco para o MongoDB Atlas.`);
            }
        } catch (e) {
            console.error(`[MongoDB Sync Error] Falha ao sincronizar '${item.file}':`, e.message);
        }
    }
}

module.exports = {
    getDb,
    saveAccountToMongo,
    saveAllAccountsToMongo,
    loadAccountsFromMongo,
    syncMongoAndDisk,
    deleteAccountFromMongo,
    getUserInvites,
    recordInviteJoin,
    recordInviteLeave,
    recordMemberVerified,
    saveBotConfigToMongo,
    loadBotConfigFromMongo,
    syncAllBotConfigs
};
