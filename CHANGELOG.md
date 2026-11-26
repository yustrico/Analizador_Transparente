# Registro de cambios

Todos los cambios importantes del proyecto se anotan aquí.
Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y versiones según [SemVer](https://semver.org/lang/es/).

## [Sin publicar]

### Agregado (25/11/2026, corrección del profesor: conexiones físicas; sin cambios en cálculos ni resultados)
- Tarjeta «Conexiones en el laboratorio» en el Analizador, debajo del circuito: dibujo SVG del frente del ESA620 (10 bornes de ECG, jacks 2 WIRE V/Ω/A, Ø/NULL, pantalla con las teclas de la prueba, POLARITY/NEUTRAL/EARTH y tomacorriente de prueba) y del R12 (entrada de poder, borne equipotencial y conector del cable de paciente CF), con los 10 latiguillos en sus colores IEC. Cambia con la medición (contacto, paciente CF, fuga a tierra) y trae la lista de pasos.
- Prueba guiada: el paso 2 (resistencia de tierra) y el paso 3 (aislamiento) muestran su dibujo de conexiones debajo del resultado.
- M6: datos puros `CONEXIONES_LABORATORIO` y `obtenerConexiones(clave)` + `dibujarConexiones(svg, clave)`; pruebas nuevas en tests/conexiones.test.js. Datos tomados de docs/11_Conexiones_laboratorio.md (montaje del 23/11/2026).
- Se quita el plegable de texto «¿Cómo se conecta en el laboratorio?» del Analizador.

### Cambiado (17/11/2026, ronda 15: recuadro del ESA620; sin cambios en cálculos ni pruebas)
- Recuadro «Dentro del Fluke ESA620»: borde punteado y título en naranja oscuro (#A8561A, contraste ≥ 4.5:1 sobre fondo blanco) y relleno suave del mismo tono (opacidad 0.07) detrás del dibujo; el camino rojo de la corriente queda encima.
- El borde izquierdo queda a la derecha del círculo de la red (la red es el tomacorriente de la pared, fuera del analizador) y a 18 px del chasis del R12, sin tocar textos. Para lograrlo se corrió el interruptor de neutro a la derecha, se bajó la tierra de la instalación 16 px y el dibujo pasa a 860 × 396.

### Cambiado (17/11/2026, ronda 14: dibujo y textos del Analizador; sin cambios en cálculos, resultados ni pruebas del núcleo)
- Circuito SVG: recuadro punteado «Dentro del Fluke ESA620» que encierra el conmutador de polaridad, el interruptor del neutro, el interruptor de la tierra y la MD; el R12 (chasis, C_L, C_N, C_AP y parte aplicada) queda por fuera. Se movieron un poco los textos de la red y el interruptor de tierra para que nada se encime.
- MD en «¿Qué es cada parte?» y en el dibujo: carga interna del ESA620 (1 kΩ en paralelo con 10 kΩ y 0,015 µF), que el analizador usa por dentro; aquí se simplifica como 1 kΩ.
- Bloque cerrado «¿Cómo se conecta en el laboratorio?» debajo del circuito, con los 4 pasos de conexión del R12 al ESA620; el mismo texto en ayuda.html y en docs/manual_usuario.md.
- docs/03 (ES11) y docs/08 (limitaciones): ES11 mide el uso del simulador sin ayuda, no la habilidad de conectar el ESA620 al R12.

### Cambiado (17/11/2026, documentos; sin cambios en la página, el código ni los datos)
- docs/Diagramas: quedan solo las versiones _v2 (C4 N1, N2 y N3, DFD nivel 0 y nivel 1, flujo de control y ciclo de vida); se borran las versiones viejas. Referencias actualizadas en docs/08, README y CLAUDE.md.
- docs/08 al estado real del código: M10a Generador PDF y M11 Tiempo de carga en la jerarquía y las fichas; historial y avance de la prueba en sessionStorage; tabla de correspondencia con la guía del Corte 3 (punto 9.3); interacciones M10 → M10a, M10a → archivo PDF, M8 ↔ sessionStorage y M11 → M10; registro de fallas (guía punto 11); teórico vs. real (E_n de las 16 configuraciones, factor k_N, limitación de n = 3) y trabajo futuro; seguridad con las 7 medidas, el riesgo que cubre cada una y el riesgo residual. Se corrige SRI SHA-256 → SHA-384.

### Cambiado (17/11/2026, ronda 12: textos, sin cambios en cálculos)
- Explicación de la incertidumbre (Comparar, reporte en pantalla y PDF): texto nuevo con un ejemplo de 14.73 µA en lista numerada (1 % + 1 µA → ÷ √3 → × 2), cada operación en su propio renglón. Los números quedan unidos a su unidad con un espacio sin corte, para que «1» y «%» no queden en renglones distintos.
- PDF: nuevos `listaNumerada` y `seccionSinPartir` en el generador; la sección «¿Cómo se lee la incertidumbre?» nunca se parte entre páginas (prueba nueva en tests/pdf.test.js, 124 pruebas en verde).
- Ayuda y manual: «¿Qué necesitas?» y «¿Cómo se abre?» quedan en una sola sección «¿Qué necesitas?» (con la dirección de la página); las secciones siguientes se renumeran (7 en total).

### Cambiado (17/11/2026, ronda 11: presentación, sin cambios en resultados ni cálculos)
- Nota de la fuga a tierra (Analizador, tabla de la sección Equipo, ayuda y manual): «El límite de fuga a tierra es del equipo completo: no depende del tipo de parte aplicada (B, BF o CF).» y, en letra pequeña, la nota sobre los límites del manual del R12 (0.5 mA y 1 mA, edición anterior de la norma).
- «¿Por qué da este valor?»: en todas las mediciones y condiciones, párrafo explicativo, fórmula sola y centrada con subíndices (I = V · 2π · f · …) y frase del límite («Es un primer defecto, por eso el límite es …»), armada con el límite del resultado.
- Subíndices (C<sub>L</sub>, C<sub>N</sub>, C<sub>AP</sub>, k<sub>N</sub>, X<sub>C</sub>, C<sub>eq</sub>…) en la lista «Fórmula usada», en «¿Qué es cada parte?», en el circuito SVG (tspan) y en la ayuda; sin guiones bajos visibles. Se escriben con nodos de texto y `<sub>`, nunca con innerHTML.

### Cambiado (14/11/2026, décima ronda: «¿Por qué da este valor?», sin cambios en resultados)
- La fórmula se muestra en dos pasos con la ley de Ohm en un capacitor: X_C = 1/(2π·f·C) y luego I = V / X_C, con una primera línea «Fórmula: ley de Ohm en un capacitor…». Ya no aparece «A/F» en pantalla (la constante V·2πf sigue en el motor de cálculo). Con neutro abierto la fuga a tierra usa la capacitancia equivalente C_eq = C_L + k_N·C_N = 599.9 pF; la corriente de contacto con neutro abierto usa C_total = C_L + C_N.
- Cada parámetro calibrado (C_L, C_N, C_AP, ΔI y k_N) explica de qué medición del R12 sale y cómo se calculó.
- Ayuda y manual, «¿De dónde salen los datos?»: frase sobre la calibración con polaridad normal y la comprobación con polaridad invertida (E_n ≤ 0,19).

### Cambiado (14/11/2026, novena ronda: textos, sin cambios en cálculos)
- Subtítulo del encabezado: «Pruebas de seguridad eléctrica al electrocardiógrafo Mindray BeneHeart R12» (sin «(IEC 60601-1)»). Plural también en la descripción de la página, la introducción de la prueba guiada, la ayuda, el manual y el README.
- Ayuda y manual (iguales): títulos en forma de pregunta («1. ¿Qué es y para qué sirve?», «2. ¿Qué necesitas?», «3. ¿Cómo se abre?», «4. ¿Cómo se hace la práctica, paso a paso?», «5. ¿Qué pasa con tus datos?», «6. ¿Cómo se leen los números?», «7. ¿De dónde salen los datos?», «8. ¿Qué hago si algo no funciona?»); «simula las pruebas»; texto nuevo sobre el uso en celular; «No se pueden saltar pasos».
- `tests/version.test.js`: la versión de la ayuda, el manual y el README debe ser la de package.json. 123 pruebas en verde.

### Cambiado (14/11/2026, octava ronda: textos y PDF, sin cambios en cálculos)
- Ficha del equipo: «Clase: Clase I (protección contra choque eléctrico)» en un renglón; Normas con IEC 60601-1, IEC 60601-2-25 e IEC 62353, una por renglón (IEC 62353 se agrega al JSON como `equipo.norma_pruebas_periodicas` y M3 la valida). El bloque plegable se llama «¿Qué significa cada dato?»: Clase I, Tipo CF, A prueba de desfibrilación, IEC 60601-1, IEC 60601-2-25 e IEC 62353.
- Reporte (pantalla y PDF): título «Reporte de práctica: pruebas de seguridad eléctrica»; Normas con las tres normas, una por renglón; sin la fila «Más cerca del límite» (sigue en «Copiar resumen»); «¿Cómo se lee la incertidumbre?».
- PDF: la nota «Una corriente pequeña puede estar más cerca de su límite…» nunca queda partida entre dos páginas: si no cabe completa, pasa entera a la siguiente (`parrafoSinPartir` en pdf.js, con prueba). 122 pruebas en verde.

### Cambiado (14/11/2026, séptima ronda: textos, sin cambios en cálculos)
- Ficha del equipo: «Clase (protección eléctrica): Clase I»; una sola fila «Parte aplicada: Tipo CF a prueba de desfibrilación (electrodos de ECG y cable de paciente)»; Normas solo con «IEC 60601-1» e «IEC 60601-2-25». Debajo, el bloque cerrado «¿Qué dicen estas normas?» (IEC 60601-1, IEC 60601-2-25, IEC 62353 y Clase I, que no es la clase de riesgo del Decreto 4725).
- Se quita de la ficha «Fuente de los datos: …»; pasa a la sección «Origen de los datos» de ayuda.html y del manual (sigue en docs/06).
- Prueba guiada: se quita «Estás repasando un paso ya completado. Tu avance no cambia.» (el ✓ y el borde del paso ya lo indican).
- Paso 3: nota «Mínimos de referencia de la norma IEC 62353 (pruebas periódicas de equipos médicos)…»; «2014» y «Tabla 2» quedan solo en docs/06.
- Historial y reporte: «Reporte generado en X ms» sale de la vista del reporte y pasa al bloque cerrado, que se llama «Datos técnicos (para las especificaciones ES03 y ES09)». docs/verificacion.md dice dónde se lee ES09.

### Cambiado (14/11/2026, sexta ronda: evitar fallas en la página publicada)
- `tools/sri.mjs` agrega a cada URL de CSS y JS (link, script y modulepreload, en index.html y ayuda.html) un parámetro de versión con los primeros 10 caracteres de su huella (`css/estilos.css?v=…`). Los `import` entre módulos llevan la misma URL versionada que su modulepreload, para que cada módulo se descargue una sola vez y con su integrity; la versión se calcula de abajo hacia arriba (primero lo importado). La ruta del JSON en main.js también lleva su versión. Motivo: durante un despliegue la página publicada se vio sin CSS ni JS porque el navegador usó archivos viejos en caché y el SRI los bloqueó.
- `tests/sri.test.js` revisa también las versiones y que cada import pida exactamente una URL precargada en index.html.

### Agregado (14/11/2026, sexta ronda)
- `tests/sintaxis.test.js`: `node --check` de todos los .js y .mjs (js/, tests/, tools/), importación sin navegador de cada módulo del núcleo y de los adaptadores, y revisión de los nombres que importa main.js. Habría detectado la función `mostrarExplicacion` duplicada. 121 pruebas en verde.
- docs/mantenimiento.md: no subir cambios el mismo día de una prueba con usuarios; después de cada push, esperar a que GitHub Pages termine (Actions en verde) antes de compartir el enlace. docs/solucion_problemas.md: caso «página sin estilos justo después de un push».

### Agregado (14/11/2026, quinta ronda)
- Nueva medición: **corriente de fuga a tierra** (la que circula por el conductor de protección). Modelo: I = V·2πf·C_activa en condición normal e I = V·2πf·(C_activa + k_N·C_otra) con neutro abierto. k_N = 27.13/14.73 − 1 = 0.8418 es un factor empírico calibrado con la polaridad normal; queda en `datos/parametros_r12.json` (`factor_neutro_abierto_fuga_tierra` y `origen_factor_neutro_abierto`) y M3 lo valida.
- Solo existen 4 configuraciones de fuga a tierra (normal y neutro abierto, con las 2 polaridades): con fuga a tierra se deshabilita «tierra abierta» y se explica por qué; M4 la rechaza con el mismo mensaje (`medicionPosible`).
- Límites de IEC 60601-1, 3.ª ed.: 5 mA (condición normal) y 10 mA (primer defecto), iguales para B, BF y CF; se escriben en mA. Nota: el manual del R12 indica 500/1000 µA porque usa la 2.ª edición. Filas nuevas en la tabla de límites de Equipo; en el Analizador, la frase «Para la fuga a tierra el límite es del equipo completo, no depende de B, BF o CF» en vez de la tabla B/BF/CF.
- Circuito: con fuga a tierra el camino rojo va solo por el conductor de protección (con su valor) y la MD queda desconectada.
- Explicación física, fórmula con k_N y glosario («Corriente de fuga a tierra: La que circula por el cable de tierra del equipo hacia la tierra de la instalación.»).
- Pruebas: ES01 con las 4 configuraciones de fuga (16 en total; error máximo sigue en 0.41 %), ES02 con E_n frente a los datos de docs/06 (máximo 0.187, polaridad invertida con neutro abierto), límites, M3 y `listarConfiguraciones` (16). 116 pruebas en verde.
- Comparar: cuadro de avance «Has medido X de las 16 configuraciones que simula esta herramienta», con «Te faltan:» y «Repetiste:» (con cuántas veces) o «Completaste las 16 configuraciones.», y el bloque cerrado «¿Por qué 16?». La lógica es una función pura de M8 (`resumirAvance`) con pruebas (`tests/historial.test.js`). Gráfica nueva de fuga a tierra.
- `ayuda.html`: el manual de usuario en HTML (mismos estilos, misma CSP, SRI del CSS y sin scripts), con enlace «Ayuda» arriba a la derecha del encabezado y «Volver al simulador». `tools/sri.mjs` y `tests/sri.test.js` cubren también esta página.

### Cambiado (14/11/2026, quinta ronda)
- Analizador: las explicaciones de las opciones deshabilitadas ya no salen en naranja (parecían un error). Son notas informativas en azul con ⓘ, justo debajo de la opción deshabilitada y solo cuando aplican: fuga a tierra debajo de «Abierta» en Tierra (solo con la fuga a tierra) y doble falla debajo de la opción que quedó deshabilitada (tierra o neutro). Si al elegir fuga a tierra la tierra se cierra sola, se muestra una vez «Se cerró la tierra porque la fuga a tierra se mide con el conductor de protección conectado.»
- Analizador: «% del límite usado» pasa a «Qué tan cerca del límite», igual que en Comparar.
- La columna «% del límite» se llama «Qué tan cerca del límite» en Comparar, Historial y el PDF, con la nota: «Una corriente pequeña puede estar más cerca de su límite que una grande: compara la corriente de paciente CF (límite 10 µA) con la de contacto (límite 100 µA).»
- Documentos alineados: docs/02 (RF04 con la fuga a tierra y su trazabilidad), docs/03 (ES01 y ES02 con 16 configuraciones), docs/06 §8 (factor k_N y su validación), docs/08 y docs/verificacion.md (alcance; red en parte aplicada y corriente auxiliar como trabajo futuro), manual de usuario, solución de problemas, mantenimiento (mantener `ayuda.html` igual al manual), README y CLAUDE.md.

### Agregado (14/11/2026)
- Paso 3 de la prueba guiada (aislamiento) con veredicto: mínimos esperados de IEC 62353:2014, Tabla 2, para equipo Clase I con parte CF (red–tierra ≥ 2 MΩ; partes aplicadas–tierra ≥ 70 MΩ; red–partes aplicadas ≥ 70 MΩ). Tabla con valor medido, mínimo y «Cumple/No cumple» calculado, y nota sobre la fuente (medición opcional en IEC 62353; el manual del R12 no fija límite). Fuente anotada en docs/06 §7.
- `datos/parametros_r12.json`: cada par de `aislamiento_Mohm` trae `valor` y `minimo`, más `fuente_minimos_aislamiento`. M3 los valida (mínimo > 0).
- M5: `evaluarAislamiento` (mínimo) y `evaluarResistenciaTierra` (máximo) entienden «> 100 (OL)» y «< 0.015» como cotas; el veredicto del paso 2 pasa de la interfaz a M5. 8 pruebas nuevas (87 en verde). Sin cambios en los cálculos de corriente.
- Analizador: nuevo bloque plegable «¿Qué pasa si abro la tierra o el neutro?» (debajo de Tierra y Neutro) con condición normal, primer defecto y el ejemplo del límite que sube (100 → 500 µA, tomados del JSON). «¿Qué estoy midiendo?» queda solo con las dos corrientes; en Equipo siguen los cuatro términos. Una sola lista de textos para los tres bloques.

### Cambiado (14/11/2026)
- Prueba guiada: los pasos completados (marcados con ✓) se pueden volver a abrir con un clic para repasarlos, sin perder el avance; el botón de la tarjeta lleva de vuelta al paso pendiente. Un paso nuevo solo se habilita al completar el anterior y, al completar los 4, todos quedan libres. El paso que se está viendo se resalta. M2 separa el avance (`pasosCompletados`, guardado en sessionStorage) del paso que se ve (`pasoVisto`): nuevas funciones `verPaso`, `obtenerPasoVisto`, `pasoCompletado` y `crearEstadoDesdeAvance`, con 7 pruebas nuevas (94 en verde).
- Paso 3: se quitan los números de figura («Figura 12/14/16»): eran del artículo de EBME, no de IEC 62353. Quedan par de puntos, valor, mínimo (2, 70 y 70 MΩ) y resultado; fuente: IEC 62353:2014, Tabla 2 (docs/06 §7).
- «¿Por qué CF es la más estricta?»: la explicación de B, BF y CF empieza con mayúscula después de los dos puntos.
- «Tiempo de carga de esta página» sale de la vista principal de Historial y reporte: queda en un bloque cerrado «Datos técnicos (para la prueba de carga ES03)» al final de la sección y en «Copiar resumen». Ya no va en el reporte en pantalla ni en el PDF. Protocolo ES03, manual, docs/03 y verificacion.md actualizados.

### Agregado
- Tiempo de carga de la página con la API Navigation Timing (inicio de la navegación → loadEventEnd, en ms): se muestra en «Historial y reporte» como «Tiempo de carga de esta página: X ms» con el navegador, la fecha y hora y el tipo de carga (normal o recarga), y se incluye en el PDF y en «Copiar resumen». Nuevo módulo `js/adaptadores/tiempo_carga.js` y `tests/tiempo_carga.test.js` (79 pruebas en verde).
- `docs/protocolo_ES03_30_usuarios.md`: 30 personas abren la página a la vez en incógnito y pegan su resumen; p95 por el método del rango más cercano, % de errores y tabla de 30 filas.

### Cambiado
- ES03 se medirá con 30 usuarios reales simultáneos (docs/03, docs/verificacion.md: «Pendiente: prueba con 30 usuarios reales»). Motivo: la prueba con autocannon (30 conexiones sin pausa, ≈ 28 500 solicitudes en un minuto) no representaba el uso real, y GitHub Pages la bloqueó con 429 «Too Many Requests» (67 % de las solicitudes). Se deja documentada en docs/verificacion.md.
- Correcciones de textos (sin cambios en cálculos ni en las pruebas del núcleo):
  - Subtítulo: «Pruebas de seguridad eléctrica del electrocardiógrafo Mindray BeneHeart R12 (IEC 60601-1)».
  - Ficha del equipo, fila Normas: qué aporta cada norma (IEC 60601-1, norma general de la que salen los límites; IEC 60601-2-25, norma particular para electrocardiógrafos).
  - Unidades: cada valor de las tablas lleva su unidad («100 µA», «0.00 ± 1.15 µA») en la tabla de límites, la tabla B/BF/CF del Analizador, Comparar, el historial, el reporte y el PDF; se quita «(µA)» de títulos y encabezados de tabla. Los títulos de las gráficas de Comparar conservan «(µA)» porque las marcas del eje son números sin unidad. En el PDF cada lectura y cada límite siguen cabiendo en un solo renglón.
  - Bloque plegable (cerrado por defecto) con el significado de «corriente de contacto», «corriente de paciente», «condición normal» y «primer defecto»: «¿Qué significan estos términos?» debajo de la tabla de límites y «¿Qué estoy midiendo?» junto al selector de Medición. Los dos salen de la misma lista de textos en `interfaz.js`.
  - «¿Por qué CF es la más estricta?»: frase del microchoque corregida (decenas de microamperios, unas mil veces menos que el macrochoque).
- Segunda ronda de correcciones de textos (sin cambios en cálculos ni en las pruebas del núcleo):
  - Fila Normas: cada norma en su propio renglón.
  - Glosarios plegables: un renglón por término con el formato «Término: Explicación» (explicación con mayúscula inicial); «UNA» pasa a «una». No quedan palabras en mayúsculas para dar énfasis en la página ni en el PDF.
  - Columna Condición con mayúscula inicial en la tabla de límites («Condición normal», «Primer defecto»); las demás tablas y el PDF ya la tenían.
  - Prueba guiada, pasos 1 a 3: cada resultado dice qué se revisó o midió, el valor con su unidad (un renglón por punto) y qué significa. Paso 1: los 5 puntos de la inspección con su estado. Paso 2: «< 0.015 Ω», límite ≤ 0.2 Ω (manual del fabricante) y «Cumple», calculado comparando el valor con el límite del JSON. Paso 3: los 3 valores en MΩ y qué significan; no se da veredicto porque los datos no tienen un límite de aislamiento.

## [1.0.0] - 2026-11-13
Primera versión publicada en GitHub Pages: https://yustrico.github.io/Analizador_Transparente/

### Agregado (Fase 5: lanzamiento y documentación)
- `docs/verificacion.md`: tabla ES01–ES15 (meta, cómo se mide, valor medido, ¿cumple?) con los datos de cada medición.
- `docs/protocolo_prueba_usuarios.md`: sesión del 18/11 (tareas para ES11, cuestionario SUS en español con el cálculo para ES10, hoja de dispositivos para ES08 y registro de RAM/CPU para ES14–ES15).
- `docs/manual_usuario.md`, `docs/solucion_problemas.md` y `docs/mantenimiento.md`.
- Verificación de la versión publicada (CSP, SRI, carga del JSON, PDF y copiar resumen) en Chrome y Edge.

### Agregado (Fase 4: seguridad y rendimiento)
- Política de seguridad de contenido (CSP) en una meta etiqueta de index.html, exactamente la de CLAUDE.md: solo archivos del propio sitio; bloquea scripts, estilos y eventos en línea.
- Integridad de subrecursos (SRI, SHA-384): `tools/sri.mjs` (`npm run sri`) escribe la huella del CSS, de main.js y, con `<link rel="modulepreload">`, de cada módulo JS (el integrity del `<script>` solo cubre main.js). `--comprobar` (`npm run sri:comprobar`) revisa sin escribir.
- `tools/peso.mjs` (`npm run peso`): suma el peso de lo que descarga la página y lo compara con ES05 (≤ 1 600 KiB). Medido: 13 archivos, 188 KiB.
- `tests/sri.test.js`: huellas al día, integrity en todos los JS/CSS, CSP exacta y nada en línea (75 pruebas en verde).

### Cambiado (rendimiento, ES14–ES15)
- La animación del camino de la corriente se detiene tras 30 s sin actividad (mouse, teclado, rueda) y se reanuda sola al moverse; antes solo se detenía con la pestaña oculta, en otra sección o con «menos movimiento».
- La animación dibuja 30 cuadros por segundo en lugar de 60 (se ve igual a 40 px/s): CPU de la pestaña de ≈ 15 % a ≈ 10 % de un núcleo mientras anima; 0 % en reposo.

### Revisado (seguridad)
- Sin innerHTML, outerHTML, insertAdjacentHTML, document.write, eval, new Function, setTimeout con texto, atributos on* ni estilos en línea. El nombre del estudiante solo se usa con textContent y en el PDF como texto escapado.
- Probado con archivos alterados: un módulo JS o el CSS modificados se bloquean por SRI; un script, un onclick y un estilo inyectados en el HTML se bloquean por la CSP (Chrome y Edge).

### Quitado (cierre de la Fase 3)
- Botón «Enviar por correo» (enlace mailto:). Motivo: en Windows, si no hay un programa de correo configurado, abre una lista de programas, y si el estudiante elige un navegador no pasa nada; además no sirve para quien usa correo web. Quedan solo «Descargar reporte (PDF)» y «Copiar resumen», con la indicación «Para enviarlo: pega el resumen en tu correo (Outlook, Gmail o el de la universidad) y adjunta el PDF.»
- Documentos actualizados (CLAUDE.md, docs/02 RF11, docs/03 ES09, docs/08, README): donde decía mailto ahora dice «copiar resumen al portapapeles»; CLAUDE.md también refleja el PDF propio y la nota en lugar del aviso al cerrar.

### Cambiado (reporte y correo)
- El PDF se descarga directo, sin el diálogo de imprimir: nuevo generador propio `js/adaptadores/pdf.js` (PDF 1.4 escrito a mano, sin librerías; fuentes estándar Helvetica y Symbol; codificación WinAnsi para tildes, ñ, µ y ±). Mismo contenido que el reporte en pantalla (encabezado, datos, tabla con salto de página y encabezado repetido, incertidumbre y aviso), con pie «Página n de m». Archivo `reporte_seguridad_electrica_AAAA-MM-DD.pdf` (Blob + enlace con download). Se quita la ayuda sobre «Destino».
- Se quita por completo el aviso «¿Quieres salir del sitio web?» (beforeunload). En su lugar, nota visible en Historial y reporte: «Tus lecturas se borran al cerrar la pestaña. Descarga tu reporte antes de cerrar.»
- Nuevo botón «Copiar resumen» (navigator.clipboard.writeText) con el mismo resumen del correo, para quien usa correo web. Debajo de «Enviar por correo»: «Abre tu programa de correo. Si usas correo web, usa «Copiar resumen».»
- La pantalla y el PDF usan la misma función `contenidoDelReporte` (M10), así no pueden diferir.

### Agregado (pruebas)
- `tests/pdf.test.js`: el archivo empieza con %PDF-, la tabla xref apunta a cada objeto, los /Length son exactos, contiene todas las lecturas, salta de página repitiendo el encabezado, escribe bien tildes/ñ/µ/±/paréntesis y nombra el archivo con la fecha local (71 pruebas en verde).

### Corregido (después de la Fase 3)
- Texto de la incertidumbre (Comparar y reporte): se quita «con 95 % de confianza», porque con una sola fuente rectangular k = 2 no equivale a 95 %. El texto nuevo explica U según la GUM (u = exactitud/√3, U = 2·u) a partir de la exactitud del ESA620. Sin cambios en cálculos ni pruebas.
- El botón «Enviar por correo» ya no dispara el aviso «¿Quieres salir del sitio web?»; el aviso sigue saliendo al cerrar o recargar la pestaña.
- El avance de la prueba guiada se guarda en sessionStorage: al recargar no hay que repetir los pasos (si el dato guardado está dañado, se valida con M2 y la prueba empieza en el paso 1).

### Cambiado
- El botón del PDF se llama «Descargar reporte (PDF)» y explica cómo elegir «Guardar como PDF»; junto al correo se indica que hay que adjuntar el PDF a mano.

### Agregado (Fase 3)
- M8 `historial.js`: registro de cada lectura (medición, condición, lectura ± incertidumbre, límite, % del límite, veredicto, hora) en memoria y en sessionStorage (sobrevive a recargar la pestaña; nada sale del navegador). Aviso del navegador antes de cerrar la pestaña si hay lecturas. Formato único de fila para Historial, Comparar y reporte.
- Sección Historial: tabla con todas las lecturas y botón «Finalizar práctica», que pide el nombre (opcional, máximo 60 caracteres, texto plano) y genera el reporte.
- M10 `reporte.js`: reporte con estudiante, fecha y hora, equipo (R12, Clase I, CF), resumen, tabla de todas las lecturas, explicación de la incertidumbre y aviso «Herramienta educativa, no certifica equipos». «Guardar como PDF» con window.print() y hoja de estilos @media print que solo imprime el reporte. «Enviar por correo» con mailto: (resumen corto, sin destinatario, pide adjuntar el PDF; todo con encodeURIComponent).
- Medición de ES09 en pantalla: tiempo desde el clic en «Generar reporte» hasta que el reporte está dibujado.

### Cambiado (textos de incertidumbre)
- «I ± U (µA)» pasa a «Lectura ± incertidumbre (µA)» en las tablas; leyenda de Comparar: «Lectura» y «Margen de incertidumbre del analizador»; frase que explica la incertidumbre con un ejemplo debajo del título de Comparar; subtítulo «lectura ± incertidumbre del analizador» bajo la lectura grande; «Banda ± U» pasa a «Margen de incertidumbre (± U)».

### Cambiado
- Analizador más fácil de entender (pedido tras una prueba con un compañero):
  - Etiquetas del circuito con nombre: «C_L: fuga fase–chasis», «C_N: fuga neutro–chasis», «C_AP: aislamiento de electrodos» y «MD: cuerpo humano simulado (1 kΩ)». Cada parte del dibujo muestra su explicación al pasar el mouse (`<title>` de SVG).
  - Nuevo cuadro «¿Qué es cada parte?» debajo del circuito (L, N, polaridad, neutro, PE, C_L, C_N, C_AP con sus pF, parte aplicada CF y MD). El dibujo y el cuadro usan la misma lista de explicaciones.
  - «Fórmula usada» explica cada sigla con su nombre completo y su valor antes de la fórmula.
  - Corriente de contacto: la tabla B/BF/CF se reemplaza por la frase «el límite es el mismo para B, BF y CF»; la tabla queda solo para la corriente de paciente.
  - Más espacio al final de la página para que el aviso fijo no tape el contenido.
  - Sin cambios en los cálculos ni en las pruebas.

### Agregado
- Fase 2 (interfaz y visualizador):
  - `index.html` y `css/estilos.css`: 5 secciones en una sola página (Equipo, Prueba guiada, Analizador, Comparar, Historial), aviso educativo fijo, sin scripts ni estilos en línea.
  - M1 `interfaz.js` + `main.js`: ficha del R12 y tabla de límites B/BF/CF; prueba guiada de 4 pasos con botón «Entendido, siguiente paso» (el Analizador y Comparar se desbloquean al llegar al paso 4); Analizador con selector de medición, conmutadores, bloqueo de la doble falla, lectura «I ± U», límite, % del límite, veredicto, límites B/BF/CF, explicación y fórmula con números; Comparar con tabla y barras SVG propias con banda ± U.
  - M6 `visualizador.js`: circuito SVG (red, polaridad, neutro, PE, chasis, C_L, C_N, C_AP, parte aplicada, MD) con el camino de la corriente en rojo y la corriente por rama; animación con requestAnimationFrame que se detiene fuera del Analizador, con la pestaña oculta o si el sistema pide menos movimiento.
  - Historial y reporte: solo el encabezado de la sección (se construyen en la Fase 3).
- Fase 1 (núcleo + pruebas, 62 pruebas en verde):
  - `datos/parametros_r12.json` con los parámetros calibrados del R12 y los límites de IEC 60601-1, incluidos los de partes B y BF para comparar (RF07).
  - M3 `modelo_equipo.js`: carga y valida los parámetros (tipos y rangos) y los entrega congelados.
  - M4 `motor_calculo.js`: corriente de contacto y de paciente CF por condición, incertidumbre ± U del analizador y corriente por rama; rechaza la doble falla.
  - M5 `evaluador_limites.js`: límite aplicable (normal o primer defecto), % del límite, veredicto y límites equivalentes B/BF/CF.
  - M2 `secuencia.js`: 4 pasos en orden fijo con su propósito; no deja saltar pasos.
  - Pruebas ES01 (error ≤ 1 % frente a la tabla de referencia; máximo obtenido 0.41 %) y ES02 (E_n ≤ 1 en las 12 configuraciones medidas; máximo 0.19).
- Fase 0: estructura de carpetas (núcleo, adaptadores, datos, pruebas, herramientas), README, package.json con `npm test` (`node --test`, sin dependencias), .gitignore y .gitattributes.
