/**
 * ============================================================================
 * Título: Pruebas del tiempo de carga de la página (ES03)
 * Descripción: Comprueba que el tiempo de carga sale de Navigation Timing
 *   (loadEventEnd − startTime, en ms enteros), que se reconoce Chrome y
 *   Edge, que una carga sin terminar dice "no disponible", y que el dato va
 *   en el resumen copiado y en el reporte (pantalla y PDF).
 * Módulo: M1 – Interfaz de usuario (pruebas; apoyo a ES03)
 * Autores: Yustin Rico, David Cardona, Santiago González
 * Creado: 2026-11-13 · Modificado: 2026-11-13
 * ============================================================================
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { nombreNavegador, resumirCarga, textoTiempoCarga, detalleCarga } from "../js/adaptadores/tiempo_carga.js";
import { armarResumen, contenidoDelReporte } from "../js/adaptadores/reporte.js";
import { validarParametros } from "../js/nucleo/modelo_equipo.js";

const parametros = validarParametros(JSON.parse(await readFile(new URL("../datos/parametros_r12.json", import.meta.url), "utf8")));

/** Textos reales de userAgent de Windows (Chrome y Edge). */
const AGENTE_CHROME = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36";
const AGENTE_EDGE = `${AGENTE_CHROME} Edg/157.0.0.0`;

/** Momento de inicio de la navegación usado en las pruebas (13/11/2026 14:30:05 local). */
const ORIGEN_MS = new Date(2026, 10, 13, 14, 30, 5).getTime();

test("Reconoce Chrome y Edge (por userAgentData o por userAgent)", () => {
  assert.equal(nombreNavegador({ brands: [{ brand: "Chromium", version: "157" }, { brand: "Microsoft Edge", version: "157" }] }, ""), "Microsoft Edge 157");
  assert.equal(nombreNavegador({ brands: [{ brand: "Google Chrome", version: "157" }] }, ""), "Google Chrome 157");
  assert.equal(nombreNavegador(undefined, AGENTE_EDGE), "Microsoft Edge 157");
  assert.equal(nombreNavegador(undefined, AGENTE_CHROME), "Google Chrome 157");
  assert.equal(nombreNavegador(undefined, "Firefox/140.0"), "Otro navegador");
});

test("El tiempo de carga es loadEventEnd − startTime en ms enteros", () => {
  const carga = resumirCarga({ startTime: 0, loadEventEnd: 412.6, type: "navigate" }, ORIGEN_MS, "Google Chrome 157");
  assert.equal(carga.tiempo_ms, 413);
  assert.equal(carga.tipo, "carga normal");
  assert.equal(carga.fecha.getTime(), ORIGEN_MS);
  assert.equal(textoTiempoCarga(carga), "Tiempo de carga de esta página: 413 ms");
  assert.match(detalleCarga(carga), /^Google Chrome 157 · .+ · carga normal$/);
});

test("Una recarga se identifica y una carga sin terminar dice «no disponible»", () => {
  assert.equal(resumirCarga({ startTime: 0, loadEventEnd: 300, type: "reload" }, ORIGEN_MS, "x").tipo, "recarga");
  const sinTerminar = resumirCarga({ startTime: 0, loadEventEnd: 0, type: "navigate" }, ORIGEN_MS, "x");
  assert.equal(sinTerminar.tiempo_ms, null);
  assert.equal(textoTiempoCarga(sinTerminar), "Tiempo de carga de esta página: no disponible");
  assert.equal(textoTiempoCarga(null), "Tiempo de carga de esta página: no disponible");
});

test("El tiempo de carga va en el resumen copiado y en el reporte (pantalla y PDF)", () => {
  const cargaPagina = resumirCarga({ startTime: 0, loadEventEnd: 412, type: "navigate" }, ORIGEN_MS, "Microsoft Edge 157");
  const datos = { nombre: "E1", registros: [], parametros, fecha: new Date(ORIGEN_MS), cargaPagina };
  const resumen = armarResumen(datos);
  assert.ok(resumen.includes("Tiempo de carga de esta página: 412 ms"));
  assert.ok(resumen.includes("Navegador y hora de la carga: Microsoft Edge 157 · "));
  const datosGenerales = new Map(contenidoDelReporte(datos).datosGenerales);
  assert.equal(datosGenerales.get("Tiempo de carga de esta página"), "412 ms");
  assert.match(datosGenerales.get("Navegador y hora de la carga"), /^Microsoft Edge 157 · /);
});
