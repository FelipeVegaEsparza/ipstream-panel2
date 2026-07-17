# =====================================================
# Auto-generated for client test_4fe56d37 (mount: test_b31024e8)
# DO NOT EDIT — será regenerado en cada start/restart.
# =====================================================

# Permitir root (estamos dentro de un container)
set("init.allow_root", true)

# Logs
settings.log.file.path.set("/var/log/liquidsoap/test_b31024e8.log")
settings.log.file.set(true)
settings.log.stdout.set(true)
settings.log.level.set(3)

# Telnet para control remoto (lo usa el streaming-agent)
settings.server.telnet.set(true)
settings.server.telnet.port.set(29912)

# Source: playlist (default) o silencio
music =
  mksafe(playlist(
    id="test_b31024e8-playlist",
    "/var/lib/radio/test_4fe56d37/playlist.m3u",
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
  mount="/test_b31024e8",
  name="Test Radio 1",
  genre="Various",
  description="AutoDJ stream for Test Radio 1",
  public=true,
  music
)
