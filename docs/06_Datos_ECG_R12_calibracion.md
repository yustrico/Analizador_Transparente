# Corrección 06 — Datos reales con repeticiones del ECG Mindray BeneHeart R12 y calibración del modelo

Fecha: 06/11/2026
Fuente: "Seguridad_Electrica_ECG_Clinica_2.xlsx" (práctica de Ingeniería Clínica 2). Equipo: Mindray BeneHeart R12, serie FN-84011415, Clase I, CF. Analizador: Fluke ESA620, serie 1433038.
Hay 3 repeticiones por condición (n = 3). REEMPLAZA a los datos del informe del archivo 05: aquí están todas las condiciones y las lecturas una por una.

## 1. Datos (AC), media ± desviación estándar (n = 3)
Incertidumbre recalculada: u_A = s/√3 y u_B = exactitud del ESA620 (1 % + 1 µA)/√3; U = 2·√(u_A² + u_B²).
NO usar las columnas de incertidumbre del Excel original: u_A se calculó como media/√6 y u_B como 0.1 µA (la resolución, no la exactitud).

| Prueba | Condición | Pol. normal (µA) | Pol. invertida (µA) |
|---|---|---|---|
| Fuga a tierra | Normal | 14.73 ± 0.49 | 14.90 ± 0.10 |
| Fuga a tierra | Neutro abierto | 27.13 ± 0.71 | 27.43 ± 0.45 |
| Contacto (chasis) | Normal | 0.12 ± 0.03 | 0.12 ± 0.03 |
| Contacto (chasis) | Tierra abierta | 14.47 ± 0.45 | 14.97 ± 0.06 |
| Contacto (chasis) | Neutro abierto | 0.10 ± 0.00 | 0.10 ± 0.00 |
| Paciente CF | Normal | 1.27 ± 0.21 | 1.20 ± 0.10 |
| Paciente CF | Tierra abierta | 2.10 ± 0.10 | 2.13 ± 0.15 |
| Paciente CF | Neutro abierto | 1.20 ± 0.10 | 1.07 ± 0.12 |

Otros datos:
- Resistencia de tierra de protección: 0.002 / 0.0007 / 0.005 Ω. Está por debajo de la exactitud del ESA620, así que se reporta "< 0.015 Ω".
- Aislamiento: red–tierra = OL (fuera de rango), partes aplicadas–tierra = 94.7 MΩ, red–partes aplicadas = OL.
- En DC todo dio ≈ 0 a 0.1 µA (resolución del analizador).

## 2. Qué confirman los datos reales
1. CONFIRMADO: con tierra abierta, TODA la fuga a tierra pasa por la persona (MD). Fuga a tierra normal = 14.73 µA y contacto con tierra abierta = 14.47 µA. Es exactamente lo que dice el modelo.
2. CONFIRMADO: neutro abierto con tierra conectada → contacto ≈ 0.1 µA (al nivel de la resolución). Los 145 µA de antes estaban MAL; el dato real lo demuestra.
3. NUEVO: en este equipo invertir la polaridad casi no cambia nada (14.73 frente a 14.90 µA), porque sus capacitores de fuga son simétricos (C_L ≈ C_N). El "45 µA con polaridad invertida" del Corte 2 NO aplica al R12. Hay que cambiar el guion, el Word y la pantalla "Comparar".
4. El cambio grande que debe enseñar el simulador es la TIERRA ABIERTA: el contacto pasa de 0.12 a 14.5 µA (unas 120 veces más) y el paciente CF de 1.27 a 2.10 µA.

## 3. Calibración del modelo (parametrización)
Se calibra SOLO con los datos de polaridad normal y se valida con los de polaridad invertida (datos que no se usaron para calibrar).
| Parámetro | Valor | Cómo se obtuvo |
|---|---|---|
| C_L = C_N (simetría) | 325.7 pF | Fuga a tierra normal / (120 V · 2π · 60 Hz) = 14.73 µA / 45 239 |
| C_AP (red–parte aplicada) | 28.0 pF | Paciente normal / 45 239 = 1.27 µA / 45 239 |
| ΔI_paciente con tierra abierta | +0.83 µA | 2.10 − 1.27 µA (término empírico) |
| k_N (fuga a tierra con neutro abierto) | 0.8418 | 27.13 / 14.73 − 1 (factor empírico; ver §8, agregado el 14/11/2026) |
| R_PE | 0.0026 Ω | Media medida |
| R_MD | 1 kΩ | IEC 60601-1 |

## 4. Verificación de ES02 con estos datos (sin volver al laboratorio)
| Configuración (pol. invertida + neutro abierto pol. normal) | Modelo (µA) | Medido (µA) | U (µA) | E_n | ¿Cumple (≤ 1)? |
|---|---|---|---|---|---|
| Contacto, normal | 0.00 | 0.12 | 1.16 | 0.10 | Sí |
| Contacto, tierra abierta | 14.73 | 14.97 | 1.33 | 0.18 | Sí |
| Contacto, neutro abierto | 0.00 | 0.10 | 1.16 | 0.09 | Sí |
| Paciente CF, normal | 1.27 | 1.20 | 1.17 | 0.06 | Sí |
| Paciente CF, tierra abierta | 2.10 | 2.13 | 1.19 | 0.03 | Sí |
| Paciente CF, neutro abierto | 1.27 | 1.07 | 1.17 | 0.17 | Sí |
| Contacto, neutro abierto (pol. normal) | 0.00 | 0.10 | 1.16 | 0.09 | Sí |
Resultado: 7 de 7 con E_n ≤ 0.18.

Límite del modelo (decirlo con honestidad): la fuga a tierra con neutro abierto se predice en 29.5 µA y se midió 27.1 µA (E_n = 1.39). Causa probable: la fuente interna del equipo no deja el lado del neutro exactamente a la tensión de fase. No afecta a ES02, porque el simulador muestra las corrientes de contacto y de paciente, no la fuga a tierra.
**Actualización 14/11/2026:** el simulador ahora sí muestra la fuga a tierra. Este límite se corrige con el factor empírico k_N (§8): E_n = 0.19 con neutro abierto y polaridad invertida.

## 5. Cambios que esto produce
- ES02: n = 3 (los datos existentes) en vez de n = 10. Se verifica con estos datos: NO hace falta otra sesión de laboratorio.
- Pantallas "Analizador" y "Comparar", guion y Word: tierra abierta = 14.7 µA (no 99.5); polaridad invertida ≈ igual que la normal (no 45 µA); neutro abierto ≈ 0.1 µA (no 145).
- RF03/RF04: el simulador puede mostrar la banda ± U de cada lectura (unos ±1.2 µA). Con lecturas de 0.1 a 2 µA esa banda es mayor que el cambio, lo que sirve para N07 (distinguir la condición de prueba del error de medición).
- El informe del archivo 05 queda solo como antecedente: USAR ESTE ARCHIVO.

## 6. Clasificación oficial del R12 (manual del fabricante, verificado el 12/11/2026)
Fuente: Mindray, "BeneHeart R12/BeneHeart R12A Electrocardiograph Operator's Manual" (2013–2020).
- Apéndice A.1: CLASS I EQUIPMENT (Clase I) y DEFIBRILLATION-PROOF TYPE CF APPLIED PART (parte aplicada tipo CF a prueba de desfibrilación). Partes aplicadas: electrodos de ECG y cable de paciente.
- Apéndice D (inspección de seguridad eléctrica, cada 2 años):
  - tierra de protección ≤ 0.2 Ω;
  - fuga a tierra 500/1000 µA (valores de la 2.ª edición de IEC 60601-1 que usa el manual; la 3.ª edición permite 5/10 mA);
  - fuga de paciente CF 10/50 µA;
  - red en parte aplicada CF 50 µA;
  - corriente auxiliar de paciente CF 10/50 µA.
- El manual supone "un analizador de seguridad 601PRO XL o un analizador equivalente". El Fluke ESA620 del laboratorio es un analizador equivalente.

## 7. Mínimos de resistencia de aislamiento (paso 3 de la prueba guiada, agregado el 14/11/2026)
El manual del R12 no fija un límite propio para la resistencia de aislamiento. Se usan los **valores mínimos esperados de IEC 62353:2014, Tabla 2**, para un equipo **Clase I con parte aplicada CF**. El R12 es Clase I con parte aplicada tipo CF a prueba de desfibrilación según su manual (Apéndice A.1, sección 6 de este documento).

| Par de puntos | Mínimo esperado | Medido en el R12 | ¿Cumple? |
|---|---|---|---|
| Red – tierra (chasis) | ≥ 2 MΩ | > 100 MΩ (OL) | Sí |
| Partes aplicadas – tierra | ≥ 70 MΩ | 94.7 MΩ | Sí |
| Red – partes aplicadas | ≥ 70 MΩ | > 100 MΩ (OL) | Sí |

- Fuente: **IEC 62353:2014, Tabla 2** (*Medical electrical equipment – Recurrent test and test after repair of medical electrical equipment*), verificada con EBME (ebme.co.uk) y con el manual del analizador Testboy TV 470.
- Corrección (14/11/2026): una versión anterior de esta tabla traía «Figura 12, 14 y 16». Esos números eran de las figuras del artículo de EBME, no de la norma, y se quitaron de la tabla, del JSON, de la pantalla y de las pruebas.
- En IEC 62353 la medición de aislamiento es **opcional**; la norma la da como referencia. Por eso la herramienta la muestra con el texto: "Valores mínimos esperados de IEC 62353:2014 (Tabla 2) para equipos Clase I con parte CF. En esta norma la medición de aislamiento es opcional y el manual del R12 no fija un límite propio."
- En `datos/parametros_r12.json` cada par de `pasos_previos_medidos.aislamiento_Mohm` trae `valor` y `minimo` (MΩ). El veredicto lo calcula M5 (`evaluarAislamiento`): "> 100 (OL)" se toma como "al menos 100 MΩ".

## 8. Fuga a tierra y factor empírico k_N (agregado el 14/11/2026)
La herramienta agrega la medición de **corriente de fuga a tierra** (la que circula por el conductor de protección). Solo existe con la tierra conectada: condición normal y neutro abierto, cada una con las 2 polaridades (4 configuraciones). Con la tierra abierta no hay conductor por donde circule; esa fuga es la que pasa por la persona y se mide como corriente de contacto.

**Modelo:**
- Condición normal: I = V·2πf·C_activa (C_L con polaridad normal, C_N con polaridad invertida).
- Neutro abierto: I = V·2πf·(C_activa + k_N·C_otra).
- Si el lado del neutro quedara exactamente a la tensión de fase, sería k_N = 1 e I = V·2πf·(C_L + C_N) = 29.47 µA. Se midió 27.13 µA (E_n = 1.39 con polaridad normal y 1.31 con polaridad invertida: no cumple). Causa probable (§4): la fuente interna del equipo no deja el lado del neutro exactamente a la tensión de fase.

**De dónde sale k_N:** se calibra **solo con la polaridad normal**, igual que C_L, C_N y C_AP (§3):
k_N = I_neutro abierto / I_normal − 1 = 27.13 µA / 14.73 µA − 1 = **0.8418** (≈ 0.84).
Se guarda en `datos/parametros_r12.json` como `factor_neutro_abierto_fuga_tierra`, con su origen en `origen_factor_neutro_abierto`, igual que el ΔI de paciente.

**Validación con la polaridad invertida** (datos que no se usaron para calibrar). U_med = 2·√((s/√3)² + ((0.01·media + 1 µA)/√3)²):

| Polaridad | Condición | Modelo (µA) | Medido (µA), n = 3 | U_med (µA) | E_n | Uso |
|---|---|---|---|---|---|---|
| Normal | Normal | 14.734 | 14.73 ± 0.49 | 1.441 | 0.003 | Calibración (C_L) |
| Normal | Neutro abierto | 27.138 | 27.13 ± 0.71 | 1.681 | 0.005 | Calibración (k_N) |
| Invertida | Normal | 14.734 | 14.90 ± 0.10 | 1.332 | 0.124 | **Validación** |
| Invertida | Neutro abierto | 27.138 | 27.43 ± 0.45 | 1.560 | **0.187** | **Validación** |

Resultado: las 4 con E_n ≤ 1. Las 2 de polaridad normal valen ≈ 0 por construcción (son los datos de calibración); las 2 de polaridad invertida son la validación independiente (E_n máximo 0.187).

**Límites (IEC 60601-1, 3.ª edición):** 5 mA en condición normal y 10 mA con primer defecto, iguales para partes B, BF y CF (es un límite del equipo completo). El manual del R12 indica 500/1000 µA porque usa la 2.ª edición de la norma (§6).
