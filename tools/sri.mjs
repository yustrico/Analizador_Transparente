/**
 * ============================================================================
 * Título: Integridad de subrecursos (SRI) y versión de cada archivo
 * Descripción: Calcula la "huella digital" SHA-384 de cada archivo JS y CSS
 *   y la escribe en las páginas como atributo integrity. El navegador vuelve
 *   a calcular la huella al descargar cada archivo y, si no coincide (el
 *   archivo cambió, llegó incompleto o alguien lo alteró), NO lo ejecuta.
 *   - css/estilos.css → integrity en su <link rel="stylesheet">.
 *   - js/main.js → integrity en su <script type="module">.
 *   - Los demás módulos JS → un <link rel="modulepreload" integrity="...">
 *     por archivo, entre dos comentarios marcadores. Se hace así porque el
 *     integrity del <script> solo revisa main.js, no los módulos que importa;
 *     modulepreload hace que el navegador descargue y revise cada módulo
 *     antes de que main.js lo importe.
 *   - ayuda.html (manual en la web, sin scripts) → integrity en su
 *     <link rel="stylesheet"> de css/estilos.css.
 *   VERSIÓN EN LA URL: cada URL lleva "?v=" y los primeros caracteres de la
 *   huella del archivo (por ejemplo css/estilos.css?v=1a2b3c4d5e). Si un
 *   archivo cambia, cambia su URL, y el navegador no puede usar una copia
 *   vieja guardada en caché (que el SRI bloquearía y dejaría la página sin
 *   estilos ni scripts mientras GitHub Pages termina de publicar).
 *   Los import entre módulos también llevan la versión ("./historial.js?v=…")
 *   para que pidan EXACTAMENTE la misma URL que el modulepreload (así el
 *   módulo se descarga una sola vez y con su integrity). Como la versión de
 *   un archivo depende de las versiones de lo que importa, se calcula de
 *   abajo hacia arriba: primero los módulos que no importan nada, después
 *   los que los importan y al final main.js. La ruta del JSON de datos en
 *   main.js también lleva la versión del JSON.
 *   Uso:
 *     node tools/sri.mjs              → actualiza los import de los JS,
 *                                       index.html y ayuda.html (correr
 *                                       después de cambiar cualquier JS, el
 *                                       CSS o el JSON y antes de cada versión)
 *     node tools/sri.mjs --comprobar  → solo revisa; falla si algo está
 *                                       desactualizado
 * Módulo: Herramienta de seguridad (Fase 4)
 * Autores: Yustin Rico, David Cardona, Santiago González
 * Creado: 2026-11-13 · Modificado: 2026-11-14
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
const ARCHIVO_AYUDA = "ayuda.html";
const ARCHIVO_ESTILOS = "css/estilos.css";
const ARCHIVO_PRINCIPAL = "js/main.js";
const CARPETA_JS = "js";

/** Algoritmo de la huella (el que pide CLAUDE.md: SHA-384). */
const ALGORITMO = "sha384";

/** Cuántos caracteres hexadecimales de la huella van en "?v=". */
const LARGO_VERSION = 10;

/** Import relativo de un módulo, con o sin versión: from "./x.js" o from "../x.js?v=…". */
const PATRON_IMPORT = /(\bfrom\s*|\bimport\s*)"(\.{1,2}\/[^"?]+\.js)(?:\?v=[0-9a-f]*)?"/g;

/** Constante con la ruta del JSON de datos (relativa a la página), con o sin versión: = "datos/x.json". */
const PATRON_DATOS = /(=\s*)"(datos\/[^"?]+\.json)(?:\?v=[0-9a-f]*)?"/g;

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
 * Calcula la versión corta de un contenido (primeros caracteres de su huella en hexadecimal).
 * @param {Buffer|Uint8Array|string} contenido - Bytes exactos del archivo.
 * @returns {string} Versión, por ejemplo "1a2b3c4d5e".
 */
export function calcularVersion(contenido) {
  return createHash(ALGORITMO).update(contenido).digest("hex").slice(0, LARGO_VERSION);
}

/**
 * Lista todos los .js de una carpeta y sus subcarpetas, en orden alfabético.
 * @param {string} raiz - Carpeta del proyecto.
 * @param {string} carpeta - Carpeta relativa a revisar.
 * @returns {Promise<string[]>} Rutas relativas con "/" (como en el HTML).
 */
export async function listarJs(raiz, carpeta) {
  const entradas = await readdir(path.join(raiz, carpeta), { withFileTypes: true, recursive: true });
  return entradas
    .filter((entrada) => entrada.isFile() && entrada.name.endsWith(".js"))
    .map((entrada) => path.relative(raiz, path.join(entrada.parentPath, entrada.name)).split(path.sep).join("/"))
    .sort();
}

/**
 * Convierte un import relativo en la ruta del archivo dentro del proyecto.
 * @param {string} rutaImportador - Archivo que importa, por ejemplo "js/main.js".
 * @param {string} especificador - Lo que va entre comillas, por ejemplo "./nucleo/motor_calculo.js".
 * @returns {string} Ruta del proyecto, por ejemplo "js/nucleo/motor_calculo.js".
 */
export function resolverImport(rutaImportador, especificador) {
  return path.posix.normalize(path.posix.join(path.posix.dirname(rutaImportador), especificador));
}

/**
 * Lista los archivos que importa un módulo (rutas del proyecto).
 * @param {string} texto - Código del módulo.
 * @param {string} ruta - Ruta del módulo.
 * @returns {string[]} Rutas importadas.
 */
function importsDe(texto, ruta) {
  return [...texto.matchAll(PATRON_IMPORT)].map(([, , especificador]) => resolverImport(ruta, especificador));
}

/**
 * Calcula cómo deben quedar los JS con la versión en cada import (y en la
 * ruta del JSON), y la versión e integrity de cada archivo. Recorre los
 * módulos de abajo hacia arriba (primero lo importado) y avisa si hay un
 * import a un archivo que no existe o un ciclo de imports.
 * @param {string} [raiz=RAIZ_PROYECTO] - Carpeta del proyecto.
 * @returns {Promise<{archivos: {ruta: string, actual: string, esperado: string}[], versiones: Map<string, string>, integridades: Map<string, string>}>}
 */
export async function calcularArchivosVersionados(raiz = RAIZ_PROYECTO) {
  const rutas = await listarJs(raiz, CARPETA_JS);
  const actuales = new Map();
  // Lee todos los módulos una vez
  for (const ruta of rutas) {
    actuales.set(ruta, await readFile(path.join(raiz, ruta), "utf8"));
  }
  // Versión de cada JSON que se nombra en algún módulo
  const versionesDatos = new Map();
  for (const texto of actuales.values()) {
    for (const [, , rutaDatos] of texto.matchAll(PATRON_DATOS)) {
      versionesDatos.set(rutaDatos, calcularVersion(await readFile(path.join(raiz, rutaDatos))));
    }
  }

  const esperados = new Map();
  const versiones = new Map();
  const enCamino = new Set();
  /**
   * Calcula el contenido final de un módulo después de calcular el de sus imports.
   * @param {string} ruta - Módulo.
   * @param {string} importador - Quién lo importa (para el mensaje de error).
   */
  const resolver = (ruta, importador) => {
    if (esperados.has(ruta)) {
      return;
    }
    if (!actuales.has(ruta)) {
      throw new Error(`${importador} importa ${ruta}, que no existe.`);
    }
    if (enCamino.has(ruta)) {
      throw new Error(`Hay un ciclo de imports que pasa por ${ruta}.`);
    }
    enCamino.add(ruta);
    const texto = actuales.get(ruta);
    // Primero, los módulos que este importa
    for (const importado of importsDe(texto, ruta)) {
      resolver(importado, ruta);
    }
    const final = texto
      .replace(PATRON_IMPORT, (_, prefijo, especificador) =>
        `${prefijo}"${especificador}?v=${versiones.get(resolverImport(ruta, especificador))}"`)
      .replace(PATRON_DATOS, (_, asignacion, rutaDatos) => `${asignacion}"${rutaDatos}?v=${versionesDatos.get(rutaDatos)}"`);
    esperados.set(ruta, final);
    versiones.set(ruta, calcularVersion(final));
    enCamino.delete(ruta);
  };
  // Cada módulo (los que ya se calcularon por un import se saltan)
  for (const ruta of rutas) {
    resolver(ruta, ruta);
  }

  const estilos = await readFile(path.join(raiz, ARCHIVO_ESTILOS));
  versiones.set(ARCHIVO_ESTILOS, calcularVersion(estilos));
  const integridades = new Map([[ARCHIVO_ESTILOS, calcularIntegridad(estilos)]]);
  // Integrity de cada módulo con su contenido final
  for (const [ruta, final] of esperados) {
    integridades.set(ruta, calcularIntegridad(final));
  }
  const archivos = rutas.map((ruta) => ({ ruta, actual: actuales.get(ruta), esperado: esperados.get(ruta) }));
  return { archivos, versiones, integridades };
}

/**
 * Pone (o reemplaza) la versión y el atributo integrity en la etiqueta que carga un archivo.
 * @param {string} html - Página.
 * @param {string} atributo - "src" o "href".
 * @param {string} ruta - Ruta del archivo tal como aparece en el HTML (sin "?v=").
 * @param {string} version - Versión para "?v=".
 * @param {string} integridad - Valor de integrity.
 * @returns {string} Página actualizada.
 */
function ponerIntegridad(html, atributo, ruta, version, integridad) {
  const patron = new RegExp(`<(script|link)\\b([^>]*?)\\s${atributo}="${ruta.replaceAll(".", "\\.")}(?:\\?v=[0-9a-f]*)?"([^>]*?)>`);
  const coincidencia = html.match(patron);
  if (coincidencia === null) {
    throw new Error(`No se encontró en la página la etiqueta que carga ${ruta}.`);
  }
  const [etiquetaCompleta, nombre, antes, despues] = coincidencia;
  const sinIntegridad = (texto) => texto.replace(/\s+integrity="[^"]*"/, "");
  const nueva = `<${nombre}${sinIntegridad(antes)} ${atributo}="${ruta}?v=${version}"${sinIntegridad(despues)} integrity="${integridad}">`;
  return html.replace(etiquetaCompleta, nueva);
}

/**
 * Calcula cómo debe quedar index.html con las versiones y huellas de los archivos.
 * @param {string} [raiz=RAIZ_PROYECTO] - Carpeta del proyecto.
 * @param {Awaited<ReturnType<typeof calcularArchivosVersionados>>} [calculo] - Cálculo ya hecho (opcional).
 * @returns {Promise<{actual: string, esperado: string}>} Página actual y página correcta.
 */
export async function calcularPaginaConIntegridad(raiz = RAIZ_PROYECTO, calculo = undefined) {
  const { archivos, versiones, integridades } = calculo ?? await calcularArchivosVersionados(raiz);
  const actual = await readFile(path.join(raiz, ARCHIVO_PAGINA), "utf8");
  const etiqueta = (html, atributo, ruta) => ponerIntegridad(html, atributo, ruta, versiones.get(ruta), integridades.get(ruta));

  let esperado = etiqueta(actual, "href", ARCHIVO_ESTILOS);
  esperado = etiqueta(esperado, "src", ARCHIVO_PRINCIPAL);

  // Un modulepreload con su versión y su huella por cada módulo que importa main.js
  const lineas = archivos
    .map(({ ruta }) => ruta)
    .filter((ruta) => ruta !== ARCHIVO_PRINCIPAL)
    .map((ruta) => `${SANGRIA}<link rel="modulepreload" href="${ruta}?v=${versiones.get(ruta)}" integrity="${integridades.get(ruta)}">`);
  const inicio = esperado.indexOf(MARCA_INICIO);
  const fin = esperado.indexOf(MARCA_FIN);
  if (inicio === -1 || fin === -1 || fin < inicio) {
    throw new Error(`index.html debe tener los comentarios "${MARCA_INICIO}" y "${MARCA_FIN}".`);
  }
  esperado = `${esperado.slice(0, inicio + MARCA_INICIO.length)}\n${lineas.join("\n")}\n${SANGRIA}${esperado.slice(fin)}`;
  return { actual, esperado };
}

/**
 * Calcula cómo debe quedar ayuda.html (solo carga la hoja de estilos).
 * @param {string} [raiz=RAIZ_PROYECTO] - Carpeta del proyecto.
 * @returns {Promise<{actual: string, esperado: string}>} Página actual y página con la versión y la huella correctas.
 */
export async function calcularAyudaConIntegridad(raiz = RAIZ_PROYECTO) {
  const actual = await readFile(path.join(raiz, ARCHIVO_AYUDA), "utf8");
  const estilos = await readFile(path.join(raiz, ARCHIVO_ESTILOS));
  return { actual, esperado: ponerIntegridad(actual, "href", ARCHIVO_ESTILOS, calcularVersion(estilos), calcularIntegridad(estilos)) };
}

/**
 * Programa principal: actualiza los JS, index.html y ayuda.html o, con --comprobar, solo revisa.
 */
async function principal() {
  const soloComprobar = process.argv.includes("--comprobar");
  const calculo = await calcularArchivosVersionados();
  const pendientes = [
    ...calculo.archivos.map(({ ruta, actual, esperado }) => [ruta, { actual, esperado }]),
    [ARCHIVO_PAGINA, await calcularPaginaConIntegridad(RAIZ_PROYECTO, calculo)],
    [ARCHIVO_AYUDA, await calcularAyudaConIntegridad()],
  ];
  let cambios = 0;
  // Cada archivo se revisa (y, si hace falta, se actualiza) por separado
  for (const [archivo, { actual, esperado }] of pendientes) {
    if (actual === esperado) {
      continue;
    }
    cambios += 1;
    if (soloComprobar) {
      console.error(`SRI: ${archivo} está DESACTUALIZADO. Corre: node tools/sri.mjs`);
      process.exitCode = 1;
    } else {
      await writeFile(path.join(RAIZ_PROYECTO, archivo), esperado, "utf8");
      console.log(`SRI: versiones y huellas actualizadas en ${archivo}.`);
    }
  }
  if (cambios === 0) {
    console.log("SRI: todos los archivos ya tienen las versiones y huellas correctas.");
  }
}

// Solo corre el programa si se llama directamente (no cuando lo importa una prueba)
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await principal();
}
