/* Mejoras de UX para el CMS: paginación, orden y configuración sin reemplazar sus módulos originales. */
const MAGNO_PAGE_SIZE = 5;
let magnoDragId = null;
let magnoReorderBusy = false;

function magnoSortedProducts() {
    return [...products].sort((a, b) =>
        (Number(a.sortOrder) - Number(b.sortOrder)) || (Number(a.id) - Number(b.id)));
}

function resetProductPagination() {
    productPage = 1;
    renderProducts();
}

function goToProductPage(page) {
    productPage = page;
    renderProducts();
    document.getElementById('productsTable')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function renderProductPagination(filtered) {
    const pager = document.getElementById('productsPagination');
    if (!pager) return;
    const totalPages = Math.ceil(filtered.length / MAGNO_PAGE_SIZE);
    if (totalPages <= 1) { pager.innerHTML = ''; return; }
    const buttons = Array.from({length: totalPages}, (_, index) => {
        const n = index + 1;
        return '<button type="button" aria-label="Página ' + n +
            ', suelta aquí un producto para moverlo" aria-current="' +
            (n === productPage ? 'page' : 'false') + '" onclick="goToProductPage(' + n +
            ')" ondragover="event.preventDefault();this.classList.add(\'mg-drop-hover\')" ' +
            'ondragleave="this.classList.remove(\'mg-drop-hover\')" ' +
            'ondrop="magnoDropOnPage(event,' + n + ')">' + n + '</button>';
    }).join('');
    pager.innerHTML = '<p class="magno-page-caption">Página ' + productPage + ' de ' + totalPages +
        ' · ' + filtered.length + ' productos · Arrastra a un número de página para mover el arreglo</p>' +
        '<button type="button" ' + (productPage === 1 ? 'disabled ' : '') +
        'onclick="goToProductPage(' + (productPage - 1) + ')">Anterior</button>' +
        buttons +
        '<button type="button" ' + (productPage === totalPages ? 'disabled ' : '') +
        'onclick="goToProductPage(' + (productPage + 1) + ')">Siguiente</button>';
}

function magnoStartDrag(event, id) {
    if (magnoReorderBusy) { event.preventDefault(); return; }
    magnoDragId = String(id);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(id));
    event.currentTarget.classList.add('is-dragging');
}
function magnoDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    event.currentTarget.classList.add('is-drag-over');
}
function magnoEndDrag() {
    magnoDragId = null;
    document.querySelectorAll('.is-dragging,.is-drag-over,.mg-drop-hover').forEach(
        element => element.classList.remove('is-dragging','is-drag-over','mg-drop-hover'));
}
async function magnoDropOnCard(event, targetId) {
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const after = event.clientY >= rect.top + rect.height / 2;
    const id = magnoDragId || event.dataTransfer.getData('text/plain');
    magnoEndDrag();
    if (!id || String(id) === String(targetId)) return;
    const ids = magnoSortedProducts().map(item => item.id);
    const origin = ids.indexOf(String(id));
    if (origin < 0) return;
    ids.splice(origin, 1);
    const index = ids.indexOf(String(targetId));
    ids.splice(index + (after ? 1 : 0), 0, String(id));
    await magnoPersistOrder(ids);
}
async function magnoDropOnPage(event, page) {
    event.preventDefault();
    event.stopPropagation();
    const id = magnoDragId || event.dataTransfer.getData('text/plain');
    magnoEndDrag();
    if (!id) return;
    const ids = magnoSortedProducts().map(item => item.id);
    const origin = ids.indexOf(String(id));
    if (origin < 0) return;
    const sourcePage = Math.floor(origin / MAGNO_PAGE_SIZE) + 1;
    ids.splice(origin, 1);
    const destination = sourcePage > page
        ? Math.min(page * MAGNO_PAGE_SIZE - 1, ids.length)
        : Math.min((page - 1) * MAGNO_PAGE_SIZE, ids.length);
    ids.splice(destination, 0, String(id));
    productPage = page;
    await magnoPersistOrder(ids);
}
async function magnoMoveProduct(id, movement) {
    const ids = magnoSortedProducts().map(item => item.id);
    const current = ids.indexOf(String(id));
    const next = current + movement;
    if (current < 0 || next < 0 || next >= ids.length) return;
    [ids[current],ids[next]] = [ids[next],ids[current]];
    productPage = Math.floor(next / MAGNO_PAGE_SIZE) + 1;
    await magnoPersistOrder(ids);
}
async function magnoMoveToPage(id, page) {
    if (!Number.isInteger(page) || page < 1) return;
    const ids = magnoSortedProducts().map(item => item.id);
    const current = ids.indexOf(String(id));
    if (current < 0) return;
    ids.splice(current,1);
    ids.splice(Math.min((page - 1) * MAGNO_PAGE_SIZE, ids.length),0,String(id));
    productPage = page;
    await magnoPersistOrder(ids);
}
async function magnoPersistOrder(ids) {
    if (magnoReorderBusy) return;
    magnoReorderBusy = true;
    const previous = products.map(item => [item.id, item.sortOrder]);
    try {
        const requested = ids.map(Number);
        if (requested.some(id => !Number.isSafeInteger(id))) throw new Error('Identificador inválido.');
        ids.forEach((id, index) => { products.find(item => item.id === String(id)).sortOrder = index + 1; });
        renderProducts();
        await apiFetch('/productos/admin/orden', {
            method: 'PUT', body: JSON.stringify({ ids: requested })
        });
    } catch (error) {
        previous.forEach(([id, order]) => { const item = products.find(product => product.id === id); if(item) item.sortOrder = order; });
        renderProducts();
        alert(error.message || 'No se pudo guardar el nuevo orden.');
    } finally {
        magnoReorderBusy = false;
    }
}

// Las opciones están guardadas en backend; la base conserva todos los colores originales.
const MAGNO_PALETTE = {
    base: ['#fff','#ffe8e8'],
    rosa: ['#fff1f5','#e9b3c4'],
    lavanda: ['#f6efff','#c9b7e7'],
    menta: ['#ecfaf2','#a8d9c7'],
    durazno: ['#fff1e9','#efc0a8'],
    cielo: ['#eaf7ff','#abd3ea'],
    vainilla: ['#fff9e9','#e8d7a7'],
    malva: ['#fcf3ff','#dfc6eb'],
    lila: ['#f3f0ff','#cbc3ef'],
    coral: ['#fff0f0','#f1c0bb'],
    salmon: ['#fff4ec','#f3c7b6'],
    amarillo: ['#fffce6','#f5e69e'],
    lima: ['#f7ffe9','#d9eab3'],
    verdeAgua: ['#f0fff8','#bde5d7'],
    turquesa: ['#edffff','#b6e1df'],
    azulPolvo: ['#eff4ff','#c1d1ed'],
    arena: ['#fcf7ef','#e5d2bc'],
    grisPerla: ['#f8f7fa','#ddd8e4'],
    fresa: ['#fff1f6','#efbdd0'],
    pistacho: ['#f8fbed','#d8e0b8']
};
const MAGNO_THEME_FIELDS = {
    fondo: 'Fondo de la página', botones: 'Botones y acentos',
    petalos: 'Pétalos flotantes', petaloInicial: 'Pétalos de bienvenida'
};
function magnoOptions() { return settings.optionsTienda || null; }
function magnoOpenSeoSettings() {
    const values = magnoOptions(); if (!values) return;
    document.getElementById('mgSeoVisible').checked = values.seoVisible;
    for (const key of ['seoTitulo','seoTexto1','seoTexto2','seoVideoUrl']) {
        document.getElementById('mg' + key[0].toUpperCase() + key.slice(1)).value = values[key] || '';
    }
    bootstrap.Modal.getOrCreateInstance(document.getElementById('magnoSeoModal')).show();
}
function magnoOpenThemeSettings() {
    const values = magnoOptions(); if (!values) return;
    Object.keys(MAGNO_THEME_FIELDS).forEach(key => {
        const el = document.getElementById('mgTheme_' + key);
        el.value = values.tema?.[key] || 'base';
        magnoThemeSwatch(key);
    });
    bootstrap.Modal.getOrCreateInstance(document.getElementById('magnoThemeModal')).show();
}
function magnoChooseThemeColor(key, value) {
    if (!(key in MAGNO_THEME_FIELDS) || !(value in MAGNO_PALETTE)) return;
    document.getElementById('mgTheme_' + key).value = value;
    magnoThemeSwatch(key);
}
function magnoThemeSwatch(key) {
    const value = document.getElementById('mgTheme_' + key)?.value || 'base';
    document.querySelectorAll('[data-theme-part="' + key + '"]').forEach(button => {
        const selected = button.dataset.themeValue === value;
        button.classList.toggle('is-selected', selected);
        button.setAttribute('aria-pressed', String(selected));
    });
    const labels = {
        base: 'Original · colores actuales', rosa: 'Rosa pastel',
        lavanda: 'Lavanda pastel', menta: 'Menta pastel',
        durazno: 'Durazno pastel', cielo: 'Azul cielo pastel', vainilla: 'Vainilla pastel',
        malva: 'Malva pastel', lila: 'Lila pastel', coral: 'Coral pastel', salmon: 'Salmón pastel', amarillo: 'Amarillo pastel', lima: 'Lima pastel', verdeAgua: 'Verde agua pastel', turquesa: 'Turquesa pastel', azulPolvo: 'Azul polvo pastel', arena: 'Arena pastel', grisPerla: 'Gris perla pastel', fresa: 'Fresa pastel', pistacho: 'Pistacho pastel'
    };
    const caption = document.getElementById('mgThemePreview_' + key);
    if (caption) caption.textContent = labels[value] || labels.base;
}
function magnoResetTheme() {
    Object.keys(MAGNO_THEME_FIELDS).forEach(key => {
        document.getElementById('mgTheme_' + key).value='base';
        magnoThemeSwatch(key);
    });
    // El botón de restablecer guarda la paleta original inmediatamente.
    return magnoSaveTheme();
}
function magnoOpenCancellationSettings() {
    const value = magnoOptions()?.cancelacionPorcentaje;
    document.getElementById('mgCancellationPercent').value = value ?? '';
    bootstrap.Modal.getOrCreateInstance(document.getElementById('magnoCancellationModal')).show();
}
async function magnoSaveOptions(next, modalId) {
    try {
        const result = await apiFetch('/configuracion/opciones', {
            method:'PUT',body:JSON.stringify(next)
        });
        settings.optionsTienda = result.data;
        bootstrap.Modal.getOrCreateInstance(document.getElementById(modalId)).hide();
        magnoUpdateSummary();
    } catch (error) { alert(error.message || 'No fue posible guardar la configuración.'); }
}
function magnoSaveSeo() {
    const next = {...magnoOptions()};
    next.seoVisible = document.getElementById('mgSeoVisible').checked;
    for (const key of ['seoTitulo','seoTexto1','seoTexto2','seoVideoUrl']) {
        next[key] = document.getElementById('mg' + key[0].toUpperCase() + key.slice(1)).value.trim();
    }
    return magnoSaveOptions(next, 'magnoSeoModal');
}
function magnoSaveTheme() {
    const next = {...magnoOptions(),tema:{}};
    Object.keys(MAGNO_THEME_FIELDS).forEach(key => {
        next.tema[key] = document.getElementById('mgTheme_' + key).value;
    });
    return magnoSaveOptions(next, 'magnoThemeModal');
}
function magnoSaveCancellation() {
    const input = document.getElementById('mgCancellationPercent').value.trim();
    const percent = input === '' ? null : Number(input);
    if (percent !== null && (!Number.isInteger(percent) || percent < 1 || percent > 99)) {
        alert('Indica un porcentaje entero entre 1 y 99.');return;
    }
    return magnoSaveOptions({...magnoOptions(),cancelacionPorcentaje:percent},'magnoCancellationModal');
}
function magnoUpdateSummary() {
    const options = magnoOptions(); if(!options) return;
    const seo = document.getElementById('mgSeoSummary');
    if(seo) seo.textContent=options.seoVisible ? 'Visible al público' : 'Sección oculta';
    const refund = document.getElementById('mgCancellationSummary');
    if(refund) refund.textContent=options.cancelacionPorcentaje == null
        ? 'Porcentaje pendiente de definir' : options.cancelacionPorcentaje + '% de reembolso por cancelación';
}

// Optimización previa a la subida: WebP moderado y redimensionado sin perder relación de aspecto.
async function magnoOptimizeImage(file) {
    if (!file || !['image/jpeg','image/png','image/webp'].includes(file.type) ||
        typeof createImageBitmap !== 'function') return file;
    try {
        const bitmap = await createImageBitmap(file);
        const scale = Math.min(1, 1600 / Math.max(bitmap.width,bitmap.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1,Math.round(bitmap.width*scale));
        canvas.height = Math.max(1,Math.round(bitmap.height*scale));
        const context=canvas.getContext('2d');
        context.drawImage(bitmap,0,0,canvas.width,canvas.height);
        bitmap.close();
        const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',.81));
        if(!blob || blob.size>=file.size) return file;
        return new File([blob],(file.name||'flor').replace(/\.[^.]+$/,'')+'.webp',
            {type:'image/webp',lastModified:Date.now()});
    } catch (error) {
        console.warn('La optimización no está disponible; se usará la imagen original.',error);
        return file;
    }
}
