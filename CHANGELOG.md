# Registro de cambios

Todos los cambios importantes del proyecto se anotan aquí.
Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y versiones según [SemVer](https://semver.org/lang/es/).

## [Sin publicar]

### Agregado
- Fase 1 (núcleo + pruebas, 62 pruebas en verde):
  - `datos/parametros_r12.json` con los parámetros calibrados del R12 y los límites de IEC 60601-1, incluidos los de partes B y BF para comparar (RF07).
  - M3 `modelo_equipo.js`: carga y valida los parámetros (tipos y rangos) y los entrega congelados.
  - M4 `motor_calculo.js`: corriente de contacto y de paciente CF por condición, incertidumbre ± U del analizador y corriente por rama; rechaza la doble falla.
  - M5 `evaluador_limites.js`: límite aplicable (normal o primer defecto), % del límite, veredicto y límites equivalentes B/BF/CF.
  - M2 `secuencia.js`: 4 pasos en orden fijo con su propósito; no deja saltar pasos.
  - Pruebas ES01 (error ≤ 1 % frente a la tabla de referencia; máximo obtenido 0.41 %) y ES02 (E_n ≤ 1 en las 12 configuraciones medidas; máximo 0.19).
- Fase 0: estructura de carpetas (núcleo, adaptadores, datos, pruebas, herramientas), README, package.json con `npm test` (`node --test`, sin dependencias), .gitignore y .gitattributes.
