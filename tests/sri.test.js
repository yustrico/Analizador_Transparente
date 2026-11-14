/**
 * ============================================================================
 * Título: Pruebas de la integridad de subrecursos (SRI), las versiones y la CSP
 * Descripción: Comprueba que index.html y ayuda.html tienen las huellas
 *   SHA-384 y las versiones ("?v=") de los archivos ACTUALES, y que los
 *   import entre módulos piden la misma URL versionada que el modulepreload
 *   (si alguien cambia un JS o el CSS y no corre tools/sri.mjs, el navegador
 *   bloquearía el archivo y la página no funcionaría: esta prueba lo avisa
 *   antes). También revisa que la CSP esté en las dos páginas y que no haya
 *   scripts, estilos ni eventos en línea.
 * Módulo: Seguridad (pruebas, Fase 4)
 * Autores: Yustin Rico, David Cardona, Santiago González
 * Creado: 2026-11-13 · Modificado: 2026-11-14
 * ============================================================================
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calcularIntegridad, calcularArchivosVersionados, calcularPaginaConIntegridad, calcularAyudaConIntegridad, resolverImport,
} from "../tools/sri.mjs";

/** CSP exigida por CLAUDE.md (sección 9). */
const CSP_ESPERADA = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'";

/** Huella sha384 en base64 (64 caracteres). */
const PATRON_HUELLA = "sha384-[A-Za-z0-9+/]{64}";

/** Versión en la URL: "?v=" y 10 caracteres hexadecimales. */
const PATRON_VERSION = "\\?v=[0-9a-f]{10}";

const calculo = await calcularArchivosVersionados();
const { actual: pagina, esperado } = await calcularPaginaConIntegridad(undefined, calculo);
const { actual: ayuda, esperado: ayudaEsperada } = await calcularAyudaConIntegridad();

test("La huella SHA-384 coincide con un valor conocido", () => {
  // Valor de referencia de "abc" (vector de prueba estándar de SHA-384)
  assert.equal(calcularIntegridad("abc"), "sha384-ywB1P0WjXou1oD1pmsZQBycsMqsO3tFjGotgWkP/W+2AhgcroefMI1i67KE0yCWn");
});

test("index.html tiene las versiones y huellas de los archivos actuales (si falla: npm run sri)", () => {
  assert.equal(pagina, esperado);
});

test("Los import entre módulos llevan la versión actual (si falla: npm run sri)", () => {
  // Cada JS ya tiene en sus import la versión que calcula tools/sri.mjs
  for (const { ruta, actual, esperado: esperadoJs } of calculo.archivos) {
    assert.equal(actual, esperadoJs, `${ruta} tiene versiones viejas en sus import`);
  }
});

test("Cada import pide exactamente la URL que precarga index.html (con su integrity)", () => {
  const precargadas = new Set([...pagina.matchAll(/<link rel="modulepreload" href="([^"]+)"/g)].map(([, url]) => url));
  // Cada import relativo de cada módulo
  for (const { ruta, actual } of calculo.archivos) {
    for (const [, especificador] of actual.matchAll(/\bfrom\s*"(\.{1,2}\/[^"]+)"/g)) {
      assert.match(especificador, new RegExp(`\\.js${PATRON_VERSION}$`), `${ruta}: import sin versión ${especificador}`);
      const [archivo, version] = especificador.split("?");
      const url = `${resolverImport(ruta, archivo)}?${version}`;
      assert.ok(precargadas.has(url), `${ruta} importa ${url}, que no está en un modulepreload de index.html`);
    }
  }
});

test("Todos los JS y el CSS se cargan con versión e integrity sha384", () => {
  const etiquetas = [pagina, ayuda].flatMap((html) => html.match(/<(script|link)\b[^>]*(src|href)="(js|css)\/[^"]+"[^>]*>/g));
  assert.ok(etiquetas.length >= 3);
  // Cada etiqueta que carga un archivo propio lleva su versión y su huella
  for (const etiqueta of etiquetas) {
    assert.match(etiqueta, new RegExp(`(src|href)="[^"]+\\.(js|css)${PATRON_VERSION}"`), `Sin versión: ${etiqueta}`);
    assert.match(etiqueta, new RegExp(`integrity="${PATRON_HUELLA}"`), `Sin integrity: ${etiqueta}`);
  }
});

test("Las dos páginas tienen la CSP exigida y nada en línea (scripts, estilos ni eventos)", () => {
  // index.html y ayuda.html cumplen las mismas reglas
  for (const html of [pagina, ayuda]) {
    assert.ok(html.includes(`<meta http-equiv="Content-Security-Policy" content="${CSP_ESPERADA}">`));
    assert.doesNotMatch(html, /<script(?![^>]*\ssrc=)[^>]*>/, "Hay un <script> en línea");
    assert.doesNotMatch(html, /<style\b|\sstyle="/, "Hay estilos en línea");
    assert.doesNotMatch(html, /\son[a-z]+="/, "Hay un atributo de evento (onclick...)");
  }
});

test("ayuda.html carga la hoja de estilos con su versión y huella actuales, no tiene scripts y enlaza al simulador", () => {
  assert.equal(ayuda, ayudaEsperada);
  assert.match(ayuda, new RegExp(`<link rel="stylesheet" href="css/estilos\\.css${PATRON_VERSION}" integrity="${PATRON_HUELLA}">`));
  assert.doesNotMatch(ayuda, /<script\b/, "La ayuda no debe tener scripts");
  assert.ok(ayuda.includes('href="index.html">Volver al simulador</a>'));
  assert.ok(pagina.includes('href="ayuda.html">Ayuda</a>'));
});
