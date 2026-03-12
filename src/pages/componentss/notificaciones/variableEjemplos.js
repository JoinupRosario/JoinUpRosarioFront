/**
 * Texto de ejemplo por variable para la vista previa de plantillas.
 * Catálogo simplificado: estudiante (nombre, apellido, identificación), una observación, fechas (fecha, fecha inicio, fecha fin).
 */
export const VARIABLE_EJEMPLOS = {
  NOMBRE_ENTIDAD: 'Universidad del Rosario',
  USUARIO: 'usuario@ejemplo.com',
  LINK: 'https://ejemplo.com/',
  COMENTARIO: 'Comentario de ejemplo.',
  NOMBRE_ESTUDIANTE: 'María García',
  APELLIDO_ESTUDIANTE: 'López Rodríguez',
  IDENTIFICACION_ESTUDIANTE: '52987654',
  CODIGO_ESTUDIANTE: '20231234567',
  TIPO_IDENTIFICACION: 'Cédula de ciudadanía',
  NOMBRE_TUTOR: 'Dr. Andrés Martínez',
  PROGRAMA: 'Administración de Empresas',
  PERIODO: '2024-1',
  NOMBRE_FACULTAD: 'Facultad de Economía',
  CURSO: 'Contabilidad Básica',
  ASIGNATURA: 'Matemáticas I',
  CATEGORIA: 'Pregrado',
  TITULO_MONITORIA: 'Monitoría de Cálculo',
  TIPO_MONITORIA: 'Académica',
  NOMBRE_MONITORIA: 'Monitoría Cálculo I - Grupo 2',
  CODIGO_MONITORIA: 'MON-2024-01',
  HORAS: '8',
  TITULO_OPORTUNIDAD: 'Práctica profesional en finanzas',
  NOMBRE_OPORTUNIDAD: 'Oportunidad Práctica 2024-1',
  FUNCIONES: 'Apoyo en análisis de datos y reportes.',
  TIPO_PRACTICA: 'Práctica profesional',
  FECHA: '20/02/2024',
  FECHA_INICIO: '15/01/2024',
  FECHA_FIN: '30/06/2024',
  CIUDAD: 'Bogotá D.C.',
  TIPO_ACTIVIDAD: 'Seguimiento semanal',
  OBSERVACION: 'Cumplimiento satisfactorio.',
  TITULO_DOCUMENTO_MONITORIA: 'Informe de seguimiento',
  NOMBRE_DOCUMENTO: 'Informe_marzo_2024.pdf',
  NOMBRE_DOCUMENTO_ADJUNTO: 'Anexo_evidencias.pdf',
  PASSWORD_RESET_KEY: 'https://ejemplo.com/restablecer?token=abc123',
  // Compatibilidad con variables antiguas para vista previa
  EMPRESA: 'Universidad del Rosario',
  COMENTARIOS_RECHAZO_DOCUMENTOS: 'Por favor adjunte el documento con firma visible.',
  COMENTARIOS_RECHAZO_FORMULARIO_LEGALIZACION: 'Complete todos los campos obligatorios del formulario.',
  NOMBRE_POSTULANTE: 'María García López',
  CEDULA: '52987654',
  IDENTIFICACION_POSTULANTE: '52987654',
  FECHA_INICIAL_PERIODO: '08/01/2024',
  FECHA_ACTIVIDAD: '20/02/2024',
  OBSERVACION_ACTIVIDAD: 'Cumplimiento satisfactorio.',
};

/**
 * Reemplaza en un texto todas las variables [KEY] o $key por su ejemplo.
 */
export function reemplazarVariablesPorEjemplos(text, ejemplos = VARIABLE_EJEMPLOS) {
  if (!text || typeof text !== 'string') return text;
  let out = text;
  out = out.replace(/\[([A-Za-z0-9_]+)\]/g, (_, key) => {
    const k = String(key).toUpperCase();
    return ejemplos[k] ?? `[${key}]`;
  });
  out = out.replace(/\$([a-zA-Z][a-zA-Z0-9]*)/g, (_, key) => {
    const snake = String(key).replace(/([A-Z])/g, '_$1').replace(/^_/, '').toUpperCase();
    return ejemplos[snake] ?? ejemplos[key?.toUpperCase()] ?? `$${key}`;
  });
  return out;
}
