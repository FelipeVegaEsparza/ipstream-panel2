# Desplegar un cliente nuevo (Radio / TV)

Guía paso a paso para agregar un cliente de IPStream Panel a esta plataforma
(Modelo C: un solo repo, deploy independiente por cliente en Dockploy).

---

## 0. Requisitos previos

- Tener el repo clonado y con dependencias instaladas:
  ```bash
  git clone <url-del-repo> app-pwa
  cd app-pwa
  npm install
  ```
- **Docker** instalado y corriendo en tu máquina (para validar el build local).
- Tener el **`clientId`** del cliente nuevo. Se obtiene desde el panel de IPStream
  en `/dashboard/api-test` (sección "Tu Client ID").
- Opcional: el **nombre** visible de la radio/TV.

> El contenido (noticias, programas, etc.) NO se configura aquí: lo entrega el
> panel de IPStream vía la API usando el `clientId`. Aquí solo indicamos qué
> `clientId` consultar.

---

## 1. Crear la configuración del cliente

Desde la raíz del repo:

```bash
npm run new-client -- <nombre> <clientId> "Nombre Visible"
```

Ejemplo:

```bash
npm run new-client -- radio-nueva cmxxxxxxxxxxxxxxxx "Radio Nueva FM"

npm run new-client -- radio-prueba cmtlipo00000bojlehq2kezxn "Radio de Prueba"

```

Qué hace el comando:
- Valida que `<nombre>` sea kebab-case (`radio-nueva`, no `Radio Nueva!`).
- Crea `clients/radio-nueva/client.json` con:
  ```json
  {
    "clientId": "cmxxxxxxxxxxxxxxxx",
    "name": "Radio Nueva FM"
  }
  ```
- Ejecuta el build del cliente para validar que todo está bien.

Al final debe mostrar:
```
✓ Cliente listo. Despliégalo en Dockploy con CLIENT=radio-nueva
```

> Si el nombre ya existe, el comando falla para no sobrescribir.

---

## 2. Validar localmente (opcional pero recomendado)

### 2.1 Probar el sitio con el build local

```bash
npx vite preview --outDir dist/radio-nueva
```
Abre `http://localhost:4173`. Deberías ver la radio con su contenido real.

### 2.2 Probar la imagen Docker (misma que usará Dockploy)

```bash
docker build --build-arg CLIENT=radio-nueva -t radio-nueva .
docker run --rm -p 8080:80 radio-nueva
```
Abre `http://localhost:8080` y verifica:
- Carga la radio.
- `/manifest.webmanifest` muestra el nombre del cliente.
- `/noticias` (o cualquier ruta) carga la SPA, no devuelve 404.

---

## 3. Elegir el template

El **diseño se elige desde el panel**, no aquí. En el panel de IPStream, en el
cliente, configura el campo `selectedTemplate` con uno de:

```
minimalista | moderna | blue | moderno | tradicional | app | petroleo | petroleoblue | playlist | covered
```

Al recargar el sitio cambia el diseño **sin redesplegar**. Si el id no existe,
se usa `minimalista` por defecto (no rompe).

---

## 4. Desplegar en Dockploy

Cada cliente es un **proyecto independiente** en Dockploy que apunta a este
mismo repositorio.

1. En Dockploy, crea un proyecto nuevo para este cliente.
2. Configura el proyecto:

   | Campo | Valor |
   |-------|-------|
   | Repositorio | el mismo de siempre (`app-pwa`) |
   | Dockerfile | el del repo (tiene `ARG CLIENT`) |
   | Build args | `CLIENT=radio-nueva` |
   | Puerto expuesto | `80` |
   | Dominio | el del cliente (ej. `radionueva.cl` o un subdominio) |

3. Despliega.

> El `Dockerfile` ejecuta `npm run build:client -- ${CLIENT}` y sirve
> `dist/${CLIENT}` con nginx (SPA fallback incluido). Ya validado con
> `docker build --build-arg CLIENT=fusionaustral .`.

---

## 5. Verificación final

- [ ] El sitio carga en el dominio del cliente.
- [ ] Muestra el nombre y contenido correctos (vienen del panel).
- [ ] El template elegido se ve como en el panel.
- [ ] `https://<dominio>/manifest.webmanifest` responde con el nombre del cliente.
- [ ] La app es instalable (PWA): botón "Instalar app" o instalación por el navegador.
- [ ] Prueba una ruta profunda (`/noticias`) y el modo offline.

---

## 6. Actualizar todos los clientes a la vez

Cuando cambias el código del core:

1. Haz el cambio y `git push`.
2. En Dockploy, reconstruye cada proyecto (o dispara el redeploy).

Como todos usan el mismo repo, el mismo commit llega a todos. Cada cliente
conserva su `client.json` y su template del panel.

---

## Notas

- **Desarrollos específicos por cliente**: si un cliente pide algo único que no
  aplica a todos, se desarrolla aparte (fork desde el repo plantilla) o como
  opción configurable; no se toca el core para todos.
- **Template desconocido**: cae a `minimalista` sin romper.
- **clientId incorrecto**: el sitio muestra una pantalla de error informativa.
