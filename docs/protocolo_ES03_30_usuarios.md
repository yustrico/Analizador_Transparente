# Protocolo ES03 — 30 usuarios reales abriendo la herramienta al mismo tiempo

Analizador transparente (versión con la medición del tiempo de carga, posterior a v1.0.0) · Yustin Rico, David Cardona y Santiago González (UAO)

**ES03:** tiempo de carga de la herramienta publicada cuando **30 personas reales** la abren al mismo tiempo. **Meta: percentil 95 (p95) ≤ 1 s (1 000 ms) y 0 % de errores.**

## 1. Qué se mide y cómo lo mide la página
Cada navegador mide su propia carga con la API estándar **Navigation Timing**: desde el **inicio de la navegación** (el Enter) hasta que termina el evento **load** (`loadEventEnd`), en milisegundos. Ese tiempo incluye la descarga de los 13 archivos desde GitHub Pages, que es lo único que cambia con muchos usuarios a la vez. Después de cargar, cada computador calcula solo.

La página lo muestra en la sección **«5. Historial y reporte»**:

> Tiempo de carga de esta página: 412 ms (Google Chrome 157 · 18/11/26, 10:00:03 a. m. · carga normal)

El mismo dato va en el texto de **«Copiar resumen»** y en el PDF, con el navegador y la fecha y hora. Nada se envía a ningún servidor: cada persona pega su resumen a mano.

**Por qué se descartó autocannon (13/11/2026):** la prueba con `autocannon -c 30 -d 60` no representaba el uso real. Sus 30 conexiones pidieron la página sin pausa, unas 28 500 veces en un minuto, 73 veces más que un curso de 30 abriendo la herramienta una vez. GitHub Pages la trató como abuso y respondió **429 «Too Many Requests»** al 67 % de las solicitudes, bloqueando la red unos 5 minutos. Ver `docs/verificacion.md` §ES03.

## 2. Preparación
| Punto | Detalle |
|---|---|
| Participantes | **30 personas** con su propio computador (Windows, Chrome o Edge). Convocar 33–35 por si alguien no llega. Cada una recibe un código **U01 … U30** (sin nombres; Ley 1581 de 2012). |
| Dónde | El mismo salón y a la misma hora (por ejemplo, al inicio de una clase). Anotar la red usada (Wi-Fi UAO, datos u otra). |
| Formulario o chat | Un Google Forms con dos preguntas (código y «pega aquí tu resumen») o un chat del curso (Teams o WhatsApp) donde cada uno pegue su resumen empezando por su código. |
| Enlace | Escrito en el tablero y enviado al chat: **https://yustrico.github.io/Analizador_Transparente/** |
| Antes de empezar | **No** correr pruebas de carga ese día desde la red de la universidad. Pedir que cierren otras pestañas y descargas pesadas. |
| Roles | 1 persona dirige la cuenta regresiva; 1 recibe los resúmenes y llena la tabla de la sección 5. |

## 3. Paso a paso (leer en voz alta)
1. «Abran una **ventana de incógnito**: Chrome: **Ctrl + Shift + N**. Edge: **Ctrl + Shift + N** (InPrivate). La ventana de incógnito no tiene caché, así que la página se descarga completa.»
2. «Copien el enlace en la barra de direcciones, **pero no presionen Enter**.»
3. Cuenta regresiva: **«3, 2, 1, ¡ya!»**. Todos presionan **Enter** al tiempo. Anotar la hora.
4. «**No recarguen la página.** Si no carga en 30 segundos o sale un error, levanten la mano y escriban en el chat su código y qué vieron (por ejemplo, “U07 no cargó, salió 429”).»
5. Para copiar el resumen (unos 2 minutos):
   1. Pestaña **2. Prueba guiada** → «Entendido, siguiente paso» 3 veces.
   2. Pestaña **3. Analizador** → **Medir**.
   3. Pestaña **5. Historial y reporte** → **Finalizar práctica** → en el nombre escriban su **código** (U01…) → **Generar reporte**.
   4. **Copiar resumen** → péguenlo en el formulario o el chat.
   - Si algo falla en estos pasos, basta con copiar a mano la línea «Tiempo de carga de esta página: … ms (…)» que aparece arriba en la pestaña 5.
6. Cerrar la ventana de incógnito.

## 4. Qué cuenta como válido y qué como error
- **Carga válida:** la página cargó, el resumen dice un número en ms y el tipo es **«carga normal»**.
- **Error:** la persona no pudo cargar la página (no abrió en 30 s, salió un error del navegador o «429 Too Many Requests», o la página quedó en blanco), o el tiempo dice «no disponible».
- **Excluida (no cuenta ni como válida ni como error):** el tipo dice «recarga» o «atrás/adelante», o la hora de la carga está a más de **10 s** de la hora de la cuenta regresiva (no fue simultánea). Se anota el motivo.

## 5. Cómo calcular los resultados

**% de errores** = (número de errores / número de participantes que intentaron cargar, sin contar los excluidos) × 100. Meta: **0 %** (un solo error ya incumple).

**Percentil 95 por el método del rango más cercano** (solo con las cargas válidas):
1. Ordena los n tiempos válidos de menor a mayor.
2. Calcula el rango **r = ⌈0.95 × n⌉** (multiplica y redondea **hacia arriba** al entero siguiente).
3. El **p95** es el tiempo que queda en la posición **r** de la lista ordenada.

| n válidos | 0.95 × n | r = ⌈0.95 × n⌉ |
|---|---|---|
| 30 | 28.5 | 29 (el penúltimo) |
| 29 | 27.55 | 28 |
| 28 | 26.6 | 27 |
| 25 | 23.75 | 24 |

**Ejemplo con n = 30:** si ordenados los tiempos terminan en …, 640, 702, **815**, 1 240 ms, el p95 es el de la posición 29, es decir **815 ms**. Eso cumple, porque 815 ms ≤ 1 000 ms. Solo la carga más lenta de las 30 queda por encima.

**En Excel o Google Sheets** (tiempos válidos en B2:B31):
- p95 (rango más cercano): `=K.ESIMO.MENOR(B2:B31; REDONDEAR.MAS(0,95*CONTAR(B2:B31); 0))`
- Media: `=PROMEDIO(B2:B31)` · Desviación estándar: `=DESVEST.M(B2:B31)` · Mediana: `=MEDIANA(B2:B31)` · Máximo: `=MAX(B2:B31)`
- No uses `PERCENTIL`: interpola entre valores y no es el método del rango más cercano.

Reportar: **p95 = … ms (n = …), % de errores = … %, media ± DE = … ± … ms, mediana y máximo**, red usada y hora. ES03 cumple si **p95 ≤ 1 000 ms y 0 % de errores**.

## 6. Tabla para llenar
Fecha: ______ Hora de la cuenta regresiva: ______ Red: ______ Lugar: ______

| # | Código | Navegador y versión | Hora de la carga | Tipo de carga | Tiempo de carga (ms) | ¿Cargó? (Sí / No) | Válida / Error / Excluida | Observaciones |
|---|---|---|---|---|---|---|---|---|
| 1 | U01 | | | | | | | |
| 2 | U02 | | | | | | | |
| 3 | U03 | | | | | | | |
| 4 | U04 | | | | | | | |
| 5 | U05 | | | | | | | |
| 6 | U06 | | | | | | | |
| 7 | U07 | | | | | | | |
| 8 | U08 | | | | | | | |
| 9 | U09 | | | | | | | |
| 10 | U10 | | | | | | | |
| 11 | U11 | | | | | | | |
| 12 | U12 | | | | | | | |
| 13 | U13 | | | | | | | |
| 14 | U14 | | | | | | | |
| 15 | U15 | | | | | | | |
| 16 | U16 | | | | | | | |
| 17 | U17 | | | | | | | |
| 18 | U18 | | | | | | | |
| 19 | U19 | | | | | | | |
| 20 | U20 | | | | | | | |
| 21 | U21 | | | | | | | |
| 22 | U22 | | | | | | | |
| 23 | U23 | | | | | | | |
| 24 | U24 | | | | | | | |
| 25 | U25 | | | | | | | |
| 26 | U26 | | | | | | | |
| 27 | U27 | | | | | | | |
| 28 | U28 | | | | | | | |
| 29 | U29 | | | | | | | |
| 30 | U30 | | | | | | | |

| Resultado | Valor |
|---|---|
| Participantes que intentaron (sin excluidos) | |
| Cargas válidas (n) | |
| Errores | |
| % de errores | |
| r = ⌈0.95 × n⌉ | |
| **p95 (ms)** | |
| Media ± DE (ms) | |
| Mediana (ms) | |
| Máximo (ms) | |
| **¿Cumple ES03?** (p95 ≤ 1 000 ms y 0 % de errores) | |

## 7. Limitaciones (para el informe)
- El tiempo depende de la red del momento (Wi-Fi del salón) y del computador de cada persona, no solo de GitHub Pages. Por eso se anota la red y la hora.
- Si todos están en la misma red, GitHub Pages ve una sola dirección de internet. 30 cargas son unas 390 solicitudes en pocos segundos, muy lejos de lo que bloqueó autocannon, pero si alguien recibe un 429 se reporta como error, sin ocultarlo.
- Navigation Timing mide la carga completa de la página en el navegador, que es lo que percibe el estudiante. Es más exigente que medir solo la primera respuesta del servidor.
