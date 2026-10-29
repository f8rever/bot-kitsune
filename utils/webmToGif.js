const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFile } = require('child_process');
const ffmpegPath = require('ffmpeg-static');

const BANNERS_DIR = path.join(__dirname, '../data/banners');
if (!fs.existsSync(BANNERS_DIR)) {
    fs.mkdirSync(BANNERS_DIR, { recursive: true });
}

const activeConversions = new Map();

/**
 * Verifica se uma URL aponta para um vídeo (.webm ou .mp4)
 */
function isVideoBannerUrl(url) {
    if (!url || typeof url !== 'string') return false;
    const clean = url.trim().split('?')[0].toLowerCase();
    return clean.endsWith('.webm') || clean.endsWith('.mp4');
}

/**
 * Retorna o nome do arquivo .gif e o caminho em disco correspondente a uma URL .webm/.mp4
 */
function getGifCacheInfo(url) {
    const cleanUrl = url.trim();
    const hash = crypto.createHash('md5').update(cleanUrl).digest('hex').slice(0, 12);
    const baseMatch = path.basename(cleanUrl.split('?')[0], path.extname(cleanUrl.split('?')[0]))
        .replace(/[^a-zA-Z0-9_-]/g, '')
        .slice(0, 28);
    const fileName = `live_${baseMatch || 'banner'}_${hash}.gif`;
    const filePath = path.join(BANNERS_DIR, fileName);
    return {
        fileName,
        filePath,
        attachmentUrl: `attachment://${fileName}`
    };
}

/**
 * Converte uma URL .webm/.mp4 em .gif otimizado sem botão de play para o Discord
 * (com cache permanente em data/banners/)
 */
async function ensureGifFromVideoUrl(url) {
    const info = getGifCacheInfo(url);

    if (fs.existsSync(info.filePath) && fs.statSync(info.filePath).size > 1024) {
        return info;
    }

    if (activeConversions.has(info.filePath)) {
        return activeConversions.get(info.filePath);
    }

    const conversionPromise = (async () => {
        const tempVideoPath = path.join(BANNERS_DIR, `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.webm`);
        const tempGifPath = `${info.filePath}.tmp.gif`;

        try {
            const res = await fetch(url.trim());
            if (!res.ok) throw new Error(`HTTP ${res.status} ao baixar vídeo`);
            const arrayBuffer = await res.arrayBuffer();
            fs.writeFileSync(tempVideoPath, Buffer.from(arrayBuffer));

            await new Promise((resolve, reject) => {
                const args = [
                    '-y',
                    '-t', '4',
                    '-i', tempVideoPath,
                    '-vf', 'fps=15,scale=540:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128:stats_mode=diff[p];[s1][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle',
                    '-loop', '0',
                    tempGifPath
                ];

                execFile(ffmpegPath, args, { timeout: 30000 }, (err, stdout, stderr) => {
                    if (err) return reject(new Error(stderr || err.message));
                    resolve();
                });
            });

            if (fs.existsSync(tempGifPath) && fs.statSync(tempGifPath).size > 1024) {
                fs.renameSync(tempGifPath, info.filePath);
            } else {
                throw new Error('Arquivo GIF gerado está vazio');
            }

            return info;
        } finally {
            try { if (fs.existsSync(tempVideoPath)) fs.unlinkSync(tempVideoPath); } catch {}
            try { if (fs.existsSync(tempGifPath)) fs.unlinkSync(tempGifPath); } catch {}
            activeConversions.delete(info.filePath);
        }
    })();

    activeConversions.set(info.filePath, conversionPromise);
    return conversionPromise;
}

module.exports = {
    isVideoBannerUrl,
    getGifCacheInfo,
    ensureGifFromVideoUrl
};
