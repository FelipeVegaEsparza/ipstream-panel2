## Context

`/admin/settings` usa un layout de tabs (Radix) con 5 pestañas; 3 de ellas montan componentes que son shells sin backend. La página es un Server Component (`page.tsx`) que renderiza `Tabs`/`TabsList`/`TabsContent`. El cambio es puramente de UI: reducir a 2 pestañas funcionales y eliminar los componentes huérfanos.

## Goals / Non-Goals

**Goals:**
- Dejar `/admin/settings` con solo las pestañas **Sistema** y **Login**.
- Eliminar los componentes `SecuritySettings`, `NotificationSettings`, `BackupSettings`.
- No dejar imports muertos ni código huérfano.

**Non-Goals:**
- Crear backend para las secciones eliminadas (no hay intención de implementarlas).
- Cambiar el comportamiento de Sistema o Login.
- Tocar modelos Prisma ni datos.

## Decisions

### 1. Solo editar `page.tsx` y borrar componentes
Se reduce el `TabsList` a `grid-cols-2` con los triggers Sistema y Login, y se eliminan los `TabsContent` correspondientes a las 3 secciones. Se borran los imports de los 3 componentes y los archivos.
- **Alternativa**: dejar las pestañas ocultas (CSS/condicional) → descartada, deja código muerto y archivos huérfanos.

### 2. Eliminar los archivos de componentes huérfanos
Se borran `components/admin/SecuritySettings.tsx`, `NotificationSettings.tsx`, `BackupSettings.tsx`. No hay otros consumidores (verificado por búsqueda de imports).
- **Alternativa**: conservarlos por si se reimplementan → descartada, son shells que no persisten nada; el historial de git los preserva.

### 3. Sin cambios en endpoints ni datos
Los endpoints que llamaban los componentes eliminados nunca existieron; no se crean ni se borran.

## Risks / Trade-offs

- **Alguien esperaba esas secciones** → [Riesgo] Mitigación: eran shells no funcionales (guardar siempre fallaba); eliminar mejora la honestidad de la UI.
- **`grid-cols-2` con 2 tabs** → [Riesgo] Mitigación: ajuste cosmético trivial; el layout de Radix sigue igual.

## Migration Plan

1. Commit + push → deploy por GitHub Actions.
2. Rollback: restaurar `page.tsx` y los 3 componentes desde git (todo el cambio es local a la UI).

## Open Questions

- Ninguna.
