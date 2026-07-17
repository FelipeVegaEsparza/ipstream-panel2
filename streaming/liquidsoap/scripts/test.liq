# =====================================================
# Test script: sine wave → Icecast
# Phase 0: validar que el flujo liquidsoap → icecast funciona
# =====================================================

# Permitir correr como root (estamos dentro de un container)
set("init.allow_root", true)

# Logs
set("log.file.path", "/var/log/liquidsoap/test.log")
set("log.file.set", true)
set("log.stdout", true)
set("log.level", 4)

# Habilitar telnet para control (puerto 1234)
set("server.telnet", true)
set("server.telnet.port", 1234)

# Fuente: tono de 440Hz (nota La)
music = sine(440.0)

# Salida a Icecast como AutoDJ de prueba en /test
output.icecast(
    %mp3(bitrate=128),
    host="icecast",
    port=8000,
    password="hackme",
    mount="/test",
    name="IPStream Test",
    genre="Test",
    description="Stream de prueba - 440Hz sine wave",
    public=true,
    music
)
