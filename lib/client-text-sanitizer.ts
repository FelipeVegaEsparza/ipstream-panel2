/**
 * Sanitizador de texto para el lado del cliente (frontend)
 * Limpia texto copiado antes de enviarlo al servidor
 */

/**
 * Sanitiza texto en el cliente antes de enviarlo al servidor
 */
export function sanitizeTextClient(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  return text
    // Normalizar Unicode
    .normalize('NFKC')
    
    // Reemplazar comillas curvas
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    .replace(/[‚„]/g, ',')
    .replace(/[‹›]/g, "'")
    .replace(/[«»]/g, '"')
    
    // Reemplazar guiones especiales
    .replace(/[—–‒]/g, '-')
    
    // Reemplazar espacios especiales
    .replace(/[\u00A0\u1680\u2000-\u200B\u2028\u2029\u202F\u205F\u3000]/g, ' ')
    
    // Eliminar caracteres invisibles problemáticos
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '')
    .replace(/[\uFEFF\uFFFE\uFFFF]/g, '')
    .replace(/[\u200C\u200D\u200E\u200F]/g, '')
    .replace(/[\u2060-\u206F]/g, '')
    
    // Reemplazar caracteres de puntuación especiales
    .replace(/[…]/g, '...')
    .replace(/[•·]/g, '*')
    
    // Normalizar saltos de línea
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    
    // Limpiar espacios múltiples
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    
    // Trim
    .trim();
}

/**
 * Sanitiza un objeto completo en el cliente
 */
export function sanitizeObjectClient<T extends Record<string, any>>(obj: T): T {
  const sanitized = { ...obj };
  
  for (const key in sanitized) {
    if (typeof sanitized[key] === 'string') {
      sanitized[key] = sanitizeTextClient(sanitized[key]);
    }
  }
  
  return sanitized;
}

/**
 * Hook para sanitizar automáticamente el texto en inputs
 */
export function useSanitizedInput() {
  const sanitizeOnPaste = (event: ClipboardEvent) => {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement;
    if (!target) return;

    // Obtener el texto del clipboard
    const clipboardData = event.clipboardData;
    if (!clipboardData) return;

    const pastedText = clipboardData.getData('text');
    if (!pastedText) return;

    // Prevenir el pegado normal
    event.preventDefault();

    // Sanitizar el texto
    const sanitizedText = sanitizeTextClient(pastedText);

    // Insertar el texto sanitizado
    const start = target.selectionStart || 0;
    const end = target.selectionEnd || 0;
    const currentValue = target.value;
    
    const newValue = currentValue.substring(0, start) + sanitizedText + currentValue.substring(end);
    target.value = newValue;

    // Actualizar la posición del cursor
    const newCursorPosition = start + sanitizedText.length;
    target.setSelectionRange(newCursorPosition, newCursorPosition);

    // Disparar evento de input para que React detecte el cambio
    const inputEvent = new Event('input', { bubbles: true });
    target.dispatchEvent(inputEvent);
  };

  return { sanitizeOnPaste };
}

/**
 * Función para agregar el event listener de sanitización a un elemento
 */
export function addTextSanitization(element: HTMLInputElement | HTMLTextAreaElement) {
  const { sanitizeOnPaste } = useSanitizedInput();
  element.addEventListener('paste', sanitizeOnPaste);
  
  return () => {
    element.removeEventListener('paste', sanitizeOnPaste);
  };
}