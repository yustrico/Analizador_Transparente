# Conexiones de las pruebas en el laboratorio (23/11/2026)

Equipos: Fluke ESA620 (analizador) y Mindray BeneHeart R12 (equipo bajo prueba).
Base común: el ESA620 enchufado a la pared y encendido; el cable de poder del R12 enchufado al **tomacorriente de prueba del ESA620** (no a la pared).

| Prueba | Conexiones | Teclas en el ESA620 | Resultado del 23/11 |
|---|---|---|---|
| A. Resistencia de tierra (paso 2) | Cable de prueba desde el jack 2 WIRE V/Ω/A rojo hasta el borne equipotencial del R12 (antes, poner el cable en cero en Ø/NULL con «Zero Leads») | Ω → Zero Leads → TEST | No se pudo repetir: el cable que había tenía un conector de pines y no encajaba; la pantalla mostró «NC» (Not Connected). Se dibuja según el manual del ESA620. |
| B. Resistencia de aislamiento (paso 3) | R12 **apagado**; los 10 latiguillos del ECG en sus bornes (R→RA/R, L→LA/L, F→LL/F, N→RL/N, C1…C6→V1/C1…V6/C6) | MΩ → F1 TEST, F2 TEST, F3 TEST (500 V DC) | F1 (red–tierra) = OL; F2 (partes aplicadas–tierra) = 95.2 MΩ; F3 (red–partes aplicadas) = OL |
| E. Fuga a tierra | Mismas conexiones que la B, con el R12 **encendido** | µA → POLARITY (para energizar el tomacorriente de prueba) | Se puede hacer con esas conexiones |
| D. Corriente de paciente CF | Mismas conexiones (10 latiguillos en los bornes, R12 encendido) | µA → F4 (More) → flechas ▲▼ hasta el grupo que abarca más bornes → F1 (Select). Con ▲▼ elegir «Leakage AC+DC» si está en otro modo | 0.5 µA (AC+DC), tierra y neutro cerrados |
| C. Corriente de contacto | Cable de prueba desde 2 WIRE V/Ω/A hasta una parte metálica del R12 unida a tierra (borne equipotencial) | µA → Enclosure | No se repitió (mismo problema de cable que la A) |

Notas:
- El tomacorriente de prueba del ESA620 arranca sin energía: hay que oprimir POLARITY para energizarlo.
- Los valores del 23/11 son solo para documentar el montaje. La herramienta sigue usando los datos de la práctica del 06/11 (3 repeticiones, docs/06).
- Foto: B_aislamiento_montaje.png (latiguillos del R12 en los 10 bornes del ESA620, pantalla en «Apply 500 VDC»).
