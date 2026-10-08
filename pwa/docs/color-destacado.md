# Color destacado por cliente (`accentColor`)

Cada radio/TV puede elegir, además de la plantilla, un color de acento libre que
el sitio aplica en runtime, sin recompilar.

## Fuente de datos

El color viene en la respuesta completa del cliente:

```
GET https://panelipstream.cl/api/public/{clientId}
```

Campo raíz nuevo, hermano de `selectedTemplate`:

```json
{
  "client": { "id": "cm...", "name": "Radio Ejemplo FM" },
  "selectedTemplate": "moderno2",
  "accentColor": "#ff6b00",
  "oneSignalAppId": null,
  "basicData": { "...": "..." },
  "...": "..."
}
```

- Tipo: `string | null`.
- Formato: `#rrggbb` en minúsculas.
- `null` = usar el color propio de la plantilla (no es error).
- La API nunca devuelve valores inválidos: si el guardado es inválido, responde
  `null`.
- **Solo** viene en la raíz de `GET /api/public/{clientId}`; no en `/basic-data`.

## Cómo se aplica

1. El shell lee `clientData.accentColor` y deriva las variantes.
2. Las escribe como variables CSS en `:root`:
   - `--brand-accent`
   - `--brand-accent-hover`
   - `--brand-accent-rgb` (formato `r, g, b`, para `rgba(...)`)
   - `--brand-accent-soft` (rgba tenue)
   - `--brand-accent-contrast` (texto legible sobre el acento)
3. Si el color es `null` o inválido, **no** se setean y cada plantilla usa su
   acento propio.

Cada plantilla consume los tokens canónicos con su color como fallback, por
ejemplo `--content-accent: var(--brand-accent, #ff9500)`. Así el override
realmente aplica (las variables se definen en `.page`, que es descendiente).

### Protagonismo

Para que el acento tenga más presencia sin romper el diseño, cuando hay color se
activa el flag `--brand-accent-on: 1` y:

- Los títulos de sección muestran una **marca de acento** (barra vertical). Sin
  color, el ancho es `0` y no cambia nada.
- El reproductor inferior usa el acento en su **borde superior**.
- Los **fondos con gradiente** de los templates incluyen un realce derivado del
  acento (`rgba(var(--brand-accent-rgb, ...), alpha)` en los gradientes que ya
  existían, o un `--brand-accent-soft` añadido en los fondos planos). Sin color,
  el realce es el original/transparente y no cambia nada.
- Se mantienen las tipografías y la estructura base de cada plantilla.

## Derivación de variantes

`deriveAccent(hex)` en `src/core/color`:

- `hover`: acento oscurecido ~10%.
- `soft`: `rgba(accent, 0.15)`.
- `contrast`: `#ffffff` o `#000000` según la luminancia (WCAG).

## Alcance por tipo de plantilla

- **Un solo acento** (`app`, `moderno`, `moderna`, `tradicional`, `playlist`,
  `moderno2`): se reemplaza el acento.
- **Bi-tono** (`petroleo`, `blue`): se reemplaza el primario y se conserva el
  secundario (el acento claro/alterno del diseño).
- **Acento claro** (`covered`, `minimalista`): se reemplaza su acento claro y se
  deriva el texto de contraste.

## Archivos involucrados

- `src/core/color/index.ts` — validación, normalización y derivación.
- `src/modules/theme/useAccentTheme.ts` — aplica los tokens en `:root`.
- `src/templates/index.tsx` — `TemplateSlot` llama al hook con `accentColor`.
- `src/templates/*/*.module.css` — consumen los tokens canónicos con fallback.
