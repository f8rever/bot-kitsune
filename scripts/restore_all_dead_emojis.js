const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
require('dotenv').config();

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildEmojisAndStickers]
});

const sleep = ms => new Promise(res => setTimeout(res, ms));

client.once('clientReady', async () => {
    try {
        console.log(`[Restore Emojis] 🚀 Conectado como ${client.user.tag}`);

        const app = await client.application.fetch();
        const appEmojis = await app.emojis.fetch();
        console.log(`[Application Emojis] Total atual: ${appEmojis.size}`);

        const emojisJsonPath = path.join(__dirname, '..', 'config', 'emojis.json');
        const embedsJsonPath = path.join(__dirname, '..', 'config', 'embeds.json');
        const pyEmbedsPath = path.join(__dirname, '..', 'python_backend', 'embeds.json');

        const emojisRaw = fs.readFileSync(emojisJsonPath, 'utf8');
        const embedsRaw = fs.readFileSync(embedsJsonPath, 'utf8');

        // Regex para encontrar todos os emojis customizados: <a:name:id> ou <:name:id>
        const regex = /<(a)?:([a-zA-Z0-9_]+):([0-9]+)>/g;
        const allFound = new Map();

        let m;
        while ((m = regex.exec(emojisRaw + '\n' + embedsRaw)) !== null) {
            const isAnim = !!m[1];
            const name = m[2];
            const id = m[3];
            if (!allFound.has(id)) {
                allFound.set(id, { name, isAnim, id, tag: m[0] });
            }
        }

        console.log(`[Audit] Total de emojis únicos encontrados nos configs: ${allFound.size}`);

        // Verificar quais emojis já são acessíveis (em guilds ou app)
        const guildEms = new Map();
        for (const [, guild] of client.guilds.cache) {
            const ems = await guild.emojis.fetch();
            for (const [id, em] of ems) {
                guildEms.set(id, em);
            }
        }

        const deadEmojis = [];
        for (const [id, item] of allFound) {
            const inApp = appEmojis.has(id);
            const inGuild = guildEms.has(id);
            if (!inApp && !inGuild) {
                deadEmojis.push(item);
            }
        }

        console.log(`[Audit] Emojis mortos/inacessíveis a restaurar: ${deadEmojis.length}`);

        const replacements = new Map();

        for (const item of deadEmojis) {
            try {
                // Verificar se já existe um emoji no app com esse nome
                let existingApp = appEmojis.find(e => e.name.toLowerCase() === item.name.toLowerCase());
                if (existingApp) {
                    console.log(`[Restore] Reutilizando app emoji existente para ${item.name}: ${existingApp.id}`);
                    const newTag = existingApp.animated ? `<a:${existingApp.name}:${existingApp.id}>` : `<:${existingApp.name}:${existingApp.id}>`;
                    replacements.set(item.tag, newTag);
                    continue;
                }

                // Tentar baixar do CDN do Discord
                const ext = item.isAnim ? 'gif' : 'png';
                const cdnUrl = `https://cdn.discordapp.com/emojis/${item.id}.${ext}`;
                console.log(`[Restore] Baixando ${item.name} (${item.id}) de ${cdnUrl}...`);
                
                let res;
                try {
                    res = await axios.get(cdnUrl, { responseType: 'arraybuffer', timeout: 8000 });
                } catch (e) {
                    if (item.isAnim) {
                        // Tentar png se gif falhar
                        res = await axios.get(`https://cdn.discordapp.com/emojis/${item.id}.png`, { responseType: 'arraybuffer', timeout: 8000 });
                    } else {
                        throw e;
                    }
                }

                const buf = Buffer.from(res.data);
                // Sanitize emoji name (alfanumérico e underscore, 2 a 32 caracteres)
                let cleanName = item.name.replace(/[^a-zA-Z0-9_]/g, '_');
                if (cleanName.length < 2) cleanName = 'e_' + cleanName;
                if (cleanName.length > 32) cleanName = cleanName.substring(0, 32);

                console.log(`[Restore] Fazendo upload como Application Emoji: ${cleanName}...`);
                const created = await app.emojis.create({ attachment: buf, name: cleanName });
                console.log(`[Restore] ✅ Criado com sucesso: ${created.name} (${created.id})`);

                const newTag = created.animated ? `<a:${created.name}:${created.id}>` : `<:${created.name}:${created.id}>`;
                replacements.set(item.tag, newTag);

                // Rate limit safety
                await sleep(1500);
            } catch (err) {
                console.error(`[Restore] ❌ Falha ao restaurar ${item.name} (${item.id}):`, err.response ? err.response.statusText : err.message);
            }
        }

        console.log(`[Apply] Substituindo ${replacements.size} emojis nos arquivos de configuração...`);

        let newEmojisContent = emojisRaw;
        let newEmbedsContent = embedsRaw;
        let newPyEmbedsContent = fs.existsSync(pyEmbedsPath) ? fs.readFileSync(pyEmbedsPath, 'utf8') : '';

        for (const [oldTag, newTag] of replacements) {
            console.log(`  Replacing ${oldTag} -> ${newTag}`);
            newEmojisContent = newEmojisContent.split(oldTag).join(newTag);
            newEmbedsContent = newEmbedsContent.split(oldTag).join(newTag);
            if (newPyEmbedsContent) {
                newPyEmbedsContent = newPyEmbedsContent.split(oldTag).join(newTag);
            }
        }

        fs.writeFileSync(emojisJsonPath, newEmojisContent, 'utf8');
        fs.writeFileSync(embedsJsonPath, newEmbedsContent, 'utf8');
        if (newPyEmbedsContent) {
            fs.writeFileSync(pyEmbedsPath, newPyEmbedsContent, 'utf8');
        }

        console.log(`[Done] 🎉 Todos os arquivos de configuração foram atualizados com sucesso!`);
        process.exit(0);
    } catch (fatal) {
        console.error('[Fatal Error]:', fatal);
        process.exit(1);
    }
});

client.login(process.env.DISCORD_TOKEN);
