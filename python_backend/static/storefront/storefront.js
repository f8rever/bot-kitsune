/**
 * KITSUNE GIFTING STOREFRONT — CLIENT LOGIC & ANIMATIONS
 * - Interactive Dot-Matrix Canvas (Zero Hub Replica with Hextech & Arcane Colors)
 * - Real-time Catalog Search & Filter Engine (9,290 items)
 * - Infinite Batch Renderer (Ultra smooth 60fps)
 * - Slide-in Checkout Drawer & Cart Manager
 */

// ==========================================================================
// 1. INTERACTIVE DOT-MATRIX CANVAS (ZERO HUB ENGINE)
// ==========================================================================
class DotMatrixCanvas {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.dots = [];
        this.spacing = 30; // Grid spacing in px
        this.baseRadius = 1.2;
        this.mouseRadius = 160;

        this.mouse = {
            x: -1000,
            y: -1000,
            targetX: -1000,
            targetY: -1000,
            active: false
        };

        this.time = 0;
        this.init();
    }

    init() {
        this.resize();
        window.addEventListener('resize', () => this.resize());
        window.addEventListener('mousemove', (e) => {
            this.mouse.targetX = e.clientX;
            this.mouse.targetY = e.clientY;
            this.mouse.active = true;
        });

        window.addEventListener('mouseleave', () => {
            this.mouse.active = false;
        });

        this.animate();
    }

    resize() {
        this.width = this.canvas.width = window.innerWidth;
        this.height = this.canvas.height = window.innerHeight;
        this.createDots();
    }

    createDots() {
        this.dots = [];
        const cols = Math.ceil(this.width / this.spacing) + 1;
        const rows = Math.ceil(this.height / this.spacing) + 1;

        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                this.dots.push({
                    x: x * this.spacing,
                    y: y * this.spacing,
                    baseX: x * this.spacing,
                    baseY: y * this.spacing,
                    radius: this.baseRadius,
                    alpha: 0.12,
                    color: '#463714'
                });
            }
        }
    }

    animate() {
        this.time += 0.02;

        // Smooth mouse lerp
        if (this.mouse.active) {
            this.mouse.x += (this.mouse.targetX - this.mouse.x) * 0.15;
            this.mouse.y += (this.mouse.targetY - this.mouse.y) * 0.15;
        } else {
            this.mouse.x += (-1000 - this.mouse.x) * 0.05;
            this.mouse.y += (-1000 - this.mouse.y) * 0.05;
        }

        this.ctx.clearRect(0, 0, this.width, this.height);

        for (let i = 0; i < this.dots.length; i++) {
            const dot = this.dots[i];
            const dx = this.mouse.x - dot.x;
            const dy = this.mouse.y - dot.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Ambient gentle wave
            const wave = Math.sin(this.time + (dot.baseX * 0.01) + (dot.baseY * 0.01)) * 0.3;

            if (dist < this.mouseRadius) {
                const norm = 1 - (dist / this.mouseRadius);
                const ease = Math.pow(norm, 2);

                dot.radius = this.baseRadius + (ease * 2.8);
                dot.alpha = 0.2 + (ease * 0.7);

                // Blend between Hextech Gold and Arcane Cyan based on distance
                if (norm > 0.6) {
                    dot.color = `rgba(200, 170, 110, ${dot.alpha})`; // Hextech Gold
                } else {
                    dot.color = `rgba(10, 200, 185, ${dot.alpha})`; // Arcane Cyan
                }
            } else {
                dot.radius = Math.max(0.8, this.baseRadius + wave * 0.4);
                dot.alpha = Math.max(0.06, 0.1 + wave * 0.05);
                dot.color = `rgba(200, 170, 110, ${dot.alpha})`;
            }

            this.ctx.beginPath();
            this.ctx.arc(dot.x, dot.y, dot.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = dot.color;
            this.ctx.fill();
        }

        requestAnimationFrame(() => this.animate());
    }
}

// ==========================================================================
// 2. STOREFRONT ENGINE & STATE
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
    pageSize: 36,
    cart: [],
    pricingRules: null
};

// Standard LoL pricing lookup table
function calculatePriceBRL(item) {
    const rp = item.price_rp || item.regular_rp || 1350;

    // Fixed discount price mapping for popular RP tiers
    if (rp === 3250) return { original: '20.99', final: '10.49', discount: 50 };
    if (rp === 1820) return { original: '11.49', final: '5.75', discount: 50 };
    if (rp === 1350) return { original: '8.49', final: '4.25', discount: 50 };
    if (rp === 975)  return { original: '6.49', final: '3.25', discount: 50 };
    if (rp === 750)  return { original: '6.49', final: '3.25', discount: 50 };
    if (rp === 520)  return { original: '3.49', final: '1.75', discount: 50 };
    if (rp === 290)  return { original: '1.99', final: '1.39', discount: 30 };
    if (rp === 1650) return { original: '10.79', final: '5.39', discount: 50 };
    if (rp === 2650) return { original: '17.29', final: '8.64', discount: 50 };

    // Dynamic formula for other values (bundles, loot, etc.)
    const estimatedOriginal = (rp * 0.00628).toFixed(2);
    const estimatedFinal = (rp * 0.00314).toFixed(2);
    return {
        original: estimatedOriginal,
        final: Math.max(1.0, parseFloat(estimatedFinal)).toFixed(2),
        discount: 50
    };
}

// Fallback high-res image helper
function getItemImage(item) {
    if (item.icon_url && item.icon_url.startsWith('http')) {
        return item.icon_url;
    }
    if (item.image_url && item.image_url.startsWith('http')) {
        return item.image_url;
    }
    // Default fallback
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

// ==========================================================================
// 3. CATALOG FETCHING & INDEXING
// ==========================================================================
async function initStorefront() {
    new DotMatrixCanvas('dotCanvas');
    loadCartFromStorage();
    setupEventListeners();

    const loader = document.getElementById('catalogLoadingIndicator');
    if (loader) loader.style.display = 'flex';

    try {
        const res = await fetch('/get-catalog?lang=pt');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        StoreState.allCatalog = data;
        processCatalogData();
    } catch (err) {
        console.error('Erro ao carregar catálogo oficial:', err);
        showToast('Erro ao carregar itens da loja. Tentando recarregar...', true);
    } finally {
        if (loader) loader.style.display = 'none';
    }
}

function processCatalogData() {
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

        let mappedCategory = 'Others';
        if (catName === 'Skins') mappedCategory = 'Skins';
        else if (catName === 'Passes') mappedCategory = 'Passes';
        else if (catName === 'Loot') mappedCategory = 'Loot';
        else if (catName === 'Bundles') mappedCategory = 'Bundles';
        else if (catName === 'Chromas') mappedCategory = 'Chromas';

        for (const [itemName, itemData] of Object.entries(itemsMap)) {
            const itemObj = {
                ...itemData,
                name: itemName,
                category: mappedCategory,
                rawCategory: catName
            };
            flattened.push(itemObj);
            catCounts[mappedCategory] = (catCounts[mappedCategory] || 0) + 1;
        }
    }

    StoreState.flattenedItems = flattened;

    // Update Tab Counters in UI
    document.querySelectorAll('.filter-tab').forEach(tab => {
        const cat = tab.getAttribute('data-cat');
        const countSpan = tab.querySelector('.tab-count');
        if (countSpan && catCounts[cat] !== undefined) {
            countSpan.textContent = catCounts[cat].toLocaleString('pt-BR');
        }
    });

    applyFilters();
}

// ==========================================================================
// 4. FILTERING & SORTING LOGIC
// ==========================================================================
function applyFilters() {
    let result = StoreState.flattenedItems;

    // 1. Category Filter
    if (StoreState.currentCategory !== 'all') {
        result = result.filter(item => item.category === StoreState.currentCategory);
    }

    // 2. Search Query Filter
    if (StoreState.searchQuery.trim()) {
        const q = normalizeStr(StoreState.searchQuery.trim());
        result = result.filter(item => {
            const nameNorm = normalizeStr(item.name);
            return nameNorm.includes(q);
        });
    }

    // 3. Rarity Filter
    if (StoreState.currentRarity !== 'all') {
        result = result.filter(item => {
            const rClass = getRarityClass(item.rarity, item.rarity_label);
            return rClass === StoreState.currentRarity;
        });
    }

    // 4. Sort
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

// ==========================================================================
// 5. CATALOG RENDERING & PAGINATION
// ==========================================================================
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

    // Handle Load More Button
    if (loadMoreBtn) {
        if (itemsToRender.length < StoreState.filteredItems.length) {
            loadMoreBtn.style.display = 'inline-flex';
            loadMoreBtn.querySelector('.remaining-count').textContent =
                `(${(StoreState.filteredItems.length - itemsToRender.length).toLocaleString('pt-BR')} restantes)`;
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

    // Escaped string for data attributes
    const safeItemData = encodeURIComponent(JSON.stringify({
        id: item.item_id || item.offer_id,
        name: item.name,
        price_brl: pricing.final,
        rp: rpPrice,
        image: imgSrc,
        category: item.category
    }));

    return `
    <div class="product-card" data-item-id="${item.item_id || item.offer_id}">
        <div class="card-thumb-wrap">
            <span class="card-rarity-badge ${rarityClass}">
                <i class="fa-solid fa-gem"></i> ${rarityLabel}
            </span>
            <span class="card-discount-tag">-${pricing.discount}% OFF</span>
            <img class="card-thumb" src="${imgSrc}" alt="${item.name}" loading="lazy" onerror="this.src='https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Ahri_0.jpg'">
        </div>
        <div class="card-content">
            <div class="card-item-title" title="${item.name}">${item.name}</div>
            <div class="card-pricing-row">
                <div class="card-rp-original">
                    <img src="/static/images/icon-rp.png" width="14" height="14" alt="RP" onerror="this.style.display='none'">
                    <span>${rpPrice.toLocaleString('pt-BR')} RP</span>
                </div>
                <div class="card-price-brl">
                    <span class="symbol">R$</span>
                    <span class="value">${pricing.final}</span>
                </div>
            </div>
            <button class="btn-card-add" onclick="handleAddToCart('${safeItemData}')">
                <i class="fa-solid fa-gift"></i> Presentear
            </button>
        </div>
    </div>
    `;
}

// ==========================================================================
// 6. CART & DRAWER MANAGEMENT
// ==========================================================================
function loadCartFromStorage() {
    try {
        const saved = localStorage.getItem('kitsune_store_cart');
        if (saved) {
            StoreState.cart = JSON.parse(saved);
        }
    } catch (e) {
        StoreState.cart = [];
    }
    updateCartUI();
}

function saveCartToStorage() {
    try {
        localStorage.setItem('kitsune_store_cart', JSON.stringify(StoreState.cart));
    } catch (e) {}
    updateCartUI();
}

function handleAddToCart(encodedData) {
    const item = JSON.parse(decodeURIComponent(encodedData));
    const exists = StoreState.cart.find(c => c.id === item.id);

    if (exists) {
        showToast(`"${item.name}" já está no seu carrinho!`);
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
    const counterBadges = document.querySelectorAll('.cart-counter-badge');
    counterBadges.forEach(b => b.textContent = StoreState.cart.length);

    const listEl = document.getElementById('cartItemsList');
    const emptyEl = document.getElementById('cartEmptyState');
    const totalEl = document.getElementById('cartTotalValue');
    const checkoutBtn = document.getElementById('btnCheckoutPix');

    if (!listEl) return;

    if (StoreState.cart.length === 0) {
        listEl.innerHTML = '';
        if (emptyEl) emptyEl.style.display = 'block';
        if (totalEl) totalEl.textContent = 'R$ 0,00';
        if (checkoutBtn) checkoutBtn.disabled = true;
        return;
    }

    if (emptyEl) emptyEl.style.display = 'none';
    if (checkoutBtn) checkoutBtn.disabled = false;

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
            <button class="btn-item-remove" onclick="handleRemoveFromCart('${item.id}')" title="Remover item">
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

// ==========================================================================
// 7. CHECKOUT SUBMISSION & TOASTS
// ==========================================================================
function handleCheckout() {
    const riotIdInput = document.getElementById('cartRiotIdInput');
    const riotId = riotIdInput ? riotIdInput.value.trim() : '';

    if (!riotId) {
        showToast('Por favor, informe seu Riot ID (Ex: Nome#BR1)', true);
        if (riotIdInput) riotIdInput.focus();
        return;
    }

    if (!riotId.includes('#')) {
        showToast('Riot ID inválido! Não esqueça da #TAG (Ex: Faker#BR1)', true);
        if (riotIdInput) riotIdInput.focus();
        return;
    }

    if (StoreState.cart.length === 0) {
        showToast('Seu carrinho está vazio!', true);
        return;
    }

    // Build order summary modal / prompt
    const total = StoreState.cart.reduce((acc, it) => acc + parseFloat(it.price_brl || 0), 0);
    const itemNames = StoreState.cart.map(it => it.name).join(', ');

    alert(`🎉 Pedido Gerado com Sucesso!\n\nDestinatário: ${riotId}\nItens: ${itemNames}\nTotal: R$ ${total.toFixed(2)}\n\nO bot enviará um pedido de amizade no League of Legends para ${riotId} para a entrega do presente!`);
    
    // Clear cart
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
// 8. EVENT LISTENERS SETUP
// ==========================================================================
function setupEventListeners() {
    // Search Inputs (Navbar + Catalog)
    const searchInputs = [
        document.getElementById('navSearchInput'),
        document.getElementById('catalogSearchInput')
    ];

    let searchDebounceTimer = null;
    searchInputs.forEach(input => {
        if (!input) return;
        input.addEventListener('input', (e) => {
            clearTimeout(searchDebounceTimer);
            searchDebounceTimer = setTimeout(() => {
                StoreState.searchQuery = e.target.value;
                // Sync both inputs
                searchInputs.forEach(other => {
                    if (other && other !== input) other.value = e.target.value;
                });
                applyFilters();
            }, 180);
        });
    });

    // Category Tabs
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            StoreState.currentCategory = tab.getAttribute('data-cat');
            applyFilters();
        });
    });

    // Rarity Chips
    document.querySelectorAll('.rarity-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('.rarity-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            StoreState.currentRarity = chip.getAttribute('data-rarity');
            applyFilters();
        });
    });

    // Sort Select
    const sortSelect = document.getElementById('catalogSortSelect');
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            StoreState.sortBy = e.target.value;
            applyFilters();
        });
    }

    // Load More Button
    const loadMoreBtn = document.getElementById('btnLoadMore');
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', () => {
            StoreState.currentPage++;
            renderCatalog();
        });
    }

    // Cart Drawer triggers
    const cartTrigger = document.getElementById('btnCartTrigger');
    if (cartTrigger) {
        cartTrigger.addEventListener('click', openCartDrawer);
    }

    const closeBtn = document.getElementById('btnCloseDrawer');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeCartDrawer);
    }

    const overlay = document.getElementById('cartOverlay');
    if (overlay) {
        overlay.addEventListener('click', closeCartDrawer);
    }

    const checkoutBtn = document.getElementById('btnCheckoutPix');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', handleCheckout);
    }
}

// Start on DOM ready
document.addEventListener('DOMContentLoaded', initStorefront);
