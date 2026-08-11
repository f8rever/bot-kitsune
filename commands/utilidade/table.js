const { buildCustomEmbed } = require('../../utils/customEmbeds.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'table',
    description: 'Exibe as tabelas de preços de Skins e Loots da loja Kitsune.',
    async execute(interaction) {
        let storeConfig = {};
        const configPath = path.join(__dirname, '../../config/loja.json');
        try {
            if (fs.existsSync(configPath)) {
                storeConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            }
        } catch(e) {}

        const globalDiscount = storeConfig.promocao_porcentagem || 70;
        const skinsDiscount = storeConfig.desconto_skins !== undefined ? storeConfig.desconto_skins : globalDiscount;
        const lootDiscount = storeConfig.desconto_chests !== undefined ? storeConfig.desconto_chests : globalDiscount;
        const passesDiscount = storeConfig.desconto_passes !== undefined ? storeConfig.desconto_passes : globalDiscount;

        const skinsMult = (100 - skinsDiscount) / 100;
        const lootMult = (100 - lootDiscount) / 100;
        const passesMult = (100 - passesDiscount) / 100;

        const extraVarsSkins = {
            skinsDiscount: skinsDiscount.toString(),
            price_750: (750 * 0.0060 * skinsMult).toFixed(2),
            price_975: (975 * 0.0060 * skinsMult).toFixed(2),
            price_1350: (1350 * 0.0060 * skinsMult).toFixed(2),
            price_1820: (1820 * 0.0060 * skinsMult).toFixed(2),
            price_3250: (3250 * 0.0060 * skinsMult).toFixed(2)
        };

        const extraVarsLoot = {
            lootDiscount: lootDiscount.toString(),
            passesDiscount: passesDiscount.toString(),
            price_250: (250 * 0.0060 * lootMult).toFixed(2),
            price_1250: (1250 * 0.0060 * lootMult).toFixed(2),
            price_2500: (2500 * 0.0060 * lootMult).toFixed(2),
            price_1650: (1650 * 0.0060 * passesMult).toFixed(2)
        };

        const tableSkinsEmbed = buildCustomEmbed('tabela_skins', interaction.client, interaction, extraVarsSkins);
        const tableLootsEmbed = buildCustomEmbed('tabela_loot', interaction.client, interaction, extraVarsLoot);

        return interaction.reply({ embeds: [tableSkinsEmbed, tableLootsEmbed], ephemeral: true });
    }
};
