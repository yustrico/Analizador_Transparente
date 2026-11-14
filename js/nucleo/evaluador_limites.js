/**
 * ============================================================================
 * Título: Evaluador de límites
 * Descripción: Decide qué límite de IEC 60601-1 aplica a una lectura (según
 *   si es corriente de contacto o de paciente, y si la condición es normal o
 *   primer defecto), dice si la lectura "Cumple" o "No cumple" y qué
 *   porcentaje del límite usó. También entrega los límites equivalentes para
 *   partes aplicadas B, BF y CF, para compararlos al lado de la lectura (RF07).
 *   Además da el veredicto de los pasos 2 y 3 de la prueba guiada: resistencia
 *   del conductor de protección (límite máximo) y resistencia de aislamiento
 *   (mínimo esperado de IEC 62353:2014, Tabla 2).
 * Módulo: M5 – Evaluador de límites (núcleo)
 * Autores: Yustin Rico, David Cardona, Santiago González
 * Creado: 2026-11-13 · Modificado: 2026-11-14
 * ============================================================================
 */

import { validarCondicion, validarTipoMedicion } from "./motor_calculo.js?v=efa73aed55";

/** Estados de la condición según la norma. */
export const ESTADO_NORMAL = "normal";
export const ESTADO_PRIMER_DEFECTO = "primer_defecto";

/** Textos del veredicto. */
export const VEREDICTO_CUMPLE = "Cumple";
export const VEREDICTO_NO_CUMPLE = "No cumple";

/** Factor para pasar una fracción a porcentaje. */
const PORCENTAJE_POR_FRACCION = 100;

/**
 * Mediciones cuyo límite es el mismo para partes B, BF y CF (grupo de límites
 * del JSON). La fuga a tierra es del equipo completo.
 */
const GRUPO_LIMITE_UNICO = Object.freeze({ contacto: "contacto", fuga_tierra: "fuga_tierra" });

/** Grupo de límites del JSON para cada tipo de parte aplicada, en la corriente de paciente. */
const GRUPO_PACIENTE_POR_TIPO_DE_PARTE = Object.freeze({ B: "paciente_B", BF: "paciente_BF", CF: "paciente_CF" });

/** Tipo de parte aplicada del R12 (sus límites son los que deciden el veredicto). */
const TIPO_DE_PARTE_DEL_EQUIPO = "CF";

/**
 * Valor medido de los pasos 2 y 3 escrito como texto: un número, una cota
 * ("< 0.015" o "> 100") y, opcionalmente, una nota entre paréntesis ("(OL)").
 */
const PATRON_VALOR_MEDIDO = /^([<>])?\s*(\d+(?:\.\d+)?)\s*(?:\(.*\))?$/;

/**
 * Convierte un valor medido en el intervalo donde está el valor real:
 * 94.7 → [94.7, 94.7]; "> 100 (OL)" → [100, ∞); "< 0.015" → [0, 0.015].
 * @param {number|string} valorMedido - Valor del JSON (número o texto).
 * @returns {{desde: number, hasta: number}} Intervalo del valor real.
 * @throws {Error} Si el valor no es un número no negativo ni un texto con ese formato.
 */
function intervaloDelValorMedido(valorMedido) {
  if (typeof valorMedido === "number") {
    if (!Number.isFinite(valorMedido) || valorMedido < 0) {
      throw new Error(`El valor medido debe ser un número mayor o igual a cero (se recibió ${valorMedido}).`);
    }
    return { desde: valorMedido, hasta: valorMedido };
  }
  const coincidencia = PATRON_VALOR_MEDIDO.exec(String(valorMedido).trim());
  if (coincidencia === null) {
    throw new Error(`No se entiende el valor medido "${valorMedido}": debe ser un número, "< número" o "> número".`);
  }
  const [, cota, textoNumero] = coincidencia;
  const numero = Number(textoNumero);
  if (cota === ">") {
    return { desde: numero, hasta: Number.POSITIVE_INFINITY };
  }
  if (cota === "<") {
    return { desde: 0, hasta: numero };
  }
  return { desde: numero, hasta: numero };
}

/**
 * Revisa que un límite de los pasos 2 y 3 sea un número mayor que cero.
 * @param {number} limite - Límite.
 * @throws {Error} Si no lo es.
 */
function validarLimitePaso(limite) {
  if (typeof limite !== "number" || !Number.isFinite(limite) || limite <= 0) {
    throw new Error(`El límite debe ser un número mayor que cero (se recibió ${limite}).`);
  }
}

/**
 * Veredicto del aislamiento (paso 3): cumple si la resistencia medida es al
 * menos el mínimo esperado. "> 100 (OL)" cumple cualquier mínimo de hasta 100 MΩ.
 * @param {number|string} valorMedido_Mohm - Resistencia medida (MΩ), número o texto.
 * @param {number} minimo_Mohm - Mínimo esperado (MΩ).
 * @returns {"Cumple"|"No cumple"} Veredicto.
 * @throws {Error} Si los datos no son válidos o el valor no alcanza para decidir.
 */
export function evaluarAislamiento(valorMedido_Mohm, minimo_Mohm) {
  validarLimitePaso(minimo_Mohm);
  const intervalo = intervaloDelValorMedido(valorMedido_Mohm);
  if (intervalo.desde >= minimo_Mohm) {
    return VEREDICTO_CUMPLE;
  }
  if (intervalo.hasta < minimo_Mohm) {
    return VEREDICTO_NO_CUMPLE;
  }
  throw new Error(`El valor medido "${valorMedido_Mohm}" no permite decidir si cumple el mínimo de ${minimo_Mohm} MΩ.`);
}

/**
 * Veredicto de la resistencia del conductor de protección (paso 2): cumple si
 * la resistencia medida no supera el límite. "< 0.015" cumple un límite de 0.2.
 * @param {number|string} valorMedido_ohm - Resistencia medida (Ω), número o texto.
 * @param {number} limite_ohm - Límite máximo (Ω).
 * @returns {"Cumple"|"No cumple"} Veredicto.
 * @throws {Error} Si los datos no son válidos o el valor no alcanza para decidir.
 */
export function evaluarResistenciaTierra(valorMedido_ohm, limite_ohm) {
  validarLimitePaso(limite_ohm);
  const intervalo = intervaloDelValorMedido(valorMedido_ohm);
  if (intervalo.hasta <= limite_ohm) {
    return VEREDICTO_CUMPLE;
  }
  if (intervalo.desde > limite_ohm) {
    return VEREDICTO_NO_CUMPLE;
  }
  throw new Error(`El valor medido "${valorMedido_ohm}" no permite decidir si cumple el límite de ${limite_ohm} Ω.`);
}

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
 * La corriente de contacto y la fuga a tierra tienen el mismo límite para los tres tipos.
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
    const grupo = GRUPO_LIMITE_UNICO[tipoMedicion] ?? grupoPaciente;
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
