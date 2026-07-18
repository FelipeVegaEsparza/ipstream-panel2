# =====================================================
# Auto-generated for client cmroc3vtu000b8q6l0lzvvj4d (mount: radio_1448bc42c435)
# DO NOT EDIT — será regenerado en cada start/restart.
# =====================================================

# Permitir root (estamos dentro de un container)
set("init.allow_root", true)

# Logs
settings.log.file.path.set("/var/log/liquidsoap/radio_1448bc42c435.log")
settings.log.file.set(true)
settings.log.stdout.set(true)
settings.log.level.set(3)

# Telnet para control remoto (lo usa el streaming-agent)
settings.server.telnet.set(true)
settings.server.telnet.port.set(12342)

# Source: playlist con jingles o solo playlist
source = mksafe(rotate(
    weights=[5, 1],
    [
      playlist(id="radio_1448bc42c435-music", "/var/lib/radio/cmroc3vtu000b8q6l0lzvvj4d/playlist.m3u", mode="normal", reload=5000, loop=true),
      playlist(id="radio_1448bc42c435-jingles", "/var/lib/radio/cmroc3vtu000b8q6l0lzvvj4d/jingles.m3u", mode="random", reload=5000, loop=true)
    ]
  ))

# Output a Icecast como AutoDJ (prioridad baja — DJ puede tomar el control)
output.icecast(
  %mp3(bitrate=128),
  host="icecast",
  port=8000,
  password="hackme",
  mount="/radio_1448bc42c435",
  name="Radio Fusion Austral",
  genre="Various",
  description="AutoDJ stream for Radio Fusion Austral",
  public=true,
  source
)
