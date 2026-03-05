// metrics.js
// Sección de métricas administrativa (estructura inicial).
// De momento solo muestra un mensaje de carga y deja sitio para futuros cálculos.

export async function renderMetrics() {
  const container = document.getElementById('metrics-section');
  if (!container) return;

  container.innerHTML = `
    <h2>Métricas del sistema</h2>
    <p>Cargando métricas...</p>
  `;
}
