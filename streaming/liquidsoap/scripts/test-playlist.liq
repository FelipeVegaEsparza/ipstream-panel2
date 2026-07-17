# =====================================================
# Test script: MP3 playlist → Icecast
# Phase 0: validar reproducción de MP3s reales en loop
# =====================================================

# Permitir correr como root (estamos dentro de un container)
set("init.allow_root", true)

# Logs
set("log.file.path", "/var/log/liquidsoap/test-playlist.log")
set("log.file.set", true)
set("log.stdout", true)
set("log.level", 4)

# Habilitar telnet para control (puerto 1234)
set("server.telnet", true)
set("server.telnet.port", 1234)

# Playlist desde /var/lib/radio/test/mp3/
# Modo normal (en orden), reload cada 5s
playlist_src = playlist(
    id="test-playlist",
    "/var/lib/radio/test/mp3/",
    mode="normal",
    reload=5000,
    loop=true
)

# mksafe() hace que la source sea "infallible" — si el directorio está
# vacío o hay un error, sigue transmitiendo silencio en vez de caerse.
music = mksafe(playlist_src)

# Salida a Icecast como AutoDJ de prueba en /test-mp3
output.icecast(
    %mp3(bitrate=128),
    host="icecast",
    port=8000,
    password="b94afe2e977494acf1448e4747b58268d578663d",
    mount="/test-mp3",
    name="IPStream Test (MP3)",
    genre="Test",
    description="Stream de prueba - MP3 playlist en loop",
    public=true,
    music
)
