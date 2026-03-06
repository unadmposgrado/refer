// historial.js
// Gestión de la vista de historial de citas.

import { requireAuth } from './auth.js';
import { getUserCitations } from './citations.js';

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


  // Para cada cita construir tarjeta
  data.forEach(c => {
    const card = document.createElement('article');
    card.className = 'citation-card';

    // model display: prefer relación ya cargada, luego nombre personalizado
    const modelDisplay = c.models?.name || c.model_name_custom || '—';

    card.innerHTML = `
      <div class="citation-text">${c.citation_text || ''}</div>
      <div class="citation-extra">
        <strong>Tema:</strong> ${c.tema || ''} &nbsp;|&nbsp;
        <strong>Prompt:</strong> ${c.prompt || ''} &nbsp;|&nbsp;
        <strong>Respuesta:</strong> ${c.llm_response || ''}
      </div>
      <div class="citation-meta">
        <span class="meta-item"><strong>Modelo:</strong> ${modelDisplay}</span>
        <span class="meta-item"><strong>Guardado:</strong> ${formatDate(c.created_at)}</span>
      </div>
    `;

    container.appendChild(card);
  });
}

// el render se controla desde dashboard.js para poder refrescarlo al cambiar de pestaña
export { renderHistorial };