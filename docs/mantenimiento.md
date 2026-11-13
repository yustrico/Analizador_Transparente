# Mantenimiento — Analizador transparente

Versión 1.0.0 · Noviembre de 2026

La herramienta no tiene servidor, base de datos ni librerías externas, así que el mantenimiento es corto. Lo que puede cambiar con el tiempo es: **los navegadores**, **los parámetros del equipo** (si se recalibra) y **la norma**. Este documento dice qué revisar, cada cuánto y cómo publicar una versión nueva.

## 1. Calendario de revisión

| Qué | Cada cuánto | Cómo | Quién |
|---|---|---|---|
| **Navegadores** (Chrome y Edge en Windows) | Al inicio de cada semestre, y si un estudiante reporta un error | Abrir la página publicada en las versiones actuales de Chrome y Edge, hacer una práctica completa (los 4 pasos, las 12 configuraciones, reporte PDF y «Copiar resumen») y revisar que la consola (F12) no tenga errores | Monitor de la asignatura o el equipo |
| **Pruebas automáticas** | Antes de cada cambio que se publique | `npm test` (debe salir todo en verde) | Quien hace el cambio |
| **Parámetros del R12** (`datos/parametros_r12.json`) | Cada vez que el laboratorio mida de nuevo el equipo, y como mínimo una vez al año (junto con la calibración del ESA620) | Repetir las mediciones de ES02 (corriente de contacto y de paciente en las 12 configuraciones, n ≥ 3), actualizar el JSON y los datos de ES02, y correr `npm test` | Equipo del proyecto / docente |
| **Exactitud del analizador** (`exactitud_analizador`) | Si cambia el modelo del analizador del laboratorio o su hoja de datos | Actualizar porcentaje, piso y k en el JSON; revisar el texto de incertidumbre | Docente |
| **Norma** (IEC 60601-1 e IEC 60601-2-25) | Una vez al año, o si sale una edición o enmienda nueva | Revisar los límites de corriente (`limites_uA`) y las condiciones de primer defecto | Docente |
| **Peso y seguridad** | Antes de cada versión | `npm run sri`, `npm run peso` (≤ 1 600 KiB) y revisar en la pestaña Red que no haya peticiones a otros sitios | Quien publica |
| **GitHub Pages** | Una vez por semestre | Repositorio → *Settings* → *Pages*: sigue publicado y «Enforce HTTPS» está activo | Dueño del repositorio |
| **Firma de commits** | Cuando se agregue un integrante o cambie de computador | Configurar su llave SSH de firma en GitHub y `git config commit.gpgsign true`; verificar que los commits salgan «Verified» | Cada integrante |

## 2. Cómo hacer un cambio
1. Edita los archivos (código en español, cabecera y JSDoc, sin números mágicos; ver CLAUDE.md §8).
2. Si cambiaste un `.js` o el `.css`: **`npm run sri`** (si no, el navegador bloquea el archivo y la página deja de funcionar).
3. `npm test` → todo en verde.
4. Prueba en el navegador con un servidor local: `python -m http.server 8000` y abre `http://localhost:8000`.
5. Anota el cambio en `CHANGELOG.md` (sección *Sin publicar*).
6. Commit pequeño y descriptivo, firmado, y `git push`. GitHub Pages publica solo en unos minutos.

## 3. Cómo cambiar los parámetros del equipo
1. Edita `datos/parametros_r12.json` (unidades SI: F, Ω, A, V, Hz).
2. `npm test`. El módulo M3 valida tipos y rangos y lanza un error claro si algo está mal.
3. Si las pruebas ES01 fallan, es esperado cuando cambian las capacitancias: recalcula la tabla de referencia (CLAUDE.md §5) y actualiza `tests/motor_calculo.test.js`.
4. Si cambian las mediciones del laboratorio, actualiza los datos de `tests/es02_validacion.test.js` y verifica que E_n ≤ 1 en todas las configuraciones.
5. El JSON no lleva huella SRI, así que no hace falta `npm run sri` si solo cambia el JSON.

## 4. Cómo publicar una versión nueva
Las versiones siguen [SemVer](https://semver.org/lang/es/): **MAYOR.MENOR.PARCHE**.
- PARCHE (1.0.1): corrección de un error o de un texto.
- MENOR (1.1.0): algo nuevo que no rompe lo anterior (por ejemplo, un parámetro recalibrado o una sección nueva).
- MAYOR (2.0.0): un cambio grande (otro equipo, otra forma de medir).

Pasos:
1. `npm run sri && npm test && npm run peso`.
2. En `CHANGELOG.md`, cambia *Sin publicar* por `[x.y.z] - AAAA-MM-DD`.
3. Cambia `"version"` en `package.json`.
4. Commit firmado: `git commit -m "Versión x.y.z"`.
5. Etiqueta firmada: `git tag -s vx.y.z -m "Versión x.y.z"` y `git push --follow-tags`.
6. Abre la página publicada y repite la revisión del punto 1 (navegadores).

## 5. Qué NO hay que mantener
- No hay dependencias (`npm install` no instala nada), así que no hay actualizaciones de librerías ni alertas de seguridad de paquetes.
- No hay servidor, base de datos ni cuentas: no hay copias de seguridad que hacer ni datos personales que proteger fuera del navegador del estudiante.
- Las herramientas de medición que se usan una vez (autocannon, Lighthouse) se ejecutan con `npx` y no quedan en el proyecto.
