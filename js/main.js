/**
 * ============================================================================
 * Título: Punto de arranque de la aplicación
 * Descripción: Es el primer archivo que corre el navegador. Carga y valida
 *   los parámetros del R12 (M3) y, si todo está bien, arranca la interfaz
 *   (M1). Si algo falla, muestra el error en la página en vez de dejarla en
 *   blanco.
 * Módulo: M1 – Interfaz de usuario (arranque)
 * Autores: Yustin Rico, David Cardona, Santiago González
 * Creado: 2026-11-13 · Modificado: 2026-11-13
 * ============================================================================
 */

import { cargarParametros } from "./nucleo/modelo_equipo.js";
import { iniciarInterfaz, mostrarError } from "./adaptadores/interfaz.js";

/** Ruta del archivo de parámetros, relativa a index.html. */
const RUTA_PARAMETROS = "datos/parametros_r12.json";

/**
 * Carga los parámetros y arranca la interfaz.
 * @returns {Promise<void>}
 */
async function arrancar() {
  try {
    const parametros = await cargarParametros(RUTA_PARAMETROS);
    iniciarInterfaz(parametros);
  } catch (error) {
    mostrarError(`No se pudo iniciar la aplicación: ${error.message} Si abriste index.html con doble clic, ábrelo con un servidor local (ver README).`);
  }
}

arrancar();
