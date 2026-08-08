const { ApplicationCommandOptionType } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'config-store',
    description: 'Configures store items, prices, discounts, or banner images.',
    options: [
        {
            name: 'category',
            description: 'Select item or banner category',
            type: ApplicationCommandOptionType.String,
            required: true,
            choices: [
                { name: 'Skins', value: 'skins' },
                { name: 'Loot', value: 'loot' }
            ]
        },
        {
            name: 'item_id',
            description: 'Select item to configure',
            type: ApplicationCommandOptionType.String,
            required: false,
            autocomplete: true
        },
        {
            name: 'new_name',
            description: 'Change item name (optional)',
            type: ApplicationCommandOptionType.String,
            required: false
        },
        {
            name: 'new_price',
            description: 'Change standard item price (Ex: 19.99)',
            type: ApplicationCommandOptionType.String,
            required: false
        },
        {
            name: 'discount_percentage',
            description: 'Discount percentage (Ex: 15 for 15%). Enter 0 to remove.',
            type: ApplicationCommandOptionType.String,
            required: false
        },
        {
            name: 'new_banner',
            description: 'Direct image link for category banner',
            type: ApplicationCommandOptionType.String,
            required: false
        }
    ],

    async autocomplete(interaction) {
        const categoryFocus = interaction.options.getString('category');
        const focused = interaction.options.getFocused();

        const itensSkins = [
            { name: '🔸 Ultimate Skin 3250 RP (ultimate)', value: 'ultimate' },
            { name: '✨ Mythic Skin / Prestige (mythic)', value: 'mythic' },
            { name: '🔴 Legendary Skin 1820 RP (legendary)', value: 'legendary' },
            { name: '🟣 Epic Skin 1350 RP (epic)', value: 'epic' },
            { name: '🔵 Common Skin 975 RP (common_975)', value: 'common_975' },
            { name: '🔱 Common Skin 750 RP (common_750)', value: 'common_750' },
            { name: '🔱 Common Skin < 520 RP (common_520)', value: 'common_520' },
            { name: '📦 Mystery Skin 490 RP (mystery_skin)', value: 'mystery_skin' },
            { name: '📦 Mystery Champion 490 RP (mystery_champ)', value: 'mystery_champ' }
        ];

        const itensLoot = [
            { name: '🎫 Pandemonium Pass (pass_1)', value: 'pass_1' },
            { name: '🎫 Pandemonium Upgraded Pass (pass_2)', value: 'pass_2' },
            { name: '🎫 Pandemonium Premium Pass (pass_3)', value: 'pass_3' },
            { name: '🛡️ Deluxe Orb Bundle (orb_1)', value: 'orb_1' },
            { name: '🛡️ Premium Orb Bundle (orb_2)', value: 'orb_2' },
            { name: '🛡️ Mega Orb Bundle (orb_3)', value: 'orb_3' },
            { name: '📦 Hextech Chest (chest_1)', value: 'chest_1' },
            { name: '🔑 Hextech Key (key_1)', value: 'key_1' },
            { name: '📦 1 Hextech Chest & Key (chest_key_1)', value: 'chest_key_1' },
            { name: '📦 5 Hextech Chests & Keys (chest_key_5)', value: 'chest_key_5' },
            { name: '📦 10 Hextech Chests & Keys (chest_key_10)', value: 'chest_key_10' }
        ];

        if (!categoryFocus) {
            return interaction.respond([
                { name: '⚠️ Select a Category first to see items', value: 'nenhum' }
            ]);
        }

        let listaAtual = categoryFocus === 'skins' ? itensSkins : itensLoot;

        const filtrados = listaAtual.filter(item => 
            item.name.toLowerCase().includes(focused.toLowerCase()) || 
            item.value.toLowerCase().includes(focused.toLowerCase())
        );

        await interaction.respond(
            filtrados.slice(0, 25).map(item => ({ name: item.name, value: item.value }))
        );
    },

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const category = interaction.options.getString('category');
        const itemId = interaction.options.getString('item_id');
        const newName = interaction.options.getString('new_name');
        const newPrice = interaction.options.getString('new_price');
        const discountPercentage = interaction.options.getString('discount_percentage');
        const newBanner = interaction.options.getString('new_banner');

        const lojaPath = path.join(__dirname, '../../config/loja.json');
        let loja = {};

        if (fs.existsSync(lojaPath)) {
            try {
                loja = JSON.parse(fs.readFileSync(lojaPath, 'utf8'));
            } catch (e) {
                return interaction.editReply({ content: '❌ Error reading `loja.json` file.' });
            }
        }

        let alterado = false;
        let resumoAlteracoes = [];

        if (newBanner) {
            if (!loja.banners) loja.banners = {};
            loja.banners[category] = newBanner.trim();
            alterado = true;
            resumoAlteracoes.push(`🖼️ **Category Banner (${category.toUpperCase()}):** Updated to [Image Link](${newBanner.trim()})`);
        }

        if (itemId && itemId !== 'nenhum') {
            if (!loja[category]) loja[category] = {};
            if (!loja[category][itemId]) loja[category][itemId] = {};

            const itemAlvo = loja[category][itemId];

            if (newName) {
                itemAlvo.nome = newName.trim();
                alterado = true;
                resumoAlteracoes.push(`✏️ **Name:** \`${newName.trim()}\``);
            }

            if (newPrice) {
                const precoFloat = parseFloat(newPrice.replace(',', '.'));
                if (isNaN(precoFloat)) {
                    return interaction.editReply({ content: '❌ Invalid price format. Use numbers like `19.99`.' });
                }
                itemAlvo.preco = precoFloat.toFixed(2);
                alterado = true;
                resumoAlteracoes.push(`💶 **Price:** \`€${itemAlvo.preco}\``);
            }

            if (discountPercentage !== null && discountPercentage !== undefined) {
                const descFloat = parseFloat(discountPercentage.replace(',', '.'));
                if (isNaN(descFloat)) {
                    return interaction.editReply({ content: '❌ Invalid discount format. Use numbers like `15`.' });
                }

                if (descFloat <= 0) {
                    delete itemAlvo.desconto;
                    alterado = true;
                    resumoAlteracoes.push(`🔥 **Discount:** Removed`);
                } else {
                    const precoOriginal = parseFloat(itemAlvo.preco || 0);
                    if (precoOriginal <= 0) {
                        return interaction.editReply({ content: '❌ Please set a standard price before calculating discount.' });
                    }
                    const valorComDesconto = precoOriginal - (precoOriginal * (descFloat / 100));
                    itemAlvo.desconto = valorComDesconto.toFixed(2);
                    alterado = true;
                    resumoAlteracoes.push(`🔥 **Discount (${descFloat}%):** \`€${itemAlvo.desconto}\` (Was €${precoOriginal.toFixed(2)})`);
                }
            }
        }

        if (!alterado) {
            return interaction.editReply({ content: '⚠️ No fields were filled in to make changes.' });
        }

        try {
            fs.writeFileSync(lojaPath, JSON.stringify(loja, null, 2));
            interaction.client.emit('reloadLoja');
        } catch (e) {
            return interaction.editReply({ content: '❌ Error saving changes to `loja.json`.' });
        }

        return interaction.editReply({
            content: `✅ **Store Configuration Updated!**\n\n${resumoAlteracoes.join('\n')}`
        });
    }
};
