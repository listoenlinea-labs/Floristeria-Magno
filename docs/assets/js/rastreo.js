'use strict';

const API_BASE_URL = [
    'localhost',
    '127.0.0.1'
].includes(window.location.hostname)
    ? 'http://localhost:3000/api/floristeria-magno'
    : 'https://api.listoenlinea.host/api/floristeria-magno';

const POLLING_INTERVAL_MS = 30_000;

const seasonButtons =
    document.querySelectorAll('.season-btn');

const seasonClasses = [
    'theme-spring',
    'theme-summer',
    'theme-autumn',
    'theme-winter'
];

seasonButtons.forEach((button) => {
    button.addEventListener('click', () => {
        const season = button.dataset.season;

        document.body.classList.remove(
            ...seasonClasses
        );

        document.body.classList.add(
            `theme-${season}`
        );

        seasonButtons.forEach((item) => {
            item.classList.remove('active');
        });

        button.classList.add('active');
    });
});

/*
 * Animaciones de aparición.
 */
const reveals = document.querySelectorAll('.reveal');

const revealObserver = new IntersectionObserver(
    (entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                revealObserver.unobserve(entry.target);
            }
        });
    },
    {
        threshold: 0.12
    }
);

reveals.forEach((element) => {
    revealObserver.observe(element);
});

/*
 * Elementos del rastreo.
 */
const trackingForm =
    document.getElementById('trackingForm');

const trackingInput =
    document.getElementById('trackingInput');

const trackingButton =
    document.getElementById('trackingButton');

const trackingFeedback =
    document.getElementById('trackingFeedback');

const trackingResult =
    document.getElementById('trackingResult');

const orderTitle =
    document.getElementById('orderTitle');

const orderBadge =
    document.getElementById('orderBadge');

const statusTitle =
    document.getElementById('statusTitle');

const statusText =
    document.getElementById('statusText');

const deliveryTime =
    document.getElementById('deliveryTime');

const orderType =
    document.getElementById('orderType');

const progressFill =
    document.getElementById('progressFill');

const progressSteps =
    document.querySelectorAll('.progress-step');

let pollingIntervalId = null;
let codigoConsultado = null;

function normalizarCodigo(value) {
    return String(value || '')
        .trim()
        .toUpperCase();
}

function codigoValido(codigo) {
    return /^JHM-\d{6}$/.test(codigo);
}

function mostrarFeedback(message, type = 'info') {
    const classes = {
        info: 'alert alert-light',
        success: 'alert alert-success',
        error: 'alert alert-danger'
    };

    trackingFeedback.className =
        classes[type] || classes.info;

    trackingFeedback.textContent = message;
}

function limpiarFeedback() {
    trackingFeedback.className = 'mt-3';
    trackingFeedback.textContent = '';
}

function establecerCargando(loading) {
    trackingButton.disabled = loading;
    trackingInput.disabled = loading;

    const icon = trackingButton.querySelector('i');
    const text = trackingButton.querySelector('span');

    if (loading) {
        icon.className =
            'spinner-border spinner-border-sm';

        text.textContent = 'Consultando...';
        return;
    }

    icon.className = 'bi bi-search-heart';
    text.textContent = 'Rastrear';
}

function formatearFecha(fecha) {
    if (!fecha) {
        return 'Fecha por confirmar';
    }

    /*
     * Agrega una hora neutral para evitar que DATEONLY cambie
     * de día debido a la zona horaria del navegador.
     */
    const date = new Date(`${fecha}T12:00:00`);

    if (Number.isNaN(date.getTime())) {
        return fecha;
    }

    return new Intl.DateTimeFormat('es-MX', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    }).format(date);
}

function construirEntrega(pedido) {
    const fecha = formatearFecha(
        pedido.fechaEntrega
    );

    const ventana =
        pedido.ventanaEntrega || 'Por confirmar';

    if (!pedido.fechaEntrega) {
        return ventana;
    }

    return `${fecha}, ${ventana}`;
}

function renderizarProgreso(paso) {
    const pasoSeguro = Math.max(
        0,
        Math.min(Number(paso) || 0, 4)
    );

    progressFill.style.width =
        `${(pasoSeguro / 4) * 100}%`;

    progressSteps.forEach((step) => {
        const index = Number(step.dataset.step);

        step.classList.toggle(
            'done',
            index < pasoSeguro
        );

        step.classList.toggle(
            'active',
            index === pasoSeguro
        );
    });
}

function renderizarPedido(pedido) {
    orderTitle.textContent =
        pedido.codigoRastreo;

    orderBadge.textContent =
        pedido.etiqueta;

    statusTitle.textContent =
        pedido.titulo;

    statusText.textContent =
        pedido.descripcion;

    deliveryTime.textContent =
        construirEntrega(pedido);

    orderType.textContent =
        pedido.tipoPedido || 'Arreglo floral';

    renderizarProgreso(pedido.paso);

    trackingResult.hidden = false;
    trackingResult.classList.add('visible');
}

function detenerActualizacionAutomatica() {
    if (pollingIntervalId) {
        window.clearInterval(pollingIntervalId);
        pollingIntervalId = null;
    }
}

function iniciarActualizacionAutomatica(codigo) {
    detenerActualizacionAutomatica();

    pollingIntervalId = window.setInterval(() => {
        consultarPedido(codigo, {
            automatico: true
        });
    }, POLLING_INTERVAL_MS);
}

async function consultarPedido(
    codigo,
    options = {}
) {
    const {
        automatico = false
    } = options;

    const codigoNormalizado =
        normalizarCodigo(codigo);

    if (!codigoValido(codigoNormalizado)) {
        detenerActualizacionAutomatica();

        trackingResult.hidden = true;

        mostrarFeedback(
            'Ingresa un código válido con el formato JHM-000001.',
            'error'
        );

        return;
    }

    try {
        if (!automatico) {
            establecerCargando(true);

            mostrarFeedback(
                'Estamos consultando el estado de tu pedido...',
                'info'
            );
        }

        const response = await fetch(
            `${API_BASE_URL}/rastreo/${encodeURIComponent(
                codigoNormalizado
            )}`,
            {
                method: 'GET',
                headers: {
                    Accept: 'application/json'
                },
                cache: 'no-store'
            }
        );

        const result = await response.json();

        if (!response.ok || !result.ok) {
            throw new Error(
                result.message ||
                'No fue posible consultar el pedido.'
            );
        }

        codigoConsultado = codigoNormalizado;
        trackingInput.value = codigoNormalizado;

        renderizarPedido(result.data);

        if (!automatico) {
            mostrarFeedback(
                'Estado actualizado correctamente.',
                'success'
            );

            document
                .getElementById('estado')
                .scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
        } else {
            limpiarFeedback();
        }

        /*
         * Ya no es necesario seguir consultando cuando el
         * pedido terminó o fue cancelado.
         */
        if (
            result.data.estado === 'ENTREGADO' ||
            result.data.estado === 'CANCELADO'
        ) {
            detenerActualizacionAutomatica();
        } else {
            iniciarActualizacionAutomatica(
                codigoNormalizado
            );
        }
    } catch (error) {
        if (!automatico) {
            trackingResult.hidden = true;

            mostrarFeedback(
                error.message,
                'error'
            );
        } else {
            console.error(
                'Error al actualizar el rastreo:',
                error
            );
        }
    } finally {
        if (!automatico) {
            establecerCargando(false);
        }
    }
}

trackingForm.addEventListener(
    'submit',
    (event) => {
        event.preventDefault();

        consultarPedido(
            trackingInput.value
        );
    }
);

trackingInput.addEventListener(
    'input',
    () => {
        trackingInput.value =
            normalizarCodigo(
                trackingInput.value
            );
    }
);

/*
 * Libera el intervalo cuando el usuario abandona la página.
 */
window.addEventListener(
    'beforeunload',
    detenerActualizacionAutomatica
);

/*
 * Si se abre:
 * rastreo.html?pedido=JHM-000001
 * consulta automáticamente ese pedido.
 */
const urlParams = new URLSearchParams(
    window.location.search
);

const codigoDesdeUrl = normalizarCodigo(
    urlParams.get('pedido')
);

if (codigoValido(codigoDesdeUrl)) {
    trackingInput.value = codigoDesdeUrl;
    consultarPedido(codigoDesdeUrl);
}