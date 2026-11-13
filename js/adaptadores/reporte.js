/**
 * ============================================================================
 * Título: Reporte final de la práctica
 * Descripción: Arma el reporte del estudiante con su nombre (opcional), la
 *   fecha, el equipo y TODAS las lecturas que hizo, más la explicación de la
 *   incertidumbre y el aviso de que es una herramienta educativa. El reporte
 *   se guarda como PDF con el diálogo de impresión del navegador
 *   (window.print) y se puede enviar por correo con un enlace mailto: que
 *   abre el programa de correo del propio estudiante. NADA se envía a un
 *   servidor: el reporte es del estudiante.
 * Módulo: M10 – Reporte (adaptador)
 * Autores: Yustin Rico, David Cardona, Santiago González
 * Creado: 2026-11-13 · Modificado: 2026-11-13
 * ============================================================================
 */

import { VEREDICTO_CUMPLE } from "../nucleo/evaluador_limites.js";
import { filaDeRegistro, textoLectura, textoPorcentaje, NOMBRES_MEDICION, nombreCortoCondicion } from "./historial.js";

/** Explicación de la incertidumbre (se usa en Comparar y en el reporte). */
export const TEXTO_INCERTIDUMBRE = "La incertidumbre es cuánto se puede equivocar el analizador real (±1 % de la lectura + 1 µA). Ejemplo: 14.73 ± 1.32 µA significa que el valor real está entre 13.41 y 16.05 µA, con 95 % de confianza.";

/** Aviso obligatorio del reporte. */
const TEXTO_AVISO = "Herramienta educativa, no certifica equipos. Complementa la práctica con el analizador real.";

/** Largo máximo del nombre del estudiante (caracteres). */
export const LARGO_MAXIMO_NOMBRE = 60;

/** Texto cuando el estudiante no escribe su nombre. */
const NOMBRE_VACIO = "(sin nombre)";

/** Formato de fecha y hora del reporte. */
const IDIOMA_FECHAS = "es-CO";
const FORMATO_FECHA = Object.freeze({ dateStyle: "long", timeStyle: "short" });

/** Salto de línea para el cuerpo del correo (CRLF, el que esperan los programas de correo). */
const SALTO_CORREO = "\r\n";

/** Caracteres de control (saltos de línea, tabulaciones...) que no se aceptan en el nombre. */
const CARACTERES_DE_CONTROL = /[\u0000-\u001F\u007F]/g;
const ESPACIOS_REPETIDOS = /\s+/g;

/** Columnas de la tabla del reporte: [título, campo de filaDeRegistro]. */
const COLUMNAS_REPORTE = Object.freeze([
  ["Hora", "hora"],
  ["Medición", "medicion"],
  ["Condición", "condicion"],
  ["Lectura ± incertidumbre (µA)", "lectura"],
  ["Límite (µA)", "limite"],
  ["% del límite", "porcentaje"],
  ["Veredicto", "veredicto"],
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
 * Agrega a una lista de definiciones (dl) un par término–valor.
 * @param {HTMLElement} lista - Elemento dl.
 * @param {string} termino - Término.
 * @param {string} valor - Valor.
 */
function agregarDato(lista, termino, valor) {
  agregar("dt", termino, lista);
  agregar("dd", valor, lista);
}

/**
 * Crea la tabla con todas las lecturas.
 * @param {object[]} registros - Registros del historial, en orden.
 * @returns {HTMLTableElement} Tabla.
 */
function crearTablaLecturas(registros) {
  const tabla = document.createElement("table");
  tabla.className = "tabla tabla--reporte";
  const filaEncabezado = tabla.createTHead().insertRow();
  agregar("th", "#", filaEncabezado);
  // Un encabezado por columna
  for (const [titulo] of COLUMNAS_REPORTE) {
    agregar("th", titulo, filaEncabezado);
  }
  const cuerpo = tabla.createTBody();
  // Una fila por lectura
  for (const [indice, registro] of registros.entries()) {
    const fila = cuerpo.insertRow();
    const datos = filaDeRegistro(registro);
    agregar("td", String(indice + 1), fila);
    for (const [, campo] of COLUMNAS_REPORTE) {
      agregar("td", datos[campo], fila);
    }
  }
  return tabla;
}

/**
 * Dibuja el reporte dentro de un contenedor (borra lo que hubiera antes).
 * @param {HTMLElement} contenedor - Elemento donde va el reporte.
 * @param {{nombre: string, registros: object[], parametros: object, fecha: Date}} datos - Datos del reporte.
 */
export function generarReporte(contenedor, datos) {
  const { nombre, registros, parametros, fecha } = datos;
  const resumen = resumir(registros);
  contenedor.replaceChildren();

  // Encabezado del reporte
  agregar("h2", "Reporte de práctica: prueba de seguridad eléctrica", contenedor);
  agregar("p", "Analizador transparente (simulador educativo de IEC 60601-1)", contenedor, "nota");

  // Datos generales
  const datosGenerales = document.createElement("dl");
  datosGenerales.className = "ficha";
  agregarDato(datosGenerales, "Estudiante", nombre || NOMBRE_VACIO);
  agregarDato(datosGenerales, "Fecha y hora", fecha.toLocaleString(IDIOMA_FECHAS, FORMATO_FECHA));
  agregarDato(datosGenerales, "Equipo", parametros.equipo.nombre);
  agregarDato(datosGenerales, "Clasificación", `Clase ${parametros.equipo.clase}, parte aplicada ${parametros.equipo.parte_aplicada}`);
  agregarDato(datosGenerales, "Normas", `${parametros.equipo.norma_general} y ${parametros.equipo.norma_particular}`);
  agregarDato(datosGenerales, "Resumen", textoResumen(resumen));
  if (resumen.mayor !== null) {
    agregarDato(datosGenerales, "Más cerca del límite", textoMayorPorcentaje(resumen.mayor));
  }
  contenedor.appendChild(datosGenerales);

  // Tabla de lecturas
  agregar("h3", "Lecturas de la práctica", contenedor);
  contenedor.appendChild(crearTablaLecturas(registros));

  // Incertidumbre y aviso
  agregar("h3", "Cómo leer la incertidumbre", contenedor);
  agregar("p", TEXTO_INCERTIDUMBRE, contenedor);
  agregar("p", TEXTO_AVISO, contenedor, "reporte__aviso");
}

/**
 * Crea el enlace mailto: con un resumen CORTO en el cuerpo (los navegadores y
 * programas de correo cortan los enlaces largos) y la indicación de adjuntar
 * el PDF. No lleva destinatario: el estudiante lo escribe en su correo.
 * Todo el texto se codifica con encodeURIComponent.
 * @param {{nombre: string, registros: object[], parametros: object, fecha: Date}} datos - Datos del reporte.
 * @returns {string} Enlace mailto:.
 */
export function construirEnlaceCorreo(datos) {
  const { nombre, registros, parametros, fecha } = datos;
  const resumen = resumir(registros);
  const fechaTexto = fecha.toLocaleString(IDIOMA_FECHAS, FORMATO_FECHA);
  const asunto = `Reporte de seguridad eléctrica (R12) – ${nombre || "práctica"} – ${fechaTexto}`;
  const lineas = [
    "Reporte de práctica – Analizador transparente",
    `Estudiante: ${nombre || NOMBRE_VACIO}`,
    `Fecha: ${fechaTexto}`,
    `Equipo: ${parametros.equipo.nombre} (Clase ${parametros.equipo.clase}, parte aplicada CF)`,
    `Lecturas: ${textoResumen(resumen)}`,
  ];
  // La lectura más cerca de su límite resume el resultado en una línea
  if (resumen.mayor !== null) {
    lineas.push(`Más cerca del límite: ${textoMayorPorcentaje(resumen.mayor)}`);
  }
  lineas.push("", "Adjunto el reporte completo en PDF (botón «Guardar como PDF» de la herramienta).", TEXTO_AVISO);
  return `mailto:?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(lineas.join(SALTO_CORREO))}`;
}
