'use strict';

const API_BASE_URL = [
    'localhost',
    '127.0.0.1'
].includes(window.location.hostname)
    ? 'http://localhost:3000/api/floristeria-magno'
    : 'https://api.listoenlinea.host/api/floristeria-magno';

const SOCKET_BASE_URL = [
    'localhost',
    '127.0.0.1'
].includes(window.location.hostname)
    ? 'http://localhost:3000'
    : 'https://api.listoenlinea.host';

/*
 * Sustituye este valor por tu token público de Mapbox.
 */
const MAPBOX_PUBLIC_TOKEN =
    'pk.eyJ1IjoibGlzdG9lbmxpbmVhIiwiYSI6ImNtcnd5OGR6ZzAzbHgzOXB0N210ano5cmIifQ.jTwf1oLqxZfMIhskJMpung';

const GUADALAJARA_CENTER = {
    longitude: -103.3496,
    latitude: 20.6597
};

const MEXICO_TIME_ZONE =
    'America/Mexico_City';

let liveMap = null;
let deliveryMarker = null;
let accuracySourceCreated = false;
let trackingSocket = null;
let currentTrackingCode = null;
let currentOrderStatus = null;
let locationPollingId = null;

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

const liveMapSection =
    document.getElementById(
        'mapa-tiempo-real'
    );

const liveTrackingBadgeText =
    document.getElementById(
        'liveTrackingBadgeText'
    );

const liveMapDescription =
    document.getElementById(
        'liveMapDescription'
    );

const mapDeliveryStatus =
    document.getElementById(
        'mapDeliveryStatus'
    );

const lastLocationTime =
    document.getElementById(
        'lastLocationTime'
    );

const locationAccuracy =
    document.getElementById(
        'locationAccuracy'
    );

const mapWaitingState =
    document.getElementById(
        'mapWaitingState'
    );

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

function formatearFechaHoraMexico(value) {
    if (!value) {
        return 'Sin información';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return 'Sin información';
    }

    return new Intl.DateTimeFormat(
        'es-MX',
        {
            timeZone: MEXICO_TIME_ZONE,
            dateStyle: 'medium',
            timeStyle: 'short',
            hour12: true
        }
    ).format(date);
}

function validarMapboxToken() {
    return (
        MAPBOX_PUBLIC_TOKEN &&
        MAPBOX_PUBLIC_TOKEN.startsWith('pk.') &&
        !MAPBOX_PUBLIC_TOKEN.includes(
            'PEGA_AQUI'
        )
    );
}

function crearMarcadorFloral() {
    const element =
        document.createElement('div');

    element.className =
        'floral-delivery-marker';

    element.innerHTML = `
        <div class="floral-marker-pulse"></div>

        <div class="floral-marker-pin">
            <i class="bi bi-flower1"></i>
        </div>

        <div class="floral-marker-label">
            Tu pedido
        </div>
    `;

    return element;
}

function inicializarMapa() {
    if (liveMap) {
        return true;
    }

    if (
        typeof mapboxgl === 'undefined'
    ) {
        console.error(
            'Mapbox GL JS no está cargado.'
        );

        return false;
    }

    if (!validarMapboxToken()) {
        console.error(
            'Debes configurar MAPBOX_PUBLIC_TOKEN.'
        );

        if (mapWaitingState) {
            mapWaitingState.hidden = false;

            mapWaitingState.querySelector('h3')
                .textContent =
                'Mapa pendiente de configuración';

            mapWaitingState.querySelector('p')
                .textContent =
                'Falta configurar el token público de Mapbox.';
        }

        return false;
    }

    mapboxgl.accessToken =
        MAPBOX_PUBLIC_TOKEN;

    liveMap = new mapboxgl.Map({
        container: 'liveOrderMap',

        /*
         * Estilo sobrio y limpio.
         */
        style: 'mapbox://styles/mapbox/standard',

        center: [
            GUADALAJARA_CENTER.longitude,
            GUADALAJARA_CENTER.latitude
        ],

        zoom: 11.5,

        pitch: 42,

        bearing: -8,

        attributionControl: false,

        cooperativeGestures: true
    });

    liveMap.addControl(
        new mapboxgl.NavigationControl({
            showCompass: false
        }),
        'bottom-right'
    );

    liveMap.addControl(
        new mapboxgl.AttributionControl({
            compact: true
        }),
        'bottom-left'
    );

    liveMap.on('load', () => {
        /*
         * El estilo Standard de Mapbox puede configurarse
         * para reducir elementos visuales.
         */
        try {
            liveMap.setConfigProperty(
                'basemap',
                'lightPreset',
                'day'
            );

            liveMap.setConfigProperty(
                'basemap',
                'showPointOfInterestLabels',
                false
            );

            liveMap.setConfigProperty(
                'basemap',
                'showTransitLabels',
                false
            );

            liveMap.setConfigProperty(
                'basemap',
                'showRoadLabels',
                true
            );
        } catch (error) {
            console.warn(
                'No fue posible configurar el estilo del mapa:',
                error
            );
        }

        liveMap.resize();
    });

    return true;
}

function crearGeoJsonPrecision(
    longitude,
    latitude,
    radiusMeters
) {
    const points = 64;

    const coordinates = [];

    const earthRadius =
        6378137;

    const latitudeRadians =
        latitude * Math.PI / 180;

    for (
        let index = 0;
        index <= points;
        index += 1
    ) {
        const angle =
            index / points *
            Math.PI *
            2;

        const deltaLatitude =
            radiusMeters /
            earthRadius *
            Math.sin(angle);

        const deltaLongitude =
            radiusMeters /
            (
                earthRadius *
                Math.cos(latitudeRadians)
            ) *
            Math.cos(angle);

        coordinates.push([
            longitude +
            deltaLongitude *
            180 /
            Math.PI,

            latitude +
            deltaLatitude *
            180 /
            Math.PI
        ]);
    }

    return {
        type: 'Feature',
        properties: {},
        geometry: {
            type: 'Polygon',
            coordinates: [
                coordinates
            ]
        }
    };
}

function actualizarCirculoPrecision(
    longitude,
    latitude,
    precisionMeters
) {
    if (
        !liveMap ||
        !liveMap.loaded()
    ) {
        return;
    }

    const precision =
        Number(precisionMeters);

    if (
        !Number.isFinite(precision) ||
        precision <= 0
    ) {
        return;
    }

    const data =
        crearGeoJsonPrecision(
            longitude,
            latitude,
            Math.min(precision, 250)
        );

    const existingSource =
        liveMap.getSource(
            'delivery-accuracy'
        );

    if (existingSource) {
        existingSource.setData(data);
        return;
    }

    liveMap.addSource(
        'delivery-accuracy',
        {
            type: 'geojson',
            data
        }
    );

    liveMap.addLayer({
        id: 'delivery-accuracy-fill',
        type: 'fill',
        source: 'delivery-accuracy',
        paint: {
            'fill-color': '#d98ca4',
            'fill-opacity': 0.15
        }
    });

    liveMap.addLayer({
        id: 'delivery-accuracy-line',
        type: 'line',
        source: 'delivery-accuracy',
        paint: {
            'line-color': '#c56f8a',
            'line-width': 1.5,
            'line-opacity': 0.5
        }
    });

    accuracySourceCreated = true;
}

function actualizarMapaConUbicacion(
    ubicacion,
    options = {}
) {
    if (!ubicacion) {
        return;
    }

    const latitude =
        Number(ubicacion.latitud);

    const longitude =
        Number(ubicacion.longitud);

    if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude)
    ) {
        return;
    }

    if (!inicializarMapa()) {
        return;
    }

    const aplicarUbicacion = () => {
        if (!deliveryMarker) {
            deliveryMarker =
                new mapboxgl.Marker({
                    element:
                        crearMarcadorFloral(),

                    anchor: 'bottom'
                })
                    .setLngLat([
                        longitude,
                        latitude
                    ])
                    .addTo(liveMap);
        } else {
            deliveryMarker.setLngLat([
                longitude,
                latitude
            ]);
        }

        actualizarCirculoPrecision(
            longitude,
            latitude,
            ubicacion.precisionMetros
        );

        liveMap.easeTo({
            center: [
                longitude,
                latitude
            ],

            zoom:
                options.firstLocation
                    ? 14.8
                    : Math.max(
                        liveMap.getZoom(),
                        14
                    ),

            pitch: 48,

            duration:
                options.firstLocation
                    ? 1400
                    : 900,

            essential: true
        });

        if (mapWaitingState) {
            mapWaitingState.hidden = true;
        }

        if (liveTrackingBadgeText) {
            liveTrackingBadgeText.textContent =
                'Ubicación en vivo';
        }

        if (mapDeliveryStatus) {
            mapDeliveryStatus.textContent =
                'En camino';
        }

        if (lastLocationTime) {
            lastLocationTime.textContent =
                formatearFechaHoraMexico(
                    ubicacion.actualizadoEn ||
                    ubicacion.registradoEn
                );
        }

        if (locationAccuracy) {
            const precision =
                Number(
                    ubicacion.precisionMetros
                );

            locationAccuracy.textContent =
                Number.isFinite(precision)
                    ? `Precisión aproximada ±${Math.round(
                        precision
                    )} m`
                    : 'Precisión no disponible';
        }
    };

    if (liveMap.loaded()) {
        aplicarUbicacion();
    } else {
        liveMap.once(
            'load',
            aplicarUbicacion
        );
    }
}

function mostrarSeccionMapa() {
    if (
        !liveMapSection ||
        currentOrderStatus !==
        'EN_CAMINO'
    ) {
        return;
    }

    liveMapSection.hidden = false;

    requestAnimationFrame(() => {
        liveMapSection.classList.add(
            'is-visible'
        );

        if (liveMap) {
            liveMap.resize();
        }
    });
}

function ocultarSeccionMapa() {
    if (!liveMapSection) {
        return;
    }

    liveMapSection.hidden = true;
    liveMapSection.classList.remove(
        'is-visible'
    );
}

async function consultarUbicacionActual(
    codigoRastreo,
    options = {}
) {
    try {
        const response = await fetch(
            `${API_BASE_URL}/rastreo-ubicacion/publico/${encodeURIComponent(
                codigoRastreo
            )}`,
            {
                method: 'GET',
                headers: {
                    Accept: 'application/json'
                },
                cache: 'no-store'
            }
        );

        const result =
            await response.json();

        if (!response.ok || !result.ok) {
            throw new Error(
                result.message ||
                'No fue posible consultar la ubicación.'
            );
        }

        const trackingData =
            result.data;

        const estado =
            String(
                trackingData.estado || ''
            )
                .trim()
                .toUpperCase();

        const shouldShowMap =
            estado === 'EN_CAMINO';

        if (!shouldShowMap) {
            ocultarSeccionMapa();
            detenerPollingUbicacion();
            desconectarSocketRastreo();
            return;
        }

        mostrarSeccionMapa();
        inicializarMapa();

        if (trackingData.ubicacion) {
            actualizarMapaConUbicacion(
                trackingData.ubicacion,
                {
                    firstLocation:
                        options.firstLocation ===
                        true
                }
            );
        } else {
            if (mapWaitingState) {
                mapWaitingState.hidden = false;
            }

            if (liveTrackingBadgeText) {
                liveTrackingBadgeText.textContent =
                    'Esperando señal GPS';
            }
        }
    } catch (error) {
        console.error(
            'Error consultando ubicación:',
            error
        );
    }
}

function detenerPollingUbicacion() {
    if (locationPollingId) {
        window.clearInterval(
            locationPollingId
        );

        locationPollingId = null;
    }
}

function iniciarPollingUbicacion(
    codigoRastreo
) {
    detenerPollingUbicacion();

    locationPollingId =
        window.setInterval(() => {
            consultarUbicacionActual(
                codigoRastreo
            );
        }, 15000);
}

function desconectarSocketRastreo() {
    if (trackingSocket) {
        if (currentTrackingCode) {
            trackingSocket.emit(
                'rastreo:salir',
                {
                    codigoRastreo:
                        currentTrackingCode
                }
            );
        }

        trackingSocket.disconnect();
        trackingSocket = null;
    }

    currentTrackingCode = null;
}

function conectarSocketRastreo(
    codigoRastreo
) {
    desconectarSocketRastreo();

    if (typeof io === 'undefined') {
        console.warn(
            'Socket.IO Client no está cargado.'
        );

        iniciarPollingUbicacion(
            codigoRastreo
        );

        return;
    }

    currentTrackingCode =
        codigoRastreo;

    trackingSocket = io(
        SOCKET_BASE_URL,
        {
            transports: [
                'websocket',
                'polling'
            ]
        }
    );

    trackingSocket.on(
        'connect',
        () => {
            trackingSocket.emit(
                'rastreo:unirse',
                {
                    codigoRastreo
                }
            );
        }
    );

    trackingSocket.on(
        'rastreo:ubicacion',
        (payload) => {
            if (
                payload.codigoRastreo !==
                codigoRastreo
            ) {
                return;
            }

            if (
                currentOrderStatus !==
                'EN_CAMINO'
            ) {
                return;
            }

            mostrarSeccionMapa();

            actualizarMapaConUbicacion(
                payload
            );
        }
    );

    trackingSocket.on(
        'rastreo:finalizado',
        (payload) => {
            if (
                payload.codigoRastreo !==
                codigoRastreo
            ) {
                return;
            }

            ocultarSeccionMapa();
            detenerPollingUbicacion();
            desconectarSocketRastreo();
        }
    );

    trackingSocket.on(
        'connect_error',
        (error) => {
            console.warn(
                'Socket.IO no pudo conectarse. Se usará consulta periódica:',
                error.message
            );

            iniciarPollingUbicacion(
                codigoRastreo
            );
        }
    );
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

    const estadoPedido =
        String(
            pedido.estado || ''
        )
            .trim()
            .toUpperCase();
    currentOrderStatus =
        estadoPedido;

    if (estadoPedido !== 'EN_CAMINO') {
        ocultarSeccionMapa();
        desconectarSocketRastreo();
        detenerPollingUbicacion();
    } else {
        mostrarSeccionMapa();

        consultarUbicacionActual(
            pedido.codigoRastreo,
            {
                firstLocation: true
            }
        );

        conectarSocketRastreo(
            pedido.codigoRastreo
        );

        iniciarPollingUbicacion(
            pedido.codigoRastreo
        );
    }

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
    () => {
        detenerActualizacionAutomatica();
        detenerPollingUbicacion();
        desconectarSocketRastreo();
    }
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