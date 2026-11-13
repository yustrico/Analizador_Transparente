/**
 * ============================================================================
 * Título: Integridad de subrecursos (SRI)
 * Descripción: Calcula la "huella digital" SHA-384 de cada archivo JS y CSS
 *   y la escribe en index.html como atributo integrity. El navegador vuelve a
 *   calcular la huella al descargar cada archivo y, si no coincide (el
 *   archivo cambió, llegó incompleto o alguien lo alteró), NO lo ejecuta.
 *   - css/estilos.css → integrity en su <link rel="stylesheet">.
 *   - js/main.js → integrity en su <script type="module">.
 *   - Los demás módulos JS → un <link rel="modulepreload" integrity="...">
 *     por archivo, entre dos comentarios marcadores. Se hace así porque el
 *     integrity del <script> solo revisa main.js, no los módulos que importa;
 *     modulepreload hace que el navegador descargue y revise cada módulo
 *     antes de que main.js lo importe.
 *   Uso:
 *     node tools/sri.mjs              → actualiza index.html (correr después
 *                                       de cambiar cualquier JS o CSS y antes
 *                                       de cada versión)
 *     node tools/sri.mjs --comprobar  → solo revisa; falla si index.html
 *                                       está desactualizado
 * Módulo: Herramienta de seguridad (Fase 4)
 * Autores: Yustin Rico, David Cardona, Santiago González
 * Creado: 2026-11-13 · Modificado: 2026-11-13
 * ============================================================================
 */

import { createHash } from "node:crypto";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

/** Carpeta raíz del proyecto (la de arriba de tools/). */
export const RAIZ_PROYECTO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Archivos con nombre fijo dentro de la página. */
const ARCHIVO_PAGINA = "index.html";
const ARCHIVO_ESTILOS = "css/estilos.css";
const ARCHIVO_PRINCIPAL = "js/main.js";
const CARPETA_JS = "js";

/** Algoritmo de la huella (el que pide CLAUDE.md: SHA-384). */
const ALGORITMO = "sha384";

/** Comentarios que marcan dónde van los modulepreload generados. */
const MARCA_INICIO = "<!-- SRI: inicio (generado por tools/sri.mjs, no editar a mano) -->";
const MARCA_FIN = "<!-- SRI: fin -->";
const SANGRIA = "  ";

/**
 * Calcula el valor de integrity de un contenido, por ejemplo "sha384-AbC...".
 * @param {Buffer|Uint8Array|string} contenido - Bytes exactos del archivo.
 * @returns {string} Valor para el atributo integrity.
 */
export function calcularIntegridad(contenido) {
  return `${ALGORITMO}-${createHash(ALGORITMO).update(contenido).digest("base64")}`;
}

/**
 * Lista todos los .js de una carpeta y sus subcarpetas, en orden alfabético.
 * @param {string} raiz - Carpeta del proyecto.
 * @param {string} carpeta - Carpeta relativa a revisar.
 * @returns {Promise<string[]>} Rutas relativas con "/" (como en el HTML).
 */
async function listarJs(raiz, carpeta) {
  const entradas = await readdir(path.join(raiz, carpeta), { withFileTypes: true, recursive: true });
  return entradas
    .filter((entrada) => entrada.isFile() && entrada.name.endsWith(".js"))
    .map((entrada) => path.relative(raiz, path.join(entrada.parentPath, entrada.name)).split(path.sep).join("/"))
    .sort();
}

/**
 * Pone (o reemplaza) el atributo integrity en la etiqueta que carga un archivo.
 * @param {string} html - Página.
 * @param {string} atributo - "src" o "href".
 * @param {string} ruta - Ruta del archivo tal como aparece en el HTML.
 * @param {string} integridad - Valor de integrity.
 * @returns {string} Página actualizada.
 */
function ponerIntegridad(html, atributo, ruta, integridad) {
  const patron = new RegExp(`<(script|link)\\b([^>]*?)\\s${atributo}="${ruta.replaceAll(".", "\\.")}"([^>]*?)>`);
  const coincidencia = html.match(patron);
  if (coincidencia === null) {
    throw new Error(`No se encontró en index.html la etiqueta que carga ${ruta}.`);
  }
  const [etiquetaCompleta, nombre, antes, despues] = coincidencia;
  const sinIntegridad = (texto) => texto.replace(/\s+integrity="[^"]*"/, "");
  const nueva = `<${nombre}${sinIntegridad(antes)} ${atributo}="${ruta}"${sinIntegridad(despues)} integrity="${integridad}">`;
  return html.replace(etiquetaCompleta, nueva);
}

/**
 * Calcula cómo debe quedar index.html con las huellas de los archivos actuales.
 * @param {string} [raiz=RAIZ_PROYECTO] - Carpeta del proyecto.
 * @returns {Promise<{actual: string, esperado: string}>} Página actual y página con las huellas correctas.
 */
export async function calcularPaginaConIntegridad(raiz = RAIZ_PROYECTO) {
  const actual = await readFile(path.join(raiz, ARCHIVO_PAGINA), "utf8");
  const huella = async (ruta) => calcularIntegridad(await readFile(path.join(raiz, ruta)));

  let esperado = ponerIntegridad(actual, "href", ARCHIVO_ESTILOS, await huella(ARCHIVO_ESTILOS));
  esperado = ponerIntegridad(esperado, "src", ARCHIVO_PRINCIPAL, await huella(ARCHIVO_PRINCIPAL));

  // Un modulepreload con su huella por cada módulo que importa main.js
  const modulos = (await listarJs(raiz, CARPETA_JS)).filter((ruta) => ruta !== ARCHIVO_PRINCIPAL);
  const lineas = [];
  for (const ruta of modulos) {
    lineas.push(`${SANGRIA}<link rel="modulepreload" href="${ruta}" integrity="${await huella(ruta)}">`);
  }
  const inicio = esperado.indexOf(MARCA_INICIO);
  const fin = esperado.indexOf(MARCA_FIN);
  if (inicio === -1 || fin === -1 || fin < inicio) {
    throw new Error(`index.html debe tener los comentarios "${MARCA_INICIO}" y "${MARCA_FIN}".`);
  }
  esperado = `${esperado.slice(0, inicio + MARCA_INICIO.length)}\n${lineas.join("\n")}\n${SANGRIA}${esperado.slice(fin)}`;
  return { actual, esperado };
}

/**
 * Programa principal: actualiza index.html o, con --comprobar, solo revisa.
 */
async function principal() {
  const soloComprobar = process.argv.includes("--comprobar");
  const { actual, esperado } = await calcularPaginaConIntegridad();
  if (actual === esperado) {
    console.log("SRI: index.html ya tiene las huellas correctas.");
    return;
  }
  if (soloComprobar) {
    console.error("SRI: index.html está DESACTUALIZADO. Corre: node tools/sri.mjs");
    process.exitCode = 1;
    return;
  }
  await writeFile(path.join(RAIZ_PROYECTO, ARCHIVO_PAGINA), esperado, "utf8");
  console.log("SRI: huellas SHA-384 actualizadas en index.html.");
}

// Solo corre el programa si se llama directamente (no cuando lo importa una prueba)
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await principal();
}
