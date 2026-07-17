# Guía de Integración del Chat en Vivo

Documento técnico para integrar el chat comunitario de IPStream en el sitio web de tu radio.

---

## Tabla de contenidos

1. [Resumen](#resumen)
2. [Arquitectura](#arquitectura)
3. [Endpoints públicos](#endpoints-públicos)
4. [Implementación vanilla JavaScript](#implementación-vanilla-javascript)
5. [Implementación React](#implementación-react)
6. [Estilos sugeridos](#estilos-sugeridos)
7. [Manejo de estados y errores](#manejo-de-estados-y-errores)
8. [Performance y polling](#performance-y-polling)
9. [Seguridad y buenas prácticas](#seguridad-y-buenas-prácticas)
10. [Troubleshooting](#troubleshooting)

---

## Resumen

El chat de IPStream es un chat comunitario donde:

- Los **oyentes** envían mensajes identificándose con nombre + email.
- El **staff de la radio** puede enviar mensajes desde su dashboard con un badge distintivo.
- La **persistencia** dura 48 horas (los mensajes se borran automáticamente).
- El **transporte** es vía polling HTTP (no WebSockets).

Cada radio tiene un `clientId` único. Reemplazá `<TU_CLIENT_ID>` en todos los ejemplos por el ID real que ves en tu dashboard (`/dashboard/api-test`).

**Base URL:**

```
https://tu-dominio.com     # producción
http://localhost:3000      # desarrollo
```

---

## Arquitectura

```
┌──────────────────┐                    ┌─────────────────────┐
│  Web del cliente │  ──── polling ────▶ │  IPStream API       │
│  (tu sitio)      │  ◀─── JSON ─────── │  /api/public/[cid]  │
│                  │                    │     /chat/messages   │
│  - input nombre  │  ──── POST ──────▶ │     /chat/online     │
│  - input email   │                    │                     │
│  - input mensaje │                    └─────────────────────┘
│  - lista de msgs │
└──────────────────┘
```

**Flujo recomendado:**

1. Al cargar la página, pedí los últimos N mensajes (`GET .../messages?limit=50`).
2. Mostralos en una lista (scroll abajo).
3. Cada 3–5 segundos, hacé polling (`GET .../messages?since=<últimoTimestamp>&limit=100`).
4. Si llegan mensajes nuevos, agregalos a la lista sin scrollear si el usuario ya está arriba.
5. Para enviar, tomá nombre + email del visitante (con `localStorage` para no pedirlo cada vez) y hacé `POST`.

---

## Endpoints públicos

Todos los endpoints públicos aceptan requests cross-origin (CORS abierto). No requieren autenticación.

### 1. `GET /api/public/[clientId]/chat/messages`

Obtiene mensajes del chat.

**Query params:**

| Param  | Tipo   | Default | Descripción                                                              |
| ------ | ------ | ------- | ------------------------------------------------------------------------ |
| `since`| ISO 8601 | —     | Si se envía, devuelve solo mensajes con `createdAt > since`. Usá esto para polling. |
| `limit`| number | 50      | Máximo de mensajes a devolver. Tope: 200.                                |

**Respuesta exitosa (200):**

```json
{
  "messages": [
    {
      "id": "cm123abc",
      "authorType": "listener",
      "name": "Juan",
      "body": "¡Buena canción!",
      "email": "juan@ejemplo.com",
      "ipAddress": null,
      "createdAt": "2026-07-13T14:23:11.000Z"
    },
    {
      "id": "cm124def",
      "authorType": "staff",
      "name": "Radio FM 99.5",
      "body": "Gracias por escucharnos",
      "email": null,
      "ipAddress": null,
      "createdAt": "2026-07-13T14:24:02.000Z"
    }
  ],
  "serverTime": "2026-07-13T14:25:00.000Z",
  "retentionHours": 48
}
```

**Posibles errores:**

| Status | Significado |
| ------ | ----------- |
| 404    | `clientId` no existe |
| 500    | Error del servidor |

### 2. `POST /api/public/[clientId]/chat/messages`

Envía un mensaje como oyente.

**Headers:**

```
Content-Type: application/json
```

**Body:**

```json
{
  "name": "Juan",
  "email": "juan@ejemplo.com",
  "body": "¡Buena canción!"
}
```

**Validaciones del servidor:**

- `name`: 2–60 caracteres, sin espacios al borde
- `email`: email válido, máx 120 caracteres
- `body`: 1–500 caracteres, sin espacios al borde

**Respuesta exitosa (201):**

```json
{
  "id": "cm125xyz",
  "authorType": "listener",
  "name": "Juan",
  "body": "¡Buena canción!",
  "email": "juan@ejemplo.com",
  "ipAddress": "190.55.xx.xx",
  "createdAt": "2026-07-13T14:26:30.000Z"
}
```

**Posibles errores:**

| Status | Mensaje                                            | Causa                                       |
| ------ | -------------------------------------------------- | ------------------------------------------- |
| 400    | `El nombre es muy corto`                           | `name` < 2 chars                            |
| 400    | `Email inválido`                                   | email mal formado                           |
| 400    | `El mensaje no puede estar vacío`                  | `body` vacío                                |
| 400    | `Máximo 500 caracteres`                            | `body` > 500 chars                          |
| 403    | `No podés escribir en este chat`                   | email o IP baneada                          |
| 404    | `Cliente no encontrado`                            | `clientId` no existe                        |
| 429    | `Demasiados mensajes. Esperá un momento.`          | rate limit: 5 mensajes/min por IP+email     |
| 500    | `Error interno del servidor`                       | error inesperado                            |

### 3. `GET /api/public/[clientId]/chat/online`

Devuelve el conteo de usuarios activos en los últimos 10 minutos.

**Respuesta exitosa (200):**

```json
{
  "count": 12,
  "recentNames": ["Juan", "María", "Carlos", "Lucía"],
  "serverTime": "2026-07-13T14:25:00.000Z"
}
```

Útil para mostrar un indicador tipo *"12 oyentes chateando"*.

---

## Implementación vanilla JavaScript

Copy-paste listo para un sitio HTML estático. Reemplazá `<TU_CLIENT_ID>` y el `BASE_URL`.

```html
<div id="ipstream-chat" data-client-id="<TU_CLIENT_ID>">
  <div class="ipstream-chat-header">
    <span class="ipstream-chat-title">Chat en vivo</span>
    <span class="ipstream-chat-online" data-online-count>–</span>
  </div>

  <ul class="ipstream-chat-messages" data-messages></ul>

  <form class="ipstream-chat-form" data-form>
    <input
      type="text"
      name="name"
      placeholder="Tu nombre"
      required
      minlength="2"
      maxlength="60"
      data-input-name
    />
    <input
      type="email"
      name="email"
      placeholder="tu@email.com"
      required
      maxlength="120"
      data-input-email
    />
    <div class="ipstream-chat-row">
      <input
        type="text"
        name="body"
        placeholder="Escribí un mensaje…"
        required
        minlength="1"
        maxlength="500"
        data-input-body
      />
      <button type="submit" data-submit>Enviar</button>
    </div>
    <p class="ipstream-chat-error" data-error hidden></p>
  </form>
</div>

<script>
(function () {
  const BASE_URL = 'https://tu-dominio.com';
  const CLIENT_ID = document
    .getElementById('ipstream-chat')
    .getAttribute('data-client-id');
  const POLL_MS = 4000;
  const STORAGE_KEY = 'ipstream_chat_identity';

  const root = document.getElementById('ipstream-chat');
  const list = root.querySelector('[data-messages]');
  const onlineEl = root.querySelector('[data-online-count]');
  const form = root.querySelector('[data-form]');
  const inputName = root.querySelector('[data-input-name]');
  const inputEmail = root.querySelector('[data-input-email]');
  const inputBody = root.querySelector('[data-input-body]');
  const submitBtn = root.querySelector('[data-submit]');
  const errorEl = root.querySelector('[data-error]');

  // --- Identidad persistente ---------------------------------------------
  function loadIdentity() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && parsed.name && parsed.email) return parsed;
    } catch (e) {}
    return null;
  }
  function saveIdentity(name, email) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ name, email }));
    } catch (e) {}
  }

  const identity = loadIdentity();
  if (identity) {
    inputName.value = identity.name;
    inputEmail.value = identity.email;
  }

  // --- Render -------------------------------------------------------------
  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function timeAgo(iso) {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 5) return 'ahora';
    if (diff < 60) return `hace ${diff}s`;
    if (diff < 3600) return `hace ${Math.floor(diff / 60)}m`;
    return `hace ${Math.floor(diff / 3600)}h`;
  }

  function renderMessage(msg) {
    const isStaff = msg.authorType === 'staff';
    const li = document.createElement('li');
    li.className = 'ipstream-chat-msg' + (isStaff ? ' is-staff' : '');
    li.dataset.id = msg.id;
    li.innerHTML = `
      <div class="ipstream-chat-avatar">${escapeHtml(msg.name.charAt(0).toUpperCase())}</div>
      <div class="ipstream-chat-bubble">
        <div class="ipstream-chat-meta">
          <span class="ipstream-chat-name">${escapeHtml(msg.name)}</span>
          ${isStaff ? '<span class="ipstream-chat-badge">Staff</span>' : ''}
          <span class="ipstream-chat-time">${timeAgo(msg.createdAt)}</span>
        </div>
        <p class="ipstream-chat-body">${escapeHtml(msg.body)}</p>
      </div>
    `;
    return li;
  }

  // --- Polling ------------------------------------------------------------
  let lastSince = null;
  let pollAbort = null;
  let seenIds = new Set();
  let userScrolledUp = false;

  list.addEventListener('scroll', () => {
    const atBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 50;
    userScrolledUp = !atBottom;
  });

  async function fetchMessages() {
    if (pollAbort) pollAbort.abort();
    pollAbort = new AbortController();
    const url = lastSince
      ? `${BASE_URL}/api/public/${CLIENT_ID}/chat/messages?since=${encodeURIComponent(lastSince)}&limit=100`
      : `${BASE_URL}/api/public/${CLIENT_ID}/chat/messages?limit=50`;
    try {
      const res = await fetch(url, { signal: pollAbort.signal });
      if (!res.ok) return;
      const data = await res.json();
      const msgs = data.messages || [];
      if (msgs.length === 0 && !lastSince) {
        // No había mensajes: noop. Si necesitamos un cursor lo pedimos igual.
        lastSince = data.serverTime;
        return;
      }
      if (msgs.length > 0) {
        const newOnes = msgs.filter((m) => !seenIds.has(m.id));
        for (const m of newOnes) {
          list.appendChild(renderMessage(m));
          seenIds.add(m.id);
        }
        if (!userScrolledUp) {
          list.scrollTop = list.scrollHeight;
        }
        lastSince = msgs[msgs.length - 1].createdAt;
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.error('Chat poll error', err);
    }
  }

  async function fetchOnline() {
    try {
      const res = await fetch(`${BASE_URL}/api/public/${CLIENT_ID}/chat/online`);
      if (!res.ok) return;
      const data = await res.json();
      onlineEl.textContent =
        data.count > 0 ? `${data.count} en línea` : '—';
    } catch (err) {}
  }

  // --- Envío --------------------------------------------------------------
  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.hidden = !msg;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    showError(null);
    const name = inputName.value.trim();
    const email = inputEmail.value.trim();
    const body = inputBody.value.trim();
    if (!name || !email || !body) {
      showError('Completá nombre, email y mensaje');
      return;
    }
    submitBtn.disabled = true;
    try {
      const res = await fetch(`${BASE_URL}/api/public/${CLIENT_ID}/chat/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, body }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Error ${res.status}`);
      }
      saveIdentity(name, email);
      inputBody.value = '';
      // El mensaje aparecerá en el próximo poll. Opcional: append inmediato:
      const created = await res.json();
      if (!seenIds.has(created.id)) {
        list.appendChild(renderMessage(created));
        seenIds.add(created.id);
        list.scrollTop = list.scrollHeight;
        lastSince = created.createdAt;
      }
    } catch (err) {
      showError(err.message);
    } finally {
      submitBtn.disabled = false;
    }
  }

  form.addEventListener('submit', handleSubmit);
  inputBody.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      form.requestSubmit();
    }
  });

  // --- Boot ---------------------------------------------------------------
  fetchMessages();
  fetchOnline();
  setInterval(fetchMessages, POLL_MS);
  setInterval(fetchOnline, 30000);
})();
</script>
```

---

## Implementación React

Si tu sitio está hecho en React / Next.js, esto es más limpio usando hooks.

```tsx
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const BASE_URL = 'https://tu-dominio.com';
const POLL_MS = 4000;
const STORAGE_KEY = 'ipstream_chat_identity';

interface ChatMessage {
  id: string;
  authorType: 'listener' | 'staff';
  name: string;
  body: string;
  email: string | null;
  ipAddress: string | null;
  createdAt: string;
}

interface ChatOnline {
  count: number;
  recentNames: string[];
  serverTime: string;
}

interface ChatClientProps {
  clientId: string;
  baseUrl?: string;
}

export function ChatClient({ clientId, baseUrl = BASE_URL }: ChatClientProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [online, setOnline] = useState<ChatOnline | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastSinceRef = useRef<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const userScrolledUpRef = useRef(false);

  // Hidratar identidad de localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const id = JSON.parse(raw);
        if (id?.name) setName(id.name);
        if (id?.email) setEmail(id.email);
      }
    } catch {}
  }, []);

  const scrollToBottom = (force = false) => {
    if (!listRef.current) return;
    if (force || !userScrolledUpRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  };

  const handleScroll = () => {
    if (!listRef.current) return;
    const atBottom =
      listRef.current.scrollHeight -
        listRef.current.scrollTop -
        listRef.current.clientHeight <
      50;
    userScrolledUpRef.current = !atBottom;
  };

  const poll = useCallback(async () => {
    try {
      const since = lastSinceRef.current;
      const url = since
        ? `${baseUrl}/api/public/${clientId}/chat/messages?since=${encodeURIComponent(since)}&limit=100`
        : `${baseUrl}/api/public/${clientId}/chat/messages?limit=50`;
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      const msgs: ChatMessage[] = data.messages || [];
      if (msgs.length > 0) {
        setMessages((prev) => {
          const seen = new Set(prev.map((m) => m.id));
          const merged = [...prev];
          for (const m of msgs) {
            if (!seen.has(m.id)) merged.push(m);
          }
          return merged;
        });
        lastSinceRef.current = msgs[msgs.length - 1].createdAt;
        scrollToBottom(false);
      } else if (!since) {
        // No hay cursor aún: usamos serverTime como base
        lastSinceRef.current = data.serverTime;
      }
    } catch (err) {
      console.error('Chat poll error', err);
    }
  }, [baseUrl, clientId]);

  const fetchOnline = useCallback(async () => {
    try {
      const res = await fetch(`${baseUrl}/api/public/${clientId}/chat/online`);
      if (!res.ok) return;
      const data: ChatOnline = await res.json();
      setOnline(data);
    } catch {}
  }, [baseUrl, clientId]);

  useEffect(() => {
    poll();
    fetchOnline();
    const p = setInterval(poll, POLL_MS);
    const o = setInterval(fetchOnline, 30000);
    return () => {
      clearInterval(p);
      clearInterval(o);
    };
  }, [poll, fetchOnline]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending) return;
    setError(null);
    const n = name.trim();
    const em = email.trim();
    const b = body.trim();
    if (!n || !em || !b) {
      setError('Completá nombre, email y mensaje');
      return;
    }
    setSending(true);
    try {
      const res = await fetch(`${baseUrl}/api/public/${clientId}/chat/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: n, email: em, body: b }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || `Error ${res.status}`);
      }
      const created: ChatMessage = await res.json();
      setMessages((prev) =>
        prev.some((m) => m.id === created.id) ? prev : [...prev, created]
      );
      lastSinceRef.current = created.createdAt;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ name: n, email: em }));
      } catch {}
      setBody('');
      scrollToBottom(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="ipstream-chat">
      <div className="ipstream-chat-header">
        <span className="ipstream-chat-title">Chat en vivo</span>
        {online && <span className="ipstream-chat-online">{online.count} en línea</span>}
      </div>
      <div className="ipstream-chat-messages" ref={listRef} onScroll={handleScroll}>
        {messages.map((m) => (
          <ChatMessageBubble key={m.id} message={m} />
        ))}
      </div>
      <form className="ipstream-chat-form" onSubmit={handleSubmit}>
        <div className="ipstream-chat-row">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tu nombre"
            maxLength={60}
            minLength={2}
            required
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            maxLength={120}
            required
          />
        </div>
        <div className="ipstream-chat-row">
          <input
            type="text"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Escribí un mensaje…"
            maxLength={500}
            required
          />
          <button type="submit" disabled={sending}>
            {sending ? 'Enviando…' : 'Enviar'}
          </button>
        </div>
        {error && <p className="ipstream-chat-error">{error}</p>}
      </form>
    </div>
  );
}

function ChatMessageBubble({ message }: { message: ChatMessage }) {
  const isStaff = message.authorType === 'staff';
  const date = new Date(message.createdAt);
  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return (
    <div className={`ipstream-chat-msg${isStaff ? ' is-staff' : ''}`}>
      <div className="ipstream-chat-avatar">
        {message.name.charAt(0).toUpperCase()}
      </div>
      <div className="ipstream-chat-bubble">
        <div className="ipstream-chat-meta">
          <span className="ipstream-chat-name">{message.name}</span>
          {isStaff && <span className="ipstream-chat-badge">Staff</span>}
          <span className="ipstream-chat-time">{time}</span>
        </div>
        <p className="ipstream-chat-body">{message.body}</p>
      </div>
    </div>
  );
}
```

---

## Estilos sugeridos

Acá hay un CSS mínimo y moderno (dark mode) que podés usar de base. Adáptalo a los colores de tu radio.

```css
:root {
  --chat-bg: #1a1d24;
  --chat-bg-alt: #232730;
  --chat-border: #2e333d;
  --chat-text: #e5e7eb;
  --chat-text-dim: #9ca3af;
  --chat-accent: #06b6d4;
  --chat-staff: #fbbf24;
  --chat-radius: 12px;
}

.ipstream-chat {
  display: flex;
  flex-direction: column;
  background: var(--chat-bg);
  border: 1px solid var(--chat-border);
  border-radius: var(--chat-radius);
  height: 600px;
  max-width: 480px;
  margin: 0 auto;
  font-family: system-ui, -apple-system, sans-serif;
  color: var(--chat-text);
  overflow: hidden;
}

.ipstream-chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--chat-border);
  background: var(--chat-bg-alt);
}

.ipstream-chat-title {
  font-weight: 600;
}

.ipstream-chat-online {
  font-size: 12px;
  color: var(--chat-text-dim);
}

.ipstream-chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ipstream-chat-msg {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}

.ipstream-chat-msg.is-staff .ipstream-chat-bubble {
  background: rgba(6, 182, 212, 0.1);
  border-color: var(--chat-accent);
}

.ipstream-chat-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--chat-bg-alt);
  border: 1px solid var(--chat-border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
  flex-shrink: 0;
}

.ipstream-chat-bubble {
  background: var(--chat-bg-alt);
  border: 1px solid var(--chat-border);
  border-radius: 10px;
  padding: 8px 12px;
  max-width: 80%;
}

.ipstream-chat-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
  font-size: 12px;
}

.ipstream-chat-name {
  font-weight: 600;
  color: var(--chat-text);
}

.ipstream-chat-badge {
  background: var(--chat-accent);
  color: #0a0e14;
  font-size: 10px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 4px;
  text-transform: uppercase;
}

.ipstream-chat-time {
  color: var(--chat-text-dim);
  margin-left: auto;
}

.ipstream-chat-body {
  margin: 0;
  word-wrap: break-word;
  line-height: 1.4;
}

.ipstream-chat-form {
  border-top: 1px solid var(--chat-border);
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ipstream-chat-row {
  display: flex;
  gap: 8px;
}

.ipstream-chat-row input {
  flex: 1;
  padding: 8px 10px;
  background: var(--chat-bg-alt);
  border: 1px solid var(--chat-border);
  border-radius: 6px;
  color: var(--chat-text);
  font-size: 14px;
  font-family: inherit;
}

.ipstream-chat-row input:focus {
  outline: none;
  border-color: var(--chat-accent);
}

.ipstream-chat-row button {
  padding: 8px 16px;
  background: var(--chat-accent);
  color: #0a0e14;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  font-size: 14px;
}

.ipstream-chat-row button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ipstream-chat-error {
  color: #fca5a5;
  font-size: 12px;
  margin: 0;
}
```

---

## Manejo de estados y errores

### Rate limiting (5 mensajes/min por IP+email)

El servidor responde `429` cuando el usuario excede el límite. Mostrá un mensaje claro:

```js
if (res.status === 429) {
  setError('Estás enviando muy rápido. Esperá unos segundos.');
  return;
}
```

### Mensajes baneados (403)

Si el email o la IP del usuario está baneada, el servidor responde `403`. No muestres detalles al usuario; mostrá algo neutro:

```js
if (res.status === 403) {
  setError('No podés escribir en este chat.');
  return;
}
```

### Errores de red

El fetch puede fallar por CORS, DNS, timeout, etc. Mostrá un error genérico y reintentá:

```js
catch (err) {
  setError('Error de conexión. Reintentá en unos segundos.');
}
```

### Reconexión automática

Si la pestaña vuelve a estar activa después de un rato, traé los mensajes perdidos:

```js
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    poll();
    fetchOnline();
  }
});
```

---

## Performance y polling

### ¿Cada cuánto preguntar?

- **3–5 segundos**: recomendado. Balance entre frescura y carga del servidor.
- **>10 segundos**: el chat se siente lento.
- **<2 segundos**: no aporta mucho valor, gasta batería y datos.

### Limpiar el intervalo

Si la página no está visible, pausá el polling para ahorrar batería y datos:

```js
let intervalId;
function startPolling() {
  intervalId = setInterval(poll, 4000);
}
function stopPolling() {
  clearInterval(intervalId);
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) stopPolling();
  else {
    startPolling();
    poll(); // fetch inmediato al volver
  }
});
```

### Long polling (opcional)

Si necesitás menor latencia sin WebSockets, podés usar un timeout en el servidor (requiere cambio del lado IPStream, no incluido en esta versión). Por ahora, polling regular alcanza.

### Caché

Usá `cache: 'no-store'` en el `fetch` para que el navegador no cachee respuestas. Si el navegador cachea, el polling se rompe.

---

## Seguridad y buenas prácticas

### Escapar HTML (anti-XSS)

**SIEMPRE** escapá el contenido de los mensajes antes de inyectarlo en el DOM. La API no escapa por vos. Si usás `innerHTML` directamente con datos del servidor, un atacante podría inyectar scripts.

**Con React:** usar `{message.body}` es seguro por defecto.
**Con vanilla JS:** usá la función `escapeHtml` del ejemplo anterior o `textContent` en lugar de `innerHTML`.

### Validación en el cliente

Las validaciones de la API son la fuente de verdad, pero validá también del lado del cliente para mejor UX:

```js
if (body.length > 500) {
  setError('Máximo 500 caracteres');
  return;
}
```

### No confíes en `authorType === 'staff'`

El campo `authorType` viene del servidor, no del cliente. El servidor **fuerza** que solo el dashboard pueda setear `staff`. Pero en el cliente, mostrale al usuario que el staff tiene un badge distintivo. Si en algún momento un atacante intenta mandar un POST con `authorType: 'staff'`, el servidor lo ignora.

### Persistencia del email

El email se guarda en `localStorage` para no pedirlo cada vez. Si querés más privacidad, pedilo cada vez que el usuario quiera enviar un mensaje (sin guardar nada).

### HTTPS obligatorio

En producción, usá siempre HTTPS. La API no valida el origen (CORS abierto) pero las cookies de sesión y los headers viajan en claro si no usás TLS.

---

## Troubleshooting

### No llegan mensajes al hacer polling

1. **Verificá el `clientId`:** asegurate de que coincida con el de tu dashboard (`/dashboard/api-test`).
2. **Mirá la consola del navegador:** errores 404 indican `clientId` incorrecto; 500 indica problema del servidor.
3. **Probá con `curl`:**
   ```bash
   curl https://tu-dominio.com/api/public/<TU_CLIENT_ID>/chat/messages?limit=5
   ```
4. **Verificá CORS:** si ves "blocked by CORS policy", revisá que el endpoint tenga los headers correctos. La API los manda automáticamente, pero un proxy intermedio podría estar quitándolos.

### Los mensajes del staff no aparecen

Los mensajes con `authorType: 'staff'` aparecen con un badge distintivo. Si no los ves, asegurate de que el dashboard los esté enviando correctamente. Los mensajes del staff **solo** pueden crearse desde el dashboard, no desde la API pública.

### Rate limit 429 muy rápido

El límite es 5 mensajes por minuto **por combinación de IP + email**. Si estás probando desde la misma IP con muchos usuarios simulados, el límite se va a disparar rápido. En producción con usuarios reales, no deberías verlo.

### El servidor devuelve 500

Es un error del lado de IPStream. Reportalo a soporte con:
- El `clientId` afectado
- El endpoint y método
- La hora aproximada
- El cuerpo de la request que estabas mandando

### Mensajes desaparecen a las 48h

Es el comportamiento esperado. La política de retención es 48h y los mensajes se borran con un cron automático. Si necesitás un historial más largo, contactá al equipo de IPStream.

---

## Anexo: endpoint completo de referencia

| Verbo | Path | Auth | Descripción |
| --- | --- | --- | --- |
| `GET` | `/api/public/{clientId}/chat/messages?since=&limit=` | No | Obtener mensajes (polling) |
| `POST` | `/api/public/{clientId}/chat/messages` | No | Enviar mensaje como oyente |
| `GET` | `/api/public/{clientId}/chat/online` | No | Oyentes activos últimos 10 min |

`{clientId}` se reemplaza por el ID único de tu radio.

---

¿Dudas? Mirá `/dashboard/api-test` en tu panel de IPStream para probar los endpoints en vivo, o revisá el README.md del proyecto.
