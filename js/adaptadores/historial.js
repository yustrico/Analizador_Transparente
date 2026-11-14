/**
 * ============================================================================
 * Título: Historial de lecturas
 * Descripción: Guarda cada lectura de la práctica (un "registro": medición,
 *   condición, lectura ± incertidumbre, límite, veredicto y hora). Los
 *   registros viven en la memoria de la página y se copian en sessionStorage
 *   para que no se pierdan si la página se recarga. sessionStorage es del
 *   propio navegador: NADA se envía a un servidor. Se borra al cerrar la
 *   pestaña (la página lo dice en una nota visible para que el estudiante
 *   descargue su reporte antes). También guarda cuántos pasos de la prueba
 *   guiada se completaron.
 *   También da el formato de una fila (texto de cada columna), que usan el
 *   historial, la sección Comparar y el reporte, para que se vean iguales, y
 *   resume el avance: cuántas de las 16 configuraciones se han medido, cuáles
 *   faltan y cuáles se repitieron (función pura, con pruebas).
 * Módulo: M8 – Historial (adaptador)
 * Autores: Yustin Rico, David Cardona, Santiago González
 * Creado: 2026-11-13 · Modificado: 2026-11-14
 * ============================================================================
 */

/** Nombre con el que se guardan los registros en sessionStorage (con versión del formato). */
const CLAVE_ALMACEN = "analizador_transparente.historial.v1";

/** Nombre con el que se guarda el avance de la prueba guiada. */
const CLAVE_AVANCE_PRUEBA = "analizador_transparente.avance_prueba.v1";

/** Decimales de la lectura y del % del límite. */
const DECIMALES_LECTURA = 2;
const DECIMALES_PORCENTAJE = 1;

/** Unidad de las corrientes que se muestran en las tablas. */
export const UNIDAD_CORRIENTE = "µA";

/** Los límites desde 1 mA se escriben en mA (por ejemplo, 5 mA en vez de 5000 µA). */
const MICROAMPERIOS_POR_MILIAMPERIO = 1000;
const UNIDAD_MILIAMPERIOS = "mA";

/** Nombres para mostrar de cada medición. */
export const NOMBRES_MEDICION = Object.freeze({
  contacto: "Corriente de contacto",
  paciente: "Corriente de paciente CF",
  fuga_tierra: "Corriente de fuga a tierra",
});

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
 * Texto de un límite con su unidad: en mA desde 1 mA ("5 mA", "10 mA") y en
 * µA por debajo ("100 µA", "10 µA").
 * @param {number} limite_uA - Límite en µA.
 * @returns {string} Límite con su unidad.
 */
export function textoLimite(limite_uA) {
  if (limite_uA >= MICROAMPERIOS_POR_MILIAMPERIO) {
    return `${limite_uA / MICROAMPERIOS_POR_MILIAMPERIO} ${UNIDAD_MILIAMPERIOS}`;
  }
  return `${limite_uA} ${UNIDAD_CORRIENTE}`;
}

/**
 * Texto de una configuración, por ejemplo "Corriente de contacto, Tierra abierta (pol. invertida)".
 * @param {{tipoMedicion: string, condicion: object}} configuracion - Medición y condición.
 * @returns {string} Texto.
 */
export function textoConfiguracion(configuracion) {
  return `${NOMBRES_MEDICION[configuracion.tipoMedicion]}, ${nombreCortoCondicion(configuracion.condicion)}`;
}

/**
 * Clave única de una configuración (medición + condición), por ejemplo "contacto|normal|abierta|cerrado".
 * @param {{tipoMedicion: string, condicion: object}} configuracion - Lectura o configuración.
 * @returns {string} Clave.
 */
export function claveConfiguracion(configuracion) {
  const { polaridad, tierra, neutro } = configuracion.condicion;
  return `${configuracion.tipoMedicion}|${polaridad}|${tierra}|${neutro}`;
}

/**
 * Resume el avance de la práctica frente a las configuraciones que simula la
 * herramienta (función pura): cuántas se midieron, cuáles faltan y cuáles se
 * midieron más de una vez (con cuántas veces), en el orden de la lista.
 * @param {object[]} registros - Lecturas del historial.
 * @param {ReadonlyArray<{tipoMedicion: string, condicion: object}>} configuraciones - Las 16 configuraciones (M4).
 * @returns {{medidas: number, total: number, faltantes: object[], repetidas: {configuracion: object, veces: number}[]}}
 */
export function resumirAvance(registros, configuraciones) {
  const vecesPorClave = new Map();
  // Cuenta cuántas veces se midió cada configuración
  for (const registro of registros) {
    const clave = claveConfiguracion(registro);
    vecesPorClave.set(clave, (vecesPorClave.get(clave) ?? 0) + 1);
  }
  const veces = (configuracion) => vecesPorClave.get(claveConfiguracion(configuracion)) ?? 0;
  const faltantes = configuraciones.filter((configuracion) => veces(configuracion) === 0);
  const repetidas = configuraciones
    .filter((configuracion) => veces(configuracion) > 1)
    .map((configuracion) => ({ configuracion, veces: veces(configuracion) }));
  return { medidas: configuraciones.length - faltantes.length, total: configuraciones.length, faltantes, repetidas };
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
    lectura: `${textoLectura(registro)} ${UNIDAD_CORRIENTE}`,
    limite: textoLimite(registro.limite_uA),
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
