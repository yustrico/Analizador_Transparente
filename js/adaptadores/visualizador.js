/**
 * ============================================================================
 * Título: Visualizador del circuito
 * Descripción: Dibuja en SVG el circuito de la prueba: la red de 120 V, los
 *   conmutadores de polaridad, neutro y tierra (PE), el chasis del R12 con sus
 *   capacitancias de fuga (C_L, C_N), la barrera de la parte aplicada (C_AP)
 *   y la red de medición MD (la persona). Después de medir, resalta en rojo
 *   el camino de la corriente y lo anima con requestAnimationFrame. El camino
 *   y los valores salen de la MISMA medición del motor de cálculo (M4), así
 *   el dibujo nunca contradice al número.
 *   La animación se detiene cuando no hace falta (pestaña oculta, otra
 *   sección o usuario que prefiere menos movimiento) para ahorrar CPU (ES15).
 * Módulo: M6 – Visualizador (adaptador)
 * Autores: Yustin Rico, David Cardona, Santiago González
 * Creado: 2026-11-13 · Modificado: 2026-11-13
 * ============================================================================
 */

/** Espacio de nombres de SVG (obligatorio para crear elementos SVG). */
const ESPACIO_SVG = "http://www.w3.org/2000/svg";

/** Velocidad de los guiones rojos que se mueven por el camino (px/s). */
const VELOCIDAD_GUIONES_PX_S = 40;

/** Largo de un ciclo guion + espacio; debe coincidir con stroke-dasharray del CSS (10 + 8). */
const PERIODO_GUIONES_PX = 18;

/** Milisegundos por segundo. */
const MILISEGUNDOS_POR_SEGUNDO = 1000;

/** Por debajo de este valor (µA) la corriente se muestra con cifras significativas, no con decimales fijos. */
const UMBRAL_VALOR_PEQUENO_UA = 0.01;

/** Decimales de las lecturas normales y cifras significativas de las muy pequeñas. */
const DECIMALES_LECTURA = 2;
const CIFRAS_VALOR_PEQUENO = 3;

/**
 * Coordenadas (x, y) de cada punto del dibujo, en unidades del viewBox (780 × 380).
 * Tener los puntos con nombre permite describir cada cable y cada camino de
 * corriente como una lista de puntos que se lee como una frase.
 */
const PUNTOS = Object.freeze({
  fuenteArriba: [60, 134],
  fuenteAbajo: [60, 186],
  esquinaL: [60, 90],
  esquinaN: [60, 230],
  neutroInicio: [95, 230],
  neutroFin: [135, 230],
  neutroAbiertoPunta: [130, 212],
  entradaPolaridadL: [150, 90],
  entradaPolaridadN: [150, 230],
  salidaPolaridadL: [230, 90],
  salidaPolaridadN: [230, 230],
  cargaArribaL: [400, 90],
  cargaAbajoN: [400, 230],
  cargaCajaArriba: [400, 135],
  cargaCajaAbajo: [400, 185],
  cargaCentro: [400, 160],
  cargaSalida: [415, 160],
  capLlinea: [500, 90],
  capLplacaInferior: [500, 78],
  capLplacaSuperior: [500, 70],
  capLchasis: [500, 55],
  capNlinea: [500, 230],
  capNplacaSuperior: [500, 262],
  capNplacaInferior: [500, 270],
  capNchasis: [500, 300],
  capAPentrada: [548, 160],
  capAPsalida: [556, 160],
  parteEntrada: [600, 160],
  parteEsquina: [600, 185],
  parteAbajo: [660, 185],
  chasisSupIzq: [330, 55],
  chasisInfIzq: [330, 300],
  chasisSupDer: [570, 55],
  chasisInfDer: [570, 300],
  puntoContacto: [570, 100],
  contactoDer: [740, 100],
  contactoBajada: [740, 215],
  nodoMD: [660, 215],
  mdArriba: [660, 235],
  mdAbajo: [660, 275],
  mdTierra: [660, 340],
  peChasis: [440, 300],
  peInterruptorArriba: [440, 308],
  peInterruptorAbajo: [440, 328],
  peAbiertoPunta: [425, 324],
  peTierra: [440, 340],
  tierraFuente: [60, 340],
});

/** Cables fijos del dibujo (siempre grises), como listas de puntos. */
const CABLES_FIJOS = Object.freeze([
  ["fuenteArriba", "esquinaL", "entradaPolaridadL"],
  ["fuenteAbajo", "esquinaN", "neutroInicio"],
  ["neutroFin", "entradaPolaridadN"],
  ["esquinaN", "tierraFuente", "mdTierra"],
  ["salidaPolaridadL", "cargaArribaL", "capLlinea", "capLplacaInferior"],
  ["capLplacaSuperior", "capLchasis"],
  ["salidaPolaridadN", "cargaAbajoN", "capNlinea", "capNplacaSuperior"],
  ["capNplacaInferior", "capNchasis"],
  ["cargaArribaL", "cargaCajaArriba"],
  ["cargaCajaAbajo", "cargaAbajoN"],
  ["cargaSalida", "capAPentrada"],
  ["capAPsalida", "parteEntrada"],
  ["peChasis", "peInterruptorArriba"],
  ["peInterruptorAbajo", "peTierra"],
  ["nodoMD", "mdArriba"],
  ["mdAbajo", "mdTierra"],
]);

/** Cable de la punta de contacto (chasis → MD) y cable de los electrodos (parte aplicada → MD). */
const CABLE_CONTACTO = Object.freeze(["puntoContacto", "contactoDer", "contactoBajada", "nodoMD"]);
const CABLE_PACIENTE = Object.freeze(["parteAbajo", "nodoMD"]);

/** Tramos de los caminos de corriente (se unen para formar cada camino completo). */
const TRAMO_FUENTE_VIVO = Object.freeze(["fuenteArriba", "esquinaL", "entradaPolaridadL"]);
const TRAMO_REGRESO = Object.freeze(["tierraFuente", "esquinaN", "fuenteAbajo"]);
const TRAMO_POR_MD = Object.freeze(["nodoMD", "mdArriba", "mdAbajo", "mdTierra"]);
const TRAMO_POR_PE = Object.freeze(["peChasis", "peInterruptorArriba", "peInterruptorAbajo", "peTierra"]);

/**
 * Formatea una corriente en µA para mostrarla: 2 decimales, o 3 cifras
 * significativas si es muy pequeña (por ejemplo 0.0000383).
 * @param {number} corriente_uA - Corriente en µA.
 * @returns {string} Texto del número (sin la unidad).
 */
export function formatearCorriente_uA(corriente_uA) {
  if (corriente_uA !== 0 && Math.abs(corriente_uA) < UMBRAL_VALOR_PEQUENO_UA) {
    return String(Number(corriente_uA.toPrecision(CIFRAS_VALOR_PEQUENO)));
  }
  return corriente_uA.toFixed(DECIMALES_LECTURA);
}

/**
 * Crea un elemento SVG con sus atributos y lo agrega a un padre.
 * @param {string} etiqueta - Nombre del elemento ("line", "path", "text"...).
 * @param {object} atributos - Atributos del elemento.
 * @param {Element} padre - Elemento donde se agrega.
 * @returns {SVGElement} El elemento creado.
 */
function crearElementoSvg(etiqueta, atributos, padre) {
  const elemento = document.createElementNS(ESPACIO_SVG, etiqueta);
  // Copia cada atributo al elemento
  for (const [nombre, valor] of Object.entries(atributos)) {
    elemento.setAttribute(nombre, String(valor));
  }
  padre.appendChild(elemento);
  return elemento;
}

/**
 * Convierte una lista de nombres de puntos en el texto del atributo "points".
 * @param {readonly string[]} nombres - Nombres de puntos de PUNTOS.
 * @returns {string} Por ejemplo "60,134 60,90 150,90".
 */
function puntosComoTexto(nombres) {
  return nombres.map((nombre) => PUNTOS[nombre].join(",")).join(" ");
}

/**
 * Dibuja una línea quebrada (cable) siguiendo una lista de puntos.
 * @param {readonly string[]} nombres - Nombres de los puntos.
 * @param {string} clase - Clase CSS.
 * @param {Element} padre - Grupo SVG donde se dibuja.
 * @returns {SVGPolylineElement} El cable dibujado.
 */
function dibujarCable(nombres, clase, padre) {
  return crearElementoSvg("polyline", { points: puntosComoTexto(nombres), class: clase }, padre);
}

/**
 * Escribe un texto en el dibujo.
 * @param {string} contenido - Texto a mostrar.
 * @param {number} x - Posición horizontal.
 * @param {number} y - Posición vertical (línea base).
 * @param {Element} padre - Grupo SVG.
 * @param {string} [clase="texto-circuito"] - Clase CSS.
 * @param {string} [ancla="middle"] - Alineación: "start", "middle" o "end".
 * @returns {SVGTextElement} El texto creado.
 */
function escribirTexto(contenido, x, y, padre, clase = CLASE_TEXTO, ancla = "middle") {
  const texto = crearElementoSvg("text", { x, y, class: clase, "text-anchor": ancla }, padre);
  texto.textContent = contenido;
  return texto;
}

/**
 * Dibuja las placas de un capacitor entre dos puntos.
 * @param {string} puntoA - Nombre del punto de la primera placa.
 * @param {string} puntoB - Nombre del punto de la segunda placa.
 * @param {boolean} esVertical - true si las placas son verticales (cable horizontal).
 * @param {Element} padre - Grupo SVG.
 */
function dibujarCapacitor(puntoA, puntoB, esVertical, padre) {
  const MEDIO_LARGO_PLACA = 12;
  // Una placa en cada punto, perpendicular al cable
  for (const nombre of [puntoA, puntoB]) {
    const [x, y] = PUNTOS[nombre];
    const extremos = esVertical
      ? { x1: x, y1: y - MEDIO_LARGO_PLACA, x2: x, y2: y + MEDIO_LARGO_PLACA }
      : { x1: x - MEDIO_LARGO_PLACA, y1: y, x2: x + MEDIO_LARGO_PLACA, y2: y };
    crearElementoSvg("line", { ...extremos, class: "placa-capacitor" }, padre);
  }
}

/** Rectángulos y círculos fijos del dibujo (elemento SVG + atributos). */
const FIGURAS_FIJAS = Object.freeze([
  { etiqueta: "rect", atributos: { x: 330, y: 55, width: 240, height: 245, rx: 6, class: "chasis" } },
  { etiqueta: "rect", atributos: { x: 150, y: 75, width: 80, height: 170, rx: 6, class: "cable cable--inactivo" } },
  { etiqueta: "circle", atributos: { cx: 60, cy: 160, r: 26, class: "caja-componente" } },
  { etiqueta: "rect", atributos: { x: 385, y: 135, width: 30, height: 50, class: "caja-componente" } },
  { etiqueta: "rect", atributos: { x: 600, y: 135, width: 120, height: 50, rx: 6, class: "caja-componente" } },
  { etiqueta: "rect", atributos: { x: 620, y: 235, width: 80, height: 40, class: "caja-componente" } },
  // Símbolo de tierra en la acometida (tres rayas)
  { etiqueta: "line", atributos: { x1: 48, y1: 346, x2: 72, y2: 346, class: "cable" } },
  { etiqueta: "line", atributos: { x1: 53, y1: 352, x2: 67, y2: 352, class: "cable" } },
  { etiqueta: "line", atributos: { x1: 57, y1: 358, x2: 63, y2: 358, class: "cable" } },
]);

/** Clases CSS de los textos del dibujo. */
const CLASE_TEXTO = "texto-circuito";
const CLASE_TITULO = "texto-circuito texto-circuito--titulo";
const CLASE_PEQUENO = "texto-circuito texto-circuito--pequeno";
const CLASE_VALOR = "texto-circuito texto-circuito--valor";

/** Textos fijos del dibujo: [contenido, x, y, clase, alineación]. */
const TEXTOS_FIJOS = Object.freeze([
  ["~", 60, 167, CLASE_TITULO, "middle"],
  ["Red", 60, 38, CLASE_TITULO, "middle"],
  ["120 V · 60 Hz", 60, 56, CLASE_PEQUENO, "middle"],
  ["L", 44, 94, CLASE_TITULO, "middle"],
  ["N", 44, 226, CLASE_TITULO, "middle"],
  ["Neutro", 115, 254, CLASE_PEQUENO, "middle"],
  ["Polaridad", 190, 68, CLASE_PEQUENO, "middle"],
  ["Chasis metálico del R12 (Clase I)", 450, 46, CLASE_TITULO, "middle"],
  ["Circuito", 378, 156, CLASE_PEQUENO, "end"],
  ["interno", 378, 170, CLASE_PEQUENO, "end"],
  ["C_L", 518, 79, CLASE_TEXTO, "start"],
  ["C_N", 518, 271, CLASE_TEXTO, "start"],
  ["C_AP", 552, 140, CLASE_TEXTO, "middle"],
  ["Parte aplicada", 660, 156, CLASE_TITULO, "middle"],
  ["CF (electrodos)", 660, 172, CLASE_PEQUENO, "middle"],
  ["Punta de contacto", 655, 92, CLASE_PEQUENO, "middle"],
  ["MD 1 kΩ", 660, 253, CLASE_TEXTO, "middle"],
  ["(persona)", 660, 268, CLASE_PEQUENO, "middle"],
  ["Conductor de protección (PE)", 430, 322, CLASE_PEQUENO, "end"],
  ["Tierra de la instalación", 250, 360, CLASE_PEQUENO, "middle"],
]);

/** Posición de los textos que cambian: estado de los conmutadores y corriente por rama. */
const POSICION_ESTADO_NEUTRO = Object.freeze([115, 270]);
const POSICION_ESTADO_POLARIDAD = Object.freeze([190, 262]);
const POSICION_VALOR_PERSONA = Object.freeze([668, 318]);
const POSICION_VALOR_TIERRA = Object.freeze([452, 322]);

/**
 * Dibuja las partes que no cambian: fuente, chasis, cajas, cables, capacitores y textos.
 * @param {Element} padre - Grupo SVG.
 */
function dibujarPartesFijas(padre) {
  // Chasis, cajas de componentes y símbolo de tierra
  for (const figura of FIGURAS_FIJAS) {
    crearElementoSvg(figura.etiqueta, figura.atributos, padre);
  }

  // Cables fijos
  for (const cable of CABLES_FIJOS) {
    dibujarCable(cable, "cable", padre);
  }

  // Capacitores de fuga (C_L, C_N) y de la barrera de aislamiento (C_AP)
  dibujarCapacitor("capLplacaInferior", "capLplacaSuperior", false, padre);
  dibujarCapacitor("capNplacaSuperior", "capNplacaInferior", false, padre);
  dibujarCapacitor("capAPentrada", "capAPsalida", true, padre);

  // Textos fijos
  for (const [contenido, x, y, clase, ancla] of TEXTOS_FIJOS) {
    escribirTexto(contenido, x, y, padre, clase, ancla);
  }
}

/**
 * Dibuja un conmutador de dos contactos (abierto o cerrado).
 * @param {string} inicio - Punto fijo (pivote).
 * @param {string} finCerrado - Punto donde toca cuando está cerrado.
 * @param {string} puntaAbierta - Punto donde queda la cuchilla cuando está abierto.
 * @param {boolean} cerrado - Estado del conmutador.
 * @param {Element} padre - Grupo SVG.
 */
function dibujarInterruptor(inicio, finCerrado, puntaAbierta, cerrado, padre) {
  const RADIO_CONTACTO = 3;
  dibujarCable([inicio, cerrado ? finCerrado : puntaAbierta], "cable", padre);
  // Círculos de los dos contactos
  for (const nombre of [inicio, finCerrado]) {
    crearElementoSvg("circle", { cx: PUNTOS[nombre][0], cy: PUNTOS[nombre][1], r: RADIO_CONTACTO, class: "contacto-conmutador" }, padre);
  }
}

/**
 * Arma los caminos de la corriente para una medición, como listas de puntos,
 * cada uno marcado como "principal" (corriente grande) o "minimo" (casi nada).
 * @param {{tipoMedicion: string, condicion: object}} medicion - Medición del motor (M4).
 * @returns {{puntos: string[], tipo: string}[]} Caminos a dibujar.
 */
function construirCaminos(medicion) {
  const { polaridad, tierra, neutro } = medicion.condicion;
  const esNormal = polaridad === "normal";
  const tramoVivo = [...TRAMO_FUENTE_VIVO, esNormal ? "salidaPolaridadL" : "salidaPolaridadN"];

  // Corriente de paciente: red → circuito interno → C_AP → electrodos → MD → tierra
  if (medicion.tipoMedicion === "paciente") {
    const hastaCarga = esNormal
      ? ["cargaArribaL", "cargaCajaArriba", "cargaCentro"]
      : ["cargaAbajoN", "cargaCajaAbajo", "cargaCentro"];
    return [{
      puntos: [...tramoVivo, ...hastaCarga, "cargaSalida", "capAPentrada", "capAPsalida", "parteEntrada",
        "parteEsquina", "parteAbajo", ...TRAMO_POR_MD, ...TRAMO_REGRESO],
      tipo: "principal",
    }];
  }

  // Corriente de contacto: primero, qué capacitores de fuga reciben la fase
  const viaCL = ["cargaArribaL", "capLlinea", "capLchasis"];
  const viaCN = ["cargaAbajoN", "capNlinea", "capNchasis"];
  const tramosHastaChasis = [esNormal ? [...tramoVivo, ...viaCL] : [...tramoVivo, ...viaCN]];
  if (neutro === "abierto") {
    // Con el neutro abierto la fase pasa por el circuito interno y energiza el otro capacitor
    tramosHastaChasis.push(esNormal ? [...tramoVivo, "cargaArribaL", ...viaCN] : [...tramoVivo, "cargaAbajoN", ...viaCL]);
  }

  // Después, del chasis a tierra: por el PE (si está cerrado) y por la persona (MD)
  const caminos = [];
  for (const tramo of tramosHastaChasis) {
    const salidaChasis = tramo[tramo.length - 1];
    const esquinaPE = salidaChasis === "capLchasis" ? ["chasisSupIzq", "chasisInfIzq"] : [];
    const esquinaContacto = salidaChasis === "capLchasis" ? ["chasisSupDer"] : ["chasisInfDer"];
    const porPersona = [...tramo, ...esquinaContacto, ...CABLE_CONTACTO, ...TRAMO_POR_MD.slice(1), ...TRAMO_REGRESO];
    if (tierra === "cerrada") {
      caminos.push({ puntos: [...tramo, ...esquinaPE, ...TRAMO_POR_PE, ...TRAMO_REGRESO], tipo: "principal" });
      caminos.push({ puntos: porPersona, tipo: "minimo" });
    } else {
      caminos.push({ puntos: porPersona, tipo: "principal" });
    }
  }
  return caminos;
}

/**
 * Crea el visualizador sobre un elemento <svg> vacío.
 * @param {SVGSVGElement} svg - Elemento SVG de la página.
 * @returns {{mostrarCondicion: Function, mostrarCamino: Function, borrarCamino: Function, establecerVisible: Function}}
 *   Funciones para actualizar el dibujo.
 */
export function crearVisualizador(svg) {
  const grupoFijo = crearElementoSvg("g", {}, svg);
  const grupoConmutadores = crearElementoSvg("g", {}, svg);
  const grupoCamino = crearElementoSvg("g", {}, svg);
  const grupoValores = crearElementoSvg("g", {}, svg);
  dibujarPartesFijas(grupoFijo);

  const preferenciaMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)");
  const animacion = { idCuadro: null, ultimoTiempo: null, desplazamiento: 0, visible: false, caminos: [] };

  /**
   * Indica si vale la pena animar ahora mismo.
   * @returns {boolean} true si hay camino, la sección se ve, la pestaña está activa y se permite movimiento.
   */
  function debeAnimar() {
    return animacion.caminos.length > 0 && animacion.visible && !document.hidden && !preferenciaMovimiento.matches;
  }

  /**
   * Un cuadro de la animación: corre los guiones según el tiempo que pasó.
   * @param {number} tiempoActual_ms - Marca de tiempo que da requestAnimationFrame (ms).
   */
  function animarCuadro(tiempoActual_ms) {
    if (animacion.ultimoTiempo !== null) {
      const tiempoTranscurrido_s = (tiempoActual_ms - animacion.ultimoTiempo) / MILISEGUNDOS_POR_SEGUNDO;
      animacion.desplazamiento = (animacion.desplazamiento - VELOCIDAD_GUIONES_PX_S * tiempoTranscurrido_s) % PERIODO_GUIONES_PX;
    }
    animacion.ultimoTiempo = tiempoActual_ms;
    // Mueve los guiones de cada camino
    for (const camino of animacion.caminos) {
      camino.setAttribute("stroke-dashoffset", animacion.desplazamiento.toFixed(1));
    }
    animacion.idCuadro = window.requestAnimationFrame(animarCuadro);
  }

  /** Detiene la animación (no gasta CPU mientras está quieta). */
  function detenerAnimacion() {
    if (animacion.idCuadro !== null) {
      window.cancelAnimationFrame(animacion.idCuadro);
    }
    animacion.idCuadro = null;
    animacion.ultimoTiempo = null;
  }

  /** Arranca o detiene la animación según si hace falta. */
  function actualizarAnimacion() {
    if (debeAnimar() && animacion.idCuadro === null) {
      animacion.idCuadro = window.requestAnimationFrame(animarCuadro);
    } else if (!debeAnimar()) {
      detenerAnimacion();
    }
  }

  document.addEventListener("visibilitychange", actualizarAnimacion);
  preferenciaMovimiento.addEventListener("change", actualizarAnimacion);

  /**
   * Dibuja los conmutadores y la conexión de la MD según la condición y la medición elegidas.
   * @param {{polaridad: string, tierra: string, neutro: string}} condicion - Condición de prueba.
   * @param {string} tipoMedicion - "contacto" o "paciente".
   */
  function mostrarCondicion(condicion, tipoMedicion) {
    grupoConmutadores.replaceChildren();
    // Conmutador de polaridad: directo (normal) o cruzado (invertida)
    if (condicion.polaridad === "normal") {
      dibujarCable(["entradaPolaridadL", "salidaPolaridadL"], "cable", grupoConmutadores);
      dibujarCable(["entradaPolaridadN", "salidaPolaridadN"], "cable", grupoConmutadores);
    } else {
      dibujarCable(["entradaPolaridadL", "salidaPolaridadN"], "cable", grupoConmutadores);
      dibujarCable(["entradaPolaridadN", "salidaPolaridadL"], "cable", grupoConmutadores);
    }
    dibujarInterruptor("neutroInicio", "neutroFin", "neutroAbiertoPunta", condicion.neutro === "cerrado", grupoConmutadores);
    dibujarInterruptor("peInterruptorArriba", "peInterruptorAbajo", "peAbiertoPunta", condicion.tierra === "cerrada", grupoConmutadores);
    // La MD se conecta a la punta de contacto o a los electrodos, según la medición
    const esContacto = tipoMedicion === "contacto";
    dibujarCable(CABLE_CONTACTO, esContacto ? "cable" : "cable cable--inactivo", grupoConmutadores);
    dibujarCable(CABLE_PACIENTE, esContacto ? "cable cable--inactivo" : "cable", grupoConmutadores);
    escribirTexto(condicion.neutro, ...POSICION_ESTADO_NEUTRO, grupoConmutadores, CLASE_PEQUENO);
    escribirTexto(condicion.polaridad, ...POSICION_ESTADO_POLARIDAD, grupoConmutadores, CLASE_PEQUENO);
  }

  /** Borra el camino rojo y los valores (por ejemplo, al cambiar la condición). */
  function borrarCamino() {
    grupoCamino.replaceChildren();
    grupoValores.replaceChildren();
    animacion.caminos = [];
    actualizarAnimacion();
  }

  /**
   * Dibuja en rojo el camino de la corriente de una medición y escribe los valores por rama.
   * @param {{tipoMedicion: string, condicion: object, ramas: object}} medicion - Medición del motor (M4).
   */
  function mostrarCamino(medicion) {
    borrarCamino();
    mostrarCondicion(medicion.condicion, medicion.tipoMedicion);
    // Dibuja cada camino (grueso si lleva casi toda la corriente, delgado si casi nada)
    for (const camino of construirCaminos(medicion)) {
      animacion.caminos.push(dibujarCable(camino.puntos, `camino-corriente camino-corriente--${camino.tipo}`, grupoCamino));
    }
    // Valores por rama, calculados por el motor
    escribirTexto(`${formatearCorriente_uA(medicion.ramas.porPersona_uA)} µA`, ...POSICION_VALOR_PERSONA, grupoValores, CLASE_VALOR, "start");
    if (medicion.tipoMedicion === "contacto" && medicion.condicion.tierra === "cerrada") {
      escribirTexto(`${formatearCorriente_uA(medicion.ramas.porTierra_uA)} µA`, ...POSICION_VALOR_TIERRA, grupoValores, CLASE_VALOR, "start");
    }
    actualizarAnimacion();
  }

  /**
   * Avisa si la sección del analizador está a la vista (para pausar la animación si no).
   * @param {boolean} estaVisible - true si la sección se está mostrando.
   */
  function establecerVisible(estaVisible) {
    animacion.visible = estaVisible;
    actualizarAnimacion();
  }

  return { mostrarCondicion, mostrarCamino, borrarCamino, establecerVisible };
}
