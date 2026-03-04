// historial.js
// Gestión de la vista de historial de citas.

import { requireAuth } from './auth.js';
import { getUserCitations } from './citations.js';

async function renderHistorial() {
  // proteger la página
  await requireAuth();

  const container = document.getElementById('historial-list');
  if (!container) return;

  let result;
  try {
    result = await getUserCitations();
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

  if (!data || data.length === 0) {
    container.textContent = 'No tienes citas guardadas todavía.';
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

  // Para cada cita construir tarjeta
  data.forEach(c => {
    const card = document.createElement('article');
    card.className = 'citation-card';

    // model display
    let modelDisplay = '';
    if (c.model_id) {
      // intentar obtener label de un <select> existente (puede no haber ninguno)
      const opt = document.querySelector(`select option[value="${c.model_id}"]`);
      modelDisplay = opt ? opt.textContent : c.model_id;
    } else {
      modelDisplay = c.model_name_custom || '';
    }

    card.innerHTML = `
      <div class="citation-text">${c.citation_text || ''}</div>
      <div class="citation-meta">
        <span class="meta-item"><strong>Modelo:</strong> ${modelDisplay}</span>
        <span class="meta-item"><strong>Consulta:</strong> ${formatDate(c.consulta_fecha)}</span>
        <span class="meta-item"><strong>Guardado:</strong> ${formatDate(c.created_at)}</span>
      </div>
    `;

    container.appendChild(card);
  });
}

// ejecutar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', renderHistorial);
} else {
  renderHistorial();
}

export { renderHistorial };