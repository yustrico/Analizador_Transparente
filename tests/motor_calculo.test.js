/**
 * ============================================================================
 * Título: Pruebas del motor de cálculo (ES01)
 * Descripción: Comprueba que el motor de cálculo (M4) da exactamente los
 *   valores de la tabla de referencia (CLAUDE.md, sección 5) con un error
 *   relativo de máximo 1 % (especificación ES01), y que rechaza entradas
 *   inválidas con mensajes claros.
 * Módulo: M4 – Motor de cálculo (pruebas)
 * Autores: Yustin Rico, David Cardona, Santiago González
 * Creado: 2026-11-13 · Modificado: 2026-11-13
 * ============================================================================
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validarParametros } from "../js/nucleo/modelo_equipo.js";
import { calcularMedicion, validarCondicion } from "../js/nucleo/motor_calculo.js";

/** Error relativo máximo permitido por ES01 (1 %). */
const ERROR_RELATIVO_MAXIMO_PORCENTAJE = 1;

/** Factor para pasar una fracción a porcentaje. */
const PORCENTAJE_POR_FRACCION = 100;

/** Parámetros reales del R12, leídos del mismo JSON que usa la aplicación. */
const parametros = validarParametros(
  JSON.parse(readFileSync(new URL("../datos/parametros_r12.json", import.meta.url), "utf8"))
);

/** Condiciones de prueba con nombre, para que las tablas se lean fácil. */
const CONDICIONES = {
  normalPolNormal: { polaridad: "normal", tierra: "cerrada", neutro: "cerrado" },
  normalPolInvertida: { polaridad: "invertida", tierra: "cerrada", neutro: "cerrado" },
  tierraAbiertaPolNormal: { polaridad: "normal", tierra: "abierta", neutro: "cerrado" },
  tierraAbiertaPolInvertida: { polaridad: "invertida", tierra: "abierta", neutro: "cerrado" },
  neutroAbiertoPolNormal: { polaridad: "normal", tierra: "cerrada", neutro: "abierto" },
  neutroAbiertoPolInvertida: { polaridad: "invertida", tierra: "cerrada", neutro: "abierto" },
};

/**
 * Tabla de referencia de CLAUDE.md, sección 5 (corriente I e incertidumbre U, en µA).
 * Cada fila de la tabla original que dice "cualquier polaridad" se prueba con ambas.
 */
const TABLA_REFERENCIA = [
  { tipo: "contacto", nombre: "normalPolNormal", I_uA: 3.83e-5, U_uA: 1.15 },
  { tipo: "contacto", nombre: "normalPolInvertida", I_uA: 3.83e-5, U_uA: 1.15 },
  { tipo: "contacto", nombre: "tierraAbiertaPolNormal", I_uA: 14.734, U_uA: 1.32 },
  { tipo: "contacto", nombre: "tierraAbiertaPolInvertida", I_uA: 14.734, U_uA: 1.32 },
  { tipo: "contacto", nombre: "neutroAbiertoPolNormal", I_uA: 7.66e-5, U_uA: 1.15 },
  { tipo: "contacto", nombre: "neutroAbiertoPolInvertida", I_uA: 7.66e-5, U_uA: 1.15 },
  { tipo: "paciente", nombre: "normalPolNormal", I_uA: 1.267, U_uA: 1.17 },
  { tipo: "paciente", nombre: "normalPolInvertida", I_uA: 1.267, U_uA: 1.17 },
  { tipo: "paciente", nombre: "tierraAbiertaPolNormal", I_uA: 2.097, U_uA: 1.18 },
  { tipo: "paciente", nombre: "tierraAbiertaPolInvertida", I_uA: 2.097, U_uA: 1.18 },
  { tipo: "paciente", nombre: "neutroAbiertoPolNormal", I_uA: 1.267, U_uA: 1.17 },
  { tipo: "paciente", nombre: "neutroAbiertoPolInvertida", I_uA: 1.267, U_uA: 1.17 },
];

/**
 * Calcula el error relativo, en porcentaje, de un valor obtenido frente al esperado.
 * @param {number} obtenido - Valor que dio el motor (µA).
 * @param {number} esperado - Valor de referencia (µA), distinto de cero.
 * @returns {number} Error relativo en % (siempre positivo).
 */
function errorRelativoPorcentaje(obtenido, esperado) {
  return (Math.abs(obtenido - esperado) / Math.abs(esperado)) * PORCENTAJE_POR_FRACCION;
}

// ES01: una prueba por cada fila de la tabla de referencia (I y U)
for (const fila of TABLA_REFERENCIA) {
  test(`ES01 ${fila.tipo} / ${fila.nombre}: I y U con error ≤ 1 %`, () => {
    const medicion = calcularMedicion(fila.tipo, CONDICIONES[fila.nombre], parametros);
    const errorCorriente = errorRelativoPorcentaje(medicion.corriente_uA, fila.I_uA);
    const errorIncertidumbre = errorRelativoPorcentaje(medicion.incertidumbre_uA, fila.U_uA);
    assert.ok(errorCorriente <= ERROR_RELATIVO_MAXIMO_PORCENTAJE,
      `I = ${medicion.corriente_uA} µA, esperado ${fila.I_uA} µA (error ${errorCorriente.toFixed(3)} %)`);
    assert.ok(errorIncertidumbre <= ERROR_RELATIVO_MAXIMO_PORCENTAJE,
      `U = ${medicion.incertidumbre_uA} µA, esperado ${fila.U_uA} µA (error ${errorIncertidumbre.toFixed(3)} %)`);
  });
}

test("Contacto con tierra cerrada: casi toda la fuga se va por la tierra", () => {
  const medicion = calcularMedicion("contacto", CONDICIONES.normalPolNormal, parametros);
  const { fugaTotal_uA, porTierra_uA, porPersona_uA } = medicion.ramas;
  // La suma de las dos ramas debe ser la fuga total (ley de corrientes de Kirchhoff)
  assert.ok(Math.abs(porTierra_uA + porPersona_uA - fugaTotal_uA) < 1e-12);
  assert.ok(porTierra_uA > porPersona_uA);
});

test("Contacto con tierra abierta: toda la fuga pasa por la persona", () => {
  const medicion = calcularMedicion("contacto", CONDICIONES.tierraAbiertaPolNormal, parametros);
  assert.equal(medicion.ramas.porTierra_uA, 0);
  assert.equal(medicion.ramas.porPersona_uA, medicion.ramas.fugaTotal_uA);
});

test("Paciente con tierra abierta: suma la barrera de aislamiento y el término empírico", () => {
  const medicion = calcularMedicion("paciente", CONDICIONES.tierraAbiertaPolNormal, parametros);
  const { barreraAislamiento_uA, terminoEmpirico_uA } = medicion.ramas;
  assert.ok(Math.abs(barreraAislamiento_uA + terminoEmpirico_uA - medicion.corriente_uA) < 1e-12);
  assert.ok(Math.abs(terminoEmpirico_uA - 0.83) < 1e-12);
});

test("Rechaza tierra abierta y neutro abierto a la vez (doble falla)", () => {
  const dobleFalla = { polaridad: "normal", tierra: "abierta", neutro: "abierto" };
  assert.throws(() => validarCondicion(dobleFalla), /doble falla/);
  assert.throws(() => calcularMedicion("contacto", dobleFalla, parametros), /doble falla/);
});

test("Rechaza valores de condición que no existen", () => {
  assert.throws(() => validarCondicion({ polaridad: "al reves", tierra: "cerrada", neutro: "cerrado" }), /polaridad/);
  assert.throws(() => validarCondicion({ polaridad: "normal", tierra: "rota", neutro: "cerrado" }), /tierra/);
  assert.throws(() => validarCondicion({ polaridad: "normal", tierra: "cerrada" }), /neutro/);
  assert.throws(() => validarCondicion(null), /condición/);
});

test("Rechaza un tipo de medición desconocido o parámetros faltantes", () => {
  assert.throws(() => calcularMedicion("fuga_tierra", CONDICIONES.normalPolNormal, parametros), /medición/);
  assert.throws(() => calcularMedicion("contacto", CONDICIONES.normalPolNormal, undefined), /parámetros/);
});

test("El resultado no se puede modificar por accidente (objeto congelado)", () => {
  const medicion = calcularMedicion("contacto", CONDICIONES.normalPolNormal, parametros);
  assert.ok(Object.isFrozen(medicion));
  assert.ok(Object.isFrozen(medicion.ramas));
});
