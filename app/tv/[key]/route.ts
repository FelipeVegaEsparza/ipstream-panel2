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
  // Ruta relativa: se resuelve contra el origen de la página (no usar req.url
  // del server, que detrás de Caddy es localhost:3000).
  var src = '/tv/' + key + '.m3u8';
  var stateEl = document.querySelector('.state');
  if (window.location.origin.indexOf('localhost') === -1) {
    stateEl.textContent = window.location.origin + src;
  } else {
    stateEl.textContent = src;
  }
  var hls = null;
  var retries = 0;
  var maxRetries = 10;

  function setState(msg, err) {
    ovt.textContent = msg ? msg + (err ? ' (' + err + ')' : '') : '';
    overlay.style.display = msg ? 'flex' : 'none';
  }

  function start() {
    if (hls) { hls.destroy(); hls = null; }
    if (window.Hls && Hls.isSupported()) {
      hls = new Hls({ lowLatencyMode: false, backBufferLength: 30 });
      hls.on(Hls.Events.MANIFEST_PARSED, function () { retries = 0; setState(''); });
      hls.on(Hls.Events.ERROR, function (_e, data) {
        if (!data.fatal) return;
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR && retries < maxRetries) {
          retries++;
          setState('Reconectando… (' + retries + ')', data.details);
          setTimeout(start, 2000);
        } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          hls.recoverMediaError();
        } else {
          setState('Sin señal', data.details);
          setTimeout(function () { retries = 0; start(); }, 5000);
        }
      });
      hls.loadSource(src);
      hls.attachMedia(video);
      setState('Cargando…');
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.addEventListener('loadedmetadata', function () { setState(''); });
      video.addEventListener('error', function () { setState('Sin señal'); setTimeout(function () { retries = 0; video.load(); }, 5000); });
      video.src = src;
      setState('Cargando…');
    } else {
      setState('Reproductor no soportado');
    }
  }

  start();
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