# Generador ACH - Tablas, Gráficas, Portadas e Invitaciones

Aplicación web con la identidad visual corporativa de **Acción contra el Hambre (ACH)** para la generación de tablas sin desbordamiento para Microsoft Word, gráficas nutricionales (CARI/SAN), portadas oficiales estilo Canva, contraportadas con páginas de créditos e invitaciones.

## Invitaciones

El módulo **Invitaciones**, disponible también mediante `#invitaciones`, usa el fondo de los rótulos y los logos FHG y ACH. Permite personalizar los datos del evento, ocultar campos y reajustar la composición antes de descargarla como PNG. Los datos y opciones del editor se conservan en este navegador.

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

## Tamaños y descargas

Las portadas y contraportadas permiten elegir **Carta (8.5 × 11 pulgadas)** u **Oficio (8.5 × 13 pulgadas)**. La descarga PNG usa 300 dpi: 2550 × 3300 o 2550 × 3900 píxeles. La selección se transfiere de portada a créditos. Si el contenido excede la hoja, el editor pide reducirlo para evitar recortes.

La interfaz usa la paleta ACH, Futura cuando está instalada y Jost como alternativa, con Roboto para lectura. Jost y Roboto y las cinco fotografías de ejemplo se sirven desde la aplicación. Las fotografías son ilustrativas de Unsplash, no evidencias de intervenciones ACH. Reemplázalas con fotografías autorizadas del proyecto.

## API en Vercel

Las rutas `api/health.ts`, `api/extract-table.ts`, `api/ai/cover.ts` y `api/ai/credits.ts` comparten la aplicación Express de `server/app.ts`. El despliegue mantiene las rutas API fuera de la redirección a HTML. La clave `GEMINI_API_KEY` debe configurarse **solo en las variables del servidor de Vercel**, nunca con prefijo `VITE_`.

Sin clave o si Gemini falla, los textos de portada/créditos usan propuestas locales y conservan los datos del usuario. La importación tabular CSV/TSV funciona sin IA; el reconocimiento de imágenes requiere Gemini. La IA propone textos editoriales, sin inventar códigos ni autores.

## Verificación

```bash
npm ci
npm run lint
npm run build
npx playwright install chromium
npm run test:e2e
```

Las pruebas verifican descargas PNG y dimensiones en ambos tamaños, plantilla editorial, portapapeles de imagen y de Word/Excel, créditos y logos, gráficas, importación CSV con comillas, propuestas locales y descarga móvil. Para usar un navegador ya instalado, define `CHROMIUM_PATH`.
