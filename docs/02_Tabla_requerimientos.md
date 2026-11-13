# Corrección 02 — Capa de requerimientos entre necesidades y especificaciones (Diseño Biomédico 1, UAO)

Fecha: 30 de octubre de 2026 · Equipo: Yustin Rico, David Cardona, Santiago González
Estado: tabla redactada. FALTA revisarla en equipo y pasarla al Word (nueva Sec. VII-A, antes de las especificaciones) y al Canva.
Relacionado: 01_Correccion_problematica_literatura.md (corrección anterior). Siguiente: 03, rehacer las especificaciones.

## 1. Por qué se hizo
Retroalimentación del Corte 2: "antes de pasar de necesidades a especificaciones debe haber unos requerimientos, para hacer un mejor contraste". Además, el profesor dijo que E02 y E06 no son especificaciones. Ambas cosas son el mismo problema: el equipo metió requerimientos (qué hace el software) en la tabla de especificaciones (qué tan bien lo hace, con número).

## 2. Las tres capas (con base en las diapositivas del curso, Ulrich y Eppinger)
| Capa | Qué es | Ejemplo | Fuente en el curso |
|---|---|---|---|
| Necesidad (N) | Lo que el usuario necesita, en su lenguaje y SIN solución | N06: ver cómo cambia la corriente al cambiar la condición | Diap. 04, n.º 7: las necesidades son neutrales a la solución |
| Requerimiento (R) | Lo que el SOFTWARE DEBE hacer o cumplir, ya con la solución elegida (C1). Se verifica, pero no siempre con un número | RF04: el software debe calcular la corriente de contacto y la de paciente en cada condición | Diap. 05, n.º 16: desglose desde requisitos de alto nivel hasta especificaciones detalladas |
| Especificación (E) | Métrica + valor + cómo se mide | E09: latencia ≤ 500 ms (percentil 95 de 30 cambios) | Diap. 05, n.º 3: "una especificación consiste de una medida y un valor" |

Regla práctica: si la frase dice QUÉ hace el software → requerimiento. Si dice CUÁNTO o QUÉ TAN BIEN, con unidad → especificación. Un conteo de funciones ("4 condiciones") es un requerimiento, no una especificación.

Método de verificación de cada requerimiento: I = inspección (se mira que exista), D = demostración (se usa y se ve que funciona), P = prueba (se mide contra un valor) y A = análisis (cálculo o revisión técnica).

## 3. Requerimientos funcionales (RF): qué debe hacer el software
| ID | El software debe… | Necesidades | Verif. | Pasa a especificación |
|---|---|---|---|---|
| RF01 | Guiar la prueba completa y en orden: inspección visual → resistencia de tierra → aislamiento → corrientes de fuga, de forma que cada estudiante la recorra solo y entera | N01, N02 | D | No (antes E01) |
| RF02 | Mostrar el propósito de seguridad de cada paso antes de ejecutarlo | N03 | I | No (antes E01) |
| RF03 | Permitir imponer, una a la vez, las condiciones: normal, polaridad invertida, tierra abierta y neutro abierto (cada falla es un primer defecto, nunca dos al tiempo) | N05, N27 (parcial: tierra rota) | D | No (antes E02) |
| RF04 | Calcular la corriente de contacto Y la corriente de paciente (parte aplicada CF) en cada condición, con el modelo del equipo (tensión, frecuencia, capacitancias de fuga, red MD) | N06, N14 | A | Sí: E07 (exactitud) y E08 (concordancia con el analizador) |
| RF05 | Mostrar el circuito interno del analizador y el camino de la corriente, actualizado con cada condición (red MD, conmutadores L/N/PE, tierra de protección) | N12, N13, N18 | D | No (antes E05) |
| RF06 | Mostrar junto a cada lectura su explicación física (fórmula y fenómeno) con la terminología de IEC 60601-1 | N11, N14, N26 | I | No (antes E06) |
| RF07 | Comparar cada lectura con el límite aplicable (contacto o paciente, condición normal o primer defecto, Clase I, parte CF), mostrar Cumple o No cumple y mostrar al lado el límite equivalente para partes B y BF | N09, N10, N11 | I | No (antes E03) |
| RF08 | Mostrar lado a lado las lecturas de las cuatro condiciones | N06, N08 | D | No |
| ~~RF09~~ (TRABAJO FUTURO, 11/11/2026) | Pedir al estudiante que prediga la lectura antes de medir y mostrarle la diferencia con el valor obtenido y su causa | N07, N21 | D | No |
| ~~RF10~~ (TRABAJO FUTURO, 11/11/2026) | Ofrecer ayuda en cada pantalla (glosario y explicación del paso) sin salir de la herramienta | N17 | I | No |
| RF11 | Al terminar la práctica, generar un REPORTE FINAL (estudiante, fecha, equipo, lecturas por condición, límite, Cumple/No cumple y resumen) que se pueda descargar en PDF y enviar por correo con un botón que abre el correo del propio estudiante (mailto, sin servidor). Mantiene la tabla de historial en pantalla. CAMBIO del 12/11/2026: reemplaza al CSV | N22, N20 parcial (la herramienta es INDIVIDUAL: el estudiante guarda o envía su propio reporte; solo si el docente lo pide para la práctica, se lo reenvía. No hay recolección central de datos) | D | Sí: ES09 |

## 4. Requerimientos no funcionales (RNF): cómo debe comportarse
| ID | El software debe… | Necesidades | Verif. | Pasa a especificación |
|---|---|---|---|---|
| RNF01 | Responder de inmediato al cambiar una condición (lectura y animación) | N06, N13 | P | Sí: E09 latencia |
| RNF02 | Calcular sin error frente al cálculo a mano | N06, N14 | P | Sí: E07 |
| RNF03 | Dar lecturas coherentes con el analizador real del laboratorio | N06, N07, N28 | P | Sí: E08, REFORMULADA como media ± desviación estándar (retroalimentación) |
| RNF04 | Funcionar fuera del laboratorio, desde el navegador, sin instalación ni servidor de cálculo, con varios estudiantes al mismo tiempo | N02, N15 | P | Sí: E10 + NUEVAS (tiempo de carga y funcionamiento sin internet después de la primera carga) |
| RNF05 | Funcionar en los computadores de los estudiantes y de la UAO (Chrome y Edge en Windows). Solo computador, aceptado por el profesor el 12/11/2026 | N25 | P | Sí: ES06 |
| RNF06 | Ser liviano | N25 | P | Sí: NUEVA (peso máximo del programa, pedida por el profesor) |
| RNF07 | Poder usarse sin un manual extenso | N24 | P | Sí: E14 SUS |
| RNF08 | Permitir repetir cualquier prueba sin límite de intentos ni de tiempo, sin riesgo eléctrico | N16 | I | No. REEMPLAZA a E13 (el profesor pidió tiempo indefinido) |
| RNF09 | Entregar el reporte en un formato que cualquiera pueda abrir (PDF) | N22 | P | Sí: ES09 |
| RNF10 | Guardar los datos del estudiante solo en su dispositivo, sin enviarlos a ningún servidor | Ley 1581 de 2012 | P | Sí: NUEVA (0 envíos de datos personales, se revisa con las herramientas del navegador) |

## 5. Restricciones (RR): límites que el diseño no puede cambiar
| ID | Restricción | Origen | Pasa a especificación |
|---|---|---|---|
| RR01 | Alcance: un solo equipo bajo prueba, el electrocardiógrafo Mindray BeneHeart R12 del laboratorio, Clase I, partes aplicadas CF (IEC 60601-1 e IEC 60601-2-25). CAMBIO aprobado por el profesor el 06/11/2026; antes era un monitor de signos vitales con ECG (IEC 60601-2-27) | Retroalimentación del Corte 1; profesor 06/11/2026; N19 (parcial) | No (antes E04) |
| RR02 | Red modelada de 120 V y 60 Hz | IEC 60601-1, red de Colombia | No |
| RR03 | Uso solo educativo: no se usa con pacientes ni con equipos en servicio, por lo que no es dispositivo médico | Decreto 4725 de 2005 | No |
| RR04 | Datos de participantes con consentimiento informado | Ley 1581 de 2012 | No |
| RR05 | Costo de licencias = 0 COP | Económica | Sí: E15 |
| RR06 | Complementa y no reemplaza la práctica con el analizador real | N28 | No |
| RR07 | Se construye y se verifica en el semestre con 3 integrantes | Calendario | No |

## 6. Qué pasa con cada especificación vieja
| Vieja | Qué pasa |
|---|---|
| E01 pasos guiados = 4 | Pasa a requerimiento (RF01, RF02) |
| E02 condiciones = 4 | Pasa a requerimiento (RF03). Corrige la crítica del profesor |
| E03 límites = 4 | Pasa a requerimiento (RF07) |
| E04 equipo modelado = 1 | Pasa a restricción (RR01) |
| E05 elementos internos = 4 | Pasa a requerimiento (RF05) |
| E06 lecturas explicadas = 100 % | Pasa a requerimiento (RF06). Corrige la crítica del profesor |
| E07 error vs. cálculo a mano ≤ 1 % | Se queda como especificación |
| E08 diferencia vs. analizador ≤ 20 % | Se queda, pero se reformula como media ± desviación estándar (punto 3) |
| E09 latencia ≤ 500 ms | Se queda |
| E10 usuarios en paralelo ≥ 5 | Se queda |
| E11 navegadores ≥ 2 | Se queda y se amplía (punto 3) |
| E12 CSV ≤ 3 s | Se queda |
| E13 práctica ≤ 30 min | Se elimina; queda el requerimiento RNF08 (tiempo indefinido) |
| E14 SUS ≥ 68 | Se queda |
| E15 licencias = 0 COP | Se queda, ligada a la restricción RR05 |

## 7. Trazabilidad: las 28 necesidades quedan cubiertas o justificadas
- Cubiertas por al menos un requerimiento: N01–N03, N05–N18, N20 (parcial), N21, N22, N24–N28.
- N19 (varios equipos reales): parcial; RR01 limita a un equipo por la retroalimentación del Corte 1. Bomba de infusión y electrobisturí quedan como trabajo futuro.
- Trabajo futuro, con justificación:
  - N04 (diferenciar IEC 60601-1 de IEC 62353): cambia los límites y los métodos; se deja para no agrandar el alcance.
  - N23 (repetibilidad e incertidumbre): requiere datos reales repetidos.
  - "Red en parte aplicada" (de N05) y "aislamiento degradado" (de N27): requieren un modelo adicional.

## 8. Decisiones tomadas en esta corrección (revisar en equipo)
1. Se AGREGA RF09 (predecir antes de medir), porque los expertos calificaron alto N21 y ataca directo el hallazgo central (12/12 atribuyen el cambio de lectura a error). Es la estrategia Predecir–Observar–Explicar de White y Gunstone, que ya está en las referencias del Word [18].
2. RF04 obliga a modelar la CORRIENTE DE PACIENTE CF, que hoy no está en el modelo de cálculo y es la más importante para un monitor ECG.
3. RF03 dice "una falla a la vez". Eso corrige el error del neutro abierto = 145 µA, que solo sale si también está abierta la tierra (doble falla).
4. Las especificaciones nuevas de software (peso, tiempo de carga, funcionamiento sin internet, resolución mínima, 0 envíos de datos) se definen con su valor en el punto 3.

## 9. Pendiente
- [ ] Revisar la tabla en equipo (sobre todo las decisiones 1 y 2).
- [ ] Pasarla al Word como nueva sección antes de la Tabla X de especificaciones; la Tabla XI de restricciones se reemplaza por la sección 5.
- [ ] Punto 3: rehacer las especificaciones con valores (archivo 03).

## 10. Recorte de alcance (11/11/2026, decisión del equipo; entrega el 20/11)
- RF09 (predecir antes de medir) y RF10 (ayuda en pantalla) pasan a TRABAJO FUTURO. Ninguna especificación los mide, así que todas las especificaciones se mantienen.
- Trazabilidad:
  - N21 y N17 quedan como trabajo futuro, con esta justificación: tiempo de desarrollo (9 días) y que no son necesarias para el núcleo de la solución.
  - N07 sigue cubierta por RF06 (explicación física), RF08 (comparar condiciones) y la banda de incertidumbre de cada lectura (archivo 06).
- La esencia se conserva: el estudiante recorre la prueba completa (RF01), impone las condiciones (RF03), ve el camino de la corriente (RF05) y entiende por qué cambia la lectura (RF06, RF08).
