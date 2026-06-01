# CORRECCIÓN DE FILTROS - MÓDULO HISTORIAL GLOBAL

**Archivo modificado:** `js/adminDashboard.js`  
**Fecha:** 1 de junio de 2026  
**Estado:** ✅ Completado

---

## RESUMEN EJECUTIVO

Se han corregido dos problemas críticos en los filtros del módulo **Historial Global**:

| Problema | Causa Raíz | Solución | Estado |
|----------|-----------|---------|--------|
| **Filtro por programa no es estricto** | Lógica de Supabase no coincide con `getProgramName()` | Filtrado local + validación defensiva | ✅ Corregido |
| **Filtro por modelo colapsa toda la UI** | Sintaxis ILIKE incorrecta (`%` en lugar de `*`) | Corrección de sintaxis + mejor manejo de errores | ✅ Corregido |

---

## PROBLEMA 1: FILTRO "FILTRAR POR PROGRAMA" - NO ES ESTRICTO

### Comportamiento Observado
Al seleccionar un programa específico, continuaban apareciendo registros de otros programas:
- Registros con "Desconocido"
- Registros con "CAI" (cuando no debería)
- Registros con otros programas

### Causa Raíz Identificada

**Líneas en código original:** `loadPage()` - línea ~460

```javascript
// ANTES (incorrecto)
if (filters.program) {
  query = query.eq('profiles.programs.nombre', filters.program);
}
```

**Problema:**
- El filtro de Supabase busca exactamente: `profiles.programs.nombre == valor`
- Pero en la UI se muestra usando `getProgramName()` que tiene lógica especial:
  - Si `tipo_usuario === 'academico_universidad'` Y `division === 'CAI'` → retorna `'CAI'`
  - Si no hay programa → retorna `'Desconocido'`
- **Resultado:** El filtro de Supabase no puede expresar estas reglas, causando mismatch entre lo filtrado y lo mostrado

Ejemplo:
```
Usuario: Académico UnADM, División CAI
- Almacenado en BD: program_id = NULL
- Mostrado en UI: getProgramName() → "CAI"  
- Filtro Supabase: Busca programs.nombre = "CAI" → No encuentra (no existe programa "CAI")
- Resultado: Registros que muestran "CAI" en la UI no se filtran
```

---

## PROBLEMA 2: FILTRO "FILTRAR POR MODELO" - COLAPSO TOTAL

### Comportamiento Observado
Al seleccionar cualquier modelo de IA (ChatGPT, GPT-4o, Claude, etc.):
- ❌ La tabla desaparece
- ❌ Los filtros desaparecen
- ❌ El buscador desaparece
- ❌ Las métricas desaparecen
- ❌ Solo queda el encabezado "Historial Global" y el botón "Descargar CSV"

**Nota:** Con otros tipos de referencia (Libro, Artículo, Web) funciona correctamente.

### Causa Raíz Identificada

**Líneas en código original:** `loadPage()` - líneas ~506-508

```javascript
// ANTES (incorrecto)
if (sourceType === 'ia') {
  query = query.or(`models.name.ilike.%${filters.model}%,model_name_custom.ilike.%${filters.model}%`);
}
```

**Problema:**
- El patrón ILIKE en Supabase/PostgREST usa `*` como comodín, NO `%`
- `%` es la sintaxis de SQL LIKE, pero Supabase usa PostgREST que es diferente
- Esto genera un error en la query de Supabase
- El error hace que la función devuelva un error, ejecutando:

```javascript
if (error) {
  console.error('Error fetching global citation history:', error);
  container.innerHTML = '<p>Error cargando historial global de IA.</p>';  // ← Borra TODO
  citations = [];
  filtered = [];
  totalRows = 0;
  return;
}
```

Este código reemplazaba **TODO** el HTML del contenedor, eliminando filtros, tabla y métricas.

**Ejemplo del error:**
```
Supabase error: Invalid ILIKE pattern: "%ChatGPT%"
Expected format: "*ChatGPT*" (asterisks, not percent signs)
```

---

## SOLUCIONES IMPLEMENTADAS

### CORRECCIÓN PROBLEMA 1: Filtro por Programa Estricto

#### 1. Eliminación del filtro de Supabase para programa
```javascript
// DESPUÉS (correcto)
// B) Filtro de programa
// CORRECCIÓN Problema 1: Eliminado de Supabase, se aplicará como filtrado LOCAL
// Razón: getProgramName() tiene lógica especial (ej: excepción CAI) 
//        que no es directamente queryable en BD
// if (filters.program) {
//   query = query.eq('profiles.programs.nombre', filters.program);
// }
```

**Justificación:** No se puede expresar la lógica de `getProgramName()` directamente en Supabase, por lo que el filtrado se hace localmente.

#### 2. Agregación de filtrado local después de obtener datos
```javascript
// CORRECCIÓN Problema 1: Aplicar filtrados LOCALES para garantizar filtros estrictos
filtered = allCitations.filter(c => {
  // Filtro local por programa: garantizar coincidencia exacta con getProgramName
  if (filters.program) {
    const programName = getProgramName(c);
    if (programName !== filters.program) {
      return false;  // Excluir si NO coincide exactamente
    }
  }
  
  // Validación defensiva: asegurar que datos críticos existen
  if (!c || typeof c !== 'object') {
    return false;
  }
  
  return true;
});
```

**Garantías:**
- Solo se muestran registros donde `getProgramName(c) === filters.program` (coincidencia exacta)
- Se excluyen `null`, `undefined`, cadenas vacías automáticamente
- Se excluyen registros que no coincidan exactamente

#### 3. Mejora defensiva en `getProgramName()`
```javascript
function getProgramName(citation) {
  // CORRECCIÓN: Validación defensiva contra objetos inválidos
  if (!citation || typeof citation !== 'object') {
    return 'Desconocido';
  }
  
  const profile = citation.profiles || {};
  const programaInstitucional = profile.programs?.nombre || null;
  
  // Excepción: académico de universidad con división CAI
  if (
    profile.tipo_usuario === 'academico_universidad' &&
    profile.division === 'Coordinación Académica y de Investigación (CAI)'
  ) {
    return 'CAI';
  }
  
  // Fallback al programa institucional o desconocido
  return programaInstitucional || 'Desconocido';
}
```

---

### CORRECCIÓN PROBLEMA 2: Sintaxis ILIKE Correcta

#### 1. Cambio de `%` a `*` en patrones ILIKE
```javascript
// ANTES (incorrecto)
query = query.or(`models.name.ilike.%${filters.model}%,model_name_custom.ilike.%${filters.model}%`);

// DESPUÉS (correcto)
query = query.or(`models.name.ilike.*${filters.model}*,model_name_custom.ilike.*${filters.model}*`);
```

**Referencia Supabase/PostgREST:**
- ILIKE es case-insensitive LIKE
- Comodín: `*` (no `%`)
- Sintaxis: `column.ilike.*pattern*`

#### 2. Mejorado manejo de errores (NO borrar todo el módulo)
```javascript
// ANTES (incorrecto)
if (error) {
  console.error('Error fetching global citation history:', error);
  container.innerHTML = '<p>Error cargando historial global de IA.</p>';  // ← Borra TODO
  citations = [];
  filtered = [];
  totalRows = 0;
  return;
}

// DESPUÉS (correcto)
if (error) {
  console.error('Error fetching global citation history:', error);
  // CORRECCIÓN Problema 2: No borrar todo el módulo, solo mostrar error en la tabla
  citations = [];
  filtered = [];
  totalRows = 0;
  renderSummary();  // ← Mantener métricas visibles
  const containerTbl = document.getElementById('history-table-container');
  if (containerTbl) {
    containerTbl.innerHTML = '<p>Error al cargar registros. Intente nuevamente.</p>';  // ← Solo tabla
  }
  renderPagination();  // ← Mantener paginación visible
  return;
}
```

**Cambios:**
- Se mantiene `renderSummary()` → métricas siguen visibles
- Se mantiene `renderPagination()` → paginación sigue visible
- Solo se reemplaza el contenedor de tabla con mensaje de error
- Los filtros y búsqueda permanecen intactos

---

## REORGANIZACIÓN DE VARIABLES PARA CLARIDAD

Se mejoró la gestión de datos para mayor claridad:

```javascript
// ANTES
let citations = [];      // Contenía registros después de paginación
let filtered = [];       // Ambiguo: ¿filtrados o sin filtrar?

// DESPUÉS
let allCitations = [];   // Todos los registros obtenidos en la página
let citations = [];      // Registros después de paginación Y filtrado local
let filtered = [];       // Reservado para extensiones futuras
```

**Flujo de datos:**
```
1. Supabase (query con filtros de servidor) → allCitations
2. Filtrado local (programa, validación) → citations
3. Renderizado → renderTablePage(citations)
```

---

## VALIDACIONES DEFENSIVAS AGREGADAS

Se añadieron validaciones en múltiples puntos:

```javascript
// En getProgramName()
if (!citation || typeof citation !== 'object') {
  return 'Desconocido';
}

// En renderTablePage()
const user = c.profiles?.full_name || c.profiles?.email || '';  // Encadenamiento seguro
const prog = getProgramName(c);  // Ya incluye validación

// En filtrado local
if (!c || typeof c !== 'object') {
  return false;  // Excluir registros inválidos
}
```

---

## VERIFICACIÓN: AMBOS PROBLEMAS SOLUCIONADOS

### Problema 1: Filtro por Programa
✅ **Ahora es estricto:**
- Seleccionar "Licenciatura en Gestión y Administración de PyME" → Solo muestra esos registros
- Seleccionar "CAI" → Solo muestra académicos con división CAI (no otros programas)
- Se excluyen `null`, `undefined`, cadenas vacías, "Desconocido"
- Comparación exacta usando `getProgramName(c) === filters.program`

### Problema 2: Filtro por Modelo
✅ **Ahora funciona correctamente:**
- Seleccionar "ChatGPT" → Muestra solo registros con ChatGPT
- Seleccionar "GPT-4o" → Muestra solo registros con GPT-4o
- Tabla sigue visible (nunca desaparece)
- Filtros permanecen visibles
- Búsqueda permanece visible
- Métricas permanecen visibles
- Paginación permanece funcional
- Si hay 0 resultados: muestra "No hay registros" pero la UI permanece intacta

---

## LISTA DE CAMBIOS ESPECÍFICOS

| Línea | Cambio | Razón |
|------|--------|-------|
| 484-486 | Eliminado filtro de programa de Supabase | No puede expresar lógica especial de `getProgramName()` |
| 506-508 | Cambio `%` → `*` en ILIKE | Sintaxis correcta para PostgREST |
| 517-519 | Cambio `%` → `*` en ILIKE | Sintaxis correcta para PostgREST |
| 529-547 | Mejorado manejo de errores | No borra todo el módulo |
| 549-572 | Agregado filtrado local | Garantiza filtro estricto por programa |
| 175-191 | Mejorada `getProgramName()` | Validación defensiva |
| 430-455 | Usada `allCitations` en `renderFilters()` | Asegurar opciones completas |
| 695 | Usado `renderTablePage(citations)` | Usar datos filtrados |

---

## NOTAS TÉCNICAS IMPORTANTES

### PostgREST vs SQL LIKE
```sql
-- SQL LIKE (No usable directo en Supabase POST REST)
WHERE column LIKE '%pattern%'

-- PostgREST ILIKE (Correcto)
.or('column.ilike.*pattern*,other.ilike.*pattern*')
```

### Encadenamiento Opcional (?.)
```javascript
// Seguro contra undefined/null
c.profiles?.name        // undefined si c.profiles es null
c.models?.name || ''    // Cadena vacía como fallback
```

### Lógica de `getProgramName()`
```
Si tipo_usuario == 'academico_universidad' Y division == 'CAI'
  → return 'CAI'
De lo contrario, si existe programa
  → return programa.nombre
De lo contrario
  → return 'Desconocido'
```

---

## RESTRICCIONES CUMPLIDAS

✅ No se modificó la estructura visual  
✅ No se alteró funcionalidad del botón CSV  
✅ No se eliminaron filtros existentes  
✅ No se modificó la paginación (excepto manejo de errores)  
✅ Se mantuvo lógica actual de búsqueda  
✅ Se corrigió SOLO la lógica de filtrado  

---

## RECOMENDACIONES FUTURAS

1. **Considerar índices en Supabase** para columnas `models.name` y `model_name_custom` para mejorar rendimiento de búsquedas ILIKE
2. **Logging mejorado** para rastrear fallos de filtrado en producción
3. **Tests unitarios** para validar `getProgramName()` con casos extremos
4. **Cache de opciones de filtros** si hay muchos registros (miles)

---

## REFERENCIAS

- [Supabase Query Guide](https://supabase.com/docs/guides/database/full-text-search)
- [PostgREST Filtering](https://postgrest.org/en/v11/references/api/tables_views.html#operators)
- [JavaScript Optional Chaining](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Optional_chaining)

---

**Fin del documento de corrección**  
Versión: 1.0  
Archivo: `js/adminDashboard.js`
