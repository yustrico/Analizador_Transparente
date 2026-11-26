# 08 — Arquitectura y diseño detallado del software (Corte 3)

Fecha: 12/11/2026 · Actualizado al estado real del código: 17/11/2026.

Diagramas en la carpeta Diagramas/ (versiones _v2, 17/11/2026):
- C4_N1_Contexto_v2.png: nivel 1, contexto (caja negra).
- C4_N2_Contenedores_v2.png: nivel 2, contenedores (caja transparente).
- C4_N3_Componentes_v2.png: nivel 3, componentes (módulos M1–M11).
- DFD_Nivel0_Contexto_v2.png: diagrama de flujo de datos, nivel 0 (contexto).
- DFD_Nivel1_v2.png: diagrama de flujo de datos, nivel 1.
- Flujo_de_control_v2.png: flujo de control de la práctica.
- Ciclo_de_vida_v2.png: ciclo de vida del software.

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
- Modular y no integral: cada módulo cumple una función completa y las interfaces entre módulos son datos bien definidos (sección 6). Así los 3 integrantes pueden trabajar en paralelo y se pueden agregar equipos o módulos sin tocar el núcleo.
- Hexagonal: el NÚCLEO (M2–M5) son funciones puras, sin pantalla. Se prueban solas (pruebas unitarias) y no cambian si cambia la interfaz.
- Los ADAPTADORES (M1, M6, M8, M10, M10a y M11) conectan el núcleo con la pantalla, la memoria del navegador y el reporte.
- Alcance de las mediciones (actualizado 14/11/2026): corriente de contacto, corriente de paciente CF y corriente de fuga a tierra (16 configuraciones validadas con el ESA620). Fuera del alcance: corriente con red en la parte aplicada y corriente auxiliar de paciente. Se miden con el ESA620 sin abrir el equipo y están en la inspección del manual del R12, pero no hay mediciones del laboratorio para calibrarlas y validarlas, así que la herramienta no las simula.

## 3. Jerarquía (Sistema → Subsistema → Componente → Elemento)
- Sistema: Analizador transparente.
  - Subsistema 1, Aplicación web (contenedor):
    - Núcleo: M2 Secuencia, M3 Modelo del equipo, M4 Motor de cálculo, M5 Evaluador de límites.
    - Adaptadores: M1 Interfaz, M6 Visualizador, M8 Historial, M10 Reporte, M10a Generador PDF, M11 Tiempo de carga.
    - Elementos: un archivo JavaScript por módulo (por ejemplo `js/nucleo/motor_calculo.js`) y sus funciones.
  - Subsistema 2, Datos: `datos/parametros_r12.json` (D1 parámetros del modelo + D2 pasos previos medidos y límites).
  - Subsistema 3, Memoria del navegador (D3): sessionStorage guarda el historial de lecturas (M8) y el avance de la prueba guiada (M2, a través de M8). Se conserva al recargar la página y se borra al cerrar la pestaña.
  - Subsistema 4, Reporte: archivo PDF descargable, creado por el generador propio (M10a), y copiar resumen al portapapeles (M10).

## 4. Fichas de módulos
| Módulo | Archivo | Tipo | Qué hace | Recibe | Entrega | Requerimientos | Especificaciones |
|---|---|---|---|---|---|---|---|
| M1 Interfaz | js/adaptadores/interfaz.js + index.html + css/estilos.css | Adaptador | 5 secciones: Equipo, Prueba guiada, Analizador, Comparar, Historial y reporte | Clics del estudiante; Resultado | Acción (paso, condición, medición) | RF01, RF08, RNF07 | ES10, ES11, ES06 |
| M2 Secuencia | js/nucleo/secuencia.js | Núcleo | Orden fijo de la prueba y propósito de cada paso; no deja saltar pasos; permite repasar los completados | Acción | Paso actual; avance de la prueba | RF01, RF02 | — |
| M3 Modelo del equipo | js/nucleo/modelo_equipo.js | Núcleo | Carga y valida (tipos y rangos) los parámetros del R12 | parametros_r12.json | Parámetros | RR01, RR02 | — |
| M4 Motor de cálculo | js/nucleo/motor_calculo.js | Núcleo | Corriente de contacto, de paciente y de fuga a tierra por condición e incertidumbre U; lista de las 16 configuraciones | Condición, Medición, Parámetros | I (µA), U (µA), corriente por rama | RF03, RF04, RNF02, RNF03 | ES01, ES02 |
| M5 Evaluador de límites | js/nucleo/evaluador_limites.js | Núcleo | Límite IEC 60601-1 aplicable y veredicto; veredicto de los pasos 2 (resistencia de tierra) y 3 (aislamiento, mínimos de IEC 62353:2014 Tabla 2) | I, U, Medición, Condición | Resultado | RF06, RF07 | — |
| M6 Visualizador | js/adaptadores/visualizador.js | Adaptador | Dibuja la red MD y los conmutadores L/N/PE en SVG y anima el camino de la corriente; la animación se detiene en reposo | Corriente por rama, Condición | Dibujo SVG | RF05 | ES14, ES15 |
| M8 Historial | js/adaptadores/historial.js | Adaptador | Guarda las lecturas de la sesión en memoria y en sessionStorage, y también el avance de la prueba guiada; resume el avance de las 16 configuraciones | Resultado; avance de M2 | Lista de registros; avance | RF11 | ES14 (RAM) |
| M10 Reporte | js/adaptadores/reporte.js | Adaptador | Arma el reporte final (pantalla y PDF) y el resumen para copiar al portapapeles | Lista de registros, nombre, tiempo de carga | Contenido del reporte; resumen en el portapapeles | RF11, RNF09 | ES09 |
| M10a Generador PDF | js/adaptadores/pdf.js | Adaptador | Escribe el archivo PDF 1.4 a mano, sin librerías (fuentes estándar Helvetica y Symbol, codificación WinAnsi), con salto de página, tablas, listas numeradas y bloques que no se parten; lo descarga directo (Blob + enlace con download) | Contenido del reporte | Archivo reporte_seguridad_electrica_AAAA-MM-DD.pdf | RF11 | ES09, ES12 |
| M11 Tiempo de carga | js/adaptadores/tiempo_carga.js | Adaptador | Mide cuánto tardó en cargar la página con la API Navigation Timing (navegación → fin de load) | Datos del navegador | Tiempo de carga (ms), navegador, tipo de carga | — | ES03 |

## 5. Correspondencia con la guía del Corte 3 (punto 9.3)
| Función de la guía | Módulos | Cómo la cumple |
|---|---|---|
| Adquisición | M3 (y M1 para las selecciones del usuario) | M3 lee y valida los datos medidos del R12 (parametros_r12.json); M1 recoge la medición, la condición y los clics del estudiante |
| Procesamiento | M4 y M5 | M4 calcula la corriente y su incertidumbre; M5 decide el límite aplicable y el veredicto |
| Control | M2 | Orden fijo de la prueba; no deja saltar pasos |
| Interfaz | M1 y M6 | M1 muestra las 5 secciones y los resultados; M6 dibuja y anima el circuito |
| Registro | M8 y M10 | M8 guarda las lecturas (memoria y sessionStorage); M10 arma el reporte (con M10a para el PDF) y el resumen |

## 6. Diccionario de datos (interfaces entre módulos)
| Dato | Campos | Ejemplo |
|---|---|---|
| Condición | polaridad: "normal" o "invertida"; tierra: "cerrada" o "abierta"; neutro: "cerrado" o "abierto" (nunca tierra y neutro abiertos a la vez) | {polaridad:"normal", tierra:"abierta", neutro:"cerrado"} |
| Medición | tipo: "contacto", "paciente" o "fuga_tierra" (la fuga a tierra no existe con la tierra abierta) | {tipo:"fuga_tierra"} |
| Parámetros | V = 120 V; f = 60 Hz; C_L = C_N = 325.7 pF; C_AP = 28.0 pF; ΔI = 0.83 µA; k_N = 0.8418; R_PE = 0.0026 Ω; R_MD = 1000 Ω | Archivo 06 |
| Límites | contacto: 100 µA (normal) y 500 µA (primer defecto); paciente CF: 10 µA y 50 µA; fuga a tierra: 5 mA y 10 mA (3.ª edición; iguales para B, BF y CF) | IEC 60601-1 |
| Resultado | I_uA, U_uA, limite_uA, veredicto ("Cumple" o "No cumple"), hora | {I_uA:14.73, U_uA:1.32, limite_uA:500, veredicto:"Cumple"} |
| Registro | Resultado + Condición + Medición | Una fila del historial y del reporte |
| Avance de la prueba | pasos completados (1 a 4) | Se guarda en sessionStorage |

## 7. Tabla de interacciones cruzadas (guía del Corte 3, punto 2.3)
| Origen | Destino | Tipo | Naturaleza | Riesgo asociado |
|---|---|---|---|---|
| M1 Interfaz | M2 Secuencia | Fundamental | Información (acción) | Saltar pasos → M2 bloquea el orden |
| M2 Secuencia | M4 Motor | Fundamental | Información (Condición, Medición) | Condición inválida (dos fallas a la vez) → se rechaza (programación defensiva) |
| M3 Modelo | M4 Motor | Fundamental | Información (Parámetros) | JSON dañado o alterado → validación de tipos y rangos en M3; se descarga por HTTPS y con versión ?v= |
| M4 Motor | M5 Evaluador | Fundamental | Información (I, U) | Error de cálculo → pruebas unitarias contra la tabla del 06 (ES01) |
| M5 Evaluador | M1 Interfaz | Fundamental | Información (Resultado) | Límite equivocado → comparación con la tabla de la norma (RF07) |
| M4 Motor | M6 Visualizador | Fundamental | Información (corriente por rama) | Dibujo distinto al cálculo → ambos usan la misma salida de M4 |
| M6 Visualizador | M1 Interfaz | Incidental | Rendimiento (animación SVG) | Uso alto de CPU o lentitud → la animación se detiene en reposo (ES15) |
| M5 Evaluador | M8 Historial | Fundamental | Información (Registro) | Pérdida al cerrar la pestaña → nota visible «descarga tu reporte antes de cerrar» |
| M8 Historial | sessionStorage | Fundamental | Información (registros y avance, en los dos sentidos) | Datos dañados o navegador que no permite guardar → M8 revisa la forma de cada registro y sigue funcionando solo en memoria |
| M8 Historial | M10 Reporte | Fundamental | Información (lista de registros) | Reporte incompleto → revisar el número de lecturas antes de generar |
| M11 Tiempo de carga | M10 Reporte | Incidental | Información (tiempo de carga) | Navegador sin Navigation Timing → se muestra «no disponible» sin romper el reporte |
| M10 Reporte | M10a Generador PDF | Fundamental | Información (contenido del reporte) | Caracteres que no existen en las fuentes estándar → se cambian por uno equivalente o por «?» (prueba en tests/pdf.test.js) |
| M10a Generador PDF | Archivo PDF | Fundamental | Información (descarga con Blob) | Archivo dañado → pruebas de estructura (xref, largos de flujo) en tests/pdf.test.js |
| M10 Reporte | Correo del estudiante | Fundamental | Información (copiar resumen al portapapeles) | Datos personales → solo el nombre que escribe el estudiante; 0 envíos a servidores (ES13) |
| GitHub Pages | Aplicación | Fundamental | Información (archivos HTTPS) | Archivos alterados → HTTPS + hashes SRI + commits firmados |

## 8. Seguridad
Medidas adoptadas y el riesgo que cubre cada una:

| # | Medida | Riesgo que cubre |
|---|---|---|
| 1 | HTTPS obligatorio (lo da GitHub Pages, «Enforce HTTPS») | Que alguien lea o cambie los archivos en el camino entre GitHub y el navegador |
| 2 | Commits firmados en GitHub (aparecen como «Verified») | Que se publique código a nombre del equipo sin ser del equipo |
| 3 | Integridad de subrecursos (SRI, SHA-384) en cada JS y CSS, con versión ?v= en cada URL e import (tools/sri.mjs) | Que el navegador ejecute un archivo alterado; que use una copia vieja en caché después de un despliegue |
| 4 | Política de seguridad de contenido (CSP) en una meta etiqueta: solo archivos propios, sin scripts ni estilos en línea, sin objetos, sin formularios | Inyección de código (XSS) y carga de recursos de otros sitios |
| 5 | Sin librerías, CDN, fuentes externas ni dependencias de npm | Ataque a la cadena de suministro (una librería comprometida) |
| 6 | Sin innerHTML con texto del usuario (el nombre va con textContent), sin eval ni new Function | XSS a través del nombre del estudiante |
| 7 | 0 datos enviados a servidores; sin cuentas ni base de datos; las lecturas solo viven en sessionStorage de la pestaña (ES13) | Fuga de datos personales; privacidad |

Riesgo residual (lo que estas medidas no cubren):
- Clickjacking: otra página podría mostrar el simulador dentro de un marco (iframe). La protección (frame-ancestors o X-Frame-Options) solo funciona como cabecera HTTP y GitHub Pages no permite cabeceras propias. El impacto es bajo, porque la página no tiene acciones sensibles ni datos de cuentas.
- No se hizo una auditoría de seguridad profesional; las medidas se revisaron con las pruebas automáticas (tests/sri.test.js) y a mano (pestaña Red, búsqueda de innerHTML y eval).

## 9. Registro de fallas (guía punto 11)
Casos reales registrados en el CHANGELOG.

| Falla | Causa | Solución | Fecha |
|---|---|---|---|
| «Guardar como PDF» abría el diálogo de imprimir en vez de descargar el PDF | El reporte usaba window.print(): el estudiante tenía que elegir «Guardar como PDF» en el diálogo del navegador | Generador propio js/adaptadores/pdf.js (M10a): el PDF se escribe en el navegador y se descarga directo | 13/11/2026 |
| El botón «Enviar por correo» (mailto) no abría el correo | En Windows sin programa de correo configurado, mailto abre una lista de programas; si se elige un navegador no pasa nada, y no sirve con correo web | Se quitó el botón; quedó «Copiar resumen» (navigator.clipboard.writeText): el estudiante lo pega en su correo y adjunta el PDF | 13/11/2026 |
| Aparecía el aviso «¿Quieres salir del sitio web?» | El aviso beforeunload, puesto para no perder lecturas, salía también al pulsar el enlace mailto y al recargar | Se quitó el aviso; nota visible «descarga tu reporte antes de cerrar», y las lecturas se conservan al recargar gracias a sessionStorage | 13/11/2026 |
| La aplicación no arrancaba y las pruebas no lo detectaron | Una función nueva se llamó igual que otra que ya existía en interfaz.js (mostrarExplicacion); el módulo no cargaba, pero las pruebas solo importaban el núcleo | Se renombró (mostrarNotaInfo) y se agregó tests/sintaxis.test.js: node --check de todos los .js e importación de los adaptadores sin navegador | 14/11/2026 |
| La página publicada se vio sin estilos ni JavaScript | Durante un despliegue el navegador usó un archivo viejo en caché; su huella no coincidía con el integrity (SRI) nuevo y el navegador lo bloqueó | tools/sri.mjs agrega ?v= con parte de la huella a cada URL e import; regla en mantenimiento.md: esperar a que GitHub Actions termine antes de compartir el enlace y no publicar el día de una prueba con usuarios | 14/11/2026 |
| La prueba de carga ES03 fue bloqueada por GitHub (429) | autocannon con 30 conexiones sin pausa hizo ≈ 28 500 solicitudes en un minuto; GitHub Pages respondió 429 «Too Many Requests» al 67 % | Se cambió el método: 30 usuarios reales a la vez, con el tiempo de carga medido por M11 (protocolo_ES03_30_usuarios.md); no se vuelve a usar autocannon | 13/11/2026 |
| El texto decía «95 % de confianza» | Con una sola fuente de incertidumbre rectangular, k = 2 no equivale a 95 % | Texto nuevo según la GUM (u = exactitud/√3, U = 2·u), sin mencionar 95 % | 13/11/2026 |
| El paso 3 citaba «Figura 12/14/16» como si fueran de la norma | Los números de figura eran de un artículo de EBME, no de IEC 62353 | Se quitaron; la fuente queda como IEC 62353:2014, Tabla 2 (docs/06 §7) | 14/11/2026 |

## 10. Teórico vs. real y propuesta de mejora
### 10.1 Concordancia con el ESA620 (ES02)
E_n = |I_modelo − media| / U_med, con U_med = 2·√((s/√3)² + ((0.01·media + 1 µA)/√3)²). Mediciones del R12 serie FN-84011415 (n = 3 por configuración). Criterio: E_n ≤ 1.

| Medición | Polaridad | Tierra | Neutro | Modelo (µA) | Medido (µA) | E_n |
|---|---|---|---|---|---|---|
| Contacto | normal | cerrada | cerrado | 0.000 | 0.12 ± 0.03 | 0.104 |
| Contacto | invertida | cerrada | cerrado | 0.000 | 0.12 ± 0.03 | 0.104 |
| Contacto | normal | abierta | cerrado | 14.734 | 14.47 ± 0.45 | 0.186 |
| Contacto | invertida | abierta | cerrado | 14.734 | 14.97 ± 0.06 | 0.177 |
| Contacto | normal | cerrada | abierto | 0.000 | 0.10 ± 0.00 | 0.086 |
| Contacto | invertida | cerrada | abierto | 0.000 | 0.10 ± 0.00 | 0.086 |
| Paciente CF | normal | cerrada | cerrado | 1.267 | 1.27 ± 0.21 | 0.003 |
| Paciente CF | invertida | cerrada | cerrado | 1.267 | 1.20 ± 0.10 | 0.057 |
| Paciente CF | normal | abierta | cerrado | 2.097 | 2.10 ± 0.10 | 0.003 |
| Paciente CF | invertida | abierta | cerrado | 2.097 | 2.13 ± 0.15 | 0.028 |
| Paciente CF | normal | cerrada | abierto | 1.267 | 1.20 ± 0.10 | 0.057 |
| Paciente CF | invertida | cerrada | abierto | 1.267 | 1.07 ± 0.12 | 0.167 |
| Fuga a tierra | normal | cerrada | cerrado | 14.734 | 14.73 ± 0.49 | 0.003 |
| Fuga a tierra | invertida | cerrada | cerrado | 14.734 | 14.90 ± 0.10 | 0.124 |
| Fuga a tierra | normal | cerrada | abierto | 27.138 | 27.13 ± 0.71 | 0.005 |
| Fuga a tierra | invertida | cerrada | abierto | 27.138 | 27.43 ± 0.45 | 0.187 |

Resultado: 16 de 16 configuraciones con E_n ≤ 1; máximo 0.187 (detalle en docs/verificacion.md).

### 10.2 El factor k_N (teoría frente a medición)
- Teoría: con el neutro abierto, los dos lados de la red quedan a la tensión de fase, así que la fuga a tierra sería I = V·2πf·(C_L + C_N) = 29.5 µA.
- Medición: 27.13 µA (polaridad normal). Con la teoría pura E_n = 1.39: no cumple.
- Causa probable: la fuente interna del equipo no deja el lado del neutro exactamente a la tensión de fase.
- Corrección: factor empírico k_N = 27.13 / 14.73 − 1 = 0.8418, calibrado con la polaridad normal. Con la polaridad invertida (datos que no se usaron para calibrar) da E_n = 0.187.

### 10.3 Limitaciones
- Solo 3 repeticiones por condición (docs/03 planeaba 10). Con n = 3 la desviación estándar se estima mal, y U_med queda dominada por la exactitud del analizador (piso de 1 µA). Por eso, en corrientes de 1 a 2 µA (paciente CF) un E_n pequeño también refleja una incertidumbre grande frente al valor medido.
- Los parámetros (C_L, C_N, C_AP, ΔI y k_N) se calcularon con las mediciones de polaridad normal: en esas configuraciones el E_n muestra que el modelo reproduce lo medido, no es una predicción independiente. La validación independiente es la polaridad invertida.
- Un solo equipo (R12 serie FN-84011415) y una sola sesión de laboratorio.
- ES11 mide el uso del simulador sin ayuda; no evalúa la habilidad de conectar el ESA620 al R12, que se enseña en la práctica de laboratorio.

### 10.4 Propuesta de mejora
- Repetir las mediciones con 10 repeticiones por condición (n = 10) y, si es posible, en otro R12, para estimar mejor la dispersión.
- Auditoría de seguridad hecha por un tercero.

## 11. Cronograma
- Para la presentación se recomienda un cronograma EJECUTADO, con las fechas reales que muestran los archivos y las entregas (Corte 1, Corte 2, correcciones 01–08), más el PLAN de lo que queda hasta el 20/11.
- Si se presenta como "plan vs. real", las diferencias se explican; no hay que hacer que coincida.
