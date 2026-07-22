Las credenciales del admin están definidas en .env.docker:
- Email: admin@ipstream.com
- Password: admin123456

prod:
- Email: admin@panelipstream.cl
- Password: 3517707aaAA@@##fix: correct agent container name in health check

docker compose build agent && docker compose up -ddocker compose build app --no-cache && docker compose up -ddocker compose build app --no-cache && docker compose up -d

ssh -i ~/.ssh/panelipstream_personal root@213.199.62.170fvegadev@fedora:~/Desarrollo/ipstream-sonicpanel$ docker compose exec db mysql -uipstream -pipstream_secret ipstream_panel -e "SHOW TABLES LIKE 'video_%';"
mysql: [Warning] Using a password on the command line interface can be insecure.
+------------------------------------+
| Tables_in_ipstream_panel (video_%) |
+------------------------------------+
| video_play_history                 |
| video_playlist_entries             |
| video_playlist_schedules           |
| video_playlists                    |
| video_streams                      |
| video_tracks                       |
+------------------------------------+
fvegadev@fedora:~/Desarrollo/ipstream-sonicpanel$ 
