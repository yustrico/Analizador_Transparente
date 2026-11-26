/**
 * ============================================================================
 * Título: Pantalla del examen (sección 6)
 * Descripción: Conecta la sección «6. Examen» de la página con el núcleo
 *   del examen (M7) y con el servicio del equipo (M12). El orden es:
 *     1. El estudiante escribe nombre, código y correo del docente, acepta
 *        el envío de sus datos y pulsa «Comenzar examen».
 *     2. Se pregunta al servicio cuántos intentos lleva ese código y si el
 *        correo del docente está en su lista. Si el correo no está o ya usó
 *        todos los intentos, no se deja empezar (no se gasta intento).
 *     3. Se sortean las preguntas y se barajan las opciones (M7).
 *     4. Con todas respondidas se puede enviar (después de confirmar). Se
 *        crea el PDF con las respuestas elegidas (M10) y se envía al
 *        servicio, que CALIFICA (solo él tiene la clave), le manda el correo
 *        al docente y devuelve la nota y si cada pregunta quedó bien o mal.
 *        El correo del docente se puede corregir mientras el examen está en
 *        curso: al enviar se usa el valor ACTUAL del campo. Si el servicio
 *        rechaza el envío, las respuestas quedan y se puede volver a enviar.
 *     5. Se muestran la nota, aprobado o no, cuántas correctas y ✓/✗ al
 *        lado de cada pregunta, SIN decir cuál era la respuesta correcta.
 *   Todo el texto se escribe con textContent (nunca innerHTML).
 * Módulo: M1 – Interfaz de usuario (adaptador), sección del examen (M7)
 * Autores: Yustin Rico, David Cardona, Santiago González
 * Creado: 2026-11-26 · Modificado: 2026-11-26
 * ============================================================================
 */

import { elegirPreguntas, barajarOpciones, armarRespuestas, todasRespondidas } from "../nucleo/examen.js?v=db2b15b911";
import { elemento, crearConTexto } from "./interfaz.js?v=97927adc6d";
import { crearPdfExamen, nombreArchivoExamen, limpiarNombre } from "./reporte.js?v=8550e3a4c5";
import { descargarPdf } from "./pdf.js?v=bfb0882a03";
import { validarDatosEnvio, bytesABase64, enviarAlServicio, consultarIntentos, CORREO_DOCENTE_POR_DEFECTO } from "./envio.js?v=e1f0334a7f";

/** Textos de los botones. */
const TEXTO_COMENZAR = "Comenzar examen";
const TEXTO_COMENZAR_OTRO = "Comenzar otro intento";
const TEXTO_CONSULTANDO = "Consultando tus intentos…";
const TEXTO_ENVIAR = "Enviar examen";
const TEXTO_ENVIANDO = "Enviando…";

/** Marcas al lado de cada pregunta después de calificar (no dicen cuál era la correcta). */
const MARCA_BIEN = "✓ Correcta";
const MARCA_MAL = "✗ Incorrecta";

/** Mensajes. */
const MENSAJE_RESPUESTA_INCOMPLETA = "El servicio respondió sin la nota. Avísale al docente; tu examen pudo quedar registrado.";
const MENSAJE_PDF_FALLIDO = "No se pudo crear el PDF del examen. Recarga la página e inténtalo de nuevo.";
const MENSAJE_CORREGIR_CORREO = "Corrige el correo y vuelve a oprimir Enviar examen.";

/**
 * Reconoce los errores del servicio que son por el correo del docente
 * («Ese correo no está en la lista…», «El correo del docente debe
 * terminar en @uao.edu.co.»): esos se muestran también junto al campo.
 */
const PATRON_ERROR_DE_CORREO = /correo/i;

/** Campos que se bloquean durante un intento (el correo del docente NO: se puede corregir). */
const CAMPOS_BLOQUEADOS_EN_INTENTO = ["examen-nombre", "examen-codigo", "examen-consentimiento", "boton-comenzar-examen"];

/** Decimales con que se muestra la nota (por ejemplo 3.0). */
const DECIMALES_NOTA = 1;

/** Prefijo del nombre de los botones de opción de cada pregunta. */
const PREFIJO_GRUPO_OPCIONES = "examen-opcion-";

/**
 * Muestra (u oculta, si el texto está vacío) un mensaje de estado con estilo
 * de éxito (verde) o de error (ámbar).
 * @param {string} id - id del párrafo de estado.
 * @param {string} texto - Mensaje (texto plano).
 * @param {boolean} exito - true: verde; false: ámbar.
 */
function mostrarEstado(id, texto, exito) {
  const mensaje = elemento(id);
  mensaje.textContent = texto;
  mensaje.hidden = texto === "";
  mensaje.classList.toggle("envio__estado--exito", exito);
  mensaje.classList.toggle("envio__estado--error", !exito);
}

/**
 * Lee el formulario de datos del examen.
 * @returns {{nombre: string, codigo: string, correoDocente: string, consentimiento: boolean}} Datos escritos.
 */
function leerFormulario() {
  return {
    nombre: limpiarNombre(elemento("examen-nombre").value),
    codigo: elemento("examen-codigo").value.trim(),
    correoDocente: elemento("examen-correo").value.trim(),
    consentimiento: elemento("examen-consentimiento").checked,
  };
}

/**
 * Bloquea o desbloquea el formulario de datos completo. Durante un intento
 * se bloquean nombre, código, consentimiento y el botón de comenzar; el
 * correo del docente se desbloquea aparte para poder corregirlo.
 * @param {boolean} bloqueado - true para bloquear.
 */
function bloquearFormulario(bloqueado) {
  // Cada campo de la lista y, además, el correo
  for (const id of CAMPOS_BLOQUEADOS_EN_INTENTO) {
    elemento(id).disabled = bloqueado;
  }
  elemento("examen-correo").disabled = bloqueado;
}

/**
 * Muestra (u oculta, con texto vacío) un error junto al campo del correo.
 * @param {string} texto - Mensaje (texto plano).
 */
function mostrarErrorCorreo(texto) {
  const mensaje = elemento("estado-correo-examen");
  mensaje.textContent = texto;
  mensaje.hidden = texto === "";
}

/**
 * Toma el correo del docente que está AHORA en el campo y revisa otra vez
 * los datos con validarDatosEnvio (mismas reglas del servicio). Si están
 * bien, lo guarda en el estado del examen; si no, muestra el error junto al
 * correo y junto al botón de enviar.
 * @param {object} examen - Estado del examen.
 * @returns {boolean} true si se puede enviar.
 */
function revisarCorreoActual(examen) {
  const datos = { ...examen.datos, correoDocente: elemento("examen-correo").value.trim() };
  const errores = validarDatosEnvio(datos);
  if (errores.length > 0) {
    mostrarErrorCorreo(`${errores.join(" ")} ${MENSAJE_CORREGIR_CORREO}`);
    mostrarEstado("estado-envio-examen", errores.join(" "), false);
    return false;
  }
  examen.datos = datos;
  mostrarErrorCorreo("");
  return true;
}

/**
 * Texto de introducción con los números del banco.
 * @param {object} banco - Banco revisado (M7).
 * @returns {string} Introducción.
 */
function textoIntroduccion(banco) {
  return `${banco.preguntas_por_examen} preguntas al azar sobre lo que viste en la herramienta. ` +
    `Nota de 0 a ${banco.nota_maxima}; apruebas con ${banco.nota_aprobacion.toFixed(DECIMALES_NOTA)}. ` +
    `Tienes máximo ${banco.intentos_maximos} intentos. ` +
    "La nota la calcula el servicio del equipo y le llega al docente junto con el PDF.";
}

/**
 * Dibuja las preguntas del intento como grupos de botones de opción.
 * @param {object} examen - Estado del examen.
 */
function dibujarPreguntas(examen) {
  const lista = elemento("examen-lista");
  lista.replaceChildren();
  // Una tarjeta por pregunta
  for (const pregunta of examen.preguntas) {
    const item = crearConTexto("li", "", lista, "tarjeta examen__pregunta");
    const grupo = crearConTexto("fieldset", "", item, "examen__grupo");
    const leyenda = crearConTexto("legend", pregunta.pregunta, grupo, "examen__enunciado");
    crearConTexto("span", "", leyenda, "examen__marca").hidden = true;
    // Un botón de opción por cada opción barajada; su valor es el índice ORIGINAL
    for (const opcion of pregunta.opciones) {
      const etiqueta = crearConTexto("label", "", grupo, "examen__opcion");
      const boton = document.createElement("input");
      boton.type = "radio";
      boton.name = `${PREFIJO_GRUPO_OPCIONES}${pregunta.id}`;
      boton.value = String(opcion.indiceOriginal);
      boton.addEventListener("change", () => elegirOpcion(examen, pregunta.id, opcion.indiceOriginal));
      etiqueta.append(boton, ` ${opcion.texto}`);
    }
    item.dataset.pregunta = pregunta.id;
  }
}

/**
 * Guarda la opción elegida y actualiza el avance y el botón de enviar.
 * @param {object} examen - Estado del examen.
 * @param {string} id - Pregunta.
 * @param {number} indiceOriginal - Índice original de la opción elegida.
 */
function elegirOpcion(examen, id, indiceOriginal) {
  examen.seleccion.set(id, indiceOriginal);
  actualizarAvance(examen);
}

/**
 * Muestra cuántas preguntas van respondidas y activa «Enviar examen» solo
 * cuando están todas.
 * @param {object} examen - Estado del examen.
 */
function actualizarAvance(examen) {
  const total = examen.preguntas.length;
  elemento("examen-avance").textContent = `Respondiste ${examen.seleccion.size} de ${total} preguntas.`;
  elemento("boton-enviar-examen").disabled = examen.enviando || !todasRespondidas(examen.preguntas, examen.seleccion);
}

/**
 * Bloquea o desbloquea los botones de opción de todas las preguntas.
 * @param {boolean} bloqueadas - true para bloquear.
 */
function bloquearOpciones(bloqueadas) {
  // Todos los botones de opción de la lista
  for (const boton of elemento("examen-lista").querySelectorAll("input[type=radio]")) {
    boton.disabled = bloqueadas;
  }
}

/**
 * Pulsar «Comenzar examen»: valida los datos, consulta los intentos y, si
 * quedan, sortea y muestra las preguntas.
 * @param {object} examen - Estado del examen.
 */
async function comenzar(examen) {
  const datos = leerFormulario();
  const errores = validarDatosEnvio(datos);
  if (errores.length > 0) {
    mostrarEstado("estado-examen", errores.join(" "), false);
    return;
  }
  mostrarEstado("estado-examen", "", true);
  mostrarErrorCorreo("");
  bloquearFormulario(true);
  const boton = elemento("boton-comenzar-examen");
  boton.textContent = TEXTO_CONSULTANDO;
  // El servicio revisa también que el correo esté en su lista de docentes
  const intentos = await consultarIntentos(datos.codigo, datos.correoDocente);
  boton.textContent = TEXTO_COMENZAR;
  if (!intentos.ok) {
    mostrarEstado("estado-examen", intentos.error, false);
    bloquearFormulario(false);
    return;
  }
  const maximos = intentos.intentosMaximos ?? examen.banco.intentos_maximos;
  if (intentos.intentosUsados >= maximos) {
    mostrarEstado("estado-examen", `Ya usaste tus ${maximos} intentos.`, false);
    bloquearFormulario(false);
    return;
  }
  // Intento nuevo: preguntas al azar con opciones barajadas
  examen.datos = datos;
  examen.intento = intentos.intentosUsados + 1;
  examen.intentosMaximos = maximos;
  examen.preguntas = elegirPreguntas(examen.banco, examen.banco.preguntas_por_examen)
    .map((pregunta) => ({ id: pregunta.id, pregunta: pregunta.pregunta, opciones: barajarOpciones(pregunta) }));
  examen.seleccion = new Map();
  examen.enviando = false;
  examen.pdf = null;
  // Durante el intento solo el correo sigue editable
  elemento("examen-correo").disabled = false;
  dibujarPreguntas(examen);
  elemento("examen-intento").textContent = `Intento ${examen.intento} de ${maximos}`;
  elemento("examen-resultado").hidden = true;
  elemento("examen-confirmacion").hidden = true;
  elemento("boton-enviar-examen").hidden = false;
  elemento("examen-avance").hidden = false;
  mostrarEstado("estado-envio-examen", "", true);
  elemento("examen-preguntas-vista").hidden = false;
  actualizarAvance(examen);
  elemento("examen-intento").scrollIntoView();
}

/**
 * Pulsar «Enviar examen»: revisa el correo actual y muestra la confirmación
 * en la página.
 * @param {object} examen - Estado del examen.
 */
function pedirConfirmacion(examen) {
  if (!revisarCorreoActual(examen)) {
    return;
  }
  elemento("examen-confirmacion").hidden = false;
  elemento("boton-confirmar-examen").focus();
}

/**
 * Datos del PDF del examen: cada pregunta con el texto de la opción elegida.
 * @param {object} examen - Estado del examen.
 * @returns {object} Datos para crearPdfExamen (M10).
 */
function datosDelPdf(examen) {
  return {
    nombre: examen.datos.nombre,
    codigo: examen.datos.codigo,
    fecha: new Date(),
    intento: examen.intento,
    intentosMaximos: examen.intentosMaximos,
    preguntas: examen.preguntas.map((pregunta) => ({
      pregunta: pregunta.pregunta,
      elegida: pregunta.opciones.find((opcion) => opcion.indiceOriginal === examen.seleccion.get(pregunta.id)).texto,
    })),
  };
}

/**
 * Confirma el envío: crea el PDF, lo envía con las respuestas al servicio y
 * muestra el resultado (o el error del servicio, tal cual).
 * @param {object} examen - Estado del examen.
 */
async function enviarExamen(examen) {
  elemento("examen-confirmacion").hidden = true;
  // Se usa el correo que está en el campo en este momento (pudo cambiar)
  if (!revisarCorreoActual(examen)) {
    return;
  }
  examen.enviando = true;
  bloquearOpciones(true);
  elemento("examen-correo").disabled = true;
  const boton = elemento("boton-enviar-examen");
  boton.textContent = TEXTO_ENVIANDO;
  actualizarAvance(examen);
  mostrarEstado("estado-envio-examen", "", true);
  let respuesta;
  try {
    const datosPdf = datosDelPdf(examen);
    examen.pdf = { bytes: crearPdfExamen(datosPdf), nombreArchivo: nombreArchivoExamen(datosPdf.fecha, examen.intento) };
    respuesta = await enviarAlServicio({
      tipo: "examen",
      nombre: examen.datos.nombre,
      codigo: examen.datos.codigo,
      correoDocente: examen.datos.correoDocente,
      consentimiento: true,
      respuestas: armarRespuestas(examen.seleccion),
      pdfBase64: bytesABase64(examen.pdf.bytes),
    });
  } catch (error) {
    respuesta = { ok: false, error: `${MENSAJE_PDF_FALLIDO} (${error.message})` };
  }
  boton.textContent = TEXTO_ENVIAR;
  examen.enviando = false;
  if (respuesta.ok && typeof respuesta.nota === "number" && respuesta.detalle !== null && typeof respuesta.detalle === "object") {
    mostrarResultado(examen, respuesta);
    return;
  }
  // Error: se muestra tal cual, las respuestas quedan y se puede volver a enviar
  const mensajeError = respuesta.ok ? MENSAJE_RESPUESTA_INCOMPLETA : respuesta.error;
  mostrarEstado("estado-envio-examen", mensajeError, false);
  elemento("examen-correo").disabled = false;
  // Si el error es por el correo, se repite junto al campo para corregirlo ahí
  if (!respuesta.ok && PATRON_ERROR_DE_CORREO.test(mensajeError)) {
    mostrarErrorCorreo(`${mensajeError} ${MENSAJE_CORREGIR_CORREO}`);
    elemento("examen-correo").focus();
  }
  bloquearOpciones(false);
  actualizarAvance(examen);
}

/**
 * Muestra la nota, aprobado o no, cuántas correctas, ✓/✗ por pregunta y
 * los intentos que quedan. NO muestra cuál era la respuesta correcta.
 * @param {object} examen - Estado del examen.
 * @param {{nota: number, aprobado: boolean, correctas: number, detalle: Object<string, boolean>, intento: number, intentosMaximos: number}} respuesta - Calificación del servicio.
 */
function mostrarResultado(examen, respuesta) {
  const total = examen.preguntas.length;
  elemento("examen-nota").textContent = `Nota: ${respuesta.nota.toFixed(DECIMALES_NOTA)} / ${examen.banco.nota_maxima}`;
  const veredicto = elemento("examen-veredicto");
  veredicto.textContent = respuesta.aprobado ? "Aprobado" : "No aprobado";
  veredicto.classList.toggle("examen__veredicto--aprobado", respuesta.aprobado === true);
  veredicto.classList.toggle("examen__veredicto--reprobado", respuesta.aprobado !== true);
  elemento("examen-correctas").textContent = `Respuestas correctas: ${respuesta.correctas} de ${total}.`;
  const usados = respuesta.intento ?? examen.intento;
  const maximos = respuesta.intentosMaximos ?? examen.intentosMaximos;
  const quedan = Math.max(maximos - usados, 0);
  elemento("examen-intentos-restantes").textContent = quedan > 0
    ? `Te ${quedan === 1 ? "queda" : "quedan"} ${quedan} ${quedan === 1 ? "intento" : "intentos"}. El resultado ya le llegó al docente.`
    : "Ya no te quedan intentos. El resultado ya le llegó al docente.";
  elemento("estado-pdf-examen").textContent = "";

  // ✓ o ✗ al lado de cada pregunta, según el detalle que manda el servicio
  for (const item of elemento("examen-lista").children) {
    const marca = item.querySelector(".examen__marca");
    const bien = respuesta.detalle[item.dataset.pregunta] === true;
    marca.textContent = bien ? MARCA_BIEN : MARCA_MAL;
    marca.classList.toggle("examen__marca--bien", bien);
    marca.classList.toggle("examen__marca--mal", !bien);
    marca.hidden = false;
  }
  elemento("boton-enviar-examen").hidden = true;
  elemento("examen-avance").hidden = true;
  elemento("examen-resultado").hidden = false;
  // Se puede pedir otro intento (el servicio decide si quedan)
  bloquearFormulario(false);
  elemento("boton-comenzar-examen").textContent = TEXTO_COMENZAR_OTRO;
  elemento("examen-resultado").scrollIntoView();
}

/**
 * Descarga el PDF del examen que se envió.
 * @param {object} examen - Estado del examen.
 */
function descargarExamen(examen) {
  const mensaje = elemento("estado-pdf-examen");
  try {
    descargarPdf(examen.pdf.bytes, examen.pdf.nombreArchivo);
    mensaje.textContent = `Descargado: ${examen.pdf.nombreArchivo} (búscalo en tu carpeta de Descargas).`;
  } catch (error) {
    mensaje.textContent = `${MENSAJE_PDF_FALLIDO} (${error.message})`;
  }
}

/**
 * Prepara la sección del examen con el banco ya revisado.
 * @param {object} banco - Banco de preguntas revisado (M7).
 */
export function iniciarExamen(banco) {
  const examen = { banco, datos: null, preguntas: [], seleccion: new Map(), intento: 0, intentosMaximos: banco.intentos_maximos, enviando: false, pdf: null };
  elemento("examen-introduccion").textContent = textoIntroduccion(banco);
  elemento("examen-correo").value = CORREO_DOCENTE_POR_DEFECTO;
  elemento("boton-comenzar-examen").addEventListener("click", () => comenzar(examen));
  elemento("boton-enviar-examen").addEventListener("click", () => pedirConfirmacion(examen));
  elemento("boton-confirmar-examen").addEventListener("click", () => enviarExamen(examen));
  elemento("boton-cancelar-examen").addEventListener("click", () => {
    elemento("examen-confirmacion").hidden = true;
  });
  elemento("boton-descargar-examen").addEventListener("click", () => descargarExamen(examen));
}

/**
 * Muestra en la sección del examen que no se pudo cargar el banco (el resto
 * de la página sigue funcionando).
 * @param {string} mensaje - Error en español.
 */
export function mostrarErrorExamen(mensaje) {
  elemento("examen-introduccion").textContent = "";
  bloquearFormulario(true);
  mostrarEstado("estado-examen", `No se pudo cargar el examen: ${mensaje} Recarga la página.`, false);
}
