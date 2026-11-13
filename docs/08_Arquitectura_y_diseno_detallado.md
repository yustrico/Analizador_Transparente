# 08 — Arquitectura y diseño detallado del software (Corte 3)

Fecha: 12/11/2026 · Diagramas en la carpeta Diagramas/:
- C4_N1_Contexto.png (caja negra)
- C4_N2_Contenedores.png y C4_N3_Componentes.png (caja transparente)
- DFD_Nivel1.png

Confirmado por el profesor (12/11/2026): C4 + DFD, sin UML; solo computador; sin servidor.

## 1. Software de escritorio vs. aplicativo web (lo pidió el profesor)
| Criterio | Software de escritorio | Aplicativo web (ELEGIDO) |
|---|---|---|
| Cómo llega al usuario | Se descarga e instala (.exe) | Se abre con un enlace en el navegador |
| Versiones | Una por sistema operativo | Un solo código para todos los PC |
| Actualización | Cada usuario reinstala | Se publica una vez y le llega a todos |
| Permisos en PC de la UAO | Instalar suele estar bloqueado | No instala nada |
| Arquitectura típica | Programa monolítico con instalador | Aplicación de una sola página que corre en el navegador; en este caso sin servidor propio |
| Costo | Firma del instalador o tiendas de aplicaciones | 0 COP (GitHub Pages) |

Justificación: cumple RNF04 (sin instalación, fuera del laboratorio), RNF05 (PC de la UAO y de los estudiantes) y RR05 (0 COP). El profesor confirmó que no se requiere servidor.

## 2. Tipo de arquitectura: modular (hexagonal)
- Modular y no integral: cada módulo cumple una función completa y las interfaces entre módulos son datos bien definidos (sección 5). Así los 3 integrantes pueden trabajar en paralelo y se pueden agregar equipos o módulos sin tocar el núcleo.
- Hexagonal: el NÚCLEO (M2–M5) son funciones puras, sin pantalla. Se prueban solas (pruebas unitarias) y no cambian si cambia la interfaz.
- Los ADAPTADORES (M1, M6, M8, M10) conectan el núcleo con la pantalla, la memoria y el reporte.
- Expansión futura (lo que pidió el profesor sobre "expandible"): versión celular, M7 Evaluación, M9 módulo físico, exportación HL7/FHIR. Todo como adaptadores nuevos, sin tocar el núcleo.

## 3. Jerarquía (Sistema → Subsistema → Componente → Elemento)
- Sistema: Analizador transparente.
  - Subsistema 1, Aplicación web (contenedor):
    - Núcleo: M2 Secuencia, M3 Modelo del equipo, M4 Motor de cálculo, M5 Evaluador de límites.
    - Adaptadores: M1 Interfaz, M6 Visualizador, M8 Historial, M10 Reporte.
    - Elementos: un archivo JavaScript por módulo (por ejemplo motor.js) y sus funciones.
  - Subsistema 2, Datos: parametros_r12.json (D1 + D2).
  - Subsistema 3, Historial (D3): memoria del navegador.
  - Subsistema 4, Reporte: PDF descargable (generador propio) + copiar resumen al portapapeles.

## 4. Fichas de módulos
| Módulo | Tipo | Qué hace | Recibe | Entrega | Requerimientos | Especificaciones |
|---|---|---|---|---|---|---|
| M1 Interfaz | Adaptador | 5 secciones: Equipo, Prueba guiada, Analizador, Comparar, Historial | Clics del estudiante; Resultado | Acción (paso, condición, medición) | RF01, RF08, RNF07 | ES10, ES11, ES06 |
| M2 Secuencia | Núcleo | Orden fijo de la prueba y propósito de cada paso; no deja saltar pasos | Acción | Paso actual; Condición + Medición | RF01, RF02 | — |
| M3 Modelo del equipo | Núcleo | Carga y valida los parámetros del R12 | parametros_r12.json | Parámetros | RR01, RR02 | — |
| M4 Motor de cálculo | Núcleo | Corriente de contacto y de paciente por condición e incertidumbre U | Condición, Medición, Parámetros | I (µA), U (µA), corriente por rama | RF03, RF04, RNF02, RNF03 | ES01, ES02 |
| M5 Evaluador de límites | Núcleo | Límite IEC 60601-1 aplicable y veredicto | I, U, Medición, Condición | Resultado | RF06, RF07 | — |
| M6 Visualizador | Adaptador | Dibuja la red MD y los conmutadores L/N/PE en SVG y anima el camino de la corriente | Corriente por rama, Condición | Dibujo SVG | RF05 | ES15 (CPU) |
| M8 Historial | Adaptador | Guarda las lecturas de la sesión | Resultado | Lista de registros | RF11 | ES14 (RAM) |
| M10 Reporte | Adaptador | Arma el reporte final, lo descarga como PDF y prepara el resumen para el correo | Lista de registros, nombre | Archivo PDF; copiar resumen al portapapeles | RF11, RNF09 | ES09 |
| M7 Evaluación | Trabajo futuro | Predecir antes de medir | — | — | RF09 | — |
| M9 Módulo físico | Trabajo futuro | Medición real a baja tensión | — | — | — | — |

## 5. Diccionario de datos (interfaces entre módulos)
| Dato | Campos | Ejemplo |
|---|---|---|
| Condición | polaridad: "normal" o "invertida"; tierra: "cerrada" o "abierta"; neutro: "cerrado" o "abierto" (nunca tierra y neutro abiertos a la vez) | {polaridad:"normal", tierra:"abierta", neutro:"cerrado"} |
| Medición | tipo: "contacto" o "paciente" | {tipo:"contacto"} |
| Parámetros | V = 120 V; f = 60 Hz; C_L = C_N = 325.7 pF; C_AP = 28.0 pF; ΔI = 0.83 µA; R_PE = 0.0026 Ω; R_MD = 1000 Ω | Archivo 06 |
| Límites | contacto: 100 µA (normal) y 500 µA (primer defecto); paciente CF: 10 µA y 50 µA | IEC 60601-1 |
| Resultado | I_uA, U_uA, limite_uA, veredicto ("Cumple" o "No cumple"), hora | {I_uA:14.73, U_uA:1.33, limite_uA:500, veredicto:"Cumple"} |
| Registro | Resultado + Condición + Medición | Una fila del historial y del reporte |

## 6. Tabla de interacciones cruzadas (guía del Corte 3, punto 2.3)
| Origen | Destino | Tipo | Naturaleza | Riesgo asociado |
|---|---|---|---|---|
| M1 Interfaz | M2 Secuencia | Fundamental | Información (acción) | Saltar pasos → M2 bloquea el orden |
| M2 Secuencia | M4 Motor | Fundamental | Información (Condición, Medición) | Condición inválida (dos fallas a la vez) → se rechaza (programación defensiva) |
| M3 Modelo | M4 Motor | Fundamental | Información (Parámetros) | JSON dañado o alterado → validación + hash SRI |
| M4 Motor | M5 Evaluador | Fundamental | Información (I, U) | Error de cálculo → pruebas unitarias contra la tabla del 06 (ES01) |
| M5 Evaluador | M1 Interfaz | Fundamental | Información (Resultado) | Límite equivocado → comparación con la tabla de la norma (RF07) |
| M4 Motor | M6 Visualizador | Fundamental | Información (corriente por rama) | Dibujo distinto al cálculo → ambos usan la misma salida de M4 |
| M6 Visualizador | M1 Interfaz | Incidental | Rendimiento (animación SVG) | Uso alto de CPU o lentitud → ES15 y ES03 |
| M5 Evaluador | M8 Historial | Fundamental | Información (Registro) | Pérdida al cerrar la pestaña → nota visible «descarga tu reporte antes de cerrar» |
| M8 Historial | M10 Reporte | Fundamental | Información (lista de registros) | Reporte incompleto → revisar el número de lecturas antes de generar |
| M10 Reporte | Correo del estudiante | Fundamental | Información (copiar resumen al portapapeles) | Datos personales → solo el nombre que escribe el estudiante; 0 envíos a servidores (ES13) |
| GitHub Pages | Aplicación | Fundamental | Información (archivos HTTPS) | Archivos alterados → HTTPS + hashes SRI + commits firmados |

## 7. Seguridad mínima (no se alcanzó a preguntar; se adopta y documenta)
- HTTPS: lo da GitHub Pages.
- Commits firmados en GitHub (aparecen como "Verified").
- Hashes SHA-256 (SRI) en los archivos JS y CSS.
- Política de seguridad de contenido (CSP): solo se cargan archivos propios.
- Sin librerías externas, sin eval y sin insertar texto del usuario como HTML.
- 0 datos enviados a servidores (ES13).

## 8. Cronograma
- Para la presentación se recomienda un cronograma EJECUTADO, con las fechas reales que muestran los archivos y las entregas (Corte 1, Corte 2, correcciones 01–08), más el PLAN de lo que queda hasta el 20/11.
- Si se presenta como "plan vs. real", las diferencias se explican; no hay que hacer que coincida.
