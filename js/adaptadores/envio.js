/**
 * ============================================================================
 * Título: Envío al docente
 * Descripción: Manda el reporte de la práctica (y, en la Fase 4, el examen)
 *   al correo del docente a través del servicio del equipo: un Google Apps
 *   Script que vive en la cuenta de Gmail del proyecto. La página NO tiene
 *   servidor propio: este es el ÚNICO servicio externo y solo recibe el
 *   nombre, el código, el correo del docente, los resultados y el PDF, y
 *   únicamente si el estudiante marca la casilla de consentimiento.
 *   - validarDatosEnvio, bytesABase64 y urlConsultaIntentos son funciones
 *     puras (se prueban con node --test, sin red).
 *   - enviarAlServicio y consultarIntentos usan la red (fetch).
 *   El servicio revisa OTRA VEZ las mismas reglas: esta validación es solo
 *   para avisarle al estudiante antes de enviar.
 * Módulo: M12 – Envío (adaptador)
 * Autores: Yustin Rico, David Cardona, Santiago González
 * Creado: 2026-11-25 · Modificado: 2026-11-26
 * ============================================================================
 */

/**
 * Dirección del servicio de envío (Google Apps Script publicado como
 * aplicación web; termina en /exec). Si cambia la implementación del
 * servicio, se actualiza aquí.
 */
export const URL_SERVICIO = "https://script.google.com/macros/s/AKfycby34BCGJejumB45gO3zZ5SHS46s6-I7n8yO-YC86zhVmcjZOuKL7BtXjXf3txvfGQYJPQ/exec";

/** Forma que debe tener la dirección de un Apps Script publicado. */
const PATRON_URL_SERVICIO = /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/;

/** Correo del docente con el que empieza la casilla: vacío, el estudiante escribe el de su docente. */
export const CORREO_DOCENTE_POR_DEFECTO = "";

/** Reglas de los datos (las mismas del servicio, CONFIG en Codigo_AppsScript.gs). */
export const LARGO_MINIMO_NOMBRE_ENVIO = 3;
export const LARGO_MAXIMO_NOMBRE_ENVIO = 80;
const PATRON_CODIGO = /^[0-9]{5,10}$/;
const PATRON_CORREO_DOCENTE = /^[a-z0-9._%+-]+@uao\.edu\.co$/i;

/** Tiempo máximo de espera de una respuesta del servicio. */
const TIEMPO_MAXIMO_ENVIO_MS = 30000;

/** Mensajes de error (en español, iguales a los del servicio cuando se puede). */
export const ERRORES_ENVIO = Object.freeze({
  nombre: `Escribe tu nombre completo (de ${LARGO_MINIMO_NOMBRE_ENVIO} a ${LARGO_MAXIMO_NOMBRE_ENVIO} caracteres).`,
  codigo: "El código estudiantil debe tener solo números (5 a 10 dígitos).",
  correoVacio: "Escribe el correo de tu docente",
  correo: "El correo del docente debe terminar en @uao.edu.co.",
  consentimiento: "Debes aceptar el envío de tus datos al docente.",
});
const ERROR_SIN_CONEXION = "No se pudo conectar con el servicio de envío. Revisa tu internet o descarga el PDF y envíalo tú.";
const ERROR_SIN_CONFIGURAR = "El servicio de envío aún no está configurado en esta versión de la página. Descarga el PDF y envíalo tú.";
const ERROR_RESPUESTA_RARA = "El servicio de envío respondió algo inesperado. Descarga el PDF y envíalo tú.";

/** Alfabeto de base64 (RFC 4648): 64 símbolos, uno por cada grupo de 6 bits. */
const ALFABETO_BASE64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const RELLENO_BASE64 = "=";
/** Base64 toma los bytes de 3 en 3 (24 bits) y los escribe como 4 símbolos de 6 bits. */
const BYTES_POR_GRUPO = 3;
const BITS_POR_BYTE = 8;
const BITS_POR_SIMBOLO = 6;
const MASCARA_SEIS_BITS = 0b111111;

/**
 * Revisa los datos del formulario de envío con las MISMAS reglas del
 * servicio. No usa la red ni la pantalla (función pura).
 * @param {{nombre: *, codigo: *, correoDocente: *, consentimiento: *}} datos - Lo que escribió el estudiante.
 * @returns {string[]} Lista de errores en español (vacía si todo está bien).
 */
export function validarDatosEnvio({ nombre, codigo, correoDocente, consentimiento }) {
  const errores = [];
  const largoNombre = String(nombre ?? "").trim().length;
  // Nombre: entre 3 y 80 caracteres sin contar espacios al principio y al final
  if (largoNombre < LARGO_MINIMO_NOMBRE_ENVIO || largoNombre > LARGO_MAXIMO_NOMBRE_ENVIO) {
    errores.push(ERRORES_ENVIO.nombre);
  }
  // Código: solo números, de 5 a 10 dígitos
  if (!PATRON_CODIGO.test(String(codigo ?? "").trim())) {
    errores.push(ERRORES_ENVIO.codigo);
  }
  // Correo del docente: obligatorio y solo de la universidad (sin importar mayúsculas)
  const correoLimpio = String(correoDocente ?? "").trim();
  if (correoLimpio === "") {
    errores.push(ERRORES_ENVIO.correoVacio);
  } else if (!PATRON_CORREO_DOCENTE.test(correoLimpio)) {
    errores.push(ERRORES_ENVIO.correo);
  }
  // Consentimiento: tiene que ser exactamente true (casilla marcada)
  if (consentimiento !== true) {
    errores.push(ERRORES_ENVIO.consentimiento);
  }
  return errores;
}

/**
 * Convierte bytes (por ejemplo, el PDF) en texto base64, para poder mandarlos
 * dentro de un JSON. Cada 3 bytes (24 bits) se escriben como 4 símbolos de
 * 6 bits; si al final sobran 1 o 2 bytes, se completa con "=". Función pura.
 * @param {Uint8Array} bytes - Bytes a convertir.
 * @returns {string} Texto base64.
 */
export function bytesABase64(bytes) {
  if (!(bytes instanceof Uint8Array)) {
    throw new TypeError("bytesABase64 necesita un Uint8Array.");
  }
  const partes = [];
  // Un grupo de hasta 3 bytes por vuelta
  for (let inicio = 0; inicio < bytes.length; inicio += BYTES_POR_GRUPO) {
    const grupo = bytes.subarray(inicio, inicio + BYTES_POR_GRUPO);
    // Junta los bytes del grupo en un número de 24 bits (los que faltan valen 0)
    let bits = 0;
    for (let indice = 0; indice < BYTES_POR_GRUPO; indice += 1) {
      bits = (bits << BITS_POR_BYTE) | (grupo[indice] ?? 0);
    }
    // 1 byte → 2 símbolos, 2 bytes → 3 símbolos, 3 bytes → 4 símbolos
    const simbolosUtiles = grupo.length + 1;
    const simbolosPorGrupo = BYTES_POR_GRUPO + 1;
    for (let indice = 0; indice < simbolosPorGrupo; indice += 1) {
      const desplazamiento = (simbolosPorGrupo - 1 - indice) * BITS_POR_SIMBOLO;
      partes.push(indice < simbolosUtiles ? ALFABETO_BASE64[(bits >> desplazamiento) & MASCARA_SEIS_BITS] : RELLENO_BASE64);
    }
  }
  return partes.join("");
}

/**
 * Indica si URL_SERVICIO ya tiene la dirección real del Apps Script.
 * @returns {boolean} true si tiene la forma https://script.google.com/macros/s/…/exec.
 */
export function servicioConfigurado() {
  return PATRON_URL_SERVICIO.test(URL_SERVICIO);
}

/**
 * Hace una petición al servicio con tiempo máximo de 30 s y lee su JSON.
 * @param {string} url - Dirección completa.
 * @param {RequestInit} opciones - Opciones de fetch.
 * @returns {Promise<object>} Respuesta del servicio, o {ok: false, error} si algo falló.
 */
async function pedirAlServicio(url, opciones) {
  if (!servicioConfigurado()) {
    return { ok: false, error: ERROR_SIN_CONFIGURAR };
  }
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), TIEMPO_MAXIMO_ENVIO_MS);
  let respuesta;
  try {
    respuesta = await fetch(url, { ...opciones, signal: controlador.signal });
  } catch {
    // Sin internet, servicio caído o se pasó el tiempo máximo
    return { ok: false, error: ERROR_SIN_CONEXION };
  } finally {
    clearTimeout(temporizador);
  }
  // El servicio siempre responde un objeto JSON {ok, error, …}
  try {
    const datos = await respuesta.json();
    if (datos === null || typeof datos !== "object" || typeof datos.ok !== "boolean") {
      return { ok: false, error: ERROR_RESPUESTA_RARA };
    }
    return datos;
  } catch {
    return { ok: false, error: ERROR_RESPUESTA_RARA };
  }
}

/**
 * Envía datos al servicio (reporte o examen). Va SIN encabezados: así el
 * navegador lo manda como text/plain y no hace la consulta previa de CORS
 * (preflight), que Apps Script no responde.
 * @param {object} datos - Objeto con tipo, nombre, codigo, correoDocente, consentimiento, pdfBase64…
 * @returns {Promise<{ok: boolean, error?: string, mensaje?: string}>} Respuesta del servicio.
 */
export async function enviarAlServicio(datos) {
  return pedirAlServicio(URL_SERVICIO, { method: "POST", body: JSON.stringify(datos) });
}

/**
 * Arma la dirección con que se consultan los intentos del examen. Si viene el
 * correo del docente, se agrega para que el servicio revise que esté en su
 * lista de docentes ANTES de empezar el examen. Función pura (sin red).
 * @param {string} codigo - Código estudiantil.
 * @param {string} [correoDocente] - Correo del docente (opcional).
 * @returns {string} URL completa: …/exec?accion=intentos&codigo=…[&correo=…].
 */
export function urlConsultaIntentos(codigo, correoDocente) {
  const consulta = `${URL_SERVICIO}?accion=intentos&codigo=${encodeURIComponent(codigo)}`;
  // El correo solo se agrega si se pasó uno (no vacío)
  const correoLimpio = String(correoDocente ?? "").trim();
  return correoLimpio === "" ? consulta : `${consulta}&correo=${encodeURIComponent(correoLimpio)}`;
}

/**
 * Pregunta al servicio cuántos intentos del examen lleva un código y, si se
 * pasa el correo del docente, si ese correo está autorizado.
 * @param {string} codigo - Código estudiantil.
 * @param {string} [correoDocente] - Correo del docente (opcional).
 * @returns {Promise<{ok: boolean, intentosUsados?: number, intentosMaximos?: number, error?: string}>} Respuesta.
 */
export async function consultarIntentos(codigo, correoDocente) {
  const respuesta = await pedirAlServicio(urlConsultaIntentos(codigo, correoDocente), { method: "GET" });
  return {
    ok: respuesta.ok,
    intentosUsados: respuesta.intentosUsados,
    intentosMaximos: respuesta.intentosMaximos,
    error: respuesta.error,
  };
}
