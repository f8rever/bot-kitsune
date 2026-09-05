const fs = require('fs');
const path = require('path');
const { fetchStoreCatalogFromRiot } = require('../utils/riotAuth');
const { buildFullCatalog } = require('../utils/buildFullCatalog');

async function main() {
    console.log('====================================================');
    console.log('🚀 ATUALIZADOR AUTOMÁTICO DE CATÁLOGO RIOT - KITSUNE');
    console.log('====================================================');

    // 1. Obter token e região
    let token = process.argv[2];
    let region = process.argv[3] || 'BR1';

    if (!token) {
        // Tentar obter da primeira conta conectada em config/riot_accounts.json
        const accPath = path.join(__dirname, '../config/riot_accounts.json');
        if (fs.existsSync(accPath)) {
            try {
                const accs = JSON.parse(fs.readFileSync(accPath, 'utf8'));
                const list = Array.isArray(accs) ? accs : Object.values(accs);
                const activeAcc = list.find(a => a.accessToken);
                if (activeAcc) {
                    token = activeAcc.accessToken;
                    region = activeAcc.region || 'BR1';
                    console.log(`[Catalog Updater] 🔑 Usando conta vinculada: ${activeAcc.accountName || activeAcc.gameName} (${region})`);
                }
            } catch (e) {}
        }
    }

    if (!token) {
        console.error('❌ Erro: Nenhum token fornecido ou conta ativa encontrada em config/riot_accounts.json.');
        console.log('Uso: node scripts/update_catalog_from_riot.js <ACCESS_TOKEN> [REGION]');
        console.log('Ou faça login/vincule uma conta no bot com /login ou /link.');
        process.exit(1);
    }

    console.log(`[Catalog Updater] 📡 Baixando catálogo ao vivo da Riot Storefront API (${region})...`);
    const rawCatalog = await fetchStoreCatalogFromRiot(token, region, 'en_US');

    if (!rawCatalog || !Array.isArray(rawCatalog) || rawCatalog.length === 0) {
        console.error('❌ Falha ao baixar catálogo da Riot Storefront API. Verifique o token ou a região.');
        process.exit(1);
    }

    console.log(`[Catalog Updater] ✅ ${rawCatalog.length} itens recebidos da loja oficial da Riot!`);

    // 2. Salvar dumps brutos
    const pyPath = path.join(__dirname, '../python_backend/catalog.json');
    const lolGiftPath = path.join(__dirname, '../lol_giftapi-main/catalog.json');

    fs.writeFileSync(pyPath, JSON.stringify(rawCatalog, null, 2), 'utf8');
    fs.writeFileSync(lolGiftPath, JSON.stringify(rawCatalog, null, 2), 'utf8');
    console.log(`[Catalog Updater] 💾 Dumps brutos salvos em python_backend/catalog.json e lol_giftapi-main/catalog.json.`);

    // 3. Recompilar o catálogo do bot (catalog_cache_en.json)
    console.log(`[Catalog Updater] ⚙️ Recompilando catalog_cache_en.json e catalog_cache_pt.json...`);
    const stats = await buildFullCatalog();

    console.log('====================================================');
    console.log(`🎉 CATÁLOGO ATUALIZADO COM SUCESSO!`);
    console.log(`Total de skins: ${stats.totalSkins}`);
    console.log(`Total de cromas: ${stats.totalChromas}`);
    console.log(`Total de pacotes: ${stats.totalBundles}`);
    console.log('====================================================');
}

if (require.main === module) {
    main().catch(err => {
        console.error('Erro fatal ao atualizar catálogo:', err);
        process.exit(1);
    });
}

module.exports = { main };
