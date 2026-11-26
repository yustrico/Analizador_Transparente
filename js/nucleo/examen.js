/**
 * ============================================================================
 * Título: Examen (banco de preguntas, sorteo y respuestas)
 * Descripción: Funciones puras del modo examen. Revisan el banco de
 *   preguntas (datos/examen.json), sortean las preguntas de cada intento,
 *   barajan las opciones y arman el objeto de respuestas que se envía al
 *   servicio del equipo.
 *   IMPORTANTE: aquí NO se califica. La página no conoce la clave de
 *   respuestas (el banco no la trae y validarBanco rechaza cualquier campo
 *   extra). Quien califica es el servicio del equipo (Google Apps Script),
 *   que es el único que tiene la clave. Por eso, aunque un estudiante lea el
 *   código de la página o del repositorio, no encuentra las respuestas.
 *   Las opciones se muestran barajadas, pero lo que se envía es el ÍNDICE
 *   ORIGINAL de la opción en examen.json (0 a 3), que es el que usa la clave.
 * Módulo: M7 – Examen (núcleo)
 * Autores: Yustin Rico, David Cardona, Santiago González
 * Creado: 2026-11-26 · Modificado: 2026-11-26
 * ============================================================================
 */

/** Cada pregunta tiene exactamente 4 opciones. */
export const OPCIONES_POR_PREGUNTA = 4;

/**
 * Únicos campos que puede traer una pregunta. Cualquier otro (por ejemplo,
 * "respuesta" o "correcta") se rechaza: la clave no puede estar en la página.
 */
const CAMPOS_PERMITIDOS_PREGUNTA = Object.freeze(["id", "pregunta", "opciones"]);

/** Campos numéricos del banco que deben ser enteros mayores que cero. */
const CAMPOS_ENTEROS_POSITIVOS = Object.freeze(["preguntas_por_examen", "intentos_maximos"]);

/** Campos numéricos del banco que deben ser números mayores que cero. */
const CAMPOS_NUMERICOS_POSITIVOS = Object.freeze(["nota_maxima", "nota_aprobacion"]);

/**
 * Revisa que un valor sea un texto con algo escrito.
 * @param {*} valor - Valor a revisar.
 * @returns {boolean} true si es un texto no vacío.
 */
function esTextoConContenido(valor) {
  return typeof valor === "string" && valor.trim().length > 0;
}

/**
 * Revisa una pregunta del banco.
 * @param {*} pregunta - Pregunta tal como viene en el JSON.
 * @param {number} posicion - Posición (desde 1), para el mensaje de error.
 * @throws {Error} Si la pregunta está mal armada o trae un campo de respuesta.
 */
function validarPregunta(pregunta, posicion) {
  if (pregunta === null || typeof pregunta !== "object" || Array.isArray(pregunta)) {
    throw new Error(`Banco del examen: la pregunta ${posicion} no es un objeto.`);
  }
  const nombre = esTextoConContenido(pregunta.id) ? pregunta.id : `número ${posicion}`;
  // Ningún campo fuera de id, pregunta y opciones (así no se cuela una respuesta)
  for (const campo of Object.keys(pregunta)) {
    if (!CAMPOS_PERMITIDOS_PREGUNTA.includes(campo)) {
      throw new Error(`Banco del examen: la pregunta ${nombre} trae el campo "${campo}". Solo se permiten id, pregunta y opciones: las respuestas no pueden estar en la página.`);
    }
  }
  if (!esTextoConContenido(pregunta.id)) {
    throw new Error(`Banco del examen: la pregunta ${posicion} no tiene id.`);
  }
  if (!esTextoConContenido(pregunta.pregunta)) {
    throw new Error(`Banco del examen: la pregunta ${nombre} no tiene texto.`);
  }
  if (!Array.isArray(pregunta.opciones) || pregunta.opciones.length !== OPCIONES_POR_PREGUNTA) {
    throw new Error(`Banco del examen: la pregunta ${nombre} debe tener exactamente ${OPCIONES_POR_PREGUNTA} opciones.`);
  }
  // Cada opción debe tener texto
  for (const [indice, opcion] of pregunta.opciones.entries()) {
    if (!esTextoConContenido(opcion)) {
      throw new Error(`Banco del examen: la opción ${indice + 1} de la pregunta ${nombre} está vacía.`);
    }
  }
}

/**
 * Revisa el banco de preguntas (datos/examen.json) y lo entrega congelado.
 * @param {*} json - Contenido del archivo ya convertido a objeto.
 * @returns {Readonly<object>} El mismo banco, revisado y congelado.
 * @throws {Error} Si faltan preguntas, hay ids repetidos, una pregunta no
 *   tiene texto o no tiene 4 opciones, o alguna trae un campo de respuesta.
 */
export function validarBanco(json) {
  if (json === null || typeof json !== "object" || Array.isArray(json)) {
    throw new Error("Banco del examen: el archivo no tiene la forma esperada.");
  }
  // Números del examen (cuántas preguntas, intentos y notas)
  for (const campo of CAMPOS_ENTEROS_POSITIVOS) {
    if (!Number.isInteger(json[campo]) || json[campo] <= 0) {
      throw new Error(`Banco del examen: "${campo}" debe ser un número entero mayor que cero.`);
    }
  }
  for (const campo of CAMPOS_NUMERICOS_POSITIVOS) {
    if (typeof json[campo] !== "number" || !Number.isFinite(json[campo]) || json[campo] <= 0) {
      throw new Error(`Banco del examen: "${campo}" debe ser un número mayor que cero.`);
    }
  }
  if (json.nota_aprobacion > json.nota_maxima) {
    throw new Error("Banco del examen: la nota de aprobación no puede ser mayor que la nota máxima.");
  }
  if (!Array.isArray(json.preguntas) || json.preguntas.length < json.preguntas_por_examen) {
    throw new Error(`Banco del examen: se necesitan al menos ${json.preguntas_por_examen} preguntas.`);
  }
  const idsVistos = new Set();
  // Cada pregunta: bien armada y con id único
  for (const [indice, pregunta] of json.preguntas.entries()) {
    validarPregunta(pregunta, indice + 1);
    if (idsVistos.has(pregunta.id)) {
      throw new Error(`Banco del examen: el id "${pregunta.id}" está repetido.`);
    }
    idsVistos.add(pregunta.id);
  }
  return congelarProfundo(json);
}

/**
 * Congela un objeto y todo lo que tiene adentro, para que nadie lo cambie por accidente.
 * @param {object} objeto - Objeto a congelar.
 * @returns {Readonly<object>} El mismo objeto, congelado.
 */
function congelarProfundo(objeto) {
  // Primero congela lo de adentro y después el objeto
  for (const valor of Object.values(objeto)) {
    if (valor !== null && typeof valor === "object") {
      congelarProfundo(valor);
    }
  }
  return Object.freeze(objeto);
}

/**
 * Revisa que "aleatorio" sea una función como Math.random.
 * @param {*} aleatorio - Función que devuelve un número en [0, 1).
 * @throws {Error} Si no es una función.
 */
function validarAleatorio(aleatorio) {
  if (typeof aleatorio !== "function") {
    throw new Error("Se necesita una función que dé números al azar (como Math.random).");
  }
}

/**
 * Baraja una copia de una lista (algoritmo de Fisher–Yates): recorre la
 * lista de atrás hacia adelante y cambia cada elemento por uno al azar de
 * los que quedan antes. Así todos los órdenes son igual de probables.
 * @param {Array} lista - Lista original (no se modifica).
 * @param {function(): number} aleatorio - Función que devuelve un número en [0, 1).
 * @returns {Array} Copia barajada.
 */
function barajar(lista, aleatorio) {
  const copia = [...lista];
  // Desde el último hasta el segundo elemento
  for (let indice = copia.length - 1; indice > 0; indice -= 1) {
    const elegido = Math.floor(aleatorio() * (indice + 1));
    [copia[indice], copia[elegido]] = [copia[elegido], copia[indice]];
  }
  return copia;
}

/**
 * Sortea n preguntas distintas del banco.
 * @param {{preguntas: object[]}} banco - Banco ya revisado con validarBanco.
 * @param {number} n - Cuántas preguntas (entero entre 1 y el total del banco).
 * @param {function(): number} [aleatorio=Math.random] - Función que devuelve un número en [0, 1).
 * @returns {object[]} Preguntas elegidas, en orden al azar.
 * @throws {Error} Si n no es válido.
 */
export function elegirPreguntas(banco, n, aleatorio = Math.random) {
  validarAleatorio(aleatorio);
  if (!Array.isArray(banco?.preguntas)) {
    throw new Error("Para elegir preguntas se necesita un banco con preguntas.");
  }
  if (!Number.isInteger(n) || n < 1 || n > banco.preguntas.length) {
    throw new Error(`Se pueden elegir de 1 a ${banco.preguntas.length} preguntas (se pidieron ${n}).`);
  }
  return barajar(banco.preguntas, aleatorio).slice(0, n);
}

/**
 * Baraja las opciones de una pregunta y recuerda la posición original de
 * cada una (la que usa la clave del servicio).
 * @param {{opciones: string[]}} pregunta - Pregunta del banco.
 * @param {function(): number} [aleatorio=Math.random] - Función que devuelve un número en [0, 1).
 * @returns {{texto: string, indiceOriginal: number}[]} Opciones en orden al azar.
 */
export function barajarOpciones(pregunta, aleatorio = Math.random) {
  validarAleatorio(aleatorio);
  if (!Array.isArray(pregunta?.opciones)) {
    throw new Error("La pregunta no tiene opciones.");
  }
  const opciones = pregunta.opciones.map((texto, indiceOriginal) => ({ texto, indiceOriginal }));
  return barajar(opciones, aleatorio);
}

/**
 * Indica si un valor es un índice de opción válido (0 a 3).
 * @param {*} valor - Valor a revisar.
 * @returns {boolean} true si es un entero entre 0 y OPCIONES_POR_PREGUNTA − 1.
 */
function esIndiceDeOpcion(valor) {
  return Number.isInteger(valor) && valor >= 0 && valor < OPCIONES_POR_PREGUNTA;
}

/**
 * Convierte lo que eligió el estudiante en el objeto que se envía al
 * servicio: { id de la pregunta: índice ORIGINAL de la opción }.
 * @param {Map<string, number>} seleccion - Pregunta → índice original elegido.
 * @returns {Object<string, number>} Respuestas, por ejemplo { q01: 0, q07: 1 }.
 * @throws {Error} Si la selección no es un Map o trae un índice inválido.
 */
export function armarRespuestas(seleccion) {
  if (!(seleccion instanceof Map)) {
    throw new Error("Las respuestas elegidas deben venir en un Map (pregunta → opción).");
  }
  const respuestas = {};
  // Una entrada por pregunta respondida
  for (const [id, indiceOriginal] of seleccion) {
    if (!esIndiceDeOpcion(indiceOriginal)) {
      throw new Error(`La respuesta de la pregunta ${id} no es una opción válida.`);
    }
    respuestas[id] = indiceOriginal;
  }
  return respuestas;
}

/**
 * Indica si el estudiante ya respondió todas las preguntas del intento.
 * @param {{id: string}[]} preguntas - Preguntas del intento.
 * @param {Map<string, number>} seleccion - Pregunta → índice original elegido.
 * @returns {boolean} true si cada pregunta tiene una opción válida elegida.
 */
export function todasRespondidas(preguntas, seleccion) {
  if (!Array.isArray(preguntas) || preguntas.length === 0 || !(seleccion instanceof Map)) {
    return false;
  }
  return preguntas.every((pregunta) => esIndiceDeOpcion(seleccion.get(pregunta.id)));
}

/**
 * Carga el banco de preguntas desde su archivo y lo revisa.
 * @param {string} rutaArchivo - Ruta del JSON (por ejemplo "datos/examen.json").
 * @param {function} [funcionLectura=globalThis.fetch] - Función para leer (fetch; en pruebas se reemplaza).
 * @returns {Promise<Readonly<object>>} Banco revisado.
 * @throws {Error} Si el archivo no se puede leer o el banco no es válido.
 */
export async function cargarBanco(rutaArchivo, funcionLectura = globalThis.fetch) {
  if (typeof funcionLectura !== "function") {
    throw new Error("No hay una función para leer el banco del examen.");
  }
  const respuesta = await funcionLectura(rutaArchivo);
  if (!respuesta.ok) {
    throw new Error(`No se pudo leer "${rutaArchivo}" (código ${respuesta.status}).`);
  }
  return validarBanco(await respuesta.json());
}
