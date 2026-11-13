# Registro de cambios

Todos los cambios importantes del proyecto se anotan aquí.
Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y versiones según [SemVer](https://semver.org/lang/es/).

## [Sin publicar]

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
