# =====================================================
# Auto-generated for client cmroaaon1000112e1vmemc09g (mount: radio_b2e26df392af)
# DO NOT EDIT — será regenerado en cada start/restart.
# =====================================================

# Permitir root (estamos dentro de un container)
set("init.allow_root", true)

# Logs
settings.log.file.path.set("/var/log/liquidsoap/radio_b2e26df392af.log")
settings.log.file.set(true)
settings.log.stdout.set(true)
settings.log.level.set(3)

# Telnet para control remoto (lo usa el streaming-agent)
settings.server.telnet.set(true)
settings.server.telnet.port.set(12340)

# Source: playlist (default) o silencio
music =
  mksafe(playlist(
    id="radio_b2e26df392af-playlist",
    "/var/lib/radio/cmroaaon1000112e1vmemc09g/playlist.m3u",
    mode="normal",
    reload=5000,
    loop=true
  ))

# Output a Icecast como AutoDJ (prioridad baja — DJ puede tomar el control)
output.icecast(
  %mp3(bitrate=128),
  host="icecast",
  port=8000,
  password="hackme",
  mount="/radio_b2e26df392af",
  name="Test Radio New",
  genre="Various",
  description="AutoDJ stream for Test Radio New",
  public=true,
  music
)
