# Documentación Técnica - Sistema REFER

## 1. Introducción
REFER es una aplicación web tipo Single Page Application (SPA) diseñada para la Universidad Abierta y a Distancia de México (UnADM). Su propósito principal es facilitar la generación de referencias bibliográficas en formato APA, con un enfoque especial en fuentes de Inteligencia Artificial (IA), además de libros, artículos y sitios web.

## 2. Arquitectura del Sistema
El sistema sigue una arquitectura de **Frontend Puro con Backend como Servicio (BaaS)**:
- **Frontend**: HTML5, CSS3 y JavaScript ES6 modular.
- **Backend**: Supabase (PostgreSQL, Auth, API REST).
- **Seguridad**: Row Level Security (RLS) en la base de datos para garantizar que los usuarios solo accedan a su propia información.

## 3. Árbol de Archivos
```text
B:\descargas\refer\
├── index.html              # Página de inicio (Pública)
├── login.html              # Acceso de usuarios
├── registro.html           # Registro de nuevos usuarios
├── refer.html              # Generador principal (Privada)
├── historial.html          # Historial de citas (Privada)
├── css/
│   └── styles.css          # Estilos globales
├── js/
│   ├── auth.js             # Lógica de autenticación y protección de rutas
│   ├── citations.js        # Gestión CRUD de citas
│   ├── supabaseClient.js   # Cliente de conexión a Supabase
│   ├── app.js              # Inicializador global
│   ├── dashboard.js        # Lógica del panel de usuario
│   └── catalogos/
│       └── programas.js    # Catálogo de programas educativos
└── modules/
    └── generador/
        ├── generador.js    # Orquestador de formularios dinámicos
        └── types/
            ├── ia.js       # Lógica específica para citas de IA
            ├── libro.js    # Lógica para libros
            ├── articulo.js # Lógica para artículos científicos
            └── web.js      # Lógica para sitios web
```

## 4. Flujos de Trabajo (Workflows)

### A. Flujo de Autenticación
1. **Registro**: El usuario completa el formulario -> `registro.js` llama a Supabase Auth -> Se crea el usuario y un perfil en la tabla `profiles`.
2. **Login**: El usuario ingresa credenciales -> `auth.js` valida la sesión -> Redirección a `refer.html`.
3. **Persistencia**: El estado de la sesión se mantiene mediante tokens JWT gestionados por el cliente de Supabase.

### B. Flujo de Generación de Citas
1. **Selección**: El usuario elige el tipo de fuente en `refer.html`.
2. **Carga**: `generador.js` importa dinámicamente el módulo correspondiente (ej. `ia.js`).
3. **Entrada**: El usuario llena los campos (validación en tiempo real).
4. **Procesamiento**: El módulo genera la cadena de texto APA.
5. **Guardado**: Se envía el objeto a `citations.js` para persistencia en la base de datos.

### C. Flujo de Administración
1. **Validación**: `auth.js` verifica si el rol del usuario en `profiles` es `admin`.
2. **Métricas**: `adminDashboard.js` realiza agregaciones sobre todas las citas (vía políticas de admin en Supabase).
3. **Visualización**: Se renderizan gráficos y tablas de usuarios globales.

## 5. Algoritmos del Sistema

### Algoritmo 1: Control de Acceso (Guardia de Rutas)
Este algoritmo asegura que las páginas privadas no sean accesibles sin autenticación.
```text
INICIO requireAuth()
  LLAMAR a getUser() de Supabase
  SI (Usuario no existe) ENTONCES
    REDIRECCIONAR a 'index.html'
    RETORNAR Error("Sin sesión")
  SINO
    RETORNAR Objeto Usuario
  FIN SI
FIN
```

### Algoritmo 2: Generación de Referencia APA para IA
Lógica contenida en `ia.js` para construir la cita técnica de modelos de lenguaje.
```text
INICIO buildAPA(datos)
  1. Extraer año, día y mes de la fecha de consulta.
  2. Formatear paréntesis de fecha: "(Año, día de mes)".
  3. Sanitizar entradas (escape HTML) para Organización, Modelo y Versión.
  4. SI (Versión existe) ENTONCES
       Definir ParteVersión = " (versión X)"
     SINO
       Definir ParteVersión = ""
     FIN SI
  5. Construir Cadena: 
     "Organización Fecha. [cursiva]Nombre del Modelo[/cursiva] ParteVersión [Modelo de lenguaje de gran escala]. URL"
  6. RETORNAR Cadena Formateada
FIN
```

### Algoritmo 3: Procesamiento de Autores (Libros/Artículos)
Lógica recursiva o iterativa para manejar múltiples autores según normas APA.
```text
INICIO formatMultipleAuthors(lista_autores)
  PARA CADA autor EN lista_autores:
    Apellido = ExtraerApellidoPrincipal(autor.apellido)
    Iniciales = ObtenerIniciales(autor.nombre)
    Agregar a lista_formateada: "Apellido, Iniciales"
  
  SI (Cantidad == 1) RETORNAR lista_formateada[0]
  SI (Cantidad == 2) RETORNAR "Autor1 & Autor2"
  SI (Cantidad > 2) ENTONCES
    Ultimo = lista_formateada.pop()
    RETORNAR "Autor1, Autor2, ..., & Ultimo"
  FIN SI
FIN
```

### Algoritmo 4: Persistencia y Normalización
Lógica en `citations.js` antes de enviar datos a la nube.
```text
INICIO saveCitation(data)
  1. Validar sesión activa (Llamar getUser).
  2. Normalizar metadatos (Convertir llaves inglés/español a estándar).
  3. Construir Payload:
     { user_id, source_type, citation_text, metadata: {...}, created_at: NOW }
  4. EJECUTAR INSERT en tabla 'citations' de Supabase.
  5. RETORNAR Resultado de la operación.
FIN
```

## 6. Módulos Principales

| Módulo | Responsabilidad |
| :--- | :--- |
| **Auth** | Manejo de JWT, roles y protección de navegación. |
| **Citations** | Interfaz con la base de datos para el historial y guardado. |
| **Generador** | Inyección dinámica de formularios e interfaz de usuario para el creador de citas. |
| **Types (IA, Libro, etc.)** | Lógica de negocio específica para las reglas gramaticales de APA 7. |
| **Metrics** | Agregación de datos para el panel administrativo. |

## 7. Conclusión
El sistema REFER destaca por su modularidad y eficiencia al no depender de frameworks pesados. El uso de Supabase permite una gestión de datos robusta con seguridad a nivel de fila, mientras que la lógica de generación APA está encapsulada en módulos independientes, lo que facilita la adición de nuevos tipos de fuentes en el futuro.
