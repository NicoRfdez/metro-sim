# Metro Sim 🚇

Metro Sim es un sistema integral para la simulación, visualización y análisis de la red del Metro de Santiago.

## 🗂️ Estructura del Proyecto

El proyecto está dividido en varios módulos principales:

- **`/web`**: Frontend desarrollado en **Next.js** con React y TailwindCSS. Despliega la interfaz de usuario y visualización de la red de metro.
- **`/backend`**: Backend desarrollado en **Django** (`metro_api`). Proporciona la API para la aplicación web y se comunica con la base de datos (SQLite).
- **`/data`**: Contiene los datos crudos (archivos GTFS como `routes.txt`, `trips.txt`, `stop_times.txt`, `stops.txt`).
- **`/analisis`**: Scripts y cuadernos de Jupyter (Notebooks) para el análisis de los datos del transporte público.
- **`/hardware`**: Código fuente y esquemáticos para los componentes de hardware del simulador.
- **`extract_metro.py`**: Script de extracción y transformación de datos (ETL) que procesa los archivos GTFS crudos y genera los datos procesados en formato JSON (`metro_data.json`) para la web.

## 🚀 Requisitos Previos

Asegúrate de tener instalados los siguientes componentes en tu sistema:
- [Node.js](https://nodejs.org/) (v18 o superior) y npm
- [Python](https://www.python.org/) (v3.9 o superior)
- Git

## 🛠️ Instalación y Configuración

Sigue estos pasos para configurar el entorno de desarrollo local.

### 1. Procesamiento de Datos (GTFS)

Antes de iniciar la web, necesitas extraer y procesar los datos del metro.

```bash
# Ejecutar el script ETL que leerá de /data/raw y generará /web/public/metro_data.json
python extract_metro.py
```

### 2. Configurar el Backend (Django)

```bash
cd backend

# Activar el entorno virtual (si usas venv)
source venv/bin/activate

# Instalar dependencias (asumiendo que hay un requirements.txt o usando pip directamente)
pip install django

# Aplicar migraciones de la base de datos
python manage.py migrate

# Iniciar el servidor de desarrollo
python manage.py runserver
```
*El backend estará disponible en `http://localhost:8000`.*

### 3. Configurar el Frontend (Next.js)

En una nueva terminal:

```bash
cd web

# Instalar dependencias de Node
npm install

# Iniciar el servidor de desarrollo
npm run dev
```
*La aplicación web estará disponible en `http://localhost:3000`.*

## 🔬 Análisis de Datos y Hardware

- **Análisis**: Explora la carpeta `/analisis` para acceder a los Notebooks (`/analisis/notebooks`). Puedes iniciar Jupyter con `jupyter notebook` dentro de esa carpeta.
- **Hardware**: Los detalles de conexión y código de microcontroladores se encuentran documentados dentro del directorio `/hardware`.

## 📝 Scripts Disponibles en el Frontend (`/web`)

En el directorio `web`, puedes ejecutar los siguientes comandos con `npm`:

- `npm run dev`: Inicia el servidor de desarrollo.
- `npm run build`: Compila la aplicación para producción.
- `npm run start`: Inicia la aplicación compilada en modo producción.
- `npm run lint`: Ejecuta el linter (ESLint) para encontrar errores en el código.

