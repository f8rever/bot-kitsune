const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const fs = require('fs');
const path = require('path');

const CATEGORIAS_VALIDAS = [
    { name: '🔥 Global (Todo o Catálogo)', value: 'global', key: 'promocao_porcentagem', emoji: '🌐' },
    { name: '🎨 Skins (Tiers 520 até 3250 RP)', value: 'skins', key: 'desconto_skins', emoji: '👕' },
    { name: '🌈 Cromas (290 RP e Pacotes)', value: 'cromas', key: 'desconto_cromas', emoji: '🎨' },
    { name: '🎫 Passes de Evento (1650, 2650, 3650)', value: 'passes', key: 'desconto_passes', emoji: '🎫' },
    { name: '📦 Espólios / Orbes & Baús', value: 'loot', key: 'desconto_chests', emoji: '📦' },
    { name: '👑 Acessórios Gerais', value: 'acessorios', key: 'desconto_acessorios', emoji: '👑' },
    { name: '🎭 Emotes (350 RP)', value: 'emotes', key: 'desconto_emotes', emoji: '😃' },
    { name: '🖼️ Ícones de Invocador (250 RP)', value: 'icones', key: 'desconto_icones', emoji: '🖼️' },
    { name: '👁️ Sentinelas / Wards (640 RP)', value: 'wards', key: 'desconto_wards', emoji: '👁️' },
    { name: '⚡ Bônus / Boosts de XP', value: 'boosts', key: 'desconto_boosts', emoji: '⚡' },
    { name: '🏆 Eternos (Séries LoL)', value: 'eternos', key: 'desconto_eternos', emoji: '🏆' },
    { name: '🎁 Presentes Mistério', value: 'misterio', key: 'desconto_misterio', emoji: '🎁' },
    { name: '🌟 Destaques & Pacotes', value: 'highlights', key: 'desconto_highlights', emoji: '🌟' }
];

function recalcularPrecosLoja(loja) {
    const globalDiscount = Number(loja.promocao_porcentagem) || 0;

    // Recalcular Skins
    const skinsDiscount = loja.desconto_skins !== undefined ? Number(loja.desconto_skins) : globalDiscount;
    const skinsMult = Math.max(0, (100 - skinsDiscount) / 100);
    if (loja.skins && typeof loja.skins === 'object') {
        for (const k in loja.skins) {
            const item = loja.skins[k];
            if (item && item.preco) {
                const basePreco = parseFloat(item.preco);
                if (!isNaN(basePreco)) {
                    item.desconto = (basePreco * skinsMult).toFixed(2);
                }
            }
        }
    }

    // Recalcular Loot & Passes
    const lootDiscount = loja.desconto_chests !== undefined ? Number(loja.desconto_chests) : globalDiscount;
    const passesDiscount = loja.desconto_passes !== undefined ? Number(loja.desconto_passes) : globalDiscount;
    const lootMult = Math.max(0, (100 - lootDiscount) / 100);
    const passesMult = Math.max(0, (100 - passesDiscount) / 100);

    if (loja.loot && typeof loja.loot === 'object') {
        for (const k in loja.loot) {
            const item = loja.loot[k];
            if (item && item.preco) {
                const basePreco = parseFloat(item.preco);
                if (!isNaN(basePreco)) {
                    const mult = k.startsWith('pass_') ? passesMult : lootMult;
                    item.desconto = (basePreco * mult).toFixed(2);
                }
            }
        }
    }

    // Recalcular Bundles
    const bundlesDiscount = loja.desconto_highlights !== undefined ? Number(loja.desconto_highlights) : globalDiscount;
    const bundlesMult = Math.max(0, (100 - bundlesDiscount) / 100);
    if (loja.bundles && typeof loja.bundles === 'object') {
        for (const k in loja.bundles) {
            const item = loja.bundles[k];
            if (item && item.preco) {
                const basePreco = parseFloat(item.preco);
                if (!isNaN(basePreco)) {
                    item.desconto = (basePreco * bundlesMult).toFixed(2);
                }
            }
        }
    }
}

module.exports = {
    name: 'desconto',
    description: '🦊 Gerencia, consulta e altera os descontos da loja em tempo real.',
    options: [
        {
            name: 'acao',
            description: 'Ação que deseja executar (Definir Desconto, Ver Descontos Atuais ou Resetar)',
            type: 3, // STRING
            required: false,
            choices: [
                { name: '📊 Ver Descontos Ativos', value: 'ver' },
                { name: '⚙️ Definir Desconto', value: 'set' },
                { name: '🔄 Resetar Descontos', value: 'reset' }
            ]
        },
        {
            name: 'porcentagem',
            description: 'Porcentagem de desconto (0 a 100). Ex: 50 para 50% OFF',
            type: 10, // NUMBER
            required: false,
            min_value: 0,
            max_value: 100
        },
        {
            name: 'categoria',
            description: 'Categoria da loja para aplicar ou resetar (deixe vazio para Global)',
            type: 3, // STRING
            required: false,
            choices: CATEGORIAS_VALIDAS.map(c => ({ name: c.name, value: c.value }))
        }
    ],

    async execute(interaction) {
        const isAdmin = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);
        const staffRoles = (process.env.STAFF_ROLE_IDS || '').split(',').map(s => s.trim()).filter(Boolean);
        const hasStaffRole = staffRoles.some(roleId => interaction.member.roles.cache.has(roleId));

        if (!isAdmin && !hasStaffRole) {
            return interaction.reply({
                content: '🚫 Você precisa ser Administrador ou Staff para gerenciar os descontos da loja.',
                ephemeral: true
            });
        }

        const { sendLoadingReply } = require('../../utils/customEmbeds.js');
        await sendLoadingReply(interaction, 'Processando descontos da loja...', true);

        const acao = interaction.options.getString('acao') || (interaction.options.getNumber('porcentagem') !== null ? 'set' : 'ver');
        const pctInput = interaction.options.getNumber('porcentagem');
        const categoriaInput = interaction.options.getString('categoria') || 'global';

        const lojaPath = path.join(__dirname, '../../config/loja.json');
        let loja = {};

        if (fs.existsSync(lojaPath)) {
            try {
                loja = JSON.parse(fs.readFileSync(lojaPath, 'utf8'));
            } catch (e) {
                return interaction.editReply({ content: '❌ Falha ao carregar o arquivo `loja.json`.' });
            }
        }

        // ── AÇÃO: VER DESCONTOS ATIVOS ──────────────────────────────────────
        if (acao === 'ver') {
            const globalPct = loja.promocao_porcentagem !== undefined ? Number(loja.promocao_porcentagem) : 50;

            const embed = new EmbedBuilder()
                .setTitle('🦊 Kitsune Store | Painel Geral de Descontos')
                .setColor('#F43F5E')
                .setThumbnail('https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Ahri_27.jpg')
                .setDescription(
                    `<a:whitearrow:1346152146814636032> **Desconto Global Ativo:** \`${globalPct}% OFF\`\n` +
                    `<a:whitearrow:1346152146814636032> *Itens sem desconto de categoria herdam automaticamente a porcentagem global.*\n\n` +
                    `### 🏷️ Descontos por Categoria:`
                )
                .setFooter({ text: 'Kitsune Store • Use /desconto set para alterar', iconURL: interaction.client.user.displayAvatarURL() })
                .setTimestamp();

            const fields = [];
            for (const cat of CATEGORIAS_VALIDAS) {
                if (cat.value === 'global') continue;

                let val = loja[cat.key];
                let statusText = '';
                if (val !== undefined && val !== null) {
                    statusText = `**${val}% OFF** *(Específico)*`;
                } else {
                    statusText = `**${globalPct}% OFF** *(Herdado Global)*`;
                }

                fields.push({
                    name: `${cat.emoji} ${cat.name.split(' (')[0]}`,
                    value: statusText,
                    inline: true
                });
            }

            embed.addFields(fields);
            return interaction.editReply({ embeds: [embed] });
        }

        // ── AÇÃO: RESETAR DESCONTOS ─────────────────────────────────────────
        if (acao === 'reset') {
            if (categoriaInput === 'global') {
                loja.promocao_porcentagem = 0;
                for (const cat of CATEGORIAS_VALIDAS) {
                    if (cat.key !== 'promocao_porcentagem') {
                        delete loja[cat.key];
                    }
                }
            } else {
                const catObj = CATEGORIAS_VALIDAS.find(c => c.value === categoriaInput);
                if (catObj && catObj.key) {
                    delete loja[catObj.key];
                }
            }

            recalcularPrecosLoja(loja);
            fs.writeFileSync(lojaPath, JSON.stringify(loja, null, 2), 'utf8');

            const embed = new EmbedBuilder()
                .setTitle('🔄 Descontos Resetados com Sucesso!')
                .setColor('#3B82F6')
                .setDescription(
                    categoriaInput === 'global'
                        ? `<a:whitearrow:1346152146814636032> Todos os descontos da loja foram **resetados** para o padrão (0% OFF).\n<a:whitearrow:1346152146814636032> Os preços em \`loja.json\` e no \`/table\` foram recalculados com o valor integral.`
                        : `<a:whitearrow:1346152146814636032> O desconto da categoria **${categoriaInput}** foi resetado e agora herda a regra global (\`${loja.promocao_porcentagem || 0}% OFF\`).`
                )
                .setFooter({ text: 'Kitsune Store • Configuração de Preços' })
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
        }

        // ── AÇÃO: DEFINIR DESCONTO (SET) ────────────────────────────────────
        if (pctInput === null || pctInput === undefined) {
            return interaction.editReply({
                content: '⚠️ Você precisa informar o valor da `porcentagem` (ex: 50 para 50% OFF) para usar a ação de definir desconto.'
            });
        }

        const pct = Math.round(pctInput);

        let catNome = 'Global (Todo o Catálogo)';
        let catKey = 'promocao_porcentagem';
        let catEmoji = '🔥';

        if (categoriaInput && categoriaInput !== 'global') {
            const found = CATEGORIAS_VALIDAS.find(c => c.value === categoriaInput);
            if (found) {
                catNome = found.name;
                catKey = found.key;
                catEmoji = found.emoji;
            }
        }

        loja[catKey] = pct;

        // Recalcular automaticamente todos os preços com desconto da loja
        recalcularPrecosLoja(loja);

        // Limpeza de chaves legadas se existirem
        delete loja.desconto_little_legends;
        delete loja.desconto_tft_arena;

        try {
            fs.writeFileSync(lojaPath, JSON.stringify(loja, null, 2), 'utf8');
            if (typeof interaction.client.emit === 'function') {
                interaction.client.emit('reloadLoja');
            }
        } catch (e) {
            return interaction.editReply({ content: '❌ Erro ao salvar alterações no arquivo `loja.json`.' });
        }

        const embed = new EmbedBuilder()
            .setTitle(`${catEmoji} Desconto Atualizado com Sucesso!`)
            .setColor('#57F287')
            .setThumbnail('https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Ahri_27.jpg')
            .setDescription(
                `<a:whitearrow:1346152146814636032> Alvo: **${catNome}**\n` +
                `<a:whitearrow:1346152146814636032> Novo Desconto: **${pct}% OFF**\n` +
                `<a:whitearrow:1346152146814636032> Status: **Preços de \`loja.json\` e \`/table\` recalculados automaticamente!**\n\n` +
                `> 💡 *Todos os clientes verão os novos valores com desconto imediatamente nos catálogos e na tabela de preços.*`
            )
            .setFooter({ text: 'Kitsune Store • Sistema de Descontos' })
            .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
    }
};
