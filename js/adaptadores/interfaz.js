/**
 * ============================================================================
 * Título: Interfaz de usuario
 * Descripción: Conecta la página (index.html) con el núcleo. Escucha los
 *   clics del estudiante, le pide al núcleo los cálculos (M2 secuencia,
 *   M4 motor, M5 evaluador) y muestra los resultados en las 5 secciones:
 *   Equipo, Prueba guiada, Analizador, Comparar e Historial.
 *   Este archivo NO calcula corrientes ni decide veredictos: solo pregunta al
 *   núcleo y pinta lo que el núcleo responde. Todo texto se escribe con
 *   textContent (nunca innerHTML), por seguridad.
 * Módulo: M1 – Interfaz de usuario (adaptador)
 * Autores: Yustin Rico, David Cardona, Santiago González
 * Creado: 2026-11-13 · Modificado: 2026-11-14
 * ============================================================================
 */

import {
  PASOS_PRUEBA, crearEstadoInicial, crearEstadoDesdeAvance, obtenerPasoActual, obtenerPasoVisto, completarPaso,
  pasoDisponible, pasoCompletado, verPaso,
} from "../nucleo/secuencia.js";
import {
  calcularMedicion, corrientePorFaradio_A_F, capacitanciaDeFuga_F, capacitanciaFugaATierra_F, listarConfiguraciones,
  medicionPosible, MENSAJE_FUGA_SIN_TIERRA,
} from "../nucleo/motor_calculo.js";
import {
  evaluarMedicion, evaluarAislamiento, evaluarResistenciaTierra, VEREDICTO_CUMPLE,
} from "../nucleo/evaluador_limites.js";
import { crearVisualizador, describirPartesDelCircuito, formatearCorriente_uA } from "./visualizador.js";
import {
  crearHistorial, guardarAvancePrueba, leerAvancePrueba, filaDeRegistro, nombreCortoCondicion, textoLectura, textoPorcentaje, NOMBRES_MEDICION, UNIDAD_CORRIENTE,
  textoLimite, textoConfiguracion, resumirAvance, claveConfiguracion,
} from "./historial.js";
import {
  generarReporte, crearPdfReporte, nombreArchivoReporte, armarResumen, limpiarNombre, TEXTO_INCERTIDUMBRE, TEXTO_CERCA_DEL_LIMITE,
} from "./reporte.js";
import { descargarPdf } from "./pdf.js";
import { medirCargaPagina, textoTiempoCarga, detalleCarga } from "./tiempo_carga.js";

/* ------------------------------------------------------------------------ */
/* Constantes                                                               */
/* ------------------------------------------------------------------------ */

/** Sección que se muestra al abrir la página. */
const SECCION_INICIAL = "equipo";

/** Secciones que se desbloquean al llegar al paso 4 de la prueba guiada. */
const SECCIONES_BLOQUEADAS_POR_PRUEBA = Object.freeze(["analizador", "comparar"]);

/** Paso de la prueba guiada que desbloquea el Analizador. */
const PASO_CORRIENTES_FUGA = "corrientes_fuga";

/** Milisegundos por segundo y tiempo máximo para generar el reporte (ES09: ≤ 3 s). */
const MILISEGUNDOS_POR_SEGUNDO = 1000;
const TIEMPO_MAXIMO_REPORTE_S = 3;

/** Mensajes de los botones del reporte. */
const MENSAJE_RESUMEN_COPIADO = "Resumen copiado: pégalo en tu correo y adjunta el PDF";
const MENSAJE_COPIA_FALLIDA = "No se pudo copiar (el navegador no dio permiso). Copia los datos del reporte a mano.";
const MENSAJE_PDF_FALLIDO = "No se pudo crear el PDF. Recarga la página e inténtalo de nuevo.";

/** Conversiones de unidades para mostrar los valores. */
const PICOFARADIOS_POR_FARADIO = 1e12;
const MICROAMPERIOS_POR_AMPERIO = 1e6;
const OHMIOS_POR_MEGAOHMIO = 1e6;
const OHMIOS_POR_KILOOHMIO = 1e3;

/** Decimales para capacitancias (pF), reactancia (MΩ) y la constante V·2πf (A/F). */
const DECIMALES_CAPACITANCIA = 1;
const DECIMALES_REACTANCIA = 1;
const DECIMALES_CORRIENTE_POR_FARADIO = 2;

/** Nombres para mostrar. */
const NOMBRES_ESTADO = Object.freeze({ normal: "Condición normal", primer_defecto: "Primer defecto" });
/**
 * Paso 1 (inspección visual): puntos revisados y su estado. Es el detalle de
 * "Sin hallazgos (carcasa, contaminación, cableado, etiquetas, piezas: Bien)"
 * de pasos_previos_medidos.inspeccion_visual.
 */
const PUNTOS_INSPECCION = Object.freeze([
  ["Carcasa", "Sin daños"],
  ["Cable de poder y enchufe", "En buen estado"],
  ["Etiquetas", "Legibles"],
  ["Contaminación", "Limpio"],
  ["Piezas", "Completas"],
]);

/** Textos del resultado de los pasos 1 a 3 de la prueba guiada. */
const TEXTOS_RESULTADO_PASO = Object.freeze({
  inspeccionIntro: "Resultado de la inspección del R12 del laboratorio: el equipo pasó la inspección. Estos fueron los puntos revisados:",
  tierraIntro: "Resultado de la medición en el R12 del laboratorio: se midió la resistencia del conductor de protección, entre la clavija de tierra del cable de poder y el chasis metálico.",
  tierraFuenteLimite: "manual del fabricante del R12",
  tierraCumple: "Cumple: la resistencia es menor que el límite, así que el chasis está bien unido a tierra y la corriente de fuga tiene un camino de muy baja resistencia que no pasa por la persona. Se escribe «<» porque el valor real es tan pequeño que queda por debajo de la exactitud del analizador.",
  tierraNoCumple: "No cumple: la resistencia supera el límite, así que la tierra no garantiza un camino de baja resistencia para la corriente de fuga.",
  aislamientoIntro: "Resultado de la medición en el R12 del laboratorio: se midió la resistencia de aislamiento entre tres pares de puntos.",
  aislamientoCumple: "Cumple: todos los valores están por encima del mínimo esperado, así que el aislamiento es bueno y casi no deja pasar corriente. OL quiere decir que la resistencia superó el rango del analizador.",
  aislamientoNoCumple: "No cumple: al menos un valor está por debajo del mínimo esperado; el aislamiento podría estar dañado y dejar pasar más corriente de fuga.",
  aislamientoNota: "Valores mínimos esperados de IEC 62353:2014 (Tabla 2) para equipos Clase I con parte CF. En esta norma la medición de aislamiento es opcional y el manual del R12 no fija un límite propio.",
});

/** Unidades de los pasos 2 y 3. */
const UNIDAD_RESISTENCIA_TIERRA = "Ω";
const UNIDAD_AISLAMIENTO = "MΩ";

const ETIQUETAS_AISLAMIENTO = Object.freeze({
  red_tierra: "Red – tierra",
  partes_aplicadas_tierra: "Partes aplicadas – tierra",
  red_partes_aplicadas: "Red – partes aplicadas",
});

/** Orden fijo de las mediciones (tabla de límites y gráficas de Comparar). */
const ORDEN_MEDICIONES = Object.freeze(["contacto", "paciente", "fuga_tierra"]);

/** Las 16 configuraciones (medición + condición) que simula la herramienta, en orden fijo (M4). */
const CONFIGURACIONES = listarConfiguraciones();

/** Medición de fuga a tierra (no existe con la tierra abierta). */
const MEDICION_FUGA_TIERRA = "fuga_tierra";

/** Grupos de límites del JSON para B, BF y CF en cada medición (tabla de la sección Equipo). */
const GRUPOS_LIMITES_POR_MEDICION = Object.freeze({
  contacto: ["contacto", "contacto", "contacto"],
  paciente: ["paciente_B", "paciente_BF", "paciente_CF"],
  fuga_tierra: ["fuga_tierra", "fuga_tierra", "fuga_tierra"],
});


/** Textos de explicación (CLAUDE.md, sección 7). */
const TEXTOS_EXPLICACION = Object.freeze({
  contactoNormal: "La fuga capacitiva del equipo (≈ 14.7 µA) se va casi toda por el conductor de protección (≈ 0.003 Ω), que está en paralelo con la persona (1 kΩ). Por divisor de corriente casi nada pasa por la persona: ≈ 0 µA. El analizador real muestra ≈ 0.1 µA por su resolución.",
  contactoPolaridadInvertida: "En este equipo los capacitores de fuga de fase y de neutro son casi iguales, por eso invertir la polaridad casi no cambia la lectura.",
  contactoTierraAbierta: "Sin conductor de protección, la fuga de la capacitancia entre fase y chasis no tiene un camino de baja resistencia: circula por la persona. I = V·2πf·C (V: tensión de la red; f: frecuencia; C: capacitancia de fuga entre fase y chasis) ≈ 14.7 µA. Es primer defecto: límite 500 µA.",
  contactoNeutroAbierto: "Con el neutro abierto ambos lados de la red quedan a tensión de fase y la fuga total aumenta, pero la tierra sigue conectada y se la lleva: ≈ 0 µA por la persona.",
  pacienteNormal: "Es la corriente que cruza la barrera de aislamiento de la parte aplicada (≈ 28 pF): ≈ 1.3 µA. Como los electrodos pueden quedar cerca del corazón (CF), el límite es 10 µA.",
  pacientePolaridadInvertida: "Invertir la polaridad casi no cambia la lectura.",
  pacienteTierraAbierta: "Con el chasis sin tierra aumenta el acople hacia la parte aplicada: ≈ 2.1 µA (aumento medido en el laboratorio). Límite de primer defecto: 50 µA.",
  pacienteNeutroAbierto: "≈ 1.3 µA, casi igual a la condición normal en este equipo. Límite de primer defecto: 50 µA.",
  fugaNormal: "Es la corriente que la capacitancia de fuga entre fase y chasis (≈ 326 pF) manda al chasis y que vuelve por el conductor de protección hacia la tierra de la instalación: I = V·2πf·C ≈ 14.7 µA. El límite es del equipo completo: 5 mA en condición normal.",
  fugaNeutroAbierto: "Con el neutro abierto, el lado del neutro también queda con tensión y suma parte de su fuga: I = V·2πf·(C_L + k_N·C_N) ≈ 27.1 µA. k_N ≈ 0.84 es un factor empírico medido en el laboratorio: el lado del neutro no queda exactamente a la tensión de fase. Es primer defecto: límite 10 mA.",
  fugaSegundaEdicion: "El manual del R12 indica 500/1000 µA porque usa la 2.ª edición de la norma.",
  limiteContactoIgual: "Para la corriente de contacto el límite es el mismo para B, BF y CF.",
  limiteEquipoCompleto: "Para la fuga a tierra el límite es del equipo completo, no depende de B, BF o CF.",
  bandaIncertidumbre: "Es la exactitud del analizador real (±(1 % + 1 µA), k = 2). Si dos lecturas difieren menos que esta banda, la diferencia puede ser del instrumento y no de la condición.",
  dobleFalla: "No se pueden abrir la tierra y el neutro al mismo tiempo: serían dos fallas a la vez (doble falla). La norma evalúa una sola falla a la vez (primer defecto), por eso esa opción está deshabilitada.",
  tierraCerradaSola: "Se cerró la tierra porque la fuga a tierra se mide con el conductor de protección conectado.",
});

/**
 * Significado de los términos: [término, explicación]. Es la única fuente de
 * este texto; cada bloque plegable muestra los términos de su grupo.
 */
const TERMINOS_GLOSARIO = Object.freeze({
  corrienteContacto: ["Corriente de contacto", "La que pasaría por una persona que toca la carcasa del equipo."],
  corrientePaciente: ["Corriente de paciente", "La que pasaría desde los electrodos, a través del paciente, hacia tierra."],
  corrienteFugaTierra: ["Corriente de fuga a tierra", "La que circula por el cable de tierra del equipo hacia la tierra de la instalación."],
  condicionNormal: ["Condición normal", "Todas las protecciones del equipo funcionan."],
  primerDefecto: ["Primer defecto", "Falla una sola protección (tierra de protección abierta o neutro abierto). La norma permite un límite más alto porque es una situación temporal; dos fallas a la vez no se evalúan."],
});

/**
 * Términos de cada bloque plegable (atributo data-glosario del HTML):
 * "todos" en la sección Equipo; "mediciones" junto al selector de Medición;
 * "condiciones" debajo de los conmutadores de tierra y neutro.
 */
const GRUPOS_GLOSARIO = Object.freeze({
  todos: ["corrienteContacto", "corrientePaciente", "corrienteFugaTierra", "condicionNormal", "primerDefecto"],
  mediciones: ["corrienteContacto", "corrientePaciente", "corrienteFugaTierra"],
  condiciones: ["condicionNormal", "primerDefecto"],
});

/** Grupo que, además, explica por qué sube el límite al abrir la tierra o el neutro. */
const GRUPO_CON_EJEMPLO_DE_LIMITE = "condiciones";

/** Qué aporta cada norma, para la ficha del equipo. */
const PAPEL_NORMA_GENERAL = "norma general; de aquí salen los límites";
const PAPEL_NORMA_PARTICULAR = "norma particular para electrocardiógrafos";

/* ------------------------------------------------------------------------ */
/* Utilidades de la página                                                  */
/* ------------------------------------------------------------------------ */

/**
 * Busca un elemento por su id y avisa si no existe (error de la página, no del usuario).
 * @param {string} id - id del elemento en index.html.
 * @returns {HTMLElement} El elemento.
 */
function elemento(id) {
  const encontrado = document.getElementById(id);
  if (encontrado === null) {
    throw new Error(`Falta el elemento "${id}" en index.html.`);
  }
  return encontrado;
}

/**
 * Crea un elemento HTML con su texto (siempre con textContent) y lo agrega a un padre.
 * @param {string} etiqueta - Nombre del elemento ("p", "td"...).
 * @param {string} texto - Texto que va adentro.
 * @param {HTMLElement} padre - Elemento donde se agrega.
 * @param {string} [clase] - Clase CSS opcional.
 * @returns {HTMLElement} El elemento creado.
 */
function crearConTexto(etiqueta, texto, padre, clase) {
  const nuevo = document.createElement(etiqueta);
  nuevo.textContent = texto;
  if (clase) {
    nuevo.className = clase;
  }
  padre.appendChild(nuevo);
  return nuevo;
}

/**
 * Muestra un mensaje de error arriba de la página sin romperla.
 * @param {string} mensaje - Texto del error, en español.
 */
export function mostrarError(mensaje) {
  const caja = elemento("mensaje-error");
  caja.textContent = mensaje;
  caja.hidden = false;
}

/** Oculta el mensaje de error. */
function ocultarError() {
  elemento("mensaje-error").hidden = true;
}

/**
 * Describe una condición en palabras, por ejemplo "Polaridad normal · tierra abierta · neutro cerrado".
 * @param {{polaridad: string, tierra: string, neutro: string}} condicion - Condición de prueba.
 * @returns {string} Descripción.
 */
function describirCondicion(condicion) {
  return `Polaridad ${condicion.polaridad} · tierra ${condicion.tierra} · neutro ${condicion.neutro}`;
}

/* ------------------------------------------------------------------------ */
/* Sección 1: Equipo bajo prueba                                            */
/* ------------------------------------------------------------------------ */

/**
 * Llena la ficha del equipo y la tabla de límites B, BF y CF con los datos del JSON.
 * @param {object} parametros - Parámetros validados (M3).
 */
function mostrarEquipo(parametros) {
  const { equipo, limites_uA: limites } = parametros;
  elemento("ficha-nombre").textContent = equipo.nombre;
  elemento("ficha-clase").textContent = equipo.clase;
  elemento("ficha-parte").textContent = equipo.parte_aplicada;
  // Cada norma en su propio renglón
  elemento("ficha-normas").replaceChildren(
    `${equipo.norma_general} (${PAPEL_NORMA_GENERAL})`,
    document.createElement("br"),
    `${equipo.norma_particular} (${PAPEL_NORMA_PARTICULAR})`,
  );
  elemento("ficha-fuente").textContent = `Fuente de los datos: ${parametros.fuente}.`;

  const cuerpo = elemento("tabla-limites-equipo").querySelector("tbody");
  cuerpo.replaceChildren();
  // Una fila por cada corriente y cada estado (normal y primer defecto)
  for (const tipoMedicion of ORDEN_MEDICIONES) {
    for (const estado of Object.keys(NOMBRES_ESTADO)) {
      const fila = document.createElement("tr");
      crearConTexto("td", NOMBRES_MEDICION[tipoMedicion].replace(" CF", ""), fila);
      crearConTexto("td", NOMBRES_ESTADO[estado], fila);
      const grupos = GRUPOS_LIMITES_POR_MEDICION[tipoMedicion];
      // Límite de cada tipo de parte aplicada (B, BF, CF)
      for (const [indice, grupo] of grupos.entries()) {
        const esColumnaCF = indice === grupos.length - 1;
        crearConTexto("td", textoLimite(limites[grupo][estado]), fila, esColumnaCF ? "columna-destacada" : "");
      }
      cuerpo.appendChild(fila);
    }
  }
  elemento("nota-limites-equipo").textContent = `Fuga a tierra: límites de IEC 60601-1, 3.ª edición. ${TEXTOS_EXPLICACION.fugaSegundaEdicion}`;
}

/**
 * Agrega a una lista un renglón "Término: texto", con el término en negrita.
 * @param {HTMLElement} lista - Elemento ul.
 * @param {string} termino - Término.
 * @param {string} texto - Explicación o valor.
 */
function agregarLineaTermino(lista, termino, texto) {
  const linea = document.createElement("li");
  crearConTexto("strong", `${termino}:`, linea);
  linea.append(` ${texto}`);
  lista.appendChild(linea);
}

/**
 * Frase que explica por qué sube el límite con un primer defecto, con los
 * límites de la corriente de contacto del JSON (por ejemplo, de 100 a 500 µA).
 * @param {object} parametros - Parámetros validados (M3).
 * @returns {string} Frase.
 */
function textoEjemploDeLimite(parametros) {
  const { normal, primer_defecto: primerDefecto } = parametros.limites_uA.contacto;
  return `Abrir la tierra o el neutro simula un primer defecto; por eso el límite sube (por ejemplo, de ${normal} ${UNIDAD_CORRIENTE} a ${primerDefecto} ${UNIDAD_CORRIENTE} en la corriente de contacto).`;
}

/**
 * Llena cada bloque plegable del glosario (marcado con data-glosario="grupo")
 * con los términos de su grupo, todos sacados de TERMINOS_GLOSARIO.
 * @param {object} parametros - Parámetros validados (M3).
 * @throws {Error} Si un bloque pide un grupo que no existe.
 */
function mostrarGlosario(parametros) {
  // Cada bloque recibe solo los términos de su grupo
  for (const lista of document.querySelectorAll("[data-glosario]")) {
    const grupo = lista.dataset.glosario;
    const claves = GRUPOS_GLOSARIO[grupo];
    if (!claves) {
      throw new Error(`Glosario: no existe el grupo "${grupo}".`);
    }
    lista.replaceChildren();
    for (const clave of claves) {
      const [termino, explicacion] = TERMINOS_GLOSARIO[clave];
      agregarLineaTermino(lista, termino, explicacion);
    }
    // El grupo de condiciones termina con el ejemplo del límite que sube
    if (grupo === GRUPO_CON_EJEMPLO_DE_LIMITE) {
      crearConTexto("li", textoEjemploDeLimite(parametros), lista);
    }
  }
}

/* ------------------------------------------------------------------------ */
/* Navegación entre secciones                                               */
/* ------------------------------------------------------------------------ */

/**
 * Indica si una sección está bloqueada porque falta avanzar en la prueba guiada.
 * @param {object} estado - Estado de la interfaz.
 * @param {string} seccion - Nombre de la sección.
 * @returns {boolean} true si está bloqueada.
 */
function seccionBloqueada(estado, seccion) {
  return SECCIONES_BLOQUEADAS_POR_PRUEBA.includes(seccion) && !pasoDisponible(estado.secuencia, PASO_CORRIENTES_FUGA);
}

/**
 * Habilita o deshabilita los botones de navegación según el avance de la prueba.
 * @param {object} estado - Estado de la interfaz.
 */
function actualizarNavegacion(estado) {
  // Revisa cada botón del menú
  for (const boton of document.querySelectorAll(".navegacion__boton")) {
    const bloqueada = seccionBloqueada(estado, boton.dataset.seccion);
    boton.disabled = bloqueada;
    boton.title = bloqueada ? "Completa primero los pasos 1 a 3 de la Prueba guiada." : "";
  }
}

/**
 * Muestra una sección y oculta las demás.
 * @param {object} estado - Estado de la interfaz.
 * @param {string} seccionElegida - Nombre de la sección ("equipo", "prueba"...).
 */
function mostrarSeccion(estado, seccionElegida) {
  if (seccionBloqueada(estado, seccionElegida)) {
    return;
  }
  // Muestra solo la sección elegida
  for (const seccion of document.querySelectorAll(".seccion")) {
    seccion.hidden = seccion.dataset.seccion !== seccionElegida;
  }
  // Marca el botón activo en el menú
  for (const boton of document.querySelectorAll(".navegacion__boton")) {
    if (boton.dataset.seccion === seccionElegida) {
      boton.setAttribute("aria-current", "page");
    } else {
      boton.removeAttribute("aria-current");
    }
  }
  // La animación del circuito solo corre si el Analizador está a la vista
  estado.visualizador.establecerVisible(seccionElegida === "analizador");
  window.scrollTo(0, 0);
}

/**
 * Conecta los botones del menú.
 * @param {object} estado - Estado de la interfaz.
 */
function configurarNavegacion(estado) {
  // Un evento por cada botón del menú
  for (const boton of document.querySelectorAll(".navegacion__boton")) {
    boton.addEventListener("click", () => mostrarSeccion(estado, boton.dataset.seccion));
  }
  actualizarNavegacion(estado);
}

/* ------------------------------------------------------------------------ */
/* Sección 2: Prueba guiada                                                 */
/* ------------------------------------------------------------------------ */

/**
 * Escribe un valor con su unidad. Si el valor trae una nota entre paréntesis,
 * la unidad va antes de la nota: "> 100 (OL)" → "> 100 MΩ (OL)".
 * @param {number|string} valor - Valor del JSON.
 * @param {string} unidad - Unidad.
 * @returns {string} Texto con la unidad.
 */
function textoConUnidad(valor, unidad) {
  const texto = String(valor);
  const inicioNota = texto.indexOf(" (");
  if (inicioNota === -1) {
    return `${texto} ${unidad}`;
  }
  return `${texto.slice(0, inicioNota)} ${unidad}${texto.slice(inicioNota)}`;
}

/**
 * Escribe la tabla del aislamiento (paso 3): valor medido, mínimo esperado
 * de IEC 62353 y veredicto de cada par de puntos (calculado por M5).
 * @param {object} aislamiento - pasos_previos_medidos.aislamiento_Mohm del JSON.
 * @returns {boolean} true si todos los pares cumplen.
 */
function escribirTablaAislamiento(aislamiento) {
  const cuerpo = elemento("paso-resultado-tabla").tBodies[0];
  cuerpo.replaceChildren();
  let todosCumplen = true;
  // Una fila por cada par de puntos medidos
  for (const [clave, par] of Object.entries(aislamiento)) {
    const veredicto = evaluarAislamiento(par.valor, par.minimo);
    todosCumplen = todosCumplen && veredicto === VEREDICTO_CUMPLE;
    const fila = cuerpo.insertRow();
    crearConTexto("td", ETIQUETAS_AISLAMIENTO[clave] ?? clave, fila);
    crearConTexto("td", textoConUnidad(par.valor, UNIDAD_AISLAMIENTO), fila);
    crearConTexto("td", `≥ ${par.minimo} ${UNIDAD_AISLAMIENTO}`, fila);
    crearConTexto("td", veredicto, fila, veredicto === VEREDICTO_CUMPLE ? "veredicto--cumple" : "veredicto--no-cumple");
  }
  return todosCumplen;
}

/**
 * Escribe el contenido propio de cada paso (lista, tabla y significado).
 * @param {string} claveDato - Campo de pasos_previos_medidos.
 * @param {object} dato - Valor de ese campo.
 * @param {{lista: HTMLElement, significado: HTMLElement, nota: HTMLElement}} destino - Elementos donde se escribe.
 */
function escribirDetallePaso(claveDato, dato, destino) {
  if (claveDato === "inspeccion_visual") {
    // Un renglón por cada punto revisado
    for (const [punto, estadoPunto] of PUNTOS_INSPECCION) {
      agregarLineaTermino(destino.lista, punto, estadoPunto);
    }
  } else if (claveDato === "resistencia_tierra_ohm") {
    agregarLineaTermino(destino.lista, "Resistencia medida", textoConUnidad(dato.valor, UNIDAD_RESISTENCIA_TIERRA));
    agregarLineaTermino(destino.lista, "Límite", `≤ ${dato.limite} ${UNIDAD_RESISTENCIA_TIERRA} (${TEXTOS_RESULTADO_PASO.tierraFuenteLimite})`);
    const cumple = evaluarResistenciaTierra(dato.valor, dato.limite) === VEREDICTO_CUMPLE;
    destino.significado.textContent = cumple ? TEXTOS_RESULTADO_PASO.tierraCumple : TEXTOS_RESULTADO_PASO.tierraNoCumple;
  } else if (claveDato === "aislamiento_Mohm") {
    elemento("paso-resultado-tabla").hidden = false;
    const cumple = escribirTablaAislamiento(dato);
    destino.significado.textContent = cumple ? TEXTOS_RESULTADO_PASO.aislamientoCumple : TEXTOS_RESULTADO_PASO.aislamientoNoCumple;
    destino.nota.textContent = TEXTOS_RESULTADO_PASO.aislamientoNota;
    destino.nota.hidden = false;
  }
}

/** Frase que presenta el resultado de cada paso. */
const INTRO_POR_PASO = Object.freeze({
  inspeccion_visual: TEXTOS_RESULTADO_PASO.inspeccionIntro,
  resistencia_tierra_ohm: TEXTOS_RESULTADO_PASO.tierraIntro,
  aislamiento_Mohm: TEXTOS_RESULTADO_PASO.aislamientoIntro,
});

/**
 * Escribe el resultado de un paso de la prueba guiada: una frase que dice qué
 * se hizo, los valores con su unidad y, en los pasos 2 y 3, si cumplen y qué
 * significa. Si un dato no permite dar el veredicto, muestra el error sin
 * romper la página.
 * @param {string} claveDato - Campo de pasos_previos_medidos.
 * @param {object} pasosPrevios - Objeto pasos_previos_medidos del JSON.
 */
function escribirResultadoPaso(claveDato, pasosPrevios) {
  const destino = {
    lista: elemento("paso-resultado"),
    significado: elemento("paso-resultado-significado"),
    nota: elemento("paso-resultado-nota"),
  };
  // Se limpia lo que haya dejado el paso anterior
  destino.lista.replaceChildren();
  destino.significado.textContent = "";
  destino.nota.hidden = true;
  elemento("paso-resultado-tabla").hidden = true;
  elemento("paso-resultado-intro").textContent = INTRO_POR_PASO[claveDato] ?? "";
  try {
    escribirDetallePaso(claveDato, pasosPrevios[claveDato], destino);
  } catch (error) {
    destino.significado.textContent = error.message;
  }
}

/** Marca que se antepone a los pasos completados en la lista. */
const MARCA_COMPLETADO = "✓";

/** Textos de la tarjeta del paso en modo repaso y al terminar la prueba. */
const TEXTOS_PRUEBA_GUIADA = Object.freeze({
  repaso: "Estás repasando un paso ya completado. Tu avance no cambia.",
  completaTitulo: "Prueba guiada completa",
  completaTexto: "Ya recorriste los 4 pasos. Puedes abrir cualquiera de ellos para repasarlo, o medir todas las condiciones que quieras en el Analizador y compararlas.",
  botonSiguiente: "Entendido, siguiente paso",
  botonAnalizador: "Ir al Analizador",
});

/**
 * Estado de un paso para la lista: "completado", "pendiente" (el que toca) o "bloqueado".
 * @param {object} secuencia - Estado de la secuencia (M2).
 * @param {object} paso - Paso de PASOS_PRUEBA.
 * @returns {"completado"|"pendiente"|"bloqueado"} Estado del paso.
 */
function estadoDelPaso(secuencia, paso) {
  if (pasoCompletado(secuencia, paso.id)) {
    return "completado";
  }
  return pasoDisponible(secuencia, paso.id) ? "pendiente" : "bloqueado";
}

/**
 * Dibuja la lista de los 4 pasos como botones: ✓ en los completados, el paso
 * que se está viendo resaltado (aria-current) y los bloqueados deshabilitados.
 * @param {object} estado - Estado de la interfaz.
 */
function mostrarListaPasos(estado) {
  const lista = elemento("lista-pasos");
  const pasoVisto = obtenerPasoVisto(estado.secuencia);
  lista.replaceChildren();
  // Un botón por paso
  for (const [indice, paso] of PASOS_PRUEBA.entries()) {
    const elementoPaso = document.createElement("li");
    const estadoPaso = estadoDelPaso(estado.secuencia, paso);
    const marca = estadoPaso === "completado" ? `${MARCA_COMPLETADO} ` : "";
    const boton = crearConTexto("button", `${marca}${indice + 1}. ${paso.titulo}`, elementoPaso, "pasos__boton");
    boton.type = "button";
    boton.dataset.paso = paso.id;
    boton.disabled = estadoPaso === "bloqueado";
    if (pasoVisto !== null && paso.id === pasoVisto.id) {
      boton.setAttribute("aria-current", "step");
    }
    elementoPaso.dataset.estado = estadoPaso;
    lista.appendChild(elementoPaso);
  }
}

/**
 * Texto del botón de la tarjeta según el paso que se ve.
 * @param {object} secuencia - Estado de la secuencia (M2).
 * @param {object} paso - Paso que se está viendo.
 * @returns {string} Texto del botón.
 */
function textoBotonPaso(secuencia, paso) {
  if (pasoCompletado(secuencia, paso.id)) {
    // En repaso, el botón lleva de vuelta al paso pendiente (o al Analizador si ya terminó)
    const pendiente = obtenerPasoActual(secuencia);
    return pendiente === null
      ? TEXTOS_PRUEBA_GUIADA.botonAnalizador
      : `Volver al paso ${PASOS_PRUEBA.indexOf(pendiente) + 1}: ${pendiente.titulo}`;
  }
  return paso.id === PASO_CORRIENTES_FUGA ? TEXTOS_PRUEBA_GUIADA.botonAnalizador : TEXTOS_PRUEBA_GUIADA.botonSiguiente;
}

/**
 * Muestra la tarjeta del paso que se está viendo: primero el propósito y
 * luego el resultado. Si es un paso completado, avisa que es un repaso.
 * @param {object} estado - Estado de la interfaz.
 */
function mostrarPasoVisto(estado) {
  const paso = obtenerPasoVisto(estado.secuencia);
  const bloqueResultado = elemento("paso-bloque-resultado");
  const boton = elemento("boton-siguiente-paso");
  const avisoRepaso = elemento("paso-repaso");
  mostrarListaPasos(estado);
  actualizarNavegacion(estado);

  // Pantalla final: prueba completa
  if (paso === null) {
    elemento("paso-titulo").textContent = TEXTOS_PRUEBA_GUIADA.completaTitulo;
    elemento("paso-proposito").textContent = TEXTOS_PRUEBA_GUIADA.completaTexto;
    avisoRepaso.hidden = true;
    bloqueResultado.hidden = true;
    boton.textContent = TEXTOS_PRUEBA_GUIADA.botonAnalizador;
    return;
  }

  const numeroPaso = PASOS_PRUEBA.indexOf(paso) + 1;
  elemento("paso-titulo").textContent = `Paso ${numeroPaso} de ${PASOS_PRUEBA.length}: ${paso.titulo}`;
  elemento("paso-proposito").textContent = paso.proposito;
  avisoRepaso.textContent = TEXTOS_PRUEBA_GUIADA.repaso;
  avisoRepaso.hidden = !pasoCompletado(estado.secuencia, paso.id);
  // Los pasos 1 a 3 muestran su valor medido; el 4 lleva al Analizador
  bloqueResultado.hidden = paso.claveDatoMedido === null;
  if (paso.claveDatoMedido !== null) {
    escribirResultadoPaso(paso.claveDatoMedido, estado.parametros.pasos_previos_medidos);
  }
  boton.textContent = textoBotonPaso(estado.secuencia, paso);
}

/**
 * Recupera el avance de la prueba guiada guardado en esta pestaña. Antes de
 * usarlo lo valida con M2; si está dañado, la prueba empieza desde el paso 1.
 * @returns {Readonly<{pasosCompletados: number, pasoVisto: number}>} Estado de la secuencia.
 */
function recuperarSecuencia() {
  const pasosGuardados = leerAvancePrueba();
  if (pasosGuardados === null) {
    return crearEstadoInicial();
  }
  try {
    return crearEstadoDesdeAvance(pasosGuardados);
  } catch {
    return crearEstadoInicial();
  }
}

/**
 * Abre un paso de la lista (completado o pendiente) sin cambiar el avance (M2).
 * @param {object} estado - Estado de la interfaz.
 * @param {string} idPaso - Paso que se quiere ver.
 */
function abrirPaso(estado, idPaso) {
  try {
    estado.secuencia = verPaso(estado.secuencia, idPaso);
    mostrarPasoVisto(estado);
  } catch (error) {
    mostrarError(error.message);
  }
}

/**
 * Atiende el botón de la tarjeta:
 * - en el paso pendiente, lo completa (M2) y muestra el siguiente;
 * - en un repaso, vuelve al paso pendiente sin cambiar el avance;
 * - en el paso 4 o con la prueba completa, lleva al Analizador.
 * @param {object} estado - Estado de la interfaz.
 */
function avanzarPaso(estado) {
  const paso = obtenerPasoVisto(estado.secuencia);
  const pendiente = obtenerPasoActual(estado.secuencia);
  try {
    const esRepaso = paso !== null && pasoCompletado(estado.secuencia, paso.id);
    if (esRepaso && pendiente !== null) {
      estado.secuencia = verPaso(estado.secuencia, pendiente.id);
    } else if (!esRepaso && paso !== null) {
      estado.secuencia = completarPaso(estado.secuencia, paso.id);
      guardarAvancePrueba(estado.secuencia.pasosCompletados);
    }
    mostrarPasoVisto(estado);
    // El paso 4, o cualquier botón con la prueba ya completa, lleva al Analizador
    if (paso === null || paso.id === PASO_CORRIENTES_FUGA || (esRepaso && pendiente === null)) {
      mostrarSeccion(estado, "analizador");
    }
  } catch (error) {
    mostrarError(error.message);
  }
}

/**
 * Conecta la lista de pasos (un solo escuchador para todos los botones) y el
 * botón de la tarjeta.
 * @param {object} estado - Estado de la interfaz.
 */
function configurarPruebaGuiada(estado) {
  elemento("lista-pasos").addEventListener("click", (evento) => {
    const boton = evento.target.closest("button[data-paso]");
    if (boton && !boton.disabled) {
      abrirPaso(estado, boton.dataset.paso);
    }
  });
  elemento("boton-siguiente-paso").addEventListener("click", () => avanzarPaso(estado));
  mostrarPasoVisto(estado);
}

/* ------------------------------------------------------------------------ */
/* Sección 3: Analizador                                                    */
/* ------------------------------------------------------------------------ */

/**
 * Lee lo que el estudiante eligió en los controles.
 * @returns {{tipoMedicion: string, condicion: {polaridad: string, tierra: string, neutro: string}}}
 */
function leerSeleccion() {
  const valorElegido = (nombre) => document.querySelector(`input[name="${nombre}"]:checked`).value;
  return {
    tipoMedicion: valorElegido("medicion"),
    condicion: { polaridad: valorElegido("polaridad"), tierra: valorElegido("tierra"), neutro: valorElegido("neutro") },
  };
}

/**
 * Habilita o deshabilita una opción de radio y su etiqueta.
 * @param {string} nombre - Nombre del grupo de radios.
 * @param {string} valor - Valor de la opción.
 * @param {boolean} deshabilitada - true para deshabilitarla.
 */
function cambiarDisponibilidadOpcion(nombre, valor, deshabilitada) {
  const opcion = document.querySelector(`input[name="${nombre}"][value="${valor}"]`);
  opcion.disabled = deshabilitada;
  opcion.closest("label").classList.toggle("opcion--deshabilitada", deshabilitada);
}

/**
 * Muestra u oculta una explicación informativa (debajo de una opción).
 * @param {string} id - id del párrafo.
 * @param {string} texto - Explicación.
 * @param {boolean} visible - true si la explicación aplica ahora.
 */
function mostrarNotaInfo(id, texto, visible) {
  const nota = elemento(id);
  nota.textContent = texto;
  nota.hidden = !visible;
}

/**
 * Deshabilita las opciones que no se pueden medir y explica por qué, justo
 * debajo de la opción deshabilitada y solo cuando aplica:
 * - tierra abierta en la fuga a tierra (no hay conductor por donde circule);
 * - doble falla: la tierra si el neutro está abierto, el neutro si la tierra está abierta.
 * @param {string} tipoMedicion - Medición elegida.
 * @param {{tierra: string, neutro: string}} condicion - Condición elegida.
 */
function aplicarRestricciones(tipoMedicion, condicion) {
  const tierraAbierta = condicion.tierra === "abierta";
  const neutroAbierto = condicion.neutro === "abierto";
  const sinTierraPosible = !medicionPosible(tipoMedicion, { ...condicion, tierra: "abierta" });
  cambiarDisponibilidadOpcion("neutro", "abierto", tierraAbierta);
  cambiarDisponibilidadOpcion("tierra", "abierta", neutroAbierto || sinTierraPosible);
  mostrarNotaInfo("info-tierra-fuga", MENSAJE_FUGA_SIN_TIERRA, sinTierraPosible);
  mostrarNotaInfo("info-tierra-doble-falla", TEXTOS_EXPLICACION.dobleFalla, neutroAbierto);
  mostrarNotaInfo("info-neutro-doble-falla", TEXTOS_EXPLICACION.dobleFalla, tierraAbierta);
}

/**
 * Si se elige una medición que no existe con la tierra abierta (fuga a
 * tierra), vuelve a cerrar la tierra antes de seguir.
 * @param {string} tipoMedicion - Medición elegida.
 * @param {{tierra: string}} condicion - Condición elegida.
 * @returns {boolean} true si se cerró la tierra (para avisarlo una vez).
 */
function corregirCondicionImposible(tipoMedicion, condicion) {
  if (medicionPosible(tipoMedicion, condicion)) {
    return false;
  }
  document.querySelector('input[name="tierra"][value="cerrada"]').checked = true;
  return true;
}

/** Deja la lectura en blanco hasta que se vuelva a medir. */
function limpiarLectura() {
  elemento("lectura-etiqueta").textContent = "Lectura";
  elemento("lectura-valor").textContent = "— µA";
  elemento("lectura-limite").textContent = "—";
  elemento("lectura-porcentaje").textContent = "—";
  const veredicto = elemento("lectura-veredicto");
  veredicto.textContent = "—";
  veredicto.className = "";
  elemento("tabla-limites-lectura").querySelector("tbody").replaceChildren();
  elemento("lectura-limite-unico").hidden = true;
  elemento("lectura-comparacion").hidden = true;
  elemento("lectura-pendiente").hidden = false;
  elemento("explicacion-texto").replaceChildren();
  crearConTexto("p", "La explicación aparece después de medir.", elemento("explicacion-texto"), "nota");
  elemento("explicacion-simbolos").replaceChildren();
  elemento("explicacion-formula").replaceChildren();
}

/**
 * Llena el cuadro "¿Qué es cada parte?" debajo del circuito, con las mismas
 * explicaciones que aparecen al pasar el mouse por el dibujo (M6).
 * @param {object} parametros - Parámetros validados (M3).
 */
function mostrarPartesDelCircuito(parametros) {
  const lista = elemento("lista-partes");
  lista.replaceChildren();
  // Una línea por cada parte que va en el cuadro
  for (const parte of describirPartesDelCircuito(parametros).filter((descripcion) => descripcion.enCuadro)) {
    crearConTexto("dt", parte.nombre, lista);
    crearConTexto("dd", parte.explicacion, lista);
  }
}

/**
 * Atiende cualquier cambio en los controles: aplica la restricción, actualiza
 * los conmutadores del dibujo y borra la lectura anterior.
 * @param {object} estado - Estado de la interfaz.
 */
function alCambiarControles(estado) {
  const elegido = leerSeleccion();
  const seCerroLaTierra = corregirCondicionImposible(elegido.tipoMedicion, elegido.condicion);
  const { tipoMedicion, condicion } = leerSeleccion();
  aplicarRestricciones(tipoMedicion, condicion);
  // El aviso de la tierra cerrada sola se ve una vez: desaparece con el siguiente cambio
  mostrarNotaInfo("info-tierra-cerrada-sola", TEXTOS_EXPLICACION.tierraCerradaSola, seCerroLaTierra);
  estado.visualizador.borrarCamino();
  estado.visualizador.mostrarCondicion(condicion, tipoMedicion);
  limpiarLectura();
}

/**
 * Muestra la lectura grande, el límite, qué tan cerca del límite está, el veredicto y los límites B/BF/CF.
 * @param {object} resultado - Resultado evaluado (M4 + M5).
 */
function mostrarLectura(resultado) {
  elemento("lectura-etiqueta").textContent = `${NOMBRES_MEDICION[resultado.tipoMedicion]} · ${describirCondicion(resultado.condicion)}`;
  elemento("lectura-valor").textContent = `${textoLectura(resultado)} µA`;
  const alcanceLimite = resultado.tipoMedicion === MEDICION_FUGA_TIERRA ? "equipo completo" : "parte CF";
  elemento("lectura-limite").textContent = `${textoLimite(resultado.limite_uA)} (${alcanceLimite}, ${NOMBRES_ESTADO[resultado.estadoCondicion].toLowerCase()})`;
  elemento("lectura-porcentaje").textContent = textoPorcentaje(resultado.porcentajeDelLimite);
  const veredicto = elemento("lectura-veredicto");
  const cumple = resultado.veredicto === VEREDICTO_CUMPLE;
  veredicto.textContent = cumple ? `✓ ${resultado.veredicto}` : `✗ ${resultado.veredicto}`;
  veredicto.className = cumple ? "veredicto--cumple" : "veredicto--no-cumple";

  // Contacto y fuga a tierra: el límite es igual para B, BF y CF, basta una frase.
  // Paciente: tabla con los límites equivalentes para partes B, BF y CF (RF07)
  const frasesLimiteUnico = {
    contacto: TEXTOS_EXPLICACION.limiteContactoIgual,
    fuga_tierra: `${TEXTOS_EXPLICACION.limiteEquipoCompleto} ${TEXTOS_EXPLICACION.fugaSegundaEdicion}`,
  };
  const fraseLimiteUnico = frasesLimiteUnico[resultado.tipoMedicion];
  const notaLimiteUnico = elemento("lectura-limite-unico");
  notaLimiteUnico.textContent = fraseLimiteUnico ?? "";
  notaLimiteUnico.hidden = fraseLimiteUnico === undefined;
  elemento("lectura-comparacion").hidden = fraseLimiteUnico !== undefined;
  const fila = document.createElement("tr");
  for (const tipoDeParte of ["B", "BF", "CF"]) {
    crearConTexto("td", textoLimite(resultado.limitesPorTipoDeParte_uA[tipoDeParte]), fila, tipoDeParte === "CF" ? "columna-destacada" : "");
  }
  elemento("tabla-limites-lectura").querySelector("tbody").replaceChildren(fila);
  elemento("lectura-pendiente").hidden = true;
}

/**
 * Escoge los párrafos de explicación (sección 7 de CLAUDE.md) para un resultado.
 * @param {{tipoMedicion: string, condicion: object}} resultado - Resultado evaluado.
 * @returns {string[]} Párrafos.
 */
function textosDeExplicacion(resultado) {
  const { tierra, neutro, polaridad } = resultado.condicion;
  // Fuga a tierra: normal o neutro abierto (con la tierra abierta no existe)
  if (resultado.tipoMedicion === MEDICION_FUGA_TIERRA) {
    const parrafos = [neutro === "abierto" ? TEXTOS_EXPLICACION.fugaNeutroAbierto : TEXTOS_EXPLICACION.fugaNormal];
    if (polaridad === "invertida") {
      parrafos.push(TEXTOS_EXPLICACION.contactoPolaridadInvertida);
    }
    return parrafos;
  }
  const esContacto = resultado.tipoMedicion === "contacto";
  let principal = esContacto ? TEXTOS_EXPLICACION.contactoNormal : TEXTOS_EXPLICACION.pacienteNormal;
  if (tierra === "abierta") {
    principal = esContacto ? TEXTOS_EXPLICACION.contactoTierraAbierta : TEXTOS_EXPLICACION.pacienteTierraAbierta;
  } else if (neutro === "abierto") {
    principal = esContacto ? TEXTOS_EXPLICACION.contactoNeutroAbierto : TEXTOS_EXPLICACION.pacienteNeutroAbierto;
  }
  const parrafos = [principal];
  // Con polaridad invertida se agrega la nota de que casi no cambia
  if (polaridad === "invertida") {
    parrafos.push(esContacto ? TEXTOS_EXPLICACION.contactoPolaridadInvertida : TEXTOS_EXPLICACION.pacientePolaridadInvertida);
  }
  return parrafos;
}

/**
 * Significado de cada sigla de las fórmulas, con su nombre completo y su valor.
 * Se muestra ANTES de la fórmula, para que la primera vez que el estudiante
 * vea una sigla ya sepa qué es.
 * @param {object} parametros - Parámetros validados (M3).
 * @param {number} [capacitanciaActiva_F] - Capacitancia usada en contacto (para X_C), en F.
 * @returns {Record<string, string>} Texto de cada sigla.
 */
function significadoDeSiglas(parametros, capacitanciaActiva_F) {
  const capacitancia_pF = (nombre) =>
    (parametros.capacitancias_F[nombre] * PICOFARADIOS_POR_FARADIO).toFixed(DECIMALES_CAPACITANCIA);
  const { V_rms, f_Hz } = parametros.red;
  const corrientePorFaradio = corrientePorFaradio_A_F(parametros).toFixed(DECIMALES_CORRIENTE_POR_FARADIO);
  const significados = {
    I: "I (corriente que pasa por la MD, el cuerpo humano simulado: es lo que lee el analizador)",
    I_TIERRA: "I (corriente que circula por el conductor de protección hacia la tierra: es lo que lee el analizador)",
    K_N: `k_N (factor empírico de la fuga a tierra con neutro abierto, calibrado en el laboratorio: 27.13 µA / 14.73 µA − 1) = ${parametros.factor_neutro_abierto_fuga_tierra}`,
    VF: `V·2πf (tensión de la red V = ${V_rms} V, por 2π, por la frecuencia f = ${f_Hz} Hz) = ${corrientePorFaradio} A/F`,
    C_L: `C_L (capacitancia de fuga entre fase y chasis) = ${capacitancia_pF("C_L")} pF`,
    C_N: `C_N (capacitancia de fuga entre neutro y chasis) = ${capacitancia_pF("C_N")} pF`,
    C_AP: `C_AP (capacitancia del aislamiento entre la red y los electrodos) = ${capacitancia_pF("C_AP")} pF`,
    R_PE: `R_PE (resistencia del conductor de protección, PE) = ${parametros.R_PE_ohm} Ω`,
    R_MD: `R_MD (resistencia de la MD, el cuerpo humano simulado) = ${parametros.R_MD_ohm} Ω`,
    DELTA: `ΔI (aumento de corriente medido en el laboratorio con la tierra abierta; término empírico) = ${formatearCorriente_uA(parametros.delta_paciente_tierra_abierta_A * MICROAMPERIOS_POR_AMPERIO)} µA`,
    U: `U (incertidumbre expandida del analizador real, k = ${parametros.exactitud_analizador.k})`,
  };
  // X_C solo tiene sentido cuando hay una capacitancia de contacto
  if (capacitanciaActiva_F !== undefined) {
    const reactancia_Mohm = 1 / (2 * Math.PI * f_Hz * capacitanciaActiva_F) / OHMIOS_POR_MEGAOHMIO;
    significados.X_C = `X_C (reactancia capacitiva: cuánto se opone el capacitor a la corriente alterna) = 1/(2πf·C) ≈ ${reactancia_Mohm.toFixed(DECIMALES_REACTANCIA)} MΩ`;
  }
  return significados;
}

/**
 * Arma la fórmula usada: primero el significado de las siglas y después las
 * líneas de la fórmula con los números reemplazados.
 * @param {object} resultado - Resultado evaluado (incluye ramas del motor).
 * @param {object} parametros - Parámetros validados (M3).
 * @returns {{simbolos: string[], lineas: string[]}} Siglas explicadas y líneas de la fórmula.
 */
function formulaUsada(resultado, parametros) {
  const { condicion } = resultado;
  const corrientePorFaradio = corrientePorFaradio_A_F(parametros).toFixed(DECIMALES_CORRIENTE_POR_FARADIO);
  const corriente = formatearCorriente_uA(resultado.corriente_uA);
  const lineas = [];
  let siglasUsadas;
  let significados;

  if (resultado.tipoMedicion === MEDICION_FUGA_TIERRA) {
    // Fuga a tierra: toda la fuga capacitiva vuelve por el conductor de protección
    significados = significadoDeSiglas(parametros);
    const capacitancia_pF = (capacitanciaFugaATierra_F(condicion, parametros) * PICOFARADIOS_POR_FARADIO).toFixed(DECIMALES_CAPACITANCIA);
    const [activa, otra] = condicion.polaridad === "normal" ? ["C_L", "C_N"] : ["C_N", "C_L"];
    if (condicion.neutro === "abierto") {
      siglasUsadas = ["I_TIERRA", "VF", "C_L", "C_N", "K_N", "U"];
      lineas.push(`I = V·2πf · (${activa} + k_N · ${otra})`);
    } else {
      siglasUsadas = ["I_TIERRA", "VF", activa, "U"];
      lineas.push(`I = V·2πf · ${activa}`);
    }
    lineas.push(`I = ${corrientePorFaradio} A/F × ${capacitancia_pF} pF = ${corriente} µA`);
  } else if (resultado.tipoMedicion === "contacto") {
    const capacitancia_F = capacitanciaDeFuga_F(condicion, parametros);
    const capacitancia_pF = (capacitancia_F * PICOFARADIOS_POR_FARADIO).toFixed(DECIMALES_CAPACITANCIA);
    significados = significadoDeSiglas(parametros, capacitancia_F);
    let siglasC = [condicion.polaridad === "normal" ? "C_L" : "C_N"];
    if (condicion.neutro === "abierto") {
      siglasC = ["C_L", "C_N"];
    }
    const nombreC = siglasC.length > 1 ? `(${siglasC.join(" + ")})` : siglasC[0];
    if (condicion.tierra === "cerrada") {
      // Divisor de corriente entre el PE y la persona
      siglasUsadas = ["I", "VF", ...siglasC, "R_PE", "R_MD", "U"];
      lineas.push(`I = V·2πf · ${nombreC} · R_PE / (R_PE + R_MD)`);
      lineas.push(`I = ${corrientePorFaradio} A/F × ${capacitancia_pF} pF × ${parametros.R_PE_ohm} Ω / (${parametros.R_PE_ohm} Ω + ${parametros.R_MD_ohm} Ω) = ${corriente} µA`);
    } else {
      // Toda la fuga por la persona (aproximación X_C ≫ R_MD)
      siglasUsadas = ["I", "VF", ...siglasC, "X_C", "R_MD", "U"];
      lineas.push(`I ≈ V·2πf · ${nombreC}`);
      lineas.push(`I = ${corrientePorFaradio} A/F × ${capacitancia_pF} pF = ${corriente} µA`);
      lineas.push(`Se desprecia R_MD porque X_C ≫ R_MD (${parametros.R_MD_ohm / OHMIOS_POR_KILOOHMIO} kΩ).`);
    }
  } else {
    significados = significadoDeSiglas(parametros);
    const capacitanciaAP_pF = (parametros.capacitancias_F.C_AP * PICOFARADIOS_POR_FARADIO).toFixed(DECIMALES_CAPACITANCIA);
    const barrera = formatearCorriente_uA(resultado.ramas.barreraAislamiento_uA);
    if (condicion.tierra === "abierta") {
      // Se suma el término empírico medido en el laboratorio
      const delta = formatearCorriente_uA(resultado.ramas.terminoEmpirico_uA);
      siglasUsadas = ["I", "VF", "C_AP", "DELTA", "U"];
      lineas.push("I = V·2πf · C_AP + ΔI");
      lineas.push(`I = ${corrientePorFaradio} A/F × ${capacitanciaAP_pF} pF + ${delta} µA = ${barrera} µA + ${delta} µA = ${corriente} µA`);
    } else {
      siglasUsadas = ["I", "VF", "C_AP", "U"];
      lineas.push("I = V·2πf · C_AP");
      lineas.push(`I = ${corrientePorFaradio} A/F × ${capacitanciaAP_pF} pF = ${corriente} µA`);
    }
  }

  // Incertidumbre del analizador real
  const exactitud = parametros.exactitud_analizador;
  lineas.push(`U = ${exactitud.k} · (${exactitud.porcentaje_lectura} % · I + ${exactitud.piso_uA} µA) / √3 = ${formatearCorriente_uA(resultado.incertidumbre_uA)} µA`);
  return { simbolos: siglasUsadas.map((sigla) => significados[sigla]), lineas };
}

/**
 * Muestra la explicación física y la fórmula usada.
 * @param {object} resultado - Resultado evaluado.
 * @param {object} parametros - Parámetros validados (M3).
 */
function mostrarExplicacion(resultado, parametros) {
  const contenedorTexto = elemento("explicacion-texto");
  contenedorTexto.replaceChildren();
  // Un párrafo por cada texto de explicación
  for (const parrafo of textosDeExplicacion(resultado)) {
    crearConTexto("p", parrafo, contenedorTexto);
  }
  const { simbolos, lineas } = formulaUsada(resultado, parametros);
  const listaSimbolos = elemento("explicacion-simbolos");
  listaSimbolos.replaceChildren();
  // Primero, qué significa cada sigla
  for (const simbolo of simbolos) {
    crearConTexto("li", simbolo, listaSimbolos);
  }
  const contenedorFormula = elemento("explicacion-formula");
  contenedorFormula.replaceChildren();
  // Después, una línea por cada paso de la fórmula
  for (const linea of lineas) {
    crearConTexto("p", linea, contenedorFormula);
  }
}

/**
 * Botón "Medir": pide el cálculo al núcleo y muestra todo.
 * Camino: controles → M4 (calcularMedicion) → M5 (evaluarMedicion) → pantalla y M6.
 * @param {object} estado - Estado de la interfaz.
 */
function medir(estado) {
  ocultarError();
  try {
    const { tipoMedicion, condicion } = leerSeleccion();
    const medicion = calcularMedicion(tipoMedicion, condicion, estado.parametros);
    const resultado = evaluarMedicion(medicion, estado.parametros);
    mostrarLectura(resultado);
    mostrarExplicacion(resultado, estado.parametros);
    estado.visualizador.mostrarCamino(resultado);
    registrarLectura(estado, resultado);
  } catch (error) {
    mostrarError(error.message);
  }
}

/**
 * Conecta los controles y el botón Medir del Analizador.
 * @param {object} estado - Estado de la interfaz.
 */
function configurarAnalizador(estado) {
  // Cualquier cambio en un radio actualiza el dibujo y borra la lectura
  for (const control of document.querySelectorAll(".controles input[type=radio]")) {
    control.addEventListener("change", () => alCambiarControles(estado));
  }
  elemento("boton-medir").addEventListener("click", () => medir(estado));
  elemento("explicacion-banda").textContent = TEXTOS_EXPLICACION.bandaIncertidumbre;
  mostrarPartesDelCircuito(estado.parametros);
  alCambiarControles(estado);
}

/* ------------------------------------------------------------------------ */
/* Sección 4: Comparar                                                      */
/* ------------------------------------------------------------------------ */

/**
 * Guarda una lectura en el historial (M8) y actualiza Comparar e Historial.
 * @param {object} estado - Estado de la interfaz.
 * @param {object} resultado - Resultado evaluado.
 */
function registrarLectura(estado, resultado) {
  estado.historial.agregar(resultado);
  mostrarComparacion(estado);
  mostrarHistorial(estado);
  // Con una lectura nueva, el reporte anterior queda desactualizado: se vuelve al historial
  cambiarVistaHistorial(false);
}

/**
 * Escribe en una fila de tabla las columnas de un registro (mismo formato en todas las tablas).
 * @param {HTMLTableRowElement} fila - Fila de la tabla.
 * @param {object} registro - Registro del historial.
 * @param {string[]} campos - Campos de filaDeRegistro, en el orden de las columnas.
 */
function llenarFila(fila, registro, campos) {
  const datos = filaDeRegistro(registro);
  // Una celda por campo
  for (const campo of campos) {
    const esVeredicto = campo === "veredicto";
    const claseVeredicto = registro.veredicto === VEREDICTO_CUMPLE ? "veredicto--cumple" : "veredicto--no-cumple";
    crearConTexto("td", datos[campo], fila, esVeredicto ? claseVeredicto : "");
  }
}

/**
 * Deja solo la última lectura de cada configuración, en el orden fijo de Comparar.
 * @param {object[]} lecturas - Todas las lecturas de la sesión.
 * @returns {object[]} Una lectura por configuración, ordenadas.
 */
function ultimaLecturaPorConfiguracion(lecturas) {
  const porClave = new Map();
  // La lectura más reciente reemplaza a la anterior de la misma configuración
  for (const lectura of lecturas) {
    porClave.set(claveConfiguracion(lectura), lectura);
  }
  const ordenDeClaves = CONFIGURACIONES.map(claveConfiguracion);
  const posicion = (lectura) => ordenDeClaves.indexOf(claveConfiguracion(lectura));
  return [...porClave.values()].sort((primera, segunda) => posicion(primera) - posicion(segunda));
}

/**
 * Llena la tabla de Comparar.
 * @param {object[]} filas - Lecturas ordenadas.
 */
function mostrarTablaComparar(filas) {
  const cuerpo = elemento("tabla-comparar").querySelector("tbody");
  cuerpo.replaceChildren();
  // Una fila por configuración
  for (const lectura of filas) {
    llenarFila(cuerpo.insertRow(), lectura, ["medicion", "condicion", "lectura", "limite", "porcentaje", "veredicto"]);
  }
}

/**
 * Llena una lista con un renglón por texto.
 * @param {HTMLElement} lista - Elemento ul.
 * @param {string[]} textos - Renglones.
 */
function llenarLista(lista, textos) {
  lista.replaceChildren();
  // Un renglón por texto
  for (const texto of textos) {
    crearConTexto("li", texto, lista);
  }
}

/**
 * Muestra el cuadro de avance de Comparar: cuántas de las 16 configuraciones
 * se midieron, cuáles faltan y cuáles se repitieron (cálculo puro en M8).
 * @param {object[]} registros - Todas las lecturas del historial.
 */
function mostrarAvance(registros) {
  const avance = resumirAvance(registros, CONFIGURACIONES);
  const completo = avance.faltantes.length === 0;
  elemento("avance-resumen").textContent = completo
    ? `Has medido ${avance.medidas} de las ${avance.total} configuraciones que simula esta herramienta. Completaste las ${avance.total} configuraciones.`
    : `Has medido ${avance.medidas} de las ${avance.total} configuraciones que simula esta herramienta.`;
  elemento("avance-faltan-bloque").hidden = completo;
  llenarLista(elemento("avance-faltan"), avance.faltantes.map(textoConfiguracion));
  elemento("avance-repetidas-bloque").hidden = avance.repetidas.length === 0;
  llenarLista(elemento("avance-repetidas"),
    avance.repetidas.map(({ configuracion, veces }) => `${textoConfiguracion(configuracion)}: ${veces} veces`));
}

/**
 * Actualiza toda la sección Comparar (avance, gráficas y tabla).
 * @param {object} estado - Estado de la interfaz.
 */
function mostrarComparacion(estado) {
  mostrarAvance(estado.historial.obtenerRegistros());
  const filas = ultimaLecturaPorConfiguracion(estado.historial.obtenerRegistros());
  const hayLecturas = filas.length > 0;
  elemento("comparar-vacio").hidden = hayLecturas;
  elemento("comparar-tabla-tarjeta").hidden = !hayLecturas;
  mostrarTablaComparar(filas);

  const contenedor = elemento("comparar-graficas");
  contenedor.replaceChildren();
  // Una gráfica por tipo de medición (cada una con su propia escala)
  for (const tipoMedicion of ORDEN_MEDICIONES) {
    const filasDelTipo = filas.filter((lectura) => lectura.tipoMedicion === tipoMedicion);
    if (filasDelTipo.length > 0) {
      contenedor.appendChild(crearTarjetaGrafica(NOMBRES_MEDICION[tipoMedicion], filasDelTipo));
    }
  }
}

/* ---------- Gráfica de barras horizontales en SVG propio ---------- */

/** Medidas de la gráfica de barras, en unidades del viewBox. */
const GRAFICA = Object.freeze({
  ancho: 600,
  margenEtiquetas: 200,
  margenValores: 120,
  margenSuperior: 8,
  altoFila: 40,
  altoEje: 26,
  altoBarra: 12,
  altoBanda: 22,
  radioPunta: 4,
  separacionTexto: 8,
  divisionesEje: 4,
  margenEscala: 1.05,
  cifrasMarcas: 3,
});

/** Pasos "redondos" para las marcas del eje (1, 2, 5 × 10ⁿ). */
const PASOS_REDONDOS = Object.freeze([1, 2, 5, 10]);

/** Espacio de nombres de SVG. */
const ESPACIO_SVG = "http://www.w3.org/2000/svg";

/**
 * Escoge un máximo redondo para el eje, para que las marcas sean números fáciles de leer.
 * @param {number} valorMaximo_uA - Mayor valor a mostrar (I + U), en µA.
 * @returns {{maximo_uA: number, paso_uA: number}} Máximo del eje y distancia entre marcas.
 */
function calcularEscalaRedonda(valorMaximo_uA) {
  const pasoCrudo = (valorMaximo_uA * GRAFICA.margenEscala) / GRAFICA.divisionesEje;
  const potencia = 10 ** Math.floor(Math.log10(pasoCrudo));
  const factor = PASOS_REDONDOS.find((candidato) => candidato * potencia >= pasoCrudo);
  const paso_uA = factor * potencia;
  return { maximo_uA: paso_uA * GRAFICA.divisionesEje, paso_uA };
}

/**
 * Crea un elemento SVG con atributos.
 * @param {string} etiqueta - Nombre del elemento.
 * @param {object} atributos - Atributos.
 * @param {Element} padre - Padre.
 * @returns {SVGElement} Elemento creado.
 */
function crearSvg(etiqueta, atributos, padre) {
  const nuevo = document.createElementNS(ESPACIO_SVG, etiqueta);
  // Copia cada atributo
  for (const [nombre, valor] of Object.entries(atributos)) {
    nuevo.setAttribute(nombre, String(valor));
  }
  padre.appendChild(nuevo);
  return nuevo;
}

/**
 * Trazo de una barra con la punta derecha redondeada y la base recta.
 * @param {number} x - Inicio (base) de la barra.
 * @param {number} y - Borde superior.
 * @param {number} ancho - Largo de la barra.
 * @param {number} alto - Grosor de la barra.
 * @returns {string} Atributo "d" del path.
 */
function trazoBarra(x, y, ancho, alto) {
  const radio = Math.min(GRAFICA.radioPunta, ancho, alto / 2);
  return `M${x},${y} h${ancho - radio} a${radio},${radio} 0 0 1 ${radio},${radio} v${alto - 2 * radio} a${radio},${radio} 0 0 1 ${-radio},${radio} h${-(ancho - radio)} z`;
}

/**
 * Dibuja la gráfica de barras (I) con su banda ± U para una lista de lecturas.
 * @param {object[]} filas - Lecturas del mismo tipo de medición.
 * @returns {SVGSVGElement} La gráfica.
 */
function dibujarGraficaBarras(filas) {
  const anchoBarras = GRAFICA.ancho - GRAFICA.margenEtiquetas - GRAFICA.margenValores;
  const alto = GRAFICA.margenSuperior + filas.length * GRAFICA.altoFila + GRAFICA.altoEje;
  const valorMaximo = Math.max(...filas.map((lectura) => lectura.corriente_uA + lectura.incertidumbre_uA));
  const escala = calcularEscalaRedonda(valorMaximo);
  const posicionX = (valor_uA) => GRAFICA.margenEtiquetas + (valor_uA / escala.maximo_uA) * anchoBarras;

  const svg = document.createElementNS(ESPACIO_SVG, "svg");
  svg.setAttribute("viewBox", `0 0 ${GRAFICA.ancho} ${alto}`);
  svg.setAttribute("class", "grafica-barras");
  svg.setAttribute("role", "img");

  // Líneas guía y marcas del eje
  const ejeY = alto - GRAFICA.altoEje;
  for (let marca = 0; marca <= GRAFICA.divisionesEje; marca++) {
    const valorMarca = marca * escala.paso_uA;
    const x = posicionX(valorMarca);
    crearSvg("line", { x1: x, y1: GRAFICA.margenSuperior, x2: x, y2: ejeY, class: "eje" }, svg);
    const texto = crearSvg("text", { x, y: ejeY + GRAFICA.altoEje / 2 + GRAFICA.separacionTexto / 2, "text-anchor": "middle", class: "texto-grafica texto-grafica--secundario" }, svg);
    texto.textContent = String(Number(valorMarca.toPrecision(GRAFICA.cifrasMarcas)));
  }

  // Una fila por lectura: banda ± U, barra I, nombre y valor
  for (const [indice, lectura] of filas.entries()) {
    const centroY = GRAFICA.margenSuperior + indice * GRAFICA.altoFila + GRAFICA.altoFila / 2;
    const grupo = crearSvg("g", { class: "fila-grafica" }, svg);
    const ayuda = crearSvg("title", {}, grupo);
    ayuda.textContent = `${nombreCortoCondicion(lectura.condicion)}: ${textoLectura(lectura)} µA · límite ${textoLimite(lectura.limite_uA)} · ${lectura.veredicto}`;

    const inicioBanda = posicionX(Math.max(0, lectura.corriente_uA - lectura.incertidumbre_uA));
    const finBanda = posicionX(lectura.corriente_uA + lectura.incertidumbre_uA);
    crearSvg("rect", { x: inicioBanda, y: centroY - GRAFICA.altoBanda / 2, width: finBanda - inicioBanda, height: GRAFICA.altoBanda, class: "banda-incertidumbre" }, grupo);
    const anchoBarra = posicionX(lectura.corriente_uA) - GRAFICA.margenEtiquetas;
    if (anchoBarra > 0) {
      crearSvg("path", { d: trazoBarra(GRAFICA.margenEtiquetas, centroY - GRAFICA.altoBarra / 2, anchoBarra, GRAFICA.altoBarra), class: "barra" }, grupo);
    }

    const nombre = crearSvg("text", { x: GRAFICA.margenEtiquetas - GRAFICA.separacionTexto, y: centroY, "dominant-baseline": "middle", "text-anchor": "end", class: "texto-grafica" }, grupo);
    nombre.textContent = nombreCortoCondicion(lectura.condicion);
    const valor = crearSvg("text", { x: GRAFICA.ancho - GRAFICA.margenValores + GRAFICA.separacionTexto, y: centroY, "dominant-baseline": "middle", class: "texto-grafica" }, grupo);
    valor.textContent = `${textoLectura(lectura)} µA`;
  }

  // Línea base (cero)
  crearSvg("line", { x1: GRAFICA.margenEtiquetas, y1: GRAFICA.margenSuperior, x2: GRAFICA.margenEtiquetas, y2: ejeY, class: "eje" }, svg);
  return svg;
}

/**
 * Crea la tarjeta de una gráfica con título y leyenda (barra = I, franja = ± U).
 * @param {string} titulo - Nombre de la medición.
 * @param {object[]} filas - Lecturas de esa medición.
 * @returns {HTMLElement} Tarjeta.
 */
function crearTarjetaGrafica(titulo, filas) {
  const tarjeta = document.createElement("div");
  tarjeta.className = "tarjeta";
  crearConTexto("h3", `${titulo} (µA)`, tarjeta);
  const leyenda = document.createElement("div");
  leyenda.className = "leyenda-barras";
  // Dos muestras de la leyenda: la barra y la banda
  for (const [claseMuestra, texto] of [["muestra muestra--barra", "Lectura"], ["muestra muestra--banda", "Margen de incertidumbre del analizador"]]) {
    const item = document.createElement("span");
    crearConTexto("span", "", item, claseMuestra);
    item.append(texto);
    leyenda.appendChild(item);
  }
  tarjeta.appendChild(leyenda);
  tarjeta.appendChild(dibujarGraficaBarras(filas));
  return tarjeta;
}

/* ------------------------------------------------------------------------ */
/* Sección 5: Historial y reporte                                           */
/* ------------------------------------------------------------------------ */

/**
 * Muestra la vista del historial o la del reporte (nunca las dos).
 * @param {boolean} mostrarReporte - true para ver el reporte; false para ver el historial.
 */
function cambiarVistaHistorial(mostrarReporte) {
  elemento("historial-vista").hidden = mostrarReporte;
  elemento("reporte-vista").hidden = !mostrarReporte;
}

/**
 * Llena la tabla del historial y el resumen antes de finalizar.
 * @param {object} estado - Estado de la interfaz.
 */
function mostrarHistorial(estado) {
  const registros = estado.historial.obtenerRegistros();
  const hayLecturas = registros.length > 0;
  elemento("historial-vacio").hidden = hayLecturas;
  elemento("historial-tabla-tarjeta").hidden = !hayLecturas;

  const cuerpo = elemento("tabla-historial").querySelector("tbody");
  cuerpo.replaceChildren();
  // Una fila por lectura, en orden de llegada
  for (const [indice, registro] of registros.entries()) {
    const fila = cuerpo.insertRow();
    crearConTexto("td", String(indice + 1), fila);
    llenarFila(fila, registro, ["hora", "medicion", "condicion", "lectura", "limite", "porcentaje", "veredicto"]);
  }

  // Antes de generar el reporte se revisa cuántas lecturas hay
  const configuracionesPosibles = CONFIGURACIONES.length;
  const configuracionesMedidas = ultimaLecturaPorConfiguracion(registros).length;
  elemento("finalizar-resumen").textContent = hayLecturas
    ? `Llevas ${registros.length} lecturas de ${configuracionesMedidas} configuraciones distintas (hay ${configuracionesPosibles} posibles). El reporte incluye todas las lecturas.`
    : "Necesitas al menos una lectura para generar el reporte.";
  elemento("boton-finalizar").disabled = !hayLecturas;
}

/**
 * Genera el reporte (M10) y mide cuánto tarda, desde el clic hasta que se
 * dibuja en pantalla (ES09: ≤ 3 s).
 * @param {object} estado - Estado de la interfaz.
 */
function generarYMostrarReporte(estado) {
  const inicio_ms = performance.now();
  const campoNombre = elemento("campo-nombre");
  const datos = {
    nombre: limpiarNombre(campoNombre.value),
    registros: estado.historial.obtenerRegistros(),
    parametros: estado.parametros,
    fecha: new Date(),
    cargaPagina: estado.cargaPagina,
  };
  campoNombre.value = datos.nombre;
  // Se guardan los datos para que el PDF y el resumen copiado sean iguales a lo que se ve
  estado.datosReporte = datos;
  generarReporte(elemento("reporte-contenido"), datos);
  elemento("estado-pdf").textContent = "";
  elemento("estado-copia").textContent = "";
  cambiarVistaHistorial(true);
  window.scrollTo(0, 0);
  // El tiempo se toma en el siguiente cuadro, cuando el reporte ya está dibujado
  window.requestAnimationFrame(() => {
    const duracion_ms = performance.now() - inicio_ms;
    const cumple = duracion_ms <= TIEMPO_MAXIMO_REPORTE_S * MILISEGUNDOS_POR_SEGUNDO;
    elemento("reporte-tiempo").textContent =
      `Reporte generado en ${Math.round(duracion_ms)} ms (meta ES09: ≤ ${TIEMPO_MAXIMO_REPORTE_S} s, ${cumple ? "cumple" : "no cumple"}).`;
  });
}

/**
 * Crea el PDF del reporte (M10) y lo descarga directo con el nombre
 * reporte_seguridad_electrica_AAAA-MM-DD.pdf. Si algo falla, lo dice en
 * pantalla sin romper la página.
 * @param {object} estado - Estado de la interfaz (con los datos del reporte generado).
 */
function descargarReporte(estado) {
  const mensaje = elemento("estado-pdf");
  try {
    const nombreArchivo = nombreArchivoReporte(estado.datosReporte.fecha);
    descargarPdf(crearPdfReporte(estado.datosReporte), nombreArchivo);
    mensaje.textContent = `Descargado: ${nombreArchivo} (búscalo en tu carpeta de Descargas).`;
  } catch (error) {
    mensaje.textContent = `${MENSAJE_PDF_FALLIDO} (${error.message})`;
  }
}

/**
 * Copia al portapapeles el resumen del reporte, para pegarlo en cualquier
 * correo (Outlook, Gmail, el de la universidad). El navegador solo lo permite en páginas
 * seguras (https o el servidor local) y después de un clic.
 * @param {object} estado - Estado de la interfaz (con los datos del reporte generado).
 */
async function copiarResumen(estado) {
  const mensaje = elemento("estado-copia");
  try {
    await navigator.clipboard.writeText(armarResumen(estado.datosReporte));
    mensaje.textContent = MENSAJE_RESUMEN_COPIADO;
  } catch {
    mensaje.textContent = MENSAJE_COPIA_FALLIDA;
  }
}

/**
 * Conecta los botones del historial y del reporte.
 * @param {object} estado - Estado de la interfaz.
 */
function configurarHistorial(estado) {
  // "Finalizar práctica" pide el nombre (opcional)
  elemento("boton-finalizar").addEventListener("click", () => {
    elemento("panel-nombre").hidden = false;
    elemento("campo-nombre").focus();
  });
  elemento("boton-generar-reporte").addEventListener("click", () => generarYMostrarReporte(estado));
  // Enter en el campo del nombre también genera el reporte
  elemento("campo-nombre").addEventListener("keydown", (evento) => {
    if (evento.key === "Enter") {
      generarYMostrarReporte(estado);
    }
  });
  elemento("boton-descargar-pdf").addEventListener("click", () => descargarReporte(estado));
  elemento("boton-copiar-resumen").addEventListener("click", () => copiarResumen(estado));
  elemento("boton-volver-historial").addEventListener("click", () => cambiarVistaHistorial(false));
}

/* ------------------------------------------------------------------------ */
/* Arranque                                                                 */
/* ------------------------------------------------------------------------ */

/**
 * Arranca la interfaz con los parámetros ya validados por M3.
 * @param {object} parametros - Parámetros del R12 (M3).
 */
export function iniciarInterfaz(parametros) {
  const estado = {
    parametros,
    secuencia: recuperarSecuencia(),
    visualizador: crearVisualizador(elemento("svg-circuito"), parametros),
    historial: crearHistorial(),
    datosReporte: null,
    cargaPagina: null,
  };
  // Tiempo de carga de esta página (ES03): se mide cuando termina el evento load
  medirCargaPagina().then((carga) => {
    estado.cargaPagina = carga;
    elemento("tiempo-carga").textContent = `${textoTiempoCarga(carga)} (${detalleCarga(carga)})`;
  });
  mostrarEquipo(parametros);
  mostrarGlosario(parametros);
  // La misma nota debajo de cada tabla con la columna "Qué tan cerca del límite"
  for (const nota of document.querySelectorAll("[data-nota-cerca-limite]")) {
    nota.textContent = TEXTO_CERCA_DEL_LIMITE;
  }
  configurarNavegacion(estado);
  configurarPruebaGuiada(estado);
  configurarAnalizador(estado);
  elemento("comparar-incertidumbre").textContent = TEXTO_INCERTIDUMBRE;
  configurarHistorial(estado);
  // Si la página se recargó, muestra las lecturas que ya había en esta pestaña
  mostrarComparacion(estado);
  mostrarHistorial(estado);
  mostrarSeccion(estado, SECCION_INICIAL);
}
