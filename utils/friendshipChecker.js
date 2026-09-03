const fs = require('fs');
const path = require('path');
const { getFriendlistGiftInfo, reauthWithSSID, getUserInfo } = require('./riotAuth.js');

/**
 * Lê todas as contas Riot salvas em disco/config
 */
function getSavedAccounts() {
    const accountsPath = path.join(__dirname, '../config/riot_accounts.json');
    if (fs.existsSync(accountsPath)) {
        try {
            return JSON.parse(fs.readFileSync(accountsPath, 'utf8'));
        } catch (e) {
            console.error('[FriendshipChecker] Erro ao ler riot_accounts.json:', e.message);
        }
    }
    return {};
}

/**
 * Formata duração em milissegundos para texto amigável
 */
function formatDuration(ms) {
    if (ms <= 0) return '0m';
    const totalSecs = Math.floor(ms / 1000);
    const days = Math.floor(totalSecs / 86400);
    const hours = Math.floor((totalSecs % 86400) / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (mins > 0) parts.push(`${mins}m`);
    if (parts.length === 0 || (days === 0 && hours === 0)) parts.push(`${secs}s`);
    return parts.join(' ');
}

/**
 * Formata data no fuso de Brasília (DD/MM/AAAA às HH:MM)
 */
function formatDatetimeBR(date) {
    return date.toLocaleString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

/**
 * Garante que o token da conta Riot esteja válido e renovado se possuir SSID
 */
async function ensureAccountFreshTokens(accountName) {
    const accounts = getSavedAccounts();
    const acc = accounts[accountName];
    if (!acc) return null;

    // Se possui SSID e estiver perto de expirar ou expirada, renovar
    if (acc.ssid) {
        try {
            const reauthResult = await reauthWithSSID(acc.ssid);
            if (reauthResult && reauthResult.accessToken) {
                acc.accessToken = reauthResult.accessToken;
                acc.entitlementsToken = reauthResult.entitlementsToken;
                acc.expired = false;
                acc.updatedAt = new Date().toISOString();

                // Salvar no disco e Mongo
                accounts[accountName] = acc;
                fs.writeFileSync(path.join(__dirname, '../config/riot_accounts.json'), JSON.stringify(accounts, null, 2), 'utf8');
                try {
                    const { saveAccountToMongo } = require('./mongoStorage.js');
                    await saveAccountToMongo(accountName, acc);
                } catch (e) {}
            }
        } catch (err) {
            console.warn(`[FriendshipChecker] Tentativa de reauth com SSID para ${accountName} falhou:`, err.message);
        }
    }

    return acc;
}

/**
 * Verifica se um Riot ID é amigo na conta Riot informada e calcula os prazos de 24h e 7 dias
 */
async function checkFriendshipEligibility(accountName, targetRiotId, regionHint = 'BR1') {
    const acc = await ensureAccountFreshTokens(accountName);
    if (!acc) {
        return {
            success: false,
            error: `Conta Riot "${accountName}" não encontrada nas configurações do bot.`
        };
    }

    const region = (acc.region || regionHint || 'BR1').toUpperCase();
    const rawGiftData = await getFriendlistGiftInfo(acc.accessToken, region);

    if (!rawGiftData || !Array.isArray(rawGiftData.friends)) {
        return {
            success: false,
            error: `Não foi possível consultar a lista de amigos da conta Riot "${accountName}". Verifique se os tokens estão válidos via /login.`
        };
    }

    const friendsList = rawGiftData.friends;

    // Normalizar targetRiotId para busca flexível
    const targetClean = targetRiotId.trim().toLowerCase();
    const targetParts = targetClean.split('#');
    const targetGameName = targetParts[0] ? targetParts[0].trim() : targetClean;
    const targetTagLine = targetParts[1] ? targetParts[1].trim() : '';

    // Buscar amigo correspondente
    const matched = friendsList.find(f => {
        const gName = (f.gameName || f.game_name || f.name || '').trim().toLowerCase();
        const tLine = (f.tagLine || f.tag_line || f.tag || '').trim().toLowerCase();
        const nick = (f.nick || f.summonerName || '').trim().toLowerCase();
        const full = `${gName}#${tLine}`;

        if (full === targetClean) return true;
        if (gName === targetClean) return true;
        if (nick === targetClean) return true;
        if (targetTagLine && gName === targetGameName && tLine === targetTagLine) return true;
        if (!targetTagLine && gName === targetGameName) return true;
        return false;
    });

    if (!matched) {
        return {
            success: true,
            found: false,
            accountName,
            targetRiotId,
            region,
            totalFriends: friendsList.length
        };
    }

    // Amigo encontrado! Analisar timestamps de amizade
    const rawSince = matched.friendsSince;
    if (!rawSince) {
        return {
            success: true,
            found: true,
            accountName,
            targetRiotId,
            friendName: matched.gameName ? `${matched.gameName}#${matched.tagLine}` : (matched.name || targetRiotId),
            friendsSince: null,
            timeElapsed: 'Indisponível (Amizade Global/Chat)',
            eligible24h: true,
            eligible7d: true,
            rawFriend: matched
        };
    }

    const cleanDateStr = rawSince.includes('T') ? rawSince : rawSince.replace(' ', 'T') + 'Z';
    const sinceDate = new Date(cleanDateStr);
    const now = new Date();
    const elapsedMs = Math.max(0, now.getTime() - sinceDate.getTime());

    // Regras de Cooldown
    const MS_24H = 24 * 60 * 60 * 1000;
    const MS_7D = 7 * 24 * 60 * 60 * 1000;

    const releaseDate24h = new Date(sinceDate.getTime() + MS_24H);
    const releaseDate7d = new Date(sinceDate.getTime() + MS_7D);

    const eligible24h = elapsedMs >= MS_24H;
    const remainMs24h = Math.max(0, MS_24H - elapsedMs);

    const eligible7d = elapsedMs >= MS_7D;
    const remainMs7d = Math.max(0, MS_7D - elapsedMs);

    const fullName = (matched.gameName && matched.tagLine) 
        ? `${matched.gameName}#${matched.tagLine}` 
        : (matched.name || targetRiotId);

    return {
        success: true,
        found: true,
        accountName,
        targetRiotId,
        friendName: fullName,
        puuid: matched.puuid || matched.sub || null,
        summonerId: matched.summonerId || null,
        sinceDate,
        sinceDateFormatted: formatDatetimeBR(sinceDate),
        timeElapsed: formatDuration(elapsedMs),
        eligible24h,
        remainMs24h,
        remain24hFormatted: formatDuration(remainMs24h),
        releaseDate24hFormatted: formatDatetimeBR(releaseDate24h),
        eligible7d,
        remainMs7d,
        remain7dFormatted: formatDuration(remainMs7d),
        releaseDate7dFormatted: formatDatetimeBR(releaseDate7d),
        rawFriend: matched
    };
}

module.exports = {
    getSavedAccounts,
    checkFriendshipEligibility,
    formatDuration,
    formatDatetimeBR
};
