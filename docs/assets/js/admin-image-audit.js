/* Diagnóstico de fotos del catálogo. Todas las consultas requieren credenciales admin. */
(function () {
    'use strict';
    const modalHtml = `
    <div class="modal fade magno-modal-shell" id="magnoImageAuditModal" tabindex="-1"
        aria-labelledby="magnoAuditTitle" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
        <div class="modal-content">
          <div class="modal-header">
            <h3 class="modal-title fs-4" id="magnoAuditTitle">Protección de fotografías</h3>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
          </div>
          <div class="modal-body">
            <p class="small-muted">Revisamos las fotografías vinculadas a productos y galería, no solo el número de archivos guardados.</p>
            <div id="magnoImageAuditResult" class="magno-image-audit-result" role="status">Consultando...</div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn-soft" id="magnoImageRepairButton" hidden>Reparar desde respaldo</button>
            <button type="button" class="btn-gold" data-bs-dismiss="modal">Cerrar</button>
          </div>
        </div>
      </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const result = document.getElementById('magnoImageAuditResult');
    const repair = document.getElementById('magnoImageRepairButton');
    function show(report) {
        result.replaceChildren();
        const headline = document.createElement('p');
        headline.className = 'magno-image-audit-headline';
        headline.textContent = report.protected
            ? 'Las imágenes locales referenciadas tienen copias verificadas.'
            : 'Detectamos imágenes que necesitan atención.';
        const grid = document.createElement('div');
        grid.className = 'magno-audit-kpis';
        const items = [
            ['Fotos locales', report.internalUniqueFiles],
            ['Verificadas', report.verified],
            ['Sin respaldo seguro', report.unprotected],
            ['No recuperables', report.missing],
            ['Diferencias de integridad', report.checksumMismatch],
            ['Referencias externas', report.externalReferences]
        ];
        for (const [name, count] of items) {
            const block = document.createElement('div');
            const label = document.createElement('small');
            label.textContent = name;
            const value = document.createElement('strong');
            value.textContent = String(count);
            block.append(label, value);
            grid.appendChild(block);
        }
        result.append(headline, grid);
        if (report.problems?.length) {
            const problemTitle = document.createElement('h4');
            problemTitle.textContent = 'Archivos que requieren revisión';
            const list = document.createElement('ul');
            for (const problem of report.problems) {
                const row = document.createElement('li');
                row.textContent = problem.file + ' · ' + problem.issue;
                list.appendChild(row);
            }
            result.append(problemTitle, list);
        }
        const note = document.createElement('p');
        note.className = 'small-muted mt-3';
        note.textContent = 'Estas copias están en el hosting. Un respaldo externo independiente sigue siendo imprescindible para protegerse de la pérdida total del servidor.';
        result.appendChild(note);
        repair.hidden = !report.problems?.length;
        repair.disabled = false;
    }
    async function audit(repairMode) {
        repair.disabled = true;
        result.textContent = repairMode ? 'Restaurando desde copias verificadas...' : 'Comprobando integridad de archivos...';
        try {
            const response = await apiFetch(
                repairMode ? '/uploads/integridad/reparar' : '/uploads/integridad',
                repairMode ? { method: 'POST', body: JSON.stringify({}) } : {}
            );
            show(response.data);
        } catch (error) {
            result.textContent = 'No fue posible comprobar las fotos: ' + error.message;
            repair.hidden = true;
        }
    }
    window.magnoImageAudit = function () {
        bootstrap.Modal.getOrCreateInstance(
            document.getElementById('magnoImageAuditModal')).show();
        audit(false);
    };
    repair.addEventListener('click', () => {
        if (!confirm('¿Intentar restaurar las imágenes usando las copias con integridad verificada? Los archivos sin respaldo no se pueden recuperar.')) return;
        audit(true);
    });
})();
