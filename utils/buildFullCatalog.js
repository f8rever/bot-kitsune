const axios = require('axios');
const fs = require('fs');
const path = require('path');

function isUnpurchasableOrMythic(name) {
    const n = (name || '').toLowerCase();
    // 1. Prestígio
    if (n.includes('prestige') || n.includes('prestígio') || n.includes('prestigio')) return true;
    
    // 2. Gacha / Variantes Míticas / Sanctum / Hall of Legends
    if (n.includes('quantum') || n.includes('quântico') || n.includes('quântica')) return true;
    if (n.includes('erasure') || n.includes('erradicação')) return true;
    if (n.includes('breakout') || n.includes('destemido')) return true;
    if (n.includes('divine heavenscale') || n.includes('escamas celestiais divino')) return true;
    if (n.includes('peacemaker') || n.includes('pacificador')) return true;
    if (n.includes('admiral battle') || n.includes('almirante coelha')) return true;
    if (n.includes('immortalized') || n.includes('imortalizada')) return true;
    if (n.includes('risen legend') || n.includes('lenda ascendente')) return true;
    if (n.includes('transcendent') || n.includes('transcendente')) return true;
    if (n.includes('exalted') || n.includes('exaltado') || n.includes('exaltada')) return true;
    if (n.includes('sanctum') || n.includes('santuário')) return true;
    if (n.includes('mythic variant') || n.includes('variante mítica')) return true;
    if (n.includes('faker')) return true;

    // 3. Hextec antigas de Essência Mítica
    if (n.includes('hextech') && (
        n.includes('annie') || n.includes('poppy') || n.includes('alistar') ||
        n.includes('jarvan') || n.includes('kassadin') || n.includes('kog\'maw') ||
        n.includes('malzahar') || n.includes('rammus') || n.includes('renekton') ||
        n.includes('sejuani') || n.includes('swain') || n.includes('tristana') ||
        n.includes('vayne') || n.includes('ziggs') || n.includes('amumu') || n.includes('nocturne')
    )) return true;

    // 4. Linhas de Essência Mítica (Cinzas, Cristalis, Vitoriosas)
    if (n.includes('ashen') || n.includes('das cinzas') || n.includes('crystalis') || n.includes('cristalis')) return true;
    if (n.includes('victorious') || n.includes('vitoriosa')) return true;
    if (n.includes('soulstealer') || n.includes('ladra de almas') || n.includes('dreadnova darius') || n.includes('darius nova do pavor')) return true;

    // 5. Limitadas / PAX
    if (n.includes('pax ') || n.includes('neo pax') || n.includes('black alistar') || n.includes('silver kayle') || n.includes('young ryze') || n.includes('human ryze') || n.includes('ufo corki') || n.includes('king rammus') || n.includes('judgement kayle') || n.includes('urf the manatee') || n.includes('triumphant ryze') || n.includes('championship riven 2012') || n.includes('riot squad singed')) return true;

    // 6. Itens de Evento/Equipes do Cofre (Legacy Team / Worlds Signature Editions / Temporários já encerrados)
    if (n.includes('signature edition') || n.includes('edição de assinatura') || n.includes('edicao de assinatura')) return true;
    if (n.includes('t1 ') || n.includes('drx ') || n.includes('edg ') || n.includes('fpx ') || n.includes('dwg ') || n.includes('invictus gaming') || n.includes('samsung galaxy') || n.includes('skt t1')) return true;
    if (n.includes('worlds 20') || n.includes('msi 20') || n.includes('three-peat')) return true;
    if (n.includes('challenger nidalee') || n.includes('nidalee desafiante') || n.includes('challenger ahri') || n.includes('ahri desafiante')) return true;

    return false;
}

// Map of known Legendary (1820 RP) and Ultimate (3250 RP) skins
const knownLegendaries = new Set([
    'battle dove seraphine', 'seraphine ave de batalha',
    'heartsong seraphine', 'seraphine hino ao amor',
    'project: vane', 'projeto: vayne',
    'project: mordekaiser', 'projeto: mordekaiser',
    'project: pyke', 'projeto: pyke',
    'project: renekton', 'projeto: renekton',
    'project: ashe', 'projeto: ashe',
    'nightbringer yasuo', 'yasuo emissário da escuridão',
    'god fist lee sin', 'lee sin punhos divinos',
    'storm dragon lee sin', 'lee sin dragão da tormenta',
    'spirit blossom ahri', 'ahri florescer espiritual',
    'star guardian ahri', 'ahri guardiã estelar',
    'star guardian jinx', 'jinx guardiã estelar',
    'star guardian kaisa', 'kai\'sa guardiã estelar',
    'star guardian akali', 'akali guardiã estelar',
    'cosmic lux', 'lux cósmica',
    'dark cosmic lux', 'lux estrela negra',
    'dark cosmic jhin', 'jhin estrela negra',
    'dark star thresh', 'thresh estrela negra',
    'spirit blossom thresh', 'thresh florescer espiritual',
    'battle academia ezreal', 'ezreal academia de batalha',
    'pulsefire caitlyn', 'caitlyn curtindo o verão',
    'battle queen katarina', 'katarina rainha de batalha',
    'coven evelynn', 'evelynn congregação das bruxas',
    'coven morgana', 'morgana congregação das bruxas',
    'dawnbringer riven', 'riven emissária da luz',
    'broken covenant vladimir', 'vladimir pacto quebrado',
    'mecha kingdoms jax', 'jax reinos mecha',
    'high noon lucian', 'lucian velho oeste',
    'high noon senna', 'senna velho oeste',
    'high noon ashe', 'ashe velho oeste',
    'high noon leona', 'leona velho oeste',
    'high noon yone', 'yone velho oeste',
    'soul fighter viego', 'viego lutador espiritual',
    'soul fighter samira', 'samira lutadora espiritual',
    'empyrean pyke', 'pyke empíreo',
    'empyrean varus', 'varus empíreo',
    'winterblessed diana', 'diana bênção do inverno',
    'winterblessed senna', 'senna bênção do inverno',
    'aether wing kayle', 'kayle asas etéreas',
    'galaxy slayer zed', 'zed dizimador de galáxias',
    'odyssey kayn', 'kayn odisseia',
    'blood lord vladimir', 'vladimir lorde do sangue',
    'dunkmaster darius', 'darius mestre da enterrada',
    'god-king garen', 'garen rei do trovão', 'garen deus-rei',
    'god-king darius', 'darius deus-rei',
    'elementalist lux', 'dj sona', 'spirit guard udyr', 'pulsefire ezreal', 'gun goddess miss fortune',
    'k/da all out seraphine', 'k/da all out seraphine indie', 'k/da all out seraphine superstar', 'k/da all out seraphine rising star'
]);

const knownUltimates = new Set([
    'elementalist lux', 'lux elementalista',
    'dj sona',
    'spirit guard udyr', 'udyr guardião espiritual',
    'pulsefire ezreal', 'ezreal pulsefire',
    'gun goddess miss fortune', 'miss fortune vingadora exocósmica',
    'k/da all out seraphine', 'seraphine k/da all out'
]);

async function buildFullCatalog() {
    console.log('[Catalog Builder] 🚀 Sincronizando catálogo completo oficial da Riot Games...');
    const startTime = Date.now();

    // 1. Obter a versão mais recente do LoL
    const verRes = await axios.get('https://ddragon.leagueoflegends.com/api/versions.json');
    const version = verRes.data[0];

    // 2. Baixar todos os campeões e skins (PT e EN)
    const [ptRes, enRes] = await Promise.all([
        axios.get(`https://ddragon.leagueoflegends.com/cdn/${version}/data/pt_BR/championFull.json`),
        axios.get(`https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/championFull.json`)
    ]);

    const ptChamps = ptRes.data.data;
    const enChamps = enRes.data.data;

    // 3. Ler catalog.json bruto da Storefront API da Riot para preços exatos
    let rawStoreItems = {};
    let rawCatalog = [];
    const now = new Date();
    const rawCatalogPath = path.join(__dirname, '../lol_giftapi-main/catalog.json');
    if (fs.existsSync(rawCatalogPath)) {
        try {
            const raw = JSON.parse(fs.readFileSync(rawCatalogPath, 'utf8'));
            if (Array.isArray(raw)) {
                rawCatalog = raw;
                raw.forEach(item => {
                    const offerId = item.offerId;
                    const itemId = item.itemId;
                    const isExpired = (item.active === false) || (item.inactiveDate && new Date(item.inactiveDate) < now);

                    let regularRp = null;
                    let saleRp = null;
                    let discountPercent = null;
                    if (item.prices) {
                        const rpObj = item.prices.find(p => p.currency === 'RP');
                        if (rpObj) regularRp = rpObj.cost;
                    }
                    if (item.sale && item.sale.prices) {
                        const sObj = item.sale.prices.find(p => p.currency === 'RP');
                        if (sObj) saleRp = sObj.cost;
                    }
                    let priceRp = saleRp || regularRp;
                    if (regularRp && saleRp && regularRp > saleRp) {
                        discountPercent = Math.round((1 - saleRp / regularRp) * 100);
                    }

                    const ptLoc = item.localizations?.pt_BR?.name || item.name;
                    const enLoc = item.localizations?.en_US?.name || item.name;

                    const itemStoreInfo = {
                        offerId,
                        itemId,
                        priceRp,
                        regularRp,
                        saleRp,
                        discountPercent,
                        sale: item.sale || null,
                        inventoryType: item.inventoryType,
                        isExpired
                    };

                    if (ptLoc) rawStoreItems[ptLoc.toLowerCase().trim()] = itemStoreInfo;
                    if (enLoc) rawStoreItems[enLoc.toLowerCase().trim()] = itemStoreInfo;
                });
            }
        } catch(e) {}
    }

    const catalogPt = { Skins: {}, Chromas: {}, Champions: {}, Passes: {}, Loot: {}, Emotes: {}, Icons: {}, Wards: {}, Others: {} };
    const catalogEn = { Skins: {}, Chromas: {}, Champions: {}, Passes: {}, Loot: {}, Emotes: {}, Icons: {}, Wards: {}, Others: {} };

    // 4. Processar todos os campeões e skins do Data Dragon
    for (const champKey in ptChamps) {
        const ptC = ptChamps[champKey];
        const enC = enChamps[champKey] || ptC;

        const champPtName = ptC.name;
        const champEnName = enC.name;
        const champId = Number(ptC.key);

        catalogPt.Champions[champPtName] = {
            offer_id: `champ_${champId}`,
            item_id: champId,
            price_rp: 975,
            inventory_type: 'CHAMPION'
        };
        catalogEn.Champions[champEnName] = {
            offer_id: `champ_${champId}`,
            item_id: champId,
            price_rp: 975,
            inventory_type: 'CHAMPION'
        };

        if (ptC.skins && Array.isArray(ptC.skins)) {
            ptC.skins.forEach((skinPt, idx) => {
                if (skinPt.num === 0) return; // Pular skin padrão (default)
                const skinEn = enC.skins ? enC.skins[idx] || skinPt : skinPt;

                const namePt = skinPt.name === 'default' ? `${champPtName} Padrão` : skinPt.name;
                const nameEn = skinEn.name === 'default' ? `${champEnName} Default` : skinEn.name;
                const skinId = skinPt.id;

                // FILTRAR SKINS MÍTICAS / PRESTÍGIO / LIMITADAS (NÃO PRESENTEEÁVEIS VIA RP)
                if (isUnpurchasableOrMythic(namePt) || isUnpurchasableOrMythic(nameEn)) {
                    return; // NÃO ADICIONAR NO CATÁLOGO!
                }

                const storeMatchPt = rawStoreItems[namePt.toLowerCase().trim()];
                const storeMatchEn = rawStoreItems[nameEn.toLowerCase().trim()];

                // SE O ITEM ESTIVER MARCADO COMO EXPIRADO NO STOREFRONT DA RIOT, NÃO EXIBIR!
                if (storeMatchPt?.isExpired || storeMatchEn?.isExpired) {
                    return;
                }

                const isChroma = namePt.includes('(') && namePt.includes(')');

                let priceRp = isChroma ? 290 : 1350;
                let offerId = (storeMatchPt && storeMatchPt.offerId) || (storeMatchEn && storeMatchEn.offerId) || `skin_${skinId}`;

                if (storeMatchPt && storeMatchPt.priceRp) {
                    priceRp = storeMatchPt.priceRp;
                } else if (storeMatchEn && storeMatchEn.priceRp) {
                    priceRp = storeMatchEn.priceRp;
                } else {
                    // Preço de acordo com categoria
                    const cleanEn = nameEn.toLowerCase().replace(/\s*\(.*?\)\s*/g, '').trim();
                    const cleanPt = namePt.toLowerCase().replace(/\s*\(.*?\)\s*/g, '').trim();
                    if (isChroma) {
                        priceRp = 290;
                    } else if (knownUltimates.has(cleanEn) || knownUltimates.has(cleanPt) || cleanEn.includes('ultimate')) {
                        priceRp = 3250;
                    } else if (knownLegendaries.has(cleanEn) || knownLegendaries.has(cleanPt)) {
                        priceRp = 1820;
                    } else {
                        priceRp = 1350; // Epic default
                    }
                }

                const sm = storeMatchEn || storeMatchPt;
                const itemDataPt = {
                    offer_id: offerId,
                    item_id: skinId,
                    price_rp: priceRp,
                    regular_rp: sm?.regularRp || null,
                    sale_rp: sm?.saleRp || null,
                    discount_percent: sm?.discountPercent || null,
                    sale: sm?.sale || null,
                    inventory_type: isChroma ? 'CHROMA' : 'CHAMPION_SKIN',
                    icon_url: `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${ptC.id}_${skinPt.num}.jpg`
                };

                const itemDataEn = {
                    offer_id: offerId,
                    item_id: skinId,
                    price_rp: priceRp,
                    regular_rp: sm?.regularRp || null,
                    sale_rp: sm?.saleRp || null,
                    discount_percent: sm?.discountPercent || null,
                    sale: sm?.sale || null,
                    inventory_type: isChroma ? 'CHROMA' : 'CHAMPION_SKIN',
                    icon_url: `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${enC.id || ptC.id}_${skinEn.num || skinPt.num}.jpg`
                };

                if (isChroma) {
                    catalogPt.Chromas[namePt] = itemDataPt;
                    catalogEn.Chromas[nameEn] = itemDataEn;
                } else {
                    catalogPt.Skins[namePt] = itemDataPt;
                    catalogEn.Skins[nameEn] = itemDataEn;
                }
            });
        }
    }

    // 5. Adicionar Skin e Chroma Bundles da Riot Storefront
    const skinBundlesPt = {};
    const skinBundlesEn = {};

    rawCatalog.forEach(item => {
        const t = (item.inventoryType || '').toUpperCase();
        if (t !== 'BUNDLES' && t !== 'BUNDLE') return;

        // VERIFICAR SE O PACOTE ESTÁ ATIVO E NÃO EXPIROU A DATA DA LOJA
        if (item.active === false) return;
        if (item.inactiveDate && new Date(item.inactiveDate) < now) return;

        const nameEn = item.localizations?.en_US?.name || item.localizations?.pt_BR?.name;
        if (!nameEn) return;
        const namePt = item.localizations?.pt_BR?.name || nameEn;
        const n = nameEn.toLowerCase();

        // Excluir espólios, passes, hextec, baús, chaves, clash, tft, etc.
        if (n.includes('pass') || n.includes('orb') || n.includes('capsule') || n.includes('chest') || n.includes('key') || n.includes('hextech') || n.includes('clash') || n.includes('starter') || n.includes('tft') || n.includes('mystery') || n.includes('arena') || n.includes('choncc') || n.includes('boba') || n.includes('sanctum') || n.includes('tribe bundle') || n.includes('starship bundle') || n.includes('planet bundle')) return;
        if (isUnpurchasableOrMythic(nameEn) || isUnpurchasableOrMythic(namePt)) return;

        let bundleIcon = item.iconUrl;
        if (bundleIcon && bundleIcon.startsWith('//')) bundleIcon = 'https:' + bundleIcon;
        if (!bundleIcon || !bundleIcon.startsWith('http')) bundleIcon = `https://d392eissrffsyf.cloudfront.net/storeImages/bundles/${item.itemId}.png`;

        const price = item.prices?.[0]?.cost || 0;
        skinBundlesPt[namePt] = {
            offer_id: item.offerId || `bundle_${item.itemId}`,
            item_id: item.itemId,
            price_rp: price,
            inventory_type: 'BUNDLES',
            icon_url: bundleIcon
        };
        skinBundlesEn[nameEn] = {
            offer_id: item.offerId || `bundle_${item.itemId}`,
            item_id: item.itemId,
            price_rp: price,
            inventory_type: 'BUNDLES',
            icon_url: bundleIcon
        };
    });

    catalogPt.Bundles = skinBundlesPt;
    catalogEn.Bundles = skinBundlesEn;

    // 6. Extrair Passes, Orbes, Espólios, Hextec, Mistério, Emotes, Ícones, Wards e Boosts diretamente do Storefront da Riot
    const passesPt = {};
    const passesEn = {};
    const lootPt = {};
    const lootEn = {};
    const emotesPt = {};
    const emotesEn = {};
    const iconsPt = {};
    const iconsEn = {};
    const wardsPt = {};
    const wardsEn = {};
    const boostsPt = {};
    const boostsEn = {};
    const companionsPt = {};
    const companionsEn = {};

    rawCatalog.forEach(item => {
        if (item.active === false) return;
        if (item.inactiveDate && new Date(item.inactiveDate) < now) return;

        const nameEn = item.localizations?.en_US?.name || item.localizations?.pt_BR?.name;
        if (!nameEn) return;
        const namePt = item.localizations?.pt_BR?.name || nameEn;
        const n = nameEn.toLowerCase();
        const t = (item.inventoryType || '').toUpperCase();
        const price = item.prices?.[0]?.cost || 0;
        if (price <= 0) return;
        if (isUnpurchasableOrMythic(nameEn) || isUnpurchasableOrMythic(namePt)) return;

        let itemIcon = item.iconUrl;
        if (itemIcon && itemIcon.startsWith('//')) itemIcon = 'https:' + itemIcon;
        if (!itemIcon || !itemIcon.startsWith('http')) {
            if (t === 'BUNDLES' || t === 'EVENT_PASS' || t === 'CHEST') {
                itemIcon = `https://d392eissrffsyf.cloudfront.net/storeImages/bundles/${item.itemId}.png`;
            } else if (t === 'HEXTECH_CRAFTING') {
                itemIcon = `https://d392eissrffsyf.cloudfront.net/en/live-banners/2017-06-01_VSAssets/${item.iconUrl || 'HextechChest_190x190.png'}`;
            } else if (t === 'MYSTERY' || t === 'GIFT') {
                itemIcon = `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/hextech-items/${item.itemId || 1}.png`;
            } else if (t === 'EMOTE') {
                itemIcon = `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/emotes/${item.itemId}.png`;
            } else if (t === 'SUMMONER_ICON') {
                itemIcon = `https://ddragon.leagueoflegends.com/cdn/14.16.1/img/profileicon/${item.itemId}.png`;
            } else if (t === 'WARD_SKIN') {
                itemIcon = `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/ward-skins/${item.itemId}.png`;
            } else {
                itemIcon = `https://d392eissrffsyf.cloudfront.net/storeImages/bundles/${item.itemId}.png`;
            }
        }

        const itemObjPt = {
            offer_id: item.offerId || `item_${item.itemId}`,
            item_id: item.itemId,
            price_rp: price,
            inventory_type: t,
            icon_url: itemIcon
        };
        const itemObjEn = {
            offer_id: item.offerId || `item_${item.itemId}`,
            item_id: item.itemId,
            price_rp: price,
            inventory_type: t,
            icon_url: itemIcon
        };

        // Passes de Evento
        if (t === 'EVENT_PASS' || (t === 'BUNDLES' && n.includes('pass') && !n.includes('level-up') && !n.includes('bank pass'))) {
            passesPt[namePt] = itemObjPt;
            passesEn[nameEn] = itemObjEn;
        }
        // Orbes e Cápsulas
        else if ((t === 'CHEST' || t === 'BUNDLES') && (n.includes('orb') || n.includes('capsule')) && !n.includes('chroma') && !n.includes('orbeeanna') && !n.includes('clash')) {
            lootPt[namePt] = itemObjPt;
            lootEn[nameEn] = itemObjEn;
        }
        // Baús Hextec, Chaves e Mistério
        else if (t === 'HEXTECH_CRAFTING' || (t === 'BUNDLES' && n.includes('hextech')) || t === 'MYSTERY' || (t === 'GIFT' && n.includes('mystery'))) {
            lootPt[namePt] = itemObjPt;
            lootEn[nameEn] = itemObjEn;
        }
        // Emotes
        else if (t === 'EMOTE') {
            emotesPt[namePt] = itemObjPt;
            emotesEn[nameEn] = itemObjEn;
        }
        // Ícones de Invocador
        else if (t === 'SUMMONER_ICON') {
            iconsPt[namePt] = itemObjPt;
            iconsEn[nameEn] = itemObjEn;
        }
        // Skins de Sentinela / Wards
        else if (t === 'WARD_SKIN') {
            wardsPt[namePt] = itemObjPt;
            wardsEn[nameEn] = itemObjEn;
        }
        // Bônus de XP
        else if (t === 'BOOST') {
            boostsPt[namePt] = itemObjPt;
            boostsEn[nameEn] = itemObjEn;
        }
        // Companheiros / TFT Little Legends & Chibis
        else if (t === 'COMPANION') {
            companionsPt[namePt] = itemObjPt;
            companionsEn[nameEn] = itemObjEn;
        }
    });

    catalogPt.Passes = passesPt;
    catalogEn.Passes = passesEn;
    catalogPt.Loot = lootPt;
    catalogEn.Loot = lootEn;
    catalogPt.Emotes = emotesPt;
    catalogEn.Emotes = emotesEn;
    catalogPt.Icons = iconsPt;
    catalogEn.Icons = iconsEn;
    catalogPt.Wards = wardsPt;
    catalogEn.Wards = wardsEn;
    catalogPt.Boosts = boostsPt;
    catalogEn.Boosts = boostsEn;
    catalogPt.LittleLegends = companionsPt;
    catalogEn.LittleLegends = companionsEn;

    // 7. Salvar arquivos
    const botConfigDir = path.join(__dirname, '../config');
    const pyDir = path.join(__dirname, '../lol_giftapi-main');

    const ptPathBot = path.join(botConfigDir, 'catalog_cache_pt.json');
    const enPathBot = path.join(botConfigDir, 'catalog_cache_en.json');
    const ptPathPy = path.join(pyDir, 'catalog_cache_pt.json');
    const enPathPy = path.join(pyDir, 'catalog_cache_en.json');

    fs.writeFileSync(ptPathBot, JSON.stringify(catalogPt, null, 2), 'utf8');
    fs.writeFileSync(enPathBot, JSON.stringify(catalogEn, null, 2), 'utf8');

    if (fs.existsSync(pyDir)) {
        fs.writeFileSync(ptPathPy, JSON.stringify(catalogPt, null, 2), 'utf8');
        fs.writeFileSync(enPathPy, JSON.stringify(catalogEn, null, 2), 'utf8');
    }

    const totalSkins = Object.keys(catalogPt.Skins).length;
    const totalChromas = Object.keys(catalogPt.Chromas).length;
    const totalBundles = Object.keys(catalogPt.Bundles || {}).length;
    const totalChamps = Object.keys(catalogPt.Champions).length;
    const totalAll = totalSkins + totalChromas + totalBundles + totalChamps + Object.keys(catalogPt.Loot).length;

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[Catalog Builder] ✅ Sincronização concluída em ${elapsed}s!`);
    console.log(`[Catalog Builder] 📊 Totais: ${totalSkins} Skins (Míticas/Prestígio Removidas), ${totalChromas} Cromas, ${totalBundles} Pacotes de Skins/Cromas, ${totalChamps} Campeões.`);

    return {
        version,
        totalSkins,
        totalChromas,
        totalChamps,
        totalAll,
        elapsed
    };
}

module.exports = { buildFullCatalog };

if (require.main === module) {
    buildFullCatalog();
}
