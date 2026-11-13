/**
 * ============================================================================
 * Título: Pruebas del generador de PDF y del reporte en PDF
 * Descripción: Comprueba que el archivo que se descarga es un PDF bien
 *   formado: empieza con %PDF-, la tabla xref apunta exactamente a cada
 *   objeto, el largo de cada flujo es correcto, y el texto contiene todas
 *   las lecturas, la incertidumbre y el aviso. También prueba el salto de
 *   página con encabezado repetido, los caracteres especiales (tildes, ñ,
 *   µ, ±, paréntesis) y el nombre del archivo.
 * Módulo: M10 – Reporte (pruebas)
 * Autores: Yustin Rico, David Cardona, Santiago González
 * Creado: 2026-11-13 · Modificado: 2026-11-13
 * ============================================================================
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { validarParametros } from "../js/nucleo/modelo_equipo.js";
import { calcularMedicion } from "../js/nucleo/motor_calculo.js";
import { evaluarMedicion } from "../js/nucleo/evaluador_limites.js";
import { crearHistorial, textoLectura } from "../js/adaptadores/historial.js";
import { crearPdfReporte, nombreArchivoReporte } from "../js/adaptadores/reporte.js";
import { crearDocumentoPdf, partirEnRenglones } from "../js/adaptadores/pdf.js";

const parametros = validarParametros(JSON.parse(await readFile(new URL("../datos/parametros_r12.json", import.meta.url), "utf8")));

/** Las 6 condiciones permitidas: [polaridad, tierra, neutro]. */
const CONDICIONES = [
  ["normal", "cerrada", "cerrado"], ["invertida", "cerrada", "cerrado"],
  ["normal", "abierta", "cerrado"], ["invertida", "abierta", "cerrado"],
  ["normal", "cerrada", "abierto"], ["invertida", "cerrada", "abierto"],
];
const FECHA_PRUEBA = new Date(2026, 10, 13, 15, 4, 0);

/**
 * Crea un historial con las 12 configuraciones repetidas varias veces.
 * @param {number} repeticiones - Veces que se mide cada configuración.
 * @returns {object[]} Registros.
 */
function crearRegistros(repeticiones) {
  const historial = crearHistorial(null);
  // Cada repetición mide las 12 configuraciones
  for (let repeticion = 0; repeticion < repeticiones; repeticion += 1) {
    for (const tipo of ["contacto", "paciente"]) {
      for (const [polaridad, tierra, neutro] of CONDICIONES) {
        const resultado = evaluarMedicion(calcularMedicion(tipo, { polaridad, tierra, neutro }, parametros), parametros);
        historial.agregar(resultado, FECHA_PRUEBA);
      }
    }
  }
  return historial.obtenerRegistros();
}

/**
 * Pasa los bytes del PDF a texto (1 byte = 1 carácter).
 * @param {Uint8Array} bytes - Archivo.
 * @returns {string} Texto del archivo.
 */
const comoTexto = (bytes) => Buffer.from(bytes).toString("latin1");

/**
 * Saca el texto visible de un PDF: lee cada cadena "( ... ) Tj" de los flujos
 * de contenido y deshace los escapes (\(, \), \\ y octales \ddd).
 * @param {string} archivo - PDF como texto.
 * @returns {string} Texto visible (una cadena por renglón).
 */
function textoVisible(archivo) {
  const cadenas = [...archivo.matchAll(/\(((?:\\.|[^\\)])*)\) Tj/g)].map(([, contenido]) =>
    contenido.replace(/\\([0-7]{3}|.)/g, (_, escape) => (escape.length === 3 ? String.fromCharCode(parseInt(escape, 8)) : escape)));
  return cadenas.join("\n");
}

test("El PDF empieza con %PDF- y termina con %%EOF", () => {
  const archivo = comoTexto(crearPdfReporte({ nombre: "Ana", registros: crearRegistros(1), parametros, fecha: FECHA_PRUEBA }));
  assert.ok(archivo.startsWith("%PDF-1.4\n"));
  assert.ok(archivo.endsWith("%%EOF\n"));
});

test("La tabla xref es válida: cada posición apunta a su objeto y los largos de flujo son exactos", () => {
  const archivo = comoTexto(crearPdfReporte({ nombre: "Ana", registros: crearRegistros(5), parametros, fecha: FECHA_PRUEBA }));

  // startxref dice dónde empieza la tabla xref
  const inicioXref = Number(archivo.match(/startxref\n(\d+)\n%%EOF\n$/)[1]);
  assert.equal(archivo.slice(inicioXref, inicioXref + 5), "xref\n");

  // Encabezado de la tabla: desde el objeto 0, N entradas; /Size del trailer igual a N
  const [, primero, cantidad] = archivo.slice(inicioXref).match(/^xref\n(\d+) (\d+)\n/);
  assert.equal(Number(primero), 0);
  assert.equal(Number(archivo.match(/\/Size (\d+)/)[1]), Number(cantidad));

  // Cada entrada mide 20 bytes exactos; la 0 es libre y las demás apuntan a "n 0 obj"
  const inicioEntradas = inicioXref + `xref\n0 ${cantidad}\n`.length;
  const largoEntrada = 20;
  assert.equal(archivo.slice(inicioEntradas, inicioEntradas + largoEntrada), "0000000000 65535 f \n");
  for (let numero = 1; numero < Number(cantidad); numero += 1) {
    const entrada = archivo.slice(inicioEntradas + numero * largoEntrada, inicioEntradas + (numero + 1) * largoEntrada);
    assert.match(entrada, /^\d{10} 00000 n \n$/, `Entrada ${numero} mal formada`);
    const posicion = Number(entrada.slice(0, 10));
    assert.ok(archivo.startsWith(`${numero} 0 obj\n`, posicion), `La entrada ${numero} no apunta a su objeto`);
  }

  // El /Length de cada flujo coincide con los bytes entre "stream\n" y "\nendstream"
  for (const [, largo, contenido] of archivo.matchAll(/<< \/Length (\d+) >>\nstream\n([\s\S]*?)\nendstream/g)) {
    assert.equal(contenido.length, Number(largo));
  }
});

test("El PDF contiene todas las lecturas, la incertidumbre y el aviso", () => {
  const registros = crearRegistros(1);
  const texto = textoVisible(comoTexto(crearPdfReporte({ nombre: "Ana", registros, parametros, fecha: FECHA_PRUEBA })));
  // Cada lectura "I ± U" aparece en la tabla
  for (const registro of registros) {
    assert.ok(texto.includes(textoLectura(registro)), `Falta la lectura ${textoLectura(registro)}`);
  }
  assert.ok(texto.includes("14.73 ± 1.32"));
  assert.ok(texto.includes("Cómo leer la incertidumbre"));
  assert.ok(texto.includes("Herramienta educativa, no certifica equipos"));
  assert.ok(texto.includes("Electrocardiógrafo Mindray BeneHeart R12"));
});

test("Con muchas lecturas la tabla salta de página y repite el encabezado", () => {
  const archivo = comoTexto(crearPdfReporte({ nombre: "Ana", registros: crearRegistros(6), parametros, fecha: FECHA_PRUEBA }));
  const paginas = Number(archivo.match(/\/Type \/Pages \/Kids \[[^\]]*\] \/Count (\d+)/)[1]);
  const encabezados = textoVisible(archivo).split("\n").filter((renglon) => renglon === "Veredicto").length;
  assert.ok(paginas >= 2, "72 lecturas deberían ocupar más de una página");
  assert.equal(encabezados, paginas, "La fila de títulos debe repetirse en cada página de la tabla");
  assert.ok(textoVisible(archivo).includes(`Página ${paginas} de ${paginas}`));
});

test("Tildes, ñ, µ, ± y paréntesis del nombre se escriben bien (texto plano, sin romper el PDF)", () => {
  const nombre = "Peña Núñez (José) \\ <b>";
  const texto = textoVisible(comoTexto(crearPdfReporte({ nombre, registros: crearRegistros(1), parametros, fecha: FECHA_PRUEBA })));
  assert.ok(texto.includes(nombre));
  assert.ok(texto.includes("µA"));
});

test("Un carácter que no existe en las fuentes estándar se cambia por «?»", () => {
  const documento = crearDocumentoPdf({ titulo: "Prueba", pie: "Pie", fecha: FECHA_PRUEBA });
  documento.parrafo("Hola 😀 mundo");
  assert.ok(textoVisible(comoTexto(documento.generar())).includes("Hola ? mundo"));
});

test("Los renglones partidos conservan todas las palabras", () => {
  const texto = "La incertidumbre indica cuánto podría diferir la lectura del analizador real en cada condición";
  const anchoMaximo_pt = 120;
  const tamano = 10;
  const renglones = partirEnRenglones(texto, anchoMaximo_pt, tamano, false);
  assert.ok(renglones.length > 1);
  assert.equal(renglones.join(" "), texto);
});

test("Validación: sin opciones o con columnas que no suman 1, lanza un error claro", () => {
  assert.throws(() => crearDocumentoPdf(), /título/);
  const documento = crearDocumentoPdf({ titulo: "Prueba", pie: "Pie", fecha: FECHA_PRUEBA });
  assert.throws(() => documento.tabla([{ titulo: "A", fraccion: 0.5 }], [["1"]]), /sumar 1/);
});

test("Nombre del archivo con la fecha local AAAA-MM-DD", () => {
  assert.equal(nombreArchivoReporte(new Date(2026, 10, 13, 23, 30)), "reporte_seguridad_electrica_2026-11-13.pdf");
  assert.equal(nombreArchivoReporte(new Date(2026, 0, 5, 0, 10)), "reporte_seguridad_electrica_2026-01-05.pdf");
});
