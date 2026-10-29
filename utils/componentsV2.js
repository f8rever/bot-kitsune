const fs = require('fs');
const path = require('path');
const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    SectionBuilder,
    ThumbnailBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    FileBuilder,
    ActionRowBuilder,
    MessageFlags,
    MessagePayload,
    MessageComponentInteraction,
    ModalSubmitInteraction
} = require('discord.js');
const { isVideoBannerUrl, getGifCacheInfo, isGifCached, ensureGifFromVideoUrl } = require('./webmToGif.js');

const DEFAULT_ACCENT_COLOR = 0xF43F5E; // Kitsune Rose

/**
 * Valida se uma string é uma URL válida aceita pelo Components V2 (http:, https: ou attachment:)
 */
function sanitizeMediaUrl(url) {
    if (!url || typeof url !== 'string') return null;
    const trimmed = url.trim();
    if (!/^(https?:|attachment:)\/\//i.test(trimmed)) return null;
    try {
        if (trimmed.startsWith('attachment://')) return trimmed;
        return new URL(trimmed).toString();
    } catch {
        return null;
    }
}

/**
 * Converte cor de embed (hex string, número ou array RGB) em inteiro para accent_color
 */
function resolveAccentColor(colorInput, fallbackText = '') {
    if (typeof colorInput === 'number' && !Number.isNaN(colorInput)) {
        return colorInput;
    }
    if (typeof colorInput === 'string' && colorInput.trim()) {
        const clean = colorInput.trim().replace(/^#/, '');
        const parsed = parseInt(clean, 16);
        if (!Number.isNaN(parsed)) return parsed;
    }
    if (Array.isArray(colorInput) && colorInput.length === 3) {
        return (colorInput[0] << 16) + (colorInput[1] << 8) + colorInput[2];
    }

    const t = (fallbackText || '').trim();
    if (t.startsWith('❌') || t.startsWith('🚫')) return 0xEF4444;
    if (t.startsWith('✅')) return 0x10B981;
    if (t.startsWith('⚠️')) return 0xF59E0B;
    return DEFAULT_ACCENT_COLOR;
}

/**
 * Divide textos longos respeitando o limite de 4000 caracteres do TextDisplayBuilder
 */
function splitTextChunks(text, maxLen = 3800) {
    if (!text || typeof text !== 'string') return [];
    const trimmed = text.trim();
    if (!trimmed) return [];
    if (trimmed.length <= maxLen) return [trimmed];

    const chunks = [];
    let current = '';
    for (const line of trimmed.split('\n')) {
        if ((current + '\n' + line).length > maxLen && current.length > 0) {
            chunks.push(current.trim());
            current = line;
        } else {
            current = current ? `${current}\n${line}` : line;
        }
    }
    if (current.trim()) chunks.push(current.trim());
    return chunks;
}

/**
 * Extrai o nome de arquivo de um item do array `files` do discord.js
 */
function getFileName(fileLike) {
    if (!fileLike) return null;
    if (typeof fileLike === 'string') return path.basename(fileLike);
    if (fileLike.name) return fileLike.name;
    if (fileLike.attachment && typeof fileLike.attachment === 'string') {
        return path.basename(fileLike.attachment);
    }
    if (fileLike.path) return path.basename(fileLike.path);
    return null;
}

/**
 * Verifica se o array de componentes já utiliza Discord Components V2
 */
function isAlreadyComponentsV2(components) {
    if (!Array.isArray(components) || components.length === 0) return false;
    const v2Types = new Set([9, 10, 11, 12, 13, 14, 17]);
    return components.some(c => {
        if (!c) return false;
        if (c instanceof ContainerBuilder || c instanceof SectionBuilder || c instanceof TextDisplayBuilder) return true;
        const raw = typeof c.toJSON === 'function' ? c.toJSON() : c;
        return raw && v2Types.has(raw.type);
    });
}

/**
 * Converte um payload tradicional { content, embeds, components, files } em um ContainerBuilder V2
 */
function buildV2ComponentsFromPayload({ content, embeds, components, files }) {
    const rawEmbeds = Array.isArray(embeds)
        ? embeds.map(e => (e && typeof e.toJSON === 'function' ? e.toJSON() : e)).filter(Boolean)
        : [];

    const rawComponents = Array.isArray(components)
        ? components.map(c => (c && typeof c.toJSON === 'function' ? c.toJSON() : c)).filter(Boolean)
        : [];

    const hasContent = typeof content === 'string' && content.trim().length > 0;
    const hasEmbeds = rawEmbeds.length > 0;
    const hasActionRows = rawComponents.length > 0;
    const filesList = Array.isArray(files) ? files : [];

    // Determinar cor de destaque do Container
    const primaryColor = rawEmbeds.find(e => e.color !== undefined && e.color !== null)?.color;
    const accentColor = resolveAccentColor(primaryColor, hasContent ? content : (rawEmbeds[0]?.title || ''));

    const container = new ContainerBuilder().setAccentColor(accentColor);
    const usedAttachments = new Set();
    let hasAddedBlock = false;
    const footers = [];

    // 1. Conteúdo de texto superior (ex: menções de abertura de ticket ou avisos rápidos)
    if (hasContent) {
        for (const chunk of splitTextChunks(content)) {
            container.addTextDisplayComponents(new TextDisplayBuilder().setContent(chunk));
            hasAddedBlock = true;
        }
    }

    // 2. Converter cada Embed para blocos internos do Container V2
    for (let i = 0; i < rawEmbeds.length; i++) {
        const emb = rawEmbeds[i];
        if (hasAddedBlock) {
            container.addSeparatorComponents(
                new SeparatorBuilder()
                    .setDivider(true)
                    .setSpacing(i > 0 ? SeparatorSpacingSize.Large : SeparatorSpacingSize.Small)
            );
        }

        const textParts = [];
        if (emb.author?.name) {
            textParts.push(`-# ${emb.author.name.trim()}`);
        }
        if (emb.title) {
            const cleanTitle = emb.title.trim();
            if (emb.url && sanitizeMediaUrl(emb.url)) {
                textParts.push(`### [${cleanTitle}](${emb.url.trim()})`);
            } else {
                textParts.push(`### ${cleanTitle}`);
            }
        }
        if (emb.description) {
            textParts.push(emb.description.trim());
        }

        const combinedMainText = textParts.join('\n');
        const thumbUrl = sanitizeMediaUrl(emb.thumbnail?.url);

        if (thumbUrl) {
            if (thumbUrl.startsWith('attachment://')) usedAttachments.add(thumbUrl);
            const chunks = splitTextChunks(combinedMainText || '\u200b');
            const firstChunk = chunks.shift() || '\u200b';
            try {
                const section = new SectionBuilder()
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(firstChunk))
                    .setThumbnailAccessory(new ThumbnailBuilder().setURL(thumbUrl));
                container.addSectionComponents(section);
                hasAddedBlock = true;
            } catch {
                if (combinedMainText) {
                    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(firstChunk));
                    hasAddedBlock = true;
                }
            }
            for (const extraChunk of chunks) {
                container.addTextDisplayComponents(new TextDisplayBuilder().setContent(extraChunk));
            }
        } else if (combinedMainText) {
            for (const chunk of splitTextChunks(combinedMainText)) {
                container.addTextDisplayComponents(new TextDisplayBuilder().setContent(chunk));
                hasAddedBlock = true;
            }
        }

        // Campos (Fields) do Embed
        if (Array.isArray(emb.fields) && emb.fields.length > 0) {
            const validFields = emb.fields.filter(f => f && (f.name || f.value));
            if (validFields.length > 0) {
                if (hasAddedBlock) {
                    container.addSeparatorComponents(
                        new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
                    );
                }
                const formattedFields = validFields
                    .map(f => `**${(f.name || '').trim()}**\n${(f.value || '').trim()}`)
                    .join('\n\n');

                for (const chunk of splitTextChunks(formattedFields)) {
                    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(chunk));
                    hasAddedBlock = true;
                }
            }
        }

        // Imagem / Banner do Embed
        const imageUrl = sanitizeMediaUrl(emb.image?.url);
        if (imageUrl) {
            if (imageUrl.startsWith('attachment://')) usedAttachments.add(imageUrl);
            try {
                const gallery = new MediaGalleryBuilder().addItems(
                    new MediaGalleryItemBuilder().setURL(imageUrl)
                );
                container.addMediaGalleryComponents(gallery);
                hasAddedBlock = true;
            } catch {}
        }

        // Coletar rodapé
        if (emb.footer?.text && emb.footer.text.trim()) {
            footers.push(emb.footer.text.trim());
        }
    }

    // 3. Arquivos anexados (`files`) que ainda não foram exibidos em thumbnail/image
    for (const fileLike of filesList) {
        const fileName = getFileName(fileLike);
        if (!fileName) continue;
        const attUrl = `attachment://${fileName}`;
        if (usedAttachments.has(attUrl)) continue;
        usedAttachments.add(attUrl);

        if (/\.(png|jpe?g|gif|webp)$/i.test(fileName)) {
            try {
                const gallery = new MediaGalleryBuilder().addItems(
                    new MediaGalleryItemBuilder().setURL(attUrl)
                );
                container.addMediaGalleryComponents(gallery);
                hasAddedBlock = true;
            } catch {}
        } else {
            try {
                container.addFileComponents(new FileBuilder().setURL(attUrl));
                hasAddedBlock = true;
            } catch {}
        }
    }

    // 4. Botões e Menus de Seleção (ActionRows dentro do Container!)
    const validRows = rawComponents.filter(
        row => row && row.type === 1 && Array.isArray(row.components) && row.components.length > 0
    );
    if (validRows.length > 0) {
        if (hasAddedBlock) {
            container.addSeparatorComponents(
                new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
            );
        }
        for (const row of validRows) {
            container.addActionRowComponents(new ActionRowBuilder(row));
            hasAddedBlock = true;
        }
    }

    // 5. Rodapé no final do Container
    if (footers.length > 0) {
        const uniqueFooters = [...new Set(footers)];
        const footerLines = uniqueFooters
            .join(' • ')
            .split('\n')
            .map(line => (line.trim() ? `-# ${line.trim()}` : ''))
            .filter(Boolean)
            .join('\n');

        if (footerLines) {
            container.addTextDisplayComponents(new TextDisplayBuilder().setContent(footerLines.slice(0, 4000)));
            hasAddedBlock = true;
        }
    }

    if (!hasAddedBlock) {
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent('\u200b'));
    }

    return [container.toJSON()];
}

/**
 * Extrai textos e campos (fields) de qualquer mensagem do bot (compatível com Embeds V1 e Containers V2)
 */
function extractMessageData(msg) {
    if (!msg) return { hasData: false, fullText: '', fields: [] };

    // Compatibilidade com mensagens antigas (Embeds V1)
    if (Array.isArray(msg.embeds) && msg.embeds.length > 0) {
        const emb = msg.embeds[0];
        const fields = (emb.fields || []).map(f => ({ name: f.name || '', value: f.value || '' }));
        const fullText = [
            emb.title || '',
            emb.description || '',
            ...fields.map(f => `${f.name} ${f.value}`),
            emb.footer?.text || ''
        ].join('\n');
        return { hasData: true, fullText, fields };
    }

    // Extração a partir de Containers / Sections / TextDisplays V2
    const collectedTexts = [];
    function walk(comps) {
        if (!Array.isArray(comps)) return;
        for (const comp of comps) {
            if (!comp) continue;
            const raw = typeof comp.toJSON === 'function' ? comp.toJSON() : comp;
            if (typeof raw.content === 'string' && raw.content.trim()) {
                collectedTexts.push(raw.content);
            }
            if (Array.isArray(raw.components)) {
                walk(raw.components);
            }
        }
    }

    walk(msg.components);
    const fullText = collectedTexts.join('\n\n');
    const fields = [];

    // Reconstrói campos isoladamente dentro de cada bloco TextDisplay
    const fieldRegex = /\*\*([^\n*]+)\*\*\n([\s\S]+?)(?=\n\n\*\*|\n\n### |\n\n-# |$)/g;
    for (const block of collectedTexts) {
        let match;
        while ((match = fieldRegex.exec(block)) !== null) {
            fields.push({
                name: match[1].trim(),
                value: match[2].trim()
            });
        }
    }

    return {
        hasData: collectedTexts.length > 0,
        fullText,
        fields
    };
}

/**
 * Ativa o interceptador global no MessagePayload do discord.js para que TODAS as
 * respostas, edições e mensagens do bot usem Discord Components V2 automaticamente.
 */
let isPatched = false;
function enableGlobalComponentsV2() {
    if (isPatched) return;
    isPatched = true;

    const originalResolveBody = MessagePayload.prototype.resolveBody;
    const originalResolveFiles = MessagePayload.prototype.resolveFiles;

    // Preservar referência à mensagem original durante editReply após deferUpdate()
    for (const InteractionProto of [MessageComponentInteraction?.prototype, ModalSubmitInteraction?.prototype]) {
        if (InteractionProto && typeof InteractionProto.editReply === 'function') {
            const origEditReply = InteractionProto.editReply;
            InteractionProto.editReply = function patchedEditReply(options) {
                if (this.message && options && typeof options === 'object' && !(options instanceof MessagePayload)) {
                    options = { ...options, _targetMessage: this.message };
                }
                return origEditReply.call(this, options);
            };
        }
    }

    MessagePayload.prototype.resolveFiles = async function patchedResolveFiles() {
        if (Array.isArray(this._pendingVideoUrls) && this._pendingVideoUrls.length > 0) {
            await Promise.all(
                this._pendingVideoUrls.map(item =>
                    ensureGifFromVideoUrl(item.videoUrl).catch(err => {
                        console.error('[WebmToGif] Falha ao converter vídeo em GIF:', err.message);
                    })
                )
            );

            // Se algum vídeo falhou na conversão e o arquivo .gif não existe em disco,
            // removemos do array `files` e restauramos a URL original para nunca causar ENOENT
            const failedItems = this._pendingVideoUrls.filter(
                item => !fs.existsSync(item.gifInfo.filePath)
            );
            if (failedItems.length > 0) {
                const failedNames = new Set(failedItems.map(i => i.gifInfo.fileName));
                if (Array.isArray(this.options?.files)) {
                    this.options.files = this.options.files.filter(
                        f => !f || !failedNames.has(f.name || path.basename(String(f.attachment || '')))
                    );
                }
                if (this.body?.components) {
                    let bodyJson = JSON.stringify(this.body.components);
                    for (const item of failedItems) {
                        bodyJson = bodyJson.split(item.gifInfo.attachmentUrl).join(item.videoUrl);
                    }
                    try {
                        this.body.components = JSON.parse(bodyJson);
                    } catch {}
                }
            }
        }
        return originalResolveFiles.call(this);
    };

    MessagePayload.prototype.resolveBody = function patchedResolveBody() {
        const alreadyResolved = Boolean(this.body);

        // Interceptar URLs .webm / .mp4 nos embeds e substituir automaticamente por GIF animado sem botão de play
        if (!alreadyResolved && Array.isArray(this.options?.embeds) && this.options.embeds.length > 0) {
            const pendingVideos = [];
            const extraFiles = Array.isArray(this.options.files) ? [...this.options.files] : [];
            let filesAdded = false;

            const isImmediateInteraction =
                Boolean(this.target && typeof this.target.isRepliable === 'function' && !this.target.deferred && !this.target.replied);

            this.options.embeds = this.options.embeds.map(emb => {
                if (!emb) return emb;
                const raw = typeof emb.toJSON === 'function' ? { ...emb.toJSON() } : { ...emb };
                let modified = false;

                if (raw.image?.url && isVideoBannerUrl(raw.image.url)) {
                    const videoUrl = raw.image.url.trim();
                    const gifInfo = getGifCacheInfo(videoUrl);
                    if (isGifCached(videoUrl)) {
                        raw.image = { ...raw.image, url: gifInfo.attachmentUrl };
                        if (!extraFiles.some(f => f && f.name === gifInfo.fileName)) {
                            extraFiles.push({ attachment: gifInfo.filePath, name: gifInfo.fileName });
                            filesAdded = true;
                        }
                        modified = true;
                    } else if (isImmediateInteraction) {
                        // Pré-converte em background para não estourar o limite de 3s de interações diretas
                        ensureGifFromVideoUrl(videoUrl).catch(() => {});
                    } else {
                        pendingVideos.push({ videoUrl, gifInfo });
                        raw.image = { ...raw.image, url: gifInfo.attachmentUrl };
                        if (!extraFiles.some(f => f && f.name === gifInfo.fileName)) {
                            extraFiles.push({ attachment: gifInfo.filePath, name: gifInfo.fileName });
                            filesAdded = true;
                        }
                        modified = true;
                    }
                }

                if (raw.thumbnail?.url && isVideoBannerUrl(raw.thumbnail.url)) {
                    const videoUrl = raw.thumbnail.url.trim();
                    const gifInfo = getGifCacheInfo(videoUrl);
                    if (isGifCached(videoUrl)) {
                        raw.thumbnail = { ...raw.thumbnail, url: gifInfo.attachmentUrl };
                        if (!extraFiles.some(f => f && f.name === gifInfo.fileName)) {
                            extraFiles.push({ attachment: gifInfo.filePath, name: gifInfo.fileName });
                            filesAdded = true;
                        }
                        modified = true;
                    } else if (isImmediateInteraction) {
                        ensureGifFromVideoUrl(videoUrl).catch(() => {});
                    } else {
                        pendingVideos.push({ videoUrl, gifInfo });
                        raw.thumbnail = { ...raw.thumbnail, url: gifInfo.attachmentUrl };
                        if (!extraFiles.some(f => f && f.name === gifInfo.fileName)) {
                            extraFiles.push({ attachment: gifInfo.filePath, name: gifInfo.fileName });
                            filesAdded = true;
                        }
                        modified = true;
                    }
                }

                return modified ? raw : emb;
            });

            if (pendingVideos.length > 0) {
                this._pendingVideoUrls = pendingVideos;
            }
            if (filesAdded) {
                this.options.files = extraFiles;
            }
        }

        const result = originalResolveBody.call(this);
        if (alreadyResolved || !this.body) return result;

        // Não converter enquetes (polls) ou mensagens que desativem V2 explicitamente
        if (this.body.poll || this.options?.disableComponentsV2) {
            return result;
        }

        const hasContent = typeof this.body.content === 'string' && this.body.content.trim().length > 0;
        const hasEmbeds = Array.isArray(this.body.embeds) && this.body.embeds.length > 0;
        const hasComponents = Array.isArray(this.body.components) && this.body.components.length > 0;
        const hasFiles = Array.isArray(this.options?.files) && this.options.files.length > 0;

        // Se já está em formato Components V2, apenas garante a flag e limpa content/embeds
        if (isAlreadyComponentsV2(this.body.components)) {
            this.body.flags = (this.body.flags || 0) | MessageFlags.IsComponentsV2;
            delete this.body.content;
            delete this.body.embeds;
            return result;
        }

        // Caso nada tenha sido enviado além de { components: [] } (ex: fim de coletor limpando botões)
        if (!hasContent && !hasEmbeds && !hasComponents && !hasFiles) {
            const targetMsg = this.isMessage ? this.target : this.target?.message;
            if (targetMsg && Array.isArray(targetMsg.components) && targetMsg.components.length > 0) {
                const stripped = targetMsg.components.map(c => {
                    const raw = typeof c.toJSON === 'function' ? c.toJSON() : c;
                    if (raw.type === 17 && Array.isArray(raw.components)) {
                        return {
                            ...raw,
                            components: raw.components.filter(sub => sub.type !== 1)
                        };
                    }
                    return raw;
                });
                this.body.components = stripped;
                this.body.flags = (this.body.flags || 0) | MessageFlags.IsComponentsV2;
                delete this.body.content;
                delete this.body.embeds;
            }
            return result;
        }

        // Converte { content, embeds, components, files } para ContainerBuilder V2
        try {
            const v2Components = buildV2ComponentsFromPayload({
                content: this.body.content,
                embeds: this.body.embeds,
                components: this.body.components,
                files: this.options?.files
            });

            this.body.components = v2Components;
            this.body.flags = (this.body.flags || 0) | MessageFlags.IsComponentsV2;

            // Verificar se estamos editando uma mensagem legada V1 que tinha content/embeds
            const targetMsg = this.isMessage ? this.target : (this.target?.message || this.options?._targetMessage);
            const isLegacyTarget =
                targetMsg &&
                !targetMsg._upgradedToV2 &&
                ((Array.isArray(targetMsg.embeds) && targetMsg.embeds.length > 0) ||
                    (typeof targetMsg.content === 'string' && targetMsg.content.length > 0)) &&
                !targetMsg.flags?.has?.(MessageFlags.IsComponentsV2);

            if (isLegacyTarget) {
                targetMsg._upgradedToV2 = true;
                this.body.content = null;
                this.body.embeds = null;
            } else {
                delete this.body.content;
                delete this.body.embeds;
            }
        } catch (err) {
            console.error('[ComponentsV2] Erro ao converter payload para V2, mantendo fallback V1:', err.message);
        }

        return result;
    };
}

module.exports = {
    enableGlobalComponentsV2,
    buildV2ComponentsFromPayload,
    extractMessageData
};
