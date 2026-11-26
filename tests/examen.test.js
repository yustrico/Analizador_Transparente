/**
 * ============================================================================
 * Título: Pruebas del examen (M7)
 * Descripción: Revisa el banco REAL (datos/examen.json): 15 preguntas, ids
 *   únicos, 4 opciones y ninguna respuesta. Prueba el sorteo de preguntas y
 *   el barajado de opciones con un "azar" fijo (siempre da lo mismo), el
 *   objeto de respuestas que se envía al servicio y la revisión de que todas
 *   estén respondidas. También revisa el PDF del examen (M10): trae las
 *   respuestas elegidas y no trae nota ni ✓/✗. La red NO se prueba aquí.
 * Módulo: M7 – Examen (pruebas)
 * Autores: Yustin Rico, David Cardona, Santiago González
 * Creado: 2026-11-26 · Modificado: 2026-11-26
 * ============================================================================
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  validarBanco, elegirPreguntas, barajarOpciones, armarRespuestas, todasRespondidas, cargarBanco, OPCIONES_POR_PREGUNTA,
} from "../js/nucleo/examen.js";
import { contenidoDelExamen, crearPdfExamen, nombreArchivoExamen } from "../js/adaptadores/reporte.js";

/** Banco real, tal como lo carga la página. */
const BANCO_JSON = JSON.parse(await readFile(new URL("../datos/examen.json", import.meta.url), "utf8"));

/** Cuántas preguntas trae el banco real. */
const PREGUNTAS_EN_EL_BANCO = 15;

/** Fecha fija para las pruebas del PDF (26/11/2026 10:30). */
const FECHA_PRUEBA = new Date(2026, 10, 26, 10, 30, 0);

/**
 * Copia profunda del banco real, para cambiarle algo en una prueba.
 * @returns {object} Copia.
 */
function copiaDelBanco() {
  return structuredClone(BANCO_JSON);
}

/**
 * "Azar" que siempre devuelve la misma secuencia de números (se repite en ciclo).
 * @param {number[]} valores - Números en [0, 1).
 * @returns {function(): number} Función como Math.random, pero repetible.
 */
function azarFijo(valores) {
  let posicion = 0;
  return () => {
    const valor = valores[posicion % valores.length];
    posicion += 1;
    return valor;
  };
}

test("El banco real tiene 15 preguntas con ids únicos, texto y 4 opciones", () => {
  const banco = validarBanco(copiaDelBanco());
  assert.equal(banco.preguntas.length, PREGUNTAS_EN_EL_BANCO);
  assert.equal(new Set(banco.preguntas.map((pregunta) => pregunta.id)).size, PREGUNTAS_EN_EL_BANCO);
  // Cada pregunta con texto y exactamente 4 opciones con texto
  for (const pregunta of banco.preguntas) {
    assert.ok(pregunta.pregunta.trim().length > 0);
    assert.equal(pregunta.opciones.length, OPCIONES_POR_PREGUNTA);
    assert.ok(pregunta.opciones.every((opcion) => opcion.trim().length > 0));
  }
  assert.ok(banco.preguntas.length >= banco.preguntas_por_examen);
  assert.ok(Object.isFrozen(banco) && Object.isFrozen(banco.preguntas[0]), "El banco debe quedar congelado");
});

test("Ninguna pregunta del banco real trae la respuesta (solo id, pregunta y opciones)", () => {
  // Cada pregunta: solo los tres campos permitidos
  for (const pregunta of BANCO_JSON.preguntas) {
    assert.deepEqual(Object.keys(pregunta).sort(), ["id", "opciones", "pregunta"], `La pregunta ${pregunta.id} trae campos de más`);
  }
  assert.doesNotMatch(JSON.stringify(BANCO_JSON), /"(respuesta|correcta|clave)[^"]*"\s*:/i);
});

test("validarBanco rechaza un banco con una respuesta, ids repetidos, opciones de más o pocas preguntas", () => {
  const conRespuesta = copiaDelBanco();
  conRespuesta.preguntas[0].respuesta = 0;
  assert.throws(() => validarBanco(conRespuesta), /campo "respuesta".*respuestas no pueden estar en la página/);

  const repetido = copiaDelBanco();
  repetido.preguntas[1].id = repetido.preguntas[0].id;
  assert.throws(() => validarBanco(repetido), /está repetido/);

  const cincoOpciones = copiaDelBanco();
  cincoOpciones.preguntas[2].opciones.push("Otra");
  assert.throws(() => validarBanco(cincoOpciones), /exactamente 4 opciones/);

  const sinTexto = copiaDelBanco();
  sinTexto.preguntas[3].pregunta = "  ";
  assert.throws(() => validarBanco(sinTexto), /no tiene texto/);

  const opcionVacia = copiaDelBanco();
  opcionVacia.preguntas[4].opciones[1] = "";
  assert.throws(() => validarBanco(opcionVacia), /opción 2 .* está vacía/);

  const pocas = copiaDelBanco();
  pocas.preguntas = pocas.preguntas.slice(0, pocas.preguntas_por_examen - 1);
  assert.throws(() => validarBanco(pocas), /al menos 10 preguntas/);

  const sinIntentos = copiaDelBanco();
  sinIntentos.intentos_maximos = 0;
  assert.throws(() => validarBanco(sinIntentos), /intentos_maximos/);

  assert.throws(() => validarBanco(null), /no tiene la forma esperada/);
});

test("elegirPreguntas con un azar fijo da 10 preguntas distintas del banco, siempre las mismas", () => {
  const banco = validarBanco(copiaDelBanco());
  const azar = [0.73, 0.05, 0.41, 0.99, 0.18, 0.6, 0.27, 0.88];
  const primera = elegirPreguntas(banco, banco.preguntas_por_examen, azarFijo(azar));
  const segunda = elegirPreguntas(banco, banco.preguntas_por_examen, azarFijo(azar));
  assert.equal(primera.length, 10);
  assert.equal(new Set(primera.map((pregunta) => pregunta.id)).size, 10, "No puede repetir preguntas");
  assert.ok(primera.every((pregunta) => banco.preguntas.includes(pregunta)), "Solo preguntas del banco");
  assert.deepEqual(primera.map((pregunta) => pregunta.id), segunda.map((pregunta) => pregunta.id), "Mismo azar, mismas preguntas");
  // Con Math.random también salen 10 distintas
  const alAzar = elegirPreguntas(banco, banco.preguntas_por_examen);
  assert.equal(new Set(alAzar.map((pregunta) => pregunta.id)).size, 10);
});

test("elegirPreguntas rechaza un n inválido o un azar que no es función", () => {
  const banco = validarBanco(copiaDelBanco());
  assert.throws(() => elegirPreguntas(banco, 0), /de 1 a 15/);
  assert.throws(() => elegirPreguntas(banco, 16), /de 1 a 15/);
  assert.throws(() => elegirPreguntas(banco, 2.5), /de 1 a 15/);
  assert.throws(() => elegirPreguntas(banco, 10, 0.5), /números al azar/);
});

test("barajarOpciones conserva las 4 opciones con su índice original", () => {
  const pregunta = BANCO_JSON.preguntas[0];
  // Con varios "azares" distintos el resultado siempre trae los índices 0, 1, 2 y 3
  for (const azar of [[0], [0.99], [0.5, 0.1, 0.9], [0.3, 0.7]]) {
    const opciones = barajarOpciones(pregunta, azarFijo(azar));
    assert.deepEqual(opciones.map((opcion) => opcion.indiceOriginal).sort(), [0, 1, 2, 3]);
    // Cada texto sigue unido a su índice original
    for (const opcion of opciones) {
      assert.equal(opcion.texto, pregunta.opciones[opcion.indiceOriginal]);
    }
  }
  // Con azar 0 siempre, Fisher–Yates rota la lista: el orden sí cambia
  assert.notDeepEqual(barajarOpciones(pregunta, azarFijo([0])).map((opcion) => opcion.indiceOriginal), [0, 1, 2, 3]);
});

test("armarRespuestas entrega { id: índice original } y rechaza índices inválidos", () => {
  const seleccion = new Map([["q01", 0], ["q07", 3], ["q12", 1]]);
  assert.deepEqual(armarRespuestas(seleccion), { q01: 0, q07: 3, q12: 1 });
  assert.deepEqual(armarRespuestas(new Map()), {});
  assert.throws(() => armarRespuestas(new Map([["q01", 4]])), /q01 no es una opción válida/);
  assert.throws(() => armarRespuestas(new Map([["q01", "0"]])), /q01 no es una opción válida/);
  assert.throws(() => armarRespuestas({ q01: 0 }), /Map/);
});

test("todasRespondidas solo es true cuando cada pregunta tiene una opción válida", () => {
  const preguntas = [{ id: "q01" }, { id: "q02" }, { id: "q03" }];
  assert.equal(todasRespondidas(preguntas, new Map([["q01", 0], ["q02", 2]])), false);
  assert.equal(todasRespondidas(preguntas, new Map([["q01", 0], ["q02", 2], ["q03", 9]])), false);
  assert.equal(todasRespondidas(preguntas, new Map([["q01", 0], ["q02", 2], ["q03", 3]])), true);
  assert.equal(todasRespondidas([], new Map()), false);
  assert.equal(todasRespondidas(preguntas, null), false);
});

test("cargarBanco lee el archivo con la función que se le pase y lo valida", async () => {
  const lecturaBuena = async () => ({ ok: true, json: async () => copiaDelBanco() });
  const banco = await cargarBanco("datos/examen.json", lecturaBuena);
  assert.equal(banco.preguntas.length, PREGUNTAS_EN_EL_BANCO);
  const lecturaMala = async () => ({ ok: false, status: 404 });
  await assert.rejects(cargarBanco("datos/examen.json", lecturaMala), /código 404/);
});

test("El PDF del examen trae los datos del intento y las respuestas elegidas, sin nota ni ✓/✗", () => {
  const datos = {
    nombre: "Ana María Pérez",
    codigo: "99999",
    fecha: FECHA_PRUEBA,
    intento: 1,
    intentosMaximos: 2,
    preguntas: BANCO_JSON.preguntas.slice(0, 10).map((pregunta) => ({ pregunta: pregunta.pregunta, elegida: pregunta.opciones[1] })),
  };
  const contenido = contenidoDelExamen(datos);
  assert.deepEqual(contenido.datosGenerales.map(([termino]) => termino), ["Estudiante", "Código", "Fecha y hora", "Intento"]);
  assert.deepEqual(contenido.datosGenerales[3], ["Intento", "1 de 2"]);
  assert.equal(contenido.respuestas.length, 10);
  assert.equal(contenido.respuestas[0][1], `Respuesta elegida: ${BANCO_JSON.preguntas[0].opciones[1]}`);
  assert.doesNotMatch(JSON.stringify(contenido), /Nota|Correcta|Incorrecta|✓|✗/);

  const bytes = crearPdfExamen(datos);
  const texto = new TextDecoder("latin1").decode(bytes);
  assert.ok(texto.startsWith("%PDF-1.4"));
  assert.ok(texto.trimEnd().endsWith("%%EOF"));
  assert.equal(nombreArchivoExamen(FECHA_PRUEBA, 2), "examen_seguridad_electrica_2026-11-26_intento2.pdf");
});
