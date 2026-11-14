/**
 * ============================================================================
 * Título: Pruebas de sintaxis e importación de todos los JS
 * Descripción: Evita que un error de JavaScript llegue a la página publicada
 *   (por ejemplo, dos funciones con el mismo nombre, que deja la página sin
 *   arrancar). Revisa en tres pasos:
 *   1. Sintaxis: node --check (como módulo ES) de TODOS los .js y .mjs del
 *      proyecto (js/, tests/ y tools/).
 *   2. Importación sin navegador: importa cada módulo de js/ (núcleo y
 *      adaptadores) en Node. Así también se revisa que cada nombre importado
 *      exista en el módulo de donde se importa. Los adaptadores solo usan la
 *      pantalla (document) cuando se llaman sus funciones, no al cargarse.
 *   3. main.js no se importa porque al cargarse arranca la aplicación (y en
 *      Node no hay pantalla): se revisa que los nombres que importa existan.
 * Módulo: Calidad (pruebas)
 * Autores: Yustin Rico, David Cardona, Santiago González
 * Creado: 2026-11-14 · Modificado: 2026-11-14
 * ============================================================================
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import path from "node:path";
import { RAIZ_PROYECTO, resolverImport } from "../tools/sri.mjs";

/** Carpetas con código JavaScript del proyecto. */
const CARPETAS_CON_CODIGO = Object.freeze(["js", "tests", "tools"]);

/** Archivo que arranca la aplicación al cargarse (no se importa en Node). */
const ARCHIVO_PRINCIPAL = "js/main.js";

/**
 * Lista los .js y .mjs de una carpeta y sus subcarpetas.
 * @param {string} carpeta - Carpeta relativa a la raíz del proyecto.
 * @returns {Promise<string[]>} Rutas relativas con "/".
 */
async function listarCodigo(carpeta) {
  const entradas = await readdir(path.join(RAIZ_PROYECTO, carpeta), { withFileTypes: true, recursive: true });
  return entradas
    .filter((entrada) => entrada.isFile() && /\.m?js$/.test(entrada.name))
    .map((entrada) => path.relative(RAIZ_PROYECTO, path.join(entrada.parentPath, entrada.name)).split(path.sep).join("/"))
    .sort();
}

const archivosDeCodigo = (await Promise.all(CARPETAS_CON_CODIGO.map(listarCodigo))).flat();
const modulosDeLaPagina = archivosDeCodigo.filter((ruta) => ruta.startsWith("js/"));

test("Todos los .js y .mjs del proyecto tienen sintaxis válida (node --check)", () => {
  assert.ok(archivosDeCodigo.length > 0);
  // Un node --check por archivo (package.json tiene "type": "module": se revisan como módulos ES)
  for (const ruta of archivosDeCodigo) {
    const resultado = spawnSync(process.execPath, ["--check", path.join(RAIZ_PROYECTO, ruta)], { encoding: "utf8" });
    assert.equal(resultado.status, 0, `Error de sintaxis en ${ruta}:\n${resultado.stderr}`);
  }
});

test("Cada módulo del núcleo y de los adaptadores se importa sin navegador", async () => {
  // Importar revisa la sintaxis y que existan los nombres importados de otros módulos
  for (const ruta of modulosDeLaPagina.filter((modulo) => modulo !== ARCHIVO_PRINCIPAL)) {
    await assert.doesNotReject(import(pathToFileURL(path.join(RAIZ_PROYECTO, ruta)).href), `No se pudo importar ${ruta}`);
  }
});

test("main.js importa nombres que sí existen en sus módulos", async () => {
  const texto = await readFile(path.join(RAIZ_PROYECTO, ARCHIVO_PRINCIPAL), "utf8");
  const importaciones = [...texto.matchAll(/import\s*\{([^}]+)\}\s*from\s*"([^"]+)"/g)];
  assert.ok(importaciones.length > 0);
  // Cada import de main.js: el módulo exporta cada nombre pedido
  for (const [, nombres, especificador] of importaciones) {
    const [archivo] = especificador.split("?");
    const modulo = await import(pathToFileURL(path.join(RAIZ_PROYECTO, resolverImport(ARCHIVO_PRINCIPAL, archivo))).href);
    for (const nombre of nombres.split(",").map((parte) => parte.trim()).filter(Boolean)) {
      assert.ok(nombre in modulo, `main.js importa ${nombre} de ${archivo}, pero ese módulo no lo exporta`);
    }
  }
});
