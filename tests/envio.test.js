/**
 * ============================================================================
 * Título: Pruebas del envío al docente (sin red)
 * Descripción: Revisa las dos funciones puras de M12: la validación de los
 *   datos del formulario (mismas reglas que el servicio) y la conversión de
 *   bytes a base64 (se compara con Buffer de Node). La red NO se prueba aquí.
 *   También revisa que el código del servicio publicado no traiga la clave.
 * Módulo: M12 – Envío (pruebas)
 * Autores: Yustin Rico, David Cardona, Santiago González
 * Creado: 2026-11-25 · Modificado: 2026-11-25
 * ============================================================================
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { validarDatosEnvio, bytesABase64, ERRORES_ENVIO, CORREO_DOCENTE_POR_DEFECTO } from "../js/adaptadores/envio.js";

/** Datos válidos de referencia; cada prueba cambia un solo campo. */
const DATOS_VALIDOS = Object.freeze({
  nombre: "Ana María Pérez",
  codigo: "2235552",
  correoDocente: CORREO_DOCENTE_POR_DEFECTO,
  consentimiento: true,
});

/**
 * Valida los datos válidos con un campo cambiado.
 * @param {object} cambio - Campo(s) a reemplazar.
 * @returns {string[]} Errores.
 */
const validarCon = (cambio) => validarDatosEnvio({ ...DATOS_VALIDOS, ...cambio });

test("Datos válidos: no hay errores", () => {
  assert.deepEqual(validarDatosEnvio(DATOS_VALIDOS), []);
});

test("Nombre: de 3 a 80 caracteres (sin contar espacios de los extremos)", () => {
  assert.deepEqual(validarCon({ nombre: "Ana" }), []);
  assert.deepEqual(validarCon({ nombre: "a".repeat(80) }), []);
  assert.deepEqual(validarCon({ nombre: "  Ana  " }), []);
  // Casos inválidos: vacío, muy corto, solo espacios, muy largo, ausente
  for (const nombre of ["", "Al", "      ", "a".repeat(81), undefined, null]) {
    assert.deepEqual(validarCon({ nombre }), [ERRORES_ENVIO.nombre], `nombre: ${String(nombre)}`);
  }
});

test("Código: solo números, de 5 a 10 dígitos", () => {
  // Casos válidos
  for (const codigo of ["12345", "1234567890", " 2235552 "]) {
    assert.deepEqual(validarCon({ codigo }), [], `código: ${codigo}`);
  }
  // Casos inválidos: corto, largo, con letras, con guion, vacío, ausente
  for (const codigo of ["1234", "12345678901", "22a5552", "2235-552", "", undefined]) {
    assert.deepEqual(validarCon({ codigo }), [ERRORES_ENVIO.codigo], `código: ${String(codigo)}`);
  }
});

test("Correo del docente: solo @uao.edu.co, sin importar mayúsculas", () => {
  // Casos válidos (incluido todo en mayúsculas)
  for (const correoDocente of ["cferro@uao.edu.co", "X@UAO.EDU.CO", "nombre.apellido@uao.edu.co"]) {
    assert.deepEqual(validarCon({ correoDocente }), [], `correo: ${correoDocente}`);
  }
  // Casos inválidos: otro dominio, subdominio falso, sin usuario, con espacio, vacío
  for (const correoDocente of ["x@gmail.com", "x@uao.edu.co.evil.com", "@uao.edu.co", "a b@uao.edu.co", "uao.edu.co", ""]) {
    assert.deepEqual(validarCon({ correoDocente }), [ERRORES_ENVIO.correo], `correo: ${correoDocente}`);
  }
});

test("Consentimiento: tiene que ser exactamente true", () => {
  // Valores que parecen «sí» pero no son true
  for (const consentimiento of [false, "true", 1, undefined, null]) {
    assert.deepEqual(validarCon({ consentimiento }), [ERRORES_ENVIO.consentimiento], `consentimiento: ${String(consentimiento)}`);
  }
});

test("Con todo mal, devuelve los 4 errores", () => {
  const errores = validarDatosEnvio({ nombre: "", codigo: "abc", correoDocente: "x@gmail.com", consentimiento: false });
  assert.equal(errores.length, 4);
});

test("bytesABase64 da lo mismo que Buffer de Node (tamaños 0 a 20 y 1000)", () => {
  // Tamaños múltiplos de 3 y no múltiplos de 3 (sobran 1 o 2 bytes → relleno "=")
  for (const tamano of [...Array.from({ length: 21 }, (_, indice) => indice), 1000]) {
    const bytes = Uint8Array.from({ length: tamano }, (_, indice) => (indice * 37 + 11) % 256);
    assert.equal(bytesABase64(bytes), Buffer.from(bytes).toString("base64"), `tamaño ${tamano}`);
  }
});

test("bytesABase64 con todos los valores de byte posibles (0 a 255)", () => {
  const bytes = Uint8Array.from({ length: 256 }, (_, indice) => indice);
  assert.equal(bytesABase64(bytes), Buffer.from(bytes).toString("base64"));
});

test("bytesABase64 rechaza lo que no es Uint8Array", () => {
  assert.throws(() => bytesABase64("hola"), TypeError);
});

test("El código del servicio que está en el repositorio NO trae la clave del examen", async () => {
  const codigo = await readFile(new URL("../tools/apps_script/Codigo_AppsScript.gs", import.meta.url), "utf8");
  assert.match(codigo, /^const CLAVE = \{\}; \/\/ La clave real está solo en la cuenta del proyecto; no se publica\.$/m);
  assert.doesNotMatch(codigo, /"q\d+"\s*:\s*\d/, "Parece que hay respuestas del examen en el código publicado");
});
