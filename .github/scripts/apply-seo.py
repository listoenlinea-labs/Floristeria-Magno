from pathlib import Path
import re

BASE = 'https://listoenlinea-labs.github.io/Floristeria-Magno/'
IMAGE = BASE + 'assets/img/icon/logo_lpb.png'

public_pages = {
    'docs/index.html': {
        'canonical': BASE,
        'title': 'Floristería Magno | Arte Floral',
        'description': 'Floristería Magno — diseño floral contemporáneo para momentos inolvidables.'
    },
    'docs/catalogo.html': {
        'canonical': BASE + 'catalogo.html',
        'title': 'Catálogo | Floristería Magno',
        'description': 'Catálogo Floristería Juan H Magno — compra arreglos florales y agenda tu entrega.'
    },
    'docs/ideas.html': {
        'canonical': BASE + 'ideas.html',
        'title': 'Ideas con IA | Juan H Magno',
        'description': 'Ideas con IA para crear ramos personalizados según evento, colores favoritos y estilo.'
    },
}


def social_block(data):
    return f'''    <link rel="canonical" href="{data['canonical']}" />
    <meta property="og:locale" content="es_MX" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Floristería Magno" />
    <meta property="og:title" content="{data['title']}" />
    <meta property="og:description" content="{data['description']}" />
    <meta property="og:url" content="{data['canonical']}" />
    <meta property="og:image" content="{IMAGE}" />
    <meta property="og:image:alt" content="Logo de Floristería Magno" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="{data['title']}" />
    <meta name="twitter:description" content="{data['description']}" />
    <meta name="twitter:image" content="{IMAGE}" />
    <meta name="twitter:image:alt" content="Logo de Floristería Magno" />
'''


for filename, data in public_pages.items():
    path = Path(filename)
    text = path.read_text(encoding='utf-8')

    if 'rel="canonical"' in text or "rel='canonical'" in text:
        raise RuntimeError(f'{filename} ya tiene canonical; revisar antes de sobrescribir')

    title_match = re.search(r'(<title>.*?</title>\s*)', text, flags=re.S | re.I)
    if not title_match:
        raise RuntimeError(f'No se encontró <title> en {filename}')

    insert_at = title_match.end()
    text = text[:insert_at] + '\n' + social_block(data) + text[insert_at:]
    path.write_text(text, encoding='utf-8')


noindex_pages = {
    'docs/carrito.html': 'noindex, follow',
    'docs/pago.html': 'noindex, nofollow, noarchive',
    'docs/rastreo.html': 'noindex, nofollow, noarchive',
    'docs/admin.html': 'noindex, nofollow, noarchive',
}

for filename, directive in noindex_pages.items():
    path = Path(filename)
    text = path.read_text(encoding='utf-8')

    if re.search(r'<meta\s+name=["\']robots["\']', text, flags=re.I):
        raise RuntimeError(f'{filename} ya tiene meta robots; revisar antes de sobrescribir')

    viewport = re.search(r'(<meta\s+name=["\']viewport["\'][^>]*>\s*)', text, flags=re.I)
    if not viewport:
        raise RuntimeError(f'No se encontró meta viewport en {filename}')

    block = (
        f'    <meta name="robots" content="{directive}" />\n'
        f'    <meta name="googlebot" content="{directive}" />\n'
    )

    text = text[:viewport.end()] + block + text[viewport.end():]
    path.write_text(text, encoding='utf-8')
