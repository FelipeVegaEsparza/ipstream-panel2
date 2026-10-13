# Spec Delta

## Purpose

Define cómo las respuestas de contenido público read-only del panel (consumidas por la PWA de los clientes) se declaran cacheables, para que un proxy/CDN absorba el tráfico masivo de oyentes sin cargar el proceso Node.

## ADDED Requirements

### Requirement: Cabeceras de caché en contenido público read-only
El sistema SHALL declarar cacheables los endpoints públicos GET de contenido que no dependen de la identidad ni del estado en tiempo real, respondiendo con `Cache-Control: public, s-maxage=60, stale-while-revalidate=300`. Aplica, entre otros, a basic-data, noticias, programas, sponsors, promotions, announcers, podcasts, videos, galleries, events, social-networks, gc-bar y el listado de polls.

#### Scenario: Endpoint de contenido público declara caché
- **WHEN** un consumidor hace GET a un endpoint público de contenido (por ejemplo noticias o programas)
- **THEN** la respuesta incluye `Cache-Control: public, s-maxage=60, stale-while-revalidate=300`

#### Scenario: El proxy puede servir contenido cacheado
- **WHEN** un proxy/CDN intermedio recibe la respuesta con esa cabecera
- **THEN** puede reutilizar la respuesta para otros consumidores durante el `s-maxage` sin reenviar la petición al panel

### Requirement: Datos dinámicos o personalizados permanecen sin caché
El sistema MUST NOT declarar cacheables los endpoints públicos que dependen del estado en tiempo real, de la identidad, de votos o de escritura; estos mantienen `no-store` (o equivalente).

#### Scenario: Estado en tiempo real no se cachea
- **WHEN** un consumidor hace GET a estado de streaming, programación actual o chat en línea
- **THEN** la respuesta no se marca como cacheable públicamente

#### Scenario: Escrituras no se cachean
- **WHEN** se recibe una petición de escritura pública (por ejemplo enviar un mensaje de contacto o registrar un voto)
- **THEN** la respuesta no se marca como cacheable
