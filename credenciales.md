Las credenciales del admin están definidas en .env.docker:
- Email: admin@ipstream.com
- Password: admin123456

prod:
- Email: admin@panelipstream.cl
- Password: 3517707aaAA@@##fix: correct agent container name in health check

docker compose build agent && docker compose up -ddocker compose build app --no-cache && docker compose up -ddocker compose build app --no-cache && docker compose up -d

ssh -i ~/.ssh/panelipstream_personal root@213.199.62.170