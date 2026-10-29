const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');
const ffmpegPath = require('ffmpeg-static');

const BANNERS_DIR = path.join(__dirname, '../data/banners');
if (!fs.existsSync(BANNERS_DIR)) {
    fs.mkdirSync(BANNERS_DIR, { recursive: true });
}

// Map<filePath, { promise: Promise<info>, listeners: Set<Function>, lastPct: number, lastStage: string }>
const activeConversions = new Map();

const TARGET_DURATION_SEC = 3.2;
const TARGET_FPS = 14;
const TOTAL_FRAMES = Math.round(TARGET_DURATION_SEC * TARGET_FPS);

/**
 * Pool oficial de todas as 17 Splash Arts Animadas (.webm) do League of Legends (CommunityDragon)
 */
const ANIMATED_SPLASH_POOL = [
    'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/characters/ahri/skins/skin86/animatedsplash/ahri_skin86_centered.webm',
    'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/characters/morgana/skins/skin80/animatedsplash/morgana_skin80_centered.webm',
    'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/characters/kaisa/skins/skin71/animatedsplash/kaisa_skin71_centered.webm',
    'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/characters/jinx/skins/skin60/animatedsplash/jinx_skin60_centered.webm',
    'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/characters/viego/skins/skin43/animatedsplash/viego_skin43_centered.webm',
    'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/characters/sett/skins/skin66/animatedsplash/sett_skin66_centered.webm',
    'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/characters/mordekaiser/skins/skin54/animatedsplash/mordekaiser_skin54_centered.webm',
    'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/characters/samira/skins/skin30/animatedsplash/samira_skin30_centered.webm',
    'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/characters/lux/skins/skin07/animatedsplash/lux_skin7_centered.webm',
    'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/characters/seraphine/skins/skin03/animatedsplash/seraphine_skin3_centered.webm',
    'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/characters/seraphine/skins/skin02/animatedsplash/seraphine_skin2_centered.webm',
    'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/characters/seraphine/skins/skin01/animatedsplash/seraphine_skin1_centered.webm',
    'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/characters/missfortune/skins/skin16/animatedsplash/missfortune_skin16_centered.webm',
    'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/characters/sona/skins/skin06/animatedsplash/sona_skin6_centered.webm',
    'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/characters/tristana/skins/skin80/animatedsplash/tristana_skin80_centered.hol_tristana.webm',
    'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/characters/udyr/skins/skin03/animatedsplash/udyr_skin3_centered.webm',
    'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/characters/ezreal/skins/skin05/animatedsplash/ezreal_skin5_centered.webm'
];

let _lastPickedUrl = null;
function getRandomAnimatedBannerUrl() {
    const cachedPool = ANIMATED_SPLASH_POOL.filter(u => isGifCached(u));
    const pool = cachedPool.length > 0 ? cachedPool : ANIMATED_SPLASH_POOL;
    const candidates = pool.length > 1 ? pool.filter(u => u !== _lastPickedUrl) : pool;
    const picked = candidates[Math.floor(Math.random() * candidates.length)];
    _lastPickedUrl = picked;
    return picked;
}

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
    const fileName = `live640_${baseMatch || 'banner'}_${hash}.gif`;
    const filePath = path.join(BANNERS_DIR, fileName);
    return {
        fileName,
        filePath,
        attachmentUrl: `attachment://${fileName}`
    };
}

/**
 * Verifica se o GIF correspondente à URL já está pronto e em cache no disco
 */
function isGifCached(url) {
    if (!isVideoBannerUrl(url)) return false;
    const info = getGifCacheInfo(url);
    try {
        return fs.existsSync(info.filePath) && fs.statSync(info.filePath).size > 1024;
    } catch {
        return false;
    }
}

/**
 * Gera uma barra de progresso visual em texto para exibir no Discord
 */
function renderProgressBar(percent, stageText = '') {
    const pct = Math.max(0, Math.min(100, Math.round(percent)));
    const totalBlocks = 18;
    const filledBlocks = Math.round((pct / 100) * totalBlocks);
    const emptyBlocks = Math.max(0, totalBlocks - filledBlocks);
    const bar = '█'.repeat(filledBlocks) + '░'.repeat(emptyBlocks);
    return (
        `### 🎬 Convertendo Wallpaper Live para GIF HD...\n` +
        `\`[${bar}] ${pct}%\`\n` +
        (stageText ? `-# ⚡ ${stageText}` : `-# ⚡ Processando animação sem botão de play...`)
    );
}

/**
 * Executa o FFmpeg via spawn monitorando progresso em tempo real via -progress pipe:1
 */
function runFfmpegWithProgress(args, onFrameProgress, timeoutMs = 120000) {
    return new Promise((resolve, reject) => {
        const proc = spawn(ffmpegPath, ['- progress', 'pipe:1', '-nostats', ...args].map((a, i) => i === 0 ? '-progress' : a));
        let stderrLog = '';
        let stdoutBuf = '';
        let finished = false;

        const timer = setTimeout(() => {
            if (!finished) {
                finished = true;
                try { proc.kill('SIGKILL'); } catch {}
                reject(new Error('Tempo limite excedido ao converter vídeo para GIF'));
            }
        }, timeoutMs);

        proc.stdout.on('data', chunk => {
            stdoutBuf += chunk.toString();
            const lines = stdoutBuf.split(/\r?\n/);
            stdoutBuf = lines.pop() || '';

            let currentFrame = null;
            let currentTimeSec = null;

            for (const line of lines) {
                const [k, v] = line.split('=');
                if (!k || !v) continue;
                const key = k.trim();
                const val = v.trim();
                if (key === 'frame') {
                    const parsed = parseInt(val, 10);
                    if (!Number.isNaN(parsed)) currentFrame = parsed;
                } else if (key === 'out_time_ms' || key === 'out_time_us') {
                    const parsed = parseInt(val, 10);
                    if (!Number.isNaN(parsed) && parsed > 0) {
                        currentTimeSec = parsed / 1_000_000;
                    }
                }
            }

            if (typeof onFrameProgress === 'function' && (currentFrame !== null || currentTimeSec !== null)) {
                let ratio = 0;
                if (currentTimeSec !== null) {
                    ratio = Math.min(1, currentTimeSec / TARGET_DURATION_SEC);
                } else if (currentFrame !== null) {
                    ratio = Math.min(1, currentFrame / TOTAL_FRAMES);
                }
                onFrameProgress(ratio);
            }
        });

        proc.stderr.on('data', chunk => {
            stderrLog += chunk.toString();
            if (stderrLog.length > 4000) stderrLog = stderrLog.slice(-4000);
        });

        proc.on('error', err => {
            if (finished) return;
            finished = true;
            clearTimeout(timer);
            reject(err);
        });

        proc.on('close', code => {
            if (finished) return;
            finished = true;
            clearTimeout(timer);
            if (code !== 0) {
                return reject(new Error(stderrLog.trim() || `FFmpeg encerrou com código ${code}`));
            }
            resolve();
        });
    });
}

/**
 * Converte uma URL .webm/.mp4 em .gif otimizado sem botão de play para o Discord
 * (com cache permanente em data/banners/ e callback de progresso em tempo real 0% -> 100%)
 */
async function ensureGifFromVideoUrl(url, onProgress = null) {
    const info = getGifCacheInfo(url);

    if (isGifCached(url)) {
        if (typeof onProgress === 'function') {
            try { await onProgress(100, 'GIF carregado do cache instantâneo!'); } catch {}
        }
        return info;
    }

    if (activeConversions.has(info.filePath)) {
        const active = activeConversions.get(info.filePath);
        if (typeof onProgress === 'function') {
            active.listeners.add(onProgress);
            try { onProgress(active.lastPct, active.lastStage); } catch {}
        }
        return active.promise;
    }

    const state = {
        listeners: new Set(),
        lastPct: 0,
        lastStage: 'Iniciando download da animação...',
        promise: null
    };
    if (typeof onProgress === 'function') {
        state.listeners.add(onProgress);
    }

    const notify = (pct, stage) => {
        const clamped = Math.max(state.lastPct, Math.min(100, Math.round(pct)));
        state.lastPct = clamped;
        if (stage) state.lastStage = stage;
        for (const fn of state.listeners) {
            try { fn(state.lastPct, state.lastStage); } catch {}
        }
    };

    const conversionPromise = (async () => {
        const uid = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const tempVideoPath = path.join(BANNERS_DIR, `tmp_${uid}.webm`);
        const tempPalettePath = path.join(BANNERS_DIR, `tmp_${uid}_palette.png`);
        const tempGifPath = `${info.filePath}.${uid}.tmp.gif`;

        try {
            notify(4, 'Baixando Wallpaper Live original (.webm)...');

            const res = await fetch(url.trim());
            if (!res.ok) throw new Error(`HTTP ${res.status} ao baixar vídeo`);

            const totalBytes = parseInt(res.headers.get('content-length') || '0', 10);
            if (res.body && typeof res.body.getReader === 'function') {
                const reader = res.body.getReader();
                const chunks = [];
                let received = 0;

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    if (value) {
                        chunks.push(Buffer.from(value));
                        received += value.byteLength;
                        if (totalBytes > 0) {
                            const dlPct = 4 + Math.round((received / totalBytes) * 18); // 4% -> 22%
                            const mbDone = (received / (1024 * 1024)).toFixed(1);
                            const mbTotal = (totalBytes / (1024 * 1024)).toFixed(1);
                            notify(dlPct, `Baixando vídeo original (${mbDone} MB / ${mbTotal} MB)...`);
                        }
                    }
                }
                fs.writeFileSync(tempVideoPath, Buffer.concat(chunks));
            } else {
                const arrayBuffer = await res.arrayBuffer();
                fs.writeFileSync(tempVideoPath, Buffer.from(arrayBuffer));
            }

            notify(24, 'Extraindo paleta de cores HD (256 cores)...');

            // Passo 1: Extração ultrarrápida da paleta de cores (sem bufferizar todos os frames em RAM)
            await runFfmpegWithProgress(
                [
                    '-y',
                    '-t', String(TARGET_DURATION_SEC),
                    '-i', tempVideoPath,
                    '-vf', 'fps=4,scale=320:-1:flags=bilinear,palettegen=max_colors=256:stats_mode=diff',
                    tempPalettePath
                ],
                ratio => {
                    const pct = 24 + Math.round(ratio * 12); // 24% -> 36%
                    notify(pct, 'Mapeando paleta de cores HD...');
                },
                45000
            );

            notify(38, 'Renderizando quadros do GIF animado em HD...');

            // Passo 2: Codificação frame a frame em tempo real com dither Bayer (rápido na CPU e leve em MB)
            await runFfmpegWithProgress(
                [
                    '-y',
                    '-t', String(TARGET_DURATION_SEC),
                    '-i', tempVideoPath,
                    '-i', tempPalettePath,
                    '-lavfi', `fps=${TARGET_FPS},scale=640:-1:flags=bicubic[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=3:diff_mode=rectangle`,
                    '-loop', '0',
                    tempGifPath
                ],
                ratio => {
                    const pct = 38 + Math.round(ratio * 57); // 38% -> 95%
                    const currentFrame = Math.min(TOTAL_FRAMES, Math.max(1, Math.round(ratio * TOTAL_FRAMES)));
                    notify(pct, `Renderizando GIF animado (${currentFrame}/${TOTAL_FRAMES} quadros)...`);
                },
                120000
            );

            if (fs.existsSync(tempGifPath) && fs.statSync(tempGifPath).size > 1024) {
                if (fs.existsSync(info.filePath)) {
                    try { fs.unlinkSync(info.filePath); } catch {}
                }
                fs.renameSync(tempGifPath, info.filePath);
            } else {
                throw new Error('Arquivo GIF gerado está vazio');
            }

            notify(98, 'Conversão concluída! Enviando GIF para o Discord...');
            return info;
        } finally {
            try { if (fs.existsSync(tempVideoPath)) fs.unlinkSync(tempVideoPath); } catch {}
            try { if (fs.existsSync(tempPalettePath)) fs.unlinkSync(tempPalettePath); } catch {}
            try { if (fs.existsSync(tempGifPath)) fs.unlinkSync(tempGifPath); } catch {}
            activeConversions.delete(info.filePath);
        }
    })();

    state.promise = conversionPromise;
    activeConversions.set(info.filePath, state);
    return conversionPromise;
}

module.exports = {
    ANIMATED_SPLASH_POOL,
    getRandomAnimatedBannerUrl,
    isVideoBannerUrl,
    getGifCacheInfo,
    isGifCached,
    renderProgressBar,
    ensureGifFromVideoUrl
};
