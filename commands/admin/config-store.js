const { ApplicationCommandOptionType, EmbedBuilder, PermissionsBitField } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'config-store',
    description: '🦊 Configura preços, descontos por categoria ou item, e banners da loja.',
    options: [
        {
            name: 'categoria',
            description: 'Categoria para aplicar a configuração ou desconto',
            type: ApplicationCommandOptionType.String,
            required: true,
            choices: [
                { name: '🌐 Todas as Categorias (Loja Inteira)', value: 'all' },
                { name: '👕 Skins de Campeões (Todas)', value: 'skins' },
                { name: '🎨 Cromas (Todos)', value: 'cromas' },
                { name: '🎫 Passes de Evento (Todos)', value: 'passes' },
                { name: '🔑 Loot, Baús & Orbes (Todos)', value: 'loot' },
                { name: '📦 Pacotes & Bundles', value: 'bundles' },
                { name: '🖼️ Banners da Loja', value: 'banners' }
            ]
        },
        {
            name: 'desconto_porcentagem',
            description: 'Porcentagem de desconto (Ex: 50 para 50%). Digite 0 para remover.',
            type: ApplicationCommandOptionType.String,
            required: false
        },
        {
            name: 'item_id',
            description: 'Item ou raridade específica (Opcional: deixe em branco para aplicar na categoria toda)',
            type: ApplicationCommandOptionType.String,
            required: false,
            autocomplete: true
        },
        {
            name: 'novo_preco',
            description: 'Novo preço padrão em Euros para o item selecionado (Ex: 8.49)',
            type: ApplicationCommandOptionType.String,
            required: false
        },
        {
            name: 'novo_nome',
            description: 'Novo nome do item selecionado (Opcional)',
            type: ApplicationCommandOptionType.String,
            required: false
        },
        {
            name: 'novo_banner',
            description: 'URL da nova imagem de banner da categoria',
            type: ApplicationCommandOptionType.String,
            required: false
        }
    ],

    async autocomplete(interaction) {
        const categoryFocus = interaction.options.getString('categoria') || 'all';
        const focused = interaction.options.getFocused().toLowerCase();

        const itensSkins = [
            { name: '🔸 Ultimate Skin 3250 RP (ultimate)', value: 'ultimate' },
            { name: '🔴 Legendary Skin 1820 RP (legendary)', value: 'legendary' },
            { name: '🟣 Epic Skin 1350 RP (epic)', value: 'epic' },
            { name: '🔵 Common Skin 975 RP (common_975)', value: 'common_975' },
            { name: '🔱 Common Skin 750 RP (common_750)', value: 'common_750' },
            { name: '🔱 Common Skin < 520 RP (common_520)', value: 'common_520' },
            { name: '📦 Mystery Skin 490 RP (mystery_skin)', value: 'mystery_skin' },
            { name: '📦 Mystery Champion 490 RP (mystery_champ)', value: 'mystery_champ' }
        ];

        const itensLoot = [
            { name: '🎫 Pandemonium Pass 1650 RP (pass_1)', value: 'pass_1' },
            { name: '🎫 Combo Passe de Evento 2650 RP (pass_2)', value: 'pass_2' },
            { name: '🎫 Combo Passe Premium 3650 RP (pass_3)', value: 'pass_3' },
            { name: '🛡️ Deluxe Orb Bundle 2500 RP (orb_1)', value: 'orb_1' },
            { name: '🛡️ Premium Orb Bundle 6250 RP (orb_2)', value: 'orb_2' },
            { name: '🛡️ Mega Orb Bundle 12500 RP (orb_3)', value: 'orb_3' },
            { name: '📦 Hextech Chest 125 RP (chest_1)', value: 'chest_1' },
            { name: '🔑 Hextech Key 125 RP (key_1)', value: 'key_1' },
            { name: '📦 1 Hextech Chest & Key 225 RP (chest_key_1)', value: 'chest_key_1' },
            { name: '📦 5 Hextech Chests & Keys 1125 RP (chest_key_5)', value: 'chest_key_5' },
            { name: '📦 10 Hextech Chests & Keys 2250 RP (chest_key_10)', value: 'chest_key_10' }
        ];

        const itensBundles = [
            { name: '🌟 Signature Edition Bundle (signature_edition)', value: 'signature_edition' },
            { name: '🎨 Chroma Bundle (chroma_bundle)', value: 'chroma_bundle' },
            { name: '📦 Complete Set Bundle (set_bundle)', value: 'set_bundle' }
        ];

        let listaAtual = [];
        if (categoryFocus === 'skins') listaAtual = itensSkins;
        else if (categoryFocus === 'loot' || categoryFocus === 'passes') listaAtual = itensLoot;
        else if (categoryFocus === 'bundles') listaAtual = itensBundles;
        else listaAtual = [...itensSkins, ...itensLoot, ...itensBundles];

        const filtrados = listaAtual.filter(item => 
            item.name.toLowerCase().includes(focused) || 
            item.value.toLowerCase().includes(focused)
        );

        await interaction.respond(
            filtrados.slice(0, 25).map(item => ({ name: item.name, value: item.value }))
        );
    },

    async execute(interaction) {
        const isAdmin = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);
        const staffRoles = (process.env.STAFF_ROLE_IDS || '').split(',').map(s => s.trim()).filter(Boolean);
        const hasStaffRole = staffRoles.some(roleId => interaction.member.roles.cache.has(roleId));

        if (!isAdmin && !hasStaffRole) {
            return interaction.reply({
                content: '🚫 Apenas Administradores e membros da Staff podem configurar a loja.',
                ephemeral: true
            });
        }

        const { sendLoadingReply } = require('../../utils/customEmbeds.js');
        await sendLoadingReply(interaction, 'Atualizando configurações da loja...', true);

        const category = interaction.options.getString('categoria') || 'all';
        const itemId = interaction.options.getString('item_id');
        const newName = interaction.options.getString('novo_nome');
        const newPrice = interaction.options.getString('novo_preco');
        const discountPercentage = interaction.options.getString('desconto_porcentagem');
        const newBanner = interaction.options.getString('novo_banner');

        const lojaPath = path.join(__dirname, '../../config/loja.json');
        let loja = {};

        if (fs.existsSync(lojaPath)) {
            try {
                loja = JSON.parse(fs.readFileSync(lojaPath, 'utf8'));
            } catch (e) {
                return interaction.editReply({ content: '❌ Erro ao ler o arquivo `loja.json`.' });
            }
        }

        let alterado = false;
        let resumoAlteracoes = [];

        // 1. Atualização de Banner
        if (newBanner) {
            if (!loja.banners) loja.banners = {};
            const targetBannerCat = (category === 'all' || category === 'banners') ? 'skins' : category;
            loja.banners[targetBannerCat] = newBanner.trim();
            alterado = true;
            resumoAlteracoes.push(`🖼️ **Banner da Categoria (${targetBannerCat.toUpperCase()}):** Atualizado com sucesso!`);
        }

        // 2. Aplicação de Desconto por Categoria Inteira (quando não especificou item_id)
        if (discountPercentage !== null && discountPercentage !== undefined && (!itemId || itemId === 'nenhum')) {
            const descFloat = parseFloat(discountPercentage.replace(',', '.'));
            if (isNaN(descFloat) || descFloat < 0 || descFloat > 100) {
                return interaction.editReply({ content: '❌ Porcentagem de desconto inválida. Use um número de `0` a `100` (ex: `50` para 50%).' });
            }

            const multiplier = (100 - descFloat) / 100;

            if (category === 'all') {
                loja.promocao_porcentagem = descFloat;
                loja.desconto_skins = descFloat;
                loja.desconto_cromas = descFloat;
                loja.desconto_passes = descFloat;
                loja.desconto_chests = descFloat;
                loja.desconto_hextech = descFloat;
                loja.desconto_bundles = descFloat;
                loja.desconto_highlights = descFloat;
                loja.desconto_misterio = descFloat;
                loja.desconto_eternos = descFloat;
                loja.desconto_emotes = descFloat;
                loja.desconto_icones = descFloat;
                loja.desconto_wards = descFloat;
                loja.desconto_boosts = descFloat;
                loja.desconto_little_legends = descFloat;
                loja.desconto_tft_arena = descFloat;

                // Recalcular descontos em todos os itens
                ['skins', 'loot', 'bundles'].forEach(catKey => {
                    if (loja[catKey]) {
                        for (const k in loja[catKey]) {
                            const precoBase = parseFloat(loja[catKey][k].preco || 0);
                            if (precoBase > 0) {
                                loja[catKey][k].desconto = descFloat === 0 ? undefined : (precoBase * multiplier).toFixed(2);
                            }
                        }
                    }
                });

                alterado = true;
                resumoAlteracoes.push(`🔥 **Promoção Geral Aplicada:** \`${descFloat}%\` de desconto em **TODAS as categorias da Loja Inteira**!`);
            }
            else if (category === 'skins') {
                loja.desconto_skins = descFloat;
                if (loja.skins) {
                    for (const k in loja.skins) {
                        const precoBase = parseFloat(loja.skins[k].preco || 0);
                        if (precoBase > 0) {
                            loja.skins[k].desconto = descFloat === 0 ? undefined : (precoBase * multiplier).toFixed(2);
                        }
                    }
                }
                alterado = true;
                resumoAlteracoes.push(`👕 **Desconto de Skins:** \`${descFloat}%\` aplicado para **TODAS as Skins de Campeões**!`);
            }
            else if (category === 'cromas') {
                loja.desconto_cromas = descFloat;
                alterado = true;
                resumoAlteracoes.push(`🎨 **Desconto de Cromas:** \`${descFloat}%\` aplicado para **TODOS os Cromas**!`);
            }
            else if (category === 'passes') {
                loja.desconto_passes = descFloat;
                if (loja.loot) {
                    for (const k of ['pass_1', 'pass_2', 'pass_3']) {
                        if (loja.loot[k]) {
                            const precoBase = parseFloat(loja.loot[k].preco || 0);
                            if (precoBase > 0) {
                                loja.loot[k].desconto = descFloat === 0 ? undefined : (precoBase * multiplier).toFixed(2);
                            }
                        }
                    }
                }
                alterado = true;
                resumoAlteracoes.push(`🎫 **Desconto de Passes:** \`${descFloat}%\` aplicado para **TODOS os Passes de Evento**!`);
            }
            else if (category === 'loot') {
                loja.desconto_chests = descFloat;
                loja.desconto_hextech = descFloat;
                loja.desconto_passes = descFloat;
                if (loja.loot) {
                    for (const k in loja.loot) {
                        const precoBase = parseFloat(loja.loot[k].preco || 0);
                        if (precoBase > 0) {
                            loja.loot[k].desconto = descFloat === 0 ? undefined : (precoBase * multiplier).toFixed(2);
                        }
                    }
                }
                alterado = true;
                resumoAlteracoes.push(`🔑 **Desconto de Loot & Baús:** \`${descFloat}%\` aplicado para **TODO o Loot, Baús e Passes**!`);
            }
            else if (category === 'bundles') {
                loja.desconto_bundles = descFloat;
                if (loja.bundles) {
                    for (const k in loja.bundles) {
                        const precoBase = parseFloat(loja.bundles[k].preco || 0);
                        if (precoBase > 0) {
                            loja.bundles[k].desconto = descFloat === 0 ? undefined : (precoBase * multiplier).toFixed(2);
                        }
                    }
                }
                alterado = true;
                resumoAlteracoes.push(`📦 **Desconto de Bundles:** \`${descFloat}%\` aplicado para **TODOS os Pacotes**!`);
            }
        }

        // 3. Configuração de Item Específico
        if (itemId && itemId !== 'nenhum') {
            const targetCat = (category === 'all' || category === 'banners') ? (loja.skins?.[itemId] ? 'skins' : (loja.loot?.[itemId] ? 'loot' : 'bundles')) : category;

            if (!loja[targetCat]) loja[targetCat] = {};
            if (!loja[targetCat][itemId]) loja[targetCat][itemId] = {};

            const itemAlvo = loja[targetCat][itemId];

            if (newName) {
                itemAlvo.nome = newName.trim();
                alterado = true;
                resumoAlteracoes.push(`✏️ **Nome do Item (${itemId}):** \`${newName.trim()}\``);
            }

            if (newPrice) {
                const precoFloat = parseFloat(newPrice.replace(',', '.'));
                if (isNaN(precoFloat)) {
                    return interaction.editReply({ content: '❌ Formato de preço inválido. Use valores numéricos como `8.49`.' });
                }
                itemAlvo.preco = precoFloat.toFixed(2);
                alterado = true;
                resumoAlteracoes.push(`💶 **Preço Base (${itemId}):** \`€${itemAlvo.preco}\``);
            }

            if (discountPercentage !== null && discountPercentage !== undefined) {
                const descFloat = parseFloat(discountPercentage.replace(',', '.'));
                if (isNaN(descFloat) || descFloat < 0 || descFloat > 100) {
                    return interaction.editReply({ content: '❌ Porcentagem de desconto inválida. Use um número de `0` a `100`.' });
                }

                if (descFloat === 0) {
                    delete itemAlvo.desconto;
                    alterado = true;
                    resumoAlteracoes.push(`🔥 **Desconto do Item (${itemId}):** Removido`);
                } else {
                    const precoOriginal = parseFloat(itemAlvo.preco || 0);
                    if (precoOriginal <= 0) {
                        return interaction.editReply({ content: '❌ Defina um preço base antes de calcular o desconto do item.' });
                    }
                    const valorComDesconto = precoOriginal - (precoOriginal * (descFloat / 100));
                    itemAlvo.desconto = valorComDesconto.toFixed(2);
                    alterado = true;
                    resumoAlteracoes.push(`🔥 **Desconto Individual (${itemId} - ${descFloat}%):** \`€${itemAlvo.desconto}\` (De €${precoOriginal.toFixed(2)})`);
                }
            }
        }

        if (!alterado) {
            return interaction.editReply({
                content: '⚠️ Nenhum campo de alteração foi preenchido. Informe o `desconto_porcentagem`, `novo_preco`, `novo_nome` ou `novo_banner`.'
            });
        }

        try {
            fs.writeFileSync(lojaPath, JSON.stringify(loja, null, 2), 'utf8');
            interaction.client.emit('reloadLoja');
        } catch (e) {
            return interaction.editReply({ content: '❌ Erro ao salvar alterações no `loja.json`.' });
        }

        const embed = new EmbedBuilder()
            .setTitle('🦊 Configurações da Loja Atualizadas!')
            .setColor('#2ECC71')
            .setDescription(resumoAlteracoes.join('\n\n'))
            .setFooter({ text: 'Kitsune Store • Sistema de Descontos Dinâmicos' })
            .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
    }
};
