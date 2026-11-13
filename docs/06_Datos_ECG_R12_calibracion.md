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
