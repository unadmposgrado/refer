# Informe técnico del sistema

Este documento describe de forma exhaustiva la arquitectura, el funcionamiento y las decisiones técnicas de la aplicación "Generador de referencias IA" basada en un frontend HTML/JavaScript y un backend gestionado por Supabase. Está pensado para que cualquier desarrollador o asistente de IA pueda comprender el conjunto del proyecto sin necesidad de leer directamente el código fuente.

---

## 1. Descripción general del sistema

* **Nombre del proyecto:** Generador de referencias IA (a veces denominado "Generador de referencias de LLM").
* **Propósito de la aplicación:** Ayudar a estudiantes/investigadores a generar citas bibliográficas en formato APA de contenidos generados por modelos de lenguaje y almacenar dichas referencias en una base de datos personal.
* **Tipo de aplicación:** Web app frontend estática con lógica en JavaScript puro (sin frameworks) + backend gestionado íntegramente por Supabase (Auth, PostgreSQL, RLS).
* **Problema que resuelve:** Facilita la creación de referencias académicas para contenidos de inteligencia artificial, manteniendo un historial personal y permitiendo a un administrador ver métricas globales.
* **Funcionalidades principales:**
  1. Registro e inicio de sesión de usuarios mediante Supabase Auth.
  2. Generación de referencias APA a partir de datos del usuario y del modelo de IA utilizado.
  3. Autocompletado de organización y URL según modelo o dominio.
  4. Almacenamiento de la cita junto con metadatos en la tabla `citations` de la base de datos.
  5. Visualización del historial de citas de cada usuario con métricas simples.
  6. Panel administrativo con métricas globales y tabla filtrable de todas las citas.
  7. Gestión de roles (`user`/`admin`) y control de acceso a vistas.
  8. Navegación dinámica adaptada al estado de autenticación y tamaño de pantalla (menú hamburguesa).

---

## 2. Arquitectura general

La aplicación adopta un estilo **frontend-first**: toda la lógica de negocio y presentación reside en archivos HTML/CSS/JavaScript entregados estáticamente, mientras que Supabase actúa como backend "serverless".

* **Frontend:**
  * Páginas HTML independientes (`index.html`, `refer.html`, `historial.html`, `admin.html`, `login.html`, `registro.html`).
  * Estilos en CSS (`css/styles.css`).
  * Módulos ES con código organizado en `js/` (autenticación, formularios, CRUD, navegación, etc.).
  * Interacción con la API de Supabase mediante la librería oficial cargada desde CDN (`@supabase/supabase-js`).
  * No se utilizan frameworks (React/Vue/etc); se manipula el DOM directamente.

* **Backend:**
  * Supabase proporciona:
    * **Auth**, encargado de registro, inicio de sesión y gestión de sesiones JWT.
    * **Base de datos PostgreSQL** con tres tablas principales (`profiles`, `models`, `citations`).
    * **Row Level Security (RLS)** para garantizar que cada usuario sólo pueda leer/crear sus propias citas, y que sólo los administradores puedan acceder a datos globales.
    * **Storage** no utilizado (no hay archivos) y funciones SQL mínimas si las hubiera.

* **Autenticación con Supabase Auth:** se usa mediante el cliente JavaScript; el token se guarda en `localStorage` y se renueva automáticamente. Las funciones utilitarias en `auth.js` encapsulan llamadas como `supabase.auth.getUser()` y `supabase.auth.signOut()`.

* **Persistencia de datos:** todo se guarda en PostgreSQL. La aplicación nunca accede directamente al servidor de base de datos; las operaciones se hacen vía la API REST generada por Supabase.

* **Row Level Security (RLS):** activa en las tablas relevantes. Las políticas hacen que:
  * los usuarios puedan **INSERT** y **SELECT** sólo en filas donde `user_id = auth.uid()` (para `citations` y también `profiles` cuando se permiten actualizaciones).
  * los administradores (perfil `admin`) puedan leer todas las filas de `citations` y `profiles`.
  * se prohíben modificaciones no autorizadas y, por ejemplo, se evita que un usuario cambie su propio rol.

* **Flujo general de petición/respuesta:**

```
Usuario → Frontend → Supabase Auth → Supabase DB → Respuesta → UI
```

El navegador del usuario ejecuta el código JS, que llama a `supabase` (cliente) para realizar las operaciones. Las respuestas JSON llegan al frontend y se renderizan en la interfaz.

---

## 3. Estructura completa del proyecto

```
/
  admin.html
  check.js
  header-logged.html
  header.html
  historial.html
  index.html
  login.html
  refer.html
  registro.html
  informe_frontend.md        ← documento previo (interno)
  informe_sistema.md         ← este informe
  css/
    styles.css
  img/                       ← imágenes usadas en el sitio
    Banner SSA.png
    Banner SSA - copia.png
    IA_icon.png
    index.jpg
    cita.png
    referencia.png
    referenciaAI.png
    referenciaPC.png
    unadm-logo.jpg
  js/
    adminDashboard.js       ← lógica del panel admin global
    app.js                  ← controlador principal del formulario y helpers
    auth.js                 ← capa centralizada de autenticación (sesiones, roles)
    citations.js            ← CRUD para la tabla `citations`
    dashboard.js            ← métricas de usuario + gestión de pestañas en historial
    header.js               ← carga dinámica del header y enlaces de navegación
    historial.js            ← renderizado del historial de citas
    login.js                ← manejo del formulario de login
    metrics.js              ← render de métrica admin placeholder
    registro.js             ← manejo del formulario de registro
    supabaseClient.js       ← instancia compartida de Supabase
    ui-menu.js              ← comportamiento del menú hamburguesa
```

### Archivo por archivo

* **`supabaseClient.js`**
  * Crea y exporta un único cliente Supabase con URL y ANON KEY.
  * Importado por casi todos los módulos que necesitan comunicarse con la base de datos.

* **`auth.js`**
  * Funciones para obtener la sesión/usuario/rol, forzar autenticación o invitado, y escuchar cambios de estado.
  * Se encarga de las redirecciones cuando el estado no coincide con la página actual.
  * Utilizado por casi todas las páginas que requieren comprobar el estado del usuario.

* **`login.js`**
  * Inicializa el formulario de inicio de sesión (`login.html`), valida campos y llama a `supabase.auth.signInWithPassword`.
  * Usa `requireGuest()` para evitar que un usuario ya autenticado vea la página.

* **`registro.js`**
  * Inicializa el formulario de registro (`registro.html`), valida los campos, llama a `supabase.auth.signUp` pasando los datos extra como `user_metadata`.

* **`header.js`**
  * Descarga `header.html` o `header-logged.html` según si el usuario está autenticado.
  * Inserta el HTML en el DOM y añade los manejadores de eventos para navegación (login, registro, generador, historial, métricas, logout).
  * Llama a `initLogin()` y `initRegister()` de ser necesario.
  * Activa el `initHamburgerMenu()` para habilitar el menú en móviles.

* **`ui-menu.js`**
  * Añade la lógica para mostrar/ocultar el menú hamburguesa y cerrarlo al seleccionar una opción.

* **`app.js`**
  * Contiene el código más voluminoso del cliente: carga de modelos, catálogo local, autocompletado URL, construcción de la cita APA, validaciones, generación y copia de la referencia.
  * Escucha el evento `DOMContentLoaded` para cargar dinámicamente los modelos desde la tabla `models` y encolar la opción "Otro modelo".
  * Evento `submit` del formulario: construye objeto de cita, llama a `saveCitation()`, limpia campos opcionales.
  * Define utilidades auxiliares (`extractDomainFromUrl`, `parseLocalDate`, `formatDateSpanish`, `buildAPA`).

* **`citations.js`**
  * `saveCitation(data)`: añade `user_id` obtenido de `getUser()` y ejecuta `supabase.from('citations').insert(...)`.
  * `getUserCitations(user?)`: recupera las citas del usuario ordenadas por `created_at` desc, incluyendo relación con `models` para mostrar el nombre.

* **`historial.js`**
  * Lógica de la vista de historial: invoca `requireAuth()`, muestra el nombre del usuario, llama a `getUserCitations()` y renderiza cada cita en tarjetas HTML.
  * Formatea las fechas y maneja el caso en que no hay citas.

* **`dashboard.js`**
  * Muestra métricas en la pantalla de historial (total de citas, modelo más usado, última cita, citas del mes). También gestiona la pestañas `#historial` y `#metrics`.
  * Reutiliza `renderHistorial()` e introduce `showMetrics()` para administradores.

* **`metrics.js`**
  * Implementación mínima que muestra un mensaje de carga; sirve de placeholder para futuras métricas globales.

* **`adminDashboard.js`**
  * Página de administrador: protege con `requireAuth()` y revisa el rol.
  * Consulta todas las citas, junto con los emails de los perfiles y nombres de modelos, y calcula métricas globales (total citas, total usuarios, modelo más usado).
  * Renderiza una tabla con filtro por modelo y rango de fechas en el cliente.

* **HTML estáticos** (`index.html`, `refer.html`, `historial.html`, `admin.html`, `login.html`, `registro.html`)
  * Definen la estructura de cada vista, importan los scripts necesarios y usan atributos ARIA para accesibilidad.
  * Cada página incluye el `<div id="siteHeader"></div>` que es reemplazado por `header.js`.
  * `refer.html` contiene el formulario completo y lugares para la referencia generada.
  * `historial.html` y `admin.html` contienen contenedores vacíos (`<div>` con identificadores) que los scripts rellenan.
  * Se emplean estilos personalizados y reglas CSS en línea en `refer.html` para mejorar la presentación de los `<select>`.

* **`informe_frontend.md`**
  * Documento previo con una descripción parcial del frontend.

* **Otros archivos del repositorio**
  * Un script de comprobación `check.js` usado para testear la conexión con Supabase.
  * Archivos de imagen para logo y gráficos.

---

## 4. Base de datos en Supabase

### Tabla `profiles`

* **Estructura (columnas relevantes)**
  * `id` (UUID) – corresponde al `id` de `auth.users` generado por Supabase.
  * `email` (text) – correo electrónico almacenado en el perfil, a veces replicado de `auth.users`.
  * `role` (text) – `user` o `admin` (valor por defecto `user`).
  * otros campos `full_name`, `program`, `matricula` que se guardan en `user_metadata` al momento de sign-up.
  * `created_at`, `updated_at` (timestamps).

* **Propósito:** almacenar información adicional de la cuenta además de la provista por el sistema de autenticación. La aplicación usa `role` para determinar privilegios.

* **Relación con `auth.users`:** existe una llave foránea implícita `profiles.id = auth.uid()` y Supabase puede auto‑crear el perfil en un trigger `auth.user_created`.

* **Roles existentes:** `'user'` (por defecto) y `'admin'`.

### Tabla `models`

* **Estructura:**
  * `id` (UUID, PK)
  * `name` (text)
  * `organization_responsible` (text)
  * `model_url` (text)
  * `created_at`, `updated_at` (timestamps)

* **Propósito:** mantener un catálogo de modelos de lenguaje conocidos para autocompletado en el formulario. El frontend carga estos registros para poblar el `<select>`.

### Tabla `citations`

* **Estructura:**
  * `id` (UUID, PK)
  * `user_id` (UUID, FK a `profiles.id`)
  * `model_id` (UUID, FK a `models.id`, nullable)
  * `model_name_custom` (text, nullable) – utilizado cuando el usuario especifica un modelo no registrado.
  * `organization_custom` (text, nullable) – similar al anterior para organizaciones.
  * `version` (text, nullable)
  * `consulta_fecha` (date, nullable) – fecha indicada por el usuario para la consulta.
  * `tema` (text, nullable)
  * `prompt` (text, nullable)
  * `llm_response` (text, nullable)
  * `citation_text` (text, nullable) – el texto final en formato APA.
  * `created_at` y `updated_at` (timestamps)

* **Relaciones:**
  * `user_id` → `profiles(id)` (FK). Cada cita pertenece a un único usuario.
  * `model_id` → `models(id)` (FK). Puede ser `NULL` si se usó un modelo personalizado.

* **Índices:**
  * índice por `user_id` (usado en consultas propias).
  * índice por `model_id` (posible mejora para filtros administrativos).

* **Restricciones/Defaults:**
  * `user_id` NOT NULL.
  * `model_id` NULLABLE.
  * Las columnas `created_at` y `updated_at` probablemente se llenan mediante triggers automáticos de Supabase.

---

## 5. Políticas de seguridad (RLS)

Las políticas en Supabase (PostgreSQL) no se encuentran en el repositorio, pero su existencia se deduce del comportamiento de la aplicación y de las buenas prácticas recomendadas. A continuación se describe su función conceptual y los efectos:

* **Política `citations_select_own`** (nombre estimado):
  * Permite `SELECT` únicamente si `user_id = auth.uid()`.
  * Rol aplicado: `authenticated` (todos los usuarios logueados).
  * Protege contra la lectura de citas de otros usuarios.

* **Política `citations_insert_authenticated`**:
  * Permite `INSERT` con cualquier `user_id` igual a `auth.uid()` (o directamente omitir `user_id` en payload, ya que el cliente lo añade). A veces se fuerza `with check (user_id = auth.uid())`.
  * Evita que un usuario inyecte citas en nombre de otro.

* **Política `citations_update_own`** (si existe):
  * Permite `UPDATE` sólo sobre filas del propio usuario.
  * Utilizada en caso de permitir edición posterior, aunque el frontend no tiene dicha función hoy.

* **Política `citations_select_admin`**:
  * Permite a `service_role` ‌o a usuarios con `role = 'admin'` ver todas las filas (se basa en una condición `exists (select 1 from profiles where profiles.id = auth.uid() and role = 'admin')`).

* **Política `profiles_select_own`** y `profiles_update_own`:
  * Permitidas sólo si `id = auth.uid()`; de esta forma un usuario puede ver/editar su propio perfil.

* **Política `profiles_select_admin`**:
  * Permite a administradores leer la tabla completa (esto es necesario para que el panel admin muestre los emails). 

> ⚠️ **Nota:** los nombres reales de las políticas pueden variar; la esencia es que cada tabla tiene reglas que combinan `auth.uid()` con los campos `user_id` o `id`, y un filtro adicional para comprobar el rol de administrador. Las políticas son críticas para evitar exposición de datos cuando el frontend no especifica filtros (por ejemplo, la consulta de `adminDashboard.js` recupera todas las filas suponiendo que RLS se lo permite sólo a admins).

---

## 6. Flujo de autenticación

1. **Registro:**
   * El usuario llena el formulario en `registro.html`.
   * `registro.js` valida los campos y llama a `supabase.auth.signUp(...)` pasando `email`, `password` y `options.data` con metadatos (`full_name`, `program`, `matricula`).
   * Supabase crea un nuevo registro en `auth.users` y, si está configurado, dispara un trigger que crea una fila correspondiente en `profiles` con `role` por defecto `user`.
   * Si la confirmación por correo está habilitada, el usuario recibe un email y debe verificar antes de iniciar sesión. El script redirige a `login.html`.

2. **Login:**
   * `login.html` contiene el formulario de inicio de sesión.
   * `login.js` intercepta el `submit` y llama a `supabase.auth.signInWithPassword`.
   * En caso de éxito, Supabase devuelve una sesión con JWT que el cliente almacena automáticamente.
   * El evento `SIGNED_IN` del listener (`auth.onAuthStateChange`) redirige al usuario a `refer.html` si está en la página pública.

3. **Persistencia de sesión:**
   * Supabase guarda la sesión en `localStorage`/`cookie` y renueva el token cuando es necesario.
   * Al recargar cualquier página, `auth.js.getUser()` o `supabase.auth.getSession()` lee la sesión y proporciona el usuario actual.

4. **Verificación de sesión:**
   * Las páginas protegidas (`refer.html`, `historial.html`, `admin.html`) llaman a `requireAuth()` o `requireAdmin()` al cargar.
   * Si no existe usuario, se redirige a `index.html`. `requireGuest()` se emplea en páginas públicas para evitar que un usuario autenticado visite el formulario de login/registro.

5. **Obtención del perfil:**
   * `auth.js.getProfile()` ejecuta una consulta a `profiles` filtrando por `id = user.id`. Devuelve el perfil o `null` si hay error.
   * `auth.js.getUserRole()` reutiliza `getProfile()` y extrae el campo `role`.
   * El rol se usa en `header.js` para mostrar/ocultar el botón de métricas y en funciones como `requireAdmin()`.

6. **Logout:**
   * El enlace `Cerrar sesión` en el header invoca `supabase.auth.signOut()` y la escucha global reenruta a `login.html`.

---

## 7. Flujo de generación de referencias

1. El usuario autenticado accede a `refer.html` (después de que `auth.requireAuth()` confirme la sesión).
2. Al cargar el DOM, `app.js` ejecuta `loadModels()` para poblar el `<select id="model-select">` con los registros de la tabla `models`. Cada opción usa `value` igual al `id` del modelo y muestra `name`.
3. El usuario selecciona un modelo. El `change` listener en `modelSelect` realiza:
   * Si el valor es una UUID válida y existe en `modelCache`, auto‑rellena los campos `organization_custom` y `platformUrl` desde la caché (o, si no hay datos en caché, realiza una consulta puntual a Supabase para obtenerlos y luego los almacena en caché).
   * Si el valor es "otro", muestra el campo de texto `model-name-custom` para ingreso manual y marca el `<select>` como `aria-disabled`.
   * Si el valor cambia al placeholder, limpia los campos.
4. El usuario puede escribir manualmente en `model-name-custom`, y hay validaciones de `input` para borrar errores.
5. El usuario también puede pegar una URL en `platformUrl`. Al `blur` de ese campo se extrae el dominio y se busca en el catálogo estático `catalogoIAporDominio`. Si hay coincidencia:
   * Se selecciona automáticamente el modelo correspondiente (buscando el `id` en `modelCache`), lo que dispara el listener anterior y rellena organización y url oficiales.
   * Se asigna la fecha de consulta actual si no hay una ya establecida.
   * Si no hay coincidencia en el catálogo, se fuerza la selección de "Otro modelo" y se deja al usuario rellenar manualmente.
6. El usuario completa campos opcionales como `model-version`, `tema`, `prompt`, `llm-response` y `consulta-fecha` (obligatorio).
7. Al enviar el formulario, el manejador `submit` de `app.js`:
   * Valida la forma nativa del formulario.
   * Determina el nombre final del modelo (`finalModelName`) a partir de la selección o del campo manual.
   * Valida que haya un nombre y organización si no se seleccionó un modelo válido.
   * Construye un objeto `values` con todos los datos relevantes.
   * Llama a `buildAPA(values)` para generar el texto de la referencia en HTML con <em>cursivas</em>.
   * Inserta el resultado en el elemento `#reference` y lo enfoca.
   * Ejecuta un bloque asíncrono que prepara un objeto `citationData` y llama a `saveCitation(citationData)` (ver siguiente sección).
8. La referencia se muestra en pantalla y el usuario puede copiarla con el botón "Copiar referencia", que utiliza la API de portapapeles.

---

## 8. Flujo de guardado de citas

1. Tras la generación, `app.js` construye un objeto de la forma:
   ```js
   const citationData = {
     model_id,                // UUID o null
     model_name_custom,       // string o null
     organization_custom,     // string o null
     version: values.modelVersion || null,
     consulta_fecha: values.accessDate || null,
     tema: values.tema || null,
     prompt: values.prompt || null,
     llm_response: values.llm_response || null,
     citation_text: apa
   };
   ```
2. Llama a `saveCitation(citationData)` del módulo `citations.js`.
3. `saveCitation`:
   * Llama a `getUser()` para obtener el usuario actual. Si no hay sesión lanza un error.
   * Compone `payload` añadiendo `user_id: user.id` junto a los demás campos (fase de normalización con `|| null`).
   * Realiza `await supabase.from('citations').insert([payload])`.
   * Retorna `{ data: inserted, error }`.
4. El bloque `async` en `app.js` revisa el resultado. Si hay error, lo imprime en consola; si está exitoso, limpia campos opcionales para permitir otra cita sin perder el modelo seleccionado.
5. Si el error es una excepción inesperada (por ejemplo, RLS bloqueando la inserción), se captura y se registra.

---

## 9. Flujo del historial

1. El usuario entra a `historial.html`.
2. `dashboard.js` y `historial.js` se cargan. El primero decide qué sección mostrar según #hash y llama a `renderHistorial()`.
3. `renderHistorial()` (en `historial.js`) ejecuta `requireAuth()` para asegurarse de que hay usuario. Si no lo hay se redirige.
4. Obtiene el usuario retornado por `requireAuth()`, muestra su nombre/email en `#user-name`.
5. Llama a `getUserCitations(user)` (que ejecuta la consulta a `citations` restringida por `user_id`). La consulta incluye la relación `models (id, name)` para permitir mostrar el nombre del modelo.
6. Si no hay datos o ocurre un error, se muestra un mensaje apropiado en el contenedor `#historial-list`.
7. Si se obtienen citas, se iteran todas y se crea un `<article class="citation-card">` por cada una con la estructura:
   * Texto de la referencia (`citation_text`).
   * Metadatos adicionales: tema, prompt, respuesta, modelo (resolviendo nombre o indicando "Modelo eliminado" si el registro ya no existe) y fecha de guardado formateada.
8. El DOM se va poblando con las tarjetas dentro de `#historial-list`.

La tabla/historial **no** está paginada; todas las citas del usuario se traen en una sola consulta.

---

## 10. Panel de administrador

1. Los administradores acceden a `admin.html`.
2. El script `adminDashboard.js` se ejecuta tras el `DOMContentLoaded`.
3. Llama a `requireAuth()` y `getUserRole()`; si el rol no es `'admin'` redirige a la página pública.
4. Realiza una consulta global a `supabase.from('citations').select(...).order('created_at', {ascending:false})` que incluye `profiles(email)` y `models(name)` para mostrar quién generó cada cita y con qué modelo.
5. Calcula métricas globales (total de citas, total de usuarios distintos, modelo más usado) y las renderiza en tarjetas.
6. Construye una interfaz de filtros:
   * Selector de modelo (generado a partir de los datos recibidos).
   * Fechas `Desde` y `Hasta`.
7. Renderiza inicialmente una tabla con todas las citas y permite filtrar en el cliente aplicando las condiciones anteriores. No hay paginación ni consultas adicionales al servidor; todo se hace en memoria.
8. Los filtros se aplican al cambiar cualquiera de los inputs y llaman a `renderTable(filteredRecords)`.

Este panel sirve para que un administrador supervise el uso del sistema y efectúe búsquedas elementales.

---

## 11. Sistema de roles

* El campo `profiles.role` guarda el rol de cada usuario. El valor por defecto en el registro es `'user'`; se puede cambiar manualmente desde la consola de Supabase o mediante una función administrativa no presente en el frontend.
* Roles existentes:
  * **user**: usuario normal. Puede generar citas, ver su historial y acceder a sus métricas.
  * **admin**: además de las capacidades de `user`, puede ver el botón "Métricas" en el header, acceder al panel de métricas en `historial.html` y visitar `admin.html` para ver datos globales.
* En el código:
  * `auth.js.getUserRole()` consulta el perfil y devuelve el rol; el frontend **nunca confía** en el JWT o en `user_metadata` para el rol.
  * `header.js` oculta el botón de métricas hasta que `getUserRole()` retorna `'admin'`.
  * `requireAdmin()` y comprobaciones similares se usan para proteger páginas.
  * Los scripts de métricas y administración preguntan el rol y redirigen en caso de no tener privilegios.
* El rol afecta la UI mostrando u ocultando elementos (botón Métricas, acceso a admin) y también condiciona las políticas RLS en la base de datos.

---

## 12. Sistema de navegación

* El `header` es cargado dinámicamente por `header.js` en el elemento `<div id="siteHeader"></div>` de cada página.
* Existen dos plantillas HTML: `header.html` para invitados y `header-logged.html` para usuarios autenticados.
* El `header-logged.html` contiene botones: Generador, Historial, (Métricas) y Cerrar sesión. El botón Métricas se oculta inicialmente y se muestra si el rol es admin.
* La navegación no utiliza enlaces `<a>` tradicionales sino `<button>` con manejadores JavaScript que cambian `location.href` o llaman a funciones globales como `showHistorial()`.
* En dispositivos móviles el menú se transforma en un botón hamburguesa. `ui-menu.js` gestiona la clase CSS `active` para mostrar/ocultar el menú y lo cierra cuando se selecciona una opción.
* `login.html` y `registro.html` presentan los botones de Inicia sesión y Regístrate en el header público.

---

## 13. Refactorizaciones importantes realizadas

A lo largo del desarrollo se han tomado varias decisiones de refactorización para mejorar mantenimiento y corrección de bugs:

* **Centralización del cliente Supabase:** se creó `supabaseClient.js` para evitar múltiples instancias y duplicación de URL/clave.
* **Eliminación de dependencia del DOM para obtener datos del modelo:** antes se leía `name` del `<select>` directamente; ahora se usa `modelCache` y la consulta a Supabase, permitiendo cambiar el texto visible sin romper funcionalidad.
* **Uso de `model_id` en lugar de nombre:** las citas guardaban el nombre del modelo; se modificó para almacenar el UUID (`model_id`) y añadir columnas `model_name_custom`/`organization_custom` para casos manuales.
* **Corrección de tipos UUID:** cuando se migró a UUID se actualizó la lógica de inserción para manejar correctamente IDs nulos y strings vacíos.
* **Carga dinámica de modelos desde la base de datos:** se dejó de hardcodear el listado de modelos en el frontend y se incorporó `loadModels()`.
* **Implementación del menú hamburguesa:** se extrayó de `header.js` a `ui-menu.js` para mejorar separación.
* **Implementación de autocompletado de campos a partir de la tabla `models`:** se aprovechó `modelCache` para pre‑llenar organización y URL.
* **Mejoras de validación y accesibilidad:** se añadieron atributos ARIA, mensajes dinámicos y validaciones de formulario más robustas (uso de `setCustomValidity`).

Estas refactorizaciones buscaban reducir duplicaciones, mejorar la escalabilidad del sistema y corregir errores detectados en fases previas.

---

## 14. Decisiones de diseño

* **Uso de Supabase en lugar de backend propio:**
  * Evita desarrollar y mantener un servidor. Permite aprovechar Auth, RLS y una API REST inmediata.
  * Reduce el código del servidor al mínimo (casi nulo), delegando seguridad a la configuración de la base de datos.
* **Uso de JavaScript sin frameworks:**
  * Mantiene la aplicación ligera y fácil de entender para un entorno académico.
  * Evita procesos de build, permitiendo desplegar el sitio directamente con archivos estáticos.
* **Uso de RLS para seguridad:**
  * Garantiza que cada usuario ve sólo sus datos, incluso si el frontend está comprometido.
  * Facilita la construcción de vistas admin seguras mediante políticas explícitas.
* **Separación de páginas:**
  * Cada responsabilidad (generador, historial, admin, login/registros) es una página HTML separada, lo que simplifica la navegación y permite cargar únicamente el código necesario.
  * El header compartido evita duplicar la lógica de navegación.
* **Extensibilidad mínima:**
  * La arquitectura modular (módulos ES) permite añadir nuevas páginas o funcionalidades sin grandes reescrituras.

---

## 15. Flujo completo del sistema

1. El usuario abre la URL principal (`index.html`). Se carga el header público; `requireGuest()` garantiza que no hay sesión.
2. Desde aquí puede registrarse (`registro.html`) o iniciar sesión (`login.html`).
3. Tras autenticarse, el listener global redirige a `refer.html`.
4. `refer.html` muestra el formulario de generación de referencias. El usuario selecciona/ingresa datos, genera la cita y la guarda.
5. La cita se inserta en la tabla `citations` asociada al `user_id` y se muestra inmediatamente en pantalla.
6. El usuario puede navegar a "Historial" o usar el menú móvil. En "Historial" (
   `historial.html`) se listan todas sus citas junto con métricas propias calculadas en el cliente.
7. Si el usuario tiene rol `admin`, al visitar el historial puede cambiar a la pestaña "Métricas" y también acceder al panel global (`admin.html`), donde ve estadísticas y una tabla con todas las citas filtrables.
8. En cualquier momento puede cerrar sesión y volver a la página pública.

Todas las interacciones con datos pasan por Supabase y están sujetas a RLS; el frontend no necesita conocer el esquema de la base de datos más allá de los nombres de las tablas y columnas que usa.

---

## 16. Posibles mejoras futuras

1. **Paginación del historial:** ejecutar las consultas con `limit/offset` y cargar más resultados al hacer scroll o pulsar un botón.
2. **Métricas más avanzadas:** añadir gráficos, uso por mes, comparativas entre usuarios, etc., probablemente usando una librería de visualización y consultas SQL agregadas.
3. **Exportación de citas:** permitir descargar el historial en CSV/JSON o generar un PDF con todas las referencias.
4. **Mejoras de UX:** autocompletado en campo de tema, validaciones en línea más explicativas, manejar errores de red con indicadores, etc.
5. **Caching de modelos localmente:** almacenar la lista de modelos en `localStorage` para evitar recargas frecuentes.
6. **API de administración más potente:** añadir endpoints RPC en Supabase para filtros/consultas más eficientes en el servidor.
7. **Soporte multilenguaje o plantillas de citas diferentes (MLA, Chicago).**
8. **Refactorización adicional:** separar aún más la lógica en módulos, añadir pruebas unitarias/integración, usar un bundler para minificación.
9. **Seguridad:** revisar las políticas RLS actuales, añadir validaciones de longitud máxima y sanidad en el servidor para prevenir inyección.

---

## 17. Resumen técnico final

La aplicación es una web estática interactiva que utiliza Supabase como backend para manejar autenticación, almacenamiento y seguridad. El cliente está escrito en JavaScript modular, con un enfoque pragmático: sin frameworks, con lógica clara distribuida en varios archivos. Las partes críticas son:

* **Autenticación y gestión de roles** (`auth.js`) – debería mantenerse limpia y siempre verificar el estado antes de cualquier operación protegida.
* **Comunicación con Supabase** (cliente único) – evita dispersión de credenciales.
* **Políticas RLS** – son la linterna de seguridad; cualquier extensión debe considerar las reglas existentes.
* **Generación y guardado de citas** (`app.js` y `citations.js`) – motor del negocio.

Para extender el proyecto sin romperlo:

1. Añadir nuevas tablas o campos asegurándose de actualizar tanto los módulos frontend que las usan como las políticas RLS correspondientes.
2. Mantener la separación entre las páginas y los módulos; crear nuevos archivos JS para nuevas vistas en lugar de sobrecargar `app.js`.
3. Evitar duplicar lógica: si se requieren funciones reutilizables (formato de fecha, escape HTML), extraerlas a un utilitario.
4. Siempre consultar el rol del usuario desde la tabla `profiles` y no confiar en metadatos.
5. Probar las consultas en SQL directamente en la consola de Supabase para verificar que RLS no bloquea operaciones válidas.

Con este conocimiento, un nuevo desarrollador puede entender el flujo completo, localizar dónde añadir o modificar funcionalidades y mantener la seguridad y coherencia del sistema sin necesidad de analizar cada línea de código original.

---

*Informe generado el 5 de marzo de 2026 basado en los archivos existentes en el repositorio.*
