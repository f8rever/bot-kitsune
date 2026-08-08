const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { getEntitlements, loginWithRiotCredentials } = require('./riotAuth.js');

async function syncRiotCatalog() {
    console.log('🔄 [CatalogSync] Iniciando sincronização completa do catálogo...');

    // 1. First attempt: Call Python backend endpoint /update-catalog
    try {
        const pyRes = await axios.post('http://127.0.0.1:5000/update-catalog', {}, {
            headers: { 'x-api-key': 'key_for_update_catalog' },
            timeout: 90000
        });
        if (pyRes.status === 200) {
            console.log('✅ [CatalogSync] Catálogo atualizado com sucesso via Backend Python!');
            // Copy files if in lol_giftapi-main or python_backend root
            const pyPt = fs.existsSync(path.join(__dirname, '../python_backend/catalog_cache_pt.json'))
                ? path.join(__dirname, '../python_backend/catalog_cache_pt.json')
                : fs.existsSync(path.join(__dirname, '../lol_giftapi-main/catalog_cache_pt.json'))
                    ? path.join(__dirname, '../lol_giftapi-main/catalog_cache_pt.json')
                    : path.join(__dirname, '../catalog_cache_pt.json');

            const pyEn = fs.existsSync(path.join(__dirname, '../python_backend/catalog_cache_en.json'))
                ? path.join(__dirname, '../python_backend/catalog_cache_en.json')
                : fs.existsSync(path.join(__dirname, '../lol_giftapi-main/catalog_cache_en.json'))
                    ? path.join(__dirname, '../lol_giftapi-main/catalog_cache_en.json')
                    : path.join(__dirname, '../catalog_cache_en.json');

            const targetPt = path.join(__dirname, '../config/catalog_cache_pt.json');
            const targetEn = path.join(__dirname, '../config/catalog_cache_en.json');
            
            if (fs.existsSync(pyPt)) fs.copyFileSync(pyPt, targetPt);
            if (fs.existsSync(pyEn)) fs.copyFileSync(pyEn, targetEn);

            const { loadCatalog } = require('./catalog.js');
            loadCatalog('pt');
            loadCatalog('en');
            return { success: true, source: 'Python Backend' };
        }
    } catch(pyErr) {
        console.log('ℹ️ [CatalogSync] Backend Python indisponível ou em timeout. Executando fallback em Node.js...');
    }

    // 2. Fallback attempt: Login or use stored token in Node.js
    const accountsPath = path.join(__dirname, '../config/riot_accounts.json');
    let accounts = {};
    if (fs.existsSync(accountsPath)) {
        try { accounts = JSON.parse(fs.readFileSync(accountsPath, 'utf8')); } catch(e) {}
    }

    let activeToken = null;
    let activeEntitlements = null;
    let activeRegion = 'BR1';

    for (const name in accounts) {
        const acc = accounts[name];
        if (!acc.expired && acc.accessToken) {
            activeToken = acc.accessToken;
            activeEntitlements = acc.entitlementsToken;
            activeRegion = acc.region || 'BR1';
            break;
        }
    }

    if (!activeToken) {
        // Try fallback store credentials (lucasgg112 / lucas4002)
        try {
            const storeAcc = await loginWithRiotCredentials("lucasgg112", "lucas4002");
            if (storeAcc && storeAcc.accessToken) {
                activeToken = storeAcc.accessToken;
                activeEntitlements = storeAcc.entitlementsToken;
            }
        } catch(e) {}
    }

    if (!activeToken) {
        // Try any token from saved accounts
        const first = Object.values(accounts)[0];
        if (first && first.accessToken) {
            activeToken = first.accessToken;
            activeEntitlements = first.entitlementsToken;
            activeRegion = first.region || 'BR1';
        }
    }

    if (!activeToken) {
        throw new Error('Servidor Python offline e nenhuma conta Riot disponível. Inicie o backend Python ou conecte uma conta com /link.');
    }

    if (!activeEntitlements) {
        try { activeEntitlements = await getEntitlements(activeToken); } catch(e) {}
    }

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
        "PH2": "ph2-red.lol.sgp.pvp.net"
    };

    const edgeUrl = url_dict[activeRegion.toUpperCase()] || "br-red.lol.sgp.pvp.net";

    const fetchLangCatalog = async (langStr) => {
        const storeUrl = `https://${edgeUrl}/storefront/v3/view/misc?language=${langStr}`;
        const res = await axios.get(storeUrl, {
            headers: {
                "Authorization": `Bearer ${activeToken}`,
                "X-Riot-Entitlements-JWT": activeEntitlements || ""
            }
        });
        return res.data;
    };

    let dataPt = null;
    let dataEn = null;

    try { dataPt = await fetchLangCatalog('pt_BR'); } catch(e) {}
    try { dataEn = await fetchLangCatalog('en_US'); } catch(e) {}

    if (!dataPt && !dataEn) {
        throw new Error('Não foi possível obter dados do catálogo da Riot. Inicie o servidor Python ou atualize o /link da conta.');
    }

    const targetDataPt = dataPt || dataEn;
    const targetDataEn = dataEn || dataPt;

    const ptPath = path.join(__dirname, '../config/catalog_cache_pt.json');
    const enPath = path.join(__dirname, '../config/catalog_cache_en.json');

    fs.writeFileSync(ptPath, JSON.stringify(targetDataPt, null, 2));
    fs.writeFileSync(enPath, JSON.stringify(targetDataEn, null, 2));

    const { loadCatalog } = require('./catalog.js');
    loadCatalog('pt');
    loadCatalog('en');

    return { success: true, source: 'Node.js Direct Store API' };
}

module.exports = {
    syncRiotCatalog
};
