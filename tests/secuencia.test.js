/**
 * ============================================================================
 * Título: Pruebas de la secuencia de la prueba
 * Descripción: Comprueba que M2 tiene los 4 pasos en el orden fijo, que cada
 *   paso tiene su propósito de seguridad y que no deja saltar pasos.
 * Módulo: M2 – Secuencia de la prueba (pruebas)
 * Autores: Yustin Rico, David Cardona, Santiago González
 * Creado: 2026-11-13 · Modificado: 2026-11-13
 * ============================================================================
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PASOS_PRUEBA, crearEstadoInicial, obtenerPasoActual, completarPaso, pasoDisponible, secuenciaTerminada,
} from "../js/nucleo/secuencia.js";

test("Los 4 pasos están en el orden fijo de la prueba", () => {
  const identificadores = PASOS_PRUEBA.map((paso) => paso.id);
  assert.deepEqual(identificadores, ["inspeccion_visual", "resistencia_tierra", "aislamiento", "corrientes_fuga"]);
});

test("Cada paso tiene título y propósito de seguridad", () => {
  // Revisa los textos de cada paso
  for (const paso of PASOS_PRUEBA) {
    assert.ok(paso.titulo.length > 0, `El paso ${paso.id} no tiene título`);
    assert.ok(paso.proposito.length > 0, `El paso ${paso.id} no tiene propósito`);
  }
});

test("Los pasos 1 a 3 apuntan a su dato medido y el 4 no (lleva al Analizador)", () => {
  assert.deepEqual(PASOS_PRUEBA.map((paso) => paso.claveDatoMedido),
    ["inspeccion_visual", "resistencia_tierra_ohm", "aislamiento_Mohm", null]);
});

test("La prueba empieza en la inspección visual", () => {
  assert.equal(obtenerPasoActual(crearEstadoInicial()).id, "inspeccion_visual");
});

test("Avanza en orden al completar cada paso", () => {
  let estado = crearEstadoInicial();
  // Completa los pasos uno por uno y revisa cuál sigue
  for (let indice = 0; indice < PASOS_PRUEBA.length; indice++) {
    assert.equal(obtenerPasoActual(estado).id, PASOS_PRUEBA[indice].id);
    estado = completarPaso(estado, PASOS_PRUEBA[indice].id);
  }
  assert.equal(obtenerPasoActual(estado), null);
  assert.ok(secuenciaTerminada(estado));
});

test("No deja saltar pasos", () => {
  const estado = crearEstadoInicial();
  assert.throws(() => completarPaso(estado, "aislamiento"), /primero/);
  assert.equal(pasoDisponible(estado, "inspeccion_visual"), true);
  assert.equal(pasoDisponible(estado, "resistencia_tierra"), false);
  assert.equal(pasoDisponible(estado, "corrientes_fuga"), false);
});

test("Completar un paso no modifica el estado anterior (función pura)", () => {
  const estadoInicial = crearEstadoInicial();
  const estadoSiguiente = completarPaso(estadoInicial, "inspeccion_visual");
  assert.equal(obtenerPasoActual(estadoInicial).id, "inspeccion_visual");
  assert.equal(obtenerPasoActual(estadoSiguiente).id, "resistencia_tierra");
  assert.equal(pasoDisponible(estadoSiguiente, "inspeccion_visual"), true);
});

test("No deja completar pasos cuando la prueba ya terminó", () => {
  let estado = crearEstadoInicial();
  // Completa toda la secuencia
  for (const paso of PASOS_PRUEBA) {
    estado = completarPaso(estado, paso.id);
  }
  assert.throws(() => completarPaso(estado, "corrientes_fuga"), /terminó/);
});

test("Rechaza pasos que no existen y estados dañados", () => {
  assert.throws(() => completarPaso(crearEstadoInicial(), "paso_inventado"), /no existe/);
  assert.throws(() => pasoDisponible(crearEstadoInicial(), "paso_inventado"), /no existe/);
  assert.throws(() => obtenerPasoActual({ pasosCompletados: 7 }), /estado/);
  assert.throws(() => obtenerPasoActual(null), /estado/);
});
