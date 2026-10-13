# Pruebas de carga con k6

Suite para medir cómo se comporta el panel con muchos usuarios simultáneos.
Es una herramienta de desarrollo: **no forma parte del build ni del deploy**.

## Requisitos

- [k6](https://grafana.com/docs/k6/latest/set-up/install-k6/) instalado
  (`sudo dnf install k6` / `sudo apt install k6` / `brew install k6`).
- Dependencias de Node del panel instaladas (`npm install`) para el seed
  (usa `@prisma/client` y `bcryptjs` del repo).

## Flujo rápido

```sh
# 1) Crear usuarios/clientes sintéticos y loadtest/users.json
K6_USERS=60 node loadtest/seed-users.js

# 2) Validar que responde y el login funciona
BASE_URL=https://panel.tudominio.com k6 run loadtest/smoke.js

# 3) Carga del panel autenticado
BASE_URL=https://panel.tudominio.com k6 run loadtest/dashboard.js

# 4) Carga de lecturas públicas (usuarios finales de la PWA)
BASE_URL=https://panel.tudominio.com k6 run loadtest/public.js

# 5) Al terminar, borrar los datos de prueba
node loadtest/seed-users.js --cleanup
```

`loadtest/users.json` se genera con las credenciales y está en `.gitignore`.

## Variables de entorno

| Variable | Default | Descripción |
| --- | --- | --- |
| `BASE_URL` | `http://localhost:3000` | URL base del panel (local o VPS). |
| `K6_PROFILE` | `ramp` | `ramp` (rampa progresiva) o `soak` (30 min sostenido). |
| `K6_USERS` | `50` | Usuarios a sembrar (seed). |
| `K6_PASSWORD` | `LoadTest123!` | Password compartida de los usuarios de prueba. |
| `K6_EMAIL_DOMAIN` | `example.com` | Dominio de los emails sembrados. |

> Siembra **tantos usuarios como VUs máximos** esperes. Cada VU hace 1 login y
> reutiliza la cookie; si hay más VUs que usuarios, varias VUs comparten cuenta
> y el rate-limit de login (10 intentos / 15 min por email, `lib/rate-limit.ts`)
> puede devolver `null` y fallar el login.

## Qué mide cada escenario

- **`smoke.js`** — 1 VU / 1 iteración. `/api/health` + login + `basic-data`.
  Úsalo antes de cualquier prueba grande.
- **`dashboard.js`** — panel autenticado (operadores). Login por VU y luego
  lecturas: `basic-data`, `onboarding`, `chat/stats`, `support/unread-summary`,
  `contact-messages/unread-count`.
- **`public.js`** — lecturas públicas sin auth (lo que consumen los oyentes):
  `basic-data`, `news`, `programs`.

## Cómo correrlo contra el VPS

Lo más representativo es lanzar k6 **desde el propio VPS** (menos latencia de
red y deja ver el consumo real). El panel escucha en el puerto `3000`
(contenedor `ipstream-app`) y detrás de Caddy en `:443`.

```sh
# desde el VPS
BASE_URL=https://panel.tudominio.com k6 run loadtest/dashboard.js
```

Requisitos allí: clonar el repo (o copiar `loadtest/`), `npm install`,
`node loadtest/seed-users.js` apuntando al `.env` de producción y k6 instalado.
Alternativa: correr k6 desde tu máquina contra el VPS (añade latencia de red).

## Interpretar resultados

k6 muestra `http_req_duration` (p50/p90/p95/p99), `http_req_failed`, `checks` y
`http_reqs` (RPS). Los umbrales por defecto:

- `http_req_failed < 1%` (público `< 2%`).
- `p(95) < 700ms`, `p(99) < 1500ms` (público `800ms` / `1500ms`).
- `checks > 99%`.

Mientras corre, vigila en paralelo:

```sh
# CPU / RAM del panel
docker stats ipstream-app ipstream-db

# Conexiones y saturación de MySQL
docker exec ipstream-db mysql -uroot -p"$MYSQL_ROOT_PASSWORD" \
  -e "SHOW STATUS LIKE 'Threads_connected'; SHOW STATUS LIKE 'Max_used_connections'; SHOW VARIABLES LIKE 'max_connections';"
```

## Qué suele saturar primero en este panel

- **MySQL / pool de Prisma** — casi siempre el primer cuello de botella.
  Revisa `max_connections` y `innodb_buffer_pool_size`.
- **El único proceso Node** — un solo contenedor `ipstream-app`, un solo event
  loop. Si quieres escalar, hay que ir a varias réplicas y a un rate-limit/DB
  compartido (hoy `lib/rate-limit.ts` es un contador en memoria por proceso).
- **Login** — `bcrypt.compare` con cost 12 es CPU-intensivo; el throughput de
  login es bajo **por diseño**. No lo uses como endpoint de carga masiva.
- **Menú por request** — rutas con `MENU_GUARD_INJECTED` consultan
  `appConfig` + `clientMenuItem` en cada llamada (`lib/menu-permissions.ts`).
  Si aparece en el top de queries, es candidato a caché.

## Endpoints que NO conviene cargar

- `/api/dashboard/streaming/*` — requieren `RadioStream`; sin él responden
  `404`, que k6 cuenta como fallo y ensucia los umbrales.
- Escrituras públicas (p. ej. `POST contact-messages`): tienen rate-limit por
  IP (5 / 10 min). Desde una sola máquina verás `429` rápido; solo tiene
  sentido con k6 distribuido (`k6 run --vus ... --duration` con varias IPs).
- Subidas de archivos y streaming HLS/RTMP: son otra capa, no la del panel.

## Añadir escenarios

Para un flujo nuevo, importa los helpers y reutiliza la sesión:

```js
import http from 'k6/http'
import { check } from 'k6'
import { baseUrl, requireUsers, ensureLogin, getUser, tagParams } from './lib.js'

export default function () {
  requireUsers()
  if (!ensureLogin()) return
  const { clientId } = getUser()
  const res = http.get(`${baseUrl()}/api/dashboard/...`, tagParams('mi_endpoint'))
  check(res, { 'status 200': (r) => r.status === 200 })
}
```
