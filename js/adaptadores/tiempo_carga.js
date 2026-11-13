/**
 * ============================================================================
 * Título: Tiempo de carga de la página (para ES03)
 * Descripción: Mide cuánto tardó en cargar ESTA página en el navegador del
 *   estudiante, con la API estándar Navigation Timing: desde el inicio de la
 *   navegación (cuando se presionó Enter o se abrió el enlace) hasta que
 *   terminó el evento "load" (loadEventEnd), en milisegundos. También anota
 *   el navegador, la fecha y hora y el tipo de carga (normal o recarga).
 *   Sirve para ES03: 30 personas abren la página al mismo tiempo y cada una
 *   copia este dato en su resumen. Nada se envía a ningún servidor.
 *   Las funciones de cálculo reciben los datos como parámetros (se pueden
 *   probar con node --test); solo medirCargaPagina() lee del navegador.
 * Módulo: M1 – Interfaz de usuario (adaptador; apoyo a ES03)
 * Autores: Yustin Rico, David Cardona, Santiago González
 * Creado: 2026-11-13 · Modificado: 2026-11-13
 * ============================================================================
 */

/** Inicio del texto que se muestra y se copia (formato pedido para ES03). */
const PREFIJO_TIEMPO_CARGA = "Tiempo de carga de esta página:";

/** Texto cuando el navegador no permite medir. */
const NO_DISPONIBLE = "no disponible";

/** Formato de fecha y hora de la carga (con segundos, para ordenar las 30 cargas). */
const IDIOMA_FECHAS = "es-CO";
const FORMATO_FECHA_CARGA = Object.freeze({ dateStyle: "short", timeStyle: "medium" });

/** Nombre en español de cada tipo de navegación de la API. */
const TIPOS_DE_CARGA = Object.freeze({
  navigate: "carga normal",
  reload: "recarga",
  back_forward: "atrás/adelante",
  prerender: "precarga",
});

/** Navegadores reconocidos: [marca en userAgentData, patrón en el userAgent, nombre a mostrar]. Edge va primero porque su userAgent también dice "Chrome". */
const NAVEGADORES = Object.freeze([
  ["Microsoft Edge", /Edg\/(\d+)/, "Microsoft Edge"],
  ["Google Chrome", /Chrome\/(\d+)/, "Google Chrome"],
]);

/**
 * Nombre y versión principal del navegador, por ejemplo "Microsoft Edge 157".
 * @param {{brands?: {brand: string, version: string}[]}|undefined} datosAgente - navigator.userAgentData (Chrome y Edge lo tienen).
 * @param {string} textoAgente - navigator.userAgent (respaldo).
 * @returns {string} Nombre del navegador.
 */
export function nombreNavegador(datosAgente, textoAgente) {
  const marcas = Array.isArray(datosAgente?.brands) ? datosAgente.brands : [];
  // Primero se busca en las marcas declaradas; si no, en el texto del agente
  for (const [marca, patron, nombre] of NAVEGADORES) {
    const encontrada = marcas.find((entrada) => entrada.brand === marca);
    if (encontrada) {
      return `${nombre} ${encontrada.version}`;
    }
    const coincidencia = String(textoAgente ?? "").match(patron);
    if (coincidencia) {
      return `${nombre} ${coincidencia[1]}`;
    }
  }
  return "Otro navegador";
}

/**
 * Convierte la entrada de Navigation Timing en el dato de carga.
 * @param {{startTime: number, loadEventEnd: number, type: string}|undefined} entrada - performance.getEntriesByType("navigation")[0].
 * @param {number} origenTiempo_ms - performance.timeOrigin (ms desde 1970), para la fecha y hora.
 * @param {string} navegador - Nombre del navegador.
 * @returns {{tiempo_ms: number|null, tipo: string, fecha: Date, navegador: string}} Dato de carga (tiempo null si no se pudo medir).
 */
export function resumirCarga(entrada, origenTiempo_ms, navegador) {
  const terminoCarga = typeof entrada?.loadEventEnd === "number" && entrada.loadEventEnd > 0;
  return Object.freeze({
    tiempo_ms: terminoCarga ? Math.round(entrada.loadEventEnd - entrada.startTime) : null,
    tipo: TIPOS_DE_CARGA[entrada?.type] ?? NO_DISPONIBLE,
    fecha: new Date(origenTiempo_ms),
    navegador,
  });
}

/**
 * Texto corto, por ejemplo "Tiempo de carga de esta página: 412 ms".
 * @param {{tiempo_ms: number|null}|null} carga - Dato de carga.
 * @returns {string} Texto.
 */
export function textoTiempoCarga(carga) {
  const valor = carga?.tiempo_ms ?? null;
  return `${PREFIJO_TIEMPO_CARGA} ${valor === null ? NO_DISPONIBLE : `${valor} ms`}`;
}

/**
 * Detalle de la carga: navegador, fecha y hora, y tipo.
 * @param {{navegador: string, fecha: Date, tipo: string}|null} carga - Dato de carga.
 * @returns {string} Por ejemplo "Microsoft Edge 157 · 13/11/26, 2:30:05 p. m. · carga normal".
 */
export function detalleCarga(carga) {
  if (!carga) {
    return NO_DISPONIBLE;
  }
  return `${carga.navegador} · ${carga.fecha.toLocaleString(IDIOMA_FECHAS, FORMATO_FECHA_CARGA)} · ${carga.tipo}`;
}

/**
 * Mide la carga de la página. Espera a que termine el evento "load" (antes
 * de eso loadEventEnd todavía vale 0) y lee Navigation Timing.
 * @returns {Promise<Readonly<object>>} Dato de carga.
 */
export function medirCargaPagina() {
  return new Promise((resolver) => {
    /** Lee la medición cuando el evento load ya terminó. */
    const leer = () => {
      const [entrada] = performance.getEntriesByType("navigation");
      resolver(resumirCarga(entrada, performance.timeOrigin, nombreNavegador(navigator.userAgentData, navigator.userAgent)));
    };
    // loadEventEnd se escribe al TERMINAR los manejadores de load: se lee en la siguiente vuelta
    if (document.readyState === "complete") {
      window.setTimeout(leer, 0);
    } else {
      window.addEventListener("load", () => window.setTimeout(leer, 0), { once: true });
    }
  });
}
