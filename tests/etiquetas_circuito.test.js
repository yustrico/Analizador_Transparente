/**
 * ============================================================================
 * Título: Pruebas de las etiquetas del dibujo del circuito
 * Descripción: Comprueba qué rama del dibujo se marca como «LECTURA» según la
 *   medición (contacto → MD, paciente CF → MD, fuga a tierra → conductor de
 *   protección), que esa etiqueta tenga el mismo valor que la lectura grande,
 *   que la otra rama quede como «no la mide esta prueba», que la nota de
 *   debajo salga solo en contacto con la tierra cerrada y que el rótulo de la
 *   MD cambie con la medición. Usa el motor real (M4): no inventa valores.
 * Módulo: M6 – Visualizador (pruebas)
 * Autores: Yustin Rico, David Cardona, Santiago González
 * Creado: 2026-11-26 · Modificado: 2026-11-26
 * ============================================================================
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validarParametros } from "../js/nucleo/modelo_equipo.js";
import { calcularMedicion } from "../js/nucleo/motor_calculo.js";
import {
  armarEtiquetasRamas, describirRotuloMD, formatearCorriente_uA, NOTA_CONTACTO_TIERRA_CERRADA,
} from "../js/adaptadores/visualizador.js";

/** Parámetros reales del R12, leídos del mismo JSON que usa la aplicación. */
const parametros = validarParametros(
  JSON.parse(readFileSync(new URL("../datos/parametros_r12.json", import.meta.url), "utf8"))
);

/** Condiciones de prueba con nombre. */
const NORMAL = { polaridad: "normal", tierra: "cerrada", neutro: "cerrado" };
const TIERRA_ABIERTA = { polaridad: "normal", tierra: "abierta", neutro: "cerrado" };
const NEUTRO_ABIERTO = { polaridad: "invertida", tierra: "cerrada", neutro: "abierto" };

/**
 * Calcula una medición con el motor y arma sus etiquetas.
 * @param {string} tipoMedicion - "contacto", "paciente" o "fuga_tierra".
 * @param {object} condicion - Condición de prueba.
 * @returns {{medicion: object, etiquetas: object, lectura: object}} La medición, sus etiquetas y la rama «LECTURA».
 */
function etiquetasDe(tipoMedicion, condicion) {
  const medicion = calcularMedicion(tipoMedicion, condicion, parametros);
  const etiquetas = armarEtiquetasRamas(medicion);
  const lecturas = etiquetas.ramas.filter((rama) => rama.esLectura);
  assert.equal(lecturas.length, 1, "Debe haber exactamente una rama «LECTURA»");
  return { medicion, etiquetas, lectura: lecturas[0] };
}

test("Contacto con tierra cerrada: LECTURA ≈ 0 en la MD y la tierra en gris con su número", () => {
  // Normal y neutro abierto: las dos con la tierra cerrada
  for (const condicion of [NORMAL, NEUTRO_ABIERTO]) {
    const { medicion, etiquetas, lectura } = etiquetasDe("contacto", condicion);
    assert.equal(lectura.rama, "persona");
    assert.equal(lectura.lineas.join(" "), "LECTURA: ≈ 0 µA (lo que mide esta prueba)");
    const otra = etiquetas.ramas.find((rama) => !rama.esLectura);
    assert.equal(otra.rama, "tierra");
    assert.equal(otra.lineas.join(" "),
      `${formatearCorriente_uA(medicion.ramas.porTierra_uA)} µA · se va por la tierra (no la mide esta prueba)`);
    assert.equal(etiquetas.notaDebajo, NOTA_CONTACTO_TIERRA_CERRADA);
  }
});

test("Contacto con neutro abierto: la rama de tierra muestra 27.14 µA", () => {
  const { etiquetas } = etiquetasDe("contacto", NEUTRO_ABIERTO);
  assert.match(etiquetas.ramas[1].lineas[0], /^27\.14 µA · se va por la tierra$/);
});

test("Contacto con tierra abierta: LECTURA con el valor de la lectura grande y sin nota", () => {
  const { medicion, etiquetas, lectura } = etiquetasDe("contacto", TIERRA_ABIERTA);
  assert.equal(lectura.rama, "persona");
  assert.deepEqual(lectura.lineas, [`LECTURA: ${formatearCorriente_uA(medicion.corriente_uA)} µA`]);
  assert.deepEqual(lectura.lineas, ["LECTURA: 14.73 µA"]);
  assert.equal(etiquetas.ramas.length, 1);
  assert.equal(etiquetas.notaDebajo, null);
});

test("Paciente CF: LECTURA en la rama de la parte aplicada (MD)", () => {
  // En las tres condiciones posibles
  for (const condicion of [NORMAL, TIERRA_ABIERTA, NEUTRO_ABIERTO]) {
    const { medicion, etiquetas, lectura } = etiquetasDe("paciente", condicion);
    assert.equal(lectura.rama, "persona");
    assert.deepEqual(lectura.lineas, [`LECTURA: ${formatearCorriente_uA(medicion.corriente_uA)} µA`]);
    assert.equal(etiquetas.ramas.length, 1);
    assert.equal(etiquetas.notaDebajo, null);
  }
});

test("Fuga a tierra: LECTURA en el conductor de protección", () => {
  const { etiquetas, lectura } = etiquetasDe("fuga_tierra", NEUTRO_ABIERTO);
  assert.equal(lectura.rama, "tierra");
  assert.deepEqual(lectura.lineas, ["LECTURA: 27.14 µA"]);
  assert.equal(etiquetas.ramas.length, 1);
  assert.equal(etiquetas.notaDebajo, null);
});

test("Rótulo de la MD y rama de la parte aplicada según la medición", () => {
  assert.deepEqual(describirRotuloMD("contacto"),
    { lineasRotuloMD: ["MD: persona que toca", "la carcasa (1 kΩ)"], parteAplicadaEnGris: true });
  assert.deepEqual(describirRotuloMD("paciente"),
    { lineasRotuloMD: ["MD: paciente con los", "electrodos (1 kΩ)"], parteAplicadaEnGris: false });
  assert.equal(describirRotuloMD("fuga_tierra").parteAplicadaEnGris, false);
});

test("Una medición desconocida da un error claro", () => {
  assert.throws(() => describirRotuloMD("aislamiento"), /no conoce la medición/);
  assert.throws(() => armarEtiquetasRamas({ tipoMedicion: "otra", condicion: NORMAL, corriente_uA: 0, ramas: {} }),
    /no conoce la medición/);
});
