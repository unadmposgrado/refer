# Doc3: Manual Técnico Integral y Guía de Migración - Sistema REFER

## 1. Introducción y Propósito
Este documento constituye el manual técnico definitivo del sistema REFER, diseñado para la Universidad Abierta y a Distancia de México (UnADM). Su objetivo es proporcionar a un equipo técnico la información necesaria para comprender, mantener o migrar el sistema a cualquier otra pila tecnológica (PHP, Python, Node.js, etc.).

REFER es una Single Page Application (SPA) que genera referencias bibliográficas en formato APA 7, automatizando la citación de Inteligencia Artificial (IA), libros, artículos y sitios web.

---

## 2. Arquitectura del Sistema
El sistema emplea un enfoque de **Frontend Puro con Backend como Servicio (BaaS)**:
- **Frontend**: HTML5, CSS3 y JavaScript ES6 modular (sin frameworks).
- **Backend**: Supabase (PostgreSQL, Auth, API REST).
- **Comunicación**: Peticiones REST autenticadas mediante tokens JWT.
- **Seguridad**: Políticas de Row Level Security (RLS) en la base de datos.

### Diagrama Lógico de Operación
```text
[Cliente Navegador] <---> [Supabase Cloud]
      |                         |
      |-- UI/Lógica (JS)        |-- Autenticación (JWT)
      |-- Gestión de DOM        |-- Base de Datos (PostgreSQL)
      |-- Generador APA         |-- API REST Automática
```

---

## 3. Estructura de Archivos (Árbol del Proyecto)
```text
B:\descargas\refer\
├── index.html              # Bienvenida pública
├── login.html              # Formulario de acceso
├── registro.html           # Formulario de registro (catalogo/programas.js)
├── refer.html              # Interfaz del generador (requiere sesión)
├── historial.html          # Historial y métricas (requiere sesión)
├── css/
│   └── styles.css          # Estilos globales y responsive
├── js/
│   ├── auth.js             # Guardia de rutas y gestión de sesión
│   ├── citations.js        # Operaciones CRUD y normalización de metadatos
│   ├── supabaseClient.js   # Configuración de conexión al backend
│   ├── app.js              # Inicialización de la aplicación
│   ├── dashboard.js        # Lógica de redirección según rol
│   ├── historial.js        # Renderizado de historial y exportación
│   ├── adminDashboard.js   # Métricas globales para administradores
│   └── catalogos/
│       └── programas.js    # Gestión de programas educativos
└── modules/
    └── generador/
        ├── generador.js    # Inyección dinámica de formularios
        └── types/
            ├── ia.js       # Reglas APA para modelos de lenguaje
            ├── libro.js    # Reglas APA para libros (multiautor)
            ├── articulo.js # Reglas APA para artículos científicos
            └── web.js      # Reglas APA para sitios web
```

---

## 4. Flujos de Trabajo Técnicos (Workflows)

### A. Autenticación y Seguridad
1. **Registro**: `registro.js` recolecta datos -> `supabase.auth.signUp()` -> Inserción automática en tabla `profiles`.
2. **Control de Acceso**: `auth.js` expone funciones como `requireAuth()` y `requireAdmin()`.
3. **Manejo de Tokens**: Supabase almacena el JWT en el `localStorage`. Cada petición incluye el header `Authorization: Bearer <token>`.

### B. Ciclo de Vida de una Cita
1. **Selección**: El usuario elige el `source_type`.
2. **Carga Dinámica**: `generador.js` importa el módulo (`ia.js`, `libro.js`, etc.) y renderiza el formulario.
3. **Generación Local**: El módulo ejecuta el algoritmo `buildAPA` y muestra una vista previa.
4. **Persistencia**: Se llama a `saveCitation(data)`, que normaliza el objeto `metadata` y lo guarda en PostgreSQL.

---

## 5. Algoritmos Críticos (Pseudocódigo)

### Algoritmo 1: Guardia de Rutas (Protección de Navegación)
```text
INICIO requireAuth()
  LLAMAR a supabase.auth.getUser()
  SI (Usuario no existe) ENTONCES
    REDIRECCIONAR a 'index.html'
    DETENER ejecución
  SINO
    RETORNAR datos_usuario
  FIN SI
FIN
```

### Algoritmo 2: Generación APA para Inteligencia Artificial
```text
INICIO buildAPA(organizacion, modelo, version, fecha_consulta, url)
  1. Extraer AÑO de fecha_consulta.
  2. SI (version existe) ENTONCES 
       vStr = "(v. " + version + ")" 
     SINO 
       vStr = ""
  3. Formatear Cadena:
     "Organización (Año). [cursiva]Nombre del Modelo[/cursiva] vStr [Modelo de lenguaje]. URL"
  4. RETORNAR Cadena
FIN
```

### Algoritmo 3: Normalización de Metadatos
```text
INICIO normalizeMetadata(meta_input)
  1. Mapear llaves: (author -> autor), (year -> anio), (pages -> paginas), etc.
  2. Limpiar espacios en blanco.
  3. RETORNAR objeto estandarizado para almacenamiento en JSONB.
FIN
```

---

## 6. Modelo de Datos (Esquema SQL)

Para migrar a MySQL o PostgreSQL propio, utilice este esquema:

```sql
-- Catálogo de programas UnADM
CREATE TABLE programs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre VARCHAR(255) NOT NULL,
  nivel VARCHAR(100),
  division VARCHAR(100)
);

-- Perfiles de usuario (Extensión de Auth)
CREATE TABLE profiles (
  id UUID PRIMARY KEY, -- Mismo ID que en la tabla de usuarios
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  role VARCHAR(20) DEFAULT 'user', -- 'user' o 'admin'
  program_id UUID REFERENCES programs(id)
);

-- Citas generadas
CREATE TABLE citations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  source_type VARCHAR(20) NOT NULL, -- 'ia', 'book', 'article', 'web'
  citation_text TEXT NOT NULL,
  metadata JSONB, -- Almacena campos variables por tipo
  tema VARCHAR(500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 7. Guía de Migración para el Equipo Técnico

### Paso 1: Reemplazo del Backend (API)
Si se desea migrar a PHP, por ejemplo, se deben crear los siguientes endpoints:
- `POST /api/auth/login`: Valida credenciales y retorna un JWT.
- `GET /api/citations`: Retorna las citas filtradas por el ID del usuario en el JWT.
- `POST /api/citations`: Recibe el JSON de la cita y lo inserta en la base de datos.

### Paso 2: Adaptación del Frontend
En `js/supabaseClient.js`, se debe reemplazar la lógica de Supabase por una función `fetch()` global que apunte al nuevo servidor.

### Paso 3: Manejo de Metadatos JSON
El campo `metadata` es crucial. Al migrar a MySQL, asegúrese de usar el tipo de dato `JSON` para mantener la flexibilidad del sistema de citación.

### Paso 4: Lógica de Negocio
No es necesario reescribir la lógica de generación APA, ya que se encuentra en JavaScript puro dentro de `modules/generador/types/`. Solo se debe asegurar que el nuevo backend reciba y entregue los datos en los formatos esperados por estos módulos.

---

## 8. Glosario para el Desarrollador
- **BaaS**: Backend as a Service (Supabase).
- **RLS**: Row Level Security (Seguridad a nivel de fila en BD).
- **JWT**: JSON Web Token (Token de acceso).
- **SPA**: Single Page Application (Aplicación de una sola página).
- **Source Type**: Identificador del tipo de fuente bibliográfica.

---
**Documento generado para fines de migración técnica. Versión 1.0.**
