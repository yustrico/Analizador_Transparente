/**
 * ============================================================================
 * Título: Validación contra el analizador real (ES02)
 * Descripción: Compara cada corriente que calcula el simulador con la media
 *   medida por el Fluke ESA620 sobre el R12 del laboratorio (n = 3) usando el
 *   error normalizado E_n. Si E_n ≤ 1, el modelo y la medición coinciden dentro
 *   de la incertidumbre de la medición (criterio de ISO/IEC 17043 e ISO 13528).
 * Módulo: M4 – Motor de cálculo (validación)
 * Autores: Yustin Rico, David Cardona, Santiago González
 * Creado: 2026-11-13 · Modificado: 2026-11-13
 * ============================================================================
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validarParametros } from "../js/nucleo/modelo_equipo.js";
import { calcularMedicion } from "../js/nucleo/motor_calculo.js";

/** Número de repeticiones por condición en el laboratorio. */
const REPETICIONES_POR_CONDICION = 3;

/** Valor máximo de E_n para decir que modelo y medición concuerdan. */
const EN_MAXIMO = 1;

/** Factor para pasar un porcentaje a fracción. */
const FRACCION_POR_PORCENTAJE = 1 / 100;

/** Divisor de la distribución rectangular (incertidumbre tipo B, GUM). */
const DIVISOR_RECTANGULAR = Math.sqrt(3);

/** Parámetros reales del R12. */
const parametros = validarParametros(
  JSON.parse(readFileSync(new URL("../datos/parametros_r12.json", import.meta.url), "utf8"))
);

/** Datos medidos con el ESA620 (media ± desviación estándar, n = 3), CLAUDE.md sección 5. */
const DATOS_MEDIDOS = [
  { tipo: "contacto", polaridad: "normal", tierra: "cerrada", neutro: "cerrado", media_uA: 0.12, desviacion_uA: 0.03 },
  { tipo: "contacto", polaridad: "invertida", tierra: "cerrada", neutro: "cerrado", media_uA: 0.12, desviacion_uA: 0.03 },
  { tipo: "contacto", polaridad: "normal", tierra: "abierta", neutro: "cerrado", media_uA: 14.47, desviacion_uA: 0.45 },
  { tipo: "contacto", polaridad: "invertida", tierra: "abierta", neutro: "cerrado", media_uA: 14.97, desviacion_uA: 0.06 },
  { tipo: "contacto", polaridad: "normal", tierra: "cerrada", neutro: "abierto", media_uA: 0.10, desviacion_uA: 0.00 },
  { tipo: "contacto", polaridad: "invertida", tierra: "cerrada", neutro: "abierto", media_uA: 0.10, desviacion_uA: 0.00 },
  { tipo: "paciente", polaridad: "normal", tierra: "cerrada", neutro: "cerrado", media_uA: 1.27, desviacion_uA: 0.21 },
  { tipo: "paciente", polaridad: "invertida", tierra: "cerrada", neutro: "cerrado", media_uA: 1.20, desviacion_uA: 0.10 },
  { tipo: "paciente", polaridad: "normal", tierra: "abierta", neutro: "cerrado", media_uA: 2.10, desviacion_uA: 0.10 },
  { tipo: "paciente", polaridad: "invertida", tierra: "abierta", neutro: "cerrado", media_uA: 2.13, desviacion_uA: 0.15 },
  { tipo: "paciente", polaridad: "normal", tierra: "cerrada", neutro: "abierto", media_uA: 1.20, desviacion_uA: 0.10 },
  { tipo: "paciente", polaridad: "invertida", tierra: "cerrada", neutro: "abierto", media_uA: 1.07, desviacion_uA: 0.12 },
];

/**
 * Incertidumbre expandida de la medición del laboratorio.
 * U_med = k · √( (s/√n)² + ((0.01·media + 1 µA)/√3)² )
 * @param {number} media_uA - Media de las lecturas (µA).
 * @param {number} desviacion_uA - Desviación estándar de las lecturas (µA).
 * @returns {number} U_med en µA.
 */
function incertidumbreMedicion_uA(media_uA, desviacion_uA) {
  const exactitud = parametros.exactitud_analizador;
  const incertidumbreTipoA_uA = desviacion_uA / Math.sqrt(REPETICIONES_POR_CONDICION);
  const incertidumbreTipoB_uA =
    (exactitud.porcentaje_lectura * FRACCION_POR_PORCENTAJE * media_uA + exactitud.piso_uA) / DIVISOR_RECTANGULAR;
  return exactitud.k * Math.hypot(incertidumbreTipoA_uA, incertidumbreTipoB_uA);
}

// ES02: una prueba por cada configuración medida en el laboratorio
for (const dato of DATOS_MEDIDOS) {
  const nombre = `${dato.tipo} | pol. ${dato.polaridad} | tierra ${dato.tierra} | neutro ${dato.neutro}`;
  test(`ES02 ${nombre}: E_n ≤ 1`, () => {
    const condicion = { polaridad: dato.polaridad, tierra: dato.tierra, neutro: dato.neutro };
    const corrienteModelo_uA = calcularMedicion(dato.tipo, condicion, parametros).corriente_uA;
    const errorNormalizado =
      Math.abs(corrienteModelo_uA - dato.media_uA) / incertidumbreMedicion_uA(dato.media_uA, dato.desviacion_uA);
    assert.ok(errorNormalizado <= EN_MAXIMO,
      `Modelo ${corrienteModelo_uA.toFixed(3)} µA vs. medido ${dato.media_uA} µA: E_n = ${errorNormalizado.toFixed(3)}`);
  });
}
