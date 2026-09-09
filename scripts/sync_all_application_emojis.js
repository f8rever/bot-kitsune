const { Client, GatewayIntentBits, Events } = require('discord.js');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
require('dotenv').config();

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildEmojisAndStickers]
});

const DELAY_MS = 1200; // Delay seguro para respeitar o rate limit da API do Discord
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const cosmeticPath = path.join(__dirname, '..', 'config', 'cosmetic_emojis.json');
let cosmeticEmojis = {};
if (fs.existsSync(cosmeticPath)) {
    try {
        cosmeticEmojis = JSON.parse(fs.readFileSync(cosmeticPath, 'utf8'));
    } catch (e) {}
}

function saveProgress() {
    try {
        fs.writeFileSync(cosmeticPath, JSON.stringify(cosmeticEmojis, null, 2), 'utf8');
    } catch (e) {}
}

client.once(Events.ClientReady, async () => {
    try {
        console.log(`[Sync Application Emojis] 🚀 Conectado como ${client.user.tag}`);

        const app = await client.application.fetch();
        const appEmojis = await app.emojis.fetch();
        console.log(`[Application Emojis] Total atual: ${appEmojis.size} emojis`);

        // 1. Deletar as 18 wards do servidor Zed Store para liberar o servidor
        const zedStore = client.guilds.cache.get('1540159601817817168');
        if (zedStore) {
            try {
                const zedEms = await zedStore.emojis.fetch();
                const zedWards = zedEms.filter(e => e.name.startsWith('ward_'));
                console.log(`[Zed Store] 🗑️ Removendo ${zedWards.size} wards do servidor Zed Store...`);
                for (const [, em] of zedWards) {
                    try {
                        await em.delete('Migrando para Application Emojis');
                        console.log(`[Zed Store] 🗑️ Deletado: ${em.name}`);
                        await sleep(500);
                    } catch (err) {
                        console.warn(`[Zed Store] ⚠️ Erro ao deletar ${em.name}:`, err.message);
                    }
                }
            } catch (err) {
                console.error('[Zed Store] Erro ao buscar emojis:', err.message);
            }
        }

        // 2. Mapear emojis que já existem no Application
        const existingAppMap = new Map();
        for (const [, em] of appEmojis) {
            existingAppMap.set(em.name, `<:${em.name}:${em.id}>`);
            cosmeticEmojis[em.name] = `<:${em.name}:${em.id}>`;
        }
        saveProgress();
        console.log(`[Application Emojis] 📋 Emojis já cadastrados no Application: ${existingAppMap.size}`);

        // 3. Carregar catálogo oficial
        const catPath = path.join(__dirname, '..', 'config', 'catalog_cache_en.json');
        const catalog = JSON.parse(fs.readFileSync(catPath, 'utf8'));

        const wards = Object.values(catalog.Wards || {});
        const emotes = Object.values(catalog.Emotes || {});
        const icons = Object.values(catalog.Icons || {});

        console.log(`[Catálogo] Encontrados: ${wards.length} Wards, ${emotes.length} Emotes, ${icons.length} Ícones`);

        // 4. Montar lista consolidada de itens para upload
        const queue = [];

        for (const w of wards) {
            const name = `ward_${w.item_id}`;
            if (!existingAppMap.has(name) && w.icon_url) {
                queue.push({ name, url: w.icon_url, type: 'Ward' });
            }
        }

        for (const em of emotes) {
            const name = `emote_${em.item_id}`;
            if (!existingAppMap.has(name) && em.icon_url) {
                queue.push({ name, url: em.icon_url, type: 'Emote' });
            }
        }

        for (const ic of icons) {
            const name = `icon_${ic.item_id}`;
            if (!existingAppMap.has(name) && ic.icon_url) {
                queue.push({ name, url: ic.icon_url, type: 'Icon' });
            }
        }

        console.log(`[Fila de Upload] ⏳ Total de novos emojis para criar no Application: ${queue.length}`);

        let count = 0;
        for (const item of queue) {
            count++;
            let uploaded = false;
            let attempts = 0;

            while (!uploaded && attempts < 4) {
                attempts++;
                try {
                    // Download da imagem
                    const res = await axios.get(item.url, { responseType: 'arraybuffer', timeout: 12000 });
                    const buffer = Buffer.from(res.data);

                    // Criação no Application
                    const em = await app.emojis.create({ attachment: buffer, name: item.name });
                    const tag = `<:${em.name}:${em.id}>`;
                    cosmeticEmojis[item.name] = tag;
                    existingAppMap.set(item.name, tag);
                    saveProgress();

                    console.log(`[${count}/${queue.length}] ✅ Criado no Application: ${item.name} (${item.type}) -> ${tag}`);
                    uploaded = true;
                    await sleep(DELAY_MS);
                } catch (err) {
                    // Tratar Rate Limit (429) do Discord
                    if (err.status === 429 || err.response?.status === 429) {
                        const retryAfter = (err.rawError?.retry_after || err.response?.data?.retry_after || 5);
                        console.warn(`[Rate Limit] ⏳ Aguardando ${retryAfter}s para ${item.name}...`);
                        await sleep((retryAfter * 1000) + 1500);
                    } else {
                        console.error(`[Erro Upload] ❌ Falha em ${item.name} (tentativa ${attempts}):`, err.message);
                        await sleep(2000);
                        if (attempts >= 3) break;
                    }
                }
            }
        }

        // 5. Sincronizar com MongoDB Atlas ao finalizar
        console.log('\n[Sync Final] 💾 Salvando cosmetic_emojis no MongoDB Atlas...');
        try {
            const { saveBotConfigToMongo } = require('../utils/mongoStorage.js');
            await saveBotConfigToMongo('cosmetic_emojis', cosmeticEmojis);
            console.log('✅ cosmetic_emojis sincronizado no MongoDB Atlas com sucesso!');
        } catch (e) {
            console.error('❌ Erro ao salvar no Mongo:', e.message);
        }

        console.log(`\n🎉 Processo concluído! Total de emojis cadastrados: ${Object.keys(cosmeticEmojis).length}`);
        process.exit(0);

    } catch (err) {
        console.error('[Fatal Error]:', err);
        process.exit(1);
    }
});

client.login(process.env.DISCORD_TOKEN);
