/* Mis pedidos en este navegador: consulta estados reales y muestra solo los no concluidos. */
(function (global) {
    'use strict';
    const api = ['localhost','127.0.0.1'].includes(location.hostname)
        ? 'http://localhost:3000/api/floristeria-magno'
        : 'https://api.listoenlinea.host/api/floristeria-magno';
    let busy = false;
    function text(el, value) { if (el) el.textContent = String(value ?? ''); }
    function render() {
        const store = global.MagnoStore;
        const host = document.getElementById('magnoRememberedOrders');
        const list = document.getElementById('magnoRememberedOrdersList');
        if (!store || !host || !list) return;
        const active = store.readOrders().filter(store.isActiveOrder);
        host.hidden = active.length === 0;
        list.replaceChildren();
        for (const order of active) {
            const link = document.createElement('a');
            link.href = 'rastreo.html?pedido=' + encodeURIComponent(order.code);
            link.className = 'magno-remembered-order';
            const code = document.createElement('strong');
            text(code, order.code);
            const state = document.createElement('span');
            state.className = 'magno-remembered-state';
            text(state, order.state === 'PENDIENTE' ? 'Pedido pendiente de confirmación'
                : order.state === 'RECIBIDO' ? 'Pedido recibido'
                : order.state === 'EN_DISENO' ? 'En preparación'
                : order.state === 'LISTO_ENTREGA' ? 'Listo para entrega'
                : order.state === 'EN_CAMINO' ? 'En camino'
                : 'Consultar estado');
            const arrow = document.createElement('i');
            arrow.className = 'bi bi-chevron-right';
            arrow.setAttribute('aria-hidden','true');
            link.append(code, state, arrow);
            list.appendChild(link);
        }
    }
    async function refresh() {
        const store = global.MagnoStore;
        if (busy || !store) return;
        const orders = store.readOrders().filter(store.isActiveOrder);
        if (!orders.length) { render(); return; }
        busy = true;
        const button = document.getElementById('magnoRefreshRememberedOrders');
        if (button) button.disabled = true;
        try {
            for (let i = 0; i < orders.length; i += 3) {
                await Promise.all(orders.slice(i, i + 3).map(async order => {
                    try {
                        const response = await fetch(
                            api + '/rastreo/' + encodeURIComponent(order.code),
                            { headers: { Accept: 'application/json' }, cache: 'no-store' });
                        if (!response.ok) return;
                        const result = await response.json();
                        if (result.ok && result.data?.codigoRastreo === order.code) {
                            store.setOrderState(order.code, result.data.estado);
                        }
                    } catch (_) { /* Sin red no se borran pedidos recordados. */ }
                }));
            }
        } finally {
            busy = false;
            if (button) button.disabled = false;
            render();
        }
    }
    function start() {
        if (!document.getElementById('magnoRememberedOrders')) return;
        render();
        refresh();
        document.getElementById('magnoRefreshRememberedOrders')
            ?.addEventListener('click', refresh);
        document.addEventListener('magno:orders-changed', render);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();
})(window);
