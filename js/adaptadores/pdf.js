/**
 * ============================================================================
 * Título: Generador de PDF propio (sin librerías)
 * Descripción: Escribe un archivo PDF 1.4 "a mano", byte por byte, para que
 *   el reporte se descargue directo, sin el diálogo de imprimir y sin usar
 *   librerías externas. Usa las fuentes estándar de todo lector de PDF
 *   (Helvetica, Helvetica-Bold y Symbol), así que no hay que incrustar
 *   fuentes. El texto va en codificación WinAnsi, que incluye tildes, ñ, µ y
 *   ±; los pocos símbolos matemáticos que WinAnsi no tiene (√, ≤, ≥, ≈...)
 *   se dibujan con la fuente Symbol.
 *   Cómo se arma un PDF (lo mínimo):
 *     1. Encabezado "%PDF-1.4".
 *     2. Objetos numerados: catálogo → árbol de páginas → cada página con su
 *        "flujo de contenido" (las órdenes de dibujo: escribir texto en x, y;
 *        trazar líneas; rellenar rectángulos) y las fuentes.
 *     3. Tabla xref: la posición en bytes de cada objeto dentro del archivo,
 *        para que el lector salte directo a cada uno.
 *     4. Trailer: dice cuál es el objeto raíz y dónde empieza la xref.
 *   Este módulo no sabe qué es un "reporte": da piezas genéricas (título,
 *   párrafo, lista de datos, tabla con salto de página y encabezado repetido)
 *   que M10 (reporte.js) usa para armar el reporte.
 * Módulo: M10 – Reporte (adaptador)
 * Autores: Yustin Rico, David Cardona, Santiago González
 * Creado: 2026-11-13 · Modificado: 2026-11-13
 * ============================================================================
 */

/* ------------------------------------------------------------------------ */
/* Medidas de la página (en puntos PDF: 1 pt = 1/72 de pulgada)              */
/* ------------------------------------------------------------------------ */

/** Tamaño A4 en puntos. */
const ANCHO_PAGINA_PT = 595.28;
const ALTO_PAGINA_PT = 841.89;

/** Margen de 15 mm (15 mm × 72 pt / 25.4 mm). */
const MARGEN_PT = 42.52;

/** Espacio reservado abajo para el pie de página. */
const ALTO_PIE_PT = 22;

/** Ancho disponible para el contenido. */
const ANCHO_UTIL_PT = ANCHO_PAGINA_PT - 2 * MARGEN_PT;

/** Los anchos de las fuentes vienen en milésimas del tamaño de letra. */
const UNIDADES_POR_EM = 1000;

/** Distancia entre renglones como múltiplo del tamaño de letra. */
const FACTOR_INTERLINEADO = 1.35;

/** Tamaños de letra (pt). */
const TAMANO_TITULO = 16;
const TAMANO_SUBTITULO = 10;
const TAMANO_SECCION = 12;
const TAMANO_TEXTO = 10;
const TAMANO_TABLA = 8.5;
const TAMANO_PIE = 8;

/** Espacios verticales (pt). */
const ESPACIO_DESPUES_TITULO = 2;
const ESPACIO_DESPUES_BLOQUE = 10;
const ESPACIO_ANTES_SECCION = 8;
const ESPACIO_DESPUES_SECCION = 4;
const ESPACIO_LINEA_AVISO = 8;

/** Lista de datos: ancho de la columna de los términos (pt). */
const ANCHO_TERMINO_PT = 120;

/** Relleno interno de cada celda de la tabla (pt). */
const RELLENO_CELDA_X_PT = 4;
const RELLENO_CELDA_Y_PT = 3;

/** Tolerancia al revisar que las fracciones de ancho de una tabla sumen 1. */
const TOLERANCIA_FRACCIONES = 1e-9;

/** Grosor de las líneas (pt). */
const GROSOR_LINEA_PT = 0.5;

/** Colores en RGB de 0 a 1 (azul principal #14365F, igual que la página). */
const COLOR_TEXTO = Object.freeze([0.106, 0.122, 0.141]);
const COLOR_SECUNDARIO = Object.freeze([0.29, 0.333, 0.384]);
const COLOR_AZUL = Object.freeze([0.078, 0.212, 0.373]);
const COLOR_FONDO_ENCABEZADO = Object.freeze([0.902, 0.929, 0.961]);
const COLOR_LINEA = Object.freeze([0.827, 0.855, 0.89]);

/** Decimales al escribir números en el PDF. */
const DECIMALES_PDF = 2;

/* ------------------------------------------------------------------------ */
/* Fuentes estándar y codificación WinAnsi                                  */
/* ------------------------------------------------------------------------ */

/** Nombres internos de las fuentes dentro del PDF. */
const FUENTE_NORMAL = "F1";
const FUENTE_NEGRITA = "F2";
const FUENTE_SIMBOLOS = "F3";

/** Primer código de cada bloque de la tabla de anchos. */
const PRIMER_CODIGO_ASCII = 32;
const ULTIMO_CODIGO_ASCII = 126;
const PRIMER_CODIGO_LATIN1 = 160;
const ULTIMO_CODIGO_LATIN1 = 255;

/** Código WinAnsi que se usa cuando un carácter no existe en las fuentes ("?"). */
const CODIGO_REEMPLAZO = 63;

/**
 * Anchos de Helvetica (milésimas de em) para los códigos 32 a 126, tomados de
 * las métricas oficiales de Adobe (archivo AFM de Helvetica). Sirven para
 * saber cuánto mide un texto y partirlo en renglones.
 */
const ANCHOS_ASCII_NORMAL = Object.freeze([
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556,
  278, 278, 584, 584, 584, 556, 1015,
  667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611,
  278, 278, 278, 469, 556, 333,
  556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500,
  334, 260, 334, 584,
]);

/** Anchos de Helvetica-Bold para los códigos 32 a 126. */
const ANCHOS_ASCII_NEGRITA = Object.freeze([
  278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556,
  333, 333, 584, 584, 584, 611, 975,
  722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611,
  333, 278, 333, 584, 556, 333,
  556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500,
  389, 280, 389, 584,
]);

/** Anchos de Helvetica para los códigos 160 a 255 (tildes, ñ, µ, ±, «, »...). */
const ANCHOS_LATIN1_NORMAL = Object.freeze([
  278, 333, 556, 556, 556, 556, 260, 556, 333, 737, 370, 556, 584, 333, 737, 333,
  400, 584, 333, 333, 333, 556, 537, 278, 333, 333, 365, 556, 834, 834, 834, 611,
  667, 667, 667, 667, 667, 667, 1000, 722, 667, 667, 667, 667, 278, 278, 278, 278,
  722, 722, 778, 778, 778, 778, 778, 584, 778, 722, 722, 722, 722, 667, 667, 611,
  556, 556, 556, 556, 556, 556, 889, 500, 556, 556, 556, 556, 278, 278, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 584, 611, 556, 556, 556, 556, 500, 556, 500,
]);

/** Anchos de Helvetica-Bold para los códigos 160 a 255. */
const ANCHOS_LATIN1_NEGRITA = Object.freeze([
  278, 333, 556, 556, 556, 556, 280, 556, 333, 737, 370, 556, 584, 333, 737, 333,
  400, 584, 333, 333, 333, 611, 556, 278, 333, 333, 365, 556, 834, 834, 834, 611,
  722, 722, 722, 722, 722, 722, 1000, 722, 667, 667, 667, 667, 278, 278, 278, 278,
  722, 722, 778, 778, 778, 778, 778, 584, 778, 722, 722, 722, 722, 667, 667, 611,
  556, 556, 556, 556, 556, 556, 889, 556, 556, 556, 556, 556, 278, 278, 278, 278,
  611, 611, 611, 611, 611, 611, 611, 584, 611, 611, 611, 611, 611, 556, 611, 556,
]);

/**
 * Caracteres de WinAnsi en los códigos 128 a 159 (comillas tipográficas,
 * guiones –, —, €, …): [carácter, código, ancho normal, ancho negrita].
 */
const WINANSI_ESPECIALES = new Map([
  ["€", [0x80, 556, 556]], ["‚", [0x82, 222, 278]], ["ƒ", [0x83, 556, 556]], ["„", [0x84, 333, 500]],
  ["…", [0x85, 1000, 1000]], ["†", [0x86, 556, 556]], ["‡", [0x87, 556, 556]], ["ˆ", [0x88, 333, 333]],
  ["‰", [0x89, 1000, 1000]], ["Š", [0x8a, 667, 667]], ["‹", [0x8b, 333, 333]], ["Œ", [0x8c, 1000, 1000]],
  ["Ž", [0x8e, 611, 611]], ["‘", [0x91, 222, 278]], ["’", [0x92, 222, 278]], ["“", [0x93, 333, 500]],
  ["”", [0x94, 333, 500]], ["•", [0x95, 350, 350]], ["–", [0x96, 556, 556]], ["—", [0x97, 1000, 1000]],
  ["˜", [0x98, 333, 333]], ["™", [0x99, 1000, 1000]], ["š", [0x9a, 500, 556]], ["›", [0x9b, 333, 333]],
  ["œ", [0x9c, 944, 944]], ["ž", [0x9e, 500, 500]], ["Ÿ", [0x9f, 667, 667]],
]);

/** Símbolos que no están en WinAnsi y se dibujan con la fuente Symbol: [código, ancho]. */
const SIMBOLOS = new Map([
  ["√", [0xd6, 549]], ["≤", [0xa3, 549]], ["≥", [0xb3, 549]], ["≈", [0xbb, 549]],
  ["≠", [0xb9, 549]], ["−", [0x2d, 549]], ["Ω", [0x57, 768]],
]);

/**
 * Espacios y guiones "raros" de Unicode que se cambian por uno equivalente de
 * WinAnsi. Por ejemplo, el navegador escribe la hora como "3:05 p. m." con un
 * espacio angosto (U+202F) que WinAnsi no tiene.
 */
const EQUIVALENCIAS = Object.freeze([
  [/[ -   　]/g, " "],
  [/[‐‑]/g, "-"],
]);

/**
 * Cambia los caracteres que no existen en WinAnsi por uno equivalente.
 * @param {string} texto - Texto original.
 * @returns {string} Texto normalizado.
 */
function normalizarTexto(texto) {
  let resultado = String(texto).normalize("NFC");
  // Aplica cada equivalencia
  for (const [patron, reemplazo] of EQUIVALENCIAS) {
    resultado = resultado.replace(patron, reemplazo);
  }
  return resultado;
}

/**
 * Busca cómo dibujar un carácter: con qué fuente, con qué código y cuánto mide.
 * @param {string} caracter - Un carácter (punto de código Unicode).
 * @param {boolean} negrita - true para Helvetica-Bold.
 * @returns {{fuente: string, codigo: number, ancho: number}} Glifo a usar (ancho en milésimas de em).
 */
function buscarGlifo(caracter, negrita) {
  const fuenteTexto = negrita ? FUENTE_NEGRITA : FUENTE_NORMAL;
  const anchosAscii = negrita ? ANCHOS_ASCII_NEGRITA : ANCHOS_ASCII_NORMAL;
  const anchosLatin1 = negrita ? ANCHOS_LATIN1_NEGRITA : ANCHOS_LATIN1_NORMAL;
  const codigoUnicode = caracter.codePointAt(0);

  // ASCII imprimible y Latin-1 (incluye tildes, ñ, µ, ±): el código WinAnsi es el mismo de Unicode
  if (codigoUnicode >= PRIMER_CODIGO_ASCII && codigoUnicode <= ULTIMO_CODIGO_ASCII) {
    return { fuente: fuenteTexto, codigo: codigoUnicode, ancho: anchosAscii[codigoUnicode - PRIMER_CODIGO_ASCII] };
  }
  if (codigoUnicode >= PRIMER_CODIGO_LATIN1 && codigoUnicode <= ULTIMO_CODIGO_LATIN1) {
    return { fuente: fuenteTexto, codigo: codigoUnicode, ancho: anchosLatin1[codigoUnicode - PRIMER_CODIGO_LATIN1] };
  }
  // Comillas, guiones largos, €...
  if (WINANSI_ESPECIALES.has(caracter)) {
    const [codigo, anchoNormal, anchoNegrita] = WINANSI_ESPECIALES.get(caracter);
    return { fuente: fuenteTexto, codigo, ancho: negrita ? anchoNegrita : anchoNormal };
  }
  // Símbolos matemáticos con la fuente Symbol
  if (SIMBOLOS.has(caracter)) {
    const [codigo, ancho] = SIMBOLOS.get(caracter);
    return { fuente: FUENTE_SIMBOLOS, codigo, ancho };
  }
  // Cualquier otro carácter (emojis, otros alfabetos...) se cambia por "?"
  return { fuente: fuenteTexto, codigo: CODIGO_REEMPLAZO, ancho: anchosAscii[CODIGO_REEMPLAZO - PRIMER_CODIGO_ASCII] };
}

/**
 * Mide un texto ya normalizado.
 * @param {string} texto - Texto.
 * @param {number} tamano - Tamaño de letra (pt).
 * @param {boolean} negrita - true para negrita.
 * @returns {number} Ancho en puntos.
 */
function medirTexto_pt(texto, tamano, negrita) {
  let anchoMilesimas = 0;
  // Suma el ancho de cada carácter
  for (const caracter of texto) {
    anchoMilesimas += buscarGlifo(caracter, negrita).ancho;
  }
  return (anchoMilesimas * tamano) / UNIDADES_POR_EM;
}

/**
 * Parte un texto en renglones que caben en un ancho. Corta en los espacios; si
 * una palabra sola no cabe, la corta por letras.
 * @param {string} texto - Texto (se normaliza aquí).
 * @param {number} anchoMaximo_pt - Ancho disponible (pt).
 * @param {number} tamano - Tamaño de letra (pt).
 * @param {boolean} negrita - true para negrita.
 * @returns {string[]} Renglones (al menos uno).
 */
export function partirEnRenglones(texto, anchoMaximo_pt, tamano, negrita) {
  const renglones = [];
  let renglonActual = "";
  // Agrega palabra por palabra mientras quepan
  for (const palabra of normalizarTexto(texto).split(" ").filter((parte) => parte.length > 0)) {
    const candidato = renglonActual ? `${renglonActual} ${palabra}` : palabra;
    if (medirTexto_pt(candidato, tamano, negrita) <= anchoMaximo_pt) {
      renglonActual = candidato;
      continue;
    }
    if (renglonActual) {
      renglones.push(renglonActual);
    }
    renglonActual = "";
    // La palabra no cabe sola en un renglón: se corta por letras
    for (const caracter of palabra) {
      if (renglonActual && medirTexto_pt(renglonActual + caracter, tamano, negrita) > anchoMaximo_pt) {
        renglones.push(renglonActual);
        renglonActual = "";
      }
      renglonActual += caracter;
    }
  }
  renglones.push(renglonActual);
  return renglones;
}

/* ------------------------------------------------------------------------ */
/* Órdenes de dibujo (contenido de cada página)                             */
/* ------------------------------------------------------------------------ */

/** Códigos que se pueden escribir tal cual dentro de un texto PDF (ASCII visible). */
const CODIGO_ASCII_VISIBLE_MAXIMO = 126;
const BASE_OCTAL = 8;
const CIFRAS_OCTAL = 3;

/**
 * Escribe un número con 2 decimales, sin ceros sobrantes.
 * @param {number} valor - Número.
 * @returns {string} Texto del número.
 */
function numeroPdf(valor) {
  return String(Number(valor.toFixed(DECIMALES_PDF)));
}

/**
 * Orden de color de relleno ("rg") a partir de un color RGB.
 * @param {readonly number[]} color - [rojo, verde, azul] de 0 a 1.
 * @returns {string} Orden PDF.
 */
function ordenColorRelleno(color) {
  return `${color.map(numeroPdf).join(" ")} rg`;
}

/**
 * Convierte una lista de códigos en una cadena PDF "( ... )". Los paréntesis y
 * la barra invertida se escapan; los códigos fuera de ASCII van en octal
 * (\ddd), así todo el archivo queda en ASCII y es fácil de revisar.
 * @param {number[]} codigos - Códigos de la fuente.
 * @returns {string} Cadena PDF.
 */
function cadenaPdf(codigos) {
  const partes = codigos.map((codigo) => {
    const caracter = String.fromCharCode(codigo);
    if (caracter === "(" || caracter === ")" || caracter === "\\") {
      return `\\${caracter}`;
    }
    if (codigo < PRIMER_CODIGO_ASCII || codigo > CODIGO_ASCII_VISIBLE_MAXIMO) {
      return `\\${codigo.toString(BASE_OCTAL).padStart(CIFRAS_OCTAL, "0")}`;
    }
    return caracter;
  });
  return `(${partes.join("")})`;
}

/**
 * Órdenes para escribir un renglón de texto. El texto se divide en tramos
 * seguidos con la misma fuente (Helvetica o Symbol); cada "Tj" escribe un
 * tramo y deja el cursor al final, listo para el siguiente.
 * @param {string} texto - Renglón (ya cabe en su espacio).
 * @param {number} x_pt - Posición horizontal (desde el borde izquierdo).
 * @param {number} yLinea_pt - Posición vertical de la línea base (desde abajo).
 * @param {{tamano: number, negrita: boolean, color: readonly number[]}} estilo - Estilo del texto.
 * @returns {string} Órdenes PDF.
 */
function ordenesTexto(texto, x_pt, yLinea_pt, estilo) {
  const tramos = [];
  // Agrupa los caracteres seguidos que usan la misma fuente
  for (const caracter of normalizarTexto(texto)) {
    const glifo = buscarGlifo(caracter, estilo.negrita);
    const ultimo = tramos.at(-1);
    if (ultimo && ultimo.fuente === glifo.fuente) {
      ultimo.codigos.push(glifo.codigo);
    } else {
      tramos.push({ fuente: glifo.fuente, codigos: [glifo.codigo] });
    }
  }
  const ordenesTramos = tramos.map((tramo) => `/${tramo.fuente} ${numeroPdf(estilo.tamano)} Tf ${cadenaPdf(tramo.codigos)} Tj`);
  return `BT ${ordenColorRelleno(estilo.color)} ${numeroPdf(x_pt)} ${numeroPdf(yLinea_pt)} Td ${ordenesTramos.join(" ")} ET`;
}

/**
 * Orden para rellenar un rectángulo.
 * @param {number} x_pt - Esquina izquierda.
 * @param {number} yAbajo_pt - Borde inferior (desde abajo).
 * @param {number} ancho_pt - Ancho.
 * @param {number} alto_pt - Alto.
 * @param {readonly number[]} color - Color de relleno.
 * @returns {string} Órdenes PDF.
 */
function ordenesRectangulo(x_pt, yAbajo_pt, ancho_pt, alto_pt, color) {
  return `${ordenColorRelleno(color)} ${[x_pt, yAbajo_pt, ancho_pt, alto_pt].map(numeroPdf).join(" ")} re f`;
}

/**
 * Orden para trazar una línea horizontal.
 * @param {number} x1_pt - Inicio.
 * @param {number} x2_pt - Fin.
 * @param {number} y_pt - Altura (desde abajo).
 * @param {readonly number[]} color - Color de la línea.
 * @returns {string} Órdenes PDF.
 */
function ordenesLinea(x1_pt, x2_pt, y_pt, color) {
  return `${color.map(numeroPdf).join(" ")} RG ${numeroPdf(GROSOR_LINEA_PT)} w ${numeroPdf(x1_pt)} ${numeroPdf(y_pt)} m ${numeroPdf(x2_pt)} ${numeroPdf(y_pt)} l S`;
}

/* ------------------------------------------------------------------------ */
/* Escritura del archivo (objetos, xref y trailer)                          */
/* ------------------------------------------------------------------------ */

/** Encabezado: versión y una línea con bytes > 127 (indica que el archivo es binario). */
const ENCABEZADO_PDF = "%PDF-1.4\n%âãÏÓ\n";

/** Cifras de cada posición en la tabla xref (formato fijo de 10 cifras). */
const CIFRAS_POSICION_XREF = 10;

/** Primeros objetos fijos: 1 catálogo, 2 árbol de páginas, 3–5 fuentes, 6 información. */
const OBJETO_CATALOGO = 1;
const OBJETO_PAGINAS = 2;
const OBJETO_INFORMACION = 6;
const PRIMER_OBJETO_PAGINA = 7;

/** Base hexadecimal y cifras por unidad UTF-16 (texto de la información del documento). */
const BASE_HEXADECIMAL = 16;
const CIFRAS_HEX_UTF16 = 4;

/**
 * Texto en UTF-16 (hexadecimal) para la información del documento (título):
 * admite cualquier carácter.
 * @param {string} texto - Texto.
 * @returns {string} Cadena hexadecimal PDF "<FEFF...>".
 */
function cadenaUtf16(texto) {
  let hexadecimal = "FEFF";
  // Cada unidad UTF-16 se escribe con 4 cifras hexadecimales
  for (let indice = 0; indice < texto.length; indice += 1) {
    hexadecimal += texto.charCodeAt(indice).toString(BASE_HEXADECIMAL).toUpperCase().padStart(CIFRAS_HEX_UTF16, "0");
  }
  return `<${hexadecimal}>`;
}

/**
 * Fecha en el formato de PDF: D:AAAAMMDDHHmmSS.
 * @param {Date} fecha - Fecha.
 * @returns {string} Fecha PDF.
 */
function fechaPdf(fecha) {
  const dosCifras = (valor) => String(valor).padStart(2, "0");
  return `D:${fecha.getFullYear()}${dosCifras(fecha.getMonth() + 1)}${dosCifras(fecha.getDate())}`
    + `${dosCifras(fecha.getHours())}${dosCifras(fecha.getMinutes())}${dosCifras(fecha.getSeconds())}`;
}

/**
 * Arma el archivo PDF completo a partir del contenido de cada página.
 * @param {string[]} contenidosPaginas - Órdenes de dibujo de cada página (ASCII).
 * @param {{titulo: string, fecha: Date}} informacion - Título y fecha del documento.
 * @returns {Uint8Array} Bytes del archivo.
 */
function escribirArchivo(contenidosPaginas, informacion) {
  // Números de objeto de cada página y de su contenido
  const objetosPagina = contenidosPaginas.map((_, indice) => PRIMER_OBJETO_PAGINA + 2 * indice);
  const objetos = [
    `<< /Type /Catalog /Pages ${OBJETO_PAGINAS} 0 R >>`,
    `<< /Type /Pages /Kids [${objetosPagina.map((numero) => `${numero} 0 R`).join(" ")}] /Count ${contenidosPaginas.length} >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Symbol >>",
    `<< /Title ${cadenaUtf16(informacion.titulo)} /Producer (Analizador transparente) /CreationDate (${fechaPdf(informacion.fecha)}) >>`,
  ];
  const recursos = `<< /Font << /${FUENTE_NORMAL} 3 0 R /${FUENTE_NEGRITA} 4 0 R /${FUENTE_SIMBOLOS} 5 0 R >> >>`;
  // Cada página: el objeto página y su flujo de contenido
  for (const [indice, contenido] of contenidosPaginas.entries()) {
    const objetoContenido = objetosPagina[indice] + 1;
    objetos.push(
      `<< /Type /Page /Parent ${OBJETO_PAGINAS} 0 R /MediaBox [0 0 ${ANCHO_PAGINA_PT} ${ALTO_PAGINA_PT}] /Resources ${recursos} /Contents ${objetoContenido} 0 R >>`,
      `<< /Length ${contenido.length} >>\nstream\n${contenido}\nendstream`,
    );
  }

  // Se escriben los objetos anotando dónde empieza cada uno (en bytes)
  let archivo = ENCABEZADO_PDF;
  const posiciones = [];
  for (const [indice, cuerpo] of objetos.entries()) {
    posiciones.push(archivo.length);
    archivo += `${indice + 1} 0 obj\n${cuerpo}\nendobj\n`;
  }

  // Tabla xref: una línea de 20 bytes por objeto (el objeto 0 es obligatorio y está "libre")
  const inicioXref = archivo.length;
  const lineasXref = posiciones.map((posicion) => `${String(posicion).padStart(CIFRAS_POSICION_XREF, "0")} 00000 n \n`);
  archivo += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n${lineasXref.join("")}`;
  archivo += `trailer\n<< /Size ${objetos.length + 1} /Root ${OBJETO_CATALOGO} 0 R /Info ${OBJETO_INFORMACION} 0 R >>\n`;
  archivo += `startxref\n${inicioXref}\n%%EOF\n`;

  // Todos los caracteres son menores que 256: cada uno es exactamente un byte
  return Uint8Array.from(archivo, (caracter) => caracter.charCodeAt(0));
}

/* ------------------------------------------------------------------------ */
/* Documento: piezas para armar el contenido                                */
/* ------------------------------------------------------------------------ */

/**
 * Crea un documento PDF vacío. Se le agregan piezas en orden (de arriba hacia
 * abajo) y al final generar() devuelve los bytes del archivo. Si una pieza no
 * cabe en la página, pasa sola a la siguiente.
 * @param {{titulo: string, pie: string, fecha: Date}} opciones - Título del archivo, texto del pie de página y fecha.
 * @returns {object} Documento con titulo, subtitulo, seccion, parrafo, listaDatos, tabla, aviso y generar.
 */
export function crearDocumentoPdf(opciones) {
  if (typeof opciones?.titulo !== "string" || typeof opciones?.pie !== "string" || !(opciones?.fecha instanceof Date)) {
    throw new Error("Para crear el PDF se necesitan un título, un texto de pie de página y una fecha.");
  }
  const paginas = [];
  // Distancia desde el borde superior de la página hasta donde va lo siguiente
  let cursor_pt = 0;

  /** Empieza una página nueva. */
  const nuevaPagina = () => {
    paginas.push([]);
    cursor_pt = MARGEN_PT;
  };

  /**
   * Pasa a una página nueva si lo que sigue no cabe en la actual.
   * @param {number} alto_pt - Alto de lo que se va a dibujar.
   */
  const asegurarEspacio = (alto_pt) => {
    const limiteInferior_pt = ALTO_PAGINA_PT - MARGEN_PT - ALTO_PIE_PT;
    if (cursor_pt + alto_pt > limiteInferior_pt && cursor_pt > MARGEN_PT) {
      nuevaPagina();
    }
  };

  /**
   * Agrega órdenes a la página actual.
   * @param {string} ordenes - Órdenes PDF.
   */
  const dibujar = (ordenes) => paginas.at(-1).push(ordenes);

  /**
   * Escribe renglones uno debajo del otro desde el cursor.
   * @param {string[]} renglones - Renglones.
   * @param {number} x_pt - Posición horizontal.
   * @param {number} arriba_pt - Distancia desde el borde superior hasta el primer renglón.
   * @param {object} estilo - Tamaño, negrita y color.
   */
  const escribirRenglones = (renglones, x_pt, arriba_pt, estilo) => {
    const interlineado_pt = estilo.tamano * FACTOR_INTERLINEADO;
    // La línea base de cada renglón queda un tamaño de letra por debajo de su parte superior
    for (const [indice, renglon] of renglones.entries()) {
      const lineaBase_pt = ALTO_PAGINA_PT - (arriba_pt + indice * interlineado_pt + estilo.tamano);
      dibujar(ordenesTexto(renglon, x_pt, lineaBase_pt, estilo));
    }
  };

  /**
   * Escribe un bloque de texto con salto de renglón automático.
   * @param {string} texto - Texto.
   * @param {object} estilo - Tamaño, negrita y color.
   */
  const bloqueDeTexto = (texto, estilo) => {
    const renglones = partirEnRenglones(texto, ANCHO_UTIL_PT, estilo.tamano, estilo.negrita);
    const interlineado_pt = estilo.tamano * FACTOR_INTERLINEADO;
    // Renglón por renglón, para que un párrafo largo pueda seguir en la página siguiente
    for (const renglon of renglones) {
      asegurarEspacio(interlineado_pt);
      escribirRenglones([renglon], MARGEN_PT, cursor_pt, estilo);
      cursor_pt += interlineado_pt;
    }
  };

  /**
   * Parte el texto de cada celda de una fila en renglones y calcula el alto
   * de la fila (lo da la celda con más renglones).
   * @param {string[]} celdas - Texto de cada celda.
   * @param {{ancho_pt: number}[]} columnas - Columnas con su ancho.
   * @param {boolean} negrita - true para la fila de títulos.
   * @returns {{renglonesPorCelda: string[][], alto_pt: number}} Renglones y alto de la fila (pt).
   */
  const altoFila = (celdas, columnas, negrita) => {
    const interlineado_pt = TAMANO_TABLA * FACTOR_INTERLINEADO;
    const renglonesPorCelda = celdas.map((texto, indice) =>
      partirEnRenglones(texto, columnas[indice].ancho_pt - 2 * RELLENO_CELDA_X_PT, TAMANO_TABLA, negrita));
    const maximoRenglones = Math.max(...renglonesPorCelda.map((renglones) => renglones.length));
    return { renglonesPorCelda, alto_pt: maximoRenglones * interlineado_pt + 2 * RELLENO_CELDA_Y_PT };
  };

  /**
   * Dibuja una fila de la tabla (encabezado o datos) en el cursor.
   * @param {string[]} celdas - Texto de cada celda.
   * @param {{ancho_pt: number}[]} columnas - Columnas.
   * @param {boolean} esEncabezado - true para la fila de títulos.
   */
  const dibujarFila = (celdas, columnas, esEncabezado) => {
    const { renglonesPorCelda, alto_pt } = altoFila(celdas, columnas, esEncabezado);
    const yAbajo_pt = ALTO_PAGINA_PT - cursor_pt - alto_pt;
    // El encabezado lleva fondo azul claro
    if (esEncabezado) {
      dibujar(ordenesRectangulo(MARGEN_PT, yAbajo_pt, ANCHO_UTIL_PT, alto_pt, COLOR_FONDO_ENCABEZADO));
    }
    const estilo = { tamano: TAMANO_TABLA, negrita: esEncabezado, color: esEncabezado ? COLOR_AZUL : COLOR_TEXTO };
    let x_pt = MARGEN_PT;
    // Escribe cada celda dentro de su columna
    for (const [indice, renglones] of renglonesPorCelda.entries()) {
      escribirRenglones(renglones, x_pt + RELLENO_CELDA_X_PT, cursor_pt + RELLENO_CELDA_Y_PT, estilo);
      x_pt += columnas[indice].ancho_pt;
    }
    dibujar(ordenesLinea(MARGEN_PT, MARGEN_PT + ANCHO_UTIL_PT, yAbajo_pt, COLOR_LINEA));
    cursor_pt += alto_pt;
  };

  nuevaPagina();

  return {
    /**
     * Título grande en azul.
     * @param {string} texto - Título.
     */
    titulo(texto) {
      bloqueDeTexto(texto, { tamano: TAMANO_TITULO, negrita: true, color: COLOR_AZUL });
      cursor_pt += ESPACIO_DESPUES_TITULO;
    },
    /**
     * Subtítulo gris con una línea debajo.
     * @param {string} texto - Subtítulo.
     */
    subtitulo(texto) {
      bloqueDeTexto(texto, { tamano: TAMANO_SUBTITULO, negrita: false, color: COLOR_SECUNDARIO });
      cursor_pt += ESPACIO_DESPUES_SECCION;
      dibujar(ordenesLinea(MARGEN_PT, MARGEN_PT + ANCHO_UTIL_PT, ALTO_PAGINA_PT - cursor_pt, COLOR_LINEA));
      cursor_pt += ESPACIO_DESPUES_BLOQUE;
    },
    /**
     * Título de una sección (no queda solo al final de una página).
     * @param {string} texto - Título de la sección.
     */
    seccion(texto) {
      const alto_pt = TAMANO_SECCION * FACTOR_INTERLINEADO;
      cursor_pt += ESPACIO_ANTES_SECCION;
      asegurarEspacio(alto_pt + TAMANO_TEXTO * FACTOR_INTERLINEADO * 2);
      bloqueDeTexto(texto, { tamano: TAMANO_SECCION, negrita: true, color: COLOR_AZUL });
      cursor_pt += ESPACIO_DESPUES_SECCION;
    },
    /**
     * Párrafo de texto normal.
     * @param {string} texto - Párrafo.
     */
    parrafo(texto) {
      bloqueDeTexto(texto, { tamano: TAMANO_TEXTO, negrita: false, color: COLOR_TEXTO });
      cursor_pt += ESPACIO_DESPUES_BLOQUE;
    },
    /**
     * Lista de datos: término en negrita a la izquierda y valor a la derecha.
     * @param {[string, string][]} pares - Pares [término, valor].
     */
    listaDatos(pares) {
      const interlineado_pt = TAMANO_TEXTO * FACTOR_INTERLINEADO;
      const anchoValor_pt = ANCHO_UTIL_PT - ANCHO_TERMINO_PT;
      // Un par por fila; el valor largo se parte en renglones
      for (const [termino, valor] of pares) {
        const renglonesTermino = partirEnRenglones(termino, ANCHO_TERMINO_PT - RELLENO_CELDA_X_PT, TAMANO_TEXTO, true);
        const renglonesValor = partirEnRenglones(valor, anchoValor_pt, TAMANO_TEXTO, false);
        const alto_pt = Math.max(renglonesTermino.length, renglonesValor.length) * interlineado_pt;
        asegurarEspacio(alto_pt);
        escribirRenglones(renglonesTermino, MARGEN_PT, cursor_pt, { tamano: TAMANO_TEXTO, negrita: true, color: COLOR_TEXTO });
        escribirRenglones(renglonesValor, MARGEN_PT + ANCHO_TERMINO_PT, cursor_pt, { tamano: TAMANO_TEXTO, negrita: false, color: COLOR_TEXTO });
        cursor_pt += alto_pt;
      }
      cursor_pt += ESPACIO_DESPUES_BLOQUE;
    },
    /**
     * Tabla con salto de página: si una fila no cabe, pasa a la página
     * siguiente y allí se repite la fila de títulos.
     * @param {{titulo: string, fraccion: number}[]} columnas - Títulos y fracción del ancho (deben sumar 1).
     * @param {string[][]} filas - Texto de cada celda, fila por fila.
     */
    tabla(columnas, filas) {
      const sumaFracciones = columnas.reduce((suma, columna) => suma + columna.fraccion, 0);
      if (Math.abs(sumaFracciones - 1) > TOLERANCIA_FRACCIONES) {
        throw new Error(`Las fracciones de ancho de las columnas deben sumar 1 (suman ${sumaFracciones}).`);
      }
      const columnasConAncho = columnas.map((columna) => ({ titulo: columna.titulo, ancho_pt: columna.fraccion * ANCHO_UTIL_PT }));
      const titulos = columnas.map((columna) => columna.titulo);
      const altoEncabezado_pt = altoFila(titulos, columnasConAncho, true).alto_pt;

      // El encabezado no se queda solo: debe caber con la primera fila
      const altoPrimeraFila_pt = filas.length > 0 ? altoFila(filas[0], columnasConAncho, false).alto_pt : 0;
      asegurarEspacio(altoEncabezado_pt + altoPrimeraFila_pt);
      dibujarFila(titulos, columnasConAncho, true);

      // Fila por fila; al saltar de página se repite el encabezado
      for (const celdas of filas) {
        const paginasAntes = paginas.length;
        asegurarEspacio(altoFila(celdas, columnasConAncho, false).alto_pt);
        if (paginas.length > paginasAntes) {
          dibujarFila(titulos, columnasConAncho, true);
        }
        dibujarFila(celdas, columnasConAncho, false);
      }
      cursor_pt += ESPACIO_DESPUES_BLOQUE;
    },
    /**
     * Aviso final en negrita con una línea encima.
     * @param {string} texto - Aviso.
     */
    aviso(texto) {
      const renglones = partirEnRenglones(texto, ANCHO_UTIL_PT, TAMANO_TEXTO, true);
      asegurarEspacio(ESPACIO_LINEA_AVISO + renglones.length * TAMANO_TEXTO * FACTOR_INTERLINEADO);
      dibujar(ordenesLinea(MARGEN_PT, MARGEN_PT + ANCHO_UTIL_PT, ALTO_PAGINA_PT - cursor_pt, COLOR_LINEA));
      cursor_pt += ESPACIO_LINEA_AVISO;
      bloqueDeTexto(texto, { tamano: TAMANO_TEXTO, negrita: true, color: COLOR_TEXTO });
    },
    /**
     * Termina el documento: agrega el pie "Página n de m" a cada página y
     * devuelve los bytes del archivo.
     * @returns {Uint8Array} Archivo PDF.
     */
    generar() {
      const estiloPie = { tamano: TAMANO_PIE, negrita: false, color: COLOR_SECUNDARIO };
      const lineaBasePie_pt = MARGEN_PT - TAMANO_PIE;
      // Pie de página en cada página (ahora ya se sabe cuántas páginas hay)
      const contenidos = paginas.map((ordenes, indice) => {
        const numeroPagina = `Página ${indice + 1} de ${paginas.length}`;
        const xNumero_pt = MARGEN_PT + ANCHO_UTIL_PT - medirTexto_pt(normalizarTexto(numeroPagina), TAMANO_PIE, false);
        const pie = [
          ordenesTexto(opciones.pie, MARGEN_PT, lineaBasePie_pt, estiloPie),
          ordenesTexto(numeroPagina, xNumero_pt, lineaBasePie_pt, estiloPie),
        ];
        return [...ordenes, ...pie].join("\n");
      });
      return escribirArchivo(contenidos, { titulo: opciones.titulo, fecha: opciones.fecha });
    },
  };
}

/* ------------------------------------------------------------------------ */
/* Descarga en el navegador                                                 */
/* ------------------------------------------------------------------------ */

/** Tiempo antes de liberar la dirección temporal del archivo (ms). */
const ESPERA_LIBERAR_ENLACE_MS = 10000;

/**
 * Descarga un archivo PDF directo, sin diálogo de imprimir: se crea un Blob
 * (el archivo en la memoria del navegador), una dirección temporal "blob:" y
 * un enlace con el atributo download que se "hace clic" solo. Nada sale del
 * navegador.
 * @param {Uint8Array} bytes - Archivo PDF.
 * @param {string} nombreArchivo - Nombre con el que se guarda.
 */
export function descargarPdf(bytes, nombreArchivo) {
  const archivo = new Blob([bytes], { type: "application/pdf" });
  const direccion = URL.createObjectURL(archivo);
  const enlace = document.createElement("a");
  enlace.href = direccion;
  enlace.download = nombreArchivo;
  enlace.hidden = true;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  // La dirección temporal se libera después, cuando la descarga ya empezó
  window.setTimeout(() => URL.revokeObjectURL(direccion), ESPERA_LIBERAR_ENLACE_MS);
}
