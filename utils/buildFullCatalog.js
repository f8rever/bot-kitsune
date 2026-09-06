const axios = require('axios');
const fs = require('fs');
const path = require('path');

/**
 * Normaliza strings para busca/comparação sem acentos e minúsculas
 */
function normalizeStr(str) {
    return (str || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
}

/**
 * Filtro de itens de evento expirados, edições limitadas (PAX, etc) ou variantes gacha não presenteáveis
 */
function isRestrictedOrNonRP(name, rawItem = null) {
    const n = normalizeStr(name);
    
    // Se o preço em RP for 0 ou indefinido, não é presenteável por RP na loja (ex: prestígio com ME)
    const rpPrice = rawItem?.prices?.find(p => p.currency === 'RP')?.cost;
    if (rpPrice === undefined || rpPrice === null || rpPrice <= 0) {
        return true;
    }

    // 1. Prestígio (compradas exclusivamente via Essência Mítica)
    if (n.includes('prestige') || n.includes('prestigio')) return true;

    // 2. Gacha / Variantes Míticas / Sanctum / Hall of Legends
    if (n.includes('quantum') || n.includes('quantico') || n.includes('quantica')) return true;
    if (n.includes('erasure') || n.includes('erradicacao')) return true;
    if (n.includes('breakout') || n.includes('destemido')) return true;
    if (n.includes('divine heavenscale') || n.includes('escamas celestiais divino')) return true;
    if (n.includes('peacemaker') || n.includes('pacificador')) return true;
    if (n.includes('admiral battle') || n.includes('almirante coelha')) return true;
    if (n.includes('immortalized') || n.includes('imortalizada')) return true;
    if (n.includes('risen legend') || n.includes('lenda ascendente')) return true;
    if (n.includes('transcendent') || n.includes('transcendente')) return true;
    if (n.includes('exalted') || n.includes('exaltado') || n.includes('exaltada')) return true;
    if (n.includes('sanctum') || n.includes('santuario')) return true;
    if (n.includes('mythic variant') || n.includes('variante mitica')) return true;
    if (n.includes('faker')) return true;

    // 3. Skins de Essência Mítica clássicas (Hextec antigas, Cinzas, Cristalis, Vitoriosas)
    if (n.includes('ashen') || n.includes('das cinzas') || n.includes('crystalis') || n.includes('cristalis')) return true;
    if (n.includes('victorious') || n.includes('vitoriosa')) return true;
    if (n.includes('soulstealer') || n.includes('ladra de almas')) return true;

    // 4. Limitadas clássicas / PAX / Recompensas especiais
    if (n.includes('pax ') || n.includes('neo pax') || n.includes('black alistar') || n.includes('silver kayle') || n.includes('young ryze') || n.includes('human ryze') || n.includes('ufo corki') || n.includes('king rammus') || n.includes('judgement kayle') || n.includes('urf the manatee') || n.includes('triumphant ryze') || n.includes('championship riven 2012') || n.includes('riot squad singed')) return true;

    // 5. Edições especiais de assinatura (Signature Editions de bundles de equipe)
    if (n.includes('signature edition') || n.includes('edicao de assinatura')) return true;

    return false;
}

/**
 * Converte código de raridade do CommunityDragon em rótulo e código legível
 */
function getRarityInfo(rarityCode, priceRp = 1350) {
    if (priceRp === 3250 || rarityCode === 'kUltimate') {
        return { rarity: 'kUltimate', label: 'Ultimate' };
    }
    if (priceRp === 1820 || rarityCode === 'kLegendary') {
        return { rarity: 'kLegendary', label: 'Legendary' };
    }
    if (priceRp === 1350 || rarityCode === 'kEpic') {
        return { rarity: 'kEpic', label: 'Epic' };
    }
    if (priceRp <= 975 || rarityCode === 'kRare') {
        return { rarity: 'kRare', label: 'Common' };
    }
    if (rarityCode === 'kMythic') {
        return { rarity: 'kMythic', label: 'Mythic' };
    }
    return { rarity: 'kEpic', label: 'Epic' };
}

/**
 * Constrói o catálogo completo a partir da Storefront API da Riot Games (Store-First)
 */
async function buildFullCatalog() {
    console.log('[Catalog Builder] 🚀 Iniciando compilação 100% Store-First da Riot Games...');
    const startTime = Date.now();

    // 1. Obter catálogo bruto da Storefront API
    let rawCatalog = [];
    const rawCatalogPaths = [
        path.join(__dirname, '../lol_giftapi-main/catalog.json'),
        path.join(__dirname, '../python_backend/catalog.json'),
        path.join(__dirname, '../config/catalog.json')
    ];
    for (const p of rawCatalogPaths) {
        if (fs.existsSync(p)) {
            try {
                const parsed = JSON.parse(fs.readFileSync(p, 'utf8'));
                if (Array.isArray(parsed) && parsed.length > 0) {
                    rawCatalog = parsed;
                    console.log(`[Catalog Builder] 📦 Carregado ${rawCatalog.length} ofertas de ${p}`);
                    break;
                }
            } catch (e) {}
        }
    }

    if (rawCatalog.length === 0) {
        console.error('[Catalog Builder] ❌ Erro crítico: Nenhum catalog.json bruto encontrado!');
        return null;
    }

    // 2. Baixar metadados enriquecidos do CommunityDragon e Data Dragon em paralelo
    console.log('[Catalog Builder] 🌐 Baixando metadados e artes oficiais da Riot (CDragon & DDragon)...');
    let cdSkinsPt = {};
    let cdSkinsEn = {};
    let champMap = {};
    let ddragonVersion = '15.4.1';

    try {
        const verRes = await axios.get('https://ddragon.leagueoflegends.com/api/versions.json', { timeout: 8000 });
        if (verRes.data?.[0]) ddragonVersion = verRes.data[0];
    } catch (e) {}

    let cdWardsRes = { data: [] };
    let cdEmotesRes = { data: [] };

    try {
        const results = await Promise.all([
            axios.get('https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/pt_br/v1/skins.json', { timeout: 15000 }).catch(() => ({ data: {} })),
            axios.get('https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/skins.json', { timeout: 15000 }).catch(() => ({ data: {} })),
            axios.get(`https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/data/en_US/champion.json`, { timeout: 10000 }).catch(() => ({ data: { data: {} } })),
            axios.get('https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/ward-skins.json', { timeout: 15000 }).catch(() => ({ data: [] })),
            axios.get('https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/summoner-emotes.json', { timeout: 15000 }).catch(() => ({ data: [] }))
        ]);
        const ptCdRes = results[0];
        const enCdRes = results[1];
        const champDdragonRes = results[2];
        cdWardsRes = results[3];
        cdEmotesRes = results[4];

        cdSkinsPt = ptCdRes.data || {};
        cdSkinsEn = enCdRes.data || {};

        if (champDdragonRes.data?.data) {
            for (const key in champDdragonRes.data.data) {
                const c = champDdragonRes.data.data[key];
                champMap[Number(c.key)] = {
                    id: Number(c.key),
                    key: c.id,
                    nameEn: c.name,
                    titleEn: c.title
                };
            }
        }
    } catch (e) {
        console.warn('[Catalog Builder] ⚠️ Falha ao baixar alguns metadados externos. Prosseguindo com dados do Storefront.');
    }

    // Indexar imagens oficiais de Wards e Emotes do CommunityDragon
    const cdWardMap = {};
    if (Array.isArray(cdWardsRes?.data)) {
        cdWardsRes.data.forEach(w => {
            if (w && w.id !== undefined && w.wardImagePath) {
                const cleanPath = w.wardImagePath.toLowerCase().replace('/lol-game-data/assets/', '/');
                cdWardMap[w.id] = `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default${cleanPath}`;
            }
        });
    }

    const cdEmoteMap = {};
    if (Array.isArray(cdEmotesRes?.data)) {
        cdEmotesRes.data.forEach(em => {
            const iconPath = em?.inventoryIcon || em?.iconPath;
            if (em && em.id !== undefined && iconPath) {
                const cleanPath = iconPath.toLowerCase().replace('/lol-game-data/assets/', '/');
                cdEmoteMap[em.id] = `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default${cleanPath}`;
            }
        });
    }

    // Indexar nomes oficiais de todos os cromas em PT e EN do CommunityDragon
    const cdChromaMapPt = {};
    const cdChromaMapEn = {};
    for (const sId in cdSkinsPt) {
        if (cdSkinsPt[sId]?.chromas && Array.isArray(cdSkinsPt[sId].chromas)) {
            cdSkinsPt[sId].chromas.forEach(c => {
                if (c.id && c.name) cdChromaMapPt[c.id] = c.name;
            });
        }
    }
    for (const sId in cdSkinsEn) {
        if (cdSkinsEn[sId]?.chromas && Array.isArray(cdSkinsEn[sId].chromas)) {
            cdSkinsEn[sId].chromas.forEach(c => {
                if (c.id && c.name) cdChromaMapEn[c.id] = c.name;
            });
        }
    }

    // Indexar nomes oficiais em inglês da Storefront API (a partir de python_backend/catalog.json que contém en_US)
    const enCatalogMap = {};
    const enCatalogPath = path.join(__dirname, '../python_backend/catalog.json');
    if (fs.existsSync(enCatalogPath)) {
        try {
            const enRaw = JSON.parse(fs.readFileSync(enCatalogPath, 'utf8'));
            if (Array.isArray(enRaw)) {
                enRaw.forEach(item => {
                    const enName = item.localizations?.en_US?.name;
                    if (enName) {
                        if (item.itemId) enCatalogMap[item.itemId] = enName;
                        if (item.offerId) enCatalogMap[item.offerId] = enName;
                    }
                });
            }
        } catch (e) {}
    }

    const now = new Date();

    // Estruturas finais do catálogo PT e EN
    const catalogPt = {
        Skins: {},
        Chromas: {},
        Champions: {},
        Eternals: {},
        Bundles: {},
        Passes: {},
        Loot: {},
        Emotes: {},
        Icons: {},
        Wards: {},
        Boosts: {},
        LittleLegends: {},
        TFTArena: {},
        Others: {}
    };

    const catalogEn = {
        Skins: {},
        Chromas: {},
        Champions: {},
        Eternals: {},
        Bundles: {},
        Passes: {},
        Loot: {},
        Emotes: {},
        Icons: {},
        Wards: {},
        Boosts: {},
        LittleLegends: {},
        TFTArena: {},
        Others: {}
    };

    // 3. Processar todos os itens do Storefront
    rawCatalog.forEach(item => {
        const invType = (item.inventoryType || '').toUpperCase();
        const itemId = item.itemId;
        const offerId = item.offerId;
        if (!itemId || !offerId) return;

        // Determinar status de disponibilidade na loja oficial
        const isExpired = (item.active === false) || (item.inactiveDate && new Date(item.inactiveDate) <= now);
        
        let regularRp = null;
        let saleRp = null;
        let discountPercent = null;
        if (item.prices && Array.isArray(item.prices)) {
            const rpObj = item.prices.find(p => p.currency === 'RP');
            if (rpObj) regularRp = rpObj.cost;
        }
        if (item.sale && item.sale.prices && Array.isArray(item.sale.prices)) {
            const sObj = item.sale.prices.find(p => p.currency === 'RP');
            if (sObj) saleRp = sObj.cost;
        }
        const priceRp = saleRp || regularRp;

        if (regularRp && saleRp && regularRp > saleRp) {
            discountPercent = Math.round((1 - saleRp / regularRp) * 100);
        }

        const isAvailable = (!isExpired) && (priceRp !== null && priceRp !== undefined && priceRp > 0);
        const status = isAvailable ? 'available' : 'off';

        // Nomes localizados
        let rawPtName = item.localizations?.pt_BR?.name || item.name || '';
        let rawEnName = item.localizations?.en_US?.name || enCatalogMap[itemId] || enCatalogMap[offerId] || item.name || rawPtName;

        const ptToEnMap = {
            'Sentinela Reinos Mech 2020': 'Mecha Kingdoms 2020 Ward',
            'Sentinela Galáxias 2020': 'Galaxies 2020 Ward',
            'Sentinela Embalos no Espaço 2021': 'Space Groove 2021 Ward',
            'Sentinela Congregação das Bruxas': 'Coven Ward',
            'Sentinela Fênix': 'Phoenix Ward',
            'Sentinela Drone de Reconhecimento': 'Recon Drone Ward',
            'Sentinela Corte das Fadas': 'Faerie Court Ward',
            'Sentinela Soul Fighter': 'Soul Fighter Ward',
            'Sentinela HEARTSTEEL': 'HEARTSTEEL Ward',
            'Ícone Moldura Seraphine Hino ao Amor': 'Heartsong Seraphine Border Icon',
            'Ícone Moldura Jhin Pacto Quebrado': 'Broken Covenant Jhin Border Icon',
            'Ícone Moldura Shen Pacto Quebrado': 'Broken Covenant Shen Border Icon',
            'Ícone Moldura Aurora Pacto Quebrado': 'Broken Covenant Aurora Border Icon',
            'Ícone Gwen Corte das Fadas': 'Faerie Court Gwen Icon',
            'Ícone Lulu Corte das Fadas': 'Faerie Court Lulu Icon',
            "Ícone Bel'Veth Corte das Fadas": "Faerie Court Bel'Veth Icon",
            'Ícone Pacote Karma Emissária da Luz': 'Dawnbringer Karma Bundle Icon',
            'Ícone Caça-Zumbis': 'Zombie Slayer Icon',
            'Ícone Sentinela Detectora Clássica': 'Vintage Control Ward Icon',
            'Ícone Moldura Locke Velho Oeste': 'High Noon Locke Border Icon'
        };
        if (ptToEnMap[rawEnName]) rawEnName = ptToEnMap[rawEnName];

        // Metadados do CommunityDragon (se aplicável)
        const cdPt = cdSkinsPt[itemId];
        const cdEn = cdSkinsEn[itemId];

        // ----------------------------------------------------
        // A. SKINS DE CAMPEÕES & CROMAS (CHAMPION_SKIN)
        // ----------------------------------------------------
        if (invType === 'CHAMPION_SKIN') {
            // Verificar se é Croma
            const isRecolor = item.subInventoryType === 'RECOLOR';
            const is290Rp = priceRp === 290;
            const hasChromaReq = item.itemRequirements?.some(r => r.inventoryType === 'CHAMPION_SKIN');
            const hasParenName = rawPtName.includes('(') && rawPtName.includes(')');
            const isChroma = isRecolor || is290Rp || hasChromaReq || hasParenName;

            if (isChroma) {
                // Nome oficial do croma (PT e EN)
                let chromaPtName = cdChromaMapPt[itemId] || rawPtName || cdPt?.name;
                let chromaEnName = cdChromaMapEn[itemId] || cdEn?.name || rawEnName || chromaPtName;

                if (!chromaPtName) return;
                if (!chromaEnName) chromaEnName = chromaPtName;

                // Não adicionar cromas que não estejam na loja com preço válido
                if (!priceRp || priceRp <= 0) return;

                const chromaIcon = cdEn?.chromaPath
                    ? `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default${cdEn.chromaPath.toLowerCase().replace('/lol-game-data/assets', '')}`
                    : `https://d392eissrffsyf.cloudfront.net/storeImages/bundles/${itemId}.png`;

                const chromaObjPt = {
                    offer_id: offerId,
                    item_id: itemId,
                    parent_id: item.parent?.itemId || null,
                    price_rp: priceRp,
                    regular_rp: regularRp,
                    sale_rp: saleRp,
                    discount_percent: discountPercent,
                    sale: item.sale || null,
                    inventory_type: 'CHROMA',
                    icon_url: chromaIcon,
                    is_available: isAvailable,
                    status: status
                };

                const chromaObjEn = {
                    ...chromaObjPt,
                    inventory_type: 'CHROMA'
                };

                catalogPt.Chromas[chromaPtName] = chromaObjPt;
                catalogEn.Chromas[chromaEnName] = chromaObjEn;
                return;
            }

            // É Skin Base
            // Filtrar skins de prestígio com RP 0 ou variantes míticas de gacha
            if (isRestrictedOrNonRP(rawPtName, item) || isRestrictedOrNonRP(rawEnName, item)) {
                return;
            }

            let skinPtName = rawPtName || cdPt?.name;
            let skinEnName = cdEn?.name || rawEnName || skinPtName;

            // Tratamento especial para skins Ultimate com nomes de subtipo no CDragon
            // Exemplo: 147001 no CDragon chama-se "K/DA ALL OUT Seraphine Indie", na loja oficial é "K/DA ALL OUT Seraphine"
            if (itemId === 147001) {
                skinPtName = 'Seraphine K/DA ALL OUT';
                skinEnName = 'K/DA ALL OUT Seraphine';
            }

            if (!skinPtName) return;
            if (!skinEnName) skinEnName = skinPtName;

            const rarityData = getRarityInfo(cdEn?.rarity || cdPt?.rarity, priceRp);

            // Resolução da splash art de alta resolução
            const champId = item.parent?.itemId;
            const champKey = champMap[champId]?.key;
            const skinNum = itemId % 1000;
            
            let splashUrl = champKey
                ? `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${champKey}_${skinNum}.jpg`
                : (cdEn?.uncenteredSplashPath ? `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default${cdEn.uncenteredSplashPath.toLowerCase().replace('/lol-game-data/assets', '')}` : null);

            const skinObjPt = {
                offer_id: offerId,
                item_id: itemId,
                parent_id: champId || null,
                price_rp: priceRp,
                regular_rp: regularRp,
                sale_rp: saleRp,
                discount_percent: discountPercent,
                sale: item.sale || null,
                inventory_type: 'CHAMPION_SKIN',
                rarity: rarityData.rarity,
                rarity_label: rarityData.label,
                icon_url: splashUrl,
                is_available: isAvailable,
                status: status
            };

            const skinObjEn = {
                ...skinObjPt,
                inventory_type: 'CHAMPION_SKIN'
            };

            catalogPt.Skins[skinPtName] = skinObjPt;
            catalogEn.Skins[skinEnName] = skinObjEn;
            return;
        }

        // ----------------------------------------------------
        // B. CAMPEÕES (CHAMPION)
        // ----------------------------------------------------
        if (invType === 'CHAMPION') {
            const champId = itemId;
            const champPtName = rawPtName || champMap[champId]?.nameEn || `Campeão ${champId}`;
            const champEnName = champMap[champId]?.nameEn || rawEnName || champPtName;
            const champKey = champMap[champId]?.key;

            const iconUrl = champKey 
                ? `https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/img/champion/${champKey}.png`
                : `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/${champId}.png`;

            const champObjPt = {
                offer_id: offerId,
                item_id: champId,
                price_rp: priceRp || 975,
                regular_rp: regularRp,
                sale_rp: saleRp,
                discount_percent: discountPercent,
                inventory_type: 'CHAMPION',
                icon_url: iconUrl,
                is_available: isAvailable,
                status: status
            };

            const champObjEn = {
                ...champObjPt
            };

            catalogPt.Champions[champPtName] = champObjPt;
            catalogEn.Champions[champEnName] = champObjEn;
            return;
        }

        // ----------------------------------------------------
        // C. PACOTES (BUNDLES)
        // ----------------------------------------------------
        if (invType === 'BUNDLES' || invType === 'BUNDLE') {
            if (!priceRp || priceRp <= 0) return;
            if (isRestrictedOrNonRP(rawPtName, item) || isRestrictedOrNonRP(rawEnName, item)) return;

            const nLower = (rawEnName || rawPtName).toLowerCase();

            let bundleIcon = item.iconUrl;
            if (bundleIcon && bundleIcon.startsWith('//')) bundleIcon = 'https:' + bundleIcon;
            if (!bundleIcon || !bundleIcon.startsWith('http')) {
                bundleIcon = `https://d392eissrffsyf.cloudfront.net/storeImages/bundles/${itemId}.png`;
            }

            const bundleObjPt = {
                offer_id: offerId,
                item_id: itemId,
                price_rp: priceRp,
                regular_rp: regularRp,
                sale_rp: saleRp,
                discount_percent: discountPercent,
                inventory_type: 'BUNDLES',
                icon_url: bundleIcon,
                is_available: isAvailable,
                status: status
            };

            const bundleObjEn = {
                ...bundleObjPt
            };

            // Filtrar passes de evento e orbes empacotados para suas categorias correspondentes
            if (nLower.includes('pass') && !nLower.includes('level-up') && !nLower.includes('bank pass')) {
                catalogPt.Passes[rawPtName] = bundleObjPt;
                catalogEn.Passes[rawEnName] = bundleObjEn;
            } else if ((nLower.includes('orb') || nLower.includes('capsule')) && !nLower.includes('chroma') && !nLower.includes('clash')) {
                catalogPt.Loot[rawPtName] = bundleObjPt;
                catalogEn.Loot[rawEnName] = bundleObjEn;
            } else {
                catalogPt.Bundles[rawPtName] = bundleObjPt;
                catalogEn.Bundles[rawEnName] = bundleObjEn;
            }
            return;
        }

        // ----------------------------------------------------
        // D. ESPÓLIOS, PASSES, ACESSÓRIOS & OUTROS
        // ----------------------------------------------------
        if (priceRp && priceRp > 0) {
            let itemIcon = item.iconUrl;
            if (itemIcon && itemIcon.startsWith('//')) itemIcon = 'https:' + itemIcon;
            if (invType === 'EMOTE') {
                itemIcon = cdEmoteMap[itemId] || (itemIcon && itemIcon.startsWith('http') ? itemIcon : `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/emotes/${itemId}.png`);
            } else if (invType === 'SUMMONER_ICON') {
                itemIcon = `https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/img/profileicon/${itemId}.png`;
            } else if (invType === 'WARD_SKIN') {
                itemIcon = cdWardMap[itemId] || (itemIcon && itemIcon.startsWith('http') ? itemIcon : `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/ward-skins/${itemId}.png`);
            } else if (!itemIcon || !itemIcon.startsWith('http')) {
                itemIcon = `https://d392eissrffsyf.cloudfront.net/storeImages/bundles/${itemId}.png`;
            }

            const itemGenericPt = {
                offer_id: offerId,
                item_id: itemId,
                parent_id: item.parent?.itemId || item.parentId || null,
                price_rp: priceRp,
                regular_rp: regularRp,
                sale_rp: saleRp,
                discount_percent: discountPercent,
                inventory_type: invType,
                icon_url: itemIcon,
                is_available: isAvailable,
                status: status
            };
            const itemGenericEn = { ...itemGenericPt };

            if (invType === 'EVENT_PASS') {
                catalogPt.Passes[rawPtName] = itemGenericPt;
                catalogEn.Passes[rawEnName] = itemGenericEn;
            } else if (invType === 'STATSTONE') {
                const parentId = item.parent?.itemId || item.parentId || null;
                const parentChamp = parentId ? champMap[Number(parentId)] : null;
                
                let eternalIcon = item.iconUrl;
                if (parentChamp && parentChamp.key) {
                    eternalIcon = `https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/img/champion/${parentChamp.key}.png`;
                } else if (!eternalIcon || eternalIcon.includes('default.png')) {
                    eternalIcon = 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons/4568.png';
                }

                itemGenericPt.parent_id = parentId;
                itemGenericPt.icon_url = eternalIcon;
                itemGenericPt.inventory_type = 'STATSTONE';

                itemGenericEn.parent_id = parentId;
                itemGenericEn.icon_url = eternalIcon;
                itemGenericEn.inventory_type = 'STATSTONE';

                let seriesEn = 'Series 1';
                let seriesPt = 'Série 1';
                const nLower = (rawEnName || rawPtName).toLowerCase();
                if (nLower.includes('2') || item.tags?.includes('eternals-series-2')) {
                    seriesEn = 'Series 2';
                    seriesPt = 'Série 2';
                } else if (nLower.includes('inicial') || nLower.includes('starter') || item.tags?.includes('starter')) {
                    seriesEn = 'Starter Series';
                    seriesPt = 'Série Inicial';
                }

                let eternalNameEn = '';
                let eternalNamePt = '';
                if (parentChamp) {
                    eternalNameEn = `${parentChamp.nameEn} - ${seriesEn}`;
                    const ptChampName = rawPtName ? rawPtName.split(/[-–]/)[0].trim() : parentChamp.nameEn;
                    eternalNamePt = `${ptChampName} - ${seriesPt}`;
                } else {
                    eternalNameEn = seriesEn === 'Series 2' ? 'Series 2 Pass' : (seriesEn === 'Starter Series' ? 'Starter Series Pass' : 'Series 1 Pass');
                    eternalNamePt = seriesPt === 'Série 2' ? 'Passe dos Eternos: Série 2' : (seriesPt === 'Série Inicial' ? 'Passe dos Eternos: Série Inicial' : 'Passe dos Eternos: Série 1');
                }

                catalogPt.Eternals[eternalNamePt] = itemGenericPt;
                catalogEn.Eternals[eternalNameEn] = itemGenericEn;
            } else if (invType === 'HEXTECH_CRAFTING' || invType === 'CHEST' || invType === 'MYSTERY' || invType === 'GIFT') {
                catalogPt.Loot[rawPtName] = itemGenericPt;
                catalogEn.Loot[rawEnName] = itemGenericEn;
            } else if (invType === 'EMOTE') {
                catalogPt.Emotes[rawPtName] = itemGenericPt;
                catalogEn.Emotes[rawEnName] = itemGenericEn;
            } else if (invType === 'SUMMONER_ICON') {
                catalogPt.Icons[rawPtName] = itemGenericPt;
                catalogEn.Icons[rawEnName] = itemGenericEn;
            } else if (invType === 'WARD_SKIN') {
                catalogPt.Wards[rawPtName] = itemGenericPt;
                catalogEn.Wards[rawEnName] = itemGenericEn;
            } else if (invType === 'BOOST') {
                catalogPt.Boosts[rawPtName] = itemGenericPt;
                catalogEn.Boosts[rawEnName] = itemGenericEn;
            } else if (invType === 'COMPANION') {
                catalogPt.LittleLegends[rawPtName] = itemGenericPt;
                catalogEn.LittleLegends[rawEnName] = itemGenericEn;
            } else if (invType === 'TFT_MAP_SKIN') {
                catalogPt.TFTArena[rawPtName] = itemGenericPt;
                catalogEn.TFTArena[rawEnName] = itemGenericEn;
            }
        }
    });

    // Tabuleiros TFT personalizados de configuração (se existirem)
    const tftArenasPath = path.join(__dirname, '../config/tft_arenas.json');
    if (fs.existsSync(tftArenasPath)) {
        try {
            const arenas = JSON.parse(fs.readFileSync(tftArenasPath, 'utf8'));
            arenas.forEach(a => {
                const aObj = {
                    offer_id: a.id,
                    item_id: a.id,
                    price_rp: a.price_rp,
                    inventory_type: 'TFT_MAP_SKIN',
                    icon_url: a.iconUrl || null,
                    is_available: true,
                    status: 'available'
                };
                catalogPt.TFTArena[a.name] = aObj;
                catalogEn.TFTArena[a.name] = aObj;
            });
        } catch (e) {}
    }

    // 4. Salvar arquivos de cache gerados
    const targetDirs = [
        path.join(__dirname, '../config'),
        path.join(__dirname, '../lol_giftapi-main'),
        path.join(__dirname, '../python_backend'),
        path.join(__dirname, '../python_backend/api_files')
    ];

    for (const d of targetDirs) {
        if (fs.existsSync(d)) {
            const ptPath = path.join(d, 'catalog_cache_pt.json');
            const enPath = path.join(d, 'catalog_cache_en.json');
            fs.writeFileSync(ptPath, JSON.stringify(catalogPt, null, 2), 'utf8');
            fs.writeFileSync(enPath, JSON.stringify(catalogEn, null, 2), 'utf8');
        }
    }

    const totalSkins = Object.keys(catalogPt.Skins).length;
    const totalChromas = Object.keys(catalogPt.Chromas).length;
    const totalBundles = Object.keys(catalogPt.Bundles).length;
    const totalChamps = Object.keys(catalogPt.Champions).length;
    const totalEternals = Object.keys(catalogPt.Eternals || {}).length;
    const totalPasses = Object.keys(catalogPt.Passes).length;
    const totalLoot = Object.keys(catalogPt.Loot).length;

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[Catalog Builder] ✅ Compilação concluída com sucesso em ${elapsed}s!`);
    console.log(`[Catalog Builder] 📊 Estatísticas Store-First:`);
    console.log(`   - 👕 Skins Oficiais: ${totalSkins}`);
    console.log(`   - 🎨 Cromas Oficiais: ${totalChromas}`);
    console.log(`   - ⚔️ Campeões: ${totalChamps}`);
    console.log(`   - 🏆 Eternos: ${totalEternals}`);
    console.log(`   - 📦 Pacotes: ${totalBundles}`);
    console.log(`   - 🎫 Passes: ${totalPasses}`);
    console.log(`   - 🎁 Espólios: ${totalLoot}`);

    return {
        totalSkins,
        totalChromas,
        totalChamps,
        totalBundles,
        totalPasses,
        totalLoot,
        elapsed
    };
}

module.exports = { buildFullCatalog };

if (require.main === module) {
    buildFullCatalog();
}
