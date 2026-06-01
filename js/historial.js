// historial.js
// Gestión de la vista de historial de citas.

import { requireAuth } from './auth.js';
import { getUserCitations } from './citations.js';

export function renderMarkdown(markdownText) {
  const texto = markdownText || '';
  const htmlBruto = (window.marked && typeof marked.parse === 'function') ? marked.parse(texto) : texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
  if (window.DOMPurify && typeof DOMPurify.sanitize === 'function') {
    return DOMPurify.sanitize(htmlBruto);
  }
  return htmlBruto;
}

let historialData = [];
let historialDownloadListenerInstalled = false;

function escapeCSV(value) {
  if (value === null || value === undefined) return '';
  const text = String(value);
  const escaped = text.replace(/"/g, '""');
  const needsQuotes = /[",\n\r]/.test(escaped);
  return needsQuotes ? `"${escaped}"` : escaped;
}

function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function exportToCSV(data) {
  if (!Array.isArray(data)) return;

  const header = ['source_type', 'tema', 'citation_text', 'created_at', 'modelo', 'autor_titulo'];
  const rows = [header.map(escapeCSV).join(',')];

  data.forEach(c => {
    const sourceType = c.source_type || '';
    const tema = c.tema || '';
    const citationText = c.citation_text || '';
    const createdAt = c.created_at || '';

    let modelo = '';
    if (sourceType === 'ia') {
      modelo = c.models?.name || c.model_name_custom || '';
    }

    let autorTitulo = '';
    if (sourceType === 'book') {
      const meta = c.metadata || {};
      const autor = getAutor(meta) || '';
      const titulo = meta.titulo || '';
      autorTitulo = [autor, titulo].filter(Boolean).join(' / ');
    }

    rows.push([
      escapeCSV(sourceType),
      escapeCSV(tema),
      escapeCSV(citationText),
      escapeCSV(createdAt),
      escapeCSV(modelo),
      escapeCSV(autorTitulo),
    ].join(','));
  });

  const csvContent = rows.join('\r\n');
  downloadFile(csvContent, 'historial_citas.csv', 'text/csv;charset=utf-8;');
}

function exportToJSON(data) {
  if (!Array.isArray(data)) return;
  const json = JSON.stringify(data, null, 2);
  downloadFile(json, 'historial_citas.json', 'application/json;charset=utf-8;');
}

function escapeHtml(text) {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
/**
 * Helper para obtener autor desde metadata con múltiples formatos soportados.
 * Maneja: autor (string), author (legacy), autores (array de objetos)
 */
function getAutor(meta = {}) {
  if (!meta || typeof meta !== 'object') return '';

  // caso principal: string directo
  if (meta.autor) return meta.autor;

  // compatibilidad legacy: author en inglés
  if (meta.author) return meta.author;

  // caso autores array: [{ nombre, apellido }, ...]
  if (Array.isArray(meta.autores)) {
    return meta.autores
      .map(a => {
        const nombre = a?.nombre || '';
        const apellido = a?.apellido || '';
        return `${nombre} ${apellido}`.trim();
      })
      .filter(Boolean)
      .join(', ');
  }

  return '';
}

function formatDateForPrint(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleString('es-ES', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return escapeHtml(dateStr);
  }
}

// Funciones de render por tipo (reutilizables desde otros módulos)
function renderIACitation(c) {
  const modelDisplay = c.models?.name || c.model_name_custom || '—';
  const temaHtml = c.tema ? `<p><strong>Tema:</strong> ${escapeHtml(c.tema)}</p>` : '';
  const promptHtml = c.prompt ? `
        <div><strong>Prompt:</strong></div>
        <div class="historial-texto markdown-body">${renderMarkdown(c.prompt)}</div>
      ` : '';
  const responseHtml = c.llm_response ? `
        <div><strong>Respuesta:</strong></div>
        <div class="historial-texto markdown-body">${renderMarkdown(c.llm_response)}</div>
      ` : '';

  return `
    <div class="history-item">
      <div class="history-header">
        <strong>🤖 Modelo de Inteligencia Artificial</strong>
      </div>

      <div class="history-body">
        <p><strong>Modelo:</strong> ${escapeHtml(modelDisplay)}</p>
        ${temaHtml}
        ${promptHtml}
        ${responseHtml}
      </div>

      <div class="history-reference">
        <p><strong>Referencia generada:</strong></p>
        ${renderMarkdown(c.citation_text)}
      </div>
    </div>
    <div class="citation-meta">
      <span class="meta-item"><strong>Guardado:</strong> ${formatDateForPrint(c.created_at)}</span>
    </div>
  `;
}

function renderBookCitation(c) {
  const meta = c.metadata || {};
  return `
    <div class="history-item">
      <div class="history-header">
        <strong>📘 Libro</strong>
      </div>

      <div class="history-body">
        <p><strong>Autor:</strong> ${getAutor(meta) || 'Sin autor'}</p>
        <p><strong>Año:</strong> ${meta.anio || ''}</p>
        <p><strong>Título:</strong> ${meta.titulo || ''}</p>
        <p><strong>Editorial:</strong> ${meta.editorial || ''}</p>
        ${meta.doi_url ? `<p><strong>DOI/URL:</strong> ${meta.doi_url}</p>` : ''}
      </div>

      <div class="history-reference">
        ${renderMarkdown(c.citation_text)}
      </div>
    </div>
    <div class="citation-meta">
      <span class="meta-item"><strong>Guardado:</strong> ${formatDateForPrint(c.created_at)}</span>
    </div>
  `;
}

function renderArticleCitation(c) {
  const meta = c.metadata || {};
  return `
    <div class="history-item">
      <div class="history-header">
        <strong>📄 Artículo</strong>
      </div>

      <div class="history-body">
        <p><strong>Autor:</strong> ${getAutor(meta) || 'Sin autor'}</p>
        <p><strong>Año:</strong> ${meta.anio || ''}</p>
        <p><strong>Título:</strong> ${meta.titulo || ''}</p>
        <p><strong>Revista:</strong> ${meta.revista || ''}</p>
        <p><strong>Volumen:</strong> ${meta.volumen || ''}</p>
        <p><strong>Número:</strong> ${meta.numero || ''}</p>
        <p><strong>Páginas:</strong> ${meta.paginas || ''}</p>
        ${meta.doi_url ? `<p><strong>DOI/URL:</strong> ${meta.doi_url}</p>` : ''}
      </div>

      <div class="history-reference">
        ${renderMarkdown(c.citation_text)}
      </div>
    </div>
    <div class="citation-meta">
      <span class="meta-item"><strong>Guardado:</strong> ${formatDateForPrint(c.created_at)}</span>
    </div>
  `;
}

function renderWebCitation(c) {
  const meta = c.metadata || {};
  const url = (meta.url || '').trim();
  return `
    <div class="history-item">
      <div class="history-header">
        <strong>🌐 Sitio web</strong>
      </div>

      <div class="history-body">
        <p><strong>Autor:</strong> ${getAutor(meta) || 'Sin autor'}</p>
        <p><strong>Fecha:</strong> ${meta.fecha || ''}</p>
        <p><strong>Título:</strong> ${meta.titulo || ''}</p>
        <p><strong>Sitio:</strong> ${meta.sitio || ''}</p>
        ${url ? `<p><strong>URL:</strong> <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(url)}</a></p>` : ''}
      </div>

      <div class="history-reference">
        ${renderMarkdown(c.citation_text)}
      </div>
    </div>
    <div class="citation-meta">
      <span class="meta-item"><strong>Guardado:</strong> ${formatDateForPrint(c.created_at)}</span>
    </div>
  `;
}

// función compartida para renderizar el detalle de una cita (reutilizable en Historial Global)
export function renderCitationDetail(c) {
  if (!c || typeof c !== 'object') return '';
  const type = (c.source_type || '').toLowerCase();
  if (type === 'ia') return renderIACitation(c);
  if (type === 'book') return renderBookCitation(c);
  if (type === 'article') return renderArticleCitation(c);
  if (type === 'web') return renderWebCitation(c);
  // fallback: usar formato IA como genérico
  return renderIACitation(c);
}

function exportToHTML(data) {
  if (!Array.isArray(data)) return;

  const documentTitle = 'Historial de referencias';
  const userName = (document.getElementById('user-name') || {}).textContent || 'Usuario';
  const generatedAt = formatDateForPrint(new Date().toISOString());

  const styles = `
    body { font-family: Georgia, "Times New Roman", serif; line-height: 1.6; margin: 40px; color: #222; background: #fff; }
    h1 { text-align: center; margin-bottom: 40px; }
    .metadata { text-align: center; margin-bottom: 30px; color: #555; }
    .citation { margin-bottom: 30px; padding-bottom: 20px; border-bottom: 1px solid #ccc; font-style: normal; }
    .meta { font-size: 0.9em; color: #555; margin-top: 10px; }
    .label { font-weight: bold; }
    .block { margin-top: 10px; margin-bottom: 10px; }
    em { font-style: italic; }
    strong { font-weight: bold; }
    a { color: #1a0dab; word-break: break-all; }
    .reference { font-style: normal; margin-bottom: 12px; }
    hr.footer { margin-top: 40px; border: 0; border-top: 1px solid #ddd; }
    p.footer { font-size: 0.8em; color: #777; }
  `;

  const bodyContent = data.map((c, index) => {
    const sourceType = c.source_type || 'unknown';
    const formattedDate = formatDateForPrint(c.created_at);
    const citationHtml = renderMarkdown(c.citation_text || '');

    if (sourceType === 'book') {
      const meta = c.metadata || {};
      return `
        <div class="citation">
          <div class="reference">${citationHtml}</div>
          <div class="block"><span class="label">Autor:</span> ${escapeHtml(meta.autor || '')}</div>
          <div class="block"><span class="label">Año:</span> ${escapeHtml(meta.anio || '')}</div>
          <div class="block"><span class="label">Título:</span> <em>${escapeHtml(meta.titulo || '')}</em></div>
          <div class="block"><span class="label">Editorial:</span> ${escapeHtml(meta.editorial || '')}</div>
          ${meta.doi_url ? `<div class="block"><span class="label">DOI/URL:</span> <a href="${escapeHtml(meta.doi_url)}" target="_blank">${escapeHtml(meta.doi_url)}</a></div>` : ''}
          <div class="meta">Fuente: libro | Guardado: ${escapeHtml(formattedDate)}</div>
        </div>
      `;
    }

    const modelDisplay = c.models?.name || c.model_name_custom || '—';
    const promptHtml = renderMarkdown(c.prompt || '');
    const responseHtml = renderMarkdown(c.llm_response || '');

    return `
      <div class="citation">
        <div class="reference">${citationHtml}</div>
        <div class="block"><span class="label">Tema:</span> ${escapeHtml(c.tema || '')}</div>
        <div class="block"><span class="label">Prompt:</span> ${promptHtml}</div>
        <div class="block"><span class="label">Respuesta:</span> ${responseHtml}</div>
        <div class="meta">Modelo: <em>${escapeHtml(modelDisplay)}</em> | Guardado: ${escapeHtml(formattedDate)}</div>
      </div>
    `;
  }).join('\n');

  const html = `<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8">
    <title>${escapeHtml(documentTitle)}</title>
    <style>${styles}</style>
  </head>
  <body>
    <h1>${escapeHtml(documentTitle)}</h1>
    <div class="metadata">Usuario: ${escapeHtml(userName)} | Fecha de generación: ${escapeHtml(generatedAt)}</div>
    ${bodyContent}
    <hr class="footer" />
    <p class="footer">Documento generado automáticamente por la aplicación de citación.</p>
  </body>
</html>`;

  downloadFile(html, 'historial_citas.html', 'text/html;charset=utf-8;');
}

async function renderHistorial() {
  // proteger la página y obtener el usuario en el proceso
  let user;
  try {
    user = await requireAuth();
    console.debug('[historial] usuario actual:', user && user.id);
  } catch (e) {
    console.debug('[historial] requireAuth redirigió o falló', e);
    return; // la redirección ya se hizo
  }

  // mostrar el nombre/email del usuario debajo del título
  const nameEl = document.getElementById('user-name');
  if (nameEl && user) {
    // preferir el nombre completo en metadata si existe
    const displayName = user.user_metadata?.full_name || user.email || '';
    nameEl.textContent = displayName;
  }

  const container = document.getElementById('historial-list');
  if (!container) return;
  // asegurarse de que empiece vacío
  container.innerHTML = '';

  let result;
  try {
    result = await getUserCitations(user);
  } catch (err) {
    console.error('Error obteniendo citas:', err);
    container.textContent = 'No se pudieron cargar las citas.';
    return;
  }

  const { data, error } = result || {};
  if (error) {
    console.error('Error from getUserCitations:', error);
    container.textContent = 'No se pudieron cargar las citas.';
    return;
  }

  console.debug('[historial] citas obtenidas:', data && data.length);

  historialData = Array.isArray(data) ? data : [];

  if (!historialDownloadListenerInstalled) {
    const downloadBtn = document.getElementById('download-history-btn');
    const formatSelect = document.getElementById('download-format');

    if (downloadBtn && formatSelect) {
      downloadBtn.addEventListener('click', () => {
        const format = formatSelect.value;
        // CSV y JSON deshabilitados temporalmente (mantener funciones para futura activación)
        if (format === 'html') {
          exportToHTML(historialData);
        }
      });
      historialDownloadListenerInstalled = true;
    }
  }

  if (!data || data.length === 0) {
    container.textContent = 'Aún no tienes referencias guardadas.';
    return;
  }

  // Helper para formatear fechas
  function formatDate(dateStr) {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('es-ES', {year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'});
    } catch (e) {
      return dateStr;
    }
  }
  // Para cada cita construir tarjeta según source_type (ia/book/article/web)
  container.innerHTML = data.map(c => {
    console.log('CITATION TYPE:', c.source_type);

    if (c.source_type === 'ia') {
      return `<article class="citation-card">${renderIACitation(c)}</article>`;
    }
    if (c.source_type === 'book') {
      return `<article class="citation-card">${renderBookCitation(c)}</article>`;
    }
    if (c.source_type === 'article') {
      return `<article class="citation-card">${renderArticleCitation(c)}</article>`;
    }
    if (c.source_type === 'web') {
      return `<article class="citation-card">${renderWebCitation(c)}</article>`;
    }

    return `<article class="citation-card">${renderIACitation(c)}</article>`;
  }).join('');
}

// el render se controla desde dashboard.js para poder refrescarlo al cambiar de pestaña
export { renderHistorial };