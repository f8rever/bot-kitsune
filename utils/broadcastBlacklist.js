const fs = require('fs');
const path = require('path');
const { saveBotConfigToMongo, loadBotConfigFromMongo } = require('./mongoStorage.js');

const BLACKLIST_PATH = path.join(__dirname, '../config/broadcast_blacklist.json');

/**
 * Carrega a lista de IDs na blacklist (com sincronização de nuvem)
 */
function getBlacklist() {
    try {
        if (fs.existsSync(BLACKLIST_PATH)) {
            const data = JSON.parse(fs.readFileSync(BLACKLIST_PATH, 'utf8'));
            if (data.blacklistedUserIds && Array.isArray(data.blacklistedUserIds)) {
                return new Set(data.blacklistedUserIds);
            }
        }
    } catch (e) {
        console.error('[Blacklist Error] Falha ao ler broadcast_blacklist.json:', e.message);
    }
    return new Set();
}

/**
 * Salva a lista de IDs na blacklist (no disco e no MongoDB Atlas)
 */
async function saveBlacklist(setIds) {
    const arr = Array.from(setIds);
    const data = {
        updatedAt: new Date().toISOString(),
        total: arr.length,
        blacklistedUserIds: arr
    };

    try {
        fs.writeFileSync(BLACKLIST_PATH, JSON.stringify(data, null, 2), 'utf8');
        await saveBotConfigToMongo('broadcast_blacklist', data);
        return true;
    } catch (e) {
        console.error('[Blacklist Error] Falha ao salvar blacklist:', e.message);
        return false;
    }
}

/**
 * Adiciona IDs à blacklist
 */
async function addToBlacklist(userIds) {
    const list = getBlacklist();
    const ids = Array.isArray(userIds) ? userIds : [userIds];
    let added = 0;

    for (const rawId of ids) {
        const clean = String(rawId).trim().replace(/[^0-9]/g, '');
        if (clean && clean.length >= 16 && clean.length <= 22) {
            if (!list.has(clean)) {
                list.add(clean);
                added++;
            }
        }
    }

    if (added > 0) {
        await saveBlacklist(list);
    }
    return { added, total: list.size, list: Array.from(list) };
}

/**
 * Remove IDs da blacklist
 */
async function removeFromBlacklist(userIds) {
    const list = getBlacklist();
    const ids = Array.isArray(userIds) ? userIds : [userIds];
    let removed = 0;

    for (const rawId of ids) {
        const clean = String(rawId).trim().replace(/[^0-9]/g, '');
        if (clean && list.has(clean)) {
            list.delete(clean);
            removed++;
        }
    }

    if (removed > 0) {
        await saveBlacklist(list);
    }
    return { removed, total: list.size, list: Array.from(list) };
}

/**
 * Limpa toda a blacklist
 */
async function clearBlacklist() {
    await saveBlacklist(new Set());
    return true;
}

module.exports = {
    getBlacklist,
    addToBlacklist,
    removeFromBlacklist,
    clearBlacklist
};
