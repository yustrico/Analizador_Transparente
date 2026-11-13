/**
 * ============================================================================
 * Título: Pruebas de la integridad de subrecursos (SRI) y de la CSP
 * Descripción: Comprueba que index.html tiene las huellas SHA-384 de los
 *   archivos ACTUALES (si alguien cambia un JS o el CSS y no corre
 *   tools/sri.mjs, el navegador bloquearía el archivo y la página no
 *   funcionaría: esta prueba lo avisa antes). También revisa que la CSP
 *   esté en la página y que no haya scripts, estilos ni eventos en línea.
 * Módulo: Seguridad (pruebas, Fase 4)
 * Autores: Yustin Rico, David Cardona, Santiago González
 * Creado: 2026-11-13 · Modificado: 2026-11-13
 * ============================================================================
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { calcularIntegridad, calcularPaginaConIntegridad } from "../tools/sri.mjs";

/** CSP exigida por CLAUDE.md (sección 9). */
const CSP_ESPERADA = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'";

const { actual: pagina, esperado } = await calcularPaginaConIntegridad();

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

test("La página tiene la CSP exigida y nada en línea (scripts, estilos ni eventos)", () => {
  assert.ok(pagina.includes(`<meta http-equiv="Content-Security-Policy" content="${CSP_ESPERADA}">`));
  assert.doesNotMatch(pagina, /<script(?![^>]*\ssrc=)[^>]*>/, "Hay un <script> en línea");
  assert.doesNotMatch(pagina, /<style\b|\sstyle="/, "Hay estilos en línea");
  assert.doesNotMatch(pagina, /\son[a-z]+="/, "Hay un atributo de evento (onclick...)");
});
