/**
 * ============================================================================
 * Título: Evaluador de límites
 * Descripción: Decide qué límite de IEC 60601-1 aplica a una lectura (según
 *   si es corriente de contacto o de paciente, y si la condición es normal o
 *   primer defecto), dice si la lectura "Cumple" o "No cumple" y qué
 *   porcentaje del límite usó. También entrega los límites equivalentes para
 *   partes aplicadas B, BF y CF, para compararlos al lado de la lectura (RF07).
 * Módulo: M5 – Evaluador de límites (núcleo)
 * Autores: Yustin Rico, David Cardona, Santiago González
 * Creado: 2026-11-13 · Modificado: 2026-11-13
 * ============================================================================
 */

import { validarCondicion, validarTipoMedicion } from "./motor_calculo.js";

/** Estados de la condición según la norma. */
export const ESTADO_NORMAL = "normal";
export const ESTADO_PRIMER_DEFECTO = "primer_defecto";

/** Textos del veredicto. */
export const VEREDICTO_CUMPLE = "Cumple";
export const VEREDICTO_NO_CUMPLE = "No cumple";

/** Factor para pasar una fracción a porcentaje. */
const PORCENTAJE_POR_FRACCION = 100;

/** Grupo de límites del JSON para cada tipo de parte aplicada, en la corriente de paciente. */
const GRUPO_PACIENTE_POR_TIPO_DE_PARTE = Object.freeze({ B: "paciente_B", BF: "paciente_BF", CF: "paciente_CF" });

/** Tipo de parte aplicada del R12 (sus límites son los que deciden el veredicto). */
const TIPO_DE_PARTE_DEL_EQUIPO = "CF";

/**
 * Clasifica la condición: "normal" si tierra y neutro están cerrados (la
 * polaridad no cambia esto); "primer_defecto" si uno de los dos está abierto.
 * @param {{polaridad: string, tierra: string, neutro: string}} condicion - Condición de prueba.
 * @returns {"normal"|"primer_defecto"} Estado de la condición.
 * @throws {Error} Si la condición no es válida.
 */
export function clasificarCondicion(condicion) {
  validarCondicion(condicion);
  const hayUnaFalla = condicion.tierra === "abierta" || condicion.neutro === "abierto";
  return hayUnaFalla ? ESTADO_PRIMER_DEFECTO : ESTADO_NORMAL;
}

/**
 * Límites de la misma medición y condición para partes aplicadas B, BF y CF.
 * La corriente de contacto tiene el mismo límite para los tres tipos.
 * @param {string} tipoMedicion - "contacto" o "paciente".
 * @param {object} condicion - Condición de prueba.
 * @param {object} parametros - Parámetros validados por M3.
 * @returns {Readonly<{B: number, BF: number, CF: number}>} Límites en µA.
 */
export function obtenerLimitesPorTipoDeParte_uA(tipoMedicion, condicion, parametros) {
  validarTipoMedicion(tipoMedicion);
  const estado = clasificarCondicion(condicion);
  const limites = {};
  // Busca el límite de cada tipo de parte aplicada (B, BF y CF)
  for (const [tipoDeParte, grupoPaciente] of Object.entries(GRUPO_PACIENTE_POR_TIPO_DE_PARTE)) {
    const grupo = tipoMedicion === "contacto" ? "contacto" : grupoPaciente;
    limites[tipoDeParte] = parametros.limites_uA[grupo][estado];
  }
  return Object.freeze(limites);
}

/**
 * Límite de IEC 60601-1 que aplica al R12 (parte CF) para esta medición y condición.
 * @param {string} tipoMedicion - "contacto" o "paciente".
 * @param {object} condicion - Condición de prueba.
 * @param {object} parametros - Parámetros validados por M3.
 * @returns {number} Límite en µA.
 */
export function obtenerLimite_uA(tipoMedicion, condicion, parametros) {
  return obtenerLimitesPorTipoDeParte_uA(tipoMedicion, condicion, parametros)[TIPO_DE_PARTE_DEL_EQUIPO];
}

/**
 * Evalúa una medición del motor de cálculo contra el límite aplicable.
 * @param {{tipoMedicion: string, condicion: object, corriente_uA: number, incertidumbre_uA: number}} medicion - Salida de calcularMedicion (M4).
 * @param {object} parametros - Parámetros validados por M3.
 * @returns {Readonly<object>} La medición más: estadoCondicion, limite_uA,
 *   porcentajeDelLimite (%), veredicto ("Cumple"/"No cumple") y limitesPorTipoDeParte_uA.
 * @throws {Error} Si la medición no es válida.
 */
export function evaluarMedicion(medicion, parametros) {
  if (medicion === null || typeof medicion !== "object") {
    throw new Error("Falta la medición que se va a evaluar.");
  }
  if (typeof medicion.corriente_uA !== "number" || !Number.isFinite(medicion.corriente_uA) || medicion.corriente_uA < 0) {
    throw new Error(`La corriente de la medición debe ser un número mayor o igual a cero (se recibió ${medicion.corriente_uA}).`);
  }

  const limitesPorTipoDeParte_uA = obtenerLimitesPorTipoDeParte_uA(medicion.tipoMedicion, medicion.condicion, parametros);
  const limite_uA = limitesPorTipoDeParte_uA[TIPO_DE_PARTE_DEL_EQUIPO];

  return Object.freeze({
    ...medicion,
    estadoCondicion: clasificarCondicion(medicion.condicion),
    limite_uA,
    porcentajeDelLimite: (medicion.corriente_uA / limite_uA) * PORCENTAJE_POR_FRACCION,
    veredicto: medicion.corriente_uA <= limite_uA ? VEREDICTO_CUMPLE : VEREDICTO_NO_CUMPLE,
    limitesPorTipoDeParte_uA,
  });
}
