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
 * Creado: 2026-11-13 · Modificado: 2026-11-13
 * ============================================================================
 */

import { PASOS_PRUEBA, crearEstadoInicial, obtenerPasoActual, completarPaso, pasoDisponible } from "../nucleo/secuencia.js";
import { calcularMedicion, corrientePorFaradio_A_F, capacitanciaDeFuga_F } from "../nucleo/motor_calculo.js";
import { evaluarMedicion, VEREDICTO_CUMPLE } from "../nucleo/evaluador_limites.js";
import { crearVisualizador, describirPartesDelCircuito, formatearCorriente_uA } from "./visualizador.js";

/* ------------------------------------------------------------------------ */
/* Constantes                                                               */
/* ------------------------------------------------------------------------ */

/** Sección que se muestra al abrir la página. */
const SECCION_INICIAL = "equipo";

/** Secciones que se desbloquean al llegar al paso 4 de la prueba guiada. */
const SECCIONES_BLOQUEADAS_POR_PRUEBA = Object.freeze(["analizador", "comparar"]);

/** Paso de la prueba guiada que desbloquea el Analizador. */
const PASO_CORRIENTES_FUGA = "corrientes_fuga";

/** Decimales de la lectura "I ± U" y del % del límite. */
const DECIMALES_LECTURA = 2;
const DECIMALES_PORCENTAJE = 1;

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
const NOMBRES_MEDICION = Object.freeze({ contacto: "Corriente de contacto", paciente: "Corriente de paciente CF" });
const NOMBRES_ESTADO = Object.freeze({ normal: "condición normal", primer_defecto: "primer defecto" });
const ETIQUETAS_AISLAMIENTO = Object.freeze({
  red_tierra: "Red – tierra",
  partes_aplicadas_tierra: "Partes aplicadas – tierra",
  red_partes_aplicadas: "Red – partes aplicadas",
});

/** Orden fijo de las mediciones y de las condiciones en la sección Comparar. */
const ORDEN_MEDICIONES = Object.freeze(["contacto", "paciente"]);
const ORDEN_CONDICIONES = Object.freeze([
  "normal|cerrada|cerrado", "invertida|cerrada|cerrado",
  "normal|abierta|cerrado", "invertida|abierta|cerrado",
  "normal|cerrada|abierto", "invertida|cerrada|abierto",
]);

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
  bandaIncertidumbre: "Es la exactitud del analizador real (±(1 % + 1 µA), k = 2). Si dos lecturas difieren menos que esta banda, la diferencia puede ser del instrumento y no de la condición.",
  dobleFalla: "No se pueden abrir la tierra y el neutro al mismo tiempo: serían dos fallas a la vez (doble falla). La norma evalúa una sola falla a la vez (primer defecto), por eso esa opción está deshabilitada.",
});

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

/**
 * Nombre corto de una condición para tablas y gráficas, por ejemplo "Tierra abierta (pol. invertida)".
 * @param {{polaridad: string, tierra: string, neutro: string}} condicion - Condición de prueba.
 * @returns {string} Nombre corto.
 */
function nombreCortoCondicion(condicion) {
  let falla = "Normal";
  if (condicion.tierra === "abierta") {
    falla = "Tierra abierta";
  } else if (condicion.neutro === "abierto") {
    falla = "Neutro abierto";
  }
  return `${falla} (pol. ${condicion.polaridad})`;
}

/**
 * Texto "I ± U" de una lectura, con 2 decimales fijos como en una pantalla de
 * analizador (por eso 0.0000383 µA se ve como 0.00). El valor exacto aparece
 * en la fórmula y en el circuito.
 * @param {{corriente_uA: number, incertidumbre_uA: number}} resultado - Resultado evaluado.
 * @returns {string} Por ejemplo "14.73 ± 1.32".
 */
function textoLectura(resultado) {
  return `${resultado.corriente_uA.toFixed(DECIMALES_LECTURA)} ± ${resultado.incertidumbre_uA.toFixed(DECIMALES_LECTURA)}`;
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
  elemento("ficha-normas").textContent = `${equipo.norma_general} y ${equipo.norma_particular}`;
  elemento("ficha-fuente").textContent = `Fuente de los datos: ${parametros.fuente}.`;

  const cuerpo = elemento("tabla-limites-equipo").querySelector("tbody");
  cuerpo.replaceChildren();
  // Una fila por cada corriente y cada estado (normal y primer defecto)
  for (const tipoMedicion of ORDEN_MEDICIONES) {
    for (const estado of Object.keys(NOMBRES_ESTADO)) {
      const fila = document.createElement("tr");
      crearConTexto("td", NOMBRES_MEDICION[tipoMedicion].replace(" CF", ""), fila);
      crearConTexto("td", NOMBRES_ESTADO[estado], fila);
      const grupos = tipoMedicion === "contacto"
        ? ["contacto", "contacto", "contacto"]
        : ["paciente_B", "paciente_BF", "paciente_CF"];
      // Límite de cada tipo de parte aplicada (B, BF, CF)
      for (const [indice, grupo] of grupos.entries()) {
        const esColumnaCF = indice === grupos.length - 1;
        crearConTexto("td", String(limites[grupo][estado]), fila, esColumnaCF ? "columna-destacada" : "");
      }
      cuerpo.appendChild(fila);
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
 * Escribe en una lista de definiciones (dl) el resultado medido de un paso.
 * @param {HTMLElement} lista - Elemento dl.
 * @param {string} claveDato - Campo de pasos_previos_medidos.
 * @param {object} pasosPrevios - Objeto pasos_previos_medidos del JSON.
 */
function escribirResultadoPaso(lista, claveDato, pasosPrevios) {
  const dato = pasosPrevios[claveDato];
  lista.replaceChildren();
  if (claveDato === "inspeccion_visual") {
    crearConTexto("dt", "Hallazgos", lista);
    crearConTexto("dd", dato, lista);
  } else if (claveDato === "resistencia_tierra_ohm") {
    crearConTexto("dt", "Resistencia medida", lista);
    crearConTexto("dd", `${dato.valor} Ω`, lista);
    crearConTexto("dt", "Límite", lista);
    crearConTexto("dd", `≤ ${dato.limite} Ω`, lista);
  } else if (claveDato === "aislamiento_Mohm") {
    // Una fila por cada par de puntos medidos
    for (const [clave, valor] of Object.entries(dato)) {
      crearConTexto("dt", ETIQUETAS_AISLAMIENTO[clave] ?? clave, lista);
      crearConTexto("dd", `${valor} MΩ`, lista);
    }
  }
}

/**
 * Dibuja la lista de los 4 pasos con su estado (completado, actual o bloqueado).
 * @param {object} estado - Estado de la interfaz.
 */
function mostrarListaPasos(estado) {
  const lista = elemento("lista-pasos");
  const pasoActual = obtenerPasoActual(estado.secuencia);
  lista.replaceChildren();
  // Un elemento por paso
  for (const [indice, paso] of PASOS_PRUEBA.entries()) {
    const elementoPaso = crearConTexto("li", `${indice + 1}. ${paso.titulo}`, lista);
    let estadoPaso = "bloqueado";
    if (pasoActual !== null && paso.id === pasoActual.id) {
      estadoPaso = "actual";
    } else if (pasoDisponible(estado.secuencia, paso.id)) {
      estadoPaso = "completado";
    }
    elementoPaso.dataset.estado = estadoPaso;
  }
}

/**
 * Muestra la tarjeta del paso actual: primero el propósito y luego el resultado.
 * @param {object} estado - Estado de la interfaz.
 */
function mostrarPasoActual(estado) {
  const paso = obtenerPasoActual(estado.secuencia);
  const bloqueResultado = elemento("paso-bloque-resultado");
  const boton = elemento("boton-siguiente-paso");
  mostrarListaPasos(estado);
  actualizarNavegacion(estado);

  // Prueba terminada
  if (paso === null) {
    elemento("paso-titulo").textContent = "Prueba guiada completa";
    elemento("paso-proposito").textContent = "Ya recorriste los 4 pasos. Puedes medir todas las condiciones que quieras en el Analizador y compararlas.";
    bloqueResultado.hidden = true;
    boton.textContent = "Ir al Analizador";
    return;
  }

  const numeroPaso = PASOS_PRUEBA.indexOf(paso) + 1;
  elemento("paso-titulo").textContent = `Paso ${numeroPaso} de ${PASOS_PRUEBA.length}: ${paso.titulo}`;
  elemento("paso-proposito").textContent = paso.proposito;
  // Los pasos 1 a 3 muestran su valor medido; el 4 lleva al Analizador
  bloqueResultado.hidden = paso.claveDatoMedido === null;
  if (paso.claveDatoMedido !== null) {
    escribirResultadoPaso(elemento("paso-resultado"), paso.claveDatoMedido, estado.parametros.pasos_previos_medidos);
  }
  boton.textContent = paso.claveDatoMedido === null ? "Ir al Analizador" : "Entendido, siguiente paso";
}

/**
 * Atiende el botón del paso: completa el paso actual (M2) y avanza.
 * @param {object} estado - Estado de la interfaz.
 */
function avanzarPaso(estado) {
  const paso = obtenerPasoActual(estado.secuencia);
  try {
    if (paso !== null) {
      estado.secuencia = completarPaso(estado.secuencia, paso.id);
    }
    mostrarPasoActual(estado);
    // El paso 4 (o la prueba ya completa) lleva a la sección Analizador
    if (paso === null || paso.id === PASO_CORRIENTES_FUGA) {
      mostrarSeccion(estado, "analizador");
    }
  } catch (error) {
    mostrarError(error.message);
  }
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
 * Deshabilita la combinación prohibida (tierra abierta + neutro abierto) y explica por qué.
 * @param {{tierra: string, neutro: string}} condicion - Condición elegida.
 */
function aplicarRestriccionDobleFalla(condicion) {
  const tierraAbierta = condicion.tierra === "abierta";
  const neutroAbierto = condicion.neutro === "abierto";
  cambiarDisponibilidadOpcion("neutro", "abierto", tierraAbierta);
  cambiarDisponibilidadOpcion("tierra", "abierta", neutroAbierto);
  const aviso = elemento("aviso-doble-falla");
  aviso.textContent = TEXTOS_EXPLICACION.dobleFalla;
  aviso.hidden = !(tierraAbierta || neutroAbierto);
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
  elemento("lectura-limites-contacto").hidden = true;
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
  const { tipoMedicion, condicion } = leerSeleccion();
  aplicarRestriccionDobleFalla(condicion);
  estado.visualizador.borrarCamino();
  estado.visualizador.mostrarCondicion(condicion, tipoMedicion);
  limpiarLectura();
}

/**
 * Muestra la lectura grande, el límite, el % del límite, el veredicto y los límites B/BF/CF.
 * @param {object} resultado - Resultado evaluado (M4 + M5).
 */
function mostrarLectura(resultado) {
  elemento("lectura-etiqueta").textContent = `${NOMBRES_MEDICION[resultado.tipoMedicion]} · ${describirCondicion(resultado.condicion)}`;
  elemento("lectura-valor").textContent = `${textoLectura(resultado)} µA`;
  elemento("lectura-limite").textContent = `${resultado.limite_uA} µA (parte CF, ${NOMBRES_ESTADO[resultado.estadoCondicion]})`;
  elemento("lectura-porcentaje").textContent = `${resultado.porcentajeDelLimite.toFixed(DECIMALES_PORCENTAJE)} %`;
  const veredicto = elemento("lectura-veredicto");
  const cumple = resultado.veredicto === VEREDICTO_CUMPLE;
  veredicto.textContent = cumple ? `✓ ${resultado.veredicto}` : `✗ ${resultado.veredicto}`;
  veredicto.className = cumple ? "veredicto--cumple" : "veredicto--no-cumple";

  // Contacto: el límite es igual para B, BF y CF, basta una frase.
  // Paciente: tabla con los límites equivalentes para partes B, BF y CF (RF07)
  const esContacto = resultado.tipoMedicion === "contacto";
  elemento("lectura-limites-contacto").hidden = !esContacto;
  elemento("lectura-comparacion").hidden = esContacto;
  const fila = document.createElement("tr");
  for (const tipoDeParte of ["B", "BF", "CF"]) {
    crearConTexto("td", `${resultado.limitesPorTipoDeParte_uA[tipoDeParte]} µA`, fila, tipoDeParte === "CF" ? "columna-destacada" : "");
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

  if (resultado.tipoMedicion === "contacto") {
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
 * Guarda una lectura de la sesión y actualiza la sección Comparar.
 * (En la Fase 3 este registro pasa al módulo de historial, M8.)
 * @param {object} estado - Estado de la interfaz.
 * @param {object} resultado - Resultado evaluado.
 */
function registrarLectura(estado, resultado) {
  estado.lecturas.push(Object.freeze({ ...resultado, hora: new Date() }));
  mostrarComparacion(estado);
}

/**
 * Clave única de una configuración (medición + condición), por ejemplo "contacto|normal|abierta|cerrado".
 * @param {{tipoMedicion: string, condicion: object}} lectura - Lectura.
 * @returns {string} Clave.
 */
function claveConfiguracion(lectura) {
  const { polaridad, tierra, neutro } = lectura.condicion;
  return `${lectura.tipoMedicion}|${polaridad}|${tierra}|${neutro}`;
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
  const posicion = (lectura) => {
    const [tipo, ...condicion] = claveConfiguracion(lectura).split("|");
    return ORDEN_MEDICIONES.indexOf(tipo) * ORDEN_CONDICIONES.length + ORDEN_CONDICIONES.indexOf(condicion.join("|"));
  };
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
    const fila = document.createElement("tr");
    crearConTexto("td", NOMBRES_MEDICION[lectura.tipoMedicion], fila);
    crearConTexto("td", nombreCortoCondicion(lectura.condicion), fila);
    crearConTexto("td", textoLectura(lectura), fila);
    crearConTexto("td", String(lectura.limite_uA), fila);
    crearConTexto("td", `${lectura.porcentajeDelLimite.toFixed(DECIMALES_PORCENTAJE)} %`, fila);
    crearConTexto("td", lectura.veredicto, fila, lectura.veredicto === VEREDICTO_CUMPLE ? "veredicto--cumple" : "veredicto--no-cumple");
    cuerpo.appendChild(fila);
  }
}

/**
 * Actualiza toda la sección Comparar (gráficas y tabla).
 * @param {object} estado - Estado de la interfaz.
 */
function mostrarComparacion(estado) {
  const filas = ultimaLecturaPorConfiguracion(estado.lecturas);
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
    ayuda.textContent = `${nombreCortoCondicion(lectura.condicion)}: ${textoLectura(lectura)} µA · límite ${lectura.limite_uA} µA · ${lectura.veredicto}`;

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
  for (const [claseMuestra, texto] of [["muestra muestra--barra", "Lectura I"], ["muestra muestra--banda", "Banda ± U del analizador"]]) {
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
/* Arranque                                                                 */
/* ------------------------------------------------------------------------ */

/**
 * Arranca la interfaz con los parámetros ya validados por M3.
 * @param {object} parametros - Parámetros del R12 (M3).
 */
export function iniciarInterfaz(parametros) {
  const estado = {
    parametros,
    secuencia: crearEstadoInicial(),
    visualizador: crearVisualizador(elemento("svg-circuito"), parametros),
    lecturas: [],
  };
  mostrarEquipo(parametros);
  configurarNavegacion(estado);
  elemento("boton-siguiente-paso").addEventListener("click", () => avanzarPaso(estado));
  mostrarPasoActual(estado);
  configurarAnalizador(estado);
  mostrarSeccion(estado, SECCION_INICIAL);
}
