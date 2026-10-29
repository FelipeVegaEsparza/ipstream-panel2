import test from 'node:test'
import assert from 'node:assert/strict'

process.env.STREAMING_AGENT_TOKEN = 'test-agent-token'
process.env.HARBOR_CALLBACK_SECRET = 'test-harbor-secret'
process.env.DB_USER = 'test'
process.env.DB_PASSWORD = 'test'
process.env.DB_DATABASE = 'test'
process.env.ICE_ADMIN_USER = 'admin'
process.env.ICE_ADMIN_PASSWORD = 'test'
process.env.ICE_SOURCE_PASSWORD = 'test'
process.env.ICE_RELAY_PASSWORD = 'test'
process.env.ICE_HOSTNAME = 'localhost'
process.env.HARBOR_PUBLIC_HOSTNAME = 'localhost'

const { normalizeTrackMetadata, normalizeMetadataValue } = await import('../lib/title-normalizer.js')
const { parseFilename } = await import('../lib/id3.js')

test('quita sufijos técnicos del título', () => {
  const result = normalizeTrackMetadata({
    title: 'Mi Canción (Official Video) [HD]',
    artist: 'Artista',
  })
  assert.equal(result.title, 'Mi Canción')
  assert.equal(result.artist, 'Artista')
  assert.equal(result.changed, true)
})

test('normaliza un nombre de archivo con numeración y guiones bajos', () => {
  const parsed = parseFilename('03_Mi_Banda_-_Otra_Canción.mp3')
  const result = normalizeTrackMetadata(parsed)
  assert.equal(result.title, 'Otra Canción')
  assert.equal(result.artist, 'Mi Banda')
})

test('quita anotaciones de versión y año', () => {
  const result = normalizeTrackMetadata({ title: 'Tema Central (Remix) (2021)', artist: null })
  assert.equal(result.title, 'Tema Central')
  assert.equal(result.artist, null)
})

test('no altera un texto ya limpio', () => {
  const result = normalizeTrackMetadata({ title: 'Como Ti', artist: 'Camilo' })
  assert.equal(result.title, 'Como Ti')
  assert.equal(result.artist, 'Camilo')
  assert.equal(result.changed, false)
})

test('conserva el valor original si la limpieza lo dejaría vacío', () => {
  assert.equal(normalizeMetadataValue('(Official Video)'), '(Official Video)')
  const result = normalizeTrackMetadata({ title: '(Official Video)', artist: '[HD]' })
  assert.equal(result.title, '(Official Video)')
  assert.equal(result.artist, '[HD]')
  assert.equal(result.changed, false)
})

test('es idempotente', () => {
  const first = normalizeTrackMetadata({
    title: '03 - Otra Canción (Official Video) [320kbps]',
    artist: 'Mi Banda (Remix)',
  })
  const second = normalizeTrackMetadata({ title: first.title, artist: first.artist })
  assert.equal(second.title, first.title)
  assert.equal(second.artist, first.artist)
  assert.equal(second.changed, false)
})

test('no corta palabras no delimitadas que parecen versiones', () => {
  assert.equal(normalizeMetadataValue('Live and Let Die'), 'Live and Let Die')
  assert.equal(normalizeMetadataValue('Cover Me'), 'Cover Me')
  assert.equal(normalizeMetadataValue('1999'), '1999')
})

test('conserva nombres de artista que empiezan con un número sin separador', () => {
  assert.equal(normalizeMetadataValue('30 Seconds to Mars'), '30 Seconds to Mars')
  assert.equal(normalizeMetadataValue('24 Horas'), '24 Horas')
})

test('quita URLs y dominios', () => {
  assert.equal(
    normalizeMetadataValue('Tema https://example.com/x www.midominio.cl'),
    'Tema'
  )
})

test('quita el nombre del artista del inicio del título', () => {
  const result = normalizeTrackMetadata({
    title: 'Viejas Locas - Me Gustas Mucho',
    artist: 'Viejas Locas',
  })
  assert.equal(result.title, 'Me Gustas Mucho')
  assert.equal(result.artist, 'Viejas Locas')
})

test('quita prefijo de artista cuando el campo trae varios artistas', () => {
  const result = normalizeTrackMetadata({
    title: 'Turf - Pasos al costado HD',
    artist: 'PopArt Discos, Turf',
  })
  assert.equal(result.title, 'Pasos al costado')
})

test('quita prefijo con feat. y canal de YouTube', () => {
  assert.equal(
    normalizeTrackMetadata({
      title: 'Los Piojos - El farolito (Con letra)',
      artist: 'Canal Piojoso',
    }).title,
    'El farolito'
  )
  assert.equal(
    normalizeTrackMetadata({
      title: 'Ratones Paranoicos ft Andrés Calamaro - Para siempre HD',
      artist: 'PopArt Discos',
    }).title,
    'Para siempre'
  )
})

test('quita el artista al final cuando el título viene como "Tema - Artista"', () => {
  assert.equal(
    normalizeTrackMetadata({
      title: 'Por Mil Noches - AIRBAG - Video oficial',
      artist: 'AIRBAG',
    }).title,
    'Por Mil Noches'
  )
})

test('quita anotaciones parentéticas reales de descargas', () => {
  assert.equal(
    normalizeTrackMetadata({
      title: 'Vasos Vacíos (Remasterizado 2008)',
      artist: 'Los Fabulosos Cadillacs',
    }).title,
    'Vasos Vacíos'
  )
  assert.equal(
    normalizeTrackMetadata({
      title: 'Soda Stereo - Persiana Americana (Gira Me Verás Volver)',
      artist: 'Soda Stereo',
    }).title,
    'Persiana Americana'
  )
  assert.equal(
    normalizeTrackMetadata({
      title: 'Tema (12" Extended Version)',
      artist: 'Artista',
    }).title,
    'Tema'
  )
})

test('conserva subtítulos que no son anotaciones', () => {
  assert.equal(
    normalizeMetadataValue('Loco (Tu Forma De Ser)'),
    'Loco (Tu Forma De Ser)'
  )
  assert.equal(normalizeMetadataValue('Annihilation (I Just)'), 'Annihilation (I Just)')
})

test('quita HD y otros tokens técnicos sueltos', () => {
  assert.equal(normalizeMetadataValue('Las Pelotas - Será HD'), 'Las Pelotas - Será')
  assert.equal(normalizeMetadataValue('Tema 1080 HD'), 'Tema')
  assert.equal(normalizeMetadataValue('Tema 320kbps'), 'Tema')
})
