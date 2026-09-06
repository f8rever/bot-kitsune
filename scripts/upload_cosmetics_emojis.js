const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
require('dotenv').config();

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildEmojisAndStickers]
});

const DELAY_MS = 1500;
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

client.once('ready', async () => {
    try {
        console.log(`[Emoji Uploader] 🚀 Conectado como ${client.user.tag}`);

        const cosmeticPath = path.join(__dirname, '..', 'config', 'cosmetic_emojis.json');
        let cosmeticEmojis = {};
        if (fs.existsSync(cosmeticPath)) {
            try {
                cosmeticEmojis = JSON.parse(fs.readFileSync(cosmeticPath, 'utf8'));
            } catch (e) {}
        }

        // 1. Indexar emojis já existentes no cache do cliente (Guilds e App)
        const app = await client.application.fetch();
        const appEmojis = await app.emojis.fetch();
        for (const [id, em] of appEmojis) {
            if (em.name.startsWith('ward_') || em.name.startsWith('emote_') || em.name.startsWith('icon_')) {
                const tag = em.animated ? `<a:${em.name}:${em.id}>` : `<:${em.name}:${em.id}>`;
                cosmeticEmojis[em.name] = tag;
            }
        }

        for (const [gId, guild] of client.guilds.cache) {
            const gEmojis = await guild.emojis.fetch();
            for (const [id, em] of gEmojis) {
                if (em.name.startsWith('ward_') || em.name.startsWith('emote_') || em.name.startsWith('icon_')) {
                    const tag = em.animated ? `<a:${em.name}:${em.id}>` : `<:${em.name}:${em.id}>`;
                    cosmeticEmojis[em.name] = tag;
                }
            }
        }

        console.log(`[Emoji Uploader] 📋 Emojis cosméticos já existentes indexados: ${Object.keys(cosmeticEmojis).length}`);

        // 2. Carregar catálogo oficial
        const catPath = path.join(__dirname, '..', 'config', 'catalog_cache_en.json');
        const catalog = JSON.parse(fs.readFileSync(catPath, 'utf8'));

        const wards = Object.values(catalog.Wards || {});
        const emotes = Object.values(catalog.Emotes || {});
        const icons = Object.values(catalog.Icons || {});

        console.log(`[Emoji Uploader] 📦 Catálogo: ${wards.length} Wards, ${emotes.length} Emotes, ${icons.length} Icons`);

        // Identificar servidores alvo
        const zedStore = client.guilds.cache.get('1540159601817817168');
        const kitsuneGaming = client.guilds.cache.get('1482818033838719201');
        const kitsuneService = client.guilds.cache.get('1128760372741034114');

        async function uploadItemEmoji(name, imageUrl) {
            if (cosmeticEmojis[name]) return cosmeticEmojis[name];
            if (!imageUrl || !imageUrl.startsWith('http')) return null;

            let buffer = null;
            try {
                const res = await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 12000 });
                buffer = Buffer.from(res.data);
            } catch (err) {
                console.warn(`[Emoji Uploader] ⚠️ Falha ao baixar imagem para ${name} (${imageUrl}): ${err.message}`);
                return null;
            }

            // Selecionar destino com slots livres
            // Prioridade 1: App Emojis (50 slots)
            const currentAppEms = await app.emojis.fetch();
            if (currentAppEms.size < 50) {
                try {
                    const em = await app.emojis.create({ attachment: buffer, name });
                    const tag = `<:${em.name}:${em.id}>`;
                    cosmeticEmojis[name] = tag;
                    console.log(`[App Emoji] ✅ Criado ${name} -> ${tag} (${currentAppEms.size + 1}/50)`);
                    await sleep(DELAY_MS);
                    return tag;
                } catch (e) {
                    console.error(`[App Emoji Error] ${name}:`, e.message);
                }
            }

            // Prioridade 2: Zed Store (Static)
            if (zedStore) {
                const zedEms = await zedStore.emojis.fetch();
                const staticCount = zedEms.filter(e => !e.animated).size;
                const max = zedStore.maximumEmojis || 50;
                if (staticCount < max) {
                    try {
                        const em = await zedStore.emojis.create({ attachment: buffer, name });
                        const tag = `<:${em.name}:${em.id}>`;
                        cosmeticEmojis[name] = tag;
                        console.log(`[Zed Store] ✅ Criado ${name} -> ${tag} (${staticCount + 1}/${max})`);
                        await sleep(DELAY_MS);
                        return tag;
                    } catch (e) {
                        console.error(`[Zed Store Error] ${name}:`, e.message);
                    }
                }
            }

            // Prioridade 3: KITSUNE x GAMING v2 (Static)
            if (kitsuneGaming) {
                const kgEms = await kitsuneGaming.emojis.fetch();
                const staticCount = kgEms.filter(e => !e.animated).size;
                const max = kitsuneGaming.maximumEmojis || 50;
                if (staticCount < max) {
                    try {
                        const em = await kitsuneGaming.emojis.create({ attachment: buffer, name });
                        const tag = `<:${em.name}:${em.id}>`;
                        cosmeticEmojis[name] = tag;
                        console.log(`[Gaming v2] ✅ Criado ${name} -> ${tag} (${staticCount + 1}/${max})`);
                        await sleep(DELAY_MS);
                        return tag;
                    } catch (e) {
                        console.error(`[Gaming v2 Error] ${name}:`, e.message);
                    }
                }
            }

            return null;
        }

        // --- UPLOAD WARDS (Todas as 68 Wards) ---
        console.log('\n--- UPLOAD DE WARDS ---');
        let wardsUploaded = 0;
        for (const w of wards) {
            const key = `ward_${w.item_id}`;
            if (cosmeticEmojis[key]) continue;
            const res = await uploadItemEmoji(key, w.icon_url);
            if (res) wardsUploaded++;
        }
        console.log(`[Emoji Uploader] 👁️ Wards finalizadas (${wardsUploaded} novas criadas)`);

        // --- UPLOAD EMOTES (Slots restantes) ---
        console.log('\n--- UPLOAD DE EMOTES ---');
        let emotesUploaded = 0;
        for (const em of emotes) {
            const key = `emote_${em.item_id}`;
            if (cosmeticEmojis[key]) continue;
            const res = await uploadItemEmoji(key, em.icon_url);
            if (res) {
                emotesUploaded++;
            } else {
                // Sem slots livres restantes
                console.log(`[Emoji Uploader] ℹ️ Limite de slots atingido para Emotes.`);
                break;
            }
        }
        console.log(`[Emoji Uploader] 😃 Emotes finalizados (${emotesUploaded} novos criados)`);

        // Salvar em arquivo local
        fs.writeFileSync(cosmeticPath, JSON.stringify(cosmeticEmojis, null, 2), 'utf8');
        console.log(`\n[Emoji Uploader] 💾 Salvo em ${cosmeticPath} com ${Object.keys(cosmeticEmojis).length} emojis mapeados!`);

        // Sincronizar com MongoDB Atlas
        try {
            const mongoStorage = require('../utils/mongoStorage.js');
            await mongoStorage.saveConfiguration('cosmetic_emojis', cosmeticEmojis);
            console.log('[Emoji Uploader] ☁️ Sincronizado com MongoDB Atlas (bot_configurations)!');
        } catch (mErr) {
            console.warn('[Emoji Uploader] ⚠️ MongoDB sync warning:', mErr.message);
        }

    } catch (err) {
        console.error('[Emoji Uploader Fatal Error]:', err);
    } finally {
        client.destroy();
        process.exit(0);
    }
});

client.login(process.env.DISCORD_TOKEN);
