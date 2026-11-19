/* Estado del navegador de Floristería Magno.
 * No guarda datos personales ni datos bancarios. El mismo perfil del navegador
 * conserva su carrito y las referencias de pedidos; no sincroniza entre dispositivos.
 */
(function (global) {
    'use strict';
    const CART_KEY = 'jhmagno_cart';
    const ORDERS_KEY = 'jhmagno_orders_v1';
    const PRODUCT_LIMIT = 100;
    const ORDER_LIMIT = 20;
    const ORDER_PATTERN = /^JHM-\d{6}$/;
    const TERMINAL_STATES = new Set(['ENTREGADO', 'CANCELADO']);
    const FALLBACK_IMAGE = 'assets/img/icon/logo_lpb.png';
    function readJSON(key, fallback) {
        try {
            const data = JSON.parse(global.localStorage.getItem(key));
            return data && typeof data === 'object' ? data : fallback;
        } catch (_) { return fallback; }
    }
    function storeJSON(key, value) {
        try {
            global.localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.warn('No fue posible guardar el estado del navegador:', error);
            return false;
        }
    }
    function validImage(url) {
        if (typeof url !== 'string' || url.length > 1000) return '';
        try {
            const parsed = new URL(url, global.location.href);
            return ['http:', 'https:'].includes(parsed.protocol) ? url : '';
        } catch (_) { return ''; }
    }
    function normalizeItem(raw, key) {
        if (!raw || typeof raw !== 'object') return null;
        const id = Number(raw.id || key);
        const qty = Number(raw.qty);
        if (!Number.isSafeInteger(id) || id <= 0 ||
            !Number.isSafeInteger(qty) || qty <= 0) return null;
        const list = Array.isArray(raw.images) ? raw.images : [];
        const images = [...new Set([raw.image, ...list].map(validImage).filter(Boolean))].slice(0, 10);
        return {
            id: String(id), qty: Math.min(qty, 99),
            name: String(raw.name || 'Arreglo floral').slice(0, 150),
            price: Number.isFinite(Number(raw.price)) && Number(raw.price) >= 0 ? Number(raw.price) : 0,
            image: images[0] || '',
            images,
            description: String(raw.description || '').slice(0, 1500),
            tags: Array.isArray(raw.tags) ? raw.tags.slice(0, 10).map(tag => String(tag).slice(0, 80)) : []
        };
    }
    function readCart() {
        const stored = readJSON(CART_KEY, {});
        if (Array.isArray(stored)) return {};
        const cart = {};
        Object.entries(stored).slice(0, PRODUCT_LIMIT).forEach(([key, value]) => {
            const item = normalizeItem(value, key);
            if (item) cart[item.id] = item;
        });
        return cart;
    }
    function cartCount() {
        return Object.values(readCart()).reduce((sum, item) => sum + item.qty, 0);
    }
    function updateCartIndicators() {
        const count = cartCount();
        document.querySelectorAll('#cartCount,.cart-count,.mobile-cart-count').forEach(badge => {
            badge.textContent = count > 99 ? '99+' : String(count);
            badge.hidden = count <= 0;
            badge.setAttribute('aria-label', count + ' arreglos en el carrito');
        });
        document.querySelectorAll('.mobile-app-nav [data-page="carrito"]').forEach(link => {
            link.setAttribute('aria-label', count > 0 ? 'Carrito: ' + count + ' arreglos' : 'Carrito vacío');
        });
        return count;
    }
    function saveCart(value) {
        const cart = {};
        Object.entries(value || {}).slice(0, PRODUCT_LIMIT).forEach(([key, raw]) => {
            const item = normalizeItem(raw, key);
            if (item) cart[item.id] = item;
        });
        const ok = storeJSON(CART_KEY, cart);
        if (ok) {
            updateCartIndicators();
            document.dispatchEvent(new CustomEvent('magno:cart-changed', { detail: { count: cartCount() } }));
        }
        return ok;
    }
    function readOrders() {
        const raw = readJSON(ORDERS_KEY, []);
        if (!Array.isArray(raw)) return [];
        const seen = new Set();
        return raw.filter(item => {
            const code = String(item?.code || '').toUpperCase();
            if (!ORDER_PATTERN.test(code) || seen.has(code)) return false;
            seen.add(code);
            return true;
        }).slice(0, ORDER_LIMIT).map(item => ({
            code: String(item.code).toUpperCase(),
            state: String(item.state || 'PENDIENTE').toUpperCase().slice(0, 32),
            savedAt: Number(item.savedAt) || Date.now()
        }));
    }
    function rememberOrder(value, state = 'PENDIENTE') {
        const code = String(value || '').trim().toUpperCase();
        if (!ORDER_PATTERN.test(code)) return false;
        const orders = readOrders().filter(entry => entry.code !== code);
        const previous = readOrders().find(entry => entry.code === code);
        const entry = {
            code, state: String(state || previous?.state || 'PENDIENTE').toUpperCase(),
            savedAt: previous?.savedAt || Date.now()
        };
        const ok = storeJSON(ORDERS_KEY, [entry, ...orders].slice(0, ORDER_LIMIT));
        if (ok) document.dispatchEvent(new CustomEvent('magno:orders-changed'));
        return ok;
    }
    function setOrderState(code, state) {
        code = String(code || '').toUpperCase();
        if (!ORDER_PATTERN.test(code)) return false;
        const orders = readOrders();
        const current = orders.find(entry => entry.code === code);
        if (!current) return false;
        current.state = String(state || current.state).toUpperCase();
        return storeJSON(ORDERS_KEY, orders);
    }
    function isActiveOrder(item) {
        return item && !TERMINAL_STATES.has(item.state);
    }
    function removeOrder(code) {
        const orders = readOrders().filter(item => item.code !== String(code).toUpperCase());
        return storeJSON(ORDERS_KEY, orders);
    }

    global.MagnoStore = Object.freeze({
        CART_KEY, ORDERS_KEY, FALLBACK_IMAGE, validImage,
        readCart, saveCart, cartCount, updateCartIndicators,
        readOrders, rememberOrder, setOrderState, isActiveOrder, removeOrder
    });
    document.addEventListener('DOMContentLoaded', updateCartIndicators);
    global.addEventListener('pageshow', updateCartIndicators);
    global.addEventListener('storage', event => {
        if (event.key === CART_KEY || event.key === null) updateCartIndicators();
        if (event.key === ORDERS_KEY) document.dispatchEvent(new CustomEvent('magno:orders-changed'));
    });
})(window);
