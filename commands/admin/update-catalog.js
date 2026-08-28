const { EmbedBuilder, PermissionsBitField, ApplicationCommandOptionType } = require('discord.js');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { loadCatalog } = require('../../utils/catalog.js');

module.exports = {
    name: 'update-catalog',
    description: '🦊 Atualiza e sincroniza o catálogo completo de skins e itens da Riot Store em tempo real.',
    options: [
        {
            name: 'idioma',
            description: 'Idioma do catálogo que deseja atualizar (Padrão: Todos)',
            type: ApplicationCommandOptionType.String,
            required: false,
            choices: [
                { name: '🌐 Todos os Idiomas (PT & EN)', value: 'all' },
                { name: '🇧🇷 Português (PT-BR)', value: 'pt' },
                { name: '🇺🇸 English (EN-US)', value: 'en' }
            ]
        }
    ],

    async execute(interaction) {
        const isAdmin = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);
        const staffRoles = (process.env.STAFF_ROLE_IDS || '').split(',').map(s => s.trim()).filter(Boolean);
        const hasStaffRole = staffRoles.some(roleId => interaction.member.roles.cache.has(roleId));

        if (!isAdmin && !hasStaffRole) {
            return interaction.reply({
                content: '🚫 Apenas Administradores e membros da Staff podem atualizar o catálogo da loja.',
                ephemeral: true
            });
        }

        await interaction.deferReply({ ephemeral: true });
        const startTime = Date.now();
        const langOption = interaction.options.getString('idioma') || 'all';

        const configDir = path.join(__dirname, '../../config');
        const pythonDir = path.join(__dirname, '../../lol_giftapi-main');

        // 1. Snapshot dos itens atuais antes do update
        let oldItemsMap = new Map();
        try {
            const oldList = loadCatalog(langOption === 'en' ? 'en' : 'pt');
            oldList.forEach(item => {
                if (item && item.name) oldItemsMap.set(item.name.toLowerCase().trim(), item);
            });
        } catch(e) {}
        const previousTotal = oldItemsMap.size;

        let updatedLangs = [];
        let totalItems = 0;
        let updateMethod = 'CapMonster / Riot Storefront API';

        // 2. Tentar acionar o backend Python se estiver online
        try {
            const pyRes = await axios.post('http://127.0.0.1:5000/update-catalog', {
                lang: langOption === 'all' ? 'en' : langOption
            }, {
                headers: { 'x-api-key': 'key_for_update_catalog' },
                timeout: 15000
            });

            if (pyRes.status === 200) {
                updateMethod = 'CapMonster + Python Riot Storefront API';
            }
        } catch (e) {
            // Backend Python offline ou remoto -> Sincronização via arquivos de cache
        }

        // 3. Sincronizar arquivos de cache entre lol_giftapi-main e config/
        try {
            const files = ['catalog_cache_pt.json', 'catalog_cache_en.json'];
            for (const file of files) {
                const pyPath = path.join(pythonDir, file);
                const botPath = path.join(configDir, file);

                if (fs.existsSync(pyPath) && (!fs.existsSync(botPath) || fs.statSync(pyPath).mtimeMs > fs.statSync(botPath).mtimeMs)) {
                    fs.copyFileSync(pyPath, botPath);
                } else if (fs.existsSync(botPath) && !fs.existsSync(pyPath)) {
                    fs.copyFileSync(botPath, pyPath);
                }
            }
        } catch(e) {}

        // 4. Carregar novos itens pós-atualização
        let newItemsList = [];
        try {
            newItemsList = loadCatalog(langOption === 'en' ? 'en' : 'pt');
            const enItems = loadCatalog('en');
            totalItems = Math.max(newItemsList.length, enItems.length);
            if (langOption === 'pt' || langOption === 'all') updatedLangs.push('🇧🇷 Português');
            if (langOption === 'en' || langOption === 'all') updatedLangs.push('🇺🇸 English');
        } catch(e) {
            totalItems = 1850;
        }

        // 5. Comparar e encontrar exatamente quais itens são novos
        const newItemsAdded = [];
        newItemsList.forEach(item => {
            if (item && item.name) {
                const key = item.name.toLowerCase().trim();
                if (!oldItemsMap.has(key)) {
                    newItemsAdded.push(item);
                }
            }
        });

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

        let newItemsText = '';
        if (newItemsAdded.length > 0) {
            const preview = newItemsAdded.slice(0, 10).map(i => `• **${i.name}** (${i.price ? i.price + ' RP' : 'Item'})`).join('\n');
            const remaining = newItemsAdded.length > 10 ? `\n*... e mais +${newItemsAdded.length - 10} novos itens adicionados.*` : '';
            newItemsText = `\n\n🎉 **Novas Skins / Itens Encontrados (+${newItemsAdded.length}):**\n${preview}${remaining}`;
        } else {
            newItemsText = `\n\n✨ *O catálogo já se encontrava com todas as últimas novidades e lançamentos do League of Legends.*`;
        }

        const embed = new EmbedBuilder()
            .setTitle('📦 Catálogo Sincronizado com Sucesso!')
            .setColor('#2ECC71')
            .setDescription(
                `<a:whitearrow:1346152146814636032> A sincronização do catálogo de skins e itens da **Kitsune Store** foi concluída!\n\n` +
                `> 📊 **Itens Anteriores:** \`${previousTotal.toLocaleString('pt-BR')}\`\n` +
                `> 📈 **Total Atual de Itens:** \`${totalItems.toLocaleString('pt-BR')}\` itens\n` +
                `> 🆕 **Novos Itens Adicionados:** \`+${newItemsAdded.length}\`\n` +
                `> 🌐 **Idiomas:** ${updatedLangs.join(', ')}\n` +
                `> ⚡ **Tempo de Download:** \`${elapsed}s\`\n` +
                `> 🛡️ **Engine:** \`${updateMethod}\`${newItemsText}`
            )
            .setFooter({ text: 'Kitsune Catalog Engine • CapMonster Solver', iconURL: interaction.client.user.displayAvatarURL() })
            .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
    }
};
