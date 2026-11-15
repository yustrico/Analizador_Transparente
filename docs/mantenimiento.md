# Mantenimiento — Analizador transparente

Versión 1.0.0 · Noviembre de 2026

La herramienta no tiene servidor, base de datos ni librerías externas, así que el mantenimiento es corto. Lo que puede cambiar con el tiempo es: **los navegadores**, **los parámetros del equipo** (si se recalibra) y **la norma**. Este documento dice qué revisar, cada cuánto y cómo publicar una versión nueva.

## 1. Calendario de revisión

| Qué | Cada cuánto | Cómo | Quién |
|---|---|---|---|
| **Navegadores** (Chrome y Edge en Windows) | Al inicio de cada semestre, y si un estudiante reporta un error | Abrir la página publicada en las versiones actuales de Chrome y Edge, hacer una práctica completa (los 4 pasos, las 16 configuraciones, reporte PDF, «Copiar resumen» y el enlace «Ayuda») y revisar que la consola (F12) no tenga errores | Monitor de la asignatura o el equipo |
| **Pruebas automáticas** | Antes de cada cambio que se publique | `npm test` (debe salir todo en verde) | Quien hace el cambio |
| **Parámetros del R12** (`datos/parametros_r12.json`) | Cada vez que el laboratorio mida de nuevo el equipo, y como mínimo una vez al año (junto con la calibración del ESA620) | Repetir las mediciones de ES02 (corriente de contacto, de paciente y de fuga a tierra en las 16 configuraciones, n ≥ 3; recalcular k_N = fuga a tierra con neutro abierto / normal − 1, polaridad normal), actualizar el JSON y los datos de ES02, y correr `npm test` | Equipo del proyecto / docente |
| **Manual de usuario** (`docs/manual_usuario.md` y `ayuda.html`) | Cada vez que cambie la pantalla o lo que hace la herramienta | `ayuda.html` es la versión web del manual: si cambias uno, cambia el otro igual. Después de editar `ayuda.html` no hace falta `npm run sri` (no tiene scripts), salvo que cambie el CSS | Quien hace el cambio |
| **Exactitud del analizador** (`exactitud_analizador`) | Si cambia el modelo del analizador del laboratorio o su hoja de datos | Actualizar porcentaje, piso y k en el JSON; revisar el texto de incertidumbre | Docente |
| **Norma** (IEC 60601-1 e IEC 60601-2-25) | Una vez al año, o si sale una edición o enmienda nueva | Revisar los límites de corriente (`limites_uA`) y las condiciones de primer defecto | Docente |
| **Peso y seguridad** | Antes de cada versión | `npm run sri`, `npm run peso` (≤ 1 600 KiB) y revisar en la pestaña Red que no haya peticiones a otros sitios | Quien publica |
| **GitHub Pages** | Una vez por semestre | Repositorio → *Settings* → *Pages*: sigue publicado y «Enforce HTTPS» está activo | Dueño del repositorio |
| **Firma de commits** | Cuando se agregue un integrante o cambie de computador | Configurar su llave SSH de firma en GitHub y `git config commit.gpgsign true`; verificar que los commits salgan «Verified» | Cada integrante |

## 2. Cómo hacer un cambio
1. Edita los archivos (código en español, cabecera y JSDoc, sin números mágicos; ver CLAUDE.md §8).
2. Si cambiaste un `.js`, el `.css` o el JSON: **`npm run sri`**. Actualiza la versión (`?v=`) de cada URL y las huellas en `index.html` y `ayuda.html`, y la versión en los `import` de los `.js` (por ejemplo `from "./historial.js?v=37beb88db5"`). No edites esas versiones a mano. Si no lo corres, el navegador bloquea el archivo y la página deja de funcionar.
3. `npm test` → todo en verde. Incluye `tests/sintaxis.test.js`, que revisa la sintaxis de todos los `.js` e importa los módulos sin navegador (por ejemplo, detecta dos funciones con el mismo nombre), y `tests/sri.test.js`, que avisa si se olvidó `npm run sri`.
4. Prueba en el navegador con un servidor local: `python -m http.server 8000` y abre `http://localhost:8000`.
5. Anota el cambio en `CHANGELOG.md` (sección *Sin publicar*).
6. Commit pequeño y descriptivo, firmado, y `git push`. GitHub Pages publica solo en unos minutos.
7. **Espera a que GitHub Pages termine** antes de compartir el enlace: en el repositorio, pestaña *Actions*, el flujo «pages build and deployment» debe salir en verde. Después abre la página publicada y recarga con Ctrl + F5.

**Reglas para no romper la página publicada:**
- **No subas cambios el mismo día de una prueba con usuarios** (sesión con estudiantes, prueba de 30 usuarios de ES03 o práctica de laboratorio). Mientras GitHub Pages publica, algunos navegadores pueden recibir una mezcla de archivos viejos y nuevos.
- Después de cada `git push`, espera a que la pestaña *Actions* esté en verde antes de compartir el enlace.
- Cada URL de CSS y JS lleva `?v=` con parte de su huella: si un archivo cambia, cambia su URL y el navegador no usa la copia vieja guardada en caché (que el SRI bloquearía). Por eso `npm run sri` es obligatorio después de cada cambio.

## 3. Cómo cambiar los parámetros del equipo
1. Edita `datos/parametros_r12.json` (unidades SI: F, Ω, A, V, Hz).
2. `npm test`. El módulo M3 valida tipos y rangos y lanza un error claro si algo está mal.
3. Si las pruebas ES01 fallan, es esperado cuando cambian las capacitancias: recalcula la tabla de referencia (CLAUDE.md §5) y actualiza `tests/motor_calculo.test.js`.
4. Si cambian las mediciones del laboratorio, actualiza los datos de `tests/es02_validacion.test.js` y verifica que E_n ≤ 1 en todas las configuraciones.
5. El JSON no lleva huella SRI, pero su ruta en `js/main.js` lleva la versión (`datos/parametros_r12.json?v=…`) para que el navegador no use un JSON viejo guardado en caché: corre `npm run sri` también si solo cambia el JSON.

## 4. Cómo publicar una versión nueva
Las versiones siguen [SemVer](https://semver.org/lang/es/): **MAYOR.MENOR.PARCHE**.
- PARCHE (1.0.1): corrección de un error o de un texto.
- MENOR (1.1.0): algo nuevo que no rompe lo anterior (por ejemplo, un parámetro recalibrado o una sección nueva).
- MAYOR (2.0.0): un cambio grande (otro equipo, otra forma de medir).

Pasos:
1. `npm run sri && npm test && npm run peso`.
2. En `CHANGELOG.md`, cambia *Sin publicar* por `[x.y.z] - AAAA-MM-DD`.
3. Cambia `"version"` en `package.json` y el texto «Versión x.y.z» de `ayuda.html`, `docs/manual_usuario.md` y `README.md` (`npm test` falla si no coinciden: `tests/version.test.js`).
4. Commit firmado: `git commit -m "Versión x.y.z"`.
5. Etiqueta firmada: `git tag -s vx.y.z -m "Versión x.y.z"` y `git push --follow-tags`.
6. Espera a que la pestaña *Actions* esté en verde. Después abre la página publicada y repite la revisión del punto 1 (navegadores).

## 5. Qué NO hay que mantener
- No hay dependencias (`npm install` no instala nada), así que no hay actualizaciones de librerías ni alertas de seguridad de paquetes.
- No hay servidor, base de datos ni cuentas: no hay copias de seguridad que hacer ni datos personales que proteger fuera del navegador del estudiante.
- Las herramientas de medición que se usan una vez (autocannon, Lighthouse) se ejecutan con `npx` y no quedan en el proyecto.
