/**
 * Script global para sanitizar texto pegado en cualquier input o textarea
 * Se ejecuta automáticamente en toda la aplicación
 */

(function() {
  'use strict';

  // Función para analizar caracbvteres   problemáticos
  function analyzeText(text) {
    const problematicChars = [];
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const code = char.charCodeAt(0);
      
      // Detectar caracteres problemáticos
      if (code < 32 && code !== 9 && code !== 10 && code !== 13) {
        problematicChars.push({ char, code, position: i, type: 'control' });
      } else if (code > 127 && code < 160) {
        problematicChars.push({ char, code, position: i, type: 'extended-control' });
      } else if (code >= 8192 && code <= 8303) {
        problematicChars.push({ char, code, position: i, type: 'unicode-space' });
      } else if (code >= 65279 && code <= 65535) {
        problematicChars.push({ char, code, position: i, type: 'unicode-special' });
      }
    }
    return problematicChars;
  }

  // Función de sanitización más agresiva
  function sanitizeText(text) {
    if (!text || typeof text !== 'string') {
      return '';
    }

    console.log('🔍 Analyzing text before sanitization...');
    const problematicChars = analyzeText(text);
    if (problematicChars.length > 0) {
      console.log('⚠️ Found problematic characters:', problematicChars);
    }

    // Sanitización más agresiva - solo permitir caracteres seguros
    let sanitized = text
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

    // Sanitización final más agresiva - solo caracteres ASCII básicos + acentos comunes
    sanitized = sanitized.replace(/[^\x20-\x7E\u00C0-\u00FF\u0100-\u017F\n\r\t]/g, '');

    console.log('🧹 Sanitization complete. Removed', text.length - sanitized.length, 'characters');
    
    return sanitized;
  }

  // Función para manejar el evento paste
  function handlePaste(event) {
    const target = event.target;
    
    // Solo procesar inputs y textareas
    if (!target || (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA')) {
      return;
    }

    // Obtener el texto del clipboard
    const clipboardData = event.clipboardData;
    if (!clipboardData) return;

    const pastedText = clipboardData.getData('text');
    if (!pastedText) return;

    console.log('🧹 Sanitizing pasted text...');

    // Prevenir el pegado normal
    event.preventDefault();

    // Sanitizar el texto
    const sanitizedText = sanitizeText(pastedText);
    
    console.log('🧹 Original length:', pastedText.length, 'Sanitized length:', sanitizedText.length);

    // Insertar el texto sanitizado
    const start = target.selectionStart || 0;
    const end = target.selectionEnd || 0;
    const currentValue = target.value;
    
    const newValue = currentValue.substring(0, start) + sanitizedText + currentValue.substring(end);
    target.value = newValue;

    // Actualizar la posición del cursor
    const newCursorPosition = start + sanitizedText.length;
    target.setSelectionRange(newCursorPosition, newCursorPosition);

    // Disparar evento de input para que los frameworks detecten el cambio
    const inputEvent = new Event('input', { bubbles: true });
    target.dispatchEvent(inputEvent);

    console.log('✅ Text sanitized and pasted successfully');
  }

  // Agregar el event listener global cuando el DOM esté listo
  function initTextSanitizer() {
    document.addEventListener('paste', handlePaste, true);
    console.log('🧹 Global text sanitizer initialized');
  }

  // Inicializar cuando el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTextSanitizer);
  } else {
    initTextSanitizer();
  }

  // Log para confirmar que el script se cargó
  console.log('🧹 Text sanitizer script loaded successfully');

})();