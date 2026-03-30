import { initIA } from './types/ia.js';

const container = document.getElementById('generatorContainer');
const selector = document.getElementById('sourceTypeSelect');
const formTemplate = container ? container.innerHTML : '';

function loadType(type) {
  if (!container) return;
  container.innerHTML = '';

  switch(type) {
    case 'ia':
    default:
      container.innerHTML = formTemplate;
      initIA(container);
  }
}

// inicial
loadType('ia');

// cambio dinámico
if (selector) {
  selector.addEventListener('change', (e) => {
    loadType(e.target.value);
  });
}
