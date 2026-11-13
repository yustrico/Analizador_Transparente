/**
 * ============================================================================
 * Título: Reporte final de la práctica
 * Descripción: Arma el reporte del estudiante con su nombre (opcional), la
 *   fecha, el equipo y TODAS las lecturas que hizo, más la explicación de la
 *   incertidumbre y el aviso de que es una herramienta educativa. El mismo
 *   contenido se muestra en pantalla y se descarga como archivo PDF (con el
 *   generador propio de pdf.js, sin diálogo de imprimir). Un resumen
 *   corto se copia al portapapeles para pegarlo en el correo del
 *   estudiante, que adjunta el PDF. NADA se envía a un servidor: el reporte
 *   es del estudiante.
 * Módulo: M10 – Reporte (adaptador)
 * Autores: Yustin Rico, David Cardona, Santiago González
 * Creado: 2026-11-13 · Modificado: 2026-11-13
 * ============================================================================
 */

import { VEREDICTO_CUMPLE } from "../nucleo/evaluador_limites.js";
import { filaDeRegistro, textoLectura, textoPorcentaje, NOMBRES_MEDICION, nombreCortoCondicion } from "./historial.js";
import { crearDocumentoPdf } from "./pdf.js";
import { textoTiempoCarga, detalleCarga } from "./tiempo_carga.js";

/** Explicación de la incertidumbre (se usa en Comparar y en el reporte). */
export const TEXTO_INCERTIDUMBRE = "La incertidumbre (U) indica cuánto podría diferir la lectura del analizador real. Se calcula con la exactitud que declara el fabricante del ESA620, ±(1 % de la lectura + 1 µA), según la guía GUM (JCGM 100:2008): u = exactitud/√3 y U = 2·u. Ejemplo: 14.73 ± 1.32 µA significa que el analizador real podría mostrar entre 13.41 y 16.05 µA.";

/** Aviso obligatorio del reporte. */
const TEXTO_AVISO = "Herramienta educativa, no certifica equipos. Complementa la práctica con el analizador real.";

/** Títulos del reporte (iguales en pantalla y en el PDF). */
const TITULO_REPORTE = "Reporte de práctica: prueba de seguridad eléctrica";
const SUBTITULO_REPORTE = "Analizador transparente (simulador educativo de IEC 60601-1)";
const TITULO_LECTURAS = "Lecturas de la práctica";
const TITULO_INCERTIDUMBRE = "Cómo leer la incertidumbre";

/** Pie de cada página del PDF. */
const PIE_PDF = "Analizador transparente · Herramienta educativa, no certifica equipos";

/** Inicio del nombre del archivo PDF (luego va la fecha AAAA-MM-DD). */
const PREFIJO_ARCHIVO_PDF = "reporte_seguridad_electrica_";

/** Largo máximo del nombre del estudiante (caracteres). */
export const LARGO_MAXIMO_NOMBRE = 60;

/** Texto cuando el estudiante no escribe su nombre. */
const NOMBRE_VACIO = "(sin nombre)";

/** Formato de fecha y hora del reporte. */
const IDIOMA_FECHAS = "es-CO";
const FORMATO_FECHA = Object.freeze({ dateStyle: "long", timeStyle: "short" });

/** Salto de línea del resumen (CRLF, el de Windows y de los programas de correo). */
const SALTO_RESUMEN = "\r\n";

/** Caracteres de control (saltos de línea, tabulaciones...) que no se aceptan en el nombre. */
const CARACTERES_DE_CONTROL = /[\u0000-\u001F\u007F]/g;
const ESPACIOS_REPETIDOS = /\s+/g;

/** Columna "#" (número de lectura): [título, fracción del ancho de la página en el PDF]. */
const COLUMNA_NUMERO = Object.freeze(["#", 0.04]);

/** Columnas de la tabla del reporte: [título, campo de filaDeRegistro, fracción del ancho en el PDF]. */
const COLUMNAS_REPORTE = Object.freeze([
  ["Hora", "hora", 0.14],
  ["Medición", "medicion", 0.17],
  ["Condición", "condicion", 0.19],
  ["Lectura ± incertidumbre (µA)", "lectura", 0.16],
  ["Límite (µA)", "limite", 0.08],
  ["% del límite", "porcentaje", 0.09],
  ["Veredicto", "veredicto", 0.13],
]);

/**
 * Limpia el nombre que escribe el estudiante: quita caracteres de control,
 * espacios repetidos y lo corta a 60 caracteres. Se usa siempre como texto
 * plano (textContent y encodeURIComponent), nunca como HTML.
 * @param {*} textoEscrito - Lo que hay en el campo de nombre.
 * @returns {string} Nombre limpio (puede quedar vacío).
 */
export function limpiarNombre(textoEscrito) {
  return String(textoEscrito ?? "")
    .replace(CARACTERES_DE_CONTROL, " ")
    .replace(ESPACIOS_REPETIDOS, " ")
    .trim()
    .slice(0, LARGO_MAXIMO_NOMBRE);
}

/**
 * Cuenta las lecturas, cuántas cumplen y cuál usó más % de su límite.
 * @param {object[]} registros - Registros del historial.
 * @returns {{total: number, cumplen: number, noCumplen: number, configuraciones: number, mayor: object|null}} Resumen.
 */
function resumir(registros) {
  const cumplen = registros.filter((registro) => registro.veredicto === VEREDICTO_CUMPLE).length;
  const configuraciones = new Set(registros.map((registro) => `${registro.tipoMedicion}|${nombreCortoCondicion(registro.condicion)}`)).size;
  const mayor = registros.reduce(
    (elMayor, registro) => (elMayor === null || registro.porcentajeDelLimite > elMayor.porcentajeDelLimite ? registro : elMayor),
    null,
  );
  return { total: registros.length, cumplen, noCumplen: registros.length - cumplen, configuraciones, mayor };
}

/**
 * Texto de una línea del resumen, por ejemplo "12 lecturas (12 configuraciones): 12 cumplen, 0 no cumplen."
 * @param {ReturnType<typeof resumir>} resumen - Resumen de las lecturas.
 * @returns {string} Texto.
 */
function textoResumen(resumen) {
  return `${resumen.total} lecturas (${resumen.configuraciones} configuraciones distintas): ${resumen.cumplen} cumplen, ${resumen.noCumplen} no cumplen.`;
}

/**
 * Texto de la lectura que más se acercó a su límite.
 * @param {object} registro - Registro con el mayor % del límite.
 * @returns {string} Texto.
 */
function textoMayorPorcentaje(registro) {
  return `${NOMBRES_MEDICION[registro.tipoMedicion]}, ${nombreCortoCondicion(registro.condicion)}: ${textoLectura(registro)} µA = ${textoPorcentaje(registro.porcentajeDelLimite)} del límite de ${registro.limite_uA} µA.`;
}

/**
 * Arma el contenido del reporte (datos generales y filas de la tabla). Es el
 * mismo para la pantalla y para el PDF, así los dos nunca se diferencian.
 * Incluye el tiempo de carga de la página (ES03) con el navegador y la hora.
 * @param {{nombre: string, registros: object[], parametros: object, fecha: Date, cargaPagina: object|null}} datos - Datos del reporte.
 * @returns {{datosGenerales: [string, string][], columnas: string[], filas: string[][]}} Contenido.
 */
export function contenidoDelReporte(datos) {
  const { nombre, registros, parametros, fecha, cargaPagina } = datos;
  const resumen = resumir(registros);
  const [terminoCarga, valorCarga] = textoTiempoCarga(cargaPagina).split(": ");
  const datosGenerales = [
    ["Estudiante", nombre || NOMBRE_VACIO],
    ["Fecha y hora", fecha.toLocaleString(IDIOMA_FECHAS, FORMATO_FECHA)],
    ["Equipo", parametros.equipo.nombre],
    ["Clasificación", `Clase ${parametros.equipo.clase}, parte aplicada ${parametros.equipo.parte_aplicada}`],
    ["Normas", `${parametros.equipo.norma_general} y ${parametros.equipo.norma_particular}`],
    ["Resumen", textoResumen(resumen)],
    [terminoCarga, valorCarga],
    ["Navegador y hora de la carga", detalleCarga(cargaPagina)],
  ];
  // La lectura más cerca de su límite solo existe si hay lecturas
  if (resumen.mayor !== null) {
    datosGenerales.push(["Más cerca del límite", textoMayorPorcentaje(resumen.mayor)]);
  }
  const columnas = [COLUMNA_NUMERO[0], ...COLUMNAS_REPORTE.map(([titulo]) => titulo)];
  // Una fila de texto por lectura, en orden
  const filas = registros.map((registro, indice) => {
    const textos = filaDeRegistro(registro);
    return [String(indice + 1), ...COLUMNAS_REPORTE.map(([, campo]) => textos[campo])];
  });
  return { datosGenerales, columnas, filas };
}

/**
 * Crea un elemento HTML con texto (siempre textContent) y lo agrega a un padre.
 * @param {string} etiqueta - Nombre del elemento.
 * @param {string} texto - Texto.
 * @param {HTMLElement} padre - Padre.
 * @param {string} [clase] - Clase CSS opcional.
 * @returns {HTMLElement} Elemento creado.
 */
function agregar(etiqueta, texto, padre, clase) {
  const nuevo = document.createElement(etiqueta);
  nuevo.textContent = texto;
  if (clase) {
    nuevo.className = clase;
  }
  padre.appendChild(nuevo);
  return nuevo;
}

/**
 * Crea la tabla con todas las lecturas.
 * @param {string[]} columnas - Títulos de las columnas.
 * @param {string[][]} filas - Texto de cada celda.
 * @returns {HTMLTableElement} Tabla.
 */
function crearTablaLecturas(columnas, filas) {
  const tabla = document.createElement("table");
  tabla.className = "tabla tabla--reporte";
  const filaEncabezado = tabla.createTHead().insertRow();
  // Un encabezado por columna
  for (const titulo of columnas) {
    agregar("th", titulo, filaEncabezado);
  }
  const cuerpo = tabla.createTBody();
  // Una fila por lectura, celda por celda
  for (const celdas of filas) {
    const fila = cuerpo.insertRow();
    for (const texto of celdas) {
      agregar("td", texto, fila);
    }
  }
  return tabla;
}

/**
 * Dibuja el reporte en pantalla dentro de un contenedor (borra lo que hubiera antes).
 * @param {HTMLElement} contenedor - Elemento donde va el reporte.
 * @param {{nombre: string, registros: object[], parametros: object, fecha: Date}} datos - Datos del reporte.
 */
export function generarReporte(contenedor, datos) {
  const contenido = contenidoDelReporte(datos);
  contenedor.replaceChildren();

  // Encabezado del reporte
  agregar("h2", TITULO_REPORTE, contenedor);
  agregar("p", SUBTITULO_REPORTE, contenedor, "nota");

  // Datos generales (lista término–valor)
  const listaDatos = document.createElement("dl");
  listaDatos.className = "ficha";
  for (const [termino, valor] of contenido.datosGenerales) {
    agregar("dt", termino, listaDatos);
    agregar("dd", valor, listaDatos);
  }
  contenedor.appendChild(listaDatos);

  // Tabla de lecturas
  agregar("h3", TITULO_LECTURAS, contenedor);
  contenedor.appendChild(crearTablaLecturas(contenido.columnas, contenido.filas));

  // Incertidumbre y aviso
  agregar("h3", TITULO_INCERTIDUMBRE, contenedor);
  agregar("p", TEXTO_INCERTIDUMBRE, contenedor);
  agregar("p", TEXTO_AVISO, contenedor, "reporte__aviso");
}

/**
 * Crea el archivo PDF del reporte con el mismo contenido de la pantalla:
 * encabezado, datos del estudiante y del equipo, tabla de lecturas (con
 * salto de página y encabezado repetido), incertidumbre y aviso.
 * @param {{nombre: string, registros: object[], parametros: object, fecha: Date}} datos - Datos del reporte.
 * @returns {Uint8Array} Bytes del archivo PDF.
 */
export function crearPdfReporte(datos) {
  const contenido = contenidoDelReporte(datos);
  const fracciones = [COLUMNA_NUMERO[1], ...COLUMNAS_REPORTE.map(([, , fraccion]) => fraccion)];
  const columnas = contenido.columnas.map((titulo, indice) => ({ titulo, fraccion: fracciones[indice] }));
  const documento = crearDocumentoPdf({ titulo: TITULO_REPORTE, pie: PIE_PDF, fecha: datos.fecha });

  documento.titulo(TITULO_REPORTE);
  documento.subtitulo(SUBTITULO_REPORTE);
  documento.listaDatos(contenido.datosGenerales);
  documento.seccion(TITULO_LECTURAS);
  documento.tabla(columnas, contenido.filas);
  documento.seccion(TITULO_INCERTIDUMBRE);
  documento.parrafo(TEXTO_INCERTIDUMBRE);
  documento.aviso(TEXTO_AVISO);
  return documento.generar();
}

/**
 * Nombre del archivo PDF con la fecha LOCAL del estudiante, por ejemplo
 * "reporte_seguridad_electrica_2026-11-13.pdf".
 * @param {Date} fecha - Fecha del reporte.
 * @returns {string} Nombre del archivo.
 */
export function nombreArchivoReporte(fecha) {
  const dosCifras = (valor) => String(valor).padStart(2, "0");
  return `${PREFIJO_ARCHIVO_PDF}${fecha.getFullYear()}-${dosCifras(fecha.getMonth() + 1)}-${dosCifras(fecha.getDate())}.pdf`;
}

/**
 * Arma el resumen corto del reporte que el botón «Copiar resumen» pone en el
 * portapapeles. El estudiante lo pega en su correo y adjunta el PDF. Incluye
 * el tiempo de carga de la página, el navegador y la hora (para ES03).
 * @param {{nombre: string, registros: object[], parametros: object, fecha: Date, cargaPagina: object|null}} datos - Datos del reporte.
 * @returns {string} Resumen en varias líneas.
 */
export function armarResumen(datos) {
  const { nombre, registros, parametros, fecha, cargaPagina } = datos;
  const resumen = resumir(registros);
  const lineas = [
    "Reporte de práctica – Analizador transparente",
    `Estudiante: ${nombre || NOMBRE_VACIO}`,
    `Fecha: ${fecha.toLocaleString(IDIOMA_FECHAS, FORMATO_FECHA)}`,
    `Equipo: ${parametros.equipo.nombre} (Clase ${parametros.equipo.clase}, parte aplicada CF)`,
    `Lecturas: ${textoResumen(resumen)}`,
  ];
  // La lectura más cerca de su límite resume el resultado en una línea
  if (resumen.mayor !== null) {
    lineas.push(`Más cerca del límite: ${textoMayorPorcentaje(resumen.mayor)}`);
  }
  // Datos de la carga de la página (ES03)
  lineas.push(textoTiempoCarga(cargaPagina), `Navegador y hora de la carga: ${detalleCarga(cargaPagina)}`);
  lineas.push("", "Adjunto el reporte completo en PDF (botón «Descargar reporte (PDF)» de la herramienta).", TEXTO_AVISO);
  return lineas.join(SALTO_RESUMEN);
}
