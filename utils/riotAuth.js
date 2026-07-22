const axios = require('axios');

async function getEntitlements(accessToken) {
    const res = await axios.post('https://entitlements.auth.riotgames.com/api/token/v1', {}, {
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        }
    });
    return res.data.entitlements_token;
}

async function getUserInfo(accessToken) {
    const res = await axios.get('https://auth.riotgames.com/userinfo', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    return res.data;
}

async function getStoreBalance(accessToken, entitlementsToken, region = 'BR1') {
    const url_dict = {
        "BR1": "br-red.lol.sgp.pvp.net",
        "EUN1": "eune-red.lol.sgp.pvp.net",
        "EUW1": "euw-red.lol.sgp.pvp.net",
        "JP1": "jp-red.lol.sgp.pvp.net",
        "KR": "kr-red.lol.sgp.pvp.net",
        "LA1": "lan-red.lol.sgp.pvp.net",
        "LA2": "las-red.lol.sgp.pvp.net",
        "NA1": "na-red.lol.sgp.pvp.net",
        "OC1": "oc1-red.lol.sgp.pvp.net",
        "RU": "ru-red.lol.sgp.pvp.net",
        "TR1": "tr-red.lol.sgp.pvp.net",
        "SG2": "sg2-red.lol.sgp.pvp.net",
        "PH2": "ph2-red.lol.sgp.pvp.net",
        "TW2": "tw2-red.lol.sgp.pvp.net",
        "VN2": "vn2-red.lol.sgp.pvp.net",
        "TH2": "th2-red.lol.sgp.pvp.net",
        "ME1": "me1-red.lol.sgp.pvp.net",
        "PBE1": "pbe1-red.lol.sgp.pvp.net"
    };

    const edgeUrl = url_dict[region.toUpperCase()] || "br-red.lol.sgp.pvp.net";
    const url = `https://${edgeUrl}/storefront/v3/view/misc?language=en_US`;

    try {
        const res = await axios.get(url, {
            headers: {
                "Authorization": `Bearer ${accessToken}`,
                "X-Riot-Entitlements-JWT": entitlementsToken
            }
        });
        return { 
            rp: res.data.player.rp, 
            ip: res.data.player.ip,
            accountId: res.data.player.accountId,
            summonerLevel: res.data.player.summonerLevel
        };
    } catch(e) {
        const status = e.response ? e.response.status : null;
        if (status !== 401) {
            console.error("[Edge API Error]", status || e.message);
        }
        return { rp: 0, ip: 0, error: status };
    }
}

function getGiftId(inventoryType, itemId) {
    if (inventoryType === "CHAMPION") return 1;
    if (inventoryType === "MYSTERY") {
        if (itemId === 1) return 3;
        if (itemId === 4) return 9;
        if (itemId === 3) return 4;
        if (itemId === 50) return 100;
        if (itemId === 60) return 110;
    }
    if (inventoryType === "CHAMPION_SKIN") return 2;
    if (inventoryType === "WARD_SKIN") return 8;
    if (inventoryType === "SUMMONER_ICON") return 5;
    if (["BUNDLES", "HEXTECH_CRAFTING"].includes(inventoryType)) return 1010;
    if (inventoryType === "SPELL_BOOK_PAGE") return 6;
    if (inventoryType === "RP") return 7;
    return 0;
}

async function sendGift(accessToken, region, purchaserPuuid, receiverPuuid, offerId, giftMessage = "", quantity = 1) {
    const url_dict = {
        "BR1": "br-red.lol.sgp.pvp.net", "EUN1": "eune-red.lol.sgp.pvp.net", "EUW1": "euw-red.lol.sgp.pvp.net",
        "JP1": "jp-red.lol.sgp.pvp.net", "KR": "kr-red.lol.sgp.pvp.net", "LA1": "lan-red.lol.sgp.pvp.net",
        "LA2": "las-red.lol.sgp.pvp.net", "NA1": "na-red.lol.sgp.pvp.net", "OC1": "oc1-red.lol.sgp.pvp.net",
        "RU": "ru-red.lol.sgp.pvp.net", "TR1": "tr-red.lol.sgp.pvp.net", "SG2": "sg2-red.lol.sgp.pvp.net",
        "PH2": "ph2-red.lol.sgp.pvp.net", "TW2": "tw2-red.lol.sgp.pvp.net", "VN2": "vn2-red.lol.sgp.pvp.net",
        "TH2": "th2-red.lol.sgp.pvp.net", "ME1": "me1-red.lol.sgp.pvp.net", "PBE1": "pbe1-red.lol.sgp.pvp.net"
    };

    const location_dict = {
        "BR1": "lolriot.aws-usw2-prod.br1",
        "EUW1": "lolriot.aws-euc1-prod.euw1",
        "EUN1": "lolriot.aws-euc1-prod.eun1",
        "NA1": "lolriot.aws-usw2-prod.na1",
        "LA1": "lolriot.aws-usw2-prod.la1",
        "LA2": "lolriot.aws-usw2-prod.la2",
        "KR": "lolriot.aws-apne2-prod.kr",
        "JP1": "lolriot.aws-apne1-prod.jp1",
        "OC1": "lolriot.aws-apse2-prod.oc1",
        "TR1": "lolriot.aws-euc1-prod.tr1",
        "RU": "lolriot.aws-euc1-prod.ru",
        "SG2": "lolriot.aws-apse1-prod.sg2",
        "PH2": "lolriot.aws-apse1-prod.ph2",
        "TW2": "lolriot.aws-apse1-prod.tw2",
        "VN2": "lolriot.aws-apse1-prod.vn2",
        "TH2": "lolriot.aws-apse1-prod.th2",
        "ME1": "lolriot.aws-euc1-prod.me1"
    };

    const regUpper = (region || 'BR1').toUpperCase();
    const edgeUrl = url_dict[regUpper] || "br-red.lol.sgp.pvp.net";
    const location = location_dict[regUpper] || `lolriot.aws-usw2-prod.${regUpper.toLowerCase()}`;
    const url = `https://${edgeUrl}/services/cap/orders/orders-api/v2/products/d1c2664a-5938-4c41-8d1b-61fd51052c22/orders`;

    const body = {
        data: {
            id: "",
            customMessage: String(giftMessage || ""),
            location: location,
            purchaser: {
                id: purchaserPuuid || ""
            },
            source: "lol.store.purchase",
            subOrders: [
                {
                    offer: {
                        id: offerId,
                        productId: "d1c2664a-5938-4c41-8d1b-61fd51052c22"
                    },
                    offerContext: {
                        paymentOption: "RP",
                        quantity: Number(quantity) || 1
                    },
                    recipientId: receiverPuuid
                }
            ]
        },
        meta: {
            correlationId: "",
            jwt: "",
            xid: require('crypto').randomUUID()
        }
    };

    const headers = {
        "accept": "application/json",
        "user-agent": "LeagueOfLegendsClient/14.23.636.9832 (rcp-be-storefront)",
        "authorization": `Bearer ${accessToken}`,
        "content-type": "application/json"
    };

    try {
        const res = await axios.post(url, body, { headers });
        return { success: true, data: res.data };
    } catch(e) {
        console.error("[Gift CAP V2 Error]", e.response ? e.response.data : e.message);
        return { success: false, error: e.response ? e.response.data : e.message };
    }
}

async function sendGiftV3(accessToken, region, accountId, receiverSummonerId, itemId, itemPrice, inventoryType, giftMessage = "Presente via KITSUNE!", quantity = 1) {
    const url_dict = {
        "BR1": "br-red.lol.sgp.pvp.net", "EUN1": "eune-red.lol.sgp.pvp.net", "EUW1": "euw-red.lol.sgp.pvp.net",
        "JP1": "jp-red.lol.sgp.pvp.net", "KR": "kr-red.lol.sgp.pvp.net", "LA1": "lan-red.lol.sgp.pvp.net",
        "LA2": "las-red.lol.sgp.pvp.net", "NA1": "na-red.lol.sgp.pvp.net", "OC1": "oc1-red.lol.sgp.pvp.net",
        "RU": "ru-red.lol.sgp.pvp.net", "TR1": "tr-red.lol.sgp.pvp.net", "SG2": "sg2-red.lol.sgp.pvp.net",
        "PH2": "ph2-red.lol.sgp.pvp.net", "TW2": "tw2-red.lol.sgp.pvp.net", "VN2": "vn2-red.lol.sgp.pvp.net",
        "TH2": "th2-red.lol.sgp.pvp.net", "ME1": "me1-red.lol.sgp.pvp.net", "PBE1": "pbe1-red.lol.sgp.pvp.net"
    };

    const edgeUrl = url_dict[region.toUpperCase()] || "br-red.lol.sgp.pvp.net";
    const url = `https://${edgeUrl}/storefront/v3/gift`;

    const giftId = getGiftId(inventoryType, itemId);

    const parseNum = (val) => {
        const n = Number(val);
        return isNaN(n) ? val : n;
    };

    const body = {
        customMessage: String(giftMessage),
        receiverSummonerId: parseNum(receiverSummonerId),
        giftItemId: parseNum(giftId),
        accountId: parseNum(accountId),
        items: [
            {
                inventoryType: String(inventoryType),
                itemId: parseNum(itemId),
                ipCost: 0,
                rpCost: parseNum(itemPrice),
                quantity: parseNum(quantity) || 1
            }
        ]
    };

    const headers = {
        "Host": edgeUrl,
        "User-Agent": "Mozilla/5.0 (Windows NT 6.2; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) LeagueOfLegendsClient/14.21.628.6182 (CEF 91) Safari/537.36",
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Origin": "https://127.0.0.1:88888"
    };

    try {
        const res = await axios.post(url, body, { headers });
        return { success: true, data: res.data };
    } catch(e) {
        console.error("[Gift V3 Error]", e.response ? e.response.data : e.message);
        return { success: false, error: e.response ? e.response.data : e.message };
    }
}

async function getFriendlistGiftInfo(accessToken, region) {
    const url_dict = {
        "BR1": "br-red.lol.sgp.pvp.net", "EUN1": "eune-red.lol.sgp.pvp.net", "EUW1": "euw-red.lol.sgp.pvp.net",
        "JP1": "jp-red.lol.sgp.pvp.net", "KR": "kr-red.lol.sgp.pvp.net", "LA1": "lan-red.lol.sgp.pvp.net",
        "LA2": "las-red.lol.sgp.pvp.net", "NA1": "na-red.lol.sgp.pvp.net", "OC1": "oc1-red.lol.sgp.pvp.net",
        "RU": "ru-red.lol.sgp.pvp.net", "TR1": "tr-red.lol.sgp.pvp.net", "SG2": "sg2-red.lol.sgp.pvp.net",
        "PH2": "ph2-red.lol.sgp.pvp.net", "TW2": "tw2-red.lol.sgp.pvp.net", "VN2": "vn2-red.lol.sgp.pvp.net",
        "TH2": "th2-red.lol.sgp.pvp.net", "ME1": "me1-red.lol.sgp.pvp.net", "PBE1": "pbe1-red.lol.sgp.pvp.net"
    };

    const edgeUrl = url_dict[region.toUpperCase()] || "br-red.lol.sgp.pvp.net";
    const url = `https://${edgeUrl}/storefront/v3/gift/friends?language=en_US`;

    try {
        const res = await axios.get(url, {
            headers: {
                "Host": edgeUrl,
                "User-Agent": "Mozilla/5.0 (Windows NT 6.2; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) LeagueOfLegendsClient/14.21.628.6182 (CEF 91) Safari/537.36",
                "Authorization": `Bearer ${accessToken}`,
                "Content-Type": "application/json",
                "Accept": "application/json"
            }
        });
        return res.data;
    } catch(e) {
        if (e.response && e.response.status !== 401) {
            console.error("[Friendlist Edge Error]", e.response ? `${e.response.status} ${JSON.stringify(e.response.data)}` : e.message);
        }
        return null;
    }
}

async function getPuuidByRiotId(gameName, tagLine, accessToken) {
    if (!gameName || !tagLine) return null;
    const nameUrl = encodeURIComponent(gameName.trim());
    const tagUrl = encodeURIComponent(tagLine.trim());
    const url = `https://api.account.riotgames.com/aliases/v1/aliases?gameName=${nameUrl}&tagLine=${tagUrl}`;

    try {
        const res = await axios.get(url, {
            headers: {
                "Host": "api.account.riotgames.com",
                "Authorization": `Bearer ${accessToken}`,
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Accept": "application/json"
            }
        });
        if (Array.isArray(res.data) && res.data.length > 0) {
            return res.data[0].puuid || res.data[0].sub || null;
        }
        return null;
    } catch(e) {
        console.error("[Account Aliases PUUID Error]", e.response ? `${e.response.status} ${JSON.stringify(e.response.data)}` : e.message);
        return null;
    }
}

function getPuuidFromToken(token) {
    if (!token || typeof token !== 'string') return null;
    try {
        const parts = token.split('.');
        if (parts.length < 2) return null;
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
        return payload.sub || payload.puuid || null;
    } catch(e) {
        return null;
    }
}

async function getFriendList(accessToken, entitlementsToken, region = 'BR1') {
    const info = await getFriendlistGiftInfo(accessToken, region);
    if (!info || !info.friends) return [];
    return info.friends.map(f => {
        const gameName = f.gameName || f.game_name || f.name || '';
        const tagLine = f.tagLine || f.tag_line || f.tag || '';
        const nick = f.nick || f.summonerName || f.name || '';
        const fullRiotId = (gameName && tagLine) ? `${gameName}#${tagLine}` : (nick || gameName || 'Amigo');
        const puuid = f.puuid || f.sub || f.puuidId || f.id || f.pid || f.receiverPuuid || f.recipientId || null;
        return {
            name: fullRiotId,
            nick: nick || fullRiotId,
            gameName: gameName,
            tagLine: tagLine,
            summonerId: f.summonerId,
            puuid: puuid,
            status: 'online',
            friendsSince: f.friendsSince,
            rawData: f
        };
    });
}

function parseTokensFromUrl(redirectUrl) {
    let hash = redirectUrl.includes('#') ? redirectUrl.substring(redirectUrl.indexOf('#') + 1) : redirectUrl;
    const params = new URLSearchParams(hash);
    return {
        accessToken: params.get('access_token'),
        idToken: params.get('id_token'),
        expiresIn: params.get('expires_in')
    };
}

async function getGeopasToken(accessToken) {
    try {
        const res = await axios.get('https://riot-geo.pas.si.riotgames.com/pas/v1/service/chat', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        return res.data;
    } catch(e) {
        console.error('[RiotAuth] Failed to get Geopas token:', e.message);
        return null;
    }
}

function decodeGeopasAffinity(geopasToken) {
    if (!geopasToken) return null;
    try {
        const payloadBase64 = geopasToken.split('.')[1];
        const payloadStr = Buffer.from(payloadBase64, 'base64').toString('utf8');
        const payload = JSON.parse(payloadStr);
        return payload.affinity;
    } catch(e) {
        return null;
    }
}

function getChatDom(affinity) {
    const affinity_to_dom = {
        "as2": "as2", "asia": "jp1", "br1": "br1", "eu": "eu1", "eu3": "eu3",
        "eun1": "eu2", "euw1": "eu1", "jp1": "jp1", "la1": "la1", "la2": "la2",
        "na1": "na1", "oc1": "kr1", "ru1": "eu1", "sea1": "sa1", "sea2": "sa2",
        "sea3": "sa3", "sea4": "sa4", "tr1": "eu1", "us": "la1", "us-br1": "br1",
        "us-la2": "la2", "us2": "us2", "pbe1": "pb1", "ph2": "ph2"
    };
    return affinity_to_dom[affinity] || "";
}

function getChatUri(region, affinity) {
    const affinity_to_uri = {
        "as2": "as2.chat.si.riotgames.com", "asia": "jp1.chat.si.riotgames.com", "br1": "br.chat.si.riotgames.com", "eu": "euw1.chat.si.riotgames.com", "eu3": "eu3.chat.si.riotgames.com",
        "eun1": "eun1.chat.si.riotgames.com", "euw1": "euw1.chat.si.riotgames.com", "jp1": "jp1.chat.si.riotgames.com", "la1": "la1.chat.si.riotgames.com", "la2": "la2.chat.si.riotgames.com",
        "na1": "na2.chat.si.riotgames.com", "oc1": "kr1.chat.si.riotgames.com", "ru1": "euw1.chat.si.riotgames.com", "sea1": "sa1.chat.si.riotgames.com", "sea2": "sa2.chat.si.riotgames.com",
        "sea3": "sa3.chat.si.riotgames.com", "sea4": "sa4.chat.si.riotgames.com", "tr1": "euw1.chat.si.riotgames.com", "us": "la1.chat.si.riotgames.com", "us-br1": "br.chat.si.riotgames.com",
        "us-la2": "la2.chat.si.riotgames.com", "us2": "us2.chat.si.riotgames.com", "pbe1": "pbe1.chat.si.riotgames.com",
    };
    if (region && ['VH2','TH2','SG2', 'PH2'].includes(region.toUpperCase())) {
        return 'sa1.chat.si.riotgames.com';
    }
    return affinity_to_uri[affinity] || "";
}

async function checkAccountBan(accessToken, idToken) {
    if (accessToken) {
        try {
            let userInfo = await getUserInfo(accessToken);
            if (typeof userInfo === 'string' && userInfo.startsWith('ey')) {
                try {
                    const payloadStr = Buffer.from(userInfo.split('.')[1], 'base64').toString('utf8');
                    userInfo = JSON.parse(payloadStr);
                } catch(e) {}
            }

            if (userInfo && typeof userInfo === 'object') {
                if (userInfo.ban) {
                    if (userInfo.ban.r || userInfo.ban.code || userInfo.ban.reason || (Array.isArray(userInfo.ban.restrictions) && userInfo.ban.restrictions.length > 0)) {
                        return true;
                    }
                }
            }
        } catch(e) {}
    }

    if (idToken && typeof idToken === 'string') {
        try {
            const parts = idToken.split('.');
            if (parts.length >= 2) {
                const payloadStr = Buffer.from(parts[1], 'base64').toString('utf8');
                const payload = JSON.parse(payloadStr);
                if (payload.ban && (payload.ban.r || payload.ban.code || payload.ban.reason || (Array.isArray(payload.ban.restrictions) && payload.ban.restrictions.length > 0))) {
                    return true;
                }
                if (payload.lol && Array.isArray(payload.lol)) {
                    for (const gameAcc of payload.lol) {
                        const state = (gameAcc.state || '').toUpperCase();
                        if (['DISABLED', 'SUSPENDED', 'BANNED', 'RESTRICTED'].includes(state)) {
                            return true;
                        }
                    }
                }
            }
        } catch(e) {}
    }

    return false;
}

module.exports = {
    getEntitlements,
    getUserInfo,
    getStoreBalance,
    getFriendList,
    getPuuidByRiotId,
    getPuuidFromToken,
    parseTokensFromUrl,
    getGeopasToken,
    decodeGeopasAffinity,
    getChatDom,
    getChatUri,
    sendGift,
    sendGiftV3,
    checkAccountBan
};
