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
 *   También dibuja las CONEXIONES FÍSICAS del laboratorio (qué cable va a qué
 *   borne del ESA620 y del R12) para cada prueba. Los datos de esas
 *   conexiones son puros (CONEXIONES_LABORATORIO, obtenerConexiones) y se
 *   prueban sin navegador; solo dibujarConexiones usa la pantalla.
 * Módulo: M6 – Visualizador (adaptador)
 * Autores: Yustin Rico, David Cardona, Santiago González
 * Creado: 2026-11-13 · Modificado: 2026-11-26
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

/** En el dibujo, por debajo de este valor (µA) la corriente se muestra como «≈ 0 µA». */
const UMBRAL_CASI_CERO_DIBUJO_UA = 0.01;

/** Dígitos en superíndice para escribir exponentes (índice = dígito). */
const DIGITOS_SUPERINDICE = Object.freeze(["⁰", "¹", "²", "³", "⁴", "⁵", "⁶", "⁷", "⁸", "⁹"]);

/** Signo menos en superíndice. */
const MENOS_SUPERINDICE = "⁻";

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
  neutroInicio: [104, 230],
  neutroFin: [140, 230],
  neutroAbiertoPunta: [135, 212],
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
  mdTierra: [660, 356],
  peChasis: [440, 300],
  peInterruptorArriba: [440, 324],
  peInterruptorAbajo: [440, 344],
  peAbiertoPunta: [425, 340],
  peTierra: [440, 356],
  tierraFuente: [60, 356],
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
  ["peChasis", "peInterruptorArriba"],
  ["peInterruptorAbajo", "peTierra"],
  ["nodoMD", "mdArriba"],
  ["mdAbajo", "mdTierra"],
]);

/** Cable de la punta de contacto (chasis → MD) y cable de los electrodos (parte aplicada → MD). */
const CABLE_CONTACTO = Object.freeze(["puntoContacto", "contactoDer", "contactoBajada", "nodoMD"]);
const CABLE_PACIENTE = Object.freeze(["parteAbajo", "nodoMD"]);

/** Medición cuyo camino va solo por el conductor de protección. */
const MEDICION_FUGA_TIERRA = "fuga_tierra";

/** Tramos de los caminos de corriente (se unen para formar cada camino completo). */
const TRAMO_FUENTE_VIVO = Object.freeze(["fuenteArriba", "esquinaL", "entradaPolaridadL"]);
const TRAMO_REGRESO = Object.freeze(["tierraFuente", "esquinaN", "fuenteAbajo"]);
const TRAMO_POR_MD = Object.freeze(["nodoMD", "mdArriba", "mdAbajo", "mdTierra"]);
const TRAMO_POR_PE = Object.freeze(["peChasis", "peInterruptorArriba", "peInterruptorAbajo", "peTierra"]);

/**
 * Siglas con subíndice: una letra (C, k, X, I, R o E), un guion bajo y el
 * subíndice. Por ejemplo C_L, k_N, X_C, C_eq, I_fuga, R_PE o E_n.
 */
const PATRON_SUBINDICE = /\b([CkXIRE])_([A-Za-z]+)\b/g;

/**
 * Parte un texto en trozos normales y trozos que van como subíndice, para
 * escribir "C_L" como C con una L pequeña abajo (sin el guion bajo).
 * Función pura: la usan el dibujo (tspan) y la interfaz (<sub>).
 * @param {string} texto - Texto con siglas como "C_L".
 * @returns {{texto: string, subindice: boolean}[]} Trozos en orden.
 */
export function partirSubindices(texto) {
  const trozos = [];
  let desde = 0;
  // Cada sigla encontrada deja su letra como texto normal y lo demás como subíndice
  for (const encontrada of texto.matchAll(PATRON_SUBINDICE)) {
    const [, letra, subindice] = encontrada;
    trozos.push({ texto: texto.slice(desde, encontrada.index) + letra, subindice: false });
    trozos.push({ texto: subindice, subindice: true });
    desde = encontrada.index + encontrada[0].length;
  }
  trozos.push({ texto: texto.slice(desde), subindice: false });
  return trozos.filter((trozo) => trozo.texto !== "");
}

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
 * Escribe un número en notación científica corta, con una sola cifra y el
 * exponente en superíndice; por ejemplo 7.06e-5 → "7×10⁻⁵".
 * @param {number} valor - Número distinto de cero.
 * @returns {string} Texto en notación científica.
 */
function notacionCientificaCorta(valor) {
  const [mantisa, exponente] = valor.toExponential(0).split("e");
  // Cambia cada carácter del exponente por su superíndice
  const exponenteSuperindice = [...String(Number(exponente))]
    .map((caracter) => (caracter === "-" ? MENOS_SUPERINDICE : DIGITOS_SUPERINDICE[Number(caracter)]))
    .join("");
  return `${mantisa}×10${exponenteSuperindice}`;
}

/**
 * Formatea una corriente para el DIBUJO del circuito, con su unidad. Las
 * corrientes menores de 0.01 µA se escriben «≈ 0 µA» con el valor corto entre
 * paréntesis, por ejemplo «≈ 0 µA (7×10⁻⁵)». La lectura grande no usa esto.
 * @param {number} corriente_uA - Corriente en µA.
 * @returns {string} Texto con la unidad.
 */
export function formatearCorrienteDibujo_uA(corriente_uA) {
  if (corriente_uA !== 0 && Math.abs(corriente_uA) < UMBRAL_CASI_CERO_DIBUJO_UA) {
    return `≈ 0 µA (${notacionCientificaCorta(corriente_uA)})`;
  }
  return `${formatearCorriente_uA(corriente_uA)} µA`;
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
  // Cada trozo como texto normal o como subíndice (tspan más pequeño y más abajo)
  for (const trozo of partirSubindices(contenido)) {
    if (trozo.subindice) {
      crearElementoSvg("tspan", { class: CLASE_SUBINDICE, "baseline-shift": "sub" }, texto).textContent = trozo.texto;
    } else {
      texto.appendChild(document.createTextNode(trozo.texto));
    }
  }
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

/**
 * Contorno del recuadro "Dentro del Fluke ESA620" (x,y en orden): columna de
 * la izquierda (polaridad y neutro), franja de abajo (interruptor de tierra)
 * y columna de la derecha (MD), sin tocar el chasis ni la parte aplicada.
 */
const PUNTOS_RECUADRO_ANALIZADOR = "96,50 250,50 250,318 590,318 590,200 852,200 852,370 96,370";

/** Rectángulos y círculos fijos del dibujo (elemento SVG + atributos). */
const FIGURAS_FIJAS = Object.freeze([
  // Recuadro punteado del Fluke ESA620: encierra los conmutadores (polaridad,
  // neutro, tierra) y la MD; el R12 (chasis y parte aplicada) queda por fuera.
  // Va primero para quedar detrás de todo lo demás.
  { etiqueta: "polygon", atributos: { points: PUNTOS_RECUADRO_ANALIZADOR, class: "recuadro-analizador" } },
  { etiqueta: "rect", atributos: { x: 330, y: 55, width: 240, height: 245, rx: 6, class: "chasis" } },
  { etiqueta: "rect", atributos: { x: 150, y: 75, width: 80, height: 170, rx: 6, class: "cable cable--inactivo" } },
  { etiqueta: "circle", atributos: { cx: 60, cy: 160, r: 26, class: "caja-componente" } },
  { etiqueta: "rect", atributos: { x: 385, y: 135, width: 30, height: 50, class: "caja-componente" } },
  { etiqueta: "rect", atributos: { x: 620, y: 235, width: 80, height: 40, class: "caja-componente" } },
  // Símbolo de tierra en la acometida (tres rayas)
  { etiqueta: "line", atributos: { x1: 48, y1: 362, x2: 72, y2: 362, class: "cable" } },
  { etiqueta: "line", atributos: { x1: 53, y1: 368, x2: 67, y2: 368, class: "cable" } },
  { etiqueta: "line", atributos: { x1: 57, y1: 374, x2: 63, y2: 374, class: "cable" } },
]);

/** Clases CSS de los textos del dibujo. */
const CLASE_TEXTO = "texto-circuito";
const CLASE_TITULO = "texto-circuito texto-circuito--titulo";
const CLASE_PEQUENO = "texto-circuito texto-circuito--pequeno";
const CLASE_SUBINDICE = "texto-circuito__subindice";
const CLASE_TITULO_ANALIZADOR = "texto-circuito texto-circuito--analizador";
const CLASE_LECTURA = "texto-circuito texto-circuito--lectura";
const CLASE_LECTURA_NOTA = "texto-circuito texto-circuito--lectura-nota";
const CLASE_NO_MEDIDA = "texto-circuito texto-circuito--no-medida";

/** Clase del grupo de la rama de la parte aplicada cuando no participa en la prueba (se ve en gris). */
const CLASE_RAMA_INACTIVA = "rama-inactiva";

/** Textos fijos del dibujo: [contenido, x, y, clase, alineación]. */
const TEXTOS_FIJOS = Object.freeze([
  ["~", 60, 167, CLASE_TITULO, "middle"],
  ["Red", 60, 24, CLASE_TITULO, "middle"],
  ["120 V · 60 Hz", 60, 40, CLASE_PEQUENO, "middle"],
  ["L", 44, 94, CLASE_TITULO, "middle"],
  ["N", 44, 226, CLASE_TITULO, "middle"],
  ["Neutro", 122, 254, CLASE_PEQUENO, "middle"],
  ["Polaridad", 190, 68, CLASE_PEQUENO, "middle"],
  ["Chasis metálico del R12 (Clase I)", 450, 46, CLASE_TITULO, "middle"],
  ["Circuito", 378, 156, CLASE_PEQUENO, "end"],
  ["interno", 378, 170, CLASE_PEQUENO, "end"],
  ["C_L: fuga fase–chasis", 484, 80, CLASE_PEQUENO, "end"],
  ["C_N: fuga neutro–chasis", 484, 271, CLASE_PEQUENO, "end"],
  ["Punta de contacto", 655, 92, CLASE_PEQUENO, "middle"],
  ["MD", 660, 260, CLASE_TITULO, "middle"],
  ["Conductor de protección (PE)", 416, 338, CLASE_PEQUENO, "end"],
  ["Tierra de la instalación", 250, 388, CLASE_PEQUENO, "middle"],
  ["Dentro del Fluke ESA620", 844, 362, CLASE_TITULO_ANALIZADOR, "end"],
]);

/**
 * Rama de la parte aplicada: circuito interno → C_AP → electrodos. Va en su
 * propio grupo para poder ponerla en gris cuando la prueba no la usa (contacto).
 */
const CABLES_PARTE_APLICADA = Object.freeze([
  ["cargaSalida", "capAPentrada"],
  ["capAPsalida", "parteEntrada"],
]);
const FIGURA_PARTE_APLICADA = Object.freeze({ x: 600, y: 135, width: 120, height: 50, rx: 6, class: "caja-componente" });
const TEXTOS_PARTE_APLICADA = Object.freeze([
  ["C_AP: aislamiento", 490, 130, CLASE_PEQUENO, "middle"],
  ["de electrodos", 490, 147, CLASE_PEQUENO, "middle"],
  ["Parte aplicada", 660, 156, CLASE_TITULO, "middle"],
  ["CF (electrodos)", 660, 172, CLASE_PEQUENO, "middle"],
]);

/** Mediciones que conoce el dibujo. */
const MEDICION_CONTACTO = "contacto";
const MEDICION_PACIENTE = "paciente";

/**
 * Rótulo de la MD según la medición (dos renglones, para que quepa a la
 * derecha de la MD): en contacto la MD es la persona que toca la carcasa; en
 * paciente CF, el paciente con los electrodos.
 */
const ROTULOS_MD = Object.freeze({
  [MEDICION_CONTACTO]: Object.freeze(["MD: persona que toca", "la carcasa (1 kΩ)"]),
  [MEDICION_PACIENTE]: Object.freeze(["MD: paciente con los", "electrodos (1 kΩ)"]),
  [MEDICION_FUGA_TIERRA]: Object.freeze(["MD: cuerpo humano", "simulado (1 kΩ)"]),
});

/** Nota de debajo del dibujo: solo en contacto con la tierra cerrada (la lectura ≈ 0 parece un error). */
export const NOTA_CONTACTO_TIERRA_CERRADA = "La lectura de arriba es solo la corriente que pasa por la MD (la persona). "
  + "Con la tierra cerrada, casi toda la fuga se va por el conductor de protección; al abrir la tierra, esa corriente pasa por la persona.";

/**
 * Valida el tipo de medición que llega al dibujo.
 * @param {string} tipoMedicion - "contacto", "paciente" o "fuga_tierra".
 * @throws {Error} Si la medición no existe.
 */
function validarTipoMedicionDibujo(tipoMedicion) {
  if (!Object.hasOwn(ROTULOS_MD, tipoMedicion)) {
    throw new Error(`El dibujo no conoce la medición «${tipoMedicion}». Usa contacto, paciente o fuga_tierra.`);
  }
}

/**
 * Rótulo de la MD y si la rama de la parte aplicada va en gris, según la
 * medición elegida. Función pura (se prueba sin navegador).
 * @param {string} tipoMedicion - "contacto", "paciente" o "fuga_tierra".
 * @returns {{lineasRotuloMD: readonly string[], parteAplicadaEnGris: boolean}}
 *   Renglones del rótulo y true si los electrodos no participan (contacto).
 */
export function describirRotuloMD(tipoMedicion) {
  validarTipoMedicionDibujo(tipoMedicion);
  return { lineasRotuloMD: ROTULOS_MD[tipoMedicion], parteAplicadaEnGris: tipoMedicion === MEDICION_CONTACTO };
}

/**
 * Renglones de la etiqueta «LECTURA»: el mismo valor de la lectura grande.
 * Si es menor de 0.01 µA dice «≈ 0 µA» y aclara que es lo que mide la prueba.
 * @param {number} corriente_uA - Lectura de la prueba (µA).
 * @returns {string[]} Uno o dos renglones.
 */
function renglonesLectura(corriente_uA) {
  if (Math.abs(corriente_uA) < UMBRAL_CASI_CERO_DIBUJO_UA) {
    return ["LECTURA: ≈ 0 µA", "(lo que mide esta prueba)"];
  }
  return [`LECTURA: ${formatearCorriente_uA(corriente_uA)} µA`];
}

/**
 * Arma las etiquetas de las ramas del dibujo: cuál es la «LECTURA» (la que
 * mide la prueba elegida) y cuál solo se muestra en gris como referencia.
 * No calcula nada: usa los valores que ya dio el motor (M4). Función pura.
 *   - Contacto: LECTURA en la MD; con tierra cerrada, la rama del PE va en gris.
 *   - Paciente CF: LECTURA en la MD (rama de la parte aplicada).
 *   - Fuga a tierra: LECTURA en el conductor de protección.
 * @param {{tipoMedicion: string, condicion: object, corriente_uA: number, ramas: object}} medicion - Medición del motor (M4).
 * @returns {{ramas: {rama: string, esLectura: boolean, lineas: string[]}[], notaDebajo: string | null}}
 *   rama es "persona" (MD) o "tierra" (PE); notaDebajo es el texto de debajo del dibujo o null.
 */
export function armarEtiquetasRamas(medicion) {
  validarTipoMedicionDibujo(medicion.tipoMedicion);
  const lectura = { esLectura: true, lineas: renglonesLectura(medicion.corriente_uA) };
  // Fuga a tierra: se mide en el conductor de protección
  if (medicion.tipoMedicion === MEDICION_FUGA_TIERRA) {
    return { ramas: [{ rama: "tierra", ...lectura }], notaDebajo: null };
  }
  const ramas = [{ rama: "persona", ...lectura }];
  // Contacto con tierra cerrada: la fuga que se va por el PE se muestra en gris
  const contactoConTierra = medicion.tipoMedicion === MEDICION_CONTACTO && medicion.condicion.tierra === "cerrada";
  if (contactoConTierra) {
    ramas.push({
      rama: "tierra",
      esLectura: false,
      lineas: [`${formatearCorrienteDibujo_uA(medicion.ramas.porTierra_uA)} · se va por la tierra`, "(no la mide esta prueba)"],
    });
  }
  return { ramas, notaDebajo: contactoConTierra ? NOTA_CONTACTO_TIERRA_CERRADA : null };
}

/**
 * Zonas invisibles sobre cada parte del dibujo. Al pasar el mouse por una
 * zona aparece la explicación de esa parte (elemento <title> de SVG).
 * Se dibujan en este orden: las zonas grandes (chasis) primero, para que las
 * pequeñas que están adentro queden encima y respondan primero.
 */
const ZONAS_DE_AYUDA = Object.freeze([
  { parte: "chasis", x: 326, y: 36, width: 248, height: 268 },
  { parte: "red", x: 24, y: 10, width: 72, height: 36 },
  { parte: "red", x: 32, y: 132, width: 56, height: 56 },
  { parte: "fase", x: 36, y: 80, width: 114, height: 20 },
  { parte: "fase", x: 50, y: 96, width: 20, height: 36 },
  { parte: "neutro", x: 36, y: 220, width: 68, height: 20 },
  { parte: "neutro", x: 50, y: 188, width: 20, height: 32 },
  { parte: "interruptorNeutro", x: 99, y: 204, width: 48, height: 72 },
  { parte: "polaridad", x: 146, y: 58, width: 88, height: 212 },
  { parte: "circuitoInterno", x: 338, y: 130, width: 82, height: 60 },
  { parte: "capacitanciaL", x: 372, y: 62, width: 150, height: 22 },
  { parte: "capacitanciaN", x: 372, y: 254, width: 150, height: 24 },
  { parte: "capacitanciaAP", x: 436, y: 120, width: 126, height: 56 },
  { parte: "parteAplicada", x: 598, y: 133, width: 124, height: 54 },
  { parte: "puntaContacto", x: 574, y: 82, width: 176, height: 24 },
  { parte: "puntaContacto", x: 730, y: 100, width: 20, height: 118 },
  { parte: "md", x: 616, y: 231, width: 200, height: 48 },
  { parte: "conductorProteccion", x: 272, y: 318, width: 176, height: 36 },
  { parte: "tierraInstalacion", x: 36, y: 354, width: 640, height: 40 },
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
      explicacion: `El cable de tierra que une el chasis metálico con la tierra de la instalación (≈ ${parametros.R_PE_ohm} Ω). Al abrirlo se simula la tierra rota (primer defecto). En la fuga a tierra, el analizador mide la corriente que circula por él.` },
    { id: "capacitanciaL", nombre: `C_L (${capacitancia_pF("C_L")} pF)`, enCuadro: true,
      explicacion: "Capacitancia de fuga entre la fase y el chasis. No es una pieza que se pueda ver: es el acople natural, a través del aislamiento, entre los cables con tensión y la carcasa metálica. Por ahí se «escapa» la corriente de fuga." },
    { id: "capacitanciaN", nombre: `C_N (${capacitancia_pF("C_N")} pF)`, enCuadro: true,
      explicacion: "Capacitancia de fuga entre el neutro y el chasis. Es igual que C_L, pero del lado del neutro. En el R12 las dos son casi iguales." },
    { id: "capacitanciaAP", nombre: `C_AP (${capacitancia_pF("C_AP")} pF)`, enCuadro: true,
      explicacion: "Capacitancia del aislamiento entre la red y los electrodos. Es la barrera que separa la parte aplicada de la red; una corriente muy pequeña la cruza hacia el paciente." },
    { id: "parteAplicada", nombre: "Parte aplicada CF", enCuadro: true,
      explicacion: "Los electrodos de ECG y el cable de paciente: lo que toca al paciente. Es tipo CF porque puede quedar cerca del corazón, por eso tiene los límites más estrictos." },
    { id: "md", nombre: "MD", enCuadro: true,
      explicacion: "Carga interna del Fluke ESA620 que imita el cuerpo humano (IEC 60601-1): 1 kΩ en paralelo con una red de 10 kΩ y 0,015 µF. No se conecta a mano: el analizador la usa por dentro en cada medición de fuga. Aquí se simplifica como 1 kΩ." },
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
const POSICION_ESTADO_NEUTRO = Object.freeze([122, 270]);
const POSICION_ESTADO_POLARIDAD = Object.freeze([190, 262]);
const POSICION_ETIQUETA_RAMA = Object.freeze({ persona: Object.freeze([668, 318]), tierra: Object.freeze([452, 334]) });
const POSICION_ROTULO_MD = Object.freeze([708, 251]);

/** Separación vertical entre renglones de una misma etiqueta (unidades del viewBox). */
const ALTO_RENGLON = 14;

/**
 * Escribe varios renglones de texto, uno debajo del otro.
 * @param {readonly string[]} lineas - Renglones.
 * @param {readonly number[]} posicion - [x, y] del primer renglón.
 * @param {Element} padre - Grupo SVG.
 * @param {(indice: number) => string} claseDeRenglon - Clase CSS de cada renglón según su índice.
 */
function escribirRenglones(lineas, [x, y], padre, claseDeRenglon) {
  // Cada renglón ALTO_RENGLON más abajo que el anterior
  lineas.forEach((linea, indice) => {
    escribirTexto(linea, x, y + indice * ALTO_RENGLON, padre, claseDeRenglon(indice), "start");
  });
}

/**
 * Dibuja la rama de la parte aplicada (C_AP, cables y caja de los electrodos).
 * @param {Element} padre - Grupo SVG propio de esta rama.
 */
function dibujarRamaParteAplicada(padre) {
  crearElementoSvg("rect", FIGURA_PARTE_APLICADA, padre);
  // Cables de la rama
  for (const cable of CABLES_PARTE_APLICADA) {
    dibujarCable(cable, "cable", padre);
  }
  dibujarCapacitor("capAPentrada", "capAPsalida", true, padre);
  // Textos de la rama
  for (const [contenido, x, y, clase, ancla] of TEXTOS_PARTE_APLICADA) {
    escribirTexto(contenido, x, y, padre, clase, ancla);
  }
}

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

  // Capacitores de fuga (C_L, C_N); el de la barrera (C_AP) va con la rama de la parte aplicada
  dibujarCapacitor("capLplacaInferior", "capLplacaSuperior", false, padre);
  dibujarCapacitor("capNplacaSuperior", "capNplacaInferior", false, padre);

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

  // Contacto y fuga a tierra: primero, qué capacitores de fuga reciben la fase
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
    const porPE = [...tramo, ...esquinaPE, ...TRAMO_POR_PE, ...TRAMO_REGRESO];
    const porPersona = [...tramo, ...esquinaContacto, ...CABLE_CONTACTO, ...TRAMO_POR_MD.slice(1), ...TRAMO_REGRESO];
    // Fuga a tierra: toda la corriente vuelve por el conductor de protección
    if (medicion.tipoMedicion === MEDICION_FUGA_TIERRA) {
      caminos.push({ puntos: porPE, tipo: "principal" });
    } else if (tierra === "cerrada") {
      caminos.push({ puntos: porPE, tipo: "principal" });
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
 * @param {HTMLElement} notaDebajo - Párrafo de debajo del dibujo que aclara qué mide la lectura.
 * @returns {{mostrarCondicion: Function, mostrarCamino: Function, borrarCamino: Function, establecerVisible: Function}}
 *   Funciones para actualizar el dibujo.
 */
export function crearVisualizador(svg, parametros, notaDebajo) {
  const grupoFijo = crearElementoSvg("g", {}, svg);
  const grupoParteAplicada = crearElementoSvg("g", {}, svg);
  const grupoConmutadores = crearElementoSvg("g", {}, svg);
  const grupoCamino = crearElementoSvg("g", {}, svg);
  const grupoValores = crearElementoSvg("g", {}, svg);
  const grupoAyuda = crearElementoSvg("g", {}, svg);
  dibujarPartesFijas(grupoFijo);
  dibujarRamaParteAplicada(grupoParteAplicada);
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
   * @param {string} tipoMedicion - "contacto", "paciente" o "fuga_tierra".
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
    // La MD se conecta a la punta de contacto o a los electrodos, según la
    // medición; en la fuga a tierra no se usa (se mide en el conductor de protección)
    dibujarCable(CABLE_CONTACTO, tipoMedicion === "contacto" ? "cable" : "cable cable--inactivo", grupoConmutadores);
    dibujarCable(CABLE_PACIENTE, tipoMedicion === "paciente" ? "cable" : "cable cable--inactivo", grupoConmutadores);
    escribirTexto(condicion.neutro, ...POSICION_ESTADO_NEUTRO, grupoConmutadores, CLASE_PEQUENO);
    escribirTexto(condicion.polaridad, ...POSICION_ESTADO_POLARIDAD, grupoConmutadores, CLASE_PEQUENO);
    // Rótulo de la MD según la medición y rama de los electrodos en gris si no participa
    const { lineasRotuloMD, parteAplicadaEnGris } = describirRotuloMD(tipoMedicion);
    escribirRenglones(lineasRotuloMD, POSICION_ROTULO_MD, grupoConmutadores, () => CLASE_PEQUENO);
    grupoParteAplicada.classList.toggle(CLASE_RAMA_INACTIVA, parteAplicadaEnGris);
  }

  /** Borra el camino rojo, los valores y la nota de debajo (por ejemplo, al cambiar la condición). */
  function borrarCamino() {
    grupoCamino.replaceChildren();
    grupoValores.replaceChildren();
    notaDebajo.textContent = "";
    notaDebajo.hidden = true;
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
    // Valores por rama (del motor): la LECTURA en negrita, la otra rama en gris
    const etiquetas = armarEtiquetasRamas(medicion);
    for (const { rama, esLectura, lineas } of etiquetas.ramas) {
      const claseDeRenglon = (indice) => {
        if (!esLectura) {
          return CLASE_NO_MEDIDA;
        }
        return indice === 0 ? CLASE_LECTURA : CLASE_LECTURA_NOTA;
      };
      escribirRenglones(lineas, POSICION_ETIQUETA_RAMA[rama], grupoValores, claseDeRenglon);
    }
    // Nota de debajo del dibujo (solo contacto con tierra cerrada)
    notaDebajo.textContent = etiquetas.notaDebajo ?? "";
    notaDebajo.hidden = etiquetas.notaDebajo === null;
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

/* ======================================================================== */
/* Conexiones físicas en el laboratorio (ESA620 ↔ R12)                      */
/* ======================================================================== */

/** Nombres de los puntos de conexión (se usan en los datos y en las pruebas). */
export const JACK_2_WIRE = "2 WIRE V/Ω/A (rojo)";
export const BORNE_EQUIPOTENCIAL = "Borne equipotencial del R12";
export const BORNE_NULL = "Ø/NULL";
export const TOMACORRIENTE_PRUEBA = "Tomacorriente de prueba del ESA620";
const PARED = "Tomacorriente de la pared";

/** Estados posibles del R12 durante una prueba. */
export const R12_ENCENDIDO = "encendido";
export const R12_APAGADO = "apagado";

/**
 * Los 10 latiguillos del cable de paciente del R12, en el orden de los bornes
 * del ESA620 (de izquierda a derecha), con su color IEC.
 */
export const LATIGUILLOS = Object.freeze([
  Object.freeze({ latiguillo: "R", borne: "RA/R", color: "rojo" }),
  Object.freeze({ latiguillo: "F", borne: "LL/F", color: "verde" }),
  Object.freeze({ latiguillo: "L", borne: "LA/L", color: "amarillo" }),
  Object.freeze({ latiguillo: "N", borne: "RL/N", color: "negro" }),
  Object.freeze({ latiguillo: "C1", borne: "V1/C1", color: "rojo" }),
  Object.freeze({ latiguillo: "C2", borne: "V2/C2", color: "amarillo" }),
  Object.freeze({ latiguillo: "C3", borne: "V3/C3", color: "verde" }),
  Object.freeze({ latiguillo: "C4", borne: "V4/C4", color: "cafe" }),
  Object.freeze({ latiguillo: "C5", borne: "V5/C5", color: "negro" }),
  Object.freeze({ latiguillo: "C6", borne: "V6/C6", color: "morado" }),
]);

/** Cables de poder de la base común: ESA620 a la pared y R12 al tomacorriente de prueba. */
const CABLES_BASE = Object.freeze([
  Object.freeze({ tipo: "poder", desde: "Cable de poder del ESA620", hasta: PARED }),
  Object.freeze({ tipo: "poder", desde: "Cable de poder del R12", hasta: TOMACORRIENTE_PRUEBA }),
]);

/** Los 10 latiguillos, cada uno en su borne. */
const CABLES_LATIGUILLOS = Object.freeze(LATIGUILLOS.map(({ latiguillo, borne, color }) =>
  Object.freeze({ tipo: "latiguillo", desde: `Latiguillo ${latiguillo}`, hasta: borne, color })));

/** Cable de prueba desde el jack 2 WIRE hasta el borne equipotencial del R12. */
const CABLE_2_WIRE = Object.freeze({ tipo: "prueba", desde: JACK_2_WIRE, hasta: BORNE_EQUIPOTENCIAL });

/** Pasos de la base común (van primero en todas las pruebas). */
const PASOS_BASE = Object.freeze([
  "El ESA620 enchufado a la pared y encendido.",
  "El cable de poder del R12 va al tomacorriente de prueba del ESA620, no a la pared.",
  "El tomacorriente de prueba arranca sin energía: se energiza con la tecla POLARITY.",
]);

/** Paso de los 10 latiguillos, con la correspondencia de cada uno. */
const PASO_LATIGUILLOS = "Los 10 latiguillos en sus bornes: R→RA/R, L→LA/L, F→LL/F, N→RL/N y C1…C6→V1/C1…V6/C6.";

/**
 * Conexiones de cada prueba en el laboratorio (docs/11_Conexiones_laboratorio.md).
 * Cada entrada: titulo, cables (qué se conecta con qué), estadoR12, teclas
 * (secuencia en el ESA620), pasos (textos para el estudiante) y, si aplica,
 * nota y advertencia.
 */
export const CONEXIONES_LABORATORIO = Object.freeze({
  paso_tierra: Object.freeze({
    titulo: "Resistencia de tierra (paso 2)",
    cables: Object.freeze([...CABLES_BASE, Object.freeze({ tipo: "cero", desde: JACK_2_WIRE, hasta: BORNE_NULL }), CABLE_2_WIRE]),
    // No se oprime POLARITY: el tomacorriente de prueba sigue sin energía y el R12 no enciende
    estadoR12: R12_APAGADO,
    teclas: Object.freeze(["Ω", "Zero Leads", "TEST"]),
    pasos: Object.freeze([
      ...PASOS_BASE,
      "R12 conectado al tomacorriente de prueba.",
      "Cable de prueba desde el jack 2 WIRE V/Ω/A rojo.",
      "Primero se pone en cero: la punta o la pinza en el borne Ø/NULL, tecla Ω y luego «Zero Leads».",
      "Después, la punta o la pinza en el borne equipotencial del R12 y TEST.",
    ]),
    nota: "Según el manual del ESA620, el cable va al chasis o a la conexión de tierra de protección del equipo; en el R12 es el borne equipotencial de la parte de atrás.",
    advertencia: null,
  }),
  paso_aislamiento: Object.freeze({
    titulo: "Resistencia de aislamiento (paso 3)",
    cables: Object.freeze([...CABLES_BASE, ...CABLES_LATIGUILLOS]),
    estadoR12: R12_APAGADO,
    teclas: Object.freeze(["MΩ", "F1 TEST", "F2 TEST", "F3 TEST"]),
    pasos: Object.freeze([
      ...PASOS_BASE,
      "R12 APAGADO.",
      PASO_LATIGUILLOS,
      "Tecla MΩ; F1 (red–tierra), F2 (partes aplicadas–tierra) y F3 (red–partes aplicadas), cada una con TEST, a 500 V DC.",
    ]),
    nota: null,
    advertencia: "No tocar latiguillos ni bornes durante la prueba.",
  }),
  fuga_tierra: Object.freeze({
    titulo: "Corriente de fuga a tierra",
    cables: Object.freeze([...CABLES_BASE, ...CABLES_LATIGUILLOS]),
    estadoR12: R12_ENCENDIDO,
    teclas: Object.freeze(["µA", "POLARITY"]),
    pasos: Object.freeze([
      ...PASOS_BASE,
      "R12 ENCENDIDO.",
      PASO_LATIGUILLOS,
      "No se agrega ningún cable.",
      "Tecla µA y POLARITY para energizar el tomacorriente; la fuga a tierra la mide el ESA620 por el conductor de tierra del cable de poder.",
    ]),
    nota: null,
    advertencia: null,
  }),
  paciente: Object.freeze({
    titulo: "Corriente de paciente CF",
    cables: Object.freeze([...CABLES_BASE, ...CABLES_LATIGUILLOS]),
    estadoR12: R12_ENCENDIDO,
    teclas: Object.freeze(["µA", "F4 (More)", "▲▼ hasta todos los bornes", "F1 (Select)"]),
    pasos: Object.freeze([
      ...PASOS_BASE,
      "R12 ENCENDIDO.",
      PASO_LATIGUILLOS,
      "Tecla µA → F4 (More) → flechas ▲▼ hasta el grupo que abarca todos los bornes → F1 (Select).",
      "Revisar que el modo sea «Leakage AC+DC».",
    ]),
    nota: null,
    advertencia: null,
  }),
  contacto: Object.freeze({
    titulo: "Corriente de contacto",
    cables: Object.freeze([...CABLES_BASE, ...CABLES_LATIGUILLOS, CABLE_2_WIRE]),
    estadoR12: R12_ENCENDIDO,
    teclas: Object.freeze(["µA", "Enclosure"]),
    pasos: Object.freeze([
      ...PASOS_BASE,
      "R12 ENCENDIDO.",
      `${PASO_LATIGUILLOS} IEC 60601-1 pide las partes aplicadas conectadas en esta medición.`,
      "Cable de prueba desde el jack 2 WIRE V/Ω/A rojo hasta una parte metálica accesible del R12 unida a tierra (el borne equipotencial).",
      "Tecla µA → «Enclosure».",
    ]),
    nota: null,
    advertencia: null,
  }),
});

/**
 * Devuelve las conexiones de una prueba. Función pura (no usa la pantalla).
 * @param {string} clave - "contacto", "paciente", "fuga_tierra", "paso_tierra" o "paso_aislamiento".
 * @returns {object} Entrada de CONEXIONES_LABORATORIO.
 * @throws {Error} Si la clave no existe.
 */
export function obtenerConexiones(clave) {
  if (typeof clave !== "string" || !Object.hasOwn(CONEXIONES_LABORATORIO, clave)) {
    const validas = Object.keys(CONEXIONES_LABORATORIO).join(", ");
    throw new Error(`No hay conexiones de laboratorio para la prueba "${String(clave)}". Las pruebas válidas son: ${validas}.`);
  }
  return CONEXIONES_LABORATORIO[clave];
}

/**
 * Arma la frase que describe las conexiones (para lectores de pantalla).
 * Función pura.
 * @param {object} conexiones - Entrada de CONEXIONES_LABORATORIO.
 * @returns {string} Por ejemplo "Conexiones para Corriente de contacto: ...".
 */
export function describirConexiones(conexiones) {
  const latiguillos = conexiones.cables.filter((cable) => cable.tipo === "latiguillo");
  const otros = conexiones.cables.filter((cable) => cable.tipo !== "latiguillo").map((cable) => `${cable.desde} a ${cable.hasta}`);
  // Los 10 latiguillos se resumen en una sola frase
  if (latiguillos.length > 0) {
    otros.push(`los ${latiguillos.length} latiguillos del cable de paciente en sus bornes del ESA620`);
  }
  return `Conexiones para ${conexiones.titulo}: ${otros.join("; ")}. R12 ${conexiones.estadoR12}.`;
}

/** Medidas del dibujo de conexiones (unidades del viewBox 900 × 400). */
const VIEWBOX_CONEXIONES = "0 0 900 400";
const BORNES_X_INICIAL = 70;
const BORNES_SEPARACION = 48;
const BORNES_Y = 80;
const RADIO_BORNE = 9;
const RADIO_JACK = 8;
const RADIO_PUNTA_LATIGUILLO = 6;
const LINEA_TECLAS_SEPARACION = 16;

/** Posiciones con nombre del dibujo de conexiones (x, y). */
const PUNTOS_CONEXION = Object.freeze({
  jackRojo: [45, 175],
  jackNegro: [75, 175],
  borneNull: [140, 250],
  borneEquipotencial: [640, 280],
  horquilla: [560, 24],
  pantallaTexto: [200, 150],
  estadoR12: [755, 240],
});

/** Recorridos de los cables que no son latiguillos (listas de [x, y]). */
const RECORRIDOS = Object.freeze({
  poderR12: [[525, 185], [612, 185]],
  poderESA: [[20, 300], [8, 300], [8, 380]],
  cero: [[45, 183], [45, 250], [131, 250]],
  prueba: [[45, 183], [45, 372], [600, 372], [600, 280], [632, 280]],
  troncoPaciente: [[660, 112], [660, 24], [560, 24]],
});

/** Rectángulos y símbolos fijos del dibujo de conexiones. */
const FIGURAS_CONEXIONES = Object.freeze([
  { etiqueta: "rect", atributos: { x: 20, y: 50, width: 520, height: 290, rx: 10, class: "equipo-esa620" } },
  { etiqueta: "rect", atributos: { x: 190, y: 130, width: 230, height: 100, rx: 4, class: "pantalla-esa620" } },
  { etiqueta: "rect", atributos: { x: 440, y: 140, width: 85, height: 95, rx: 6, class: "tomacorriente-prueba" } },
  { etiqueta: "rect", atributos: { x: 466, y: 165, width: 6, height: 18, class: "orificio-tomacorriente" } },
  { etiqueta: "rect", atributos: { x: 492, y: 165, width: 6, height: 18, class: "orificio-tomacorriente" } },
  { etiqueta: "circle", atributos: { cx: 482, cy: 205, r: 6, class: "orificio-tomacorriente" } },
  { etiqueta: "rect", atributos: { x: 620, y: 120, width: 270, height: 220, rx: 10, class: "equipo-r12" } },
  { etiqueta: "rect", atributos: { x: 612, y: 173, width: 14, height: 24, class: "entrada-poder" } },
  { etiqueta: "rect", atributos: { x: 648, y: 112, width: 24, height: 16, class: "conector-paciente" } },
  // Símbolo de tierra junto al borne equipotencial (tres rayas)
  { etiqueta: "line", atributos: { x1: 654, y1: 272, x2: 654, y2: 288, class: "simbolo-tierra" } },
  { etiqueta: "line", atributos: { x1: 660, y1: 275, x2: 660, y2: 285, class: "simbolo-tierra" } },
  { etiqueta: "line", atributos: { x1: 666, y1: 278, x2: 666, y2: 282, class: "simbolo-tierra" } },
]);

/** Textos fijos del dibujo de conexiones: [contenido, x, y, clase, alineación]. */
const TEXTOS_CONEXIONES = Object.freeze([
  ["Fluke ESA620 (frente)", 60, 330, CLASE_TITULO, "start"],
  ["2 WIRE V/Ω/A", 60, 150, CLASE_PEQUENO, "middle"],
  ["Ø/NULL", 140, 276, CLASE_PEQUENO, "middle"],
  ["Tomacorriente", 482, 254, CLASE_PEQUENO, "middle"],
  ["de prueba", 482, 268, CLASE_PEQUENO, "middle"],
  ["A la pared", 4, 394, CLASE_PEQUENO, "start"],
  ["Mindray BeneHeart R12", 755, 325, CLASE_TITULO, "middle"],
  ["Conector del cable de paciente", 680, 144, CLASE_PEQUENO, "start"],
  ["CF a prueba de desfibrilación", 680, 158, CLASE_PEQUENO, "start"],
  ["Entrada del cable de poder", 636, 190, CLASE_PEQUENO, "start"],
  ["(parte de atrás)", 636, 204, CLASE_PEQUENO, "start"],
  ["Borne equipotencial", 676, 284, CLASE_PEQUENO, "start"],
  ["(parte de atrás)", 676, 298, CLASE_PEQUENO, "start"],
]);

/** Teclas físicas que cambian la condición de prueba: [nombre, x]. */
const TECLAS_CONDICION = Object.freeze([["POLARITY", 190], ["NEUTRAL", 270], ["EARTH", 350]]);
const TECLA_Y = 250;
const TECLA_ANCHO = 70;
const TECLA_ALTO = 24;
const TECLA_TEXTO_Y = 16;

/** Clases CSS propias del dibujo de conexiones. */
const CLASE_TEXTO_PANTALLA = "texto-circuito texto-pantalla";

/**
 * Convierte una lista de [x, y] en el texto del atributo "points".
 * @param {readonly number[][]} puntos - Puntos del recorrido.
 * @returns {string} Por ejemplo "45,175 45,250".
 */
function recorridoComoTexto(puntos) {
  return puntos.map((punto) => punto.join(",")).join(" ");
}

/**
 * Dibuja un círculo en un punto con nombre.
 * @param {string} nombre - Punto de PUNTOS_CONEXION.
 * @param {number} radio - Radio del círculo.
 * @param {string} clase - Clase CSS.
 * @param {Element} padre - Grupo SVG.
 */
function dibujarCirculoEn(nombre, radio, clase, padre) {
  const [x, y] = PUNTOS_CONEXION[nombre];
  crearElementoSvg("circle", { cx: x, cy: y, r: radio, class: clase }, padre);
}

/**
 * Posición horizontal del borne de ECG número «indice» (0 = RA/R).
 * @param {number} indice - Posición del borne (0 a 9).
 * @returns {number} Coordenada x.
 */
function xDelBorne(indice) {
  return BORNES_X_INICIAL + indice * BORNES_SEPARACION;
}

/**
 * Dibuja el ESA620 (bornes de ECG, jacks 2 WIRE, Ø/NULL, pantalla, teclas de
 * condición y tomacorriente de prueba) y el R12 (entrada de poder, borne
 * equipotencial y conector del cable de paciente).
 * @param {Element} padre - Grupo SVG.
 * @param {object} conexiones - Entrada de CONEXIONES_LABORATORIO.
 */
function dibujarEquipos(padre, conexiones) {
  // Cajas, orificios y símbolos fijos
  for (const figura of FIGURAS_CONEXIONES) {
    crearElementoSvg(figura.etiqueta, figura.atributos, padre);
  }
  // Fila de los 10 bornes de ECG con su rótulo
  for (const [indice, { borne }] of LATIGUILLOS.entries()) {
    crearElementoSvg("circle", { cx: xDelBorne(indice), cy: BORNES_Y, r: RADIO_BORNE, class: "borne-esa620" }, padre);
    escribirTexto(borne, xDelBorne(indice), BORNES_Y + 24, padre, CLASE_PEQUENO);
  }
  // Jacks 2 WIRE (rojo y negro), borne Ø/NULL y borne equipotencial del R12
  dibujarCirculoEn("jackRojo", RADIO_JACK, "jack jack--rojo", padre);
  dibujarCirculoEn("jackNegro", RADIO_JACK, "jack jack--negro", padre);
  dibujarCirculoEn("borneNull", RADIO_BORNE, "borne-esa620", padre);
  dibujarCirculoEn("borneEquipotencial", RADIO_JACK, "borne-equipotencial", padre);
  // Teclas de condición; se resaltan las que la prueba usa
  for (const [nombre, x] of TECLAS_CONDICION) {
    const clase = conexiones.teclas.includes(nombre) ? "tecla-esa620 tecla-esa620--usada" : "tecla-esa620";
    crearElementoSvg("rect", { x, y: TECLA_Y, width: TECLA_ANCHO, height: TECLA_ALTO, rx: 4, class: clase }, padre);
    escribirTexto(nombre, x + TECLA_ANCHO / 2, TECLA_Y + TECLA_TEXTO_Y, padre, CLASE_PEQUENO);
  }
  // Textos fijos
  for (const [contenido, x, y, clase, ancla] of TEXTOS_CONEXIONES) {
    escribirTexto(contenido, x, y, padre, clase, ancla);
  }
}

/**
 * Escribe en la pantalla del ESA620 las teclas de la prueba (una por renglón)
 * y el estado del R12 dentro de su caja.
 * @param {Element} padre - Grupo SVG.
 * @param {object} conexiones - Entrada de CONEXIONES_LABORATORIO.
 */
function escribirTeclasYEstado(padre, conexiones) {
  const [x, y] = PUNTOS_CONEXION.pantallaTexto;
  escribirTexto("Teclas:", x, y, padre, CLASE_TITULO, "start");
  // Una tecla por renglón, numeradas en el orden en que se oprimen
  for (const [indice, tecla] of conexiones.teclas.entries()) {
    escribirTexto(`${indice + 1}. ${tecla}`, x, y + (indice + 1) * LINEA_TECLAS_SEPARACION, padre, CLASE_TEXTO_PANTALLA, "start");
  }
  const claseEstado = `texto-circuito estado-r12 estado-r12--${conexiones.estadoR12}`;
  escribirTexto(`R12 ${conexiones.estadoR12.toUpperCase()}`, ...PUNTOS_CONEXION.estadoR12, padre, claseEstado);
}

/**
 * Dibuja el cable de paciente: el tronco que sale del R12 y un latiguillo por
 * borne, con su color IEC (con borde oscuro para que el amarillo se vea).
 * @param {Element} padre - Grupo SVG.
 */
function dibujarLatiguillos(padre) {
  crearElementoSvg("polyline", { points: recorridoComoTexto(RECORRIDOS.troncoPaciente), class: "cable-conexion cable-conexion--tronco" }, padre);
  escribirTexto("Cable de paciente del R12", 600, 16, padre, CLASE_PEQUENO, "start");
  // Un latiguillo por borne: baja de la horquilla y entra en el borne
  for (const [indice, { latiguillo, color }] of LATIGUILLOS.entries()) {
    const x = xDelBorne(indice);
    const recorrido = recorridoComoTexto([PUNTOS_CONEXION.horquilla, [x, BORNES_Y - 30], [x, BORNES_Y]]);
    crearElementoSvg("polyline", { points: recorrido, class: "latiguillo-borde" }, padre);
    crearElementoSvg("polyline", { points: recorrido, class: `latiguillo latiguillo--${color}` }, padre);
    crearElementoSvg("circle", { cx: x, cy: BORNES_Y, r: RADIO_PUNTA_LATIGUILLO, class: `punta-latiguillo latiguillo--${color}` }, padre);
    escribirTexto(latiguillo, x + 5, BORNES_Y - 14, padre, CLASE_PEQUENO, "start");
  }
}

/**
 * Dibuja un cable que no es latiguillo (poder, prueba o puesta en cero).
 * @param {readonly number[][]} recorrido - Puntos del cable.
 * @param {string} clase - Clase CSS del tipo de cable.
 * @param {Element} padre - Grupo SVG.
 */
function dibujarCableConexion(recorrido, clase, padre) {
  crearElementoSvg("polyline", { points: recorridoComoTexto(recorrido), class: `cable-conexion ${clase}` }, padre);
}

/**
 * Dibuja las conexiones físicas de una prueba sobre un elemento <svg>: el
 * frente del ESA620 a la izquierda, el R12 a la derecha y solo los cables
 * que usa la prueba, resaltados (los que no usa no se dibujan).
 * @param {SVGSVGElement} svg - Elemento SVG de la página (se borra y se vuelve a dibujar).
 * @param {string} clave - Prueba (ver obtenerConexiones).
 * @throws {Error} Si la clave no existe.
 */
export function dibujarConexiones(svg, clave) {
  const conexiones = obtenerConexiones(clave);
  const tipos = new Set(conexiones.cables.map((cable) => cable.tipo));
  svg.replaceChildren();
  svg.setAttribute("viewBox", VIEWBOX_CONEXIONES);
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", describirConexiones(conexiones));

  dibujarEquipos(svg, conexiones);
  // Cables de poder: siempre (base común)
  dibujarCableConexion(RECORRIDOS.poderR12, "cable-conexion--poder", svg);
  dibujarCableConexion(RECORRIDOS.poderESA, "cable-conexion--poder", svg);
  // Latiguillos, solo si la prueba los usa
  if (tipos.has("latiguillo")) {
    dibujarLatiguillos(svg);
  }
  // Puesta en cero del cable de prueba (antes de medir)
  if (tipos.has("cero")) {
    dibujarCableConexion(RECORRIDOS.cero, "cable-conexion--cero", svg);
    escribirTexto("1.º en cero", 52, 240, svg, CLASE_PEQUENO, "start");
  }
  // Cable de prueba hasta el borne equipotencial del R12
  if (tipos.has("prueba")) {
    dibujarCableConexion(RECORRIDOS.prueba, "cable-conexion--prueba", svg);
    const rotulo = tipos.has("cero") ? "2.º: cable de prueba al borne equipotencial" : "Cable de prueba al borne equipotencial";
    escribirTexto(rotulo, 320, 390, svg, CLASE_PEQUENO);
  }
  escribirTeclasYEstado(svg, conexiones);
}
