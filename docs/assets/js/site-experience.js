/* Opciones públicas aplicadas después de leer la configuración del backend. */
(function () {
    const PALETTES = {
        rosa:['#fff1f5','#e9b3c4'],lavanda:['#f6efff','#c9b7e7'],
        menta:['#ecfaf2','#a8d9c7'],durazno:['#fff1e9','#efc0a8'],
        cielo:['#eaf7ff','#abd3ea'],vainilla:['#fff9e9','#e8d7a7'],
        malva:['#fcf3ff','#dfc6eb'],
        lila:['#f3f0ff','#cbc3ef'],
        coral:['#fff0f0','#f1c0bb'],
        salmon:['#fff4ec','#f3c7b6'],
        amarillo:['#fffce6','#f5e69e'],
        lima:['#f7ffe9','#d9eab3'],
        verdeAgua:['#f0fff8','#bde5d7'],
        turquesa:['#edffff','#b6e1df'],
        azulPolvo:['#eff4ff','#c1d1ed'],
        arena:['#fcf7ef','#e5d2bc'],
        grisPerla:['#f8f7fa','#ddd8e4'],
        fresa:['#fff1f6','#efbdd0'],
        pistacho:['#f8fbed','#d8e0b8']
    };
    const looksLikeVideo = value => {
        if (!value) return '';
        try {
            const url=new URL(value);
            if(url.protocol!=='https:') return '';
            let id='';
            if(['youtube.com','www.youtube.com','m.youtube.com'].includes(url.hostname)) {
                id=url.searchParams.get('v') ||
                    (url.pathname.match(/^\/(?:shorts|embed)\/([a-zA-Z0-9_-]{11})/)||[])[1] || '';
            } else if(url.hostname==='youtu.be') {
                id=url.pathname.split('/')[1] || '';
            } else if(url.hostname==='www.youtube-nocookie.com') {
                id=(url.pathname.match(/^\/embed\/([a-zA-Z0-9_-]{11})/)||[])[1] || '';
            }
            return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : '';
        } catch (_) { return ''; }
    };
    window.magnoApplySiteSettings=function(config) {
        const options=config?.opcionesTienda;
        if(!options) return;
        const section=document.getElementById('magnoSeoSection');
        if(section) {
            section.hidden=options.seoVisible!==true;
            section.style.display=options.seoVisible===true ? '' : 'none';
            if(options.seoVisible) {
                const title=document.getElementById('entregas-seo-title');
                const p1=document.getElementById('magnoSeoParagraph1');
                const p2=document.getElementById('magnoSeoParagraph2');
                if(title) title.textContent=options.seoTitulo||'Nuestra floristería';
                if(p1) p1.textContent=options.seoTexto1||'';
                if(p2) p2.textContent=options.seoTexto2||'';
                const holder=document.getElementById('magnoSeoVideo');
                const videoId=looksLikeVideo(options.seoVideoUrl);
                if(holder) {
                    holder.replaceChildren();
                    if(videoId) {
                        const frame=document.createElement('iframe');
                        frame.src='https://www.youtube-nocookie.com/embed/'+videoId;
                        frame.title='Video de Floristería Magno';
                        frame.loading='lazy';
                        frame.referrerPolicy='strict-origin-when-cross-origin';
                        frame.allow='accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture';
                        frame.allowFullscreen=true;
                        holder.appendChild(frame);
                        holder.hidden=false;
                    } else holder.hidden=true;
                }
            }
        }
        const theme=options.tema||{};
        const body=document.body;
        function choose(part,attribute,cssName) {
            const palette=PALETTES[theme[part]];
            if(!palette) {body.removeAttribute(attribute);body.style.removeProperty(cssName);return;}
            body.setAttribute(attribute,'true');
            body.style.setProperty(cssName,palette[1]);
            return palette;
        }
        const bg=choose('fondo','data-magno-custom-bg','--magno-selected-bg');
        if(bg) {
            body.style.setProperty('--magno-selected-gradient',
                'linear-gradient(135deg, '+bg[0]+' 0%, '+bg[1]+' 53%, '+bg[0]+' 100%)');
        } else body.style.removeProperty('--magno-selected-gradient');
        choose('botones','data-magno-custom-buttons','--magno-selected-button');
        choose('petalos','data-magno-custom-petals','--magno-selected-petal');
        choose('petaloInicial','data-magno-custom-intro','--magno-selected-intro');
    };
})();
