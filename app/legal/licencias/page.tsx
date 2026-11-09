import type { Metadata } from 'next'
import { LegalDocument } from '@/components/public/LegalDocument'

export const metadata: Metadata = {
  title: 'Licencias y Responsabilidad de Contenido | CasterFly',
}

export default function LicenciasPage() {
  return (
    <LegalDocument
      title="Licencias y Responsabilidad de Contenido"
      intro="CasterFly es una plataforma tecnológica. No somos dueños, no autorizamos, no licenciamos y no explotamos la música, audio, video, imágenes, marcas o voces que publican las radios y canales."
      highlight={
        <>
          <strong>La responsabilidad es exclusivamente del cliente.</strong> Al registrarte declaras que
          cuentas con todos los derechos y licencias necesarios para publicar y transmitir tu contenido.
        </>
      }
      sections={[
        {
          heading: 'Alcance',
          paragraphs: [
            'Esta declaración aplica a todo contenido que el cliente sube, programa, transmite o publica mediante CasterFly, incluidos música, jingles, publicidad, cápsulas, videos, imágenes, marcas, locuciones y voces generadas o sintetizadas con herramientas de inteligencia artificial.',
          ],
        },
        {
          heading: 'Declaración del cliente',
          bullets: [
            'Declaras ser titular o contar con las licencias, autorizaciones y permisos necesarios para usar y transmitir todo el contenido que publicas.',
            'Esto incluye derechos de autor, derechos conexos, licencias de ejecución pública, derechos de sellos discográficos, marcas, imagen, publicidad y cualquier otro derecho de terceros.',
            'En Chile, la ejecución pública de música puede requerir licencias de entidades de gestión colectiva. Es tu responsabilidad obtenerlas y mantenerlas vigentes.',
          ],
        },
        {
          heading: 'Voces e inteligencia artificial',
          paragraphs: [
            'Si usas una voz, muestra o referencia de voz, declaras tener el consentimiento de su titular para generar y publicar la locución. No está permitido clonar o imitar voces sin autorización.',
            'CasterFly solo provee la herramienta técnica de síntesis; no verifica ni garantiza los derechos sobre las voces o textos que entregas.',
          ],
        },
        {
          heading: 'Indemnidad',
          paragraphs: [
            'El cliente mantendrá indemne a CasterFly frente a reclamos, demandas, multas o gastos de terceros derivados del contenido que publique, de la falta de licencias o del uso no autorizado de música, marcas, imágenes o voces.',
          ],
        },
        {
          heading: 'Retiro de contenido',
          paragraphs: [
            'CasterFly puede suspender o retirar contenido ante un reclamo de terceros, una orden de autoridad o un incumplimiento de estos términos, sin que ello implique revisar o aprobar previamente todo el contenido de la plataforma.',
          ],
        },
        {
          heading: 'Música de la biblioteca',
          paragraphs: [
            'Las pistas que carga el administrador o el propio cliente siguen siendo de sus titulares. Elegir una pista dentro de la plataforma no transfiere derechos ni implica que CasterFly autorice su uso público. Verifica siempre que tienes la licencia para transmitirla.',
          ],
        },
      ]}
    />
  )
}
