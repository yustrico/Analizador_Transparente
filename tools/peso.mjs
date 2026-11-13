/**
 * ============================================================================
 * Título: Presupuesto de peso (ES05)
 * Descripción: Suma el tamaño de todos los archivos que el navegador
 *   descarga para usar la herramienta (index.html, la hoja de estilos, todos
 *   los módulos JS y los parámetros JSON) y lo compara con la meta ES05:
 *   ≤ 1 600 KiB. Muestra una tabla archivo por archivo y termina con error si
 *   se pasa de la meta.
 *   Uso: node tools/peso.mjs   (o npm run peso)
 * Módulo: Herramienta de verificación (Fase 4, ES05)
 * Autores: Yustin Rico, David Cardona, Santiago González
 * Creado: 2026-11-13 · Modificado: 2026-11-13
 * ============================================================================
 */

import { readdir, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

/** Carpeta raíz del proyecto. */
const RAIZ_PROYECTO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Meta ES05: peso total descargado (KiB). */
const META_ES05_KIB = 1600;
const BYTES_POR_KIB = 1024;
const DECIMALES_KIB = 1;

/** Lo que descarga la página: archivos sueltos y carpetas completas (con su extensión). */
const ARCHIVOS_SUELTOS = Object.freeze(["index.html", "css/estilos.css", "datos/parametros_r12.json"]);
const CARPETAS = Object.freeze([["js", ".js"]]);

/**
 * Lista los archivos de una carpeta (y subcarpetas) con cierta extensión.
 * @param {string} carpeta - Carpeta relativa a la raíz.
 * @param {string} extension - Extensión, por ejemplo ".js".
 * @returns {Promise<string[]>} Rutas relativas con "/".
 */
async function listarArchivos(carpeta, extension) {
  const entradas = await readdir(path.join(RAIZ_PROYECTO, carpeta), { withFileTypes: true, recursive: true });
  return entradas
    .filter((entrada) => entrada.isFile() && entrada.name.endsWith(extension))
    .map((entrada) => path.relative(RAIZ_PROYECTO, path.join(entrada.parentPath, entrada.name)).split(path.sep).join("/"))
    .sort();
}

/**
 * Pasa bytes a KiB con un decimal.
 * @param {number} bytes - Tamaño en bytes.
 * @returns {string} Tamaño en KiB.
 */
const enKiB = (bytes) => (bytes / BYTES_POR_KIB).toFixed(DECIMALES_KIB);

/**
 * Programa principal: mide, muestra la tabla y compara con la meta.
 */
async function principal() {
  const rutas = [...ARCHIVOS_SUELTOS];
  // Agrega los archivos de cada carpeta
  for (const [carpeta, extension] of CARPETAS) {
    rutas.push(...(await listarArchivos(carpeta, extension)));
  }
  const filas = [];
  // Mide cada archivo
  for (const ruta of rutas) {
    const { size } = await stat(path.join(RAIZ_PROYECTO, ruta));
    filas.push({ archivo: ruta, KiB: Number(enKiB(size)), bytes: size });
  }
  console.table(filas);
  const total = filas.reduce((suma, fila) => suma + fila.bytes, 0);
  const cumple = total / BYTES_POR_KIB <= META_ES05_KIB;
  console.log(`ES05: ${filas.length} archivos, total ${enKiB(total)} KiB (meta ≤ ${META_ES05_KIB} KiB): ${cumple ? "CUMPLE" : "NO CUMPLE"}`);
  if (!cumple) {
    process.exitCode = 1;
  }
}

await principal();
