// Direcciones de locución para Fish Audio Drama 3.
// Se usan como default por contexto; el admin puede fijar una dirección
// global en app_config y esa tiene prioridad.

export const FISH_AUDIO_DIRECTIONS = {
  presenter: '[voz cálida y cercana, con una sonrisa]',
  presenterClosing: '[tono suave y seguro]',
  review: '[voz de locutor, curiosa y cercana, ritmo pausado]',
  reviewClosing: '[tono cálido, invitando a escuchar]',
  weather: '[voz tranquila y luminosa]',
  time: '[voz clara y cálida]',
  capsule: '[voz segura, curiosa y cercana]',
  station: '[voz orgullosa y cálida]',
} as const
