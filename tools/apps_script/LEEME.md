# Servicio de envío al docente (Google Apps Script)

Este es el **único servicio externo** del Analizador transparente (módulo M12 Envío). Vive en la cuenta de Gmail del proyecto, dentro de una hoja de Google, y hace tres cosas:

1. Recibe el reporte de la práctica (PDF) y se lo envía por correo al docente.
2. Califica el examen, cuenta los intentos por código (máximo 2) y envía el resultado al docente.
3. Guarda cada envío en la pestaña «Registros» de la hoja.

> **La clave de respuestas del examen NO está en este repositorio.** El repositorio es público, así que en `Codigo_AppsScript.gs` la línea queda como `const CLAVE = {};`. La clave real solo existe en el editor de Apps Script de la cuenta del proyecto. Nunca la pegues aquí ni en `datos/examen.json`.

## Cómo publicarlo (una sola vez, con la cuenta de Gmail del proyecto)

1. En Google Drive, crea una hoja de cálculo llamada **«Analizador – Registros»**.
2. En la hoja: **Extensiones → Apps Script**.
3. Borra lo que trae el editor y **pega todo** `Codigo_AppsScript.gs`.
4. **Reemplaza** la línea `const CLAVE = {};` por la clave real (`{"q01": …, …}`), que guarda el equipo fuera de GitHub. Guarda (Ctrl + S).
5. Elige la función `probarPermisos` y presiona **Ejecutar**. Google pide permisos (hoja de cálculo y enviar correo): acéptalos con la cuenta del proyecto. Se crea la pestaña «Registros».
6. **Implementar → Nueva implementación → Tipo: Aplicación web**:
   - Descripción: «Analizador transparente v1».
   - **Ejecutar como: Yo** (la cuenta del proyecto; así los correos salen de ella).
   - **Quién tiene acceso: Cualquier persona** (la página no tiene cuentas; sin esto el navegador del estudiante no puede llamar al servicio).
7. Presiona **Implementar** y copia la **URL de la aplicación web** (termina en `/exec`).
8. Pega esa URL en `js/adaptadores/envio.js`, en `export const URL_SERVICIO = "…";`, y corre `npm run sri` y `npm test` antes del commit.

## Cómo comprobar que funciona

- Abre en el navegador `URL/exec`: debe responder `{"ok":true,"servicio":"Analizador transparente"}`.
- Abre `URL/exec?accion=intentos&codigo=12345`: debe responder `{"ok":true,"intentosUsados":0,"intentosMaximos":2}`.
- Envía un reporte de prueba desde la página a un correo @uao.edu.co del equipo y revisa que llegue con el PDF y que aparezca una fila en «Registros».

## Cuando cambies el código del servicio

- En el editor: **Implementar → Administrar implementaciones → (lápiz) → Versión: Nueva versión → Implementar**. Así la URL `/exec` **no cambia**. Si creas una implementación nueva, la URL cambia y hay que actualizar `URL_SERVICIO`.
- Copia aquí el código nuevo, **otra vez con `const CLAVE = {};`**.

## Límites que impone el servicio

- Correo del docente solo `@uao.edu.co`; consentimiento obligatorio; nombre de 3 a 80 caracteres; código de 5 a 10 dígitos.
- PDF de máximo 2 MB; máximo 5 reportes por código al día; máximo 2 intentos de examen por código.
- Gmail limita los correos por día de la cuenta (unos 100 en cuentas gratuitas). `probarPermisos` muestra cuántos quedan.
