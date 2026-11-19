const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const file = path.resolve(__dirname, '../../docs/assets/js/storefront-state.js');

function loadBrowser() {
    const memory = new Map();
    const badge = {
        textContent: '', hidden: true, attributes: {},
        setAttribute(key, value) { this.attributes[key] = value; }
    };
    const document = {
        addEventListener() {}, dispatchEvent() {},
        querySelectorAll(selector) {
            return selector.includes('cartCount') ? [badge] : [];
        }
    };
    const window = {
        location: { href: 'https://listoenlinea-labs.github.io/Floristeria-Magno/index.html' },
        addEventListener() {},
        localStorage: {
            getItem(key) { return memory.get(key) || null; },
            setItem(key, value) { memory.set(key, value); },
            removeItem(key) { memory.delete(key); }
        }
    };
    vm.runInNewContext(fs.readFileSync(file, 'utf8'), {
        window, document, URL, console,
        CustomEvent: class { constructor(name, config) { this.name = name; this.detail = config?.detail; } }
    });
    return { store: window.MagnoStore, memory, badge };
}

test('carrito persiste imagen y alternativas con cantidad y burbuja en móvil', () => {
    const { store, memory, badge } = loadBrowser();
    const url = 'https://api.listoenlinea.host/uploads/productos/flor.webp';
    assert.equal(store.saveCart({
        '7': { id: 7, name: 'Ramo de rosas', qty: 2, price: 1500,
            image: url, images: [url, 'javascript:alert(1)', 'https://api.listoenlinea.host/uploads/productos/otra.webp'] }
    }), true);
    assert.equal(store.cartCount(), 2);
    assert.equal(badge.textContent, '2');
    assert.equal(badge.hidden, false);
    assert.equal(store.readCart()['7'].image, url);
    assert.equal(store.readCart()['7'].images.length, 2);
    assert.ok(memory.get('jhmagno_cart'));
    assert.equal(store.saveCart({}), true);
    assert.equal(badge.hidden, true);
});

test('solo recuerda códigos válidos y mantiene pedidos hasta cierre', () => {
    const { store } = loadBrowser();
    assert.equal(store.rememberOrder('INVÁLIDO'), false);
    assert.equal(store.rememberOrder('JHM-000123'), true);
    assert.equal(store.setOrderState('JHM-000123', 'EN_CAMINO'), true);
    assert.equal(store.readOrders().filter(store.isActiveOrder).length, 1);
    assert.equal(store.setOrderState('JHM-000123', 'ENTREGADO'), true);
    assert.equal(store.readOrders().filter(store.isActiveOrder).length, 0);
    assert.equal(store.readOrders()[0].code, 'JHM-000123');
});

test('datos guardados dañados no rompen el carrito', () => {
    const { store, memory } = loadBrowser();
    memory.set('jhmagno_cart', '{json-roto');
    assert.equal(store.cartCount(), 0);
    memory.set('jhmagno_cart', JSON.stringify({
        1: { id: 1, qty: -3, name: 'No válido' },
        2: { id: 2, qty: 1, name: 'Válido' }
    }));
    assert.equal(store.cartCount(), 1);
});
