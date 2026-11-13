/**
 * ============================================================================
 * Título: Modelo del equipo
 * Descripción: Carga los parámetros del electrocardiógrafo Mindray BeneHeart
 *   R12 (datos/parametros_r12.json) y los REVISA antes de usarlos: que estén
 *   todos los campos, que los números sean números y que estén en un rango
 *   lógico (por ejemplo, una capacitancia no puede ser negativa). Si algo
 *   está mal, lanza un error en español que dice exactamente qué campo falló.
 *   Los parámetros revisados se entregan "congelados" para que ningún otro
 *   módulo los cambie por accidente.
 * Módulo: M3 – Modelo del equipo (núcleo)
 * Autores: Yustin Rico, David Cardona, Santiago González
 * Creado: 2026-11-13 · Modificado: 2026-11-13
 * ============================================================================
 */

/** Campos numéricos que deben ser mayores que cero (ruta dentro del JSON). */
const CAMPOS_POSITIVOS = Object.freeze([
  ["red", "V_rms"],
  ["red", "f_Hz"],
  ["capacitancias_F", "C_L"],
  ["capacitancias_F", "C_N"],
  ["capacitancias_F", "C_AP"],
  ["R_PE_ohm"],
  ["R_MD_ohm"],
  ["exactitud_analizador", "piso_uA"],
  ["exactitud_analizador", "k"],
]);

/** Campos numéricos que pueden valer cero pero no ser negativos. */
const CAMPOS_NO_NEGATIVOS = Object.freeze([
  ["delta_paciente_tierra_abierta_A"],
  ["exactitud_analizador", "porcentaje_lectura"],
]);

/** Campos de texto que no pueden faltar ni estar vacíos. */
const CAMPOS_TEXTO = Object.freeze([
  ["equipo", "nombre"],
  ["equipo", "clase"],
  ["equipo", "parte_aplicada"],
  ["equipo", "norma_general"],
  ["pasos_previos_medidos", "inspeccion_visual"],
]);

/** Datos de los pasos 1 a 3 de la prueba guiada que deben existir. */
const CAMPOS_OBJETO_PASOS_PREVIOS = Object.freeze([
  ["pasos_previos_medidos", "resistencia_tierra_ohm"],
  ["pasos_previos_medidos", "aislamiento_Mohm"],
]);

/** Grupos de límites de IEC 60601-1 que debe traer el archivo. */
const GRUPOS_DE_LIMITES = Object.freeze(["contacto", "paciente_B", "paciente_BF", "paciente_CF"]);

/** Un porcentaje no puede ser mayor que 100 %. */
const PORCENTAJE_MAXIMO = 100;

/**
 * Lee un campo dentro de un objeto siguiendo una ruta, por ejemplo ["red", "V_rms"].
 * @param {object} datos - Objeto donde se busca.
 * @param {string[]} ruta - Nombres de las llaves, de afuera hacia adentro.
 * @returns {*} El valor encontrado.
 * @throws {Error} Si alguna parte de la ruta no existe.
 */
function leerCampo(datos, ruta) {
  let valor = datos;
  // Baja un nivel por cada llave de la ruta
  for (const llave of ruta) {
    if (valor === null || typeof valor !== "object" || !(llave in valor)) {
      throw new Error(`Parámetros del equipo: falta el campo "${ruta.join(".")}".`);
    }
    valor = valor[llave];
  }
  return valor;
}

/**
 * Revisa que un campo sea un número finito (no texto, no NaN, no infinito).
 * @param {object} datos - Objeto de parámetros.
 * @param {string[]} ruta - Ruta del campo.
 * @returns {number} El número leído.
 * @throws {Error} Si no es un número finito.
 */
function leerNumero(datos, ruta) {
  const valor = leerCampo(datos, ruta);
  if (typeof valor !== "number" || !Number.isFinite(valor)) {
    throw new Error(`Parámetros del equipo: "${ruta.join(".")}" debe ser un número (se recibió ${JSON.stringify(valor)}).`);
  }
  return valor;
}

/**
 * Revisa los campos numéricos: tipo y rango (positivos y no negativos).
 * @param {object} datos - Objeto de parámetros.
 * @throws {Error} Si algún número falta o está fuera de rango.
 */
function validarNumeros(datos) {
  // Campos que deben ser mayores que cero
  for (const ruta of CAMPOS_POSITIVOS) {
    if (leerNumero(datos, ruta) <= 0) {
      throw new Error(`Parámetros del equipo: "${ruta.join(".")}" debe ser mayor que cero.`);
    }
  }
  // Campos que pueden ser cero pero no negativos
  for (const ruta of CAMPOS_NO_NEGATIVOS) {
    if (leerNumero(datos, ruta) < 0) {
      throw new Error(`Parámetros del equipo: "${ruta.join(".")}" no puede ser negativo.`);
    }
  }
  // Un porcentaje de exactitud mayor que 100 % no tiene sentido
  if (leerNumero(datos, ["exactitud_analizador", "porcentaje_lectura"]) > PORCENTAJE_MAXIMO) {
    throw new Error(`Parámetros del equipo: "exactitud_analizador.porcentaje_lectura" no puede ser mayor que ${PORCENTAJE_MAXIMO} %.`);
  }
}

/**
 * Revisa los límites de IEC 60601-1: que existan, que sean positivos y que el
 * de primer defecto no sea menor que el de condición normal.
 * @param {object} datos - Objeto de parámetros.
 * @throws {Error} Si algún límite falta o es incoherente.
 */
function validarLimites(datos) {
  // Revisa cada grupo de límites (contacto, paciente B, BF y CF)
  for (const grupo of GRUPOS_DE_LIMITES) {
    const limiteNormal_uA = leerNumero(datos, ["limites_uA", grupo, "normal"]);
    const limitePrimerDefecto_uA = leerNumero(datos, ["limites_uA", grupo, "primer_defecto"]);
    if (limiteNormal_uA <= 0 || limitePrimerDefecto_uA <= 0) {
      throw new Error(`Parámetros del equipo: los límites de "limites_uA.${grupo}" deben ser mayores que cero.`);
    }
    if (limitePrimerDefecto_uA < limiteNormal_uA) {
      throw new Error(`Parámetros del equipo: en "limites_uA.${grupo}" el límite de primer defecto no puede ser menor que el normal.`);
    }
  }
}

/**
 * Revisa los textos obligatorios y los datos de los pasos previos.
 * @param {object} datos - Objeto de parámetros.
 * @throws {Error} Si falta un texto o un dato de los pasos previos.
 */
function validarTextosYPasosPrevios(datos) {
  // Textos que no pueden estar vacíos
  for (const ruta of CAMPOS_TEXTO) {
    const valor = leerCampo(datos, ruta);
    if (typeof valor !== "string" || valor.trim() === "") {
      throw new Error(`Parámetros del equipo: "${ruta.join(".")}" debe ser un texto no vacío.`);
    }
  }
  // Datos medidos de los pasos 2 y 3 (deben ser objetos)
  for (const ruta of CAMPOS_OBJETO_PASOS_PREVIOS) {
    const valor = leerCampo(datos, ruta);
    if (valor === null || typeof valor !== "object") {
      throw new Error(`Parámetros del equipo: "${ruta.join(".")}" debe ser un objeto con los valores medidos.`);
    }
  }
}

/**
 * Congela un objeto y todos los objetos que tenga adentro, para que nadie
 * pueda cambiar los parámetros después de validarlos.
 * @param {object} objeto - Objeto a congelar.
 * @returns {object} El mismo objeto, ya congelado.
 */
function congelarProfundo(objeto) {
  // Congela primero cada objeto interno
  for (const valor of Object.values(objeto)) {
    if (valor !== null && typeof valor === "object") {
      congelarProfundo(valor);
    }
  }
  return Object.freeze(objeto);
}

/**
 * Valida los parámetros del equipo (tipos y rangos) y devuelve una copia congelada.
 * @param {object} datos - Contenido de parametros_r12.json ya convertido a objeto.
 * @returns {object} Copia validada y congelada de los parámetros (unidades SI, límites en µA).
 * @throws {Error} Con un mensaje en español que dice qué campo falló.
 */
export function validarParametros(datos) {
  if (datos === null || typeof datos !== "object" || Array.isArray(datos)) {
    throw new Error("Parámetros del equipo: el archivo debe contener un objeto JSON.");
  }
  validarNumeros(datos);
  validarLimites(datos);
  validarTextosYPasosPrevios(datos);
  return congelarProfundo(structuredClone(datos));
}

/**
 * Descarga el archivo JSON de parámetros y lo valida.
 * La función de lectura se puede cambiar (por defecto es fetch del navegador),
 * así este módulo se prueba en Node sin red y sin pantalla.
 * @param {string} rutaArchivo - Ruta del JSON, por ejemplo "datos/parametros_r12.json".
 * @param {Function} [funcionLectura=globalThis.fetch] - Función que recibe la ruta y devuelve una respuesta con ok, status y json().
 * @returns {Promise<object>} Parámetros validados y congelados.
 * @throws {Error} Si el archivo no se pudo leer o no es válido.
 */
export async function cargarParametros(rutaArchivo, funcionLectura = globalThis.fetch) {
  if (typeof funcionLectura !== "function") {
    throw new Error("No hay una función para leer el archivo de parámetros.");
  }
  const respuesta = await funcionLectura(rutaArchivo);
  if (!respuesta.ok) {
    throw new Error(`No se pudo leer "${rutaArchivo}" (código ${respuesta.status}). ¿Se está sirviendo la carpeta con un servidor local?`);
  }
  return validarParametros(await respuesta.json());
}
