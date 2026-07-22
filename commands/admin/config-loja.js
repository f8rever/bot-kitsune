const { ApplicationCommandOptionType } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'config-loja',
    description: 'Altera os itens, preços, descontos ou banners da loja',
    options: [
        {
            name: 'categoria',
            description: 'Escolha a categoria do item ou banner',
            type: ApplicationCommandOptionType.String,
            required: true,
            choices: [
                { name: 'Skins', value: 'skins' },
                { name: 'Loot', value: 'loot' }
            ]
        },
        {
            name: 'id-do-item',
            description: 'Selecione o item para configurar',
            type: ApplicationCommandOptionType.String,
            required: false,
            autocomplete: true // Ativa a listinha mágica com auto-complete!
        },
        {
            name: 'novo-nome',
            description: 'Altera o nome do item (opcional)',
            type: ApplicationCommandOptionType.String,
            required: false
        },
        {
            name: 'novo-preco',
            description: 'Altera o preço padrão do item (Ex: 19.99)',
            type: ApplicationCommandOptionType.String,
            required: false
        },
        {
            name: 'porcentagem-desconto',
            description: 'Porcentagem de desconto (Ex: 15 para 15%). Digite 0 para remover.',
            type: ApplicationCommandOptionType.String,
            required: false
        },
        {
            name: 'novo-banner',
            description: 'Cole o link direto da imagem/banner para esta categoria (Imgur, Discord, etc.)',
            type: ApplicationCommandOptionType.String,
            required: false
        }
    ],

    // Esta função é disparada quando você começa a digitar no campo "id-do-item"
    async autocomplete(interaction) {
        const categoriaFocus = interaction.options.getString('categoria');
        const focado = interaction.options.getFocused();

        // Lista interna mapeando IDs para nomes bonitos para aparecer no Discord
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
            { name: '🎫 Trials of Twilight Pass (pass_1)', value: 'pass_1' },
            { name: '🎫 Twilight Upgraded Pass (pass_2)', value: 'pass_2' },
            { name: '🎫 Twilight Premium Pass (pass_3)', value: 'pass_3' },
            { name: '🛡️ Deluxe Orb Bundle (orb_1)', value: 'orb_1' },
            { name: '🛡️ Premium Orb Bundle (orb_2)', value: 'orb_2' },
            { name: '🛡️ Mega Orb Bundle (orb_3)', value: 'orb_3' },
            { name: '📦 Hextech Chest (chest_1)', value: 'chest_1' },
            { name: '🔑 Hextech Key (key_1)', value: 'key_1' },
            { name: '📦 1 Hextech Chest & Key (chest_key_1)', value: 'chest_key_1' },
            { name: '📦 5 Hextech Chests & Keys (chest_key_5)', value: 'chest_key_5' },
            { name: '📦 10 Hextech Chests & Keys (chest_key_10)', value: 'chest_key_10' }
        ];

        // Se o usuário ainda não escolheu a categoria, exibe aviso básico
        if (!categoriaFocus) {
            return interaction.respond([{ name: '⚠️ Selecione a categoria primeiro!', value: '' }]);
        }

        // Escolhe os itens com base na categoria escolhida no primeiro campo
        let listaItens = [];
        if (categoriaFocus === 'skins') {
            listaItens = itensSkins;
        } else if (categoriaFocus === 'loot') {
            listaItens = itensLoot;
        }

        // Filtra conforme o que você digita para dar opções inteligentes
        const filtrado = listaItens.filter(choice => 
            choice.name.toLowerCase().includes(focado.toLowerCase()) || 
            choice.value.toLowerCase().includes(focado.toLowerCase())
        );

        // O Discord permite no máximo 25 opções no autocomplete
        await interaction.respond(
            filtrado.slice(0, 25).map(choice => ({ name: choice.name, value: choice.value }))
        );
    },

    async execute(interaction) {
        // Verifica permissão da Staff
        const staffRoles = process.env.STAFF_ROLE_IDS ? process.env.STAFF_ROLE_IDS.split(',') : [];
        const temPermissao = interaction.member.roles.cache.some(role => staffRoles.map(id => id.trim()).includes(role.id));

        if (!temPermissao && !interaction.member.permissions.has('Administrator')) {
            return interaction.reply({ content: '🏮 Apenas membros autorizados da Staff podem usar este comando.', flags: 64 });
        }

        const categoria = interaction.options.getString('categoria');
        const idItem = interaction.options.getString('id-do-item');
        const novoNome = interaction.options.getString('novo-nome');
        const novoPreco = interaction.options.getString('novo-preco');
        const porcentagemInput = interaction.options.getString('porcentagem-desconto');
        const novoBanner = interaction.options.getString('novo-banner');

        const lojaPath = path.join(__dirname, '../../config/loja.json');
        if (!fs.existsSync(lojaPath)) {
            return interaction.reply({ content: '🏮 Banco de dados da loja não encontrado.', flags: 64 });
        }

        const loja = JSON.parse(fs.readFileSync(lojaPath, 'utf8'));

        // Se o usuário quiser alterar o banner
        if (novoBanner) {
            if (!loja.banners) {
                loja.banners = {};
            }
            loja.banners[categoria] = novoBanner;
            fs.writeFileSync(lojaPath, JSON.stringify(loja, null, 2));

            if (!idItem) {
                return interaction.reply({
                    content: `🌸 **Banner da categoria \`${categoria.toUpperCase()}\` atualizado com sucesso!**\nLink: ${novoBanner}`,
                    flags: 64
                });
            }
        }

        // Se o id do item NÃO foi fornecido, mas a porcentagem SIM: aplica para todos da categoria
        if (!idItem && porcentagemInput !== null && porcentagemInput !== undefined) {
            if (!loja[categoria]) {
                return interaction.reply({ content: `🏮 Categoria \`${categoria}\` não encontrada na loja!`, flags: 64 });
            }

            const porcentagem = parseFloat(porcentagemInput);
            if (isNaN(porcentagem) || porcentagem < 0) {
                return interaction.reply({ content: '🏮 Por favor, insira um número válido para a porcentagem de desconto geral.', flags: 64 });
            }

            let itensAfetados = 0;
            for (const key in loja[categoria]) {
                const precoBase = parseFloat(loja[categoria][key].preco);
                if (!isNaN(precoBase)) {
                    if (porcentagem === 0) {
                        loja[categoria][key].desconto = null;
                    } else {
                        const valorDesconto = precoBase * (porcentagem / 100);
                        const precoFinal = precoBase - valorDesconto;
                        loja[categoria][key].desconto = precoFinal.toFixed(2);
                    }
                    itensAfetados++;
                }
            }

            fs.writeFileSync(lojaPath, JSON.stringify(loja, null, 2));

            return interaction.reply({
                content: `🌸 **Desconto Global Atualizado com sucesso!**\n` +
                         `Foram afetados **${itensAfetados} itens** na categoria \`${categoria.toUpperCase()}\`.\n` +
                         `Todos os itens receberam o desconto de **${porcentagem}%**!`,
                flags: 64
            });
        }

        // Se o id do item foi fornecido para alterações de preço/desconto
        if (idItem) {
            const idItemLower = idItem.toLowerCase();
            if (!loja[categoria] || !loja[categoria][idItemLower]) {
                return interaction.reply({ 
                    content: `🏮 Item não encontrado na categoria \`${categoria}\`! Certifique-se de que selecionou o item corretamente usando a lista automática.`, 
                    flags: 64 
                });
            }

            // 1. Atualiza o nome se enviado
            if (novoNome) loja[categoria][idItemLower].nome = novoNome;

            // 2. Preço base
            if (novoPreco) {
                loja[categoria][idItemLower].preco = novoPreco.replace(',', '.');
            }

            // 3. Desconto
            let logDesconto = '';
            if (porcentagemInput !== null && porcentagemInput !== undefined) {
                const porcentagem = parseFloat(porcentagemInput);

                if (isNaN(porcentagem) || porcentagem < 0) {
                    return interaction.reply({ content: '🏮 Por favor, insira um número válido para a porcentagem de desconto.', flags: 64 });
                }

                if (porcentagem === 0) {
                    loja[categoria][idItemLower].desconto = null;
                    logDesconto = 'Desconto removido';
                } else {
                    const precoBase = parseFloat(loja[categoria][idItemLower].preco);
                    const valorDesconto = precoBase * (porcentagem / 100);
                    const precoFinal = precoBase - valorDesconto;
                    
                    loja[categoria][idItemLower].desconto = precoFinal.toFixed(2);
                    logDesconto = `${porcentagem}% de desconto (Preço promocional: €${loja[categoria][idItemLower].desconto})`;
                }
            }

            fs.writeFileSync(lojaPath, JSON.stringify(loja, null, 2));

            const itemAtualizado = loja[categoria][idItemLower];
            return interaction.reply({ 
                content: `🌸 **Loja Atualizada com sucesso!**\n` +
                         `**Item:** \`${itemAtualizado.nome}\`\n` +
                         `**Preço Base:** €${itemAtualizado.preco}\n` +
                         `**Status do Desconto:** ${itemAtualizado.desconto ? `~~€${itemAtualizado.preco}~~ 🔥 **€${itemAtualizado.desconto}** (${logDesconto})` : 'Sem desconto ativo'}` +
                         `${novoBanner ? `\n**Banner atualizado:** ${novoBanner}` : ''}`, 
                flags: 64 
            });
        }

        if (!idItem && !novoBanner && !porcentagemInput) {
            return interaction.reply({
                content: '🏮 Você precisa selecionar o **Item**, informar uma **Porcentagem Global** ou definir um **novo link de banner**.',
                flags: 64
            });
        }
    }
};