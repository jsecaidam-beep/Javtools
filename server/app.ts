import { parseDelimitedText, parseNumericValue } from '../src/utils/tabularData';
import express from 'express';
import { GoogleGenAI } from '@google/genai';

export function createApiApp() {
  const app = express();
  app.set('trust proxy', true);
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  app.use(express.json({ limit: '4mb' }));
  app.use(express.urlencoded({ extended: true, limit: '4mb' }));

  // Initialize Gemini AI Client
  const apiKey = process.env.GEMINI_API_KEY || '';
  let ai: GoogleGenAI | null = null;
  if (apiKey) {
    try {
      ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
    } catch (err) {
      console.warn('Could not initialize GoogleGenAI client:', err);
    }
  }

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      hasApiKey: Boolean(apiKey),
    });
  });

  // Helper for cleaning JSON string from model
  function cleanJsonOutput(raw: string) {
    let text = raw.trim();
    if (text.startsWith('```json')) {
      text = text.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (text.startsWith('```')) {
      text = text.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      text = text.substring(firstBrace, lastBrace + 1);
    }
    return JSON.parse(text);
  }

  // Helper to call Gemini with retry and fallback across working models
  async function callGeminiWithRetry(aiClient: GoogleGenAI, payload: any, maxRetries = 2) {
    const candidateModels = [
      'gemini-3.5-flash',
      'gemini-flash-lite-latest',
      'gemini-3.5-flash-lite',
      'gemini-3.8-flash',
    ];
    let lastError: any = null;

    for (const model of candidateModels) {
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const response = await aiClient.models.generateContent({
            ...payload,
            model,
          });
          return response;
        } catch (err: any) {
          lastError = err;
          const status = err?.status || err?.code || (err?.message?.includes('503') ? 503 : 0);
          console.warn(`Gemini attempt ${attempt + 1} with ${model} failed (${status}):`, err.message);
          if (attempt < maxRetries && (status === 503 || status === 429)) {
            const delay = (attempt + 1) * 600;
            await new Promise((r) => setTimeout(r, delay));
          } else {
            // Move to next candidate model if current is 404, 503, or retries exhausted
            break;
          }
        }
      }
    }
    throw lastError;
  }

  // 1. Table Extraction / Generation Endpoint
  app.post('/api/extract-table', async (req, res) => {
    const { text, imageBase64, imageMime, customInstructions, tableTypeHint } = req.body;

    if (!text && !imageBase64) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere texto, datos pegados de Office o una captura de imagen para procesar.',
      });
    }

    let geminiError: any = null;

    // Try with Gemini if client available
    if (ai) {
      try {
        const systemInstruction = `
Eres un analista de datos sénior de Acción contra el Hambre (ACH) y especialista en la Guía de Identidad Visual Corporativa.
Tu misión es extraer y estructurar los datos (a partir de la imagen o del texto) adaptándolos con precisión a la Guía de Identidad de ACH.

1. IDENTIFICACIÓN DEL TIPO DE TABLA HUMANITARIA:
Identifica minuciosamente la estructura y propósito de la tabla:
- "Matriz de Severidad SAN / CARI": tablas con dominios (Consumo de alimentos, Vulnerabilidad económica, Agotamiento de activos), indicadores como PCA, rCSI, gasto en alimentos, estrategias de sobrevivencia, y fases IPC (1: Seguridad, 2: Marginal/Estrés, 3: Moderada/Crisis, 4: Severa/Emergencia).
- "Desglose Territorial / Geográfico": tablas con jerarquías territoriales (País, Departamento/Región, Municipio, Comunidad) y metas o coberturas.
- "Monitoreo de Indicadores y Porcentajes": indicadores humanitarios, líneas de base, metas operativas y porcentaje de cumplimiento.
- "Presupuesto y Ejecución Financiera": sectores humanitarios (WASH, Nutrición, SAN, Protección), donantes (ECHO, USAID/BHA, AECID, Fondo Humanitario RHPF LAC, Fondos Propios), presupuesto asignado, gasto ejecutado y % avance.
- "Cronograma / Plan de Actividades": actividades operativas, fechas/meses, responsables y estado.
- "Tabla Humanitaria General": cualquier otro reporte de datos operativos.

2. APLICACIÓN DE LA GUÍA DE IDENTIDAD ACH:
- Tipografía oficial: Titulares claros en mayúsculas/minúsculas estilo Futura Bold.
- Encabezados: Nombres precisos y concisos de cada columna.
- Paleta oficial ACH:
  * Azul ACH: #005FB6
  * Verde ACH: #52AE32
  * Naranja ACH: #EE7203
  * Gris neutro: #707070
  * Para Matriz CARI / Fases IPC: encabezados o celdas con verde (#8DC63F), amarillo (#FFF200), naranja (#F7941D), rojo (#ED1C24).
- Alineación correcta de celdas:
  * Nombres, textos descriptivos, regiones: "left"
  * Cifras, números, beneficiarios, montos monetarios: "right"
  * Porcentajes, fechas, códigos, estados y fases: "center"
- Asignación de insignias/semáforos (badgeColor):
  * "green": Aceptable, meta cumplida, fase 1, bajo riesgo, normal.
  * "blue": Estable, monitoreo, en tiempo, fase 2, regular.
  * "yellow": Alerta temprana, marginal, estresado.
  * "orange": Moderado, atención requerida, crisis, fase 3.
  * "red": Severo, emergencia, fase 4, crítico, retraso alto.
  * "gray": Totales generales o consolidados.
  * "none": Sin insignia.

3. DETECCIÓN DE CELDAS FUSIONADAS (MERGED CELLS - ROWSPAN & COLSPAN):
- Es CRÍTICO identificar celdas fusionadas:
  * Si una celda abarca verticalmente múltiples filas (por ejemplo, categorías como "Colombia" que abarca 3 filas de municipios, o "Consumo de alimentos" que abarca varias filas de indicadores), debes asignarle "rowSpan": N en la celda donde inicia. En las siguientes filas que caen dentro de esa fusión vertical, NO repitas esa celda (la fila tendrá 1 celda menos).
  * Si una celda abarca horizontalmente múltiples columnas (por ejemplo, subtítulos de sección o celdas de totales), debes asignarle "colSpan": N.

Devuelve SIEMPRE este formato JSON exacto:
{
  "tableType": "Matriz de Severidad SAN / CARI" | "Desglose Territorial" | "Monitoreo de Indicadores" | "Presupuesto y Ejecución" | "Tabla Humanitaria General",
  "title": "Título en Futura de la tabla",
  "subtitle": "Subtítulo descriptivo o período de referencia",
  "headers": ["Columna 1", "Columna 2", "Columna 3"],
  "headerBgColors": ["#005FB6", "#005FB6", "#005FB6"],
  "rows": [
    [
      { "value": "Texto", "align": "left", "badgeColor": "none", "isBold": false, "rowSpan": 1, "colSpan": 1 },
      { "value": "1,200", "align": "right", "badgeColor": "none", "isBold": false },
      { "value": "85%", "align": "center", "badgeColor": "green", "isBold": false }
    ]
  ],
  "suggestedChartType": "bar" | "horizontalBar" | "stackedBar" | "pie" | "doughnut",
  "chartLabelColumnIndex": 0,
  "chartValueColumnIndex": 1,
  "notes": "Metodología y aclaraciones de la tabla",
  "source": "Acción contra el Hambre (Misión Centroamérica / RHPF)"
}
`.trim();

        const userPrompt = `
Estructura y adapta la siguiente tabla para la Guía de Identidad de Acción contra el Hambre (ACH):
${tableTypeHint ? `Tipo de tabla solicitado: ${tableTypeHint}\n` : ''}
${customInstructions ? `Instrucciones adicionales: ${customInstructions}\n` : ''}
${text ? `Contenido tabular provisto:\n"""\n${text}\n"""` : 'Analiza e identifica detalladamente la tabla de la imagen adjunta, transcribiendo todos sus datos, encabezados y celdas.'}
`.trim();

        const parts: any[] = [];
        if (imageBase64) {
          const cleanBase64 = imageBase64.replace(/^data:[a-zA-Z0-9/+-]+;base64,/, '');
          parts.push({
            inlineData: {
              mimeType: imageMime || 'image/png',
              data: cleanBase64,
            },
          });
        }
        parts.push({ text: userPrompt });

        const response = await callGeminiWithRetry(ai, {
          contents: { parts },
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            temperature: 0.1,
          },
        });

        const parsed = cleanJsonOutput(response.text || '{}');
        return res.json({
          success: true,
          data: parsed,
          aiGenerated: true,
        });
      } catch (err: any) {
        geminiError = err;
        console.warn('Gemini table extraction failed after retries:', err.message);
      }
    }

    // If an image was submitted and Gemini failed, inform the client with clear status
    if (imageBase64 && !text) {
      const is503 = geminiError?.message?.includes('503') || geminiError?.status === 503;
      return res.status(503).json({
        success: false,
        error: is503
          ? 'El modelo de IA experimenta alta demanda momentánea (503). Por favor presiona "Reintentar con IA" en unos segundos o copia la tabla en texto/Office.'
          : `Error al procesar la imagen con IA: ${geminiError?.message || 'Servicio no disponible'}. Intenta de nuevo.`,
        is503,
      });
    }

    // Heuristic Fallback for text/TSV/CSV
    try {
      const parsedRows = parseDelimitedText(text || '');
      if (parsedRows.length < 2 || parsedRows[0].length < 2) {
        return res.status(422).json({ success: false, error: 'Pega encabezados y al menos una fila, separados por tabulaciones, comas o punto y coma.' });
      }
      const headers = parsedRows[0];
      const dataRows = parsedRows.slice(1).map((parts: string[]) => {
        return headers.map((_: string, i: number) => {
          const val = parts[i]?.trim() || '';
          const isNum = Number.isFinite(parseNumericValue(val)) && val.length > 0;
          let badge = 'none';
          const lower = val.toLowerCase();
          if (lower.includes('aceptable') || lower.includes('meta') || lower.includes('cumplido') || lower.includes('fase 1')) badge = 'green';
          else if (lower.includes('alerta') || lower.includes('moderado') || lower.includes('estrés') || lower.includes('fase 2') || lower.includes('fase 3')) badge = 'orange';
          else if (lower.includes('severo') || lower.includes('crisis') || lower.includes('fase 4') || lower.includes('emergencia')) badge = 'red';
          else if (lower.includes('estable') || lower.includes('monitoreo')) badge = 'blue';

          return {
            value: val || '-',
            align: isNum ? 'right' : 'left',
            badgeColor: badge,
          };
        });
      });

      return res.json({
        success: true,
        data: {
          tableType: 'Tabla Humanitaria ACH',
          title: 'Tabla Humanitaria Acción contra el Hambre',
          subtitle: 'Datos estructurados automáticamente en formato oficial ACH',
          headers,
          headerBgColors: headers.map(() => '#005FB6'),
          rows: dataRows,
          suggestedChartType: 'bar',
          chartLabelColumnIndex: 0,
          chartValueColumnIndex: 1,
          notes: 'Fuente: Sistema de Información y Monitoreo ACH',
        },
        aiGenerated: false,
        notice: 'Procesado con el analizador inteligente local.',
      });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message });
    }
  });

  // 2. AI Cover Assistant
  app.post('/api/ai/cover', async (req, res) => {
    const { topic, context, documentType } = req.body;

    if (ai) {
      try {
        const prompt = `
Genera los textos para una portada de documento oficial de Acción contra el Hambre (ACH).
Tipo de documento: ${documentType || 'Informe Humanitario / Guía de Proyecto'}
Tema o palabras clave: ${topic || 'Respuesta humanitaria multisectorial y seguridad alimentaria'}
Contexto adicional: ${context || 'Corredor Seco Centroamericano, Guatemala / Honduras'}

Normas de estilo ACH:
- Título conciso, contundente, en mayúsculas tipo titular Futura Bold.
- Subtítulo técnico descriptivo.
- No inventes identificadores, nombres, ubicaciones ni cargos; solo propone estos tres campos.
Devuelve este JSON exacto:
{
  "documentCategory": "INFORME HUMANITARIO",
  "title": "TÍTULO PRINCIPAL EN MAYÚSCULAS",
  "subtitle": "Descripción basada únicamente en el contexto aportado"
}
`.trim();

        const response = await callGeminiWithRetry(ai, {
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.3,
          },
        });

        const parsed = cleanJsonOutput(response.text || '{}');
        return res.json({ success: true, data: parsed, aiGenerated: true });
      } catch (err: any) {
        console.warn('Gemini cover generation failed after retries:', err.message);
      }
    }

    return res.json({
      success: true, aiGenerated: false,
      notice: 'Propuesta local. La IA no está configurada o no está disponible.',
      data: {
        documentCategory: documentType || 'INFORME HUMANITARIO',
        title: String(topic || 'RESPUESTA HUMANITARIA Y SEGURIDAD ALIMENTARIA').toUpperCase(),
        subtitle: context || 'Acciones de asistencia humanitaria y seguridad alimentaria',
      },
    });
  });

  // 3. AI Credits Assistant
  app.post('/api/ai/credits', async (req, res) => {
    const { donor, projectTitle, countries, currentAuthors } = req.body;

    if (ai) {
      try {
        const prompt = `
Genera los textos para una página de créditos o contraportada oficial de Acción contra el Hambre (ACH) según la guía de identidad visual.
Donante: ${donor || 'Fondo Humanitario Regional para América Latina y el Caribe (RHPF LAC)'}
Proyecto: ${projectTitle || 'Respuesta humanitaria en el Corredor Seco'}
Países de intervención: ${countries || 'Guatemala y Honduras'}
Autores actuales o sugeridos: ${currentAuthors || 'Equipo de Monitoreo y Redacción ACH'}

Reglas de la guía ACH:
- Cláusula de descargo de responsabilidad oficial: "El contenido de este material es responsabilidad exclusiva de Acción contra el Hambre y no necesariamente refleja las opiniones, posiciones o políticas del donante".
- Atribución larga aprobada.
- Canales PQR: pqr@ca.acfspain.org y comunicacion@ca.acfspain.org.
- Web: www.accioncontraelhambre.org.gt.
- Conserva exclusivamente los autores aportados; no inventes personas ni cargos. Si no hay autores, devuelve contributors: [].

Devuelve únicamente este JSON:
{
  "donorAttribution": "Proyecto implementado por Fundación Acción contra el Hambre, con el apoyo financiero del donante aportado.",
  "disclaimer": "El contenido de este material es responsabilidad exclusiva de Acción contra el Hambre y no necesariamente refleja las opiniones, posiciones o políticas del donante."
}
No sugieras nombres, cargos, direcciones ni contactos.
`.trim();

        const response = await callGeminiWithRetry(ai, {
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.2,
          },
        });

        const parsed = cleanJsonOutput(response.text || '{}');
        return res.json({ success: true, data: parsed, aiGenerated: true });
      } catch (err: any) {
        console.warn('Gemini credits generation failed after retries:', err.message);
      }
    }

    return res.json({
      success: true, aiGenerated: false,
      notice: 'Propuesta local. La IA no está configurada o no está disponible.',
      data: {
        donorAttribution: `Proyecto implementado por Fundación Acción contra el Hambre${donor ? `, con el apoyo financiero de ${donor}` : ''}.`,
        disclaimer: 'El contenido de este material es responsabilidad exclusiva de Acción contra el Hambre y no necesariamente refleja las opiniones, posiciones o políticas del donante.',
      },
    });
  });
  app.use('/api', (_req, res) => res.status(404).json({ success: false, error: 'Servicio no encontrado.' }));
  return app;
}

export default createApiApp();
