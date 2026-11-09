import type { Metadata } from 'next'
import { LegalDocument } from '@/components/public/LegalDocument'

export const metadata: Metadata = {
  title: 'Política de Privacidad | CasterFly',
}

export default function PrivacidadPage() {
  return (
    <LegalDocument
      title="Política de Privacidad"
      intro="Esta política explica qué datos tratamos para prestar el servicio de CasterFly, para qué los usamos y cómo puedes ejercer tus derechos."
      sections={[
        {
          heading: 'Datos que recopilamos',
          bullets: [
            'Datos de cuenta: nombre, correo, contraseña cifrada, radio o canal y preferencias.',
            'Datos de facturación y contacto: plan, moneda, pagos y comprobantes.',
            'Contenido que subes: música, audios, videos, imágenes, textos y metadatos.',
            'Datos técnicos: dirección IP, registros de acceso, dispositivo, navegador y uso del servicio.',
          ],
        },
        {
          heading: 'Para qué usamos los datos',
          paragraphs: [
            'Usamos los datos para crear y administrar tu cuenta, prestar el streaming y las herramientas contratadas, procesar pagos, entregar soporte, prevenir abusos y mejorar el servicio.',
            'También podemos enviarte comunicaciones operativas o avisos relevantes. Las comunicaciones comerciales son opcionales y puedes darte de baja.',
          ],
        },
        {
          heading: 'Base y consentimiento',
          paragraphs: [
            'Tratamos los datos necesarios para ejecutar el contrato, cumplir obligaciones legales y proteger el servicio. Cuando corresponde, pedimos tu consentimiento, por ejemplo para el registro y para el uso de herramientas de voz con inteligencia artificial.',
          ],
        },
        {
          heading: 'Con quién compartimos',
          paragraphs: [
            'Podemos usar proveedores de infraestructura, base de datos, correo, pagos, almacenamiento y síntesis de voz para operar el servicio. Estos proveedores tratan los datos por cuenta de CasterFly y según sus propias políticas.',
            'No vendemos tus datos. Podemos entregar información cuando exista una obligación legal o una orden de autoridad competente.',
          ],
        },
        {
          heading: 'Retención y seguridad',
          paragraphs: [
            'Conservamos los datos mientras la cuenta esté activa y durante los plazos legales o de respaldo necesarios. Luego se eliminan o se anonimizan.',
            'Aplicamos medidas técnicas y organizativas razonables para proteger la información. Ningún sistema es completamente infalible, por lo que no podemos garantizar seguridad absoluta.',
          ],
        },
        {
          heading: 'Tus derechos',
          paragraphs: [
            'Puedes solicitar acceso, rectificación, eliminación, oposición o portabilidad de tus datos, y revocar consentimientos cuando corresponda. Escríbenos a contacto@casterfly.com indicando tu solicitud.',
          ],
        },
        {
          heading: 'Cookies y transferencias',
          paragraphs: [
            'Usamos cookies y almacenamiento local para mantener la sesión, recordar preferencias y medir el funcionamiento del servicio. Puedes gestionarlas desde tu navegador.',
            'Algunos proveedores pueden estar fuera de Chile. En esos casos adoptamos resguardos contractuales razonables para proteger los datos.',
          ],
        },
      ]}
    />
  )
}
