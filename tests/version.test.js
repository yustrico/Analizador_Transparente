/**
 * ============================================================================
 * Título: Prueba de la versión publicada
 * Descripción: Comprueba que la versión que muestran la ayuda (ayuda.html),
 *   el manual (docs/manual_usuario.md) y el README es la misma de
 *   package.json. Si se cambia la versión en package.json y se olvida
 *   alguno de esos textos, npm test falla y dice cuál.
 * Módulo: Documentación (pruebas)
 * Autores: Yustin Rico, David Cardona, Santiago González
 * Creado: 2026-11-14 · Modificado: 2026-11-14
 * ============================================================================
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

/** Archivos que muestran la versión con el texto «Versión X.Y.Z». */
const ARCHIVOS_CON_VERSION = Object.freeze(["ayuda.html", "docs/manual_usuario.md", "README.md"]);

/** «Versión» seguida de un número MAYOR.MENOR.PARCHE. */
const PATRON_VERSION = /Versión (\d+\.\d+\.\d+)/g;

/**
 * Lee un archivo del proyecto como texto.
 * @param {string} ruta - Ruta relativa a la raíz del proyecto.
 * @returns {Promise<string>} Contenido.
 */
const leer = (ruta) => readFile(new URL(`../${ruta}`, import.meta.url), "utf8");

const { version: versionPaquete } = JSON.parse(await leer("package.json"));

test("La ayuda, el manual y el README muestran la versión de package.json", async () => {
  // Cada archivo debe mostrar la versión al menos una vez, y solo esa
  for (const ruta of ARCHIVOS_CON_VERSION) {
    const versiones = [...(await leer(ruta)).matchAll(PATRON_VERSION)].map(([, version]) => version);
    assert.ok(versiones.length > 0, `${ruta} no muestra la versión («Versión X.Y.Z»)`);
    for (const version of versiones) {
      assert.equal(version, versionPaquete, `${ruta} dice «Versión ${version}» y package.json dice ${versionPaquete}`);
    }
  }
});
