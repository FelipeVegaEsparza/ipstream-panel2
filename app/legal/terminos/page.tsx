import type { Metadata } from 'next'
import { LegalDocument } from '@/components/public/LegalDocument'

export const metadata: Metadata = {
  title: 'Términos y Condiciones | CasterFly',
}

export default function TerminosPage() {
  return (
    <LegalDocument
      title="Términos y Condiciones"
      intro="Estos términos regulan el uso de CasterFly, una plataforma tecnológica para crear, administrar y transmitir radios y televisión online. Al crear una cuenta o usar el servicio, aceptas estas condiciones."
      sections={[
        {
          heading: 'Qué es CasterFly',
          paragraphs: [
            'CasterFly entrega herramientas tecnológicas: panel de administración, streaming, sitios web, aplicaciones, automatización y funciones con inteligencia artificial. CasterFly no es una emisora, un medio de comunicación, una editorial ni una entidad de gestión colectiva de derechos.',
            'CasterFly no selecciona, produce, autoriza ni controla el contenido que cada cliente publica o transmite. Cada radio o canal es responsable de su programación y de los derechos asociados.',
          ],
        },
        {
          heading: 'Cuenta y acceso',
          bullets: [
            'Debes entregar datos veraces y mantenerlos actualizados.',
            'Eres responsable de proteger tu contraseña y de toda actividad realizada con tu cuenta.',
            'Debes tener capacidad legal para contratar el servicio en nombre propio o de la organización que representas.',
          ],
        },
        {
          heading: 'Planes, activación y pagos',
          paragraphs: [
            'Los planes, precios y monedas se informan en el sitio. La cuenta queda pendiente hasta que CasterFly la active y se confirme el pago cuando corresponda.',
            'La falta de pago puede suspender el servicio. Los reembolsos se rigen por la ley aplicable y por las condiciones informadas al momento de la compra.',
          ],
        },
        {
          heading: 'Contenido del cliente',
          paragraphs: [
            'El cliente conserva la titularidad de la música, audio, video, imágenes, marcas y textos que sube. Al publicarlos, otorga a CasterFly una autorización limitada, no exclusiva y revocable para alojarlos, transmitirlos y mostrarlos únicamente para prestar el servicio.',
            'CasterFly no adquiere derechos de propiedad sobre ese contenido y no lo usa para fines distintos al servicio contratado.',
          ],
        },
        {
          heading: 'Uso permitido y prohibido',
          bullets: [
            'No se permite contenido ilegal, difamatorio, fraudulento, de explotación, violento o que vulnere derechos de terceros.',
            'No se permite transmitir música, video, marcas o voces sin las licencias o autorizaciones necesarias.',
            'No se permite intentar vulnerar la seguridad, revender el servicio sin autorización ni usar la plataforma para spam o malware.',
          ],
        },
        {
          heading: 'Disponibilidad y responsabilidad',
          paragraphs: [
            'Trabajamos para mantener el servicio disponible, pero no garantizamos funcionamiento ininterrumpido ni libre de errores. Pueden existir mantenimientos, fallas de terceros o eventos fuera de nuestro control.',
            'En la medida permitida por la ley, CasterFly no responde por el contenido de los clientes ni por daños indirectos. La responsabilidad total se limita al monto pagado por el servicio en los tres meses anteriores al reclamo.',
          ],
        },
        {
          heading: 'Suspensión, cambios y ley aplicable',
          paragraphs: [
            'CasterFly puede suspender o terminar una cuenta por incumplimiento, reclamos de terceros u órdenes de autoridad. También puede actualizar estos términos; los cambios relevantes se informarán por el panel o por correo.',
            'Estos términos se rigen por la ley chilena. Cualquier controversia se someterá a los tribunales de Santiago de Chile, sin perjuicio de los derechos del consumidor.',
          ],
        },
      ]}
    />
  )
}
