# CLAUDE.md — Analizador transparente (simulador web de seguridad eléctrica)

## 0. Quiénes somos y cómo debes trabajar con nosotros
- Somos 3 estudiantes de Ingeniería Biomédica (UAO, Cali), en la asignatura Diseño Biomédico 1: Yustin Rico, David Cardona y Santiago González. Entrega final: **20 de noviembre de 2026**.
- El profesor permite que el código lo escriba una IA, pero **nosotros debemos entender y explicar cada parte**. Por eso:
  1. Trabaja por FASES (sección 11) y DETENTE al final de cada una. Resume qué hiciste y explica el código en lenguaje sencillo, en español, como a un estudiante de séptimo semestre.
  2. No agregues funciones que no estén en este archivo. Si algo falta o es ambiguo, PREGUNTA antes de inventar.
  3. Responde siempre en español. Código, nombres de variables y comentarios también en español (sin tildes en los identificadores).
- Todo lo de este archivo sale de nuestros documentos en docs/ (requerimientos, especificaciones, datos de calibración, arquitectura). Si hay conflicto, manda este archivo y nos avisas.

## 1. El problema (para que entiendas el propósito)
- En la práctica de seguridad eléctrica del laboratorio hay **un solo analizador Fluke ESA620** para todo el grupo. El estudiante lo usa como una **"caja negra"**: anota la lectura, pero no entiende por qué cambia cuando se impone una condición de prueba (tierra abierta, neutro abierto, polaridad invertida).
- Datos propios: 12 de 12 estudiantes atribuyen el cambio de lectura a "un error" y no a la condición; 5 de 6 no entienden cómo el equipo produce el valor; 3 de 3 docentes lo llaman "caja negra".
- Solución: un **aplicativo web** que simula la prueba de seguridad eléctrica del **electrocardiógrafo Mindray BeneHeart R12** (Clase I, partes aplicadas tipo **CF a prueba de desfibrilación**, según el manual del fabricante) como la haría un analizador tipo ESA620, pero **"transparente"**: muestra por dentro el camino de la corriente y explica cada lectura.
- Es una herramienta **individual**, para práctica autónoma, que **complementa y no reemplaza** la práctica real. No es dispositivo médico (Decreto 4725 de 2005): uso solo educativo.

## 2. Alcance (qué SÍ y qué NO)
SÍ:
- Solo **computador**: Chrome y Edge en Windows.
- **Sin servidor propio, sin base de datos y sin cuentas.** Todo corre en el navegador. Se publica gratis en GitHub Pages.
- 5 secciones (sección 6), un solo equipo (R12), dos tipos de medición (**corriente de contacto** y **corriente de paciente CF**) y cuatro condiciones.
- Reporte final descargable en PDF + botón para copiar resumen al portapapeles.

NO (trabajo futuro: no lo construyas):
- Versión para celular; otros equipos; predecir antes de medir (RF09); ayuda contextual avanzada (RF10).
- Módulo físico; HL7/FHIR; backend; inicio de sesión; analítica o rastreo de cualquier tipo.
- Fuga a tierra y red en parte aplicada: NO se calculan (fuera del alcance de esta versión).

## 3. Arquitectura (obligatoria; ver docs/Diagramas y docs/08)
Modular tipo **hexagonal**:
- **NÚCLEO**: funciones puras, sin acceso al DOM, 100 % probables con `node --test`.
- **ADAPTADORES**: conectan el núcleo con la pantalla, la memoria y el reporte.

| Módulo | Archivo | Tipo | Responsabilidad |
|---|---|---|---|
| M1 Interfaz de usuario | js/adaptadores/interfaz.js + index.html + css/estilos.css | Adaptador | 5 secciones, navegación y eventos; muestra resultados |
| M2 Secuencia de la prueba | js/nucleo/secuencia.js | Núcleo | Orden fijo de los pasos, propósito de cada paso, no permite saltar pasos |
| M3 Modelo del equipo | js/nucleo/modelo_equipo.js | Núcleo | Carga y VALIDA datos/parametros_r12.json (tipos y rangos) |
| M4 Motor de cálculo | js/nucleo/motor_calculo.js | Núcleo | Corriente de contacto y de paciente por condición + incertidumbre U |
| M5 Evaluador de límites | js/nucleo/evaluador_limites.js | Núcleo | Límite IEC 60601-1 aplicable y veredicto |
| M6 Visualizador | js/adaptadores/visualizador.js | Adaptador | Circuito en SVG (red MD, conmutadores L/N/PE, chasis, parte aplicada) y animación del camino de la corriente |
| M8 Historial | js/adaptadores/historial.js | Adaptador | Registro de lecturas en memoria (y sessionStorage); nota visible de que las lecturas se borran al cerrar la pestaña (sin aviso beforeunload) |
| M10 Reporte | js/adaptadores/reporte.js | Adaptador | Reporte final en PDF (generador propio js/adaptadores/pdf.js, descarga directa) y copiar resumen al portapapeles |

Regla: el núcleo NO importa nada de los adaptadores. Los adaptadores sí usan el núcleo.

## 4. Datos y modelo físico (no inventes valores: usa estos)
datos/parametros_r12.json (todo en unidades SI):
```json
{
  "equipo": {"nombre": "Electrocardiógrafo Mindray BeneHeart R12", "clase": "I", "parte_aplicada": "CF a prueba de desfibrilación",
             "norma_general": "IEC 60601-1", "norma_particular": "IEC 60601-2-25"},
  "red": {"V_rms": 120, "f_Hz": 60},
  "capacitancias_F": {"C_L": 325.7e-12, "C_N": 325.7e-12, "C_AP": 28.0e-12},
  "delta_paciente_tierra_abierta_A": 0.83e-6,
  "R_PE_ohm": 0.0026,
  "R_MD_ohm": 1000,
  "exactitud_analizador": {"porcentaje_lectura": 1.0, "piso_uA": 1.0, "k": 2},
  "limites_uA": {"contacto": {"normal": 100, "primer_defecto": 500}, "paciente_CF": {"normal": 10, "primer_defecto": 50}},
  "pasos_previos_medidos": {
    "inspeccion_visual": "Sin hallazgos (carcasa, contaminación, cableado, etiquetas, piezas: Bien)",
    "resistencia_tierra_ohm": {"valor": "< 0.015", "limite": 0.2},
    "aislamiento_Mohm": {"red_tierra": "> 100 (OL)", "partes_aplicadas_tierra": 94.7, "red_partes_aplicadas": "> 100 (OL)"}
  },
  "fuente": "Calibrado con mediciones reales del Fluke ESA620 sobre el R12 serie FN-84011415 (3 repeticiones por condición)"
}
```
Condición = {polaridad: "normal" | "invertida", tierra: "cerrada" | "abierta", neutro: "cerrado" | "abierto"}.
- PROHIBIDO tierra abierta Y neutro abierto a la vez (sería doble falla). Lanza un error claro.
- Es "normal" si tierra y neutro están cerrados (la polaridad no cambia esto). Es "primer_defecto" si uno de los dos está abierto.

Fórmulas (k = V_rms · 2πf = 45 238.93 A/F; resultados en µA):
- C_activa = C_L con polaridad normal y C_N con polaridad invertida. Con neutro abierto: C_total = C_L + C_N.
- **Contacto**:
  - Tierra cerrada: I = k·C · R_PE / (R_PE + R_MD), con C = C_activa (o C_total si el neutro está abierto). Divisor de corriente: casi todo se va por la tierra.
  - Tierra abierta: I = k·C_activa (toda la fuga pasa por la persona). Se usa esta aproximación porque X_C ≈ 8 MΩ ≫ R_MD; documéntalo.
- **Paciente CF**:
  - Normal o neutro abierto: I = k·C_AP.
  - Tierra abierta: I = k·C_AP + 0.83 µA (término EMPÍRICO medido; el comentario del código debe decirlo así).
- **Incertidumbre mostrada** (la que tendría el analizador real): U = k_cob · (0.01·I + 1 µA)/√3, con k_cob = 2. Se muestra como "± U".
- **Veredicto**: "Cumple" si I ≤ límite; si no, "No cumple". Muestra también el % del límite usado.

## 5. Valores esperados (deben salir EXACTOS en las pruebas; ES01: error ≤ 1 %)
| Medición | Condición | I esperada (µA) | ± U (µA) | Límite (µA) | Veredicto |
|---|---|---|---|---|---|
| Contacto | Normal (pol. normal o invertida) | 3.83e-5 (≈ 0.00) | 1.15 | 100 | Cumple |
| Contacto | Tierra abierta (pol. normal o invertida) | 14.734 | 1.32 | 500 | Cumple |
| Contacto | Neutro abierto (cualquier polaridad) | 7.66e-5 (≈ 0.00) | 1.15 | 500 | Cumple |
| Paciente CF | Normal | 1.267 | 1.17 | 10 | Cumple |
| Paciente CF | Tierra abierta | 2.097 | 1.18 | 50 | Cumple |
| Paciente CF | Neutro abierto | 1.267 | 1.17 | 50 | Cumple |

Datos medidos con el ESA620 (media ± desviación estándar, n = 3), para la prueba ES02 (tests/es02_validacion.test.js):
- Contacto: NC normal 0.12 ± 0.03 | NC invertida 0.12 ± 0.03 | tierra abierta normal 14.47 ± 0.45 | tierra abierta invertida 14.97 ± 0.06 | neutro abierto normal 0.10 ± 0.00 | neutro abierto invertida 0.10 ± 0.00.
- Paciente CF: NC normal 1.27 ± 0.21 | NC invertida 1.20 ± 0.10 | tierra abierta normal 2.10 ± 0.10 | tierra abierta invertida 2.13 ± 0.15 | neutro abierto normal 1.20 ± 0.10 | neutro abierto invertida 1.07 ± 0.12.
- Criterio: E_n = |I_modelo − media| / U_med ≤ 1, con U_med = 2·√((s/√3)² + ((0.01·media + 1)/√3)²). Debe cumplirse en TODAS las configuraciones.

## 6. Interfaz (M1): 5 secciones en una sola página, en español, sobria
Estilo:
- Fondo claro; azul oscuro #14365F como color principal; rojo SOLO para la corriente de fuga.
- Tipografía del sistema (sin fuentes externas). Ancho mínimo de diseño: 1280 px.
- No imitar la apariencia del ESA620 ni usar logos de Fluke o Mindray (los nombres en texto sí se pueden usar).
- Aviso fijo y discreto: "Herramienta educativa. Complementa la práctica con el analizador real; no sirve para certificar equipos."

1. **Equipo bajo prueba**: ficha del R12 (Clase I, parte CF a prueba de desfibrilación, partes aplicadas: electrodos y cable de paciente). Por qué CF es la más estricta (microchoque: corriente directa al corazón) y comparación de límites B, BF y CF.
2. **Prueba guiada** (M2): 4 pasos en orden fijo: inspección visual → resistencia de tierra → aislamiento → corrientes de fuga. Cada paso muestra su PROPÓSITO de seguridad antes del resultado. Los pasos 1–3 muestran los valores medidos de "pasos_previos_medidos"; el paso 4 lleva a la sección Analizador. No se puede avanzar sin completar el paso anterior.
3. **Analizador** (M4 + M5 + M6), el corazón:
   - selector de medición (contacto o paciente CF);
   - conmutadores de polaridad, tierra y neutro (deshabilita la combinación prohibida y explica por qué);
   - botón "Medir"; lectura grande "I ± U µA", límite, % del límite y Cumple/No cumple;
   - circuito SVG con el camino de la corriente resaltado en rojo, animado;
   - explicación física (texto de la sección 7) y fórmula usada.
4. **Comparar**: tabla con todas las configuraciones medidas en la sesión, lado a lado, con barras horizontales simples en SVG propio (sin librerías) y la banda ± U visible.
5. **Historial y reporte** (M8 + M10):
   - tabla de lecturas (condición, medición, I, U, límite, veredicto, hora);
   - botón "Finalizar práctica" → pide el nombre (máximo 60 caracteres; texto plano) → vista de reporte;
   - "Descargar reporte (PDF)": descarga directa del archivo reporte_seguridad_electrica_AAAA-MM-DD.pdf, creado por el generador propio js/adaptadores/pdf.js (sin librerías; Blob + enlace con download);
   - "Copiar resumen" copia el resumen al portapapeles (navigator.clipboard.writeText); el estudiante lo pega en su correo y adjunta el PDF. (Antes era un enlace mailto: se quitó porque en Windows abre una lista de programas y no sirve con correo web.)
   - Sin límite de tiempo: la práctica se puede pausar.

## 7. Textos de explicación (úsalos tal cual; puedes ajustar redacción menor)
- Contacto, normal: "La fuga capacitiva del equipo (≈ 14.7 µA) se va casi toda por el conductor de protección (≈ 0.003 Ω), que está en paralelo con la persona (1 kΩ). Por divisor de corriente casi nada pasa por la persona: ≈ 0 µA. El analizador real muestra ≈ 0.1 µA por su resolución."
- Contacto, polaridad invertida: "En este equipo los capacitores de fuga de fase y de neutro son casi iguales, por eso invertir la polaridad casi no cambia la lectura."
- Contacto, tierra abierta: "Sin conductor de protección, la fuga de la capacitancia entre fase y chasis no tiene un camino de baja resistencia: circula por la persona. I = V·2πf·C ≈ 14.7 µA. Es primer defecto: límite 500 µA."
- Contacto, neutro abierto: "Con el neutro abierto ambos lados de la red quedan a tensión de fase y la fuga total aumenta, pero la tierra sigue conectada y se la lleva: ≈ 0 µA por la persona."
- Paciente CF, normal: "Es la corriente que cruza la barrera de aislamiento de la parte aplicada (≈ 28 pF): ≈ 1.3 µA. Como los electrodos pueden quedar cerca del corazón (CF), el límite es 10 µA."
- Paciente CF, tierra abierta: "Con el chasis sin tierra aumenta el acople hacia la parte aplicada: ≈ 2.1 µA (aumento medido en el laboratorio). Límite de primer defecto: 50 µA."
- Paciente CF, neutro abierto: "≈ 1.3 µA, casi igual a la condición normal en este equipo. Límite de primer defecto: 50 µA."
- Banda ± U: "Es la exactitud del analizador real (±(1 % + 1 µA), k = 2). Si dos lecturas difieren menos que esta banda, la diferencia puede ser del instrumento y no de la condición."

## 7.1 Estructura del repositorio
```
index.html · css/estilos.css · js/main.js
js/nucleo/{secuencia,modelo_equipo,motor_calculo,evaluador_limites}.js
js/adaptadores/{interfaz,visualizador,historial,reporte,pdf,tiempo_carga}.js
datos/parametros_r12.json
tests/{motor_calculo,evaluador_limites,secuencia,modelo_equipo,es02_validacion,pdf,sri,tiempo_carga}.test.js
tools/sri.mjs (calcula los hashes SHA-384 de los JS y CSS y los escribe en index.html) · tools/peso.mjs (suma el peso descargado, ES05)
docs/ (nuestros documentos + manual_usuario.md, solucion_problemas.md, mantenimiento.md, verificacion.md)
README.md · LICENSE (MIT) · CHANGELOG.md · CLAUDE.md · .gitignore
```
JavaScript moderno con módulos ES (import/export), sin frameworks ni dependencias externas en el navegador. Para desarrollo local se sirve con `python -m http.server` o `npx serve`, porque fetch del JSON no funciona abriendo el archivo directo.

## 8. Reglas de código (pedidas por el profesor)
- Cada archivo empieza con un bloque de cabecera: título, descripción en lenguaje sencillo, módulo (M1–M10), autores, fecha de creación y de modificación.
- JSDoc en cada función: qué hace, parámetros con unidades y lo que retorna. Comentario antes de cada bloque y de cada ciclo.
- Nombres descriptivos (corrienteContacto_uA, condicionPrueba); sin variables de una letra salvo índices; sin "números mágicos": todo valor viene del JSON o de una constante con nombre.
- Programación defensiva: valida entradas en el núcleo y lanza errores con mensajes claros en español; la interfaz los muestra sin romperse.
- Legibilidad antes que eficiencia; funciones cortas; sin código muerto.
- Commits pequeños, en español y descriptivos ("M4: corriente de contacto con tierra abierta + pruebas").

## 9. Seguridad (obligatoria)
- Content-Security-Policy en una meta etiqueta de index.html: `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'` (frame-ancestors no funciona en meta; GitHub Pages no permite cabeceras propias, así que no se incluye). Por eso NO uses scripts ni estilos en línea ni atributos onclick.
- Integridad de subrecursos (SRI): atributos integrity (sha384) en los script y link, generados por tools/sri.mjs antes de cada versión.
- Nunca uses innerHTML con texto del usuario (el nombre): usa textContent. Sin eval ni new Function.
- 0 peticiones de red fuera de los archivos propios: sin CDN, fuentes, analítica ni APIs (ES13).
- HTTPS: lo da GitHub Pages (activar "Enforce HTTPS").
- Commits firmados: los configuramos nosotros (llave SSH de firma en GitHub y `git config commit.gpgsign true`). Tú solo recuérdanos verificarlo; no generes llaves.

## 10. Especificaciones que el software DEBE cumplir (docs/03)
| ID | Qué | Meta | Cómo ayudas tú |
|---|---|---|---|
| ES01 | Error del cálculo frente a la referencia | ≤ 1 % | Pruebas unitarias de M4 con la tabla de la sección 5 |
| ES02 | Concordancia con el ESA620 | E_n ≤ 1 en todas | tests/es02_validacion.test.js con los datos de la sección 5 |
| ES03 | Latencia con 30 usuarios concurrentes | p95 ≤ 1 s, 0 % errores | Instrucciones en docs/verificacion.md para `npx autocannon -c 30 -d 60 <URL de GitHub Pages>` |
| ES04 | Tiempo de carga (LCP) | ≤ 2.5 s | Página liviana; instrucciones de Lighthouse |
| ES05 | Peso total descargado | ≤ 1 600 KiB | Sin librerías; script que sume el tamaño de los archivos |
| ES06 | Navegadores | Chrome y Edge sin errores | Solo APIs estándar |
| ES08 | Usuarios paralelos reales | ≥ 5 | Sin servidor: no hay límite |
| ES09 | Generar el reporte | ≤ 3 s | Reporte en el mismo navegador |
| ES10–ES11 | SUS ≥ 68; ≥ 80 % completan sin ayuda | Sesión con estudiantes | Interfaz clara; plantilla en docs/verificacion.md |
| ES12 | Licencias | 0 COP | Licencia MIT; sin dependencias pagas |
| ES13 | Datos enviados a servidores | 0 | Sin red; revisar la pestaña Red |
| ES14–ES15 | RAM ≤ 300 MB; CPU promedio ≤ 20 % | Administrador de tareas de Chrome | Animación con requestAnimationFrame y que se detenga cuando no hace falta |

## 11. Fases de trabajo (detente y explica al final de cada una)
- **Fase 0 – Estructura**: crea la estructura de carpetas, README (qué es, cómo correrlo, cómo probarlo), LICENSE, .gitignore, CHANGELOG y package.json con un script `"test": "node --test"` (sin dependencias). Commit.
- **Fase 1 – Núcleo + pruebas** (lo más importante): M3, M4, M5 y M2 con sus pruebas. Primero escribe las pruebas de la sección 5 y luego el código hasta que pasen. Muéstranos la tabla "esperado vs. obtenido vs. error %" y los E_n de ES02. EXPLÍCANOS el motor de cálculo paso a paso.
- **Fase 2 – Interfaz y visualizador**: M1 (5 secciones) y M6 (SVG animado). Explícanos cómo se conecta la interfaz con el núcleo.
- **Fase 3 – Historial y reporte**: M8 y M10 (PDF + copiar resumen al portapapeles).
- **Fase 4 – Seguridad y rendimiento**: CSP, tools/sri.mjs, revisión de innerHTML/eval, presupuesto de peso (ES05) y detener la animación en reposo.
- **Fase 5 – Lanzamiento y documentación**: docs/manual_usuario.md (paso a paso con capturas sugeridas), docs/solucion_problemas.md, docs/mantenimiento.md (cada cuánto revisar: navegadores, parámetros y versión), docs/verificacion.md (tabla ES01–ES15 con columnas Meta, Cómo se mide, Valor medido, ¿Cumple?), versión v1.0.0 en el CHANGELOG e instrucciones para publicar en GitHub Pages.

## MENSAJE INICIAL (pegar en Claude Code)
"Lee CLAUDE.md y los documentos de docs/. Antes de escribir código, explícame en 10 líneas qué vas a construir y hazme las preguntas que tengas. Después empieza la Fase 0 y detente al terminarla."
