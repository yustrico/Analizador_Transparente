/**
 * ============================================================================
 * Título: Punto de arranque de la aplicación
 * Descripción: Es el primer archivo que corre el navegador. Carga y valida
 *   los parámetros del R12 (M3) y, si todo está bien, arranca la interfaz
 *   (M1). Después carga y valida el banco del examen (M7) y prepara la
 *   sección 6. Si algo falla, muestra el error en la página en vez de dejarla
 *   en blanco (si solo falla el examen, el resto de la página sigue).
 * Módulo: M1 – Interfaz de usuario (arranque)
 * Autores: Yustin Rico, David Cardona, Santiago González
 * Creado: 2026-11-13 · Modificado: 2026-11-26
 * ============================================================================
 */

import { cargarParametros } from "./nucleo/modelo_equipo.js?v=5ca0bfb4e4";
import { cargarBanco } from "./nucleo/examen.js?v=db2b15b911";
import { iniciarInterfaz, mostrarError } from "./adaptadores/interfaz.js?v=6b6bbd1bf4";
import { iniciarExamen, mostrarErrorExamen } from "./adaptadores/pantalla_examen.js?v=5ac449d82d";

/** Ruta del archivo de parámetros, relativa a index.html. */
const RUTA_PARAMETROS = "datos/parametros_r12.json?v=350fa3291d";

/** Ruta del banco de preguntas del examen (sin respuestas), relativa a index.html. */
const RUTA_BANCO_EXAMEN = "datos/examen.json?v=e9c68d1ffb";

/**
 * Carga los parámetros y arranca la interfaz; después prepara el examen.
 * @returns {Promise<void>}
 */
async function arrancar() {
  try {
    const parametros = await cargarParametros(RUTA_PARAMETROS);
    iniciarInterfaz(parametros);
  } catch (error) {
    mostrarError(`No se pudo iniciar la aplicación: ${error.message} Si abriste index.html con doble clic, ábrelo con un servidor local (ver README).`);
    return;
  }
  // El examen va aparte: si su banco falla, el simulador sigue funcionando
  try {
    iniciarExamen(await cargarBanco(RUTA_BANCO_EXAMEN));
  } catch (error) {
    mostrarErrorExamen(error.message);
  }
}

arrancar();
