# Informe técnico - Frontend de la aplicación

## 🗂 A. Estructura de archivos

```
/css
  └── styles.css
/img
/js
  ├── app.js           ← lógica principal del formulario
  ├── header.js        ← carga del encabezado y menú de usuario
  ├── login.js         ← gestión de inicio de sesión
  └── registro.js      ← gestión de registro
header.html
header-logged.html
historial.html         ← marcador de posición
index.html             ← página “no logueado” (casi idéntica a refer.html)
login.html
refer.html             ← formulario activo para generar la referencia
registro.html
```

> **Nota:** todos los HTML importan `supabase-js` y luego _todos_ los JS, aunque sólo algunos lo necesitan.

---

## 🔐 B. Flujo de autenticación actual

1. **Supabase config duplicada** en `app.js`, `login.js` y `registro.js` (misma URL/KEY).
2. `login.js` y `registro.js` crean un `supabaseClient` local y manejan los formularios (`signInWithPassword`, `signUp`).
3. `app.js` define otro cliente y ejecuta `checkSession()` al cargar cualquier página protegida (`refer.html`, `historial.html`).
4. `header.js` depende de `window.supabaseClient` para cargar avatar y cerrar sesión.
5. No existe módulo centralizado; cada archivo toca directamente la SDK de Supabase.

⚠️ Riesgos: la lógica de sesión está atomizada, configuración repetida, enfoque propenso a errores.

---

## ✏️ C. Flujo de generación de referencia

- 100 % client‑side en `app.js`.
- El formulario valida HTML5, construye la cita con `buildAPA()` y la muestra en el DOM.
- Autocompletado de campos a partir de catálogos embebidos.
- No hay ninguna llamada a Supabase ni intento de persistencia.
- El botón «copiar» usa Clipboard API.

🔎 Resultado: **la app no guarda ninguna cita**.

---

## 📡 D. Interacciones actuales con Supabase

| Archivo     | Interacción con Supabase                                                                 |
|-------------|------------------------------------------------------------------------------------------|
| app.js      | sólo `auth.getSession()` y guardado global del cliente                                  |
| header.js   | `auth.getUser()` para avatar, `auth.signOut()`                                          |
| login.js    | `auth.signInWithPassword()`                                                              |
| registro.js | `auth.signUp()`                                                                           |

→ **no existe ninguna operación sobre la tabla `citations` ni sobre `profiles/models`.**

---

## ⚠️ E. Inconsistencias con la nueva arquitectura

- **Tabla `citations` no utilizada**: no hay ningún CRUD.
- El catálogo de modelos vive en `app.js` hard‑coded; debería provenir de la tabla `models`.
- No se contemplan `model_id` vs `model_name_custom`/`organization_custom`.
- La página `historial.html` no consulta datos, solo muestra un texto.
- No hay vistas ni filtrado para administradores.
- No se aprovecha RLS (el FE no sabe de filas, asume que filtrará por `user_id`).

---

## 🔒 F. Riesgos de seguridad

- **Roles en el frontend**: no se obtiene el rol desde el servidor; se confía en `user_metadata` u otros valores manipulables.
- **Filtro de historiales**: si se implementa filtrando `user_id` en JS y pasa a una query, un atacante podría cambiarlo y consultar otros usuarios si RLS no está configurado correctamente.
- **Duplicación de API keys** en tres scripts facilita exposiciones accidentales.
- **Lógica de control de acceso dentro de JS** (ej. redirección en `checkSession`) puede ser eludida.

> El único confinamiento real debe ser Supabase + RLS; el frontend sólo debe solicitar datos y dejar que las políticas impidan accesos.

---

## 🔄 G. Problemas de acoplamiento / duplicación

- SDK de Supabase instanciado varias veces; cliente global `window.supabaseClient` mezclado con locales.
- Catálogo de modelos y lógica de autocompletado en `app.js` junto con construcción de APA, validaciones, eventos del DOM: un solo archivo con demasiadas responsabilidades.
- `header.js` mezcla carga de plantillas, listeners de navegación y gestión de sesión.
- Los eventos de formularios están dispersos (login, registro, generar referencia).
- Reutilización mínima de utilidades comunes (`buildAPA`, `formatDateSpanish`…).

> En general, hay una violación del principio **separación de responsabilidades**.

---

## 🛠 Recomendaciones de refactorización

### 1. Archivos existentes a modificar

- **app.js** → renombrar a `formulario.js` o mover sólo la lógica de cita.
- **login.js/registro.js** → retirar configuración Supabase; delegar a ` auth.js`.
- **header.js** → simplificar: sólo carga HTML y exporta eventos; consumir servicios desde otros módulos.
- **historial.html** → añadir scripts específicos (`historial.js`).
- **refer.html/index.html** → actualizar inclusiones de scripts según la nueva organización.
- **++ CSS/HTML** → probablemente sin cambios mayores, salvo incluir nuevos contenedores para listados/admin.

### 2. Archivos nuevos a crear

- `src/api.js` (o `supabase.js`): **único punto** de creación/exposición del cliente Supabase y wrappers genéricos.
- `src/auth.js`: funciones de login, register, logout, getSession, getProfile, checkAdmin, etc.
- `src/citations.js`: CRUD sobre `citations` + construcción de APA (o esto último en utils).
- `src/models.js`: lectura del catálogo institucional desde la tabla `models` + helpers de autocompletado.
- `src/historial.js`: lógica de `historial.html` (carga de registros, paginación).
- `src/admin.js`: funciones para dashboard admin (fetch all, filter by user, agregados).
- `src/utils.js`: helper genéricos (formateo de fechas, escape HTML).
- (Opcional) `src/ui.js` o similares para manejar notificaciones, loaders, etc.

> Puede mantenerse la carpeta `js/` pero los nuevos módulos deben cargarse en el orden correcto.

### 3. Funciones a agregar

- **auth.js**
  - `initAuth()` – config inicial, redirección automática.
  - `login(email, pwd)`, `register(data)`, `logout()`.
  - `getCurrentUser()`, `getUserRole()`, `onAuthStateChange(callback)`.
- **api.js**
  - `getSupabaseClient()`
  - wrappers `from(table).select(...)`, `rpc(...)` si se usan funciones.
- **citations.js**
  - `saveCitation(citationData)` – maneja lógica de `model_id` vs `custom`.
  - `getUserCitations({limit, offset})`.
  - `getAllCitations(...)` para admin.
- **models.js**
  - `fetchModels()` → devuelve catálogo institucional.
  - `findModelByDomain(domain)` – para autocompletar.
- **historial.js**
  - `initHistorial()` – invocado desde DOMContentLoaded.
  - `renderCitations(list)`.
- **admin.js**
  - `initAdminDashboard()`
  - `fetchUserList()`, `fetchMetrics()`.

### 4. Funciones a eliminar o refactorizar

- Eliminar duplicados de `SUPABASE_URL`/`KEY` en todos.
- Mover utilidades (`buildAPA`, `formatDateSpanish`, `extractDomainFromUrl`) a `utils.js` o `citations.js`.
- Quitar `checkSession` de `app.js` (mover a `auth.js` con nombre más general).
- Unificar el catálogo de modelos a partir de `models.js`; eliminar la versión estática de `app.js`.
- Reducir `header.js` a carga de plantilla + eventos de UI; todas las llamadas a supabase deben usar `auth.js`.

---

## 🏗 Propuesta de arquitectura frontend

```
/js
  ├── api.js          ← instancia compartida de Supabase + helpers
  ├── auth.js         ← rutas y lógica de autenticación
  ├── models.js       ← catálogo de modelos
  ├── citations.js    ← CRUD y construcción de referencias
  ├── historial.js    ← página /historial.html
  ├── admin.js        ← funcionalidades exclusivas de administradores
  ├── utils.js        ← utilidades (fecha, escape, etc.)
  ├── header.js       ← carga de HTML/menú, muy ligero
  ├── registro.js     ← sólo invoca auth.register()
  ├── login.js        ← sólo invoca auth.login()
  └── form.js         ← manejo del formulario en refer.html
```

> Cada módulo exporta funciones explícitas; sólo `api.js` interactúa directamente con la SDK.

---

## 🔁 Flujos ideales

1. **Guardar una cita**
   1. Usuario completa formulario en `refer.html`.
   2. `form.js` valida y construye objeto `citationData`.
   3. Llama `citations.saveCitation(citationData)`.
   4. `saveCitation` decide si usa `model_id` o campos custom, invoca `api.from('citations').insert(...)`.
   5. Respuesta se devuelve al formulario para mostrar confirmación; el historial se actualizará automáticamente si está visible.

2. **Cargar historial de usuario**
   1. `historial.js.initHistorial()` se ejecuta al cargar `historial.html` (tras inicio de sesión).
   2. Llama a `citations.getUserCitations()`.
   3. Supabase, gracias a RLS, sólo devuelve filas propias.
   4. `historial.js` renderiza la lista ordenada por `created_at DESC`.
   5. Opcional: paginación/filtrado implementado en este módulo.

3. **Cargar dashboard admin**
   1. Comprobar rol con `auth.getUserRole()`.
   2. Si es `'admin'`, mostrar UI extra (selector de usuario, métricas).
   3. Llamadas a `citations.getAllCitations({userId})` o `api.rpc('citations_aggregates', ...)`.
   4. `admin.js` construye gráficos/tablas.

---

## 🧩 Violaciones actuales de separación de responsabilidades

- `app.js` mezcla validación, UI, catálogo, autocompletado y (eventualmente) guardado.
- `header.js` ejecuta lógica de login/registro además de cargar el HTML.
- `login.js` y `registro.js` conocen los selectores del DOM directamente en lugar de exponerse como APIs reutilizables.
- Copia/pega de supabase config en cada archivo.

→ El objetivo es mover esos comportamientos a módulos especializados y dejar a los HTML mínimos — cada script sólo se encarga de inicializar su parte de la interfaz.

---

## ✅ Prioridades de refactorización

1. **Alta**
   - Centralizar cliente Supabase (`api.js`).
   - Implementar `citations.saveCitation` y conectar con el formulario.
   - Crear `historial.js` con la consulta real y whip up page.
   - Retirar catálogo hard‑coded y sustituir por `models.fetchModels()`.
   - Reducir riesgos de seguridad: eliminar confianza en `user_metadata` para roles; leer rol desde JWT o `profiles` mediante RLS.

2. **Media**
   - Crear `auth.js` con métodos reutilizables y eliminar duplicación en login/registro.
   - Refactorizar `header.js` para usar `auth` y separar UI.
   - Añadir soporte admin básico (mostrar/ocultar UI según rol).

3. **Baja**
   - Mover utilitarios (`formatDate`, etc.) a un módulo genérico.
   - Mejorar UX del historial (paginación, recarga tras guardar).
   - Añadir tests/validaciones de la API si fuera necesario.

> El plan global reordena estructuras y limpia el acoplamiento para cumplir con la base de datos relacional ya desplegada.

---

Si avanzamos con estos cambios, el frontend quedará coherente con la nueva arquitectura, facilitará el mantenimiento y reducirá riesgos de seguridad al dejar toda la lógica sensible en el servidor/Supabase.