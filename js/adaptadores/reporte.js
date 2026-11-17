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
 * Creado: 2026-11-13 · Modificado: 2026-11-17
 * ============================================================================
 */

import { VEREDICTO_CUMPLE } from "../nucleo/evaluador_limites.js?v=9c30cc64cc";
import { filaDeRegistro, textoLectura, textoPorcentaje, textoLimite, NOMBRES_MEDICION, nombreCortoCondicion } from "./historial.js?v=37beb88db5";
import { crearDocumentoPdf } from "./pdf.js?v=628f37170c";
import { textoTiempoCarga, detalleCarga } from "./tiempo_carga.js?v=1c9699f3b9";

/** Nota debajo de la tabla de lecturas (columna "Qué tan cerca del límite"). */
export const TEXTO_CERCA_DEL_LIMITE = "Una corriente pequeña puede estar más cerca de su límite que una grande: compara la corriente de paciente CF (límite 10 µA) con la de contacto (límite 100 µA).";

/** Espacio que no deja cortar el renglón (U+00A0): une un número con su unidad, como «1.15 µA». */
const ESPACIO_SIN_CORTE = "\u00A0";

/**
 * Une cada número con su unidad (% o µA), y el ± con el paréntesis que le
 * sigue, para que un renglón nunca termine en «1» y el siguiente empiece con «%».
 * @param {string} texto - Texto con espacios normales.
 * @returns {string} Texto con espacios sin corte donde hacen falta.
 */
function unirNumerosYUnidades(texto) {
  return texto.replace(/(\d) (?=%|µA)/g, `$1${ESPACIO_SIN_CORTE}`).replaceAll("± (", `±${ESPACIO_SIN_CORTE}(`);
}

/**
 * Explicación de la incertidumbre (se usa en Comparar, en el reporte en
 * pantalla y en el PDF). Cada paso es [qué se hace, la operación], para que
 * la operación quede en su propio renglón. El ejemplo es la lectura de la
 * corriente de contacto con tierra abierta (14.73 µA).
 */
export const EXPLICACION_INCERTIDUMBRE = Object.freeze({
  introduccion: unirNumerosYUnidades("Ningún analizador es perfecto. El fabricante del Fluke ESA620 indica que su lectura puede equivocarse hasta ± (1 % de la lectura + 1 µA). Por eso cada resultado se muestra como lectura ± incertidumbre."),
  ejemplo: unirNumerosYUnidades("Ejemplo con una lectura de 14.73 µA:"),
  pasos: Object.freeze([
    ["Error máximo del analizador:", "1 % × 14.73 µA + 1 µA = 1.15 µA"],
    ["Se divide entre √3, porque el error puede caer en cualquier punto de ese rango:", "1.15 µA ÷ √3 = 0.66 µA"],
    ["Se multiplica por 2, como recomienda la guía de metrología GUM:", "2 × 0.66 µA = 1.32 µA"],
  ].map((paso) => Object.freeze(paso.map(unirNumerosYUnidades)))),
  resultado: unirNumerosYUnidades("Resultado: 14.73 ± 1.32 µA. El analizador real podría mostrar entre 13.41 µA y 16.05 µA."),
});

/** Aviso obligatorio del reporte. */
const TEXTO_AVISO = "Herramienta educativa, no certifica equipos. Complementa la práctica con el analizador real.";

/** Títulos del reporte (iguales en pantalla y en el PDF). */
const TITULO_REPORTE = "Reporte de práctica: pruebas de seguridad eléctrica";
const SUBTITULO_REPORTE = "Analizador transparente (simulador educativo de IEC 60601-1)";
const TITULO_LECTURAS = "Lecturas de la práctica";
const TITULO_INCERTIDUMBRE = "¿Cómo se lee la incertidumbre?";

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
  ["Hora", "hora", 0.13],
  ["Medición", "medicion", 0.17],
  ["Condición", "condicion", 0.18],
  ["Lectura ± incertidumbre", "lectura", 0.16],
  ["Límite", "limite", 0.08],
  ["Qué tan cerca del límite", "porcentaje", 0.11],
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

/** Separa los renglones de un valor que va en varias líneas (por ejemplo, las normas). */
const SALTO_DE_RENGLON = "\n";

/**
 * Las normas del equipo, en el orden de la ficha: general, particular y de pruebas periódicas.
 * @param {object} equipo - Datos del equipo (parametros.equipo).
 * @returns {string[]} Normas.
 */
export function normasDelEquipo(equipo) {
  return [equipo.norma_general, equipo.norma_particular, equipo.norma_pruebas_periodicas];
}

/**
 * Convierte varios renglones en nodos para la pantalla: texto, <br>, texto…
 * (siempre como texto plano, nunca como HTML).
 * @param {string[]} renglones - Renglones.
 * @returns {(string|HTMLElement)[]} Nodos para replaceChildren.
 */
export function conSaltosDeLinea(renglones) {
  return renglones.flatMap((renglon, indice) => (indice === 0 ? [renglon] : [document.createElement("br"), renglon]));
}

/**
 * Texto de la lectura que más se acercó a su límite.
 * @param {object} registro - Registro con el mayor % del límite.
 * @returns {string} Texto.
 */
function textoMayorPorcentaje(registro) {
  return `${NOMBRES_MEDICION[registro.tipoMedicion]}, ${nombreCortoCondicion(registro.condicion)}: ${textoLectura(registro)} µA = ${textoPorcentaje(registro.porcentajeDelLimite)} del límite de ${textoLimite(registro.limite_uA)}.`;
}

/**
 * Arma el contenido del reporte (datos generales y filas de la tabla). Es el
 * mismo para la pantalla y para el PDF, así los dos nunca se diferencian.
 * El tiempo de carga de la página (ES03) no va aquí: solo va en «Copiar resumen».
 * @param {{nombre: string, registros: object[], parametros: object, fecha: Date, cargaPagina: object|null}} datos - Datos del reporte.
 * @returns {{datosGenerales: [string, string][], columnas: string[], filas: string[][]}} Contenido.
 */
export function contenidoDelReporte(datos) {
  const { nombre, registros, parametros, fecha } = datos;
  const resumen = resumir(registros);
  const datosGenerales = [
    ["Estudiante", nombre || NOMBRE_VACIO],
    ["Fecha y hora", fecha.toLocaleString(IDIOMA_FECHAS, FORMATO_FECHA)],
    ["Equipo", parametros.equipo.nombre],
    ["Clasificación", `Clase ${parametros.equipo.clase}, parte aplicada ${parametros.equipo.parte_aplicada}`],
    ["Normas", normasDelEquipo(parametros.equipo).join(SALTO_DE_RENGLON)],
    ["Resumen", textoResumen(resumen)],
  ];
  const columnas = [COLUMNA_NUMERO[0], ...COLUMNAS_REPORTE.map(([titulo]) => titulo)];
  // Una fila de texto por lectura, en orden
  const filas = registros.map((registro, indice) => {
    const textos = filaDeRegistro(registro);
    return [String(indice + 1), ...COLUMNAS_REPORTE.map(([, campo]) => textos[campo])];
  });
  return { datosGenerales, columnas, filas };
}

/**
 * Arma en pantalla la explicación de la incertidumbre: párrafo, ejemplo,
 * lista numerada (cada operación en su propio renglón) y resultado.
 * @param {HTMLElement} padre - Elemento donde se agrega.
 */
export function mostrarExplicacionIncertidumbre(padre) {
  agregar("p", EXPLICACION_INCERTIDUMBRE.introduccion, padre);
  agregar("p", EXPLICACION_INCERTIDUMBRE.ejemplo, padre);
  const lista = agregar("ol", "", padre, "pasos-incertidumbre");
  // Un paso por renglón de la lista: primero qué se hace y debajo la operación
  for (const [queSeHace, operacion] of EXPLICACION_INCERTIDUMBRE.pasos) {
    const paso = agregar("li", queSeHace, lista);
    agregar("span", operacion, paso, "pasos-incertidumbre__operacion");
  }
  agregar("p", EXPLICACION_INCERTIDUMBRE.resultado, padre);
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
    // Un valor con varios renglones (las normas) se muestra con un renglón por línea
    agregar("dd", "", listaDatos).replaceChildren(...conSaltosDeLinea(valor.split(SALTO_DE_RENGLON)));
  }
  contenedor.appendChild(listaDatos);

  // Tabla de lecturas
  agregar("h3", TITULO_LECTURAS, contenedor);
  contenedor.appendChild(crearTablaLecturas(contenido.columnas, contenido.filas));
  agregar("p", TEXTO_CERCA_DEL_LIMITE, contenedor, "nota");

  // Incertidumbre y aviso
  agregar("h3", TITULO_INCERTIDUMBRE, contenedor);
  mostrarExplicacionIncertidumbre(contenedor);
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
  // La nota va completa en una sola página (si no cabe, pasa entera a la siguiente)
  documento.parrafoSinPartir(TEXTO_CERCA_DEL_LIMITE);
  // La explicación de la incertidumbre va completa en una sola página
  documento.seccionSinPartir(TITULO_INCERTIDUMBRE, [
    { parrafo: EXPLICACION_INCERTIDUMBRE.introduccion },
    { parrafo: EXPLICACION_INCERTIDUMBRE.ejemplo },
    { listaNumerada: EXPLICACION_INCERTIDUMBRE.pasos },
    { parrafo: EXPLICACION_INCERTIDUMBRE.resultado },
  ]);
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
