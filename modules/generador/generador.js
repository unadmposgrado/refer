import { initIA } from './types/ia.js';
import { initAIDeclaration } from './types/iaDeclaration.js';
import { initLibro } from './types/libro.js';
import { initArticulo } from './types/articulo.js';
import { initWeb } from './types/web.js';
import { initTablaFigura } from './types/tablaFigura.js';

const container = document.getElementById('generatorContainer');
const selector = document.getElementById('sourceTypeSelect');
const formTemplate = container ? container.innerHTML : '';

function loadType(type) {
  if (!container) return;
  container.innerHTML = '';
  const copyBtn = document.getElementById('copyBtn');
  const resultTitle = document.getElementById('result-title');
  const reference = document.getElementById('reference');
  const isAIDeclaration = type === 'ai-declaration';

  if (copyBtn) {
    copyBtn.textContent = isAIDeclaration ? 'Copiar prompt' : 'Copiar referencia';
    copyBtn.dataset.copyLabel = copyBtn.textContent;
  }
  if (resultTitle) resultTitle.textContent = isAIDeclaration ? 'Prompt generado' : 'Referencia generada';
  if (reference) {
    reference.textContent = isAIDeclaration
      ? 'Aquí se mostrará el prompt generado.'
      : 'Aquí se mostrará la referencia en formato APA.';
    reference.style.whiteSpace = isAIDeclaration ? 'pre-wrap' : '';
  }

  switch(type) {
    case 'book':
      initLibro(container);
      break;
    case 'article':
      initArticulo(container);
      break;
    case 'web':
      initWeb(container);
      break;
    case 'table-figure':
      initTablaFigura(container);
      break;
    case 'ai-declaration':
      initAIDeclaration(container);
      break;
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
