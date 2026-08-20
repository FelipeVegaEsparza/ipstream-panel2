import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'

// Stream key derivado igual que en el agente: tv_ + sha256(clientId).slice(0,12)
function getStreamKey(clientId: string): string {
  return `tv_${crypto.createHash('sha256').update(clientId).digest('hex').slice(0, 12)}`
}

// Player público embebido con hls.js, apuntando a la URL estable /tv/<key>.m3u8
function playerHtml(streamKey: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Transmisión en vivo</title>
<script src="https://cdn.jsdelivr.net/npm/hls.js@1.6.16"></script>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #0f1115; color: #e5e7eb; font-family: system-ui, -apple-system, sans-serif; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px; }
  h1 { font-size: 18px; font-weight: 600; margin-bottom: 16px; }
  .wrap { position: relative; width: 100%; max-width: 960px; background: #000; border-radius: 12px; overflow: hidden; aspect-ratio: 16/9; box-shadow: 0 8px 30px rgba(0,0,0,.5); }
  video { width: 100%; height: 100%; display: block; }
  .overlay { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,.55); color: #d1d5db; font-size: 14px; z-index: 2; text-align: center; padding: 16px; }
  .state { margin-top: 12px; font-size: 13px; color: #9ca3af; word-break: break-all; text-align: center; }
</style>
</head>
<body>
  <h1>Transmisión en vivo</h1>
  <div class="wrap">
    <video id="v" controls autoplay muted playsinline></video>
    <div id="ov" class="overlay"><span id="ovt">Cargando…</span></div>
  </div>
  <p class="state"></p>
<script>
  var video = document.getElementById('v');
  var overlay = document.getElementById('ov');
  var ovt = document.getElementById('ovt');
  var key = ${JSON.stringify(streamKey)};
  var src = '/tv/' + key + '.m3u8';
  var stateEl = document.querySelector('.state');
  if (window.location.origin.indexOf('localhost') === -1) {
    stateEl.textContent = window.location.origin + src;
  } else {
    stateEl.textContent = src;
  }

  // Controlador robusto:
  //  - Nunca abandona: reintenta con backoff acotado ante errores fatales.
  //  - Cada 5s consulta /tv/<key>/app (estado en DB) y cambia de app si cambió.
  //  - Si lleva >20s sin reproducir, verifica qué app tiene stream REAL (probe
  //    del m3u8: 200 y sin #EXT-X-ENDLIST) y cae al que esté vivo (cubre
  //    estado en DB desactualizado o encoder caído).
  var hls = null;
  var currentApp = null;
  var lastHealthyAt = 0;
  var backoff = 0;
  var retryTimer = null;
  var MAX_BACKOFF = 5000;
  var HEALTHY_TIMEOUT = 20000;

  function setState(msg, err) {
    ovt.textContent = msg ? msg + (err ? ' (' + err + ')' : '') : '';
    overlay.style.display = msg ? 'flex' : 'none';
  }

  function manifestUrl(app) {
    return '/' + app + '/' + key + '.m3u8';
  }

  function probe(url) {
    return fetch(url, { cache: 'no-store' })
      .then(function (r) { if (!r.ok) return false; return r.text(); })
      .then(function (t) { return t ? t.indexOf('#EXT-X-ENDLIST') === -1 : false; })
      .catch(function () { return false; });
  }

  function start(app) {
    if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
    if (hls) { hls.destroy(); hls = null; }
    video.removeAttribute('src');
    video.load();
    currentApp = app;
    var url = manifestUrl(app);
    setState('Cargando…');
    if (window.Hls && Hls.isSupported()) {
      hls = new Hls({ lowLatencyMode: false, backBufferLength: 30 });
      hls.on(Hls.Events.MANIFEST_PARSED, function () {
        lastHealthyAt = Date.now();
        backoff = 0;
        setState('');
      });
      hls.on(Hls.Events.ERROR, function (_e, data) {
        if (!data.fatal) return;
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR || data.type === Hls.ErrorTypes.OTHER_ERROR) {
          backoff = Math.min(backoff ? backoff * 2 : 800, MAX_BACKOFF);
          setState('Reconectando…', data.details);
          retryTimer = setTimeout(function () { start(currentApp); }, backoff);
        } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          hls.recoverMediaError();
        }
      });
      hls.loadSource(url);
      hls.attachMedia(video);
      video.play().catch(function () {});
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.addEventListener('loadedmetadata', function () { lastHealthyAt = Date.now(); backoff = 0; setState(''); });
      video.addEventListener('error', function () {
        setState('Sin señal');
        retryTimer = setTimeout(function () { start(currentApp); }, 4000);
      });
      video.src = url;
      video.play().catch(function () {});
    } else {
      setState('Reproductor no soportado');
    }
  }

  function getDesiredApp() {
    return fetch('/tv/' + key + '/app', { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (d) { return d && (d.app === 'dj' ? 'dj' : 'live'); })
      .catch(function () { return null; });
  }

  function tick() {
    getDesiredApp().then(function (desired) {
      if (desired) {
        var healthy = (Date.now() - lastHealthyAt) < HEALTHY_TIMEOUT;
        if (currentApp === null) {
          start(desired);
        } else if (desired !== currentApp) {
          start(desired);
        } else if (!healthy) {
          probe(manifestUrl(currentApp)).then(function (selfLive) {
            if (selfLive) {
              start(currentApp);
            } else {
              var other = currentApp === 'live' ? 'dj' : 'live';
              probe(manifestUrl(other)).then(function (otherLive) {
                if (otherLive) start(other);
              });
            }
          });
        }
      }
      setTimeout(tick, 5000);
    });
  }

  tick();
</script>
</body>
</html>`
}

// URL pública:
//   /tv/<streamKey>        → página con reproductor (muestra lo que esté al aire)
//   /tv/<streamKey>.m3u8   → 302 al app que corresponda (dj si live, live si autodj)
export async function GET(_req: NextRequest, { params }: { params: { key: string } }) {
  const rawKey = params.key || ''
  const isPlaylist = rawKey.endsWith('.m3u8')
  const streamKey = rawKey.replace(/\.m3u8$/, '')
  if (!/^tv_[a-f0-9]{12}$/.test(streamKey)) {
    return new NextResponse('Not Found', { status: 404 })
  }

  const streams = await prisma.videoStream.findMany({ select: { clientId: true, status: true } })
  const match = streams.find(s => getStreamKey(s.clientId) === streamKey)
  if (!match) {
    return new NextResponse('Not Found', { status: 404 })
  }

  if (isPlaylist) {
    const app = match.status === 'live' ? 'dj' : 'live'
    // Location relativo: el cliente lo resuelve contra su propio origen
    // (req.url del server, detrás de Caddy, es localhost:3000 y rompería la URL).
    const res = new NextResponse(null, { status: 302 })
    res.headers.set('Location', `/${app}/${streamKey}.m3u8`)
    res.headers.set('Cache-Control', 'no-store')
    return res
  }

  return new NextResponse(playerHtml(streamKey), {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}