const { Client, GatewayIntentBits, Events } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

const emojisToUpload = [
    { name: 'lol_pass_hol', file: 'lol_pass_hol.png', label: 'Passe Hall of Legends' },
    { name: 'lol_orb_hol', file: 'lol_orb_hol.png', label: 'Orbe Hall of Legends' },
    { name: 'lol_deluxe_hol', file: 'lol_deluxe_hol.png', label: 'Pacote Deluxe Hall of Legends' },
    { name: 'lol_premium_hol', file: 'lol_premium_hol.png', label: 'Pacote Premium Hall of Legends' },
    { name: 'lol_megaorb_hol', file: 'lol_megaorb_hol.png', label: 'Mega Pacote Hall of Legends' }
];

client.once('clientReady', async () => {
    try {
        console.log(`[Upload Bot Emojis] 🚀 Conectado como ${client.user.tag}`);

        const app = await client.application.fetch();
        const appEmojis = await app.emojis.fetch();
        console.log(`[Application Emojis] Total atual no bot: ${appEmojis.size} emojis`);

        const createdTags = {};

        for (const item of emojisToUpload) {
            const filePath = path.join(__dirname, '..', 'temp_emojis', item.file);
            if (!fs.existsSync(filePath)) {
                console.warn(`[Aviso] Arquivo ${filePath} não encontrado, pulando...`);
                continue;
            }

            // Verificar se já existe no Application do Bot
            const existing = appEmojis.find(e => e.name === item.name);
            if (existing) {
                const tag = `<:${existing.name}:${existing.id}>`;
                console.log(`[Já existe no Bot] ℹ️ ${item.name} -> ${tag}`);
                createdTags[item.name] = tag;
            } else {
                console.log(`[Criando no Bot] ⏳ Enviando emoji ${item.name} (${item.label}) para o Bot Application...`);
                const buffer = fs.readFileSync(filePath);
                const em = await app.emojis.create({ attachment: buffer, name: item.name });
                const tag = `<:${em.name}:${em.id}>`;
                console.log(`[Criado com Sucesso!] ✅ ${item.name} -> ${tag}`);
                createdTags[item.name] = tag;
                await new Promise(r => setTimeout(r, 1500));
            }
        }

        // Atualizar config/emojis.json
        const emojisJsonPath = path.join(__dirname, '..', 'config', 'emojis.json');
        if (fs.existsSync(emojisJsonPath)) {
            const emojisData = JSON.parse(fs.readFileSync(emojisJsonPath, 'utf8'));
            if (!emojisData.loot) emojisData.loot = {};
            
            if (createdTags.lol_pass_hol) emojisData.loot.pass_hol = createdTags.lol_pass_hol;
            if (createdTags.lol_orb_hol) emojisData.loot.orb_hol = createdTags.lol_orb_hol;
            if (createdTags.lol_deluxe_hol) emojisData.loot.deluxe_hol = createdTags.lol_deluxe_hol;
            if (createdTags.lol_premium_hol) emojisData.loot.premium_hol = createdTags.lol_premium_hol;
            if (createdTags.lol_megaorb_hol) emojisData.loot.megaorb_hol = createdTags.lol_megaorb_hol;

            fs.writeFileSync(emojisJsonPath, JSON.stringify(emojisData, null, 2), 'utf8');
            console.log('✅ config/emojis.json atualizado com os novos emojis do Bot!');
        }

        // Atualizar config/cosmetic_emojis.json
        const cosmeticPath = path.join(__dirname, '..', 'config', 'cosmetic_emojis.json');
        if (fs.existsSync(cosmeticPath)) {
            try {
                const cosm = JSON.parse(fs.readFileSync(cosmeticPath, 'utf8'));
                Object.assign(cosm, createdTags);
                fs.writeFileSync(cosmeticPath, JSON.stringify(cosm, null, 2), 'utf8');
                console.log('✅ config/cosmetic_emojis.json atualizado com sucesso!');
            } catch (e) {}
        }

        // Sincronizar com MongoDB Atlas se configurado
        try {
            const { saveBotConfigToMongo } = require('../utils/mongoStorage.js');
            const emojisData = JSON.parse(fs.readFileSync(emojisJsonPath, 'utf8'));
            await saveBotConfigToMongo('emojis', emojisData);
            console.log('✅ Emojis salvos no MongoDB Atlas com sucesso!');
        } catch (e) {
            console.warn('⚠️ Não foi possível salvar no Mongo (opcional):', e.message);
        }

        console.log('\n🎉 TODOS OS EMOJIS FORAM CRIADOS DIRETAMENTE NO BOT (NÃO NO SERVIDOR)!');
        for (const [k, v] of Object.entries(createdTags)) {
            console.log(`  ${k} => ${v}`);
        }

        process.exit(0);
    } catch (err) {
        console.error('❌ Erro durante upload dos emojis para o Bot:', err);
        process.exit(1);
    }
});

client.login(process.env.DISCORD_TOKEN);
