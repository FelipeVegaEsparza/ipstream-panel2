export const PDF_COLORS = {
  primary: [6, 182, 212] as [number, number, number],
  text: [31, 41, 55] as [number, number, number],
  muted: [107, 114, 128] as [number, number, number],
  border: [229, 231, 235] as [number, number, number],
  success: [22, 163, 74] as [number, number, number],
  warning: [234, 88, 12] as [number, number, number],
  danger: [220, 38, 38] as [number, number, number],
  surface: [249, 250, 251] as [number, number, number],
}

export const PDF_LAYOUT = {
  margin: 50,
  pageWidth: 595.28,
  pageHeight: 841.89,
  contentWidth: 495.28,
}

export const PDF_FONTS = {
  title: { size: 18, style: 'bold' as const },
  sectionHeader: { size: 11, style: 'bold' as const },
  body: { size: 10, style: 'normal' as const },
  bodyBold: { size: 10, style: 'bold' as const },
  small: { size: 9, style: 'normal' as const },
  smallMuted: { size: 8, style: 'normal' as const },
}

export const COMPANY = {
  name: 'IpStream.cl',
  tagline: 'Panel de Clientes',
  email: 'contacto@ipstream.cl',
  logoPath: 'public/logo-ipstream.png',
}
