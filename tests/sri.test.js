/**
 * ============================================================================
 * Título: Pruebas de la integridad de subrecursos (SRI) y de la CSP
 * Descripción: Comprueba que index.html tiene las huellas SHA-384 de los
 *   archivos ACTUALES (si alguien cambia un JS o el CSS y no corre
 *   tools/sri.mjs, el navegador bloquearía el archivo y la página no
 *   funcionaría: esta prueba lo avisa antes). También revisa que la CSP
 *   esté en index.html y en ayuda.html y que no haya scripts, estilos ni
 *   eventos en línea.
 * Módulo: Seguridad (pruebas, Fase 4)
 * Autores: Yustin Rico, David Cardona, Santiago González
 * Creado: 2026-11-13 · Modificado: 2026-11-14
 * ============================================================================
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { calcularIntegridad, calcularPaginaConIntegridad, calcularAyudaConIntegridad } from "../tools/sri.mjs";

/** CSP exigida por CLAUDE.md (sección 9). */
const CSP_ESPERADA = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'";

const { actual: pagina, esperado } = await calcularPaginaConIntegridad();
const { actual: ayuda, esperado: ayudaEsperada } = await calcularAyudaConIntegridad();

test("La huella SHA-384 coincide con un valor conocido", () => {
  // Valor de referencia de "abc" (vector de prueba estándar de SHA-384)
  assert.equal(calcularIntegridad("abc"), "sha384-ywB1P0WjXou1oD1pmsZQBycsMqsO3tFjGotgWkP/W+2AhgcroefMI1i67KE0yCWn");
});

test("index.html tiene las huellas de los archivos actuales (si falla: node tools/sri.mjs)", () => {
  assert.equal(pagina, esperado);
});

test("Todos los JS y el CSS se cargan con integrity sha384", () => {
  const etiquetas = pagina.match(/<(script|link)\b[^>]*(src|href)="(js|css)\/[^"]+"[^>]*>/g);
  assert.ok(etiquetas.length >= 2);
  // Cada etiqueta que carga un archivo propio lleva su huella
  for (const etiqueta of etiquetas) {
    assert.match(etiqueta, /integrity="sha384-[A-Za-z0-9+/]{64}"/, `Sin integrity: ${etiqueta}`);
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

test("ayuda.html carga la hoja de estilos con su huella actual, no tiene scripts y enlaza al simulador", () => {
  assert.equal(ayuda, ayudaEsperada);
  assert.match(ayuda, /<link rel="stylesheet" href="css\/estilos\.css" integrity="sha384-[A-Za-z0-9+/]{64}">/);
  assert.doesNotMatch(ayuda, /<script\b/, "La ayuda no debe tener scripts");
  assert.ok(ayuda.includes('href="index.html">Volver al simulador</a>'));
  assert.ok(pagina.includes('href="ayuda.html">Ayuda</a>'));
});
