import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'

// Stream key derivado igual que en el agente: tv_ + sha256(clientId).slice(0,12)
function getStreamKey(clientId: string): string {
  return `tv_${crypto.createHash('sha256').update(clientId).digest('hex').slice(0, 12)}`
}

// Player público embebido con hls.js, apuntando a la URL estable /tv/<key>.m3u8
function playerHtml(origin: string, streamKey: string): string {
  const playlist = `${origin}/tv/${streamKey}.m3u8`
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Transmisión en vivo</title>
<script src="https://cdn.jsdelivr.net/npm/hls.js@1.5.17"></script>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #0f1115; color: #e5e7eb; font-family: system-ui, -apple-system, sans-serif; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px; }
  h1 { font-size: 18px; font-weight: 600; margin-bottom: 16px; }
  .wrap { width: 100%; max-width: 960px; background: #000; border-radius: 12px; overflow: hidden; aspect-ratio: 16/9; box-shadow: 0 8px 30px rgba(0,0,0,.5); }
  video { width: 100%; height: 100%; display: block; }
  .state { margin-top: 12px; font-size: 13px; color: #9ca3af; word-break: break-all; text-align: center; }
</style>
</head>
<body>
  <h1>Transmisión en vivo</h1>
  <div class="wrap"><video id="v" controls autoplay muted playsinline></video></div>
  <p class="state">${playlist}</p>
<script>
  var video = document.getElementById('v');
  var src = ${JSON.stringify(playlist)};
  if (window.Hls && Hls.isSupported()) {
    var hls = new Hls({ lowLatencyMode: false, backBufferLength: 30 });
    hls.on(Hls.Events.ERROR, function (_e, data) {
      if (data.fatal) hls.startLoad();
    });
    hls.loadSource(src);
    hls.attachMedia(video);
  } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
    video.src = src;
  }
</script>
</body>
</html>`
}

// URL pública:
//   /tv/<streamKey>        → página con reproductor (muestra lo que esté al aire)
//   /tv/<streamKey>.m3u8   → 302 al app que corresponda (dj si live, live si autodj)
export async function GET(req: NextRequest, { params }: { params: { key: string } }) {
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
    const res = NextResponse.redirect(new URL(`/${app}/${streamKey}.m3u8`, req.url), 302)
    res.headers.set('Cache-Control', 'no-store')
    return res
  }

  const origin = new URL(req.url).origin
  return new NextResponse(playerHtml(origin, streamKey), {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}