/**
 * ============================================================================
 * Título: Secuencia de la prueba
 * Descripción: Define los 4 pasos de la prueba de seguridad eléctrica en su
 *   orden fijo (inspección visual → resistencia de tierra → aislamiento →
 *   corrientes de fuga), con el propósito de seguridad de cada uno, y lleva
 *   la cuenta de cuáles se han completado. No deja saltar pasos.
 *   El estado es un objeto simple; cada función devuelve un estado NUEVO en
 *   vez de cambiar el anterior (función pura), así es fácil de probar.
 * Módulo: M2 – Secuencia de la prueba (núcleo)
 * Autores: Yustin Rico, David Cardona, Santiago González
 * Creado: 2026-11-13 · Modificado: 2026-11-13
 * ============================================================================
 */

/**
 * Pasos de la prueba en orden fijo.
 * claveDatoMedido: campo de "pasos_previos_medidos" (JSON) que muestra el
 * resultado del paso; el paso 4 no tiene, porque lleva a la sección Analizador.
 */
export const PASOS_PRUEBA = Object.freeze([
  Object.freeze({
    id: "inspeccion_visual",
    titulo: "Inspección visual",
    proposito: "Detectar daños que se ven a simple vista (carcasa rota, cable de poder o enchufe dañado, etiquetas ilegibles, contaminación) antes de energizar el equipo. Un defecto visible puede dejar partes con tensión al alcance de la mano, y no tiene sentido medir un equipo que ya se ve inseguro.",
    claveDatoMedido: "inspeccion_visual",
  }),
  Object.freeze({
    id: "resistencia_tierra",
    titulo: "Resistencia del conductor de protección",
    proposito: "Comprobar que el chasis está unido a la tierra de la instalación con una resistencia muy baja. Ese conductor es el camino por donde se va la corriente de fuga; si está roto o es muy resistivo, la corriente buscaría pasar por la persona que toca el equipo.",
    claveDatoMedido: "resistencia_tierra_ohm",
  }),
  Object.freeze({
    id: "aislamiento",
    titulo: "Resistencia de aislamiento",
    proposito: "Verificar que el aislamiento entre la red, el chasis y las partes aplicadas sigue siendo muy alto (megaohmios). Si el aislamiento se degrada, aumentan las corrientes de fuga hacia el operador y hacia el paciente.",
    claveDatoMedido: "aislamiento_Mohm",
  }),
  Object.freeze({
    id: "corrientes_fuga",
    titulo: "Corrientes de fuga",
    proposito: "Medir la corriente que pasaría por una persona que toca el chasis (corriente de contacto) y la que llegaría al paciente por los electrodos (corriente de paciente CF), en condición normal y con un primer defecto, y compararlas con los límites de IEC 60601-1.",
    claveDatoMedido: null,
  }),
]);

/**
 * Busca la posición de un paso por su identificador.
 * @param {string} idPaso - Identificador del paso.
 * @returns {number} Posición (0 a 3).
 * @throws {Error} Si el paso no existe.
 */
function indiceDePaso(idPaso) {
  const indice = PASOS_PRUEBA.findIndex((paso) => paso.id === idPaso);
  if (indice === -1) {
    throw new Error(`El paso "${idPaso}" no existe en la prueba.`);
  }
  return indice;
}

/**
 * Revisa que el estado tenga un número válido de pasos completados (0 a 4).
 * @param {{pasosCompletados: number}} estado - Estado de la secuencia.
 * @throws {Error} Si el estado está dañado.
 */
function validarEstado(estado) {
  const esValido = estado !== null && typeof estado === "object"
    && Number.isInteger(estado.pasosCompletados)
    && estado.pasosCompletados >= 0
    && estado.pasosCompletados <= PASOS_PRUEBA.length;
  if (!esValido) {
    throw new Error("El estado de la secuencia no es válido.");
  }
}

/**
 * Crea el estado al empezar la práctica: ningún paso completado.
 * @returns {Readonly<{pasosCompletados: number}>} Estado inicial.
 */
export function crearEstadoInicial() {
  return Object.freeze({ pasosCompletados: 0 });
}

/**
 * Devuelve el paso que toca hacer ahora.
 * @param {{pasosCompletados: number}} estado - Estado de la secuencia.
 * @returns {object|null} El paso actual, o null si ya se completaron todos.
 */
export function obtenerPasoActual(estado) {
  validarEstado(estado);
  return PASOS_PRUEBA[estado.pasosCompletados] ?? null;
}

/**
 * Indica si un paso ya se puede ver: los completados y el actual sí; los
 * siguientes no.
 * @param {{pasosCompletados: number}} estado - Estado de la secuencia.
 * @param {string} idPaso - Identificador del paso.
 * @returns {boolean} true si el paso está disponible.
 */
export function pasoDisponible(estado, idPaso) {
  validarEstado(estado);
  return indiceDePaso(idPaso) <= estado.pasosCompletados;
}

/**
 * Marca como completado el paso actual y devuelve el estado nuevo.
 * Solo se puede completar el paso que toca: no se pueden saltar pasos.
 * @param {{pasosCompletados: number}} estado - Estado de la secuencia.
 * @param {string} idPaso - Identificador del paso que se quiere completar.
 * @returns {Readonly<{pasosCompletados: number}>} Estado nuevo.
 * @throws {Error} Si la prueba ya terminó o si el paso no es el que toca.
 */
export function completarPaso(estado, idPaso) {
  const indice = indiceDePaso(idPaso);
  const pasoActual = obtenerPasoActual(estado);
  if (pasoActual === null) {
    throw new Error("La prueba ya terminó: todos los pasos están completados.");
  }
  if (indice !== estado.pasosCompletados) {
    throw new Error(`No se puede completar "${PASOS_PRUEBA[indice].titulo}": primero hay que completar "${pasoActual.titulo}".`);
  }
  return Object.freeze({ pasosCompletados: estado.pasosCompletados + 1 });
}

/**
 * Indica si ya se completaron los 4 pasos.
 * @param {{pasosCompletados: number}} estado - Estado de la secuencia.
 * @returns {boolean} true si la secuencia terminó.
 */
export function secuenciaTerminada(estado) {
  return obtenerPasoActual(estado) === null;
}
