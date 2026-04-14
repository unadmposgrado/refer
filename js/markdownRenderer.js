/**
 * markdownRenderer.js
 * Módulo para cargar y renderizar contenido Markdown en contenedores HTML
 */

/**
 * Convierte Markdown básico a HTML
 * @param {string} markdown - Contenido en formato Markdown
 * @returns {string} HTML renderizado
 */
function markdownToHtml(markdown) {
  let html = markdown;
  
  // Escapar HTML especial primero
  html = html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  
  // Convertir headings (# , ## , etc.)
  html = html.replace(/^### (.*?)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.*?)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.*?)$/gm, '<h1>$1</h1>');
  
  // Convertir párrafos (líneas separadas por dos saltos de línea)
  const paragraphs = html.split(/\n\s*\n+/);
  html = paragraphs
    .map(para => {
      para = para.trim();
      // Evitar envolver headings en párrafos
      if (para.match(/^<h[1-3]>/) || para === '') {
        return para;
      }
      return `<p>${para}</p>`;
    })
    .join('\n');
  
  // Convertir bold (**texto**)
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // Convertir italic (*texto*)
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  
  // Convertir enlaces [texto](url)
  html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>');
  
  // Convertir saltos de línea
  html = html.replace(/\n/g, '<br>');
  
  return html;
}

/**
 * Carga un archivo Markdown y lo renderiza en un contenedor
 * @param {string} filePath - Ruta relativa al archivo Markdown (ej: '/content/aviso-privacidad.md')
 * @param {string} containerId - ID del contenedor donde renderizar
 * @throws {Error} Si no se puede cargar el archivo o el contenedor no existe
 */
async function loadMarkdownContent(filePath, containerId) {
  try {
    // Obtener referencia al contenedor
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Contenedor con id "${containerId}" no encontrado`);
    }
    
    // Cargar el archivo Markdown
    const response = await fetch(filePath);
    if (!response.ok) {
      throw new Error(`Error al cargar ${filePath}: ${response.statusText}`);
    }
    
    const markdownContent = await response.text();
    
    // Convertir Markdown a HTML
    const htmlContent = markdownToHtml(markdownContent);
    
    // Inyectar en el contenedor
    container.innerHTML = htmlContent;
    
    return container;
  } catch (error) {
    console.error(`Error renderizando Markdown desde ${filePath}:`, error);
    throw error;
  }
}

/**
 * Carga múltiples archivos Markdown
 * @param {Array<{filePath: string, containerId: string}>} items - Array de objetos con filePath y containerId
 * @returns {Promise<void>}
 */
async function loadMultipleMarkdownContents(items) {
  try {
    await Promise.all(
      items.map(item => loadMarkdownContent(item.filePath, item.containerId))
    );
  } catch (error) {
    console.error('Error al cargar múltiples contenidos Markdown:', error);
    throw error;
  }
}

export { loadMarkdownContent, loadMultipleMarkdownContents, markdownToHtml };
