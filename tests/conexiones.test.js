/**
 * ============================================================================
 * Título: Pruebas de las conexiones físicas del laboratorio
 * Descripción: Comprueba los datos puros de las conexiones ESA620–R12 que
 *   dibuja el visualizador: que existan las 5 pruebas, que el R12 esté
 *   apagado en el aislamiento, que los 10 latiguillos vayan cada uno a su
 *   borne, que el cable de prueba vaya del jack 2 WIRE al borne
 *   equipotencial y que una prueba desconocida dé un error claro.
 * Módulo: M6 – Visualizador (pruebas)
 * Autores: Yustin Rico, David Cardona, Santiago González
 * Creado: 2026-11-25 · Modificado: 2026-11-25
 * ============================================================================
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  obtenerConexiones, describirConexiones, JACK_2_WIRE, BORNE_EQUIPOTENCIAL, R12_APAGADO, R12_ENCENDIDO,
} from "../js/adaptadores/visualizador.js";

/** Las 5 pruebas que tienen dibujo de conexiones. */
const CLAVES = Object.freeze(["contacto", "paciente", "fuga_tierra", "paso_tierra", "paso_aislamiento"]);

/** Borne correcto de cada latiguillo (CLAUDE.md / docs/11). */
const BORNE_ESPERADO = Object.freeze({
  R: "RA/R", L: "LA/L", F: "LL/F", N: "RL/N",
  C1: "V1/C1", C2: "V2/C2", C3: "V3/C3", C4: "V4/C4", C5: "V5/C5", C6: "V6/C6",
});

/** Color IEC esperado de cada latiguillo. */
const COLOR_ESPERADO = Object.freeze({
  R: "rojo", L: "amarillo", F: "verde", N: "negro",
  C1: "rojo", C2: "amarillo", C3: "verde", C4: "cafe", C5: "negro", C6: "morado",
});

/**
 * Devuelve los latiguillos de una prueba como mapa nombre → cable.
 * @param {string} clave - Prueba.
 * @returns {Map<string, object>} Latiguillos por nombre ("R", "C1"...).
 */
function latiguillosDe(clave) {
  const cables = obtenerConexiones(clave).cables.filter((cable) => cable.tipo === "latiguillo");
  return new Map(cables.map((cable) => [cable.desde.replace("Latiguillo ", ""), cable]));
}

test("Existen las 5 pruebas con cables, estado del R12, teclas y pasos", () => {
  // Cada clave debe traer los cuatro campos pedidos
  for (const clave of CLAVES) {
    const conexiones = obtenerConexiones(clave);
    assert.ok(conexiones.cables.length > 0, `${clave}: sin cables`);
    assert.ok([R12_ENCENDIDO, R12_APAGADO].includes(conexiones.estadoR12), `${clave}: estado del R12 inválido`);
    assert.ok(conexiones.teclas.length > 0, `${clave}: sin teclas`);
    assert.ok(conexiones.pasos.length > 0, `${clave}: sin pasos`);
  }
});

test("Todas las pruebas: el R12 va al tomacorriente de prueba del ESA620, no a la pared", () => {
  // La base común aparece en las 5 pruebas
  for (const clave of CLAVES) {
    const poderR12 = obtenerConexiones(clave).cables.find((cable) => cable.desde === "Cable de poder del R12");
    assert.equal(poderR12.hasta, "Tomacorriente de prueba del ESA620", clave);
  }
});

test("Aislamiento: el R12 está apagado; en las corrientes de fuga, encendido", () => {
  assert.equal(obtenerConexiones("paso_aislamiento").estadoR12, R12_APAGADO);
  // Las tres mediciones de corriente se hacen con el equipo funcionando
  for (const clave of ["contacto", "paciente", "fuga_tierra"]) {
    assert.equal(obtenerConexiones(clave).estadoR12, R12_ENCENDIDO, clave);
  }
});

test("Paciente, fuga a tierra y aislamiento: los 10 latiguillos van a su borne con su color IEC", () => {
  // Se revisa latiguillo por latiguillo en cada prueba
  for (const clave of ["paciente", "fuga_tierra", "paso_aislamiento"]) {
    const latiguillos = latiguillosDe(clave);
    assert.equal(latiguillos.size, 10, `${clave}: no son 10 latiguillos`);
    for (const [nombre, borne] of Object.entries(BORNE_ESPERADO)) {
      assert.equal(latiguillos.get(nombre)?.hasta, borne, `${clave}: ${nombre} no va a ${borne}`);
      assert.equal(latiguillos.get(nombre)?.color, COLOR_ESPERADO[nombre], `${clave}: color de ${nombre}`);
    }
  }
});

test("Contacto y resistencia de tierra: cable desde 2 WIRE V/Ω/A al borne equipotencial", () => {
  // En las dos pruebas debe existir ese cable
  for (const clave of ["contacto", "paso_tierra"]) {
    const cable = obtenerConexiones(clave).cables.find((candidato) => candidato.tipo === "prueba");
    assert.ok(cable, `${clave}: falta el cable de prueba`);
    assert.equal(cable.desde, JACK_2_WIRE);
    assert.equal(cable.hasta, BORNE_EQUIPOTENCIAL);
  }
});

test("Fuga a tierra y paciente: no llevan cable de prueba", () => {
  // Solo latiguillos y cables de poder
  for (const clave of ["paciente", "fuga_tierra"]) {
    assert.equal(obtenerConexiones(clave).cables.some((cable) => cable.tipo === "prueba"), false, clave);
  }
});

test("Resistencia de tierra: primero se pone en cero en Ø/NULL y la nota del manual es visible", () => {
  const conexiones = obtenerConexiones("paso_tierra");
  assert.ok(conexiones.cables.some((cable) => cable.tipo === "cero" && cable.hasta === "Ø/NULL"));
  assert.deepEqual([...conexiones.teclas], ["Ω", "Zero Leads", "TEST"]);
  assert.match(conexiones.nota, /manual del ESA620/);
});

test("Aislamiento: lleva la advertencia de no tocar latiguillos ni bornes", () => {
  assert.match(obtenerConexiones("paso_aislamiento").advertencia, /No tocar latiguillos ni bornes/);
});

test("La descripción accesible menciona el borne equipotencial en la corriente de contacto", () => {
  const descripcion = describirConexiones(obtenerConexiones("contacto"));
  assert.match(descripcion, /Borne equipotencial del R12/);
  assert.match(descripcion, /10 latiguillos/);
});

test("Una prueba desconocida lanza un error claro en español", () => {
  // Claves inválidas: texto desconocido, vacío, propiedad heredada y un número
  for (const clave of ["red_parte_aplicada", "", "toString", 42]) {
    assert.throws(() => obtenerConexiones(clave), /No hay conexiones de laboratorio para la prueba/);
  }
});

test("Los datos no se pueden modificar desde afuera", () => {
  const conexiones = obtenerConexiones("contacto");
  assert.ok(Object.isFrozen(conexiones));
  assert.ok(Object.isFrozen(conexiones.cables));
  assert.ok(Object.isFrozen(conexiones.cables[0]));
});
