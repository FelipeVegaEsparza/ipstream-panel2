/**
 * Sanitiza texto copiado de páginas web para evitar errores de servidor
 */
export function sanitizeText(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  return text
    // Normalizar Unicode (descomponer y recomponer caracteres)
    .normalize('NFKC')
    
    // Reemplazar comillas curvas por comillas normales
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    .replace(/[‚„]/g, ',')
    .replace(/[‹›]/g, "'")
    .replace(/[«»]/g, '"')
    
    // Reemplazar guiones largos por guiones normales
    .replace(/[—–]/g, '-')
    .replace(/[‒]/g, '-')
    
    // Reemplazar espacios especiales por espacios normales
    .replace(/[\u00A0\u1680\u2000-\u200B\u2028\u2029\u202F\u205F\u3000]/g, ' ')
    
    // Eliminar caracteres de control invisibles y problemáticos
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '')
    .replace(/[\uFEFF\uFFFE\uFFFF]/g, '') // BOM y otros caracteres problemáticos
    .replace(/[\u200C\u200D\u200E\u200F]/g, '') // Caracteres de dirección de texto
    .replace(/[\u2060-\u206F]/g, '') // Caracteres de formato
    
    // Reemplazar caracteres especiales de puntuación
    .replace(/[…]/g, '...')
    .replace(/[•]/g, '*')
    .replace(/[·]/g, '*')
    
    // Limpiar saltos de línea problemáticos
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    
    // Reemplazar múltiples espacios y saltos de línea
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*\n/g, '\n\n') // Máximo 2 saltos de línea consecutivos
    
    // Eliminar espacios al inicio y final
    .trim();
}

/**
 * Sanitiza un objeto completo, limpiando todos los campos de texto
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const sanitized = { ...obj };
  
  for (const key in sanitized) {
    if (typeof sanitized[key] === 'string') {
      sanitized[key] = sanitizeText(sanitized[key]);
    }
  }
  
  return sanitized;
}

/**
 * Valida que el texto no contenga caracteres problemáticos
 */
export function validateText(text: string): { isValid: boolean; error?: string } {
  if (!text) {
    return { isValid: true };
  }

  // Verificar longitud máxima razonable
  if (text.length > 50000) {
    return { 
      isValid: false, 
      error: 'El texto es demasiado largo (máximo 50,000 caracteres)' 
    };
  }

  // Verificar que no contenga caracteres de control problemáticos
  const controlChars = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
  if (controlChars.test(text)) {
    return { 
      isValid: false, 
      error: 'El texto contiene caracteres no válidos' 
    };
  }

  return { isValid: true };
}