/**
 * ============================================================================
 * Título: Pruebas del modelo del equipo
 * Descripción: Comprueba que M3 acepta el archivo real de parámetros del R12 y
 *   que rechaza, con un mensaje claro, archivos dañados (campos faltantes,
 *   tipos equivocados o valores fuera de rango).
 * Módulo: M3 – Modelo del equipo (pruebas)
 * Autores: Yustin Rico, David Cardona, Santiago González
 * Creado: 2026-11-13 · Modificado: 2026-11-13
 * ============================================================================
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validarParametros, cargarParametros } from "../js/nucleo/modelo_equipo.js";

/** Texto del JSON real, tal como está en el repositorio. */
const TEXTO_JSON = readFileSync(new URL("../datos/parametros_r12.json", import.meta.url), "utf8");

/**
 * Devuelve una copia nueva y modificable de los datos reales, para dañarla en cada prueba.
 * @returns {object} Copia de parametros_r12.json.
 */
function copiaDatosReales() {
  return JSON.parse(TEXTO_JSON);
}

test("Acepta el archivo real de parámetros del R12", () => {
  const parametros = validarParametros(copiaDatosReales());
  assert.equal(parametros.red.V_rms, 120);
  assert.equal(parametros.capacitancias_F.C_AP, 28.0e-12);
  assert.equal(parametros.limites_uA.paciente_CF.normal, 10);
});

test("Los parámetros validados quedan congelados (no se pueden alterar)", () => {
  const parametros = validarParametros(copiaDatosReales());
  assert.ok(Object.isFrozen(parametros));
  assert.ok(Object.isFrozen(parametros.capacitancias_F));
  assert.ok(Object.isFrozen(parametros.limites_uA.contacto));
});

test("Rechaza un archivo que no es un objeto", () => {
  assert.throws(() => validarParametros(null), /objeto/);
  assert.throws(() => validarParametros("texto"), /objeto/);
});

test("Rechaza un campo numérico faltante", () => {
  const datos = copiaDatosReales();
  delete datos.capacitancias_F.C_L;
  assert.throws(() => validarParametros(datos), /capacitancias_F\.C_L/);
});

test("Rechaza un número escrito como texto", () => {
  const datos = copiaDatosReales();
  datos.red.V_rms = "120";
  assert.throws(() => validarParametros(datos), /red\.V_rms/);
});

test("Rechaza una capacitancia negativa o cero", () => {
  const datos = copiaDatosReales();
  datos.capacitancias_F.C_AP = -28e-12;
  assert.throws(() => validarParametros(datos), /capacitancias_F\.C_AP/);
  datos.capacitancias_F.C_AP = 0;
  assert.throws(() => validarParametros(datos), /capacitancias_F\.C_AP/);
});

test("Rechaza un porcentaje de exactitud mayor que 100", () => {
  const datos = copiaDatosReales();
  datos.exactitud_analizador.porcentaje_lectura = 150;
  assert.throws(() => validarParametros(datos), /porcentaje_lectura/);
});

test("Rechaza un límite de primer defecto menor que el de condición normal", () => {
  const datos = copiaDatosReales();
  datos.limites_uA.paciente_CF.primer_defecto = 5;
  assert.throws(() => validarParametros(datos), /paciente_CF/);
});

test("Rechaza si faltan los límites de partes B o BF", () => {
  const datos = copiaDatosReales();
  delete datos.limites_uA.paciente_BF;
  assert.throws(() => validarParametros(datos), /paciente_BF/);
});

test("Rechaza si faltan los datos de los pasos previos", () => {
  const datos = copiaDatosReales();
  delete datos.pasos_previos_medidos.aislamiento_Mohm;
  assert.throws(() => validarParametros(datos), /aislamiento_Mohm/);
});

test("cargarParametros lee el JSON con la función de lectura que se le pase", async () => {
  // Simula fetch: responde con el JSON real, sin red
  const lecturaFalsa = async () => ({ ok: true, status: 200, json: async () => copiaDatosReales() });
  const parametros = await cargarParametros("datos/parametros_r12.json", lecturaFalsa);
  assert.equal(parametros.R_MD_ohm, 1000);
});

test("cargarParametros avisa si el archivo no se pudo descargar", async () => {
  const lecturaFallida = async () => ({ ok: false, status: 404, json: async () => ({}) });
  await assert.rejects(() => cargarParametros("no_existe.json", lecturaFallida), /404/);
});
