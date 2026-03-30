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


  // Extraemos render de IA para no tocar la lógica actual y soportar nuevos tipos.
  function renderIACitation(c) {
    const modelDisplay = c.models?.name || c.model_name_custom || '—';
    return `
      <div class="citation-text markdown-body">${renderMarkdown(c.citation_text)}</div>
      <div class="citation-extra">
        <strong>Tema:</strong> ${c.tema || ''}
        <div><strong>Prompt:</strong></div>
        <div class="historial-texto markdown-body">${renderMarkdown(c.prompt)}</div>
        <div><strong>Respuesta:</strong></div>
        <div class="historial-texto markdown-body">${renderMarkdown(c.llm_response)}</div>
      </div>
      <div class="citation-meta">
        <span class="meta-item"><strong>Modelo:</strong> ${modelDisplay}</span>
        <span class="meta-item"><strong>Guardado:</strong> ${formatDate(c.created_at)}</span>
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
          <p><strong>Autor:</strong> ${meta.autor || ''}</p>
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
        <span class="meta-item"><strong>Guardado:</strong> ${formatDate(c.created_at)}</span>
      </div>
    `;
  }

  // Para cada cita construir tarjeta según source_type (ia/book)
  container.innerHTML = data.map(c => {
    console.log('CITATION TYPE:', c.source_type);

    if (c.source_type === 'book') {
      return `<article class="citation-card">${renderBookCitation(c)}</article>`;
    }
    return `<article class="citation-card">${renderIACitation(c)}</article>`;
  }).join('');
}

// el render se controla desde dashboard.js para poder refrescarlo al cambiar de pestaña
export { renderHistorial };