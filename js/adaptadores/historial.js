/**
 * ============================================================================
 * Título: Historial de lecturas
 * Descripción: Guarda cada lectura de la práctica (un "registro": medición,
 *   condición, lectura ± incertidumbre, límite, veredicto y hora). Los
 *   registros viven en la memoria de la página y se copian en sessionStorage
 *   para que no se pierdan si la página se recarga. sessionStorage es del
 *   propio navegador: NADA se envía a un servidor. Se borra al cerrar la
 *   pestaña, por eso se avisa antes de cerrarla si hay lecturas. También
 *   guarda cuántos pasos de la prueba guiada se completaron.
 *   También da el formato de una fila (texto de cada columna), que usan el
 *   historial, la sección Comparar y el reporte, para que se vean iguales.
 * Módulo: M8 – Historial (adaptador)
 * Autores: Yustin Rico, David Cardona, Santiago González
 * Creado: 2026-11-13 · Modificado: 2026-11-13
 * ============================================================================
 */

/** Nombre con el que se guardan los registros en sessionStorage (con versión del formato). */
const CLAVE_ALMACEN = "analizador_transparente.historial.v1";

/** Nombre con el que se guarda el avance de la prueba guiada. */
const CLAVE_AVANCE_PRUEBA = "analizador_transparente.avance_prueba.v1";

/** Tiempo durante el cual el botón de correo puede saltarse el aviso de salida (ms). */
const VENTANA_OMITIR_AVISO_MS = 1000;

/** Decimales de la lectura y del % del límite. */
const DECIMALES_LECTURA = 2;
const DECIMALES_PORCENTAJE = 1;

/** Nombres para mostrar de cada medición. */
export const NOMBRES_MEDICION = Object.freeze({ contacto: "Corriente de contacto", paciente: "Corriente de paciente CF" });

/** Formato de la hora de cada lectura (hora colombiana del navegador). */
const FORMATO_HORA = Object.freeze({ hour: "2-digit", minute: "2-digit", second: "2-digit" });
const IDIOMA_FECHAS = "es-CO";

/**
 * Nombre corto de una condición, por ejemplo "Tierra abierta (pol. invertida)".
 * @param {{polaridad: string, tierra: string, neutro: string}} condicion - Condición de prueba.
 * @returns {string} Nombre corto.
 */
export function nombreCortoCondicion(condicion) {
  let falla = "Normal";
  if (condicion.tierra === "abierta") {
    falla = "Tierra abierta";
  } else if (condicion.neutro === "abierto") {
    falla = "Neutro abierto";
  }
  return `${falla} (pol. ${condicion.polaridad})`;
}

/**
 * Texto "lectura ± incertidumbre" con 2 decimales, por ejemplo "14.73 ± 1.32".
 * @param {{corriente_uA: number, incertidumbre_uA: number}} registro - Registro o resultado.
 * @returns {string} Texto sin la unidad.
 */
export function textoLectura(registro) {
  return `${registro.corriente_uA.toFixed(DECIMALES_LECTURA)} ± ${registro.incertidumbre_uA.toFixed(DECIMALES_LECTURA)}`;
}

/**
 * Texto del % del límite, por ejemplo "2.9 %".
 * @param {number} porcentaje - Porcentaje del límite usado.
 * @returns {string} Texto con el símbolo %.
 */
export function textoPorcentaje(porcentaje) {
  return `${porcentaje.toFixed(DECIMALES_PORCENTAJE)} %`;
}

/**
 * Texto de una fila (historial, Comparar o reporte) a partir de un registro.
 * @param {object} registro - Registro guardado.
 * @returns {{hora: string, medicion: string, condicion: string, lectura: string, limite: string, porcentaje: string, veredicto: string}}
 */
export function filaDeRegistro(registro) {
  return {
    hora: new Date(registro.hora).toLocaleTimeString(IDIOMA_FECHAS, FORMATO_HORA),
    medicion: NOMBRES_MEDICION[registro.tipoMedicion],
    condicion: nombreCortoCondicion(registro.condicion),
    lectura: textoLectura(registro),
    limite: String(registro.limite_uA),
    porcentaje: textoPorcentaje(registro.porcentajeDelLimite),
    veredicto: registro.veredicto,
  };
}

/**
 * Arma un registro con solo los datos que hacen falta para el historial y el reporte.
 * @param {object} resultado - Resultado evaluado (M4 + M5).
 * @param {Date} fecha - Momento de la lectura.
 * @returns {Readonly<object>} Registro congelado (la hora va como texto ISO).
 */
function crearRegistro(resultado, fecha) {
  const { polaridad, tierra, neutro } = resultado.condicion;
  return Object.freeze({
    tipoMedicion: resultado.tipoMedicion,
    condicion: Object.freeze({ polaridad, tierra, neutro }),
    corriente_uA: resultado.corriente_uA,
    incertidumbre_uA: resultado.incertidumbre_uA,
    limite_uA: resultado.limite_uA,
    porcentajeDelLimite: resultado.porcentajeDelLimite,
    veredicto: resultado.veredicto,
    hora: fecha.toISOString(),
  });
}

/**
 * Revisa que un registro leído de sessionStorage tenga la forma correcta
 * (programación defensiva: el almacén se puede dañar o editar a mano).
 * @param {*} registro - Objeto leído.
 * @returns {boolean} true si se puede usar.
 */
function esRegistroValido(registro) {
  const esNumero = (valor) => typeof valor === "number" && Number.isFinite(valor);
  return registro !== null && typeof registro === "object"
    && Object.hasOwn(NOMBRES_MEDICION, registro.tipoMedicion)
    && registro.condicion !== null && typeof registro.condicion === "object"
    && ["polaridad", "tierra", "neutro"].every((campo) => typeof registro.condicion[campo] === "string")
    && ["corriente_uA", "incertidumbre_uA", "limite_uA", "porcentajeDelLimite"].every((campo) => esNumero(registro[campo]))
    && typeof registro.veredicto === "string"
    && !Number.isNaN(Date.parse(registro.hora));
}

/**
 * Lee los registros guardados. Si el almacén no existe o está dañado, empieza vacío.
 * @param {Storage|null} almacen - sessionStorage (o null si el navegador no lo permite).
 * @returns {object[]} Registros válidos.
 */
function leerAlmacen(almacen) {
  if (almacen === null) {
    return [];
  }
  try {
    const guardados = JSON.parse(almacen.getItem(CLAVE_ALMACEN) ?? "[]");
    return Array.isArray(guardados) ? guardados.filter(esRegistroValido).map((registro) => Object.freeze(registro)) : [];
  } catch {
    return [];
  }
}

/**
 * Copia los registros en el almacén. Si falla (modo privado, sin espacio), se
 * siguen usando los de la memoria: la práctica no se interrumpe.
 * @param {Storage|null} almacen - sessionStorage o null.
 * @param {object[]} registros - Registros a guardar.
 */
function guardarAlmacen(almacen, registros) {
  if (almacen === null) {
    return;
  }
  try {
    almacen.setItem(CLAVE_ALMACEN, JSON.stringify(registros));
  } catch {
    // Sin almacén disponible: los registros quedan solo en memoria
  }
}

/**
 * Devuelve el sessionStorage del navegador, o null si está bloqueado.
 * @returns {Storage|null} El almacén de la pestaña.
 */
function obtenerAlmacenDeSesion() {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/**
 * Crea el historial de la práctica y recupera lo que hubiera en esta pestaña.
 * @param {Storage|null} [almacen] - Almacén a usar (por defecto el sessionStorage del navegador).
 * @returns {{agregar: Function, obtenerRegistros: Function, cantidad: Function}} Funciones del historial.
 */
export function crearHistorial(almacen = obtenerAlmacenDeSesion()) {
  const registros = leerAlmacen(almacen);

  return {
    /**
     * Agrega una lectura al historial.
     * @param {object} resultado - Resultado evaluado (M4 + M5).
     * @param {Date} [fecha=new Date()] - Momento de la lectura.
     * @returns {Readonly<object>} El registro guardado.
     */
    agregar(resultado, fecha = new Date()) {
      const registro = crearRegistro(resultado, fecha);
      registros.push(registro);
      guardarAlmacen(almacen, registros);
      return registro;
    },
    /**
     * Copia de la lista de registros, en orden de llegada.
     * @returns {object[]} Registros.
     */
    obtenerRegistros() {
      return [...registros];
    },
    /**
     * Número de lecturas guardadas.
     * @returns {number} Cantidad de registros.
     */
    cantidad() {
      return registros.length;
    },
  };
}

/**
 * Pide confirmación al cerrar o recargar la pestaña si hay lecturas.
 * (El navegador muestra su propio mensaje; no se puede personalizar.)
 *
 * Un enlace mailto: también dispara el evento "beforeunload" aunque la
 * página no se cierre (el navegador solo abre el programa de correo). Por eso
 * se devuelve omitirSiguienteAviso(): el botón de correo la llama justo antes
 * de abrir el correo, y el aviso se salta UNA vez. Si el evento no llega en
 * ese momento, el permiso vence solo, para que cerrar la pestaña después
 * siga mostrando el aviso.
 * @param {{cantidad: Function}} historial - Historial de la práctica.
 * @returns {{omitirSiguienteAviso: Function}} Función para saltar el aviso una vez.
 */
export function activarAvisoAlCerrar(historial) {
  let omitirAviso = false;
  let temporizador = null;

  window.addEventListener("beforeunload", (evento) => {
    if (omitirAviso) {
      omitirAviso = false;
      return;
    }
    if (historial.cantidad() > 0) {
      evento.preventDefault();
      evento.returnValue = "";
    }
  });

  return {
    /** Salta el próximo aviso (solo durante un instante). */
    omitirSiguienteAviso() {
      omitirAviso = true;
      window.clearTimeout(temporizador);
      temporizador = window.setTimeout(() => {
        omitirAviso = false;
      }, VENTANA_OMITIR_AVISO_MS);
    },
  };
}

/**
 * Guarda cuántos pasos de la prueba guiada se completaron, para no repetirlos
 * si la página se recarga.
 * @param {number} pasosCompletados - Pasos completados (0 a 4).
 */
export function guardarAvancePrueba(pasosCompletados) {
  const almacen = obtenerAlmacenDeSesion();
  if (almacen === null) {
    return;
  }
  try {
    almacen.setItem(CLAVE_AVANCE_PRUEBA, String(pasosCompletados));
  } catch {
    // Sin almacén disponible: el avance queda solo en memoria
  }
}

/**
 * Lee el avance guardado de la prueba guiada. La interfaz lo valida con M2
 * antes de usarlo.
 * @returns {number|null} Pasos completados, o null si no hay nada guardado.
 */
export function leerAvancePrueba() {
  const almacen = obtenerAlmacenDeSesion();
  if (almacen === null) {
    return null;
  }
  try {
    const guardado = almacen.getItem(CLAVE_AVANCE_PRUEBA);
    return guardado === null ? null : Number(guardado);
  } catch {
    return null;
  }
}
