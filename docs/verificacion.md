# Verificación de especificaciones ES01–ES15

Analizador transparente **v1.0.0** · Medido el 13 de noviembre de 2026 · Versión publicada: https://yustrico.github.io/Analizador_Transparente/ (commit `70291f2`, idéntico al publicado)

Equipo de medición: PC con Windows 11 (16 núcleos lógicos), Chrome 157.0.8103.51, Edge 157.0.4341.57, Node.js 26.13.1. Las especificaciones y metas vienen de `docs/03_Especificaciones_v2.md` (ES07 fue eliminada el 12/11/2026).

## Resumen

| ID | Especificación | Meta | Cómo se mide | Valor medido | ¿Cumple? |
|---|---|---|---|---|---|
| ES01 | Error del cálculo frente a la referencia | ≤ 1 % en cada caso | `npm test` (`tests/motor_calculo.test.js`): I y U de las 12 configuraciones frente a la tabla de referencia de CLAUDE.md §5 | Error máximo **0.41 %** (12 de 12 ≤ 1 %) | ✅ Sí |
| ES02 | Concordancia con el ESA620, E_n | \|E_n\| ≤ 1 en cada configuración | `npm test` (`tests/es02_validacion.test.js`): E_n = \|I_modelo − media\| / U_med con las mediciones reales del R12 (n = 3 por configuración) | E_n máximo **0.186** (12 de 12 ≤ 1) | ✅ Sí |
| ES03 | Tiempo de carga con 30 usuarios reales simultáneos | p95 ≤ 1 s y 0 % de errores | 30 personas abren la página a la vez en incógnito; cada navegador mide su carga con Navigation Timing y la pega en su resumen (`docs/protocolo_ES03_30_usuarios.md`) | Pendiente: prueba con 30 usuarios reales | Pendiente (ver §ES03) |
| ES04 | Tiempo de carga (LCP) | ≤ 2.5 s | Lighthouse 12.8.2, perfil escritorio, 5 corridas contra la URL publicada, mediana | Mediana **0.288 s** (5 de 5 corridas entre 0.286 y 0.296 s) | ✅ Sí |
| ES05 | Peso descargado en la primera carga | ≤ 1 600 KiB | `npm run peso` (archivos en disco) y pestaña Red / CDP sin caché en la URL publicada | **62.0 KiB** transferidos (comprimidos por GitHub Pages); 188.1 KiB sin comprimir, 13 archivos | ✅ Sí |
| ES06 | Navegadores sin errores | ≥ 2 (Chrome y Edge en Windows) | Práctica completa automatizada en cada navegador contra la URL publicada (ver §ES06) | **2 de 2**: Chrome 157 y Edge 157, 0 errores de consola | ✅ Sí |
| ES08 | Dispositivos reales a la vez sin errores | ≥ 5 | Sesión con estudiantes (`docs/protocolo_prueba_usuarios.md` §5) | Pendiente: sesión con estudiantes 18/11 | Pendiente |
| ES09 | Tiempo para generar el reporte | ≤ 3 s (máximo de 10 generaciones) | Medición en pantalla (clic en «Generar reporte» → reporte dibujado) 10 veces con 36 lecturas, en Chrome y Edge; creación del PDF 10 veces en Node | Máximo **37 ms** (Edge); PDF máximo **29 ms** | ✅ Sí |
| ES10 | Usabilidad (SUS) | Media ≥ 68 (media ± DE) | Cuestionario SUS, n ≥ 5 (`docs/protocolo_prueba_usuarios.md` §4) | Pendiente: sesión con estudiantes 18/11 | Pendiente |
| ES11 | Completan la prueba guiada sin ayuda | ≥ 80 % (≥ 4 de 5) | Tareas observadas (`docs/protocolo_prueba_usuarios.md` §3) | Pendiente: sesión con estudiantes 18/11 | Pendiente |
| ES12 | Costo de licencias por usuario | 0 COP | Lista de dependencias y licencias | **0 COP**: 0 dependencias; código propio con licencia MIT | ✅ Sí |
| ES13 | Peticiones que envían datos a un servidor | 0 | Registro de todas las peticiones de red (CDP) durante una práctica completa en la URL publicada | **0** peticiones a otros sitios; solo descargas (GET) de los 13 archivos propios | ✅ Sí |
| ES14 | RAM de la pestaña | Máximo ≤ 300 MB | Memoria del proceso de la pestaña al final de una práctica completa (Chrome y Edge, sin ventana) | Máximo **46 MB** de memoria privada (91 MB de conjunto de trabajo) | ✅ Sí (preliminar; confirmar 18/11) |
| ES15 | CPU de la pestaña | Promedio ≤ 20 % | Tiempo de CPU del proceso de la pestaña: 60 s con el circuito animado y actividad, y 30 s en reposo | **10.0 %** de un núcleo animando; **0.0 %** en reposo | ✅ Sí (preliminar; confirmar 18/11) |

**Estado:** 10 cumplen (2 de ellas preliminares) y 4 quedan pendientes: ES03 (prueba con 30 usuarios reales) y ES08, ES10 y ES11 (sesión con estudiantes del 18/11).

## Detalle de cada medición

### ES01 — Error del cálculo
- Comando: `npm test` (75 pruebas en verde).
- Se comparan la corriente I y la incertidumbre U de las 12 configuraciones (contacto y paciente CF × 6 condiciones) con la tabla de referencia de CLAUDE.md §5.
- Error relativo máximo: 0.41 %. Meta ≤ 1 %.
- Nota: docs/03 menciona LTspice como referencia; el equipo acordó usar la tabla de CLAUDE.md §5 (13/11/2026).

### ES02 — Concordancia con el ESA620
U_med = 2·√((s/√3)² + ((0.01·media + 1 µA)/√3)²), mediciones del R12 serie FN-84011415 con el ESA620 (n = 3 por configuración; docs/03 planeaba n = 10).

| Medición | Polaridad | Tierra | Neutro | Modelo (µA) | Medido (µA) | U_med (µA) | E_n |
|---|---|---|---|---|---|---|---|
| Contacto | normal | cerrada | cerrado | 0.000 | 0.12 ± 0.03 | 1.16 | 0.104 |
| Contacto | invertida | cerrada | cerrado | 0.000 | 0.12 ± 0.03 | 1.16 | 0.104 |
| Contacto | normal | abierta | cerrado | 14.734 | 14.47 ± 0.45 | 1.42 | **0.186** |
| Contacto | invertida | abierta | cerrado | 14.734 | 14.97 ± 0.06 | 1.33 | 0.177 |
| Contacto | normal | cerrada | abierto | 0.000 | 0.10 ± 0.00 | 1.16 | 0.086 |
| Contacto | invertida | cerrada | abierto | 0.000 | 0.10 ± 0.00 | 1.16 | 0.086 |
| Paciente CF | normal | cerrada | cerrado | 1.267 | 1.27 ± 0.21 | 1.19 | 0.003 |
| Paciente CF | invertida | cerrada | cerrado | 1.267 | 1.20 ± 0.10 | 1.17 | 0.057 |
| Paciente CF | normal | abierta | cerrado | 2.097 | 2.10 ± 0.10 | 1.18 | 0.003 |
| Paciente CF | invertida | abierta | cerrado | 2.097 | 2.13 ± 0.15 | 1.19 | 0.028 |
| Paciente CF | normal | cerrada | abierto | 1.267 | 1.20 ± 0.10 | 1.17 | 0.057 |
| Paciente CF | invertida | cerrada | abierto | 1.267 | 1.07 ± 0.12 | 1.18 | 0.167 |

Nota honesta (docs/03 §6): C_L, C_N, C_AP y el término de 0.83 µA se ajustaron con estas mismas mediciones, así que ES02 muestra que el simulador calibrado reproduce lo que el estudiante verá en el laboratorio; no es una predicción independiente.

### ES03 — Tiempo de carga con 30 usuarios reales
**Método actual (desde el 13/11/2026):** 30 personas reales abren la página publicada al mismo tiempo en una ventana de incógnito. La herramienta mide en cada navegador el tiempo de carga con Navigation Timing (inicio de la navegación → `loadEventEnd`), lo muestra en «Historial y reporte» («Tiempo de carga de esta página: X ms») y lo incluye, con el navegador y la fecha y hora, en el PDF y en «Copiar resumen». p95 por el método del rango más cercano y % de errores (quien no pudo cargar la página). Protocolo y tabla de 30 filas: `docs/protocolo_ES03_30_usuarios.md`. **Resultado: pendiente.**

Comprobación de la medición (13/11/2026, perfil nuevo sin caché, con CSP): Chrome 157 mostró 138 ms y Edge 157 85 ms en localhost, exactamente iguales a Navigation Timing leído directamente; una recarga se marca como «recarga».

**Prueba descartada: autocannon.** Se deja documentada con honestidad: no representaba el uso real y GitHub Pages la bloqueó (429).
- Comando: `npx autocannon@8 -c 30 -d 60 --json https://yustrico.github.io/Analizador_Transparente/` (una sola corrida, 13/11/2026 ≈ 14:20 hora Colombia, desde una red residencial en Cali).
- Resultado: 28 509 solicitudes en 60.3 s (≈ 475 por segundo); **9 355 respuestas 200** y **19 154 respuestas 429 «Too Many Requests»** (67.2 % de errores); 0 errores de conexión y 0 tiempos agotados.
- Latencia (todas las respuestas): media 9.08 ± 8.91 s; p50 7.13 s; p90 22.8 s; p97.5 25.6 s; p99 26.1 s; mínimo 13 ms. autocannon no reporta p95, que está entre p90 y p97.5.
- **Por qué se descartó:** autocannon no simula 30 estudiantes; abre 30 conexiones que piden la página **sin pausa**, una detrás de otra. Eso generó unas 28 500 solicitudes en un minuto. Un curso de 30 estudiantes que abre la herramienta hace unas 30 × 13 = 390 solicitudes en total, 73 veces menos. GitHub Pages detecta la ráfaga como abuso y responde 429 a esa red. El bloqueo duró unos 5 minutos después de la prueba (de ≈ 14:24 a 14:29): durante ese tiempo la página tampoco abría desde esa red (otros sitios de github.io sí).
- **Decisión del equipo (13/11/2026):** no repetir autocannon y medir ES03 con 30 usuarios reales (método actual, arriba). Con autocannon la prueba medía el límite anti-abuso de GitHub Pages, no la experiencia de los estudiantes. Tampoco se debe correr autocannon desde la red de la universidad: GitHub podría bloquear a toda la red.
- Una vez cargada, la herramienta no vuelve a usar la red: cada navegador calcula solo, así que la concurrencia solo afecta la descarga inicial (docs/03 §11).

### ES04 — Tiempo de carga (LCP)
- Comando (5 veces): `npx lighthouse@12 https://yustrico.github.io/Analizador_Transparente/ --preset=desktop --only-categories=performance` con Chrome 157 sin ventana. Es el perfil de escritorio de Lighthouse 12.8.2: pantalla de 1350 × 940, red simulada con 40 ms de RTT y 10 Mbit/s, CPU sin ralentizar.

| Corrida | LCP (ms) | FCP (ms) | TBT (ms) | CLS | Puntaje de rendimiento | Peso (KiB) |
|---|---|---|---|---|---|---|
| 1 | 296 | 256 | 0 | 0.001 | 100 | 61.8 |
| 2 | 294 | 264 | 0 | 0.001 | 100 | 61.8 |
| 3 | 288 | 259 | 0 | 0.001 | 100 | 61.8 |
| 4 | 286 | 257 | 0 | 0.001 | 100 | 61.8 |
| 5 | 287 | 253 | 0 | 0.001 | 100 | 61.8 |

- **Mediana del LCP: 288 ms = 0.288 s** (meta ≤ 2.5 s). El elemento LCP es un párrafo de texto: no hay imágenes ni fuentes externas que esperar.
- Lighthouse también confirma ES05: 61.8 KiB de «network payload».

### ES05 — Peso descargado
- `npm run peso`: 13 archivos, 188.1 KiB sin comprimir (index.html 15.7 KiB, CSS 11.5 KiB, 11 módulos JS 158.2 KiB, JSON 1.2 KiB).
- URL publicada sin caché (Chrome y Edge): 63 499 B = **62.0 KiB** transferidos, porque GitHub Pages los envía comprimidos.
- Sin librerías, fuentes ni imágenes externas.

### ES06 — Navegadores
Casos de prueba ejecutados en cada navegador contra la URL publicada (script automatizado con clics reales). Son los 8 casos de docs/03 más las 4 configuraciones con polaridad invertida:
1. Carga con CSP y SRI activos (11 huellas verificadas) y datos del JSON.
2. Prueba guiada de 4 pasos en orden; el Analizador se habilita en el paso 4.
3. Las 12 configuraciones de medición (contacto y paciente CF × 6 condiciones), con su lectura y su veredicto.
4. Bloqueo de la doble falla (tierra y neutro abiertos).
5. Comparar: 12 filas y 12 barras.
6. Reporte en pantalla con un nombre que contiene HTML (se muestra como texto).
7. Descarga del PDF (`reporte_seguridad_electrica_2026-11-13.pdf`, empieza con `%PDF-1.4`).
8. «Copiar resumen» (el portapapeles contiene el resumen).

Resultado: Chrome 157.0.8103.51 y Edge 157.0.4341.57 con 0 errores ni avisos en la consola. El PDF descargado se abrió y revisó visualmente en el visor de ambos navegadores: 2 páginas, con el encabezado de la tabla repetido y tildes, ñ, µ, ± y √ correctos.

### ES09 — Generación del reporte
- En pantalla, con 36 lecturas y 10 generaciones (localhost, el mismo código publicado). En Chrome: 33, 14, 15, 10, 14, 12, 18, 13, 12, 16 ms (media 15.7 ± 6.5 ms). En Edge: 37, 12, 13, 11, 12, 9, 14, 10, 4, 13 ms (media 13.5 ± 8.7 ms). **Máximo 37 ms.**
- La página muestra en pantalla el tiempo de cada generación («Reporte generado en … ms»).
- Archivo PDF con 36 lecturas, 10 veces en Node: 6.1 a 29.0 ms (máximo 29 ms). La descarga completa (clic → archivo en Descargas) tomó unos 0.3 s.

### ES12 — Licencias
- `package.json` no tiene `dependencies` ni `devDependencies`. El navegador solo carga archivos propios.
- Licencia del proyecto: MIT (`LICENSE`).
- Para medir se usaron autocannon (MIT) y Lighthouse (Apache-2.0) con `npx`, sin instalarlos en el proyecto. Ambos son gratuitos.

### ES13 — Datos enviados
- Se registraron todas las peticiones de red (Chrome DevTools Protocol) durante una práctica completa en la URL publicada: carga, 12 mediciones, Comparar, reporte, PDF, copiar resumen y recarga.
- Resultado: 13 peticiones GET a `yustrico.github.io/Analizador_Transparente/` y **0 a cualquier otro sitio**. No hay POST, analítica, fuentes ni CDN.
- El PDF se crea en el navegador (Blob) y el resumen va al portapapeles local.
- La CSP (`connect-src 'self'`) impide enviar datos a otros sitios aunque se intentara.

### ES14 y ES15 — RAM y CPU (preliminar)
- Medición automatizada en Chrome y Edge sin ventana (`--headless=new`), con el movimiento activado (el peor caso), una práctica completa (12 mediciones y reporte) y el Analizador animado.
- **RAM (ES14):** proceso de la pestaña con 37.0 MB (Chrome) y 46.1 MB (Edge) de memoria privada, y 90.6 MB de conjunto de trabajo como máximo. La memoria de JavaScript es 1.1 MB.
- **CPU (ES15):**
  - Durante 60 s con la animación activa y el mouse en movimiento: 10.0 % (Chrome) y 9.9 % (Edge) de un núcleo.
  - En reposo (30 s sin actividad, la animación se detiene sola): 0.0 %.
  - El navegador completo sumó unos 42–45 % de un núcleo, es decir 2.6–2.8 % del equipo. En modo sin ventana el dibujo lo hace el procesador en vez de la tarjeta gráfica, así que ese total sale más alto que en uso normal.
- **Por qué es preliminar:** docs/03 pide el Administrador de tareas de Chrome (Shift + Esc) en un PC del laboratorio, con lecturas cada 10 s. Eso queda para el 18/11 (`docs/protocolo_prueba_usuarios.md` §6).

## Cómo repetir las mediciones
| ES | Comando o procedimiento |
|---|---|
| ES01, ES02 | `npm test` |
| ES03 | `docs/protocolo_ES03_30_usuarios.md` (30 usuarios reales; no usar autocannon) |
| ES04 | `npx lighthouse https://yustrico.github.io/Analizador_Transparente/ --preset=desktop --only-categories=performance` × 5; tomar la mediana del LCP |
| ES05 | `npm run peso`; o F12 → Red → «Desactivar caché» → recargar → el total «transferido» |
| ES06, ES13 | F12 → Consola (sin errores) y Red (solo archivos de yustrico.github.io) durante una práctica completa en Chrome y en Edge |
| ES09 | Generar el reporte 10 veces y leer «Reporte generado en … ms» |
| ES08, ES10, ES11, ES14, ES15 | `docs/protocolo_prueba_usuarios.md` |
