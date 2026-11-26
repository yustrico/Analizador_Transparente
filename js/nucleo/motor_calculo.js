/**
 * ============================================================================
 * Título: Motor de cálculo
 * Descripción: Calcula la corriente de contacto, la corriente de paciente
 *   (parte aplicada CF) y la corriente de fuga a tierra del R12 en cada
 *   condición de prueba, y la incertidumbre ± U que tendría el analizador
 *   real. También entrega cuánta corriente va por cada rama del circuito
 *   (tierra, persona, paciente) para que el visualizador dibuje el mismo
 *   resultado que se calculó. Además lista las 16 configuraciones
 *   (medición + condición) que simula la herramienta.
 *   Modelo: la fuga del equipo es capacitiva, I = V · 2πf · C.
 * Módulo: M4 – Motor de cálculo (núcleo)
 * Autores: Yustin Rico, David Cardona, Santiago González
 * Creado: 2026-11-13 · Modificado: 2026-11-25
 * ============================================================================
 */

/** Valores permitidos para cada parte de la condición de prueba. */
export const POLARIDADES = Object.freeze(["normal", "invertida"]);
export const ESTADOS_TIERRA = Object.freeze(["cerrada", "abierta"]);
export const ESTADOS_NEUTRO = Object.freeze(["cerrado", "abierto"]);

/** Tipos de medición que calcula la herramienta. */
export const TIPOS_MEDICION = Object.freeze(["contacto", "paciente", "fuga_tierra"]);

/** Medición que no se puede hacer con la tierra abierta. */
const MEDICION_SOLO_CON_TIERRA = "fuga_tierra";

/** Mensaje cuando se pide fuga a tierra con la tierra abierta. */
export const MENSAJE_FUGA_SIN_TIERRA =
  "Sin conductor de protección no hay por dónde circular la fuga a tierra; por eso se mide la corriente de contacto.";

/**
 * Condiciones de prueba en el orden fijo de la herramienta: normal, tierra
 * abierta y neutro abierto, cada una con polaridad normal e invertida.
 */
const CONDICIONES_EN_ORDEN = Object.freeze([
  ["normal", "cerrada", "cerrado"], ["invertida", "cerrada", "cerrado"],
  ["normal", "abierta", "cerrado"], ["invertida", "abierta", "cerrado"],
  ["normal", "cerrada", "abierto"], ["invertida", "cerrada", "abierto"],
].map(([polaridad, tierra, neutro]) => Object.freeze({ polaridad, tierra, neutro })));

/** Conversión de amperios a microamperios. */
const MICROAMPERIOS_POR_AMPERIO = 1e6;

/** Conversión de porcentaje a fracción (1 % = 0.01). */
const FRACCION_POR_PORCENTAJE = 1 / 100;

/** Divisor de la distribución rectangular (incertidumbre tipo B, GUM): √3. */
const DIVISOR_RECTANGULAR = Math.sqrt(3);

/**
 * Revisa que un valor esté en la lista de valores permitidos.
 * @param {string} nombreCampo - Nombre del campo, para el mensaje de error.
 * @param {*} valor - Valor recibido.
 * @param {readonly string[]} permitidos - Valores aceptados.
 * @throws {Error} Si el valor no está en la lista.
 */
function exigirValorPermitido(nombreCampo, valor, permitidos) {
  if (!permitidos.includes(valor)) {
    throw new Error(`Condición inválida: "${nombreCampo}" debe ser ${permitidos.map((opcion) => `"${opcion}"`).join(" o ")} (se recibió ${JSON.stringify(valor)}).`);
  }
}

/**
 * Valida una condición de prueba. Prohíbe tierra abierta y neutro abierto a
 * la vez, porque serían dos fallas simultáneas (doble falla) y IEC 60601-1
 * evalúa una sola falla a la vez (primer defecto).
 * @param {{polaridad: string, tierra: string, neutro: string}} condicion - Condición de prueba.
 * @throws {Error} Si la condición tiene valores inválidos o es una doble falla.
 */
export function validarCondicion(condicion) {
  if (condicion === null || typeof condicion !== "object") {
    throw new Error("Falta la condición de prueba (polaridad, tierra y neutro).");
  }
  exigirValorPermitido("polaridad", condicion.polaridad, POLARIDADES);
  exigirValorPermitido("tierra", condicion.tierra, ESTADOS_TIERRA);
  exigirValorPermitido("neutro", condicion.neutro, ESTADOS_NEUTRO);
  if (condicion.tierra === "abierta" && condicion.neutro === "abierto") {
    throw new Error("Condición prohibida: tierra abierta y neutro abierto a la vez sería una doble falla. La norma evalúa una sola falla a la vez (primer defecto).");
  }
}

/**
 * Valida el tipo de medición.
 * @param {string} tipoMedicion - "contacto" o "paciente".
 * @throws {Error} Si el tipo no existe.
 */
export function validarTipoMedicion(tipoMedicion) {
  if (!TIPOS_MEDICION.includes(tipoMedicion)) {
    throw new Error(`Tipo de medición inválido: debe ser ${TIPOS_MEDICION.map((tipo) => `"${tipo}"`).join(", ")} (se recibió ${JSON.stringify(tipoMedicion)}).`);
  }
}

/**
 * Indica si una medición se puede hacer en una condición. La fuga a tierra
 * no existe con la tierra abierta: no hay conductor por donde circule.
 * @param {string} tipoMedicion - Tipo de medición.
 * @param {{tierra: string}} condicion - Condición de prueba.
 * @returns {boolean} true si la combinación se puede medir.
 */
export function medicionPosible(tipoMedicion, condicion) {
  return !(tipoMedicion === MEDICION_SOLO_CON_TIERRA && condicion.tierra === "abierta");
}

/**
 * Lista las configuraciones (medición + condición) que simula la herramienta,
 * en orden fijo: 6 de contacto, 6 de paciente CF y 4 de fuga a tierra (16).
 * @returns {ReadonlyArray<Readonly<{tipoMedicion: string, condicion: object}>>} Configuraciones.
 */
export function listarConfiguraciones() {
  const configuraciones = [];
  // Cada medición con cada condición que se puede medir
  for (const tipoMedicion of TIPOS_MEDICION) {
    for (const condicion of CONDICIONES_EN_ORDEN.filter((posible) => medicionPosible(tipoMedicion, posible))) {
      configuraciones.push(Object.freeze({ tipoMedicion, condicion }));
    }
  }
  return Object.freeze(configuraciones);
}

/**
 * Revisa que lleguen los parámetros del equipo (ya validados por M3).
 * @param {object} parametros - Parámetros del equipo.
 * @throws {Error} Si faltan.
 */
function exigirParametros(parametros) {
  if (parametros === null || typeof parametros !== "object" || !parametros.capacitancias_F) {
    throw new Error("Faltan los parámetros del equipo: cárguelos primero con el modelo del equipo (M3).");
  }
}

/**
 * Corriente que deja pasar cada faradio de capacitancia a la tensión y
 * frecuencia de la red: V · 2πf. Con 120 V y 60 Hz vale 45 238.93 A/F.
 * @param {object} parametros - Parámetros del equipo (red.V_rms en V, red.f_Hz en Hz).
 * @returns {number} Corriente por faradio, en A/F.
 */
export function corrientePorFaradio_A_F(parametros) {
  return parametros.red.V_rms * 2 * Math.PI * parametros.red.f_Hz;
}

/**
 * Capacitancia de fuga que está "activa" (conectada a la fase) en la condición dada.
 * - Polaridad normal: la fase llega por L, se usa C_L.
 * - Polaridad invertida: la fase llega por N, se usa C_N.
 * - Neutro abierto: ambos lados quedan a tensión de fase, se suman C_L + C_N.
 * @param {object} condicion - Condición de prueba ya validada.
 * @param {object} parametros - Parámetros del equipo.
 * @returns {number} Capacitancia en F.
 */
export function capacitanciaDeFuga_F(condicion, parametros) {
  const { C_L, C_N } = parametros.capacitancias_F;
  if (condicion.neutro === "abierto") {
    return C_L + C_N;
  }
  return condicion.polaridad === "normal" ? C_L : C_N;
}

/**
 * Corriente de contacto (chasis → persona → tierra), en µA.
 * - Tierra cerrada: el conductor de protección (R_PE) y la persona (R_MD)
 *   están en paralelo, y la fuga se reparte por divisor de corriente:
 *   I_persona = I_fuga · R_PE / (R_PE + R_MD).
 * - Tierra abierta: I_persona = I_fuga = V·2πf·C. Es una APROXIMACIÓN:
 *   la reactancia del capacitor de fuga (X_C ≈ 8 MΩ) es miles de veces mayor
 *   que R_MD (1 kΩ), así que agregar R_MD en serie casi no cambia la corriente.
 * @param {object} condicion - Condición de prueba ya validada.
 * @param {object} parametros - Parámetros del equipo.
 * @returns {{corriente_uA: number, ramas: {fugaTotal_uA: number, porTierra_uA: number, porPersona_uA: number}}}
 */
function calcularCorrienteContacto(condicion, parametros) {
  const fugaTotal_uA =
    corrientePorFaradio_A_F(parametros) * capacitanciaDeFuga_F(condicion, parametros) * MICROAMPERIOS_POR_AMPERIO;

  // Tierra abierta: no hay camino por la tierra, toda la fuga pasa por la persona
  if (condicion.tierra === "abierta") {
    return { corriente_uA: fugaTotal_uA, ramas: { fugaTotal_uA, porTierra_uA: 0, porPersona_uA: fugaTotal_uA } };
  }

  // Tierra cerrada: divisor de corriente entre la tierra (R_PE) y la persona (R_MD)
  const resistenciaTotal_ohm = parametros.R_PE_ohm + parametros.R_MD_ohm;
  const porPersona_uA = fugaTotal_uA * parametros.R_PE_ohm / resistenciaTotal_ohm;
  const porTierra_uA = fugaTotal_uA * parametros.R_MD_ohm / resistenciaTotal_ohm;
  return { corriente_uA: porPersona_uA, ramas: { fugaTotal_uA, porTierra_uA, porPersona_uA } };
}

/**
 * Corriente de paciente CF (red → barrera de aislamiento → electrodos → persona), en µA.
 * - Condición normal o neutro abierto: I = V·2πf·C_AP (la corriente que cruza
 *   la barrera de aislamiento de la parte aplicada).
 * - Tierra abierta: I = V·2πf·C_AP + ΔI, donde ΔI = 0.83 µA es un término
 *   EMPÍRICO: es el aumento que se MIDIÓ con el ESA620 en el laboratorio
 *   (2.10 − 1.27 µA), no sale de una fórmula física del modelo.
 * @param {object} condicion - Condición de prueba ya validada.
 * @param {object} parametros - Parámetros del equipo.
 * @returns {{corriente_uA: number, ramas: {barreraAislamiento_uA: number, terminoEmpirico_uA: number, porPersona_uA: number}}}
 */
function calcularCorrientePaciente(condicion, parametros) {
  const barreraAislamiento_uA =
    corrientePorFaradio_A_F(parametros) * parametros.capacitancias_F.C_AP * MICROAMPERIOS_POR_AMPERIO;
  // Término empírico medido: solo aplica con la tierra abierta
  const terminoEmpirico_uA = condicion.tierra === "abierta"
    ? parametros.delta_paciente_tierra_abierta_A * MICROAMPERIOS_POR_AMPERIO
    : 0;
  const corriente_uA = barreraAislamiento_uA + terminoEmpirico_uA;
  return { corriente_uA, ramas: { barreraAislamiento_uA, terminoEmpirico_uA, porPersona_uA: corriente_uA } };
}

/**
 * Capacitancia equivalente de la fuga a tierra, en F.
 * - Condición normal: solo la capacitancia conectada a la fase (C_activa:
 *   C_L con polaridad normal, C_N con polaridad invertida).
 * - Neutro abierto: C_activa + k_N · C_otra. k_N es un factor EMPÍRICO
 *   calibrado en el laboratorio con la polaridad normal (27.13/14.73 − 1 ≈
 *   0.84): con el neutro abierto el otro lado no queda exactamente a la
 *   tensión de fase, así que no suma toda su fuga (docs/06).
 * @param {object} condicion - Condición de prueba ya validada.
 * @param {object} parametros - Parámetros del equipo.
 * @returns {number} Capacitancia equivalente en F.
 */
export function capacitanciaFugaATierra_F(condicion, parametros) {
  const { C_L, C_N } = parametros.capacitancias_F;
  const [activa_F, otra_F] = condicion.polaridad === "normal" ? [C_L, C_N] : [C_N, C_L];
  if (condicion.neutro === "abierto") {
    return activa_F + parametros.factor_neutro_abierto_fuga_tierra * otra_F;
  }
  return activa_F;
}

/**
 * Corriente de fuga a tierra (red → capacitancias de fuga → chasis →
 * conductor de protección → tierra), en µA: I = V·2πf·C_equivalente.
 * Toda la fuga vuelve por el conductor de protección; nada pasa por la persona.
 * @param {object} condicion - Condición de prueba ya validada (con tierra cerrada).
 * @param {object} parametros - Parámetros del equipo.
 * @returns {{corriente_uA: number, ramas: {fugaTotal_uA: number, porTierra_uA: number, porPersona_uA: number}}}
 */
function calcularCorrienteFugaATierra(condicion, parametros) {
  const fugaTotal_uA =
    corrientePorFaradio_A_F(parametros) * capacitanciaFugaATierra_F(condicion, parametros) * MICROAMPERIOS_POR_AMPERIO;
  return { corriente_uA: fugaTotal_uA, ramas: { fugaTotal_uA, porTierra_uA: fugaTotal_uA, porPersona_uA: 0 } };
}

/** Función de cálculo de cada tipo de medición. */
const CALCULO_POR_MEDICION = Object.freeze({
  contacto: calcularCorrienteContacto,
  paciente: calcularCorrientePaciente,
  fuga_tierra: calcularCorrienteFugaATierra,
});

/**
 * Incertidumbre expandida que tendría el analizador real para una lectura:
 * U = k · (porcentaje·I + piso) / √3, con exactitud ±(1 % + 1 µA) y k = 2.
 * @param {number} corriente_uA - Lectura en µA.
 * @param {{porcentaje_lectura: number, piso_uA: number, k: number}} exactitud - Exactitud del analizador.
 * @returns {number} U en µA.
 */
export function calcularIncertidumbre_uA(corriente_uA, exactitud) {
  const semiancho_uA = exactitud.porcentaje_lectura * FRACCION_POR_PORCENTAJE * corriente_uA + exactitud.piso_uA;
  return exactitud.k * semiancho_uA / DIVISOR_RECTANGULAR;
}

/**
 * Calcula una medición completa: corriente, incertidumbre y corriente por rama.
 * @param {string} tipoMedicion - "contacto" o "paciente".
 * @param {{polaridad: string, tierra: string, neutro: string}} condicion - Condición de prueba.
 * @param {object} parametros - Parámetros validados por M3.
 * @returns {Readonly<{tipoMedicion: string, condicion: object, corriente_uA: number, incertidumbre_uA: number, ramas: object}>}
 *   Medición congelada; corrientes en µA.
 * @throws {Error} Si la medición, la condición o los parámetros no son válidos.
 */
export function calcularMedicion(tipoMedicion, condicion, parametros) {
  validarTipoMedicion(tipoMedicion);
  validarCondicion(condicion);
  exigirParametros(parametros);
  if (!medicionPosible(tipoMedicion, condicion)) {
    throw new Error(MENSAJE_FUGA_SIN_TIERRA);
  }
  const calculo = CALCULO_POR_MEDICION[tipoMedicion](condicion, parametros);

  return Object.freeze({
    tipoMedicion,
    condicion: Object.freeze({ polaridad: condicion.polaridad, tierra: condicion.tierra, neutro: condicion.neutro }),
    corriente_uA: calculo.corriente_uA,
    incertidumbre_uA: calcularIncertidumbre_uA(calculo.corriente_uA, parametros.exactitud_analizador),
    ramas: Object.freeze(calculo.ramas),
  });
}
