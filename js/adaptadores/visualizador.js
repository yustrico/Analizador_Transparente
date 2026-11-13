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
 *   sección, usuario que prefiere menos movimiento o 30 s sin que el
 *   estudiante toque el mouse ni el teclado) para ahorrar CPU (ES15). El
 *   camino rojo sigue dibujado; solo dejan de moverse los guiones.
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

/**
 * Cuadros por segundo de la animación. Los guiones avanzan solo 40 px/s, así
 * que 30 cuadros/s se ven igual de suaves que 60 y redibujan la mitad (ES15).
 */
const CUADROS_POR_SEGUNDO = 30;
const INTERVALO_CUADRO_MS = MILISEGUNDOS_POR_SEGUNDO / CUADROS_POR_SEGUNDO;

/** Margen para el redondeo de las marcas de tiempo del navegador (ms). */
const TOLERANCIA_CUADRO_MS = 2;

/** Tiempo sin mover el mouse ni tocar el teclado tras el cual la animación se detiene (reposo). */
const TIEMPO_REPOSO_MS = 30 * MILISEGUNDOS_POR_SEGUNDO;

/** Acciones del estudiante que lo sacan del reposo. */
const EVENTOS_DE_ACTIVIDAD = Object.freeze(["pointermove", "pointerdown", "keydown", "wheel", "touchstart"]);

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
  ["C_L: fuga fase–chasis", 484, 80, CLASE_PEQUENO, "end"],
  ["C_N: fuga neutro–chasis", 484, 271, CLASE_PEQUENO, "end"],
  ["C_AP: aislamiento", 490, 132, CLASE_PEQUENO, "middle"],
  ["de electrodos", 490, 145, CLASE_PEQUENO, "middle"],
  ["Parte aplicada", 660, 156, CLASE_TITULO, "middle"],
  ["CF (electrodos)", 660, 172, CLASE_PEQUENO, "middle"],
  ["Punta de contacto", 655, 92, CLASE_PEQUENO, "middle"],
  ["MD", 660, 260, CLASE_TITULO, "middle"],
  ["MD: cuerpo humano", 708, 251, CLASE_PEQUENO, "start"],
  ["simulado (1 kΩ)", 708, 265, CLASE_PEQUENO, "start"],
  ["Conductor de protección (PE)", 416, 322, CLASE_PEQUENO, "end"],
  ["Tierra de la instalación", 250, 360, CLASE_PEQUENO, "middle"],
]);

/**
 * Zonas invisibles sobre cada parte del dibujo. Al pasar el mouse por una
 * zona aparece la explicación de esa parte (elemento <title> de SVG).
 * Se dibujan en este orden: las zonas grandes (chasis) primero, para que las
 * pequeñas que están adentro queden encima y respondan primero.
 */
const ZONAS_DE_AYUDA = Object.freeze([
  { parte: "chasis", x: 326, y: 36, width: 248, height: 268 },
  { parte: "red", x: 28, y: 28, width: 64, height: 40 },
  { parte: "red", x: 32, y: 132, width: 56, height: 56 },
  { parte: "fase", x: 36, y: 80, width: 114, height: 20 },
  { parte: "fase", x: 50, y: 96, width: 20, height: 36 },
  { parte: "neutro", x: 36, y: 220, width: 59, height: 20 },
  { parte: "neutro", x: 50, y: 188, width: 20, height: 32 },
  { parte: "interruptorNeutro", x: 90, y: 204, width: 52, height: 72 },
  { parte: "polaridad", x: 146, y: 58, width: 88, height: 212 },
  { parte: "circuitoInterno", x: 338, y: 130, width: 82, height: 60 },
  { parte: "capacitanciaL", x: 372, y: 62, width: 150, height: 22 },
  { parte: "capacitanciaN", x: 372, y: 254, width: 150, height: 24 },
  { parte: "capacitanciaAP", x: 436, y: 120, width: 126, height: 56 },
  { parte: "parteAplicada", x: 598, y: 133, width: 124, height: 54 },
  { parte: "puntaContacto", x: 574, y: 82, width: 176, height: 24 },
  { parte: "puntaContacto", x: 730, y: 100, width: 20, height: 118 },
  { parte: "md", x: 616, y: 231, width: 200, height: 48 },
  { parte: "conductorProteccion", x: 272, y: 302, width: 176, height: 36 },
  { parte: "tierraInstalacion", x: 36, y: 338, width: 640, height: 30 },
]);

/** Conversión de faradios a picofaradios, para mostrar las capacitancias. */
const PICOFARADIOS_POR_FARADIO = 1e12;
const DECIMALES_CAPACITANCIA = 1;

/**
 * Nombre y explicación sencilla de cada parte del circuito. La usan los
 * <title> del dibujo y el cuadro "¿Qué es cada parte?" de la interfaz, así
 * las dos explicaciones nunca se contradicen. Los valores salen del JSON.
 * @param {object} parametros - Parámetros validados (M3).
 * @returns {Readonly<{id: string, nombre: string, explicacion: string, enCuadro: boolean}[]>}
 *   Partes en el orden del cuadro; enCuadro indica si van en el cuadro (las demás solo en el dibujo).
 */
export function describirPartesDelCircuito(parametros) {
  const capacitancia_pF = (nombre) =>
    (parametros.capacitancias_F[nombre] * PICOFARADIOS_POR_FARADIO).toFixed(DECIMALES_CAPACITANCIA);
  const { V_rms, f_Hz } = parametros.red;
  return Object.freeze([
    { id: "fase", nombre: "L (fase)", enCuadro: true,
      explicacion: `El conductor que trae la tensión de la red (${V_rms} V respecto a tierra). Por él sale la corriente.` },
    { id: "neutro", nombre: "N (neutro)", enCuadro: true,
      explicacion: "El conductor de regreso. Está unido a tierra en la instalación, así que su tensión es casi 0 V." },
    { id: "polaridad", nombre: "Conmutador de polaridad", enCuadro: true,
      explicacion: "Intercambia L y N a la entrada del equipo. En «invertida», la fase llega al equipo por el lado que debería ser el neutro." },
    { id: "interruptorNeutro", nombre: "Interruptor de neutro", enCuadro: true,
      explicacion: "Abre el neutro para simular un cable de neutro roto (primer defecto). Entonces los dos lados del equipo quedan a la tensión de la fase." },
    { id: "conductorProteccion", nombre: "Conductor de protección (PE)", enCuadro: true,
      explicacion: `El cable de tierra que une el chasis metálico con la tierra de la instalación (≈ ${parametros.R_PE_ohm} Ω). Al abrirlo se simula la tierra rota (primer defecto).` },
    { id: "capacitanciaL", nombre: `C_L (${capacitancia_pF("C_L")} pF)`, enCuadro: true,
      explicacion: "Capacitancia de fuga entre la fase y el chasis. No es una pieza que se pueda ver: es el acople natural, a través del aislamiento, entre los cables con tensión y la carcasa metálica. Por ahí se «escapa» la corriente de fuga." },
    { id: "capacitanciaN", nombre: `C_N (${capacitancia_pF("C_N")} pF)`, enCuadro: true,
      explicacion: "Capacitancia de fuga entre el neutro y el chasis. Es igual que C_L, pero del lado del neutro. En el R12 las dos son casi iguales." },
    { id: "capacitanciaAP", nombre: `C_AP (${capacitancia_pF("C_AP")} pF)`, enCuadro: true,
      explicacion: "Capacitancia del aislamiento entre la red y los electrodos. Es la barrera que separa la parte aplicada de la red; una corriente muy pequeña la cruza hacia el paciente." },
    { id: "parteAplicada", nombre: "Parte aplicada CF", enCuadro: true,
      explicacion: "Los electrodos de ECG y el cable de paciente: lo que toca al paciente. Es tipo CF porque puede quedar cerca del corazón, por eso tiene los límites más estrictos." },
    { id: "md", nombre: "MD (cuerpo humano simulado)", enCuadro: true,
      explicacion: "Es el circuito que usa el analizador para imitar el cuerpo humano (IEC 60601-1). Aquí se simplifica como una resistencia de 1 kΩ; el real también tiene una red de 10 kΩ y 0,015 µF que imita cómo responde el cuerpo a la frecuencia." },
    { id: "red", nombre: "Red eléctrica", enCuadro: false,
      explicacion: `La red de ${V_rms} V y ${f_Hz} Hz, como un tomacorriente en Colombia.` },
    { id: "chasis", nombre: "Chasis del R12", enCuadro: false,
      explicacion: "La carcasa metálica del equipo. El R12 es Clase I: su protección contra el choque depende de que el chasis esté unido a tierra por el conductor de protección." },
    { id: "circuitoInterno", nombre: "Circuito interno", enCuadro: false,
      explicacion: "La fuente de alimentación y la electrónica del equipo, conectadas entre L y N." },
    { id: "puntaContacto", nombre: "Punta de contacto", enCuadro: false,
      explicacion: "Punta del analizador que toca el chasis, como lo haría la mano de una persona. Se usa en la medición de corriente de contacto." },
    { id: "tierraInstalacion", nombre: "Tierra de la instalación", enCuadro: false,
      explicacion: "El punto de referencia (0 V) al que regresa la corriente de fuga." },
  ]);
}

/**
 * Dibuja las zonas invisibles con la explicación de cada parte (<title> de SVG).
 * @param {Element} padre - Grupo SVG (va encima de todo el dibujo).
 * @param {object} parametros - Parámetros validados (M3).
 */
function dibujarZonasDeAyuda(padre, parametros) {
  const partesPorId = new Map(describirPartesDelCircuito(parametros).map((parte) => [parte.id, parte]));
  // Una zona por cada rectángulo de ayuda
  for (const { parte, ...rectangulo } of ZONAS_DE_AYUDA) {
    const descripcion = partesPorId.get(parte);
    const grupo = crearElementoSvg("g", { class: "parte-circuito" }, padre);
    const titulo = crearElementoSvg("title", {}, grupo);
    titulo.textContent = `${descripcion.nombre}: ${descripcion.explicacion}`;
    crearElementoSvg("rect", { ...rectangulo, class: "zona-ayuda" }, grupo);
  }
}

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
 * @param {object} parametros - Parámetros validados (M3), para las explicaciones de cada parte.
 * @returns {{mostrarCondicion: Function, mostrarCamino: Function, borrarCamino: Function, establecerVisible: Function}}
 *   Funciones para actualizar el dibujo.
 */
export function crearVisualizador(svg, parametros) {
  const grupoFijo = crearElementoSvg("g", {}, svg);
  const grupoConmutadores = crearElementoSvg("g", {}, svg);
  const grupoCamino = crearElementoSvg("g", {}, svg);
  const grupoValores = crearElementoSvg("g", {}, svg);
  const grupoAyuda = crearElementoSvg("g", {}, svg);
  dibujarPartesFijas(grupoFijo);
  dibujarZonasDeAyuda(grupoAyuda, parametros);

  const preferenciaMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)");
  const animacion = {
    idCuadro: null, ultimoTiempo: null, desplazamiento: 0, visible: false, caminos: [],
    ultimaActividad_ms: performance.now(), enReposo: false,
  };

  /**
   * Indica si vale la pena animar ahora mismo.
   * @returns {boolean} true si hay camino, la sección se ve, la pestaña está activa,
   *   se permite movimiento y el estudiante no está en reposo.
   */
  function debeAnimar() {
    return animacion.caminos.length > 0 && animacion.visible && !document.hidden
      && !preferenciaMovimiento.matches && !animacion.enReposo;
  }

  /**
   * Un cuadro de la animación: corre los guiones según el tiempo que pasó.
   * @param {number} tiempoActual_ms - Marca de tiempo que da requestAnimationFrame (ms).
   */
  function animarCuadro(tiempoActual_ms) {
    // Sin actividad durante TIEMPO_REPOSO_MS: se detiene y no pide más cuadros
    if (tiempoActual_ms - animacion.ultimaActividad_ms > TIEMPO_REPOSO_MS) {
      animacion.enReposo = true;
      detenerAnimacion();
      return;
    }
    // Si todavía no toca dibujar un cuadro nuevo, solo se espera al siguiente (no se redibuja nada)
    if (animacion.ultimoTiempo !== null && tiempoActual_ms - animacion.ultimoTiempo < INTERVALO_CUADRO_MS - TOLERANCIA_CUADRO_MS) {
      animacion.idCuadro = window.requestAnimationFrame(animarCuadro);
      return;
    }
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

  /**
   * Anota que el estudiante hizo algo; si la animación estaba en reposo, la
   * reanuda. Es muy liviana porque se llama con cada movimiento del mouse.
   */
  function registrarActividad() {
    animacion.ultimaActividad_ms = performance.now();
    if (animacion.enReposo) {
      animacion.enReposo = false;
      actualizarAnimacion();
    }
  }

  document.addEventListener("visibilitychange", actualizarAnimacion);
  preferenciaMovimiento.addEventListener("change", actualizarAnimacion);
  // Cualquier acción del estudiante cuenta como actividad (passive: no frena el desplazamiento)
  for (const nombreEvento of EVENTOS_DE_ACTIVIDAD) {
    document.addEventListener(nombreEvento, registrarActividad, { passive: true });
  }

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
