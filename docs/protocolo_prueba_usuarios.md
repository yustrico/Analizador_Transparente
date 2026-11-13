# Protocolo de prueba con usuarios — sesión del 18 de noviembre de 2026

Analizador transparente v1.0.0 · Yustin Rico, David Cardona y Santiago González (UAO)

Este protocolo mide en una sola sesión:
- **ES08**: dispositivos reales usando la herramienta al mismo tiempo sin errores (meta ≥ 5).
- **ES10**: usabilidad con el cuestionario SUS (meta: media ≥ 68, reportada como media ± DE).
- **ES11**: estudiantes que completan la prueba guiada sin ayuda (meta ≥ 80 %, es decir ≥ 4 de 5).
- De paso: **ES14/ES15** (RAM y CPU) en un PC del laboratorio y **ES06** (Chrome y Edge).

## 1. Participantes y preparación

| Punto | Detalle |
|---|---|
| Participantes | **≥ 5** estudiantes de Ingeniería Biomédica que **no** participaron en el diseño (convocar 7 para asegurar 5). Que vean o hayan visto la práctica de seguridad eléctrica. |
| Equipos | Un computador por estudiante (propio o del laboratorio) con Chrome o Edge en Windows. Si es posible, al menos uno con Chrome y uno con Edge. |
| Lugar y tiempo | Salón o laboratorio, unos **45 minutos**. |
| Roles | 1 **facilitador** (lee las instrucciones; no ayuda), 1–2 **observadores** (anotan en la hoja de tareas), 1 encargado de la hoja de dispositivos y de ES14/ES15. |
| Materiales | Este documento impreso: una hoja de tareas y una hoja SUS por estudiante, y una hoja de dispositivos. Cronómetro. La dirección escrita en el tablero: **https://yustrico.github.io/Analizador_Transparente/** |
| Antes de la sesión | Abrir la página en un PC del laboratorio y confirmar que carga. **No** correr pruebas de carga (autocannon) desde la red de la universidad ese día: GitHub Pages podría limitar temporalmente a toda la red (error 429). |

**Datos personales (Ley 1581 de 2012):** no se anotan nombres. Cada estudiante recibe un código (E1, E2, …). La participación es voluntaria y se puede retirar en cualquier momento. Para la herramienta, el nombre del reporte es opcional: pedir que escriban su código, no su nombre.

**Guion de bienvenida (leer en voz alta):**
> «Gracias por participar. Vamos a evaluar la herramienta, no a ustedes: si algo no sale, es un problema de la herramienta. Trabajen solos y en silencio. No podemos ayudarles durante las tareas; si se quedan bloqueados más de 3 minutos en una tarea, levanten la mano y la anotamos como “no completada sin ayuda”. Al final llenan un cuestionario corto. Nada de lo que hagan sale de su computador.»

## 2. Inicio simultáneo (ES08)
1. Todos con el navegador abierto y la dirección escrita, **sin presionar Enter**.
2. El facilitador cuenta «3, 2, 1, ya» y todos abren la página al mismo tiempo. Anotar la hora de inicio.
3. Todos hacen las tareas de la sección 3 al mismo tiempo; la herramienta queda en uso simultáneo durante toda la sesión.
4. El encargado llena la **hoja de dispositivos** (sección 5) mientras tanto.

Un dispositivo cuenta **«sin errores»** si: la página cargó, pudo medir al menos una vez, generó y descargó el reporte PDF, y no apareció ningún mensaje de error (recuadro rojo) ni la página dejó de responder.

## 3. Tareas (ES11)
El facilitador lee cada tarea una por una. El observador anota para cada estudiante: **✔ sin ayuda**, **A con ayuda** (se le dio una pista o pidió ayuda) o **✘ no completada**, y el tiempo aproximado.

| # | Tarea (leer tal cual) | Se cumple si… | Obligatoria para ES11 |
|---|---|---|---|
| T1 | «Averigua qué tipo de parte aplicada tiene el electrocardiógrafo y cuál es su límite de corriente de paciente en condición normal.» | Dice «CF» y «10 µA». | No (observación) |
| T2 | «Haz la prueba guiada completa, en orden, hasta llegar a las corrientes de fuga.» | Llega al paso 4 de 4 y se habilita el Analizador. | **Sí** |
| T3 | «Mide la corriente de contacto en condición normal y después con la tierra abierta. ¿Cuánto da cada una y cumplen?» | Dice ≈ 0.00 µA y ≈ 14.73 µA, y que ambas cumplen. | **Sí** |
| T4 | «Usa el circuito para explicar por qué la lectura cambió tanto al abrir la tierra.» | Explica que sin tierra la corriente pasa por la persona (MD). | No (observación) |
| T5 | «Mide la corriente de paciente CF con el neutro abierto. ¿Qué límite aplica y por qué ese y no el de 10 µA?» | Dice 50 µA porque es primer defecto. | **Sí** |
| T6 | «Intenta abrir la tierra y el neutro al mismo tiempo. ¿Qué pasa y por qué?» | Nota que no se permite y menciona la doble falla. | No (observación) |
| T7 | «En Comparar, mira dos lecturas. ¿La diferencia puede ser del instrumento?» | Usa el margen de incertidumbre para responder. | No (observación) |
| T8 | «Termina la práctica, descarga tu reporte en PDF y copia el resumen.» | El PDF queda en Descargas y aparece «Resumen copiado». | **Sí** |

**Criterio de ES11:** un estudiante «completa la prueba guiada sin ayuda» si hace **T2, T3, T5 y T8 con ✔** (sin ayuda). Las tareas de observación (T1, T4, T6, T7) no cuentan para la meta, pero sus resultados se reportan porque muestran si la herramienta deja de ser una «caja negra».

**ES11 = (estudiantes con T2, T3, T5 y T8 sin ayuda) / (estudiantes que participaron) × 100 %.** Meta ≥ 80 %.

### Hoja de tareas (una por estudiante)

Código: ______  Navegador: ______  Hora de inicio: ______

| Tarea | ✔ / A / ✘ | Tiempo (min) | Observaciones (dónde dudó, qué dijo) |
|---|---|---|---|
| T1 | | | |
| T2 | | | |
| T3 | | | |
| T4 | | | |
| T5 | | | |
| T6 | | | |
| T7 | | | |
| T8 | | | |

¿Completó T2, T3, T5 y T8 sin ayuda? ☐ Sí ☐ No

## 4. Cuestionario SUS (ES10)
Se entrega **al terminar las tareas** y **antes** de cualquier comentario del equipo. Responder rápido, con la primera impresión. Marcar **todas** las preguntas.

Código: ______

Escala: **1 = Totalmente en desacuerdo · 2 = En desacuerdo · 3 = Ni de acuerdo ni en desacuerdo · 4 = De acuerdo · 5 = Totalmente de acuerdo**

| # | Afirmación | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|---|
| 1 | Creo que me gustaría usar esta herramienta con frecuencia. | ☐ | ☐ | ☐ | ☐ | ☐ |
| 2 | Encontré la herramienta innecesariamente compleja. | ☐ | ☐ | ☐ | ☐ | ☐ |
| 3 | Pensé que la herramienta era fácil de usar. | ☐ | ☐ | ☐ | ☐ | ☐ |
| 4 | Creo que necesitaría el apoyo de una persona experta para poder usar esta herramienta. | ☐ | ☐ | ☐ | ☐ | ☐ |
| 5 | Encontré que las distintas funciones de la herramienta estaban bien integradas. | ☐ | ☐ | ☐ | ☐ | ☐ |
| 6 | Pensé que había demasiada inconsistencia en la herramienta. | ☐ | ☐ | ☐ | ☐ | ☐ |
| 7 | Imagino que la mayoría de las personas aprendería a usar esta herramienta muy rápidamente. | ☐ | ☐ | ☐ | ☐ | ☐ |
| 8 | Encontré la herramienta muy engorrosa de usar. | ☐ | ☐ | ☐ | ☐ | ☐ |
| 9 | Me sentí muy seguro(a) usando la herramienta. | ☐ | ☐ | ☐ | ☐ | ☐ |
| 10 | Necesité aprender muchas cosas antes de poder empezar a usar esta herramienta. | ☐ | ☐ | ☐ | ☐ | ☐ |

(Cuestionario SUS de Brooke, 1996, en traducción al español con «sistema» cambiado por «herramienta».)

### Cómo calcular el puntaje SUS
Para **cada estudiante**:
1. **Preguntas impares** (1, 3, 5, 7, 9): aporte = respuesta − 1.
2. **Preguntas pares** (2, 4, 6, 8, 10): aporte = 5 − respuesta.
3. Suma los 10 aportes (da entre 0 y 40).
4. **Puntaje SUS = suma × 2.5** (da entre 0 y 100).
5. Si una pregunta quedó en blanco, se le asigna 3 (neutral) y se anota en el informe.

**Ejemplo:** respuestas 4, 2, 5, 1, 4, 2, 4, 1, 4, 2.
Impares: (4−1) + (5−1) + (4−1) + (4−1) + (4−1) = 3 + 4 + 3 + 3 + 3 = 16.
Pares: (5−2) + (5−1) + (5−2) + (5−1) + (5−2) = 3 + 4 + 3 + 4 + 3 = 17.
Suma = 33 → **SUS = 33 × 2.5 = 82.5**.

Para **el grupo** (ES10), con n estudiantes y puntajes x₁ … xₙ:
- **Media** = (x₁ + … + xₙ) / n.
- **Desviación estándar (muestral)** DE = √( Σ (xᵢ − media)² / (n − 1) ).
- Se reporta **media ± DE (n = …)**. Meta: **media ≥ 68**.
- En Excel o Google Sheets: `=PROMEDIO(B2:B8)` y `=DESVEST.M(B2:B8)`.

| Código | P1 | P2 | P3 | P4 | P5 | P6 | P7 | P8 | P9 | P10 | Suma de aportes | SUS (× 2.5) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| E1 | | | | | | | | | | | | |
| E2 | | | | | | | | | | | | |
| E3 | | | | | | | | | | | | |
| E4 | | | | | | | | | | | | |
| E5 | | | | | | | | | | | | |
| E6 | | | | | | | | | | | | |
| E7 | | | | | | | | | | | | |
| | | | | | | | | | | | **Media ± DE** | |

## 5. Hoja de dispositivos (ES08)
Hora de apertura simultánea: ______

Para la versión del navegador: Menú (⋮ o …) → Ayuda → Acerca de Google Chrome / Acerca de Microsoft Edge.

| Código | Dispositivo (propio / PC laboratorio, marca) | Sistema operativo | Navegador y versión | Red (Wi-Fi UAO, datos, otra) | ¿Cargó? | ¿Midió? | ¿Descargó el PDF? | ¿Algún error? (describir) | ¿Sin errores? (Sí/No) |
|---|---|---|---|---|---|---|---|---|---|
| E1 | | | | | | | | | |
| E2 | | | | | | | | | |
| E3 | | | | | | | | | |
| E4 | | | | | | | | | |
| E5 | | | | | | | | | |
| E6 | | | | | | | | | |
| E7 | | | | | | | | | |

**ES08 = número de dispositivos con «Sin errores: Sí»** que usaron la herramienta al mismo tiempo. Meta ≥ 5.

## 6. RAM y CPU en un PC del laboratorio (ES14 y ES15)
En **un** PC del laboratorio, mientras ese estudiante hace las tareas:
1. En Chrome, presiona **Shift + Esc** (Administrador de tareas de Chrome). Deja visibles las columnas «Huella de memoria» y «CPU».
2. Cada **10 s** anota la CPU y la memoria de la pestaña «Analizador transparente».
3. **ES14** = el valor **máximo** de memoria (meta ≤ 300 MB). **ES15** = el **promedio** de las lecturas de CPU (meta ≤ 20 %).

| Tiempo (s) | 0 | 10 | 20 | 30 | 40 | 50 | 60 | 70 | 80 | 90 | … |
|---|---|---|---|---|---|---|---|---|---|---|---|
| CPU (%) | | | | | | | | | | | |
| Memoria (MB) | | | | | | | | | | | |

## 7. Al terminar
1. Agradecer. Recoger hojas.
2. Pasar los datos a `docs/verificacion.md` (ES08, ES10, ES11 y, si se midieron, ES14 y ES15) y a la hoja de cálculo del proyecto.
3. Anotar los problemas observados (dónde dudaron, qué no entendieron) como mejoras para una versión siguiente; **no** cambiar la herramienta antes de la entrega del 20/11 salvo errores graves.
