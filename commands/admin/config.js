const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { buildCustomEmbed } = require('../../utils/customEmbeds.js');

module.exports = {
    name: 'config',
    description: '🦊 Kitsune | Painel e Configuração Geral do Servidor (Cores, Cargos, Canais e Links).',
    options: [
        {
            name: 'cor',
            description: 'Cor principal dos embeds em formato HEX (Ex: #F43F5E)',
            type: 3, // STRING
            required: false
        },
        {
            name: 'cargo_verificacao',
            description: 'Cargo entregue automaticamente após a verificação de membros',
            type: 8, // ROLE
            required: false
        },
        {
            name: 'cargo_staff',
            description: 'Cargo com permissão de staff e gerenciamento dos tickets',
            type: 8, // ROLE
            required: false
        },
        {
            name: 'canal_boas_vindas',
            description: 'Canal onde as mensagens de boas-vindas e convites serão enviadas',
            type: 7, // CHANNEL
            required: false
        },
        {
            name: 'canal_logs',
            description: 'Canal onde os logs de envio de presentes e auditoria serão registrados',
            type: 7, // CHANNEL
            required: false
        },
        {
            name: 'idioma_padrao',
            description: 'Idioma padrão das mensagens, tickets e embeds do bot',
            type: 3, // STRING
            required: false,
            choices: [
                { name: '🇺🇸 English (Padrão / Internacional)', value: 'en' },
                { name: '🇧🇷 Português (Brasil)', value: 'pt' }
            ]
        },
        {
            name: 'logo_url',
            description: 'URL da imagem/logo oficial da loja para exibição nos embeds',
            type: 3, // STRING
            required: false
        },
        {
            name: 'restorecord_url',
            description: 'URL de autorização do RestoreCord / OAuth2 para backup de membros',
            type: 3, // STRING
            required: false
        }
    ],

    async execute(interaction) {
        const isAdmin = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);
        const staffRoles = (process.env.STAFF_ROLE_IDS || '').split(',').map(s => s.trim()).filter(Boolean);
        const hasStaffRole = staffRoles.some(roleId => interaction.member.roles.cache.has(roleId));

        if (!isAdmin && !hasStaffRole) {
            return interaction.reply({ content: '🚫 Você precisa ser Administrador ou Staff para acessar as configurações do bot.', ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });

        const configPath = path.join(__dirname, '../../config/config.json');
        const dbPath = path.join(__dirname, '../../database/database.json');

        let botConfig = {
            cor: '#F43F5E',
            cargo_verif: 'Viajante',
            staff_role_id: '',
            canal_welcome_id: '',
            canal_logs_id: '',
            logo_url: 'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Ahri_27.jpg',
            restorecord_url: ''
        };

        if (fs.existsSync(configPath)) {
            try {
                const loaded = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                botConfig = { ...botConfig, ...loaded };
            } catch (e) {}
        }

        let dbData = { config: {}, usuarios: {}, warns: {}, tickets: [] };
        if (fs.existsSync(dbPath)) {
            try {
                dbData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
            } catch (e) {}
        }

        const novaCor = interaction.options.getString('cor');
        const novoCargoVerif = interaction.options.getRole('cargo_verificacao');
        const novoCargoStaff = interaction.options.getRole('cargo_staff');
        const novoCanalWelcome = interaction.options.getChannel('canal_boas_vindas');
        const novoCanalLogs = interaction.options.getChannel('canal_logs');
        const novoIdioma = interaction.options.getString('idioma_padrao');
        const novaLogo = interaction.options.getString('logo_url');
        const novaRestorecord = interaction.options.getString('restorecord_url');

        let alteracoes = [];

        if (novoIdioma) {
            botConfig.idioma = novoIdioma;
            global.botLanguage = novoIdioma;
            alteracoes.push(`🌐 **Idioma Padrão do Bot:** ${novoIdioma === 'en' ? '🇺🇸 `English (International)`' : '🇧🇷 `Português (Brasil)`'}`);
        }

        if (novaCor) {
            let hex = novaCor.trim();
            if (!hex.startsWith('#') && /^[0-9A-Fa-f]{6}$/.test(hex)) hex = '#' + hex;
            botConfig.cor = hex;
            if (!dbData.config) dbData.config = {};
            dbData.config.cor = hex;
            alteracoes.push(`🎨 **Cor Principal:** \`${hex}\``);
        }

        if (novoCargoVerif) {
            botConfig.cargo_verif = novoCargoVerif.name;
            botConfig.cargo_verif_id = novoCargoVerif.id;
            if (!dbData.config) dbData.config = {};
            dbData.config.cargo_verif = novoCargoVerif.name;
            alteracoes.push(`🛡️ **Cargo de Verificação:** ${novoCargoVerif} (\`${novoCargoVerif.name}\`)`);
        }

        if (novoCargoStaff) {
            botConfig.staff_role_id = novoCargoStaff.id;
            if (!dbData.config) dbData.config = {};
            dbData.config.staff_id = novoCargoStaff.id;
            alteracoes.push(`👑 **Cargo de Staff:** ${novoCargoStaff} (\`${novoCargoStaff.name}\`)`);
        }

        if (novoCanalWelcome) {
            botConfig.canal_welcome_id = novoCanalWelcome.id;
            alteracoes.push(`👋 **Canal de Boas-Vindas:** ${novoCanalWelcome}`);
        }

        if (novoCanalLogs) {
            botConfig.canal_logs_id = novoCanalLogs.id;
            alteracoes.push(`📊 **Canal de Logs & Auditoria:** ${novoCanalLogs}`);
        }

        if (novaLogo) {
            botConfig.logo_url = novaLogo.trim();
            alteracoes.push(`🖼️ **Logo Oficial:** [Ver Imagem](${novaLogo.trim()})`);
        }

        if (novaRestorecord) {
            botConfig.restorecord_url = novaRestorecord.trim();
            alteracoes.push(`🔗 **RestoreCord / OAuth2:** \`${novaRestorecord.trim()}\``);
        }

        // Salvar se houve alterações
        if (alteracoes.length > 0) {
            try {
                fs.writeFileSync(configPath, JSON.stringify(botConfig, null, 2), 'utf8');
                fs.writeFileSync(dbPath, JSON.stringify(dbData, null, 2), 'utf8');
            } catch (err) {
                console.error('[Config Save Error]', err);
                return interaction.editReply({ content: '❌ Erro interno ao salvar arquivos de configuração.' });
            }

            const successEmbed = new EmbedBuilder()
                .setTitle('⚙️ Configurações Atualizadas com Sucesso!')
                .setColor(botConfig.cor || '#57F287')
                .setThumbnail(botConfig.logo_url || 'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Ahri_27.jpg')
                .setDescription(
                    `<a:whitearrow:1346152146814636032> As seguintes alterações foram salvas e aplicadas em tempo real:\n\n` +
                    alteracoes.map(a => `> ${a}`).join('\n')
                )
                .setFooter({ text: 'Kitsune Store • Configurações Globais', iconURL: interaction.client.user.displayAvatarURL() })
                .setTimestamp();

            return interaction.editReply({ embeds: [successEmbed] });
        }

        // Se nenhum parâmetro foi passado, exibir Painel Geral de Configurações Ativas
        const cargoVerifTxt = botConfig.cargo_verif_id ? `<@&${botConfig.cargo_verif_id}>` : `\`${botConfig.cargo_verif || 'Viajante'}\``;
        const cargoStaffTxt = botConfig.staff_role_id ? `<@&${botConfig.staff_role_id}>` : (process.env.STAFF_ROLE_IDS ? process.env.STAFF_ROLE_IDS.split(',').map(id => `<@&${id.trim()}>`).join(' ') : '`Não configurado`');
        const canalWelcomeTxt = botConfig.canal_welcome_id ? `<#${botConfig.canal_welcome_id}>` : '`Automático (boas-vindas)`';
        const canalLogsTxt = botConfig.canal_logs_id ? `<#${botConfig.canal_logs_id}>` : '`Automático (logs)`';
        const restorecordTxt = botConfig.restorecord_url ? `[Link Configurado](${botConfig.restorecord_url})` : '`Não configurado`';
        const idiomaTxt = (botConfig.idioma || 'en') === 'pt' ? '🇧🇷 `Português (Brasil)`' : '🇺🇸 `English (International)`';

        const infoEmbed = new EmbedBuilder()
            .setTitle('🦊 Kitsune Store | Painel de Configurações Ativas')
            .setColor(botConfig.cor || '#F43F5E')
            .setThumbnail(botConfig.logo_url || 'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Ahri_27.jpg')
            .setDescription(
                `<a:whitearrow:1346152146814636032> Aqui estão os parâmetros e configurações gerais ativas no bot para este servidor:\n\n` +
                `### ⚙️ Parâmetros Gerais:`
            )
            .addFields([
                { name: '🌐 Idioma Padrão', value: idiomaTxt, inline: true },
                { name: '🎨 Cor dos Embeds', value: `\`${botConfig.cor || '#F43F5E'}\``, inline: true },
                { name: '🛡️ Cargo Verificação', value: cargoVerifTxt, inline: true },
                { name: '👑 Cargo(s) Staff', value: cargoStaffTxt, inline: true },
                { name: '👋 Canal Boas-Vindas', value: canalWelcomeTxt, inline: true },
                { name: '📊 Canal de Logs', value: canalLogsTxt, inline: true },
                { name: '🔗 RestoreCord / OAuth2', value: restorecordTxt, inline: true }
            ])
            .setFooter({ text: 'Kitsune Store • Para alterar, use /config com as opções desejadas', iconURL: interaction.client.user.displayAvatarURL() })
            .setTimestamp();

        return interaction.editReply({ embeds: [infoEmbed] });
    }
};
