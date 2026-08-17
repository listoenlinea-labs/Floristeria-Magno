const WHATSAPP_CART_KEY =
    'jhmagno_cart';

const WHATSAPP_VISITOR_KEY =
    'jhmagno_visitor_id';


const WHATSAPP_BACKEND_URL =
    window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1'

        ? 'http://localhost:3000'

        : 'https://api.listoenlinea.host';


const WHATSAPP_LEAD_URL =
    `${WHATSAPP_BACKEND_URL}/api/floristeria-magno/whatsapp/leads`;


let whatsappRequestRunning =
    false;


/*
 * Identificador anónimo del navegador.
 *
 * No contiene nombre, teléfono,
 * correo ni dirección.
 */
function getOrCreateVisitorId() {
    let visitorId =
        localStorage.getItem(
            WHATSAPP_VISITOR_KEY
        );

    if (visitorId) {
        return visitorId;
    }


    if (
        window.crypto &&
        typeof window.crypto.randomUUID ===
        'function'
    ) {
        visitorId =
            `VIS-${window.crypto.randomUUID()}`;
    } else {
        visitorId =
            `VIS-${Date.now()}-${Math.random()
                .toString(36)
                .slice(2)}`;
    }


    localStorage.setItem(
        WHATSAPP_VISITOR_KEY,
        visitorId
    );


    return visitorId;
}


/*
 * Lee únicamente IDs y cantidades
 * del carrito.
 *
 * El precio real será consultado
 * nuevamente en MySQL por el backend.
 */
function getWhatsappCartItems() {
    try {
        const cart =
            JSON.parse(
                localStorage.getItem(
                    WHATSAPP_CART_KEY
                )
            ) || {};


        return Object
            .values(cart)

            .filter(
                item =>
                    Number(
                        item.qty || 0
                    ) > 0
            )

            .map(
                item => ({
                    id:
                        Number(
                            item.id
                        ),

                    quantity:
                        Number(
                            item.qty || 0
                        )
                })
            )

            .filter(
                item =>
                    Number.isInteger(
                        item.id
                    ) &&
                    item.id > 0 &&
                    Number.isInteger(
                        item.quantity
                    ) &&
                    item.quantity > 0
            );

    } catch (error) {

        console.warn(
            'No fue posible leer el carrito para WhatsApp:',
            error
        );

        return [];
    }
}


function getCurrentPageName() {
    return (
        window.location.pathname
            .split('/')
            .pop()
            .toLowerCase() ||
        'index.html'
    );
}


/*
 * Esta función es pública para que
 * carrito.html también pueda utilizarla.
 */
async function openTrackedWhatsapp(
    options = {}
) {
    if (whatsappRequestRunning) {
        return;
    }

    whatsappRequestRunning = true;

    /*
     * Detectamos si realmente estamos
     * en un dispositivo móvil.
     */
    const isMobile =
        navigator.userAgentData?.mobile === true ||
        /Android|iPhone|iPad|iPod/i.test(
            navigator.userAgent
        );

    /*
     * En desktop recibiremos la pestaña
     * que se abrió directamente desde el click.
     *
     * En móvil no necesitamos pestaña nueva:
     * abriremos WhatsApp App.
     */
    const whatsappTab =
        options.whatsappTab || null;

    try {
        const response =
            await fetch(
                WHATSAPP_LEAD_URL,
                {
                    method: 'POST',

                    headers: {
                        'Content-Type':
                            'application/json'
                    },

                    body:
                        JSON.stringify({
                            visitorId:
                                getOrCreateVisitorId(),

                            page:
                                getCurrentPageName(),

                            source:
                                String(
                                    options.source ||
                                    'mobile-nav'
                                ),

                            items:
                                getWhatsappCartItems()
                        })
                }
            );

        const result =
            await response
                .json()
                .catch(() => ({}));

        if (
            !response.ok ||
            !result.whatsappMobileUrl ||
            !result.whatsappWebUrl
        ) {
            throw new Error(
                result.message ||
                'No fue posible iniciar WhatsApp.'
            );
        }

        console.log(
            '✅ Lead registrado:',
            result.leadCode
        );

        console.log(
            '📱 Es móvil:',
            isMobile
        );

        /*
         * ==================================================
         * CELULAR
         * ==================================================
         *
         * Abrimos WhatsApp App.
         *
         * El lead YA fue registrado antes,
         * por lo tanto no perdemos tracking.
         */
        if (isMobile) {
            window.location.href =
                result.whatsappMobileUrl;

            return;
        }

        /*
         * ==================================================
         * DESKTOP
         * ==================================================
         *
         * Usamos la pestaña que abrimos
         * directamente desde el click.
         */
        if (!whatsappTab) {
            throw new Error(
                'No existe la pestaña donde abrir WhatsApp Web.'
            );
        }

        whatsappTab.location.href =
            result.whatsappWebUrl;

    } catch (error) {
        console.error(
            '❌ Error registrando contacto de WhatsApp:',
            error
        );

        /*
         * Solo cerramos la pestaña
         * si realmente existe.
         *
         * En móvil será null.
         */
        if (
            whatsappTab &&
            !whatsappTab.closed
        ) {
            whatsappTab.close();
        }

        alert(
            'No fue posible abrir WhatsApp en este momento. Intenta nuevamente.'
        );

    } finally {
        whatsappRequestRunning = false;
    }
}

/*
 * Permitimos que otras páginas,
 * por ejemplo carrito.html,
 * utilicen el mismo sistema.
 */
window.openTrackedWhatsapp =
    openTrackedWhatsapp;

/*
 * ==========================================================
 * PUNTO ÚNICO PARA ABRIR WHATSAPP
 * ==========================================================
 *
 * Todos los botones de WhatsApp del sitio
 * deben utilizar esta función.
 *
 * DESKTOP:
 * abre una pestaña nueva y después carga WhatsApp Web.
 *
 * MÓVIL:
 * registra el lead y abre WhatsApp App.
 */
async function startTrackedWhatsapp(
    source = 'whatsapp'
) {
    const isMobile =
        navigator.userAgentData?.mobile === true ||
        /Android|iPhone|iPad|iPod/i.test(
            navigator.userAgent
        );


    /*
     * ======================================================
     * MÓVIL
     * ======================================================
     */
    if (isMobile) {

        await openTrackedWhatsapp({
            source
        });

        return;
    }


    /*
     * ======================================================
     * DESKTOP
     * ======================================================
     *
     * Abrimos la pestaña AQUÍ,
     * directamente durante el click.
     */
    const whatsappTab =
        window.open(
            'about:blank',
            '_blank'
        );


    if (!whatsappTab) {

        alert(
            'El navegador bloqueó la nueva pestaña. Permite ventanas emergentes para este sitio.'
        );

        return;
    }


    try {

        whatsappTab.opener =
            null;


        whatsappTab.document.title =
            'Preparando WhatsApp...';


        whatsappTab.document.body.innerHTML = `
            <main
                style="
                    min-height:100vh;
                    display:grid;
                    place-items:center;
                    font-family:Arial,sans-serif;
                    background:#ffffff;
                    color:#222222;
                    text-align:center;
                    padding:24px;
                "
            >
                <div>
                    <h2>
                        Preparando WhatsApp Web...
                    </h2>

                    <p>
                        Un momento.
                    </p>
                </div>
            </main>
        `;

    } catch (error) {

        console.warn(
            'No fue posible preparar la pestaña:',
            error
        );
    }


    await openTrackedWhatsapp({
        source,
        whatsappTab
    });
}


window.startTrackedWhatsapp =
    startTrackedWhatsapp;

document.addEventListener(
    'DOMContentLoaded',
    async () => {

        const container =
            document.getElementById(
                'mobile-nav-container'
            );


        if (!container) {
            return;
        }


        try {

            const response =
                await fetch(
                    'components/mobile-nav.html',
                    {
                        cache:
                            'no-cache'
                    }
                );


            if (!response.ok) {
                throw new Error(
                    `No se pudo cargar el menú móvil. HTTP ${response.status}`
                );
            }


            container.innerHTML =
                await response.text();


            addWhatsappMobileNavItem();

            setActiveMobileNavItem();

        } catch (error) {

            console.error(
                'Error cargando navegación móvil:',
                error
            );
        }
    }
);



function addWhatsappMobileNavItem() {

    const mobileNav =
        document.querySelector(
            '#mobile-nav-container .mobile-app-nav'
        );


    if (!mobileNav) {

        console.warn(
            'No se encontró .mobile-app-nav dentro de components/mobile-nav.html'
        );

        return;
    }


    if (
        mobileNav.querySelector(
            '.mobile-nav-whatsapp'
        )
    ) {
        return;
    }


    const whatsappLink =
        document.createElement('a');


    whatsappLink.className =
        'mobile-nav-whatsapp';


    /*
     * Ya NO ponemos wa.me directamente.
     *
     * Primero debe registrarse
     * el lead en nuestro backend.
     */
    whatsappLink.href =
        '#';


    whatsappLink.setAttribute(
        'aria-label',
        'Contactar a la Floristería Magno por WhatsApp'
    );


    whatsappLink.innerHTML = `
        <i
            class="bi bi-whatsapp"
            aria-hidden="true"
        ></i>

        <span>
            WhatsApp
        </span>
    `;


    whatsappLink.addEventListener(
        'click',
        async event => {

            event.preventDefault();

            await startTrackedWhatsapp(
                'mobile-nav'
            );
        }
    );


    mobileNav.appendChild(
        whatsappLink
    );
}



function setActiveMobileNavItem() {

    const currentFile =
        window.location.pathname
            .split('/')
            .pop()
            .toLowerCase() ||
        'index.html';


    let currentPage =
        'index';


    if (
        currentFile.includes(
            'catalogo'
        )
    ) {
        currentPage =
            'catalogo';

    } else if (
        currentFile.includes(
            'carrito'
        )
    ) {
        currentPage =
            'carrito';

    } else if (
        currentFile.includes(
            'rastreo'
        )
    ) {
        currentPage =
            'rastreo';

    } else if (
        currentFile.includes(
            'ideas'
        )
    ) {
        currentPage =
            'ideas';
    }


    document
        .querySelectorAll(
            '.mobile-app-nav [data-page]'
        )

        .forEach(
            link => {

                const isActive =
                    link.dataset.page ===
                    currentPage;


                link.classList.toggle(
                    'active',
                    isActive
                );


                if (isActive) {

                    link.setAttribute(
                        'aria-current',
                        'page'
                    );

                } else {

                    link.removeAttribute(
                        'aria-current'
                    );
                }
            }
        );
}

/*
 * ==========================================================
 * BOTONES WHATSAPP COMPARTIDOS
 * ==========================================================
 *
 * Cualquier elemento HTML que tenga:
 *
 * class="js-tracked-whatsapp"
 *
 * utilizará automáticamente el sistema
 * de tracking de leads.
 */
document.addEventListener(
    'click',
    async event => {

        const whatsappButton =
            event.target.closest(
                '.js-tracked-whatsapp'
            );


        if (!whatsappButton) {
            return;
        }


        event.preventDefault();


        const source =
            whatsappButton.dataset
                .whatsappSource ||
            'whatsapp-button';


        await startTrackedWhatsapp(
            source
        );
    }
);