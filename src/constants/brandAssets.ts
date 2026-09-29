import { CoverData, CreditsData, LogoItem } from '../types/brand';

// Official ACH Logos & Partner SVGs (Renderable cleanly inline)
export const DEFAULT_LOGOS: LogoItem[] = [
  {
    id: 'logo-rhpf',
    name: 'Fondo Humanitario (FHG / RHPF LAC)',
    type: 'donor',
    variant: 'color',
  },
  {
    id: 'logo-ach',
    name: 'Acción contra el Hambre (Oficial)',
    type: 'ach',
    variant: 'color',
  },
  {
    id: 'logo-partner-salud',
    name: 'Ministerio de Salud Pública (Guatemala)',
    type: 'partner',
    variant: 'color',
  },
];

export const AVAILABLE_PARTNER_LOGOS: LogoItem[] = [
  { id: 'logo-rhpf', name: 'Fondo Humanitario para Guatemala (FHG)', type: 'donor' },
  { id: 'logo-ach', name: 'Acción contra el Hambre (ACH)', type: 'ach' },
  { id: 'logo-partner-salud', name: 'Ministerio de Salud Pública y Asistencia Social', type: 'partner' },
  { id: 'logo-conred', name: 'CONRED - Coordinadora para la Reducción de Desastres', type: 'partner' },
  { id: 'logo-echo', name: 'Unión Europea - Ayuda Humanitaria (ECHO)', type: 'donor' },
  { id: 'logo-usaid', name: 'USAID / BHA - Asistencia Humanitaria', type: 'donor' },
  { id: 'logo-aecid', name: 'Cooperación Española (AECID)', type: 'donor' },
  { id: 'logo-oxfam', name: 'Oxfam en Centroamérica', type: 'partner' },
  { id: 'logo-trocaire', name: 'Trócaire', type: 'partner' },
];

// Curated authentic humanitarian photography assets (Unsplash CDN with verified humanitarian & nutrition themes)
export const PRELOADED_COVER_PHOTOS = [
  {
    id: 'photo-field-transfer',
    title: 'Entrega de transferencias y monitoreo en comunidad',
    url: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'photo-mother-child',
    title: 'Madre e infante en consulta de nutrición',
    url: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'photo-community-water',
    title: 'Acceso a agua potable y saneamiento rural',
    url: 'https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'photo-agriculture',
    title: 'Agricultura familiar y resiliencia climática',
    url: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'photo-children',
    title: 'Niñez y seguridad nutricional',
    url: 'https://images.unsplash.com/photo-1489710437720-ebb67ec84dd2?auto=format&fit=crop&w=1200&q=80',
  },
];

// Initial default cover matching Screenshot 1 & PDF 1
export const INITIAL_COVER_DATA: CoverData = {
  style: 'monitoring',
  categoryPill: 'INFORME DE ACOMPAÑAMIENTO, MONITOREO Y SUPERVISIÓN',
  title: 'ENTREGA DE SEGUNDAS TRANSFERENCIAS MONETARIAS Y KITS DE HIGIENE',
  subtitle: 'Proyecto de Respuesta humanitaria multisectorial para salvar vidas frente a impactos del choque climático en cuatro municipios de Huehuetenango y Chiquimula.',
  projectCode: 'CBPF-GTM-R-INGO-NSFT-39626',
  internalCode: 'GTD5AI',
  location: 'Chiquimula, Guatemala',
  date: '24 de agosto de 2026',
  authorName: 'Stephanie Abigail Sanchinel Bran',
  authorRole: 'Asistente de Cumplimiento y Archivo Chiquimula',
  authorBase: 'Base Chiquimula',
  photoUrl: PRELOADED_COVER_PHOTOS[0].url,
  logos: DEFAULT_LOGOS.slice(0, 2),
  themeColor: 'blue',
  logoColorMode: 'white',
  showCategoryPill: true,
  showSubtitle: true,
  showProjectCode: true,
  showInternalCode: true,
  showLocation: true,
  showDate: true,
  showAuthorBlock: true,
  showLogos: true,
  showPhoto: true,
};

// Initial default credits page matching Screenshot 2 & PDF 1 page 14-15
export const INITIAL_CREDITS_DATA: CreditsData = {
  topBanner: 'SEQUÍA Y EL NIÑO',
  subBanner: 'HONDURAS Y GUATEMALA\nUna emergencia que afecta a miles de familias',
  mainTitle: 'ACCIÓN CONTRA EL HAMBRE',
  missionSubtitle: 'Fundación Acción contra el Hambre Misión Centroamérica\nAction Against Hunger Central America',
  donorAttribution: 'Proyecto implementado por Fundación Acción contra el Hambre, con el apoyo financiero del Fondo Humanitario Regional para América Latina y el Caribe – Guatemala.',
  disclaimer: 'El contenido de este material es responsabilidad exclusiva de Acción contra el Hambre y no necesariamente refleja las opiniones, posiciones o políticas del Fondo Humanitario Regional para América Latina y el Caribe, Guatemala.',
  countrySelection: 'guatemala_honduras',
  officeGuatemalaTitle: 'Guatemala',
  officeGuatemalaAddress: '6.ª Avenida A 13-63, zona 9, tercer nivel, Edificio Censa, oficina 301\nCiudad de Guatemala, Guatemala',
  officeHondurasTitle: 'Honduras',
  officeHondurasAddress: 'Presencia en Santa Bárbara, Yoro, El Paraíso, Cortés y Francisco Morazán.',
  pqrTitle: 'Preguntas, quejas o retroalimentación',
  pqrEmail: 'pqr@ca.acfspain.org',
  commsEmail: 'comunicacion@ca.acfspain.org',
  webUrl: 'www.accioncontraelhambre.org.gt',
  showPersonCredits: true,
  personCreditsColumns: 2,
  contributorsTitle: 'Equipo Técnico y Redacción',
  contributors: [
    { id: 'c-1', name: 'Stephanie Abigail Sanchinel Bran', role: 'Asistente de Cumplimiento y Archivo' },
    { id: 'c-2', name: 'Alvaro Francisco Morales', role: 'Coordinador de Proyecto SAN' },
    { id: 'c-3', name: 'Maria Fernanda Lopez', role: 'Especialista en Monitoreo y Evaluación (M&E)' },
    { id: 'c-4', name: 'Denilson Pá Molina', role: 'Oficial de Comunicación y Visibilidad' },
  ],
  logos: DEFAULT_LOGOS.slice(0, 2),
  bgTheme: 'gradient-blue',
  logoColorMode: 'white',
};

// Chart Presets directly from PDF 2 (Evaluación SAN Tercer Levantamiento)
export const CHART_PRESETS_SAN = [
  {
    id: 'chart-fig-8-stacked',
    name: 'Figura 8: Nivel de Inseguridad Alimentaria por País (Barras 100%)',
    description: 'Distribución porcentual de Seguridad Alimentaria, Leve, Moderada y Severa por país.',
    type: 'stackedBar',
    labels: ['El Salvador', 'Guatemala', 'Honduras', 'Nicaragua'],
    datasets: [
      {
        label: 'Seguridad alimentaria',
        data: [10, 10, 6, 7],
        backgroundColor: '#52AE32', // Verde ACH
      },
      {
        label: 'Inseguridad alimentaria leve',
        data: [76, 61, 73, 76],
        backgroundColor: '#F59E0B', // Amarillo/naranja ámbar
      },
      {
        label: 'Inseguridad alimentaria moderada',
        data: [11, 26, 18, 14],
        backgroundColor: '#EE7203', // Naranja ACH
      },
      {
        label: 'Inseguridad alimentaria severa',
        data: [3, 3, 4, 4],
        backgroundColor: '#DC2626', // Rojo alerta
      },
    ],
  },
  {
    id: 'chart-fig-15-hdds',
    name: 'Figura 15: Puntuación HDDS por Departamento (Barras Horizontales)',
    description: 'Puntaje de diversidad dietética en hogares evaluados en Guatemala y El Salvador.',
    type: 'horizontalBar',
    labels: [
      'Guat - Huehuetenango',
      'Guat - Chiquimula',
      'Guat - Quiché',
      'Guat - El Progreso',
      'ES - Usulután',
      'ES - San Miguel',
      'ES - Morazán',
      'ES - La Unión',
    ],
    datasets: [
      {
        label: 'Puntaje HDDS',
        data: [5.81, 5.62, 7.28, 7.03, 7.81, 7.46, 7.23, 6.38],
        backgroundColor: [
          '#005FB6', '#005FB6', '#005FB6', '#005FB6',
          '#52AE32', '#52AE32', '#52AE32', '#52AE32',
        ],
      },
    ],
  },
  {
    id: 'chart-fig-2-encuestas',
    name: 'Figura 2: Encuestas Realizadas vs Esperadas (Barras Comparativas)',
    description: 'Muestra proyectada vs levantamiento observado en los 4 países del Corredor Seco.',
    type: 'bar',
    labels: ['El Salvador', 'Guatemala', 'Honduras', 'Nicaragua'],
    datasets: [
      {
        label: 'Esperadas',
        data: [1015, 1155, 1085, 840],
        backgroundColor: '#EE7203', // Naranja ACH
      },
      {
        label: 'Observadas',
        data: [1377, 1311, 1094, 915],
        backgroundColor: '#005FB6', // Azul ACH
      },
    ],
  },
  {
    id: 'chart-fig-11-pca',
    name: 'Figura 11: Puntaje de Consumo de Alimentos (PCA)',
    description: 'Categorización de hogares según consumo Aceptable, Limítrofe y Pobre.',
    type: 'bar',
    labels: ['Consumo Aceptable', 'Consumo Limítrofe', 'Consumo Pobre'],
    datasets: [
      {
        label: '% de Hogares',
        data: [82, 12, 6],
        backgroundColor: ['#52AE32', '#EE7203', '#DC2626'],
      },
    ],
  },
  {
    id: 'chart-fig-5-dona',
    name: 'Figura 5: Participación en Organizaciones Comunitarias (Dona)',
    description: 'Distribución de membresía comunitaria por tipo de organización.',
    type: 'doughnut',
    labels: [
      'Reducción de Riesgos Desastres',
      'Organización Religiosa',
      'Sin Fines de Lucro / ONG',
      'Cooperativa Productiva',
      'Comité Escolar',
      'Otras Organizaciones',
    ],
    datasets: [
      {
        label: 'Porcentaje',
        data: [11, 27, 21, 7, 7, 27],
        backgroundColor: ['#EE7203', '#52AE32', '#005FB6', '#0284C7', '#707070', '#C45B00'],
      },
    ],
  },
];
