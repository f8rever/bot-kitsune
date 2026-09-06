const { Client, GatewayIntentBits, Events } = require('discord.js');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { PNG } = require('pngjs');
const GIFEncoder = require('gif-encoder-2');
require('dotenv').config();

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildEmojisAndStickers]
});

const DELAY_MS = 1500;
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function pngToAnimatedGif(pngBuffer) {
    const png = PNG.sync.read(pngBuffer);
    const encoder = new GIFEncoder(png.width, png.height, 'octree');
    encoder.setDelay(1000);
    encoder.start();
    encoder.addFrame({ data: png.data });
    encoder.addFrame({ data: png.data });
    encoder.finish();
    return encoder.out.getData();
}

client.once(Events.ClientReady, async () => {
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
            if (em.name.startsWith('ward_') || em.name.startsWith('emote_') || em.name.startsWith('icon_') || em.name.startsWith('arena_') || em.name.startsWith('legend_') || em.name.startsWith('chibi_')) {
                const tag = em.animated ? `<a:${em.name}:${em.id}>` : `<:${em.name}:${em.id}>`;
                cosmeticEmojis[em.name] = tag;
            }
        }

        for (const [gId, guild] of client.guilds.cache) {
            const gEmojis = await guild.emojis.fetch();
            for (const [id, em] of gEmojis) {
                if (em.name.startsWith('ward_') || em.name.startsWith('emote_') || em.name.startsWith('icon_') || em.name.startsWith('arena_') || em.name.startsWith('legend_') || em.name.startsWith('chibi_')) {
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
        const arenas = Object.values(catalog.TFTArena || {});
        const legends = Object.values(catalog.LittleLegends || {});

        console.log(`[Emoji Uploader] 📦 Catálogo: ${wards.length} Wards, ${emotes.length} Emotes, ${arenas.length} Arenas, ${legends.length} Little Legends`);

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

        const targetGuilds = [zedStore, kitsuneService].filter(Boolean);
        const guildAnimCounts = new Map();
        const guildStaticCounts = new Map();

        for (const guild of targetGuilds) {
            try {
                const ems = await guild.emojis.fetch();
                guildAnimCounts.set(guild.id, ems.filter(e => e.animated).size);
                guildStaticCounts.set(guild.id, ems.filter(e => !e.animated).size);
                console.log(`[Slot Status] ${guild.name}: ${guildStaticCounts.get(guild.id)}/50 static, ${guildAnimCounts.get(guild.id)}/50 animated`);
            } catch (e) {
                console.error(`[Slot Fetch Error] ${guild.name}:`, e.message);
            }
        }

        function saveProgress() {
            try {
                fs.writeFileSync(cosmeticPath, JSON.stringify(cosmeticEmojis, null, 2), 'utf8');
            } catch (e) {}
        }

        let roundRobinIndex = 0;

        async function uploadAnimatedEmoji(name, imageUrl) {
            if (cosmeticEmojis[name]) return cosmeticEmojis[name];
            if (!imageUrl || !imageUrl.startsWith('http')) return null;

            console.log(`[Emoji Uploader] ⏳ Processando ${name}...`);
            let gifBuffer = null;
            try {
                const res = await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 12000 });
                gifBuffer = pngToAnimatedGif(Buffer.from(res.data));
            } catch (err) {
                console.warn(`[Emoji Uploader] ⚠️ Falha ao converter imagem para ${name}: ${err.message}`);
                return null;
            }

            for (let i = 0; i < targetGuilds.length; i++) {
                const guild = targetGuilds[(roundRobinIndex + i) % targetGuilds.length];
                const animCount = guildAnimCounts.get(guild.id) || 0;
                const max = guild.maximumEmojis || 50;
                if (animCount < max) {
                    console.log(`[Emoji Uploader] 📤 Tentando ${name} em ${guild.name} (${animCount}/${max})...`);
                    try {
                        const em = await guild.emojis.create({ attachment: gifBuffer, name });
                        const tag = `<a:${em.name}:${em.id}>`;
                        cosmeticEmojis[name] = tag;
                        guildAnimCounts.set(guild.id, animCount + 1);
                        roundRobinIndex = (roundRobinIndex + i + 1) % targetGuilds.length;
                        console.log(`[${guild.name} Anim] ✅ Criado ${name} -> ${tag} (${animCount + 1}/${max})`);
                        saveProgress();
                        await sleep(DELAY_MS);
                        return tag;
                    } catch (e) {
                        console.error(`[Anim Emoji Error] ${guild.name} ${name}:`, e.message);
                        if (e.message && e.message.includes('Maximum number of emojis reached')) {
                            guildAnimCounts.set(guild.id, max);
                        } else if (e.status === 429 || (e.message && e.message.includes('rate limit'))) {
                            console.log(`[Rate Limit] ${guild.name} em cooldown. Tentando próximo servidor no round-robin...`);
                        }
                    }
                }
            }
            return null;
        }

        // --- VERIFICAÇÃO DE SLOTS ESTÁTICOS ---
        const totalStaticFree = Math.max(0, 50 - appEmojis.size) +
            Math.max(0, (zedStore?.maximumEmojis || 50) - (guildStaticCounts.get(zedStore?.id) || 50)) +
            Math.max(0, (kitsuneGaming?.maximumEmojis || 50) - (guildStaticCounts.get(kitsuneGaming?.id) || 50));
        console.log(`[Slot Status] Slots estáticos livres no total: ${totalStaticFree}`);

        if (totalStaticFree > 0) {
            console.log('\n--- UPLOAD DE WARDS ---');
            let wardsUploaded = 0;
            for (const w of wards) {
                const key = `ward_${w.item_id}`;
                if (cosmeticEmojis[key]) continue;
                const res = await uploadItemEmoji(key, w.icon_url);
                if (res) {
                    wardsUploaded++;
                    saveProgress();
                }
            }
            console.log(`[Emoji Uploader] 👁️ Wards finalizadas (${wardsUploaded} novas criadas)`);

            console.log('\n--- UPLOAD DE EMOTES ---');
            let emotesUploaded = 0;
            for (const em of emotes) {
                const key = `emote_${em.item_id}`;
                if (cosmeticEmojis[key]) continue;
                const res = await uploadItemEmoji(key, em.icon_url);
                if (res) {
                    emotesUploaded++;
                    saveProgress();
                } else {
                    break;
                }
            }
            console.log(`[Emoji Uploader] 😃 Emotes finalizados (${emotesUploaded} novos criados)`);
        } else {
            console.log(`[Emoji Uploader] ℹ️ Todos os slots estáticos estão 100% cheios (App: 50/50, Servidores: 50/50). Pulando Wards/Emotes.`);
        }

        // --- UPLOAD TFT ARENAS (Slots animados) ---
        console.log('\n--- UPLOAD DE TFT ARENAS ---');
        let arenasUploaded = 0;
        for (const ar of arenas) {
            const key = `arena_${ar.item_id || ar.id}`;
            if (cosmeticEmojis[key]) continue;
            const res = await uploadAnimatedEmoji(key, ar.icon_url);
            if (res) arenasUploaded++;
        }
        console.log(`[Emoji Uploader] 🏟️ TFT Arenas finalizadas (${arenasUploaded} novas criadas)`);

        // --- UPLOAD LITTLE LEGENDS & CHIBIS (Slots animados restantes) ---
        console.log('\n--- UPLOAD DE LITTLE LEGENDS & CHIBIS ---');
        const popularOrder = [
            'dango', 'choncc', 'pengu', 'fuwa', 'shisa', 'poro', 'ao shin', 'hushtail',
            'furyhorn', 'silverwing', 'hauntling', 'qiqi', 'melisma', 'ossia', 'squink',
            'bellswayer', 'umbra', 'burno', 'abyssia', 'fenroar', 'dowsie', 'poggles',
            'piximander', 'molediver', 'starmaw', 'lightcharger', 'tocker', 'paddlemar',
            'craggle', 'flutterbug', 'blubble', 'snek', 'kuro'
        ];

        const sortedLegends = [...legends].sort((a, b) => {
            const nameA = (a.nome || a.name || '').toLowerCase();
            const nameB = (b.nome || b.name || '').toLowerCase();
            let scoreA = 999;
            let scoreB = 999;
            popularOrder.forEach((k, idx) => {
                if (nameA.includes(k) && scoreA === 999) scoreA = idx;
                if (nameB.includes(k) && scoreB === 999) scoreB = idx;
            });
            return scoreA - scoreB;
        });

        let legendsUploaded = 0;
        for (const leg of sortedLegends) {
            const key = `legend_${leg.item_id || leg.id}`;
            if (cosmeticEmojis[key]) continue;
            const res = await uploadAnimatedEmoji(key, leg.icon_url);
            if (res) {
                legendsUploaded++;
            } else {
                console.log(`[Emoji Uploader] ℹ️ Limite de slots animados atingido para Little Legends.`);
                break;
            }
        }
        console.log(`[Emoji Uploader] 🐥 Little Legends finalizadas (${legendsUploaded} novas criadas)`);

        // Salvar em arquivo local final
        fs.writeFileSync(cosmeticPath, JSON.stringify(cosmeticEmojis, null, 2), 'utf8');
        console.log(`\n[Emoji Uploader] 💾 Salvo em ${cosmeticPath} com ${Object.keys(cosmeticEmojis).length} emojis mapeados!`);

        // Sincronizar com MongoDB Atlas
        try {
            const mongoStorage = require('../utils/mongoStorage.js');
            await mongoStorage.saveBotConfigToMongo('cosmetic_emojis', cosmeticEmojis);
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
