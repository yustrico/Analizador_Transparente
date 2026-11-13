# Analizador Transparente

Simulador web para aprender la prueba de seguridad eléctrica (IEC 60601-1) del electrocardiógrafo **Mindray BeneHeart R12** (Clase I, partes aplicadas tipo CF a prueba de desfibrilación), como la haría un analizador tipo **Fluke ESA620**, pero "transparente": muestra por dentro el camino de la corriente y explica cada lectura.

Proyecto de Diseño Biomédico 1 — Universidad Autónoma de Occidente (UAO), Cali, 2026.
Autores: Yustin Rico, David Cardona y Santiago González.

**Usarla:** https://yustrico.github.io/Analizador_Transparente/ (Chrome o Edge en computador) · Versión 1.0.0

> **Herramienta educativa.** Complementa la práctica con el analizador real; no sirve para certificar equipos. No es dispositivo médico (Decreto 4725 de 2005).

## Qué hace
- Guía la prueba en orden: inspección visual → resistencia de tierra → aislamiento → corrientes de fuga.
- Calcula la **corriente de contacto** y la **corriente de paciente CF** en cuatro condiciones (normal, polaridad invertida, tierra abierta, neutro abierto), con la incertidumbre que tendría el analizador real.
- Compara cada lectura con el límite de IEC 60601-1 y dice si cumple.
- Dibuja el circuito y anima el camino de la corriente.
- Genera un reporte final que se descarga en PDF y un resumen que se copia al portapapeles para pegarlo en el correo.

Todo corre en el navegador: sin servidor propio, sin base de datos, sin cuentas y sin enviar datos a ningún lado.

## Cómo correrlo en el computador
El navegador no deja leer el archivo `datos/parametros_r12.json` si se abre `index.html` con doble clic, así que hay que servir la carpeta:

```bash
# Opción 1 (Python)
python -m http.server 8000

# Opción 2 (Node.js)
npx serve
```

Luego se abre `http://localhost:8000` en Chrome o Edge.

## Cómo probarlo
Requiere Node.js 20.12 o superior (no hay dependencias que instalar):

```bash
npm test
```

Esto corre las pruebas de la carpeta `tests/` con el ejecutor de pruebas que trae Node (`node --test`).

## Antes de publicar una versión (seguridad y peso)
```bash
npm run sri      # recalcula las huellas SHA-384 (SRI) de los JS y el CSS en index.html
npm run peso     # suma lo que descarga la página y lo compara con la meta ES05 (≤ 1 600 KiB)
```

**Importante:** cada vez que se cambie un archivo `.js` o el `.css` hay que correr `npm run sri`. Si no, el navegador detecta que el archivo no coincide con su huella, se niega a usarlo y la página deja de funcionar. `npm test` avisa si se olvidó (prueba `tests/sri.test.js`).

## Estructura
```
index.html, css/, js/main.js
js/nucleo/        Núcleo (funciones puras): secuencia, modelo del equipo, motor de cálculo, evaluador de límites
js/adaptadores/   Adaptadores: interfaz, visualizador, historial, reporte, generador de PDF
datos/            Parámetros calibrados del R12
tests/            Pruebas unitarias, validación contra el ESA620 (ES01, ES02), PDF y SRI/CSP
tools/            sri.mjs (huellas SRI) y peso.mjs (presupuesto de peso ES05)
docs/             Documentos del proyecto, manual y verificación
```

## Documentación
- [Manual de usuario](docs/manual_usuario.md)
- [Solución de problemas](docs/solucion_problemas.md)
- [Mantenimiento](docs/mantenimiento.md)
- [Verificación de especificaciones ES01–ES15](docs/verificacion.md)
- [Protocolo de prueba con usuarios (18/11/2026)](docs/protocolo_prueba_usuarios.md)
- [Registro de cambios](CHANGELOG.md)

## Licencia
MIT. Ver [LICENSE](LICENSE).
