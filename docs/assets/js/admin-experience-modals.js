/* Diálogos de configuración independientes del resto del CMS. */
(function () {
    const PALETTES = [
        ['base','Original (exactamente como hoy)'], ['rosa','Rosa pastel'],
        ['lavanda','Lavanda pastel'],['menta','Menta pastel'],
        ['durazno','Durazno pastel'],['cielo','Azul cielo pastel'],['vainilla','Vainilla pastel'],
        ['malva','Malva pastel'],['lila','Lila pastel'],['coral','Coral pastel'],['salmon','Salmón pastel'],['amarillo','Amarillo pastel'],['lima','Lima pastel'],['verdeAgua','Verde agua pastel'],['turquesa','Turquesa pastel'],['azulPolvo','Azul polvo pastel'],['arena','Arena pastel'],['grisPerla','Gris perla pastel'],['fresa','Fresa pastel'],['pistacho','Pistacho pastel']
    ];
    // Paleta visual táctil: sólo opciones pastel admitidas por el backend.
    const themeFields = [
        ['fondo','Fondo de la página'],['botones','Botones y acentos'],
        ['petalos','Pétalos de la animación'],['petaloInicial','Pétalos de bienvenida']
    ].map(([key, title]) => {
        const colors = PALETTES.map(([value,label]) => {
            const shades = MAGNO_PALETTE[value];
            return '<button type="button" class="magno-color-option" ' +
                'data-theme-part="' + key + '" data-theme-value="' + value + '" ' +
                'aria-label="' + label + '" aria-pressed="false" title="' + label + '" ' +
                '>' +
                '<span class="magno-color-disc" style="background:linear-gradient(135deg,' +
                shades[0] + ',' + shades[1] + ')"></span><span class="magno-color-label">' +
                (value === 'base' ? 'Original' : label.replace(' pastel','')) +
                '</span><i class="bi bi-check-circle-fill" aria-hidden="true"></i></button>';
        }).join('');
        return '<div class="magno-theme-field">' +
            '<label id="mgThemeLabel_' + key + '">' + title + '</label>' +
            '<input id="mgTheme_' + key + '" type="hidden" value="base">' +
            '<div class="magno-color-grid" role="group" aria-labelledby="mgThemeLabel_' + key + '">' +
            colors + '</div>' +
            '<div class="magno-theme-caption" id="mgThemePreview_' + key + '">Original</div></div>';
    }).join('');
    document.body.insertAdjacentHTML('beforeend', `
        <div class="modal fade magno-modal-shell" id="magnoSeoModal" tabindex="-1" aria-labelledby="mgSeoTitle" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable"><div class="modal-content">
                <div class="modal-header"><h3 class="modal-title fs-4" id="mgSeoTitle">Sección de presentación</h3><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button></div>
                <div class="modal-body">
                    <p class="magno-modal-copy">Decide si la sección de texto aparece debajo del catálogo, tanto en celular como en computadora.</p>
                    <div class="form-check form-switch mb-3"><input type="checkbox" class="form-check-input" id="mgSeoVisible"><label class="form-check-label" for="mgSeoVisible">Mostrar esta sección en la tienda pública</label></div>
                    <div class="mb-3"><label for="mgSeoTitulo">Título principal</label><input class="form-control" id="mgSeoTitulo" maxlength="220"></div>
                    <div class="mb-3"><label for="mgSeoTexto1">Primer párrafo</label><textarea class="form-control" id="mgSeoTexto1" rows="4" maxlength="1600"></textarea></div>
                    <div class="mb-3"><label for="mgSeoTexto2">Segundo párrafo</label><textarea class="form-control" id="mgSeoTexto2" rows="3" maxlength="1600"></textarea></div>
                    <div class="mb-3"><label for="mgSeoVideoUrl">Video de YouTube (opcional)</label><input class="form-control" id="mgSeoVideoUrl" type="url" maxlength="300" placeholder="https://www.youtube.com/watch?v=...">
                    <small class="form-text">El video no se reproducirá automáticamente.</small></div>
                </div>
                <div class="modal-footer"><button type="button" class="btn-soft" data-bs-dismiss="modal">Cancelar</button><button type="button" class="btn-gold" onclick="magnoSaveSeo()">Guardar sección</button></div>
            </div></div>
        </div>
        <div class="modal fade magno-modal-shell" id="magnoThemeModal" tabindex="-1" aria-labelledby="mgThemeTitle" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable"><div class="modal-content">
                <div class="modal-header"><h3 class="modal-title fs-4" id="mgThemeTitle">Tema de la página</h3><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button></div>
                <div class="modal-body"><p class="magno-modal-copy">Combina tonos pastel suaves para cada elemento. La opción original conserva exactamente los colores actuales.</p>
                    <div class="magno-theme-fields">${themeFields}</div>
                </div>
                <div class="modal-footer"><button type="button" class="btn-soft me-auto" onclick="magnoResetTheme()"><i class="bi bi-arrow-counterclockwise"></i> Regresar a configuración base</button><button type="button" class="btn-gold" onclick="magnoSaveTheme()">Guardar tema</button></div>
            </div></div>
        </div>
        <div class="modal fade magno-modal-shell" id="magnoCancellationModal" tabindex="-1" aria-labelledby="mgCancelTitle" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered"><div class="modal-content">
                <div class="modal-header"><h3 class="modal-title fs-4" id="mgCancelTitle">Política de cancelaciones</h3><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button></div>
                <div class="modal-body">
                    <p class="magno-modal-copy">Indica qué porcentaje del monto total se devuelve al comprador cuando se acepta una cancelación. Se mostrará en el pago y en el correo de confirmación.</p>
                    <label for="mgCancellationPercent">Porcentaje devuelto al cliente (%)</label>
                    <input id="mgCancellationPercent" type="number" class="form-control" min="1" max="99" step="1" placeholder="Por definir">
                    <p class="magno-modal-copy mt-3 mb-0">Si el arreglo presenta un problema atribuible a la floristería, se ofrece revisión y reemplazo. Esto no se considera una cancelación.</p>
                </div>
                <div class="modal-footer"><button type="button" class="btn-soft" data-bs-dismiss="modal">Cancelar</button><button type="button" class="btn-gold" onclick="magnoSaveCancellation()">Guardar porcentaje</button></div>
            </div></div>
        </div>
        <div class="modal fade magno-modal-shell" id="magnoMoveModal" tabindex="-1" aria-labelledby="magnoMoveTitle" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered"><div class="modal-content">
                <div class="modal-header"><h3 class="modal-title fs-4" id="magnoMoveTitle">Mover producto a otra página</h3><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button></div>
                <div class="modal-body"><label for="magnoMovePageSelect">Página de destino</label>
                    <select id="magnoMovePageSelect" class="form-select"></select>
                    <p class="magno-modal-copy mt-3">El producto aparecerá al inicio de la página elegida del catálogo.</p>
                </div>
                <div class="modal-footer"><button type="button" class="btn-soft" data-bs-dismiss="modal">Cancelar</button><button type="button" class="btn-gold" id="magnoMoveConfirm">Mover</button></div>
            </div></div>
        </div>
    `);

    document.body.addEventListener('click', event => {
        const option = event.target.closest('.magno-color-option');
        if (!option) return;
        magnoChooseThemeColor(option.dataset.themePart, option.dataset.themeValue);
    });

    window.magnoChoosePage = function(id) {
        const totalPages=Math.ceil(products.length/MAGNO_PAGE_SIZE);
        const select=document.getElementById('magnoMovePageSelect');
        select.innerHTML=Array.from({length:totalPages},(_,index)=>
            '<option value="'+(index+1)+'">Página '+(index+1)+'</option>').join('');
        const existing=magnoSortedProducts().findIndex(product=>product.id===String(id));
        select.value=String(Math.floor(existing/MAGNO_PAGE_SIZE)+1);
        document.getElementById('magnoMoveConfirm').onclick=async()=>{
            bootstrap.Modal.getOrCreateInstance(document.getElementById('magnoMoveModal')).hide();
            await magnoMoveToPage(id,Number(select.value));
        };
        bootstrap.Modal.getOrCreateInstance(document.getElementById('magnoMoveModal')).show();
    };
})();
