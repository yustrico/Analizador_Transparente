/**
 * Analizador transparente — servicio de envío al docente (Google Apps Script)
 * Vive en la cuenta de Gmail del proyecto, dentro de la hoja "Analizador – Registros".
 * Hace 3 cosas:
 *   1. Recibe el reporte de la práctica (PDF) y se lo envía por correo al docente.
 *   2. Califica el examen (la clave de respuestas está SOLO aquí, no en la página),
 *      cuenta los intentos por código (máximo 2) y envía el reporte del examen al docente.
 *   3. Guarda cada envío en la hoja "Registros".
 * Reglas de seguridad: solo acepta correos de docente que estén en la pestaña "Docentes" de esta hoja
 * (y que terminen en @uao.edu.co), exige consentimiento,
 * limita el tamaño del PDF y los reportes por día, y usa un candado para que dos envíos
 * al mismo tiempo no cuenten mal los intentos.
 */

const CONFIG = {
  HOJA: 'Registros',
  HOJA_DOCENTES: 'Docentes',
  DOMINIO_DOCENTE: /^[a-z0-9._%+-]+@uao\.edu\.co$/i,
  CODIGO: /^[0-9]{5,10}$/,
  MAX_NOMBRE: 80,
  MAX_PDF_BYTES: 2 * 1024 * 1024,
  MAX_REPORTES_POR_DIA: 5,
  INTENTOS_MAXIMOS: 2,
  PREGUNTAS_POR_EXAMEN: 10,
  NOTA_MAXIMA: 5,
  NOTA_APROBACION: 3.0
};

// Clave: índice (desde 0) de la opción correcta en datos/examen.json.
const CLAVE = {}; // La clave real está solo en la cuenta del proyecto; no se publica.

function doGet(e) {
  // Consulta de intentos: ?accion=intentos&codigo=2235552[&correo=docente@uao.edu.co]
  const p = (e && e.parameter) || {};
  if (p.accion !== 'intentos') return responder({ ok: true, servicio: 'Analizador transparente' });
  const codigo = String(p.codigo || '').trim();
  if (!CONFIG.CODIGO.test(codigo)) return responder({ ok: false, error: 'Código estudiantil no válido.' });
  // Si la página manda también el correo del docente, se revisa ANTES de empezar el examen.
  if (p.correo !== undefined) {
    const correo = String(p.correo || '').trim().toLowerCase();
    if (!CONFIG.DOMINIO_DOCENTE.test(correo)) return responder({ ok: false, error: 'El correo del docente debe terminar en @uao.edu.co.' });
    if (docentesAutorizados().indexOf(correo) === -1) return responder({ ok: false, error: 'Ese correo no está en la lista de docentes del curso. Revisa que esté bien escrito o pregúntale a tu docente.' });
  }
  const usados = contarFilas('examen', codigo, false);
  return responder({ ok: true, intentosUsados: usados, intentosMaximos: CONFIG.INTENTOS_MAXIMOS });
}

function doPost(e) {
  const candado = LockService.getScriptLock();
  if (!candado.tryLock(20000)) return responder({ ok: false, error: 'El servicio está ocupado. Intenta de nuevo en unos segundos.' });
  try {
    let d;
    try { d = JSON.parse(e.postData.contents); } catch (err) { return responder({ ok: false, error: 'Datos no válidos.' }); }
    const error = validarComunes(d);
    if (error) return responder({ ok: false, error: error });
    if (d.tipo === 'reporte') return procesarReporte(d);
    if (d.tipo === 'examen') return procesarExamen(d);
    return responder({ ok: false, error: 'Tipo de envío desconocido.' });
  } finally {
    candado.releaseLock();
  }
}

function validarComunes(d) {
  if (!d || typeof d !== 'object') return 'Datos no válidos.';
  if (d.consentimiento !== true) return 'Debes aceptar el envío de tus datos al docente.';
  const nombre = String(d.nombre || '').trim();
  if (nombre.length < 3 || nombre.length > CONFIG.MAX_NOMBRE) return 'Escribe tu nombre completo (máximo 80 caracteres).';
  if (!CONFIG.CODIGO.test(String(d.codigo || '').trim())) return 'El código estudiantil debe tener solo números (5 a 10 dígitos).';
  if (!CONFIG.DOMINIO_DOCENTE.test(String(d.correoDocente || '').trim())) return 'El correo del docente debe terminar en @uao.edu.co.';
  if (docentesAutorizados().indexOf(String(d.correoDocente).trim().toLowerCase()) === -1) return 'Ese correo no está en la lista de docentes del curso. Revisa que esté bien escrito o pregúntale a tu docente.';
  if (typeof d.pdfBase64 !== 'string' || d.pdfBase64.length === 0) return 'Falta el PDF.';
  if (d.pdfBase64.length * 3 / 4 > CONFIG.MAX_PDF_BYTES) return 'El PDF es demasiado grande.';
  return '';
}

function procesarReporte(d) {
  const codigo = String(d.codigo).trim();
  if (contarFilas('reporte', codigo, true) >= CONFIG.MAX_REPORTES_POR_DIA) {
    return responder({ ok: false, error: 'Ya enviaste ' + CONFIG.MAX_REPORTES_POR_DIA + ' reportes hoy. Intenta mañana.' });
  }
  const nombre = String(d.nombre).trim();
  const resumen = String(d.resumen || '').slice(0, 4000);
  enviarCorreo(d, 'Reporte de práctica – ' + nombre + ' (' + codigo + ')',
    'Reporte de la práctica de seguridad eléctrica en el Analizador transparente.\n\n' +
    'Estudiante: ' + nombre + '\nCódigo: ' + codigo + '\n\n' + resumen +
    '\n\nEl reporte completo va adjunto en PDF.\nEste correo lo envía automáticamente el Analizador transparente (UAO).',
    'reporte_practica_' + codigo + '.pdf');
  registrar('reporte', d, '', '', '');
  return responder({ ok: true, mensaje: 'Reporte enviado a ' + String(d.correoDocente).trim() + '.' });
}

function procesarExamen(d) {
  const codigo = String(d.codigo).trim();
  const usados = contarFilas('examen', codigo, false);
  if (usados >= CONFIG.INTENTOS_MAXIMOS) {
    return responder({ ok: false, error: 'Ya usaste tus ' + CONFIG.INTENTOS_MAXIMOS + ' intentos del examen.', intentosUsados: usados });
  }
  const r = d.respuestas;
  if (!r || typeof r !== 'object') return responder({ ok: false, error: 'Faltan las respuestas.' });
  const ids = Object.keys(r);
  if (ids.length !== CONFIG.PREGUNTAS_POR_EXAMEN) return responder({ ok: false, error: 'El examen debe tener ' + CONFIG.PREGUNTAS_POR_EXAMEN + ' preguntas.' });
  const detalle = {};
  let correctas = 0;
  for (const id of ids) {
    if (!Object.prototype.hasOwnProperty.call(CLAVE, id)) return responder({ ok: false, error: 'Pregunta desconocida: ' + id });
    const elegida = r[id];
    const bien = Number.isInteger(elegida) && elegida === CLAVE[id];
    detalle[id] = bien;
    if (bien) correctas++;
  }
  const nota = Math.round((correctas / CONFIG.PREGUNTAS_POR_EXAMEN) * CONFIG.NOTA_MAXIMA * 10) / 10;
  const aprobado = nota >= CONFIG.NOTA_APROBACION;
  const intento = usados + 1;
  const nombre = String(d.nombre).trim();
  enviarCorreo(d, 'Examen – ' + nombre + ' (' + codigo + ') – nota ' + nota.toFixed(1) + ' – intento ' + intento + ' de ' + CONFIG.INTENTOS_MAXIMOS,
    'Resultado del examen del Analizador transparente.\n\n' +
    'Estudiante: ' + nombre + '\nCódigo: ' + codigo + '\nIntento: ' + intento + ' de ' + CONFIG.INTENTOS_MAXIMOS +
    '\nRespuestas correctas: ' + correctas + ' de ' + CONFIG.PREGUNTAS_POR_EXAMEN +
    '\nNota (calculada por este servicio, no por la página): ' + nota.toFixed(1) + ' / ' + CONFIG.NOTA_MAXIMA +
    '\nResultado: ' + (aprobado ? 'APROBADO' : 'NO APROBADO') + ' (mínimo ' + CONFIG.NOTA_APROBACION.toFixed(1) + ')' +
    '\n\nEl detalle va adjunto en PDF.\nEste correo lo envía automáticamente el Analizador transparente (UAO).',
    'examen_' + codigo + '_intento' + intento + '.pdf');
  registrar('examen', d, nota, correctas, intento);
  return responder({ ok: true, nota: nota, aprobado: aprobado, correctas: correctas, detalle: detalle,
    intento: intento, intentosMaximos: CONFIG.INTENTOS_MAXIMOS });
}

function enviarCorreo(d, asunto, cuerpo, nombreArchivo) {
  const pdf = Utilities.newBlob(Utilities.base64Decode(d.pdfBase64), 'application/pdf', nombreArchivo);
  MailApp.sendEmail({ to: String(d.correoDocente).trim(), subject: '[Analizador transparente] ' + asunto,
    body: cuerpo, name: 'Analizador transparente', attachments: [pdf] });
}

function hoja() {
  const libro = SpreadsheetApp.getActiveSpreadsheet();
  let h = libro.getSheetByName(CONFIG.HOJA);
  if (!h) {
    h = libro.insertSheet(CONFIG.HOJA);
    h.appendRow(['Fecha', 'Tipo', 'Código', 'Nombre', 'Correo del docente', 'Nota', 'Correctas', 'Intento']);
  }
  return h;
}

// Lista de docentes: pestaña "Docentes", columna A desde la fila 2 (un correo por fila).
// Para agregar o quitar un docente basta con editar esa pestaña; no hay que tocar el código.
function docentesAutorizados() {
  const libro = SpreadsheetApp.getActiveSpreadsheet();
  let h = libro.getSheetByName(CONFIG.HOJA_DOCENTES);
  if (!h) {
    h = libro.insertSheet(CONFIG.HOJA_DOCENTES);
    h.appendRow(['Correo del docente (uno por fila, desde la fila 2)']);
    return [];
  }
  const filas = h.getRange(1, 1, Math.max(h.getLastRow(), 1), 1).getValues();
  return filas.slice(1).map(function (f) { return String(f[0] || '').trim().toLowerCase(); })
    .filter(function (c) { return CONFIG.DOMINIO_DOCENTE.test(c); });
}

function registrar(tipo, d, nota, correctas, intento) {
  hoja().appendRow([new Date(), tipo, "'" + String(d.codigo).trim(), String(d.nombre).trim(),
    String(d.correoDocente).trim(), nota, correctas, intento]);
}

function contarFilas(tipo, codigo, soloHoy) {
  const datos = hoja().getDataRange().getValues();
  const hoy = Utilities.formatDate(new Date(), 'America/Bogota', 'yyyy-MM-dd');
  let n = 0;
  for (let i = 1; i < datos.length; i++) {
    const fila = datos[i];
    if (fila[1] !== tipo || String(fila[2]).replace(/^'/, '') !== codigo) continue;
    if (soloHoy && Utilities.formatDate(new Date(fila[0]), 'America/Bogota', 'yyyy-MM-dd') !== hoy) continue;
    n++;
  }
  return n;
}

function responder(objeto) {
  return ContentService.createTextOutput(JSON.stringify(objeto)).setMimeType(ContentService.MimeType.JSON);
}

/** Prueba manual desde el editor: ejecuta esta función una vez para dar los permisos. */
function probarPermisos() {
  hoja();
  Logger.log('Docentes autorizados: ' + JSON.stringify(docentesAutorizados()));
  Logger.log('Correos que quedan hoy: ' + MailApp.getRemainingDailyQuota());
}
