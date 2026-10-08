import type { TemplateProps } from '../index'
import { PetroleoTemplate } from '../petroleo/PetroleoTemplate'

/** Variante azul del template petroleo (mismo diseño, paleta azul). */
export function PetroleoBlueTemplate(props: TemplateProps) {
  return <PetroleoTemplate {...props} variant="blue" />
}
