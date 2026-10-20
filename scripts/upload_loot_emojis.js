const { Client, GatewayIntentBits, Events } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

const emojisToUpload = [
    { name: 'lol_worlds_orb', file: 'temp_loot_icons/lol_worlds_orb.png' },
    { name: 'lol_worlds_deluxe', file: 'temp_loot_icons/lol_worlds_deluxe.png' },
    { name: 'lol_worlds_premium', file: 'temp_loot_icons/lol_worlds_premium.png' },
    { name: 'lol_worlds_mega', file: 'temp_loot_icons/lol_worlds_mega.png' },
    { name: 'lol_worlds_pass', file: 'temp_loot_icons/lol_worlds_pass.png' },
    { name: 'lol_summoner_orb', file: 'temp_loot_icons/lol_summoner_orb.png' },
    { name: 'lol_summoner_deluxe', file: 'temp_loot_icons/lol_summoner_deluxe.png' },
    { name: 'lol_summoner_premium', file: 'temp_loot_icons/lol_summoner_premium.png' },
    { name: 'lol_summoner_mega', file: 'temp_loot_icons/lol_summoner_mega.png' },
];

client.once(Events.ClientReady, async () => {
    try {
        console.log(`[Loot Emoji Uploader] 🚀 Conectado como ${client.user.tag}`);
        const app = await client.application.fetch();
        const appEmojis = await app.emojis.fetch();
        console.log(`[Loot Emoji Uploader] Total de application emojis atuais: ${appEmojis.size}`);

        const results = {};

        for (const item of emojisToUpload) {
            const existing = appEmojis.find(e => e.name === item.name);
            if (existing) {
                console.log(`[Loot Emoji Uploader] ✅ Emoji '${item.name}' já existe: ${existing.toString()}`);
                results[item.name] = existing.toString();
                continue;
            }

            const filePath = path.resolve(__dirname, '..', item.file);
            if (!fs.existsSync(filePath)) {
                console.warn(`[Loot Emoji Uploader] ⚠️ Arquivo não encontrado: ${filePath}`);
                continue;
            }

            const buffer = fs.readFileSync(filePath);
            console.log(`[Loot Emoji Uploader] ⬆️ Enviando emoji '${item.name}' (${buffer.length} bytes)...`);
            try {
                const created = await app.emojis.create({
                    attachment: buffer,
                    name: item.name
                });
                console.log(`[Loot Emoji Uploader] 🎉 Criado com sucesso: ${created.name} -> ${created.toString()}`);
                results[item.name] = created.toString();
            } catch (err) {
                console.error(`[Loot Emoji Uploader] ❌ Erro ao criar '${item.name}':`, err.message);
            }
            await new Promise(r => setTimeout(r, 1200));
        }

        console.log('\n--- RESULTADOS ---');
        console.log(JSON.stringify(results, null, 2));

        // Atualizar emojis.json
        const emojisJsonPath = path.join(__dirname, '..', 'config', 'emojis.json');
        if (fs.existsSync(emojisJsonPath)) {
            const emojisData = JSON.parse(fs.readFileSync(emojisJsonPath, 'utf8'));
            if (!emojisData.loot) emojisData.loot = {};

            if (results['lol_worlds_orb']) emojisData.loot.worlds_orb = results['lol_worlds_orb'];
            if (results['lol_worlds_deluxe']) emojisData.loot.worlds_deluxe = results['lol_worlds_deluxe'];
            if (results['lol_worlds_premium']) emojisData.loot.worlds_premium = results['lol_worlds_premium'];
            if (results['lol_worlds_mega']) emojisData.loot.worlds_mega = results['lol_worlds_mega'];
            if (results['lol_worlds_pass']) emojisData.loot.worlds_pass = results['lol_worlds_pass'];

            if (results['lol_summoner_orb']) emojisData.loot.summoner_orb = results['lol_summoner_orb'];
            if (results['lol_summoner_deluxe']) emojisData.loot.summoner_deluxe = results['lol_summoner_deluxe'];
            if (results['lol_summoner_premium']) emojisData.loot.summoner_premium = results['lol_summoner_premium'];
            if (results['lol_summoner_mega']) emojisData.loot.summoner_mega = results['lol_summoner_mega'];

            // Se for o orbe ativo atual (Worlds 2026), definir também como padrão
            if (results['lol_worlds_orb']) emojisData.loot.orb = results['lol_worlds_orb'];
            if (results['lol_worlds_pass']) emojisData.loot.pass = results['lol_worlds_pass'];
            if (results['lol_worlds_deluxe']) emojisData.loot.deluxe = results['lol_worlds_deluxe'];
            if (results['lol_worlds_premium']) emojisData.loot.premium = results['lol_worlds_premium'];
            if (results['lol_worlds_mega']) emojisData.loot.megaorb = results['lol_worlds_mega'];

            fs.writeFileSync(emojisJsonPath, JSON.stringify(emojisData, null, 2), 'utf8');
            console.log('✅ config/emojis.json atualizado com os novos emojis de loot!');
        }

        process.exit(0);
    } catch (error) {
        console.error('[Loot Emoji Uploader] 💥 Erro fatal:', error);
        process.exit(1);
    }
});

client.login(process.env.DISCORD_TOKEN);
