---
name: CasterFly Control Room
description: Panel de operación para emisoras de radio y TV
colors:
  signal: "#28b4f0"
  signal-light: "#0b72c4"
  live: "#3ddc97"
  warn: "#e8b45a"
  danger: "#e5645f"
  surface-0: "#0b0e12"
  surface-1: "#0e1217"
  surface-2: "#131920"
  surface-3: "#1a222b"
  line: "#232c36"
  text-1: "#e7ecf2"
  text-2: "#9ba7b5"
  text-3: "#758392"
  light-surface-0: "#f6f7f9"
  light-surface-1: "#ffffff"
  light-surface-3: "#f0f2f5"
  light-line: "#dfe3e8"
  light-text-1: "#14181f"
  light-text-2: "#5b6675"
typography:
  display:
    fontFamily: "Archivo, Inter, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.33
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Archivo, Inter, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: "0em"
  body:
    fontFamily: "Archivo, Inter, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.54
    letterSpacing: "0em"
  small:
    fontFamily: "Archivo, Inter, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0em"
  meta:
    fontFamily: "Archivo, Inter, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 500
    lineHeight: 1.45
    letterSpacing: "0em"
  label:
    fontFamily: "Archivo, Inter, system-ui, sans-serif"
    fontSize: "0.625rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0em"
  caption:
    fontFamily: "Archivo, Inter, system-ui, sans-serif"
    fontSize: "0.5625rem"
    fontWeight: 500
    lineHeight: 1.35
    letterSpacing: "0em"
  micro:
    fontFamily: "Archivo, Inter, system-ui, sans-serif"
    fontSize: "0.5rem"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "0em"
  metric:
    fontFamily: "Martian Mono, ui-monospace, monospace"
    fontSize: "1.5rem"
    fontWeight: 500
    lineHeight: 1.16
    letterSpacing: "-0.02em"
rounded:
  control: "8px"
  panel: "10px"
  container: "12px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.signal}"
    textColor: "#ffffff"
    typography: "{typography.title}"
    rounded: "{rounded.control}"
    padding: "8px 12px"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.text-1}"
    typography: "{typography.title}"
    rounded: "{rounded.control}"
    padding: "6px 12px"
  panel:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.text-1}"
    rounded: "{rounded.panel}"
    padding: "16px"
  nav-item-active:
    backgroundColor: "{colors.surface-3}"
    textColor: "{colors.text-1}"
    typography: "{typography.title}"
    rounded: "{rounded.control}"
    padding: "8px 10px"
  metric-cell:
    backgroundColor: "transparent"
    textColor: "{colors.text-1}"
    typography: "{typography.metric}"
    padding: "16px"
---

# Design System: CasterFly Control Room

## Overview

**Creative North Star: "The Control Room"**

El panel del cliente se comporta como una consola de operación: primero el estado de la emisora, después las métricas y por último lo que requiere atención. La densidad es deliberada, pero la jerarquía evita que todo compita al mismo volumen. La superficie es grafito en tema oscuro y papel frío en tema claro; el cyan de marca aparece solo cuando señala una acción, un foco o una señal.

El sistema rechaza el look de plantilla: sin gradientes decorativos, sin blobs, sin glassmorphism y sin una paleta arcoíris para métricas. La profundidad se logra con capas tonales y líneas de 1px, no con sombras grandes. La firma es la franja **On Air**, una rundown de emisión con estado, tema actual, siguiente y audiencia.

**Key Characteristics:**
- Superficies planas y bordes de 1px.
- Un solo color de señal: cyan de marca.
- Semántica estricta para vivo, advertencia y error.
- Tipografía de trabajo con métricas tabulares.
- Densidad de consola, no de landing.

## Colors

Paleta de operación: grafito, texto en tres niveles y un cyan reservado para señal.

### Primary
- **Signal Cyan** (#28b4f0 en oscuro, #0b72c4 en claro): acción primaria, enlaces, foco y marcas de señal. No se usa como fondo decorativo.

### Neutral
- **Control Ink** (#0b0e12): fondo de la aplicación en oscuro.
- **Rail Graphite** (#0e1217): sidebar y header.
- **Panel Graphite** (#131920): paneles y superficies de contenido.
- **Raised Graphite** (#1a222b): hover, selección y estados activos.
- **Hairline** (#232c36): bordes de 1px y separadores.
- **Primary Text** (#e7ecf2): títulos y datos principales.
- **Secondary Text** (#9ba7b5): descripciones y metadatos.
- **Tertiary Text** (#758392): labels y texto auxiliar.

### Named Rules
**The One Signal Rule.** El cyan no decora: solo aparece en acciones, foco, enlaces y la marca de "al aire". Si no comunica una acción o un estado, no lleva cyan.

**The Semantic Color Rule.** Verde, ámbar y rojo solo existen para vivo, advertencia y error. Nunca para diferenciar tarjetas o métricas.

## Typography

**Display Font:** Archivo (con Inter y system-ui de fallback)  
**Body Font:** Archivo (con Inter y system-ui de fallback)  
**Label/Mono Font:** Martian Mono (con ui-monospace de fallback)

**Character:** Archivo aporta una grotesca de trabajo con más carácter que una sans genérica; Martian Mono se reserva para cifras, tiempo y datos que deben alinearse.

### Hierarchy
- **Display** (600, 1.5rem/1.33, -0.025em): nombre de la emisora y títulos de página.
- **Title** (500, 0.8125rem/1.54): encabezados de sección, nombres de temas y controles.
- **Body** (400, 0.8125rem/1.54): descripciones, metadatos y texto de interfaz.
- **Label** (500, 0.625rem/1.4): etiquetas de métricas y estados.
- **Metric** (500, 1.5rem/1.16, -0.02em, tabular): oyentes, espectadores, almacenamiento y créditos.

### Named Rules
**The Tabular Data Rule.** Toda cifra que cambia en vivo usa Martian Mono con `font-variant-numeric: tabular-nums`; el ancho no salta cuando cambia el valor.

## Layout

Shell de 248px de rail fijo en escritorio y drawer en móvil. Header de 56px, borde inferior de 1px y fondo sólido. Contenido centrado con máximo de 1440px y padding de 24–40px según breakpoint. La home se compone en bandas: identidad, On Air, métricas, atención y cierre. El ritmo vertical base es de 24–28px entre bandas y 16px dentro de paneles.

## Elevation & Depth

El sistema es plano por defecto. La profundidad se comunica con capas tonales (`surface-0` a `surface-3`) y líneas de 1px, no con sombras. La única sombra permitida es la de popovers y menús desplegables.

### Shadow Vocabulary
- **Popover** (`0 12px 32px -16px rgba(0, 0, 0, 0.45)`): menús, dropdowns y capas flotantes.

### Named Rules
**The Flat-By-Default Rule.** Las superficies base no llevan sombra. Si una capa necesita sombra, es porque flota sobre otra.

## Shapes

Radios contenidos: 8px para controles, 10px para paneles y 12px para contenedores grandes. Los pills se reservan para estados y badges. Los bordes son de 1px; no se usan bordes laterales gruesos ni decorativos.

## Components

### Buttons
- **Shape:** radio de 8px.
- **Primary:** fondo cyan de señal, texto blanco, padding 8px 12px, tipografía 13px/500.
- **Hover / Focus:** hover con brillo leve; foco visible con outline cyan de 2px y offset 2px.
- **Secondary / Ghost:** fondo transparente, borde de 1px, texto primario; hover sobre `surface-3`.

### Cards / Containers
- **Corner Style:** 10px para paneles, 12px para contenedores.
- **Background:** `surface-2` en oscuro y `surface-1` en claro.
- **Shadow Strategy:** sin sombra; ver Elevation & Depth.
- **Border:** 1px `line`.
- **Internal Padding:** 16px, 20px en bloques de operación.

### Inputs / Fields
- **Style:** fondo `surface-2`, borde de 1px y radio de 8px.
- **Focus:** borde y ring cyan.
- **Error / Disabled:** rojo semántico y opacidad reducida.

### Navigation
- **Style:** rail de 248px, items de 36px, iconos de 18px, texto 13px/500.
- **Active:** fondo `surface-3` y una marca de señal de 1px a la izquierda.
- **Mobile:** drawer de 280px con los mismos grupos y estados.

### Metric Row
- **Style:** celdas de 16px separadas por líneas de 1px, sin tarjetas individuales.
- **Values:** Martian Mono tabular, 24px/500.
- **Labels:** 10px/500 en texto terciario.

### On Air Ribbon
- **Style:** panel de borde 1px con cabecera propia y una o dos columnas según los servicios activos.
- **States:** vivo con punto verde semántico; AutoDJ con punto de señal; fuera del aire con texto y acción.
- **Content:** estado, audiencia, tema actual, siguiente y acción a la consola.

## Do's and Don'ts

### Do:
- **Do** usar `surface-*`, `line`, `text-*` y `signal` como tokens semánticos.
- **Do** reservar el cyan para acción, foco, enlace y señal de emisión.
- **Do** usar cifras tabulares para métricas que cambian.
- **Do** dejar que el estado On Air sea el bloque dominante de la home.
- **Do** mantener el mismo lenguaje en tema claro y oscuro.

### Don't:
- **Don't** usar gradientes decorativos, blobs, glassmorphism ni sombras grandes.
- **Don't** usar una paleta arcoíris para métricas o tarjetas.
- **Don't** usar `hover:scale`, emojis en controles ni íconos como decoración.
- **Don't** poner bordes laterales gruesos o tarjetas dentro de tarjetas.
- **Don't** usar monospace fuera de datos, tiempo o medidas.
