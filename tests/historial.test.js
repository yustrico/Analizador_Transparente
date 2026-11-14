/**
 * ============================================================================
 * Título: Pruebas del resumen de avance (Comparar)
 * Descripción: Comprueba la función pura que cuenta cuántas de las 16
 *   configuraciones se han medido, cuáles faltan y cuáles se repitieron, y
 *   el texto de los límites (µA o mA).
 * Módulo: M8 – Historial (pruebas)
 * Autores: Yustin Rico, David Cardona, Santiago González
 * Creado: 2026-11-14 · Modificado: 2026-11-14
 * ============================================================================
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { listarConfiguraciones } from "../js/nucleo/motor_calculo.js";
import { resumirAvance, textoConfiguracion, textoLimite } from "../js/adaptadores/historial.js";

/** Las 16 configuraciones que simula la herramienta (M4). */
const CONFIGURACIONES = listarConfiguraciones();

/**
 * Crea un registro mínimo para una configuración (solo lo que usa el resumen).
 * @param {number} indice - Posición de la configuración en la lista.
 * @returns {{tipoMedicion: string, condicion: object}} Registro.
 */
function registroDe(indice) {
  return { tipoMedicion: CONFIGURACIONES[indice].tipoMedicion, condicion: { ...CONFIGURACIONES[indice].condicion } };
}

test("Sin lecturas: 0 de 16 y faltan todas", () => {
  const avance = resumirAvance([], CONFIGURACIONES);
  assert.equal(avance.medidas, 0);
  assert.equal(avance.total, 16);
  assert.equal(avance.faltantes.length, 16);
  assert.deepEqual(avance.repetidas, []);
});

test("Cuenta las medidas, lista las que faltan en orden y las repetidas con sus veces", () => {
  const registros = [registroDe(0), registroDe(2), registroDe(0), registroDe(15), registroDe(0), registroDe(2)];
  const avance = resumirAvance(registros, CONFIGURACIONES);
  assert.equal(avance.medidas, 3);
  assert.equal(avance.faltantes.length, 13);
  assert.equal(avance.faltantes[0], CONFIGURACIONES[1]);
  assert.deepEqual(avance.repetidas.map((repetida) => [CONFIGURACIONES.indexOf(repetida.configuracion), repetida.veces]), [[0, 3], [2, 2]]);
});

test("Con las 16 medidas no falta ninguna", () => {
  const registros = CONFIGURACIONES.map((_, indice) => registroDe(indice));
  const avance = resumirAvance(registros, CONFIGURACIONES);
  assert.equal(avance.medidas, 16);
  assert.deepEqual(avance.faltantes, []);
  assert.deepEqual(avance.repetidas, []);
});

test("El texto de una configuración dice medición, condición y polaridad", () => {
  assert.equal(textoConfiguracion(CONFIGURACIONES[3]), "Corriente de contacto, Tierra abierta (pol. invertida)");
  assert.equal(textoConfiguracion(CONFIGURACIONES[15]), "Corriente de fuga a tierra, Neutro abierto (pol. invertida)");
});

test("Los límites desde 1 mA se escriben en mA", () => {
  assert.equal(textoLimite(10), "10 µA");
  assert.equal(textoLimite(500), "500 µA");
  assert.equal(textoLimite(5000), "5 mA");
  assert.equal(textoLimite(10000), "10 mA");
});
