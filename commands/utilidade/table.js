const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { buildCustomEmbed } = require('../../utils/customEmbeds.js');

function loadStoreConfig() {
    let storeConfig = {};
    const configPath = path.join(__dirname, '../../config/loja.json');
    try {
        if (fs.existsSync(configPath)) {
            storeConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        }
    } catch (e) {}
    return storeConfig;
}

function calculateTableVars(storeConfig) {
    const globalDiscount = storeConfig.promocao_porcentagem || 50;
    const skinsDiscount = storeConfig.desconto_skins !== undefined ? storeConfig.desconto_skins : globalDiscount;
    const lootDiscount = storeConfig.desconto_chests !== undefined ? storeConfig.desconto_chests : globalDiscount;
    const passesDiscount = storeConfig.desconto_passes !== undefined ? storeConfig.desconto_passes : globalDiscount;
    const cromasDiscount = storeConfig.desconto_cromas !== undefined ? storeConfig.desconto_cromas : (storeConfig.desconto_acessorios || globalDiscount);
    const acessoriosDiscount = storeConfig.desconto_acessorios !== undefined ? storeConfig.desconto_acessorios : (storeConfig.desconto_emotes || globalDiscount);

    const skinsMult = (100 - skinsDiscount) / 100;
    const lootMult = (100 - lootDiscount) / 100;
    const passesMult = (100 - passesDiscount) / 100;
    const acessoriosMult = (100 - acessoriosDiscount) / 100;

    const baseRpToEur = 0.0060;

    return {
        skins: {
            skinsDiscount: String(skinsDiscount),
            price_3250: (3250 * baseRpToEur * skinsMult).toFixed(2),
            price_1820: (1820 * baseRpToEur * skinsMult).toFixed(2),
            price_1350: (1350 * baseRpToEur * skinsMult).toFixed(2),
            price_975: (975 * baseRpToEur * skinsMult).toFixed(2),
            price_750: (750 * baseRpToEur * skinsMult).toFixed(2),
            price_520: (520 * baseRpToEur * skinsMult).toFixed(2),
            price_490: (490 * baseRpToEur * skinsMult).toFixed(2),
            price_champ_490: (490 * baseRpToEur * skinsMult).toFixed(2)
        },
        loot: {
            lootDiscount: String(lootDiscount),
            passesDiscount: String(passesDiscount),
            price_1650: (1650 * baseRpToEur * passesMult).toFixed(2),
            price_2650: (2650 * baseRpToEur * passesMult).toFixed(2),
            price_3650: (3650 * baseRpToEur * passesMult).toFixed(2),
            price_2500: (2500 * baseRpToEur * lootMult).toFixed(2),
            price_6250: (6250 * baseRpToEur * lootMult).toFixed(2),
            price_12500: (12500 * baseRpToEur * lootMult).toFixed(2),
            price_225: (225 * baseRpToEur * lootMult).toFixed(2),
            price_1125: (1125 * baseRpToEur * lootMult).toFixed(2),
            price_2250: (2250 * baseRpToEur * lootMult).toFixed(2)
        },
        acessorios: {
            acessoriosDiscount: String(acessoriosDiscount),
            price_290: (290 * baseRpToEur * acessoriosMult).toFixed(2),
            price_350: (350 * baseRpToEur * acessoriosMult).toFixed(2),
            price_640: (640 * baseRpToEur * acessoriosMult).toFixed(2),
            price_250: (250 * baseRpToEur * acessoriosMult).toFixed(2),
            price_clash_975: (975 * baseRpToEur * acessoriosMult).toFixed(2),
            price_boost_3490: (3490 * baseRpToEur * acessoriosMult).toFixed(2)
        }
    };
}

module.exports = {
    name: 'table',
    description: 'Exibe as tabelas de preços de Skins, Espólios e Acessórios da Kitsune Store.',
    options: [
        {
            name: 'categoria',
            description: 'Escolha uma categoria específica da tabela de preços',
            type: 3,
            required: false,
            choices: [
                { name: '🎨 Skins', value: 'skins' },
                { name: '📦 Espólios & Passes', value: 'loot' },
                { name: '👑 Acessórios & Cromas', value: 'acessorios' },
                { name: '📑 Todas as Tabelas', value: 'todas' }
            ]
        }
    ],
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const storeConfig = loadStoreConfig();
        const vars = calculateTableVars(storeConfig);

        const escolha = interaction.options.getString('categoria') || 'todas';

        function buildRow(activeTab) {
            return new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('tbl_skins')
                    .setLabel('Skins')
                    .setEmoji('🎨')
                    .setStyle(activeTab === 'skins' ? ButtonStyle.Primary : ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('tbl_loot')
                    .setLabel('Espólios')
                    .setEmoji('📦')
                    .setStyle(activeTab === 'loot' ? ButtonStyle.Primary : ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('tbl_acessorios')
                    .setLabel('Acessórios')
                    .setEmoji('👑')
                    .setStyle(activeTab === 'acessorios' ? ButtonStyle.Primary : ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('tbl_todas')
                    .setLabel('Todas')
                    .setEmoji('📑')
                    .setStyle(activeTab === 'todas' ? ButtonStyle.Success : ButtonStyle.Secondary)
            );
        }

        function getEmbedsForTab(tab) {
            if (tab === 'skins') {
                return [buildCustomEmbed('tabela_skins', interaction.client, interaction, vars.skins)];
            }
            if (tab === 'loot') {
                return [buildCustomEmbed('tabela_loot', interaction.client, interaction, vars.loot)];
            }
            if (tab === 'acessorios') {
                return [buildCustomEmbed('tabela_acessorios', interaction.client, interaction, vars.acessorios)];
            }
            // todas
            return [
                buildCustomEmbed('tabela_skins', interaction.client, interaction, vars.skins),
                buildCustomEmbed('tabela_loot', interaction.client, interaction, vars.loot),
                buildCustomEmbed('tabela_acessorios', interaction.client, interaction, vars.acessorios)
            ];
        }

        let currentTab = escolha;
        const initialEmbeds = getEmbedsForTab(currentTab);
        const row = buildRow(currentTab);

        const msg = await interaction.editReply({
            embeds: initialEmbeds,
            components: [row]
        });

        // Coletor para alternar abas interativamente
        const collector = msg.createMessageComponentCollector({ time: 90000 });

        collector.on('collect', async i => {
            if (i.user.id !== interaction.user.id) {
                return i.reply({ content: '❌ Apenas você pode alternar as abas desta tabela.', ephemeral: true });
            }

            await i.deferUpdate();
            if (i.customId === 'tbl_skins') currentTab = 'skins';
            else if (i.customId === 'tbl_loot') currentTab = 'loot';
            else if (i.customId === 'tbl_acessorios') currentTab = 'acessorios';
            else if (i.customId === 'tbl_todas') currentTab = 'todas';

            const updatedEmbeds = getEmbedsForTab(currentTab);
            const updatedRow = buildRow(currentTab);

            await interaction.editReply({
                embeds: updatedEmbeds,
                components: [updatedRow]
            });
        });

        collector.on('end', () => {
            interaction.editReply({ components: [] }).catch(() => {});
        });
    }
};
