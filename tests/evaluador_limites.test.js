/**
 * ============================================================================
 * Título: Pruebas del evaluador de límites
 * Descripción: Comprueba que M5 escoge el límite correcto de IEC 60601-1 según
 *   la medición y la condición (normal o primer defecto), que da el veredicto
 *   correcto, el % del límite usado y los límites equivalentes de partes B,
 *   BF y CF (RF07).
 * Módulo: M5 – Evaluador de límites (pruebas)
 * Autores: Yustin Rico, David Cardona, Santiago González
 * Creado: 2026-11-13 · Modificado: 2026-11-13
 * ============================================================================
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validarParametros } from "../js/nucleo/modelo_equipo.js";
import { calcularMedicion } from "../js/nucleo/motor_calculo.js";
import {
  clasificarCondicion, obtenerLimite_uA, obtenerLimitesPorTipoDeParte_uA, evaluarMedicion,
} from "../js/nucleo/evaluador_limites.js";

/** Parámetros reales del R12. */
const parametros = validarParametros(
  JSON.parse(readFileSync(new URL("../datos/parametros_r12.json", import.meta.url), "utf8"))
);

const NORMAL = { polaridad: "normal", tierra: "cerrada", neutro: "cerrado" };
const INVERTIDA = { polaridad: "invertida", tierra: "cerrada", neutro: "cerrado" };
const TIERRA_ABIERTA = { polaridad: "normal", tierra: "abierta", neutro: "cerrado" };
const NEUTRO_ABIERTO = { polaridad: "invertida", tierra: "cerrada", neutro: "abierto" };

test("La polaridad invertida sola sigue siendo condición normal", () => {
  assert.equal(clasificarCondicion(NORMAL), "normal");
  assert.equal(clasificarCondicion(INVERTIDA), "normal");
});

test("Tierra abierta o neutro abierto es primer defecto", () => {
  assert.equal(clasificarCondicion(TIERRA_ABIERTA), "primer_defecto");
  assert.equal(clasificarCondicion(NEUTRO_ABIERTO), "primer_defecto");
});

test("Límites de la tabla de referencia (CLAUDE.md sección 5)", () => {
  assert.equal(obtenerLimite_uA("contacto", NORMAL, parametros), 100);
  assert.equal(obtenerLimite_uA("contacto", TIERRA_ABIERTA, parametros), 500);
  assert.equal(obtenerLimite_uA("contacto", NEUTRO_ABIERTO, parametros), 500);
  assert.equal(obtenerLimite_uA("paciente", NORMAL, parametros), 10);
  assert.equal(obtenerLimite_uA("paciente", TIERRA_ABIERTA, parametros), 50);
  assert.equal(obtenerLimite_uA("paciente", NEUTRO_ABIERTO, parametros), 50);
});

test("Límites equivalentes B, BF y CF para la corriente de paciente (RF07)", () => {
  assert.deepEqual({ ...obtenerLimitesPorTipoDeParte_uA("paciente", NORMAL, parametros) }, { B: 100, BF: 100, CF: 10 });
  assert.deepEqual({ ...obtenerLimitesPorTipoDeParte_uA("paciente", TIERRA_ABIERTA, parametros) }, { B: 500, BF: 500, CF: 50 });
});

test("La corriente de contacto tiene el mismo límite para B, BF y CF", () => {
  assert.deepEqual({ ...obtenerLimitesPorTipoDeParte_uA("contacto", NORMAL, parametros) }, { B: 100, BF: 100, CF: 100 });
  assert.deepEqual({ ...obtenerLimitesPorTipoDeParte_uA("contacto", TIERRA_ABIERTA, parametros) }, { B: 500, BF: 500, CF: 500 });
});

test("Todas las configuraciones del R12 cumplen (tabla de referencia)", () => {
  // Recorre las 2 mediciones × 6 condiciones válidas
  for (const tipo of ["contacto", "paciente"]) {
    for (const condicion of [NORMAL, INVERTIDA, TIERRA_ABIERTA, NEUTRO_ABIERTO]) {
      const resultado = evaluarMedicion(calcularMedicion(tipo, condicion, parametros), parametros);
      assert.equal(resultado.veredicto, "Cumple");
    }
  }
});

test("Paciente CF normal: 1.267 µA es ≈ 12.7 % del límite de 10 µA", () => {
  const resultado = evaluarMedicion(calcularMedicion("paciente", NORMAL, parametros), parametros);
  assert.equal(resultado.limite_uA, 10);
  assert.ok(Math.abs(resultado.porcentajeDelLimite - 12.67) < 0.01);
  assert.equal(resultado.estadoCondicion, "normal");
});

test("Una corriente mayor que el límite da 'No cumple'; igual al límite da 'Cumple'", () => {
  const medicionBase = calcularMedicion("paciente", NORMAL, parametros);
  const porEncima = { ...medicionBase, corriente_uA: 10.01 };
  const justoEnElLimite = { ...medicionBase, corriente_uA: 10 };
  assert.equal(evaluarMedicion(porEncima, parametros).veredicto, "No cumple");
  assert.equal(evaluarMedicion(justoEnElLimite, parametros).veredicto, "Cumple");
});

test("El resultado conserva I y U de la medición y queda congelado", () => {
  const medicion = calcularMedicion("contacto", TIERRA_ABIERTA, parametros);
  const resultado = evaluarMedicion(medicion, parametros);
  assert.equal(resultado.corriente_uA, medicion.corriente_uA);
  assert.equal(resultado.incertidumbre_uA, medicion.incertidumbre_uA);
  assert.ok(Object.isFrozen(resultado));
});

test("Rechaza una medición sin corriente válida", () => {
  const medicionBase = calcularMedicion("contacto", NORMAL, parametros);
  assert.throws(() => evaluarMedicion({ ...medicionBase, corriente_uA: -1 }, parametros), /corriente/);
  assert.throws(() => evaluarMedicion({ ...medicionBase, corriente_uA: Number.NaN }, parametros), /corriente/);
  assert.throws(() => evaluarMedicion(null, parametros), /medición/);
});
