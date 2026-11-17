/**
 * KITSUNE GIFTING STOREFRONT — ADVANCED ZERO HUB MOTION & PARTICLES ENGINE (v4.0)
 * 1. Zero Hub Repelling Dot-Matrix Canvas
 * 2. Zero Hub Smooth Scroll Glide Momentum Engine
 * 3. 3D Scroll Reveal with Staggered Rising Panels
 * 4. Zero Hub 3D Container Tilt & Lateral Pull (--zero-tilt-x, --zero-tilt-y)
 * 5. High-performance Batch Catalog Renderer for 9,290 items
 * 6. Offcanvas Cart Drawer with Riot ID validation
 */

// ==========================================================================
// 1. ZERO HUB SMOOTH WHEEL GLIDE ENGINE (MOMENTUM SCROLLING)
// ==========================================================================
(function initZeroHubSmoothScroll() {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const desktop = matchMedia('(hover: hover) and (pointer: fine)');
    let frame = 0, target = 0, lastTime = 0;

    const maximum = () => Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const clamp = value => Math.max(0, Math.min(maximum(), value));

    function stop() {
        if (frame) cancelAnimationFrame(frame);
        frame = 0;
        lastTime = 0;
    }

    function tick(time) {
        const dt = lastTime ? Math.min(time - lastTime, 40) : 16.67;
        lastTime = time;
        target = clamp(target);
        const current = window.scrollY;
        const delta = target - current;

        if (Math.abs(delta) < 0.75) {
            window.scrollTo({ top: target, behavior: 'instant' });
            stop();
            return;
        }

        window.scrollTo({ top: current + delta * (1 - Math.exp(-dt / 90)), behavior: 'instant' });
        frame = requestAnimationFrame(tick);
    }

    function nestedScroll(node, delta) {
        for (let el = node instanceof Element ? node : node?.parentElement; el && el !== document.body; el = el.parentElement) {
            const style = getComputedStyle(el);
            if (/auto|scroll/.test(style.overflowY) && el.scrollHeight > el.clientHeight + 1) {
                if (style.overscrollBehaviorY === 'contain' || style.overscrollBehaviorY === 'none' || (delta < 0 ? el.scrollTop > 0 : el.scrollTop + el.clientHeight < el.scrollHeight - 1)) return true;
            }
            if (el.getAttribute('role') === 'dialog' || el.tagName === 'DIALOG' || el.id === 'cartDrawer' || (el.closest && el.closest('#cartDrawer'))) return true;
        }
        return false;
    }

    window.addEventListener('wheel', event => {
        if (event.defaultPrevented || !event.cancelable || reduced.matches || !desktop.matches || event.ctrlKey || event.metaKey || event.shiftKey || event.deltaX || getComputedStyle(document.body).overflowY === 'hidden' || nestedScroll(event.target, event.deltaY)) {
            stop();
            return;
        }

        const delta = event.deltaY * (event.deltaMode === 1 ? 28 : event.deltaMode === 2 ? window.innerHeight : 1);
        const next = clamp((frame ? target : window.scrollY) + Math.max(-480, Math.min(480, delta)));

        if (next === window.scrollY && !frame) return;

        event.preventDefault();
        target = next;
        if (!frame) frame = requestAnimationFrame(tick);
    }, { passive: false });

    ['pointerdown', 'touchstart', 'keydown', 'blur'].forEach(name => window.addEventListener(name, stop, { passive: true }));
})();

// ==========================================================================
// 2. AUTHENTIC ZERO HUB DOT CANVAS (REPELLING PARTICLES + RADIANT GLOW)
// ==========================================================================
(function initZeroHubCanvas() {
    const canvas = document.getElementById('dotCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const SPACING = 16;
    const DOT_R = 0.85;
    const RADIUS = 85;
    const PUSH = 15;
    const EASE = 0.08;
    const LEVELS = 10;
    const EPS = 0.05;

    let W, H, dpr, dots = [], buckets = [], running = false;
    const mouse = { x: -9999, y: -9999 };

    function build() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        W = window.innerWidth;
        H = window.innerHeight;
        canvas.width = Math.floor(W * dpr);
        canvas.height = Math.floor(H * dpr);
        canvas.style.width = W + 'px';
        canvas.style.height = H + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        dots = [];
        buckets = [];
        for (let i = 0; i < LEVELS; i++) buckets.push([]);

        for (let y = 0; y <= H; y += SPACING) {
            for (let x = 0; x <= W; x += SPACING) {
                const fade = 1 - (x / (W * 1.1) + y / (H * 1.1)) * 0.7;
                if (fade <= 0.04) continue;
                const a = fade * 0.35;
                let bi = Math.floor((a / 0.35) * LEVELS);
                if (bi >= LEVELS) bi = LEVELS - 1;
                if (bi < 0) bi = 0;

                const d = { ox: x, oy: y, x: x, y: y, b: 0, a: a };
                dots.push(d);
                if (buckets[bi]) buckets[bi].push(d);
            }
        }
        draw();
    }

    function draw() {
        ctx.clearRect(0, 0, W, H);

        for (let bi = 0; bi < LEVELS; bi++) {
            const arr = buckets[bi];
            if (!arr.length) continue;
            let any = false;
            ctx.beginPath();
            for (let i = 0; i < arr.length; i++) {
                const d = arr[i];
                if (d.b > 0.01) continue;
                ctx.rect(d.x - DOT_R, d.y - DOT_R, DOT_R * 2, DOT_R * 2);
                any = true;
            }
            if (any) {
                const opacity = (((bi + 0.5) / LEVELS) * 0.35).toFixed(3);
                ctx.fillStyle = `rgba(180, 160, 120, ${opacity})`;
                ctx.fill();
            }
        }

        for (let i = 0; i < dots.length; i++) {
            const d = dots[i];
            if (d.b <= 0.01) continue;

            ctx.beginPath();
            const radius = DOT_R + d.b * 1.5;
            ctx.arc(d.x, d.y, radius, 0, Math.PI * 2);

            if (d.b > 0.6) {
                ctx.fillStyle = `rgba(240, 230, 210, ${Math.min(1, d.a + d.b * 0.8)})`;
            } else if (d.b > 0.3) {
                ctx.fillStyle = `rgba(200, 170, 110, ${Math.min(1, d.a + d.b * 0.7)})`;
            } else {
                ctx.fillStyle = `rgba(10, 200, 185, ${Math.min(1, d.a + d.b * 0.6)})`;
            }
            ctx.fill();
        }
    }

    function tick() {
        let moved = false;
        for (let i = 0; i < dots.length; i++) {
            const d = dots[i];
            let tx = d.ox;
            let ty = d.oy;
            let boost = 0;

            const dx = d.ox - mouse.x;
            const dy = d.oy - mouse.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < RADIUS && dist > 0.001) {
                const force = (1 - dist / RADIUS);
                const pushDist = force * PUSH;
                tx = d.ox + (dx / dist) * pushDist;
                ty = d.oy + (dy / dist) * pushDist;
                boost = force;
            }

            const stepX = (tx - d.x) * EASE;
            const stepY = (ty - d.y) * EASE;
            const stepB = (boost - d.b) * EASE;

            d.x += stepX;
            d.y += stepY;
            d.b += stepB;

            if (Math.abs(stepX) > EPS || Math.abs(stepY) > EPS || Math.abs(stepB) > 0.005) {
                moved = true;
            }
        }

        draw();

        if (moved) {
            requestAnimationFrame(tick);
        } else {
            running = false;
        }
    }

    function wake() {
        if (!running) {
            running = true;
            requestAnimationFrame(tick);
        }
    }

    window.addEventListener('resize', build);
    window.addEventListener('mousemove', (e) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
        wake();
    });

    window.addEventListener('mouseleave', () => {
        mouse.x = -9999;
        mouse.y = -9999;
        wake();
    });

    build();
})();

// ==========================================================================
// 3. AUTHENTIC ZERO HUB SCROLL ASCENSION (SUBIDA EM ESCADA / FILEIRAS)
// ==========================================================================
let _sectionObserver = null;
let _cardObserver = null;

function initSectionReveal() {
    const sections = document.querySelectorAll('.reveal');
    if (!sections.length) return;

    if (!('IntersectionObserver' in window)) {
        sections.forEach(s => s.classList.add('visible'));
        return;
    }

    if (_sectionObserver) _sectionObserver.disconnect();

    _sectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                _sectionObserver.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.05,
        rootMargin: '0px 0px -20px 0px'
    });

    sections.forEach(s => _sectionObserver.observe(s));
}

function initCardMotion() {
    const cards = Array.from(document.querySelectorAll('.step-card, .product-card'));
    if (!cards.length) return;

    cards.forEach(card => card.classList.add('motion-ready'));

    if (!('IntersectionObserver' in window)) {
        cards.forEach(c => c.classList.add('is-in-view'));
        return;
    }

    if (_cardObserver) {
        _cardObserver.disconnect();
    }

    _cardObserver = new IntersectionObserver((entries) => {
        let stagger = 0;

        // 1. Quando o card sai da tela, remove is-in-view para que suba em escada novamente ao rolar para baixo
        entries.forEach(entry => {
            const card = entry.target;
            if (!entry.isIntersecting && !card.contains(document.activeElement)) {
                card.classList.remove('is-in-view');
                card.style.setProperty('--reveal-delay', '0ms');
            }
        });

        // 2. Ordena os cards que estão entrando: de cima para baixo, e estritamente da esquerda para a direita
        const entering = entries.filter(e => e.isIntersecting);
        entering.sort((a, b) => {
            const rA = a.boundingClientRect;
            const rB = b.boundingClientRect;
            if (Math.abs(rA.top - rB.top) > 50) {
                return rA.top - rB.top;
            }
            return rA.left - rB.left;
        });

        // 3. Aplica o atraso escalonado característico do Zero Hub (0ms, 110ms, 220ms, 330ms)
        entering.forEach(entry => {
            const delay = Math.min(stagger++ * 110, 360);
            entry.target.style.setProperty('--reveal-delay', `${delay}ms`);
            entry.target.classList.add('is-in-view');
        });
    }, {
        threshold: 0.04,
        rootMargin: '0px 0px -15px 0px'
    });

    cards.forEach(card => _cardObserver.observe(card));
}

function initScrollReveal() {
    initSectionReveal();
    initCardMotion();
}

function revealViewportItems() {
    initCardMotion();
}

// ==========================================================================
// 4. ZERO HUB 3D CONTAINER TILT & LATERAL PULL (FÍSICA 3D ESTÁVEL E SUAVE)
// ==========================================================================
let _hoverTarget = null;
let _hoverFrame = 0;
let _pointerX = 0, _pointerY = 0;

function resetTilt(el) {
    if (!el) return;
    el.classList.remove('zero-pointer-active');
    el.style.removeProperty('--zero-tilt-x');
    el.style.removeProperty('--zero-tilt-y');
    el.style.removeProperty('--art-x');
    el.style.removeProperty('--art-y');
    el.style.removeProperty('--light-x');
    el.style.removeProperty('--light-y');
}

function ensureCardSurfaces() {
    document.querySelectorAll('.zero-motion-card').forEach(card => {
        if (!card.querySelector('.card-surface')) {
            const surface = document.createElement('div');
            surface.className = 'card-surface';
            while (card.firstChild) surface.appendChild(card.firstChild);
            card.appendChild(surface);
        }
    });
}

function attachCardTiltMotion() {
    const desktop = matchMedia('(hover: hover) and (pointer: fine)');
    if (!desktop.matches) return;

    ensureCardSurfaces();

    if (window._tiltMotionInitialized) return;
    window._tiltMotionInitialized = true;

    // Rastreamento delegado: o hit box externo nunca gira, eliminando resets indesejados
    document.addEventListener('pointermove', event => {
        const next = event.target.closest('.zero-motion-card');

        if (next !== _hoverTarget) {
            resetTilt(_hoverTarget);
            _hoverTarget = next;
        }

        if (!_hoverTarget) return;

        _hoverTarget.classList.add('zero-pointer-active');
        _pointerX = event.clientX;
        _pointerY = event.clientY;

        if (_hoverFrame) return;
        _hoverFrame = requestAnimationFrame(() => {
            _hoverFrame = 0;
            if (!_hoverTarget) return;

            const rect = _hoverTarget.getBoundingClientRect();
            if (!rect.width || !rect.height) return;

            // Coordenadas normalizadas estáveis de -1 a +1
            const px = Math.max(-1, Math.min(1, ((_pointerX - rect.left) / rect.width) * 2 - 1));
            const py = Math.max(-1, Math.min(1, ((_pointerY - rect.top) / rect.height) * 2 - 1));

            // Ângulos suaves e amortecidos: puxa a lateral com elegância sem oscilação
            const tiltX = -py * 5.0; // inclinação vertical suave
            const tiltY = px * 6.5;  // puxada lateral sutil

            _hoverTarget.style.setProperty('--zero-tilt-x', `${tiltX.toFixed(2)}deg`);
            _hoverTarget.style.setProperty('--zero-tilt-y', `${tiltY.toFixed(2)}deg`);
            _hoverTarget.style.setProperty('--art-x', `${(-px * 4).toFixed(1)}px`);
            _hoverTarget.style.setProperty('--art-y', `${(-py * 3).toFixed(1)}px`);
            _hoverTarget.style.setProperty('--light-x', `${(_pointerX - rect.left).toFixed(1)}px`);
            _hoverTarget.style.setProperty('--light-y', `${(_pointerY - rect.top).toFixed(1)}px`);
        });
    }, { passive: true });

    document.addEventListener('pointerleave', () => {
        resetTilt(_hoverTarget);
        _hoverTarget = null;
        if (_hoverFrame) cancelAnimationFrame(_hoverFrame);
        _hoverFrame = 0;
    }, { passive: true });
}

// ==========================================================================
// 5. STORE STATE & CATALOG MANAGEMENT
// ==========================================================================
const StoreState = {
    allCatalog: {},
    flattenedItems: [],
    filteredItems: [],
    currentCategory: 'Skins',
    currentRarity: 'all',
    searchQuery: '',
    sortBy: 'featured',
    currentPage: 1,
    pageSize: 32,
    cart: []
};

function calculatePriceBRL(item) {
    const rp = item.price_rp || item.regular_rp || 1350;

    if (rp === 3250) return { original: '20.99', final: '10.49', discount: 50 };
    if (rp === 1820) return { original: '11.49', final: '5.75', discount: 50 };
    if (rp === 1350) return { original: '8.49', final: '4.25', discount: 50 };
    if (rp === 975) return { original: '6.49', final: '3.25', discount: 50 };
    if (rp === 750) return { original: '6.49', final: '3.25', discount: 50 };
    if (rp === 520) return { original: '3.49', final: '1.75', discount: 50 };
    if (rp === 290) return { original: '1.99', final: '1.39', discount: 30 };
    if (rp === 1650) return { original: '10.79', final: '5.39', discount: 50 };
    if (rp === 2650) return { original: '17.29', final: '8.64', discount: 50 };

    const estOriginal = (rp * 0.00628).toFixed(2);
    const estFinal = (rp * 0.00314).toFixed(2);
    return {
        original: estOriginal,
        final: Math.max(1.0, parseFloat(estFinal)).toFixed(2),
        discount: 50
    };
}

function getItemImage(item) {
    if (item.icon_url && item.icon_url.startsWith('http')) return item.icon_url;
    if (item.image_url && item.image_url.startsWith('http')) return item.image_url;
    return 'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Ahri_0.jpg';
}

function getRarityClass(rarity, rarityLabel) {
    const r = (rarityLabel || rarity || '').toLowerCase();
    if (r.includes('ultimate')) return 'ultimate';
    if (r.includes('mythic') || r.includes('mítica')) return 'mythic';
    if (r.includes('legendary') || r.includes('lendária')) return 'legendary';
    if (r.includes('epic') || r.includes('épica')) return 'epic';
    if (r.includes('chroma') || r.includes('croma')) return 'chroma';
    if (r.includes('pass') || r.includes('passe')) return 'pass';
    return 'common';
}

function normalizeStr(str) {
    return (str || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

async function initStorefront() {
    loadCartFromStorage();
    setupEventListeners();
    attachCardTiltMotion();
    initScrollReveal();
    revealViewportItems();

    const loader = document.getElementById('catalogLoadingIndicator');
    if (loader) loader.style.display = 'flex';

    try {
        const res = await fetch('/get-catalog?lang=pt');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        StoreState.allCatalog = data;
        processCatalog();
    } catch (err) {
        console.error('Erro ao obter catálogo:', err);
        showToast('Erro ao carregar catálogo. Recarregando...', true);
    } finally {
        if (loader) loader.style.display = 'none';
    }
}

function processCatalog() {
    const flattened = [];
    const catCounts = {
        Skins: 0,
        Passes: 0,
        Loot: 0,
        Bundles: 0,
        Chromas: 0,
        Others: 0
    };

    for (const [catName, itemsMap] of Object.entries(StoreState.allCatalog)) {
        if (!itemsMap || typeof itemsMap !== 'object') continue;

        let mapped = 'Others';
        if (catName === 'Skins') mapped = 'Skins';
        else if (catName === 'Passes') mapped = 'Passes';
        else if (catName === 'Loot') mapped = 'Loot';
        else if (catName === 'Bundles') mapped = 'Bundles';
        else if (catName === 'Chromas') mapped = 'Chromas';

        for (const [itemName, itemData] of Object.entries(itemsMap)) {
            flattened.push({
                ...itemData,
                name: itemName,
                category: mapped,
                rawCategory: catName
            });
            catCounts[mapped] = (catCounts[mapped] || 0) + 1;
        }
    }

    StoreState.flattenedItems = flattened;

    document.querySelectorAll('.filter-tab').forEach(tab => {
        const cat = tab.getAttribute('data-cat');
        const countSpan = tab.querySelector('.pill-count');
        if (countSpan) {
            if (cat === 'all') {
                countSpan.textContent = flattened.length.toLocaleString('pt-BR');
            } else if (catCounts[cat] !== undefined) {
                countSpan.textContent = catCounts[cat].toLocaleString('pt-BR');
            }
        }
    });

    applyFilters();
}

function applyFilters() {
    let result = StoreState.flattenedItems;

    if (StoreState.currentCategory !== 'all') {
        result = result.filter(item => item.category === StoreState.currentCategory);
    }

    if (StoreState.searchQuery.trim()) {
        const q = normalizeStr(StoreState.searchQuery.trim());
        result = result.filter(item => normalizeStr(item.name).includes(q));
    }

    if (StoreState.currentRarity !== 'all') {
        result = result.filter(item => {
            const rClass = getRarityClass(item.rarity, item.rarity_label);
            return rClass === StoreState.currentRarity;
        });
    }

    if (StoreState.sortBy === 'price-asc') {
        result.sort((a, b) => (a.price_rp || 0) - (b.price_rp || 0));
    } else if (StoreState.sortBy === 'price-desc') {
        result.sort((a, b) => (b.price_rp || 0) - (a.price_rp || 0));
    } else if (StoreState.sortBy === 'name-asc') {
        result.sort((a, b) => a.name.localeCompare(b.name));
    }

    StoreState.filteredItems = result;
    StoreState.currentPage = 1;

    renderCatalog();
}

function renderCatalog() {
    const grid = document.getElementById('productsGrid');
    const statsEl = document.getElementById('catalogTotalCount');
    const emptyState = document.getElementById('catalogEmptyState');
    const loadMoreBtn = document.getElementById('btnLoadMore');

    if (!grid) return;

    if (statsEl) {
        statsEl.textContent = StoreState.filteredItems.length.toLocaleString('pt-BR');
    }

    if (StoreState.filteredItems.length === 0) {
        grid.innerHTML = '';
        if (emptyState) emptyState.style.display = 'block';
        if (loadMoreBtn) loadMoreBtn.style.display = 'none';
        return;
    }

    if (emptyState) emptyState.style.display = 'none';

    const itemsToRender = StoreState.filteredItems.slice(0, StoreState.currentPage * StoreState.pageSize);
    grid.innerHTML = itemsToRender.map(item => createProductCardHTML(item)).join('');

    // Trigger smooth 3D scroll reveal and container tilt
    initScrollReveal();
    attachCardTiltMotion();
    revealViewportItems();

    if (loadMoreBtn) {
        if (itemsToRender.length < StoreState.filteredItems.length) {
            loadMoreBtn.style.display = 'inline-flex';
            const remaining = StoreState.filteredItems.length - itemsToRender.length;
            const countEl = loadMoreBtn.querySelector('.remaining-count');
            if (countEl) countEl.textContent = `(${remaining.toLocaleString('pt-BR')} restantes)`;
        } else {
            loadMoreBtn.style.display = 'none';
        }
    }
}

function createProductCardHTML(item) {
    const pricing = calculatePriceBRL(item);
    const imgSrc = getItemImage(item);
    const rarityClass = getRarityClass(item.rarity, item.rarity_label);
    const rarityLabel = item.rarity_label || rarityClass.toUpperCase();
    const rpPrice = item.price_rp || item.regular_rp || 1350;

    const safeData = encodeURIComponent(JSON.stringify({
        id: item.item_id || item.offer_id,
        name: item.name,
        price_brl: pricing.final,
        rp: rpPrice,
        image: imgSrc,
        category: item.category
    }));

    return `
    <div class="product-card zero-motion-item zero-motion-card">
        <div class="card-surface">
            <div class="card-glare"></div>
            <div class="card-media-wrap">
                <span class="card-badge-rarity ${rarityClass}">
                    <i class="fa-solid fa-gem"></i> ${rarityLabel}
                </span>
                <span class="card-badge-discount">-${pricing.discount}% OFF</span>
                <img class="card-media-img" src="${imgSrc}" alt="${item.name}" loading="lazy" onerror="this.src='https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Ahri_0.jpg'">
            </div>
            <div class="card-body">
                <div class="card-title" title="${item.name}">${item.name}</div>
                <div class="card-price-container">
                    <div class="card-rp-tag">
                        <img src="/static/images/icon-rp.png" width="14" height="14" alt="RP" onerror="this.style.display='none'">
                        <span>${rpPrice.toLocaleString('pt-BR')} RP</span>
                    </div>
                    <div class="card-brl-price">
                        <span class="cur">R$</span>
                        <span class="val">${pricing.final}</span>
                    </div>
                </div>
                <button class="btn-card-gift" onclick="handleAddToCart('${safeData}')">
                    <i class="fa-solid fa-gift"></i> Presentear
                </button>
            </div>
        </div>
    </div>
    `;
}

// ==========================================================================
// 6. CART & CHECKOUT DRAWER
// ==========================================================================
function loadCartFromStorage() {
    try {
        const saved = localStorage.getItem('kitsune_store_cart');
        if (saved) StoreState.cart = JSON.parse(saved);
    } catch (e) {
        StoreState.cart = [];
    }
    updateCartUI();
}

function saveCartToStorage() {
    try {
        localStorage.setItem('kitsune_store_cart', JSON.stringify(StoreState.cart));
    } catch (e) { }
    updateCartUI();
}

function handleAddToCart(encodedData) {
    const item = JSON.parse(decodeURIComponent(encodedData));
    const exists = StoreState.cart.find(c => c.id === item.id);

    if (exists) {
        showToast(`"${item.name}" já está no carrinho!`);
    } else {
        StoreState.cart.push(item);
        saveCartToStorage();
        showToast(`"${item.name}" adicionado ao carrinho!`);
    }
    openCartDrawer();
}

function handleRemoveFromCart(id) {
    StoreState.cart = StoreState.cart.filter(item => item.id !== id);
    saveCartToStorage();
}

function updateCartUI() {
    document.querySelectorAll('.cart-badge-count').forEach(b => b.textContent = StoreState.cart.length);

    const listEl = document.getElementById('cartItemsList');
    const emptyEl = document.getElementById('cartEmptyState');
    const totalEl = document.getElementById('cartTotalValue');
    const submitBtn = document.getElementById('btnSubmitOrder');

    if (!listEl) return;

    if (StoreState.cart.length === 0) {
        listEl.innerHTML = '';
        if (emptyEl) emptyEl.style.display = 'block';
        if (totalEl) totalEl.textContent = 'R$ 0,00';
        if (submitBtn) submitBtn.disabled = true;
        return;
    }

    if (emptyEl) emptyEl.style.display = 'none';
    if (submitBtn) submitBtn.disabled = false;

    let total = 0;
    listEl.innerHTML = StoreState.cart.map(item => {
        const price = parseFloat(item.price_brl) || 0;
        total += price;
        return `
        <div class="cart-item-row">
            <img class="cart-item-img" src="${item.image}" alt="${item.name}">
            <div class="cart-item-info">
                <div class="cart-item-name" title="${item.name}">${item.name}</div>
                <div class="cart-item-price">R$ ${item.price_brl}</div>
            </div>
            <button class="btn-remove-item" onclick="handleRemoveFromCart('${item.id}')" title="Remover item">
                <i class="fa-solid fa-trash-can"></i>
            </button>
        </div>
        `;
    }).join('');

    if (totalEl) {
        totalEl.textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;
    }
}

function openCartDrawer() {
    const drawer = document.getElementById('cartDrawer');
    const overlay = document.getElementById('cartOverlay');
    if (drawer) drawer.classList.add('open');
    if (overlay) overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeCartDrawer() {
    const drawer = document.getElementById('cartDrawer');
    const overlay = document.getElementById('cartOverlay');
    if (drawer) drawer.classList.remove('open');
    if (overlay) overlay.classList.remove('open');
    document.body.style.overflow = '';
}

function handleCheckout() {
    const riotInput = document.getElementById('cartRiotIdInput');
    const riotId = riotInput ? riotInput.value.trim() : '';

    if (!riotId) {
        showToast('Por favor, informe seu Riot ID (Ex: Nick#TAG)', true);
        if (riotInput) riotInput.focus();
        return;
    }

    if (!riotId.includes('#')) {
        showToast('Riot ID inválido! Lembre-se da #TAG (Ex: Faker#BR1)', true);
        if (riotInput) riotInput.focus();
        return;
    }

    if (StoreState.cart.length === 0) {
        showToast('Seu carrinho está vazio!', true);
        return;
    }

    const total = StoreState.cart.reduce((acc, it) => acc + parseFloat(it.price_brl || 0), 0);
    const itemNames = StoreState.cart.map(it => it.name).join(', ');

    alert(`🎉 Pedido Gerado com Sucesso!\n\nDestinatário: ${riotId}\nItens: ${itemNames}\nTotal: R$ ${total.toFixed(2)}\n\nO bot da Kitsune enviará um pedido de amizade no League of Legends para ${riotId} para a entrega do presente!`);

    StoreState.cart = [];
    saveCartToStorage();
    closeCartDrawer();
}

function showToast(message, isError = false) {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'toast';
    if (isError) {
        toast.style.borderColor = '#ef4444';
        toast.innerHTML = `<i class="fa-solid fa-circle-exclamation" style="color: #ef4444"></i> <span>${message}</span>`;
    } else {
        toast.innerHTML = `<i class="fa-solid fa-circle-check" style="color: var(--cyan-primary)"></i> <span>${message}</span>`;
    }

    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3200);
}

// ==========================================================================
// 7. EVENT LISTENERS
// ==========================================================================
function setupEventListeners() {
    const searchInputs = [
        document.getElementById('navSearchInput'),
        document.getElementById('catalogSearchInput')
    ];

    let timer = null;
    searchInputs.forEach(input => {
        if (!input) return;
        input.addEventListener('input', (e) => {
            clearTimeout(timer);
            timer = setTimeout(() => {
                StoreState.searchQuery = e.target.value;
                searchInputs.forEach(other => {
                    if (other && other !== input) other.value = e.target.value;
                });
                applyFilters();
            }, 180);
        });
    });

    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            StoreState.currentCategory = tab.getAttribute('data-cat');
            applyFilters();
        });
    });

    document.querySelectorAll('.rarity-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('.rarity-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            StoreState.currentRarity = chip.getAttribute('data-rarity');
            applyFilters();
        });
    });

    const sortSelect = document.getElementById('catalogSortSelect');
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            StoreState.sortBy = e.target.value;
            applyFilters();
        });
    }

    const loadMoreBtn = document.getElementById('btnLoadMore');
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', () => {
            StoreState.currentPage++;
            renderCatalog();
        });
    }

    const trigger = document.getElementById('btnCartTrigger');
    if (trigger) trigger.addEventListener('click', openCartDrawer);

    const closeBtn = document.getElementById('btnCloseDrawer');
    if (closeBtn) closeBtn.addEventListener('click', closeCartDrawer);

    const overlay = document.getElementById('cartOverlay');
    if (overlay) overlay.addEventListener('click', closeCartDrawer);

    const submitBtn = document.getElementById('btnSubmitOrder');
    if (submitBtn) submitBtn.addEventListener('click', handleCheckout);

    // Suporte fluido para navegação por âncoras (#catalogo, #como-funciona)
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (!href || href === '#') return;
            const target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                const top = target.getBoundingClientRect().top + window.scrollY - 75;
                window.scrollTo({ top, behavior: 'smooth' });
            }
        });
    });
}

document.addEventListener('DOMContentLoaded', initStorefront);
