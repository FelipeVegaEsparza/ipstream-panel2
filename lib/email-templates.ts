// =====================================================
// Email templates — render de plantillas con variables
// =====================================================
// Reemplaza {{variable}} en subject/htmlBody. Las variables se escapan
// (HTML) salvo `link` (URLs generadas por el sistema).

export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export function renderTemplate(
  template: { subject: string; htmlBody: string },
  vars: Record<string, unknown>
): { subject: string; html: string } {
  const render = (input: string) =>
    input.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
      const value = vars[key]
      if (key === 'link') return String(value ?? '')
      return escapeHtml(value)
    })

  return {
    subject: render(template.subject).slice(0, 191),
    html: render(template.htmlBody),
  }
}
