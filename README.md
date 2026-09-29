# Generador ACH - Tablas, Gráficas y Portadas Humanitarias

Aplicación web con la identidad visual corporativa de **Acción contra el Hambre (ACH)** para la generación de tablas sin desbordamiento para Microsoft Word, gráficas nutricionales (CARI/SAN), portadas oficiales estilo Canva y contraportadas con páginas de créditos.

---

## 🚀 Despliegue en GitHub Pages (Solución a la "Pantalla en Blanco")

Si intentaste activar GitHub Pages y la pantalla se queda en blanco, se debe a que la configuración predeterminada de GitHub Pages intenta servir el archivo `src/main.tsx` en crudo, pero los navegadores solo pueden ejecutar JavaScript compilado.

### Pasos para activar el despliegue automático:

1. En tu repositorio en GitHub, entra a **Settings** (Configuración).
2. En el menú lateral izquierdo, haz clic en **Pages**.
3. En la sección **Build and deployment** > **Source**:
   - Cambia la opción de **"Deploy from a branch"** a **"GitHub Actions"**.
4. ¡Listo! El archivo incluido `.github/workflows/deploy.yml` compilará el proyecto automáticamente en cada `git push` a `main` y publicará la versión lista en `dist/`.
5. Si deseas forzar el despliegue ahora mismo:
   - Ve a la pestaña **Actions** en tu repositorio.
   - Selecciona **Deploy to GitHub Pages** a la izquierda.
   - Haz clic en **Run workflow** > botón verde **Run workflow**.

En menos de 1 minuto, tu página estará funcionando en `https://<tu-usuario>.github.io/<tu-repositorio>/`.

---

## 💻 Ejecución en Local (Computadora o Codespaces)

Si clonaste el repositorio en tu equipo:

```bash
# 1. Instalar dependencias
npm install

# 2. Iniciar la aplicación
npm run dev
```

Abre tu navegador en: [http://localhost:3000](http://localhost:3000)

> **Nota:** Si solo deseas ejecutar el frontend cliente sin el backend de Node/Express, puedes usar:
> ```bash
> npm run dev:vite
> ```

---

## 📦 Compilación para Producción

Para generar los archivos estáticos listos para subir a cualquier hosting (Vercel, Netlify, Cloudflare Pages o servidor propio):

```bash
npm run build
```

Los archivos optimizados se generarán en la carpeta `dist/`. Para previsualizarlos localmente:

```bash
npm run preview
```

---

## 🔑 Variables de Entorno (Opcional)

Crea un archivo `.env` en la raíz si deseas habilitar las funciones de inteligencia artificial:

```env
GEMINI_API_KEY=tu_clave_de_gemini_aqui
PORT=3000
```

> **Nota:** Si no configuras la clave de Gemini, la aplicación seguirá funcionando al 100% (edición de tablas, gráficas, portadas, exportaciones a Word y descargas en PNG) utilizando los generadores locales inteligentes.
