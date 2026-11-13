# Solución de problemas — Analizador transparente

Versión 1.0.0 · Noviembre de 2026

Cada problema tiene la **causa** y lo que hay que **hacer**. La primera parte es para estudiantes; la segunda, para quien mantiene el proyecto.

## Para estudiantes

| Problema | Causa | Qué hacer |
|---|---|---|
| La página sale en blanco o los botones no hacen nada | Navegador muy antiguo, otro navegador (Firefox, Safari) o una extensión que bloquea scripts | Usa Chrome o Edge actualizados (Menú → Ayuda → Acerca de). Prueba en una ventana de incógnito (sin extensiones). |
| Sale «No se pudo iniciar la aplicación…», o la página se ve pero nada responde y la dirección empieza por `file:///` | Se abrió el archivo `index.html` con doble clic: el navegador no deja cargar los módulos ni los datos desde un archivo local | Abre la dirección publicada: https://yustrico.github.io/Analizador_Transparente/ (o, para desarrollo, un servidor local; ver README). |
| Las pestañas *Analizador* y *Comparar* no se pueden abrir | Falta terminar la prueba guiada | Ve a *2. Prueba guiada* y presiona «Entendido, siguiente paso» hasta llegar al paso 4. |
| No puedo abrir la tierra y el neutro a la vez | Es a propósito: sería una doble falla, que la norma no evalúa | Abre solo uno de los dos (es un «primer defecto»). |
| El camino rojo no se mueve | En Windows están apagados los «Efectos de animación», o no has tocado el mouse en 30 s (reposo) | Mueve el mouse. Si sigue quieto, es por la configuración de Windows (Configuración → Accesibilidad → Efectos visuales); la información es la misma. |
| Mi lectura es 0.00 y en el laboratorio el analizador mostró 0.1 µA | El modelo calcula ≈ 0.00004 µA; el analizador real muestra ≈ 0.1 µA por su resolución | Es normal: la diferencia es mucho menor que la incertidumbre (± 1.15 µA). |
| Perdí mis lecturas | Se cerró la pestaña o el navegador | No se pueden recuperar (nada se guarda fuera de la pestaña). Repite las mediciones y descarga el reporte antes de cerrar. |
| «Descargar reporte (PDF)» no hace nada visible | El navegador guardó el archivo sin preguntar, o pide permiso para descargar | Busca `reporte_seguridad_electrica_AAAA-MM-DD.pdf` en *Descargas* (Ctrl + J). Si aparece un aviso de descarga bloqueada, permítela. |
| «No se pudo copiar» al presionar «Copiar resumen» | El navegador no dio permiso para usar el portapapeles (o la página no se abrió con https) | Abre la dirección https publicada y vuelve a intentar. Si sigue fallando, copia a mano los datos del reporte en tu correo. |
| El PDF muestra «?» en mi nombre | Se escribió un carácter que no existe en las fuentes estándar del PDF (emoji, otro alfabeto) | Escribe el nombre solo con letras del español. |
| «429 Too Many Requests» al abrir la página | GitHub Pages limita temporalmente una red que hace demasiadas solicitudes seguidas | Espera unos minutos y recarga. |

## Para quien mantiene el proyecto

| Problema | Causa | Qué hacer |
|---|---|---|
| Después de cambiar un `.js` o el `.css`, la página deja de funcionar y en la consola (F12) dice «Failed to find a valid digest in the 'integrity' attribute» | La huella SRI de `index.html` ya no coincide con el archivo cambiado | Corre `npm run sri`, luego `npm test`, y haz commit de `index.html` junto con el archivo cambiado. |
| `npm test` falla en «index.html tiene las huellas de los archivos actuales» | Lo mismo: se olvidó correr `npm run sri` | `npm run sri`. |
| En la consola sale «Refused to execute inline script/style… Content Security Policy» | Se agregó código o estilo dentro del HTML (`<script>…</script>`, `style="…"`, `onclick="…"`) | Mueve el código a un archivo `.js` y los estilos a `css/estilos.css`. Nunca relajar la CSP con `'unsafe-inline'`. |
| Las huellas SRI cambian solas en Windows | Git convirtió los finales de línea (LF ↔ CRLF) | El archivo `.gitattributes` ya fuerza LF; no lo borres. Si pasó, `git add --renormalize .` y `npm run sri`. |
| `npm test` falla en ES01 o ES02 después de cambiar `datos/parametros_r12.json` | Los nuevos parámetros ya no reproducen la tabla de referencia o las mediciones | Revisa el cambio. Si es una calibración nueva, actualiza también la tabla de CLAUDE.md §5 y los datos de ES02 con las nuevas mediciones. |
| La página publicada no muestra los últimos cambios | GitHub Pages tarda unos minutos en publicar, o el navegador tiene la versión anterior guardada (caché de 10 min) | Revisa la pestaña *Actions* del repositorio y recarga con Ctrl + F5. |
| `node tools/sri.mjs` o `npm test` dan error de sintaxis | Node.js anterior a la versión 20.12 | Instala Node.js LTS actual. |
