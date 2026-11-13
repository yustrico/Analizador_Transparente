# Corrección 03 — Especificaciones v2, cuantitativas y alcanzables (Diseño Biomédico 1, UAO)

Fecha: 30 de octubre de 2026 · Equipo: Yustin Rico, David Cardona, Santiago González
Estado: especificaciones del SOFTWARE redactadas. FALTA revisarlas en equipo, confirmar el modelo del analizador del laboratorio y pasarlas al Word, al libro de cálculo y al Canva.
Relacionado: 01 (problemática con literatura) y 02 (requerimientos). Cada especificación sale de un requerimiento de la 02.

## 0. RESUELTO (06/11/2026): el profesor dijo que, al ser software, SOLO se califica la parte de software. Las etapas 2 y 3 de la guía (mecánico y electrónico) no aplican y el módulo físico M9 NO se construye. Lo de abajo queda como historial.

### (historial) ALERTA: la guía del Corte 3 pide más que software
El archivo "🧩 GUÍA FINAL DE ENTREGABLES 3.docx" tiene 5 etapas:
1. Arquitectura.
2. DISEÑO MECÁNICO: análisis de cargas, FEM, materiales, planos y lista de materiales (BOM).
3. DISEÑO ELECTRÓNICO: esquemáticos, PCB, IEC 60601-1-2 y matriz de riesgos eléctricos.
4. Software.
5. PROTOTIPO SEMIFUNCIONAL que integre los tres dominios: mecánico, electrónico y software.

Con una solución solo de software, las etapas 2 y 3 quedan vacías y la 5 queda incompleta.
- El profesor permitió el software, pero la guía es la misma para todos los grupos.
- Decisión pendiente del equipo (preguntar al profesor POR ESCRITO):
  - (a) cómo se califican las etapas 2 y 3 en un proyecto de software; o
  - (b) construir el módulo físico M9, que ya está en la arquitectura como trabajo futuro: una maqueta de baja tensión con interruptores de tierra, neutro y polaridad, capacitores de fuga, la red MD y un microcontrolador que mida y envíe los datos al simulador.
- Las especificaciones de software de este archivo sirven en ambos casos. Si se elige (b), se agrega un bloque de especificaciones de hardware.

## 1. Por qué se rehicieron
Retroalimentación del Corte 2:
- E02 y E06 no eran especificaciones. Ya pasaron a requerimientos (archivo 02).
- E08: 20 % es mucho; usar una incertidumbre con desviación estándar.
- E13: el tiempo debe ser indefinido.
- Ampliar las especificaciones de software: peso del programa, navegadores, etc.

En clase el profesor insistió en que todo debe ser cuantitativo, soportado y parametrizado, y en que cada especificación debe CUMPLIRSE para tener buena nota.

## 2. Reglas usadas (para defenderlas en la sustentación)
1. Cada especificación = métrica + unidad + valor + método de medición con n definido (diap. 05, n.º 3).
2. Cada valor tiene un soporte externo (norma, guía técnica o literatura) o una razón explícita.
3. HUMILDAD: el valor elegido es más holgado que lo que se espera lograr. Así hay margen para cumplir.
4. Cuando hay repeticiones, se reporta media ± desviación estándar (lo pidió el profesor), además de cumple o no cumple.
5. Si es una función que existe o no (sí/no), es un REQUERIMIENTO y no una especificación. Ese fue el error de E02 y E06.

## 3. Parámetros del modelo (lo "parametrizado")
| Parámetro | Símbolo | Valor | Origen | Estado |
|---|---|---|---|---|
| Tensión de red | V | 120 V rms | Red de Colombia; el analizador la mide en cada prueba | Usar el valor medido |
| Frecuencia | f | 60 Hz | Red de Colombia | Fijo |
| Capacitancia de fuga fase–chasis | C_L | 2.2 nF | Valor de modelo | SE CALIBRA con la medición real (ES02) |
| Capacitancia de fuga neutro–chasis | C_N | 1.0 nF | Valor de modelo | SE CALIBRA |
| Capacitancia de aislamiento red–parte aplicada CF | C_AP | Por definir | Falta modelar la corriente de paciente (RF04) | SE CALIBRA |
| Resistencia de tierra de protección | R_PE | 0.2 Ω | IEC 60601-1, valor usado en el documento del Corte 2 | Fijo |
| Red de medición (persona) | R_MD | ≈ 1 kΩ a 60 Hz | IEC 60601-1 | Fijo |
| Límite de contacto | — | 100 µA (normal) / 500 µA (primer defecto) | IEC 60601-1 | Fijo |
| Límite de paciente CF | — | 10 µA (normal) / 50 µA (primer defecto) | IEC 60601-1 | Fijo |

Ecuaciones del motor:
- Corriente por una capacitancia: I = V · 2πf · C.
- Con tierra conectada, la corriente se reparte: I_MD = I · R_PE / (R_PE + R_MD).

Valores con los parámetros iniciales (corrientes de contacto):
| Condición (una falla a la vez) | Cálculo | Corriente en la MD |
|---|---|---|
| Normal, polaridad normal | 99.53 µA × 0.2/1000.2 | 0.020 µA |
| Normal, polaridad invertida | 45.24 µA × 0.2/1000.2 | 0.009 µA |
| Tierra abierta, polaridad normal | 120 · 377 · 2.2 nF | 99.53 µA |
| Tierra abierta, polaridad invertida | 120 · 377 · 1.0 nF | 45.24 µA |
| Neutro abierto (tierra CONECTADA) | 144.77 µA × 0.2/1000.2 | 0.029 µA |

CORRECCIÓN: antes se mostraba neutro abierto = 145 µA. Ese valor supone que la tierra también está abierta, y eso es doble falla. Hay que cambiarlo en la pantalla "Comparar", en el guion y en el Word.

## 4. Especificaciones v2 del software (ES01–ES13)
| ID | Métrica (unidad) | Valor objetivo | Cómo se mide (n) | Soporte del valor | Req. | Antes |
|---|---|---|---|---|---|---|
| ES01 | Error relativo del cálculo del simulador frente a una simulación del mismo circuito en LTspice (%) | ≤ 1 % en cada caso | 8 casos: 4 condiciones × (contacto, paciente) | El modelo es el mismo, así que el error esperado es < 0.1 %; el 1 % deja 10 veces de margen y es la exactitud de lectura típica de un analizador (±1 % de la lectura) | RF04, RNF02 | E07 |
| ES02 | Error normalizado frente al analizador real, E_n (adimensional) | abs(E_n) ≤ 1 en cada configuración medida | 10 lecturas por configuración en el monitor del laboratorio. Se reporta media ± DE. E_n = abs(I_sim − media) / U, con U = 2·√((s/√n)² + u_B²) y u_B = exactitud del analizador / √3 | E_n ≤ 1 es el criterio de ISO/IEC 17043 e ISO 13528 para decir que dos valores coinciden dentro de su incertidumbre. Responde a la retroalimentación: incertidumbre con desviación estándar en vez de un % | RNF03 | E08 |
| ES03 | Latencia con usuarios concurrentes: tiempo de carga de la herramienta publicada con **30 usuarios reales simultáneos** (ms), medido por cada navegador con Navigation Timing (inicio de la navegación → loadEventEnd) | Percentil 95 ≤ 1 s y 0 % de errores | 30 personas reales abren el enlace al mismo tiempo (cuenta regresiva) en una ventana de incógnito y pegan su resumen con el tiempo de carga; p95 por el método del rango más cercano; error = quien no pudo cargar la página. Ver docs/protocolo_ES03_30_usuarios.md | 30 ≈ un curso completo usándola a la vez. 1 s = límite de Nielsen para no perder el hilo. Lo pidió el profesor (06/11/2026: "latencia por concurrencia"). CAMBIO del 13/11/2026: se descartó la prueba con autocannon (no representaba el uso real y GitHub Pages la bloqueó con 429) | RNF01, RNF04 | E09 (REFORMULADA) |
| ES04 | Tiempo de carga: Largest Contentful Paint (s) | ≤ 2.5 s | Lighthouse en perfil de escritorio (desktop), mediana de 5 corridas | Umbral "bueno" de Google (web.dev, Core Web Vitals) | RNF04 | NUEVA |
| ES05 | Peso del programa: total descargado en la primera carga (KiB) | ≤ 1 600 KiB | Lighthouse ("network payload") o la pestaña Red del navegador | Meta recomendada por Google para Lighthouse (cargable en 3G en ≤ 10 s) | RNF06 | NUEVA (la pidió el profesor) |
| ES06 | Número de navegadores de computador en los que pasan los 8 casos de prueba sin errores | ≥ 2 (Chrome y Edge en Windows) | Ejecutar los 8 casos en cada navegador | Navegadores de los PC de la UAO y de los estudiantes. Solo computador (profesor, 12/11/2026) | RNF05 | E11 |
| ~~ES07~~ | ELIMINADA (12/11/2026): el profesor aceptó que sea solo para computador, así que el ancho de celular ya no aplica | — | — | — | — | — |
| ES08 | Dispositivos reales usando la herramienta al mismo tiempo sin errores (usuarios paralelos, lo pidió el profesor) | ≥ 5 | Prueba simultánea en el aula | Un grupo de práctica; hoy el analizador físico atiende un solo grupo a la vez | RNF04 | E10 |
| ES09 | Tiempo para generar el reporte final de la práctica (s) | ≤ 3 s (máximo de 10 generaciones) | Cronometrar 10 veces desde el clic en "Finalizar práctica" hasta que el reporte está listo para descargar en PDF o copiar resumen al portapapeles | Holgado frente a 1 s (Nielsen). Reemplaza al CSV a pedido del profesor (12/11/2026) | RF11, RNF09 | E12 (REFORMULADA) |
| ES10 | Usabilidad: puntaje SUS (0–100) | Media ≥ 68, reportada como media ± DE | n ≥ 5 estudiantes del nicho que no participaron en el diseño | 68 = promedio de referencia del SUS (Brooke 1996; Bangor 2009, ya citados) | RNF07 | E14 |
| ES11 | Tasa de estudiantes que completan la prueba guiada sin ayuda (%) | ≥ 80 % (≥ 4 de 5) | En la misma sesión de ES10 | Eficacia según ISO 9241-11 (uso sin manual, N24, y prueba completa por cada estudiante, N02) | RF01, RNF07 | NUEVA |
| ES12 | Costo de licencias por usuario (COP) | = 0 | Lista de dependencias y sus licencias | Restricción económica | RR05 | E15 |
| ES13 | Peticiones de red que envían datos del estudiante a un servidor | = 0 | Pestaña Red del navegador durante una práctica completa | Ley 1581 de 2012 (datos personales) | RNF10 | NUEVA |

| ES14 | Memoria RAM usada por la pestaña durante una práctica completa (MB) | Máximo ≤ 300 MB | Administrador de tareas de Chrome (Shift + Esc), valor máximo, en un PC del laboratorio | Confirmado por el profesor (12/11/2026). Una página sin librerías pesadas suele gastar menos; confirmar con la primera versión | RNF06 | NUEVA |
| ES15 | Uso de CPU de la pestaña durante una práctica completa (%) | Promedio ≤ 20 % | Administrador de tareas de Chrome, promedio de lecturas cada 10 s | Confirmado por el profesor (12/11/2026) | RNF01, RNF06 | NUEVA |

## 5. Lo que deliberadamente NO es especificación (y por qué)
- Funcionar sin internet después de la primera carga: es sí/no, así que es requerimiento (RNF04) y se verifica por demostración.
- Tiempo de la práctica: el profesor pidió tiempo indefinido, así que es requerimiento (RNF08).
- Mejora del aprendizaje (antes y después): NO se promete un valor, porque con n = 5 y un semestre no se puede garantizar. Se mide en el instrumento D como dato exploratorio, sin meta. Esto es lo honesto.

## 6. Riesgos para cumplir (revisar YA)
| Riesgo | Especificación | Acción |
|---|---|---|
| No conseguir el analizador y un monitor ECG del laboratorio | ES02 | Pedir el turno de laboratorio ya; confirmar el modelo exacto del analizador Fluke y su exactitud de corriente de fuga en la hoja de datos (dato para u_B) |
| El monitor real tiene fugas que no son solo capacitivas | ES02 | Calibrar C_L, C_N y C_AP con la medición; si aun así abs(E_n) > 1, reportar la desviación del modelo |
| Pocos voluntarios (n < 5) | ES10, ES11 | Agendar la sesión con 7 estudiantes para asegurar 5 |
| Usar librerías pesadas (gráficas o animación) | ES04, ES05 | HTML + JS + SVG propios, sin frameworks grandes |

Nota honesta sobre ES02: C_L, C_N y C_AP se ajustan con la propia medición. Por eso ES02 demuestra que el simulador calibrado reproduce lo que el estudiante verá en el laboratorio; no es una predicción independiente. Las configuraciones con tierra conectada (≈ 0 µA) sí son predicciones del modelo.

## 7. Referencias que soportan los valores
- J. Nielsen, Usability Engineering. Academic Press, 1993 (límites de 0.1 s, 1 s y 10 s).
- Google, "Largest Contentful Paint (LCP)," web.dev (bueno ≤ 2.5 s).
- Google, "Avoid enormous network payloads," Chrome for Developers, Lighthouse (meta < 1 600 KiB).
- ISO/IEC 17043:2023 e ISO 13528:2022 (error normalizado E_n ≤ 1).
- JCGM 100:2008 (GUM), incertidumbre tipo A = s/√n; tipo B rectangular = a/√3.
- ISO 9241-11:2018 (usabilidad: eficacia, eficiencia y satisfacción).
- Brooke 1996 y Bangor et al. 2009 (SUS), ya en el Word.

## 8. Pendiente
- [ ] DECIDIR con el profesor: cómo se califican las etapas 2 y 3 de la guía, o si se agrega el módulo físico M9 (sección 0).
- [ ] Confirmar el modelo del analizador del laboratorio y su exactitud (para ES02).
- [ ] Confirmar el ancho de pantalla de los celulares del equipo (ES07).
- [ ] Modelar la corriente de paciente CF (C_AP) en el libro de cálculo.
- [ ] Corregir neutro abierto en "Comparar", el guion y el Word (0.029 µA, no 145 µA).
- [ ] Pasar ES01–ES13 al Word (Tabla X), a la hoja 3_Especificaciones del Excel y a la diapositiva 6.

## 9. EN ESPERA de respuesta del profesor (30/10/2026)
- ES03 (latencia) y ES08 (usuarios simultáneos): el profesor dijo en clase que la latencia requiere un servidor. Ojo: en el Corte 2 la latencia fue una de las 3 especificaciones que él mismo pidió. Se le preguntó si las quiere así (medidas en el navegador, sin servidor) o si se quitan. NO borrarlas hasta tener su respuesta.
- Si la latencia se mantiene, lo correcto es llamarla "tiempo de respuesta de la interfaz", porque no hay latencia de red. Se mide en el navegador con performance.now() o con el INP de Google (bueno ≤ 200 ms; ≤ 500 ms "necesita mejorar").
- Mensaje enviado: preguntas 1–6 sobre las etapas mecánica y electrónica de la guía, latencia, usuarios simultáneos, E_n ≤ 1 con media ± DE, la capa de requerimientos y la fecha del prototipo. Ver 04_Preguntas_al_profesor.md.

## 10. Datos recibidos (05/11/2026)
- Analizador del laboratorio: Fluke ESA620 (confirmado con foto por Yustin).
  - Hoja de datos de Fluke Biomedical, corriente de fuga: rangos de 0.0 a 199.9 µA, de 200 a 1999 µA y de 2.00 a 10.00 mA.
  - Exactitud de DC a 1 kHz (incluye 60 Hz): ±(1 % de la lectura + 1 µA). Carga de medición IEC 60601: Fig. 15.
  - Para ES02: u_B = (0.01·lectura + 1 µA)/√3.
  - Ejemplo: lectura de 99.5 µA con s = 0.5 µA y n = 10 → u_B = 1.15 µA, u_A = 0.16 µA, U (k = 2) = 2.32 µA. El simulador debe quedar a ±2.3 µA de la media.
  - Con tierra conectada (lectura ≈ 0.3 µA), U ≈ 1.2 µA, así que el 0.02 µA del modelo cumple.
- ES02 SÍ requiere ir al laboratorio. Los límites de la norma (100/500 µA y 10/50 µA) solo dicen si el equipo pasa o no pasa; no dicen qué valor da el monitor real. Los límites se verifican en RF07 por inspección, sin laboratorio.
- Plan de medición (1 sesión, unos 60 min): 1 monitor ECG del laboratorio. Configuraciones: contacto (normal, polaridad invertida, tierra abierta, tierra abierta con polaridad invertida, neutro abierto) y paciente CF (normal y tierra abierta). 10 lecturas en cada una; anotar media ± DE en el libro de cálculo.
- Ancho de pantalla (ES07): cada integrante abre en su celular, en Chrome y en vertical, https://yesviz.com/mydevice.php y anota el "viewport width" en px (NO la resolución de la ficha técnica). El valor de ES07 = el menor de los 3.

## 11. Respuestas del profesor (06/11/2026) y cambios hechos
- Solo se califica el software → se elimina la alerta de la sección 0 y no se construye el M9.
- Equipo del simulador: electrocardiógrafo Mindray BeneHeart R12 (IEC 60601-2-25). Ver el archivo 05 (datos reales y parámetros calibrados: C_L ≈ 285 pF).
- Latencia: ES03 deja de ser "clic → pantalla" y pasa a ser LATENCIA POR CONCURRENCIA (30 usuarios virtuales, percentil 95 ≤ 1 s, 0 % errores). ES08 se mantiene (≥ 5 dispositivos reales a la vez).
- Por qué es honesta: la herramienta no tiene servidor de cálculo; la concurrencia solo afecta la DESCARGA de los archivos desde el alojamiento gratuito (por ejemplo GitHub Pages). Una vez cargada, cada navegador calcula solo, así que más usuarios no la vuelven más lenta. Así se explica en la sustentación.
- Pendiente preguntar: 4 (E_n con media ± DE), 5 (capa de requerimientos) y 6 (fecha del prototipo).

## 12. Respuestas de la asesoría (12/11/2026) y cambios
- Solo computador; no se necesita servidor. ES07 se elimina y ES06 queda con Chrome y Edge en Windows (≥ 2).
- El profesor no ve la utilidad del CSV. Pidió que al terminar la práctica el software entregue una "nota" o algo al correo. ES09 pasa a ser "tiempo para generar el reporte final" (ver 02: RF11 y RNF09).
- C4 + diagrama de flujo de datos (DFD) confirmados; NO se requiere UML.
- RAM y CPU confirmadas → ES14 y ES15 nuevas.
- Seguridad: no se alcanzó a preguntar. Se adopta el mínimo (ver 07): HTTPS (lo da GitHub Pages), commits firmados en GitHub, hashes SRI en los archivos y 0 datos enviados (ES13).

## 13. Cambio de ES03 (13/11/2026)
- Se midió ES03 con `npx autocannon -c 30 -d 60` contra la página publicada (una corrida). autocannon no simula 30 personas: sus 30 conexiones piden la página **sin pausa**, y en un minuto hicieron unas 28 500 solicitudes (≈ 475 por segundo), unas 73 veces más que un curso de 30 abriendo la herramienta una vez (30 × 13 archivos = 390).
- GitHub Pages lo tomó como abuso: respondió **429 «Too Many Requests»** al 67.2 % de las solicitudes y bloqueó la red unos 5 minutos. Con esa prueba ES03 no cumplía, pero el resultado medía el límite anti-abuso de GitHub, no la experiencia de los usuarios.
- Decisión del equipo: **descartar autocannon** y medir con **30 usuarios reales simultáneos**. Cada navegador mide su tiempo de carga con Navigation Timing; la herramienta lo muestra y lo incluye en el resumen y el PDF. Meta sin cambios: p95 ≤ 1 s y 0 % de errores. Protocolo: docs/protocolo_ES03_30_usuarios.md.
