# Manual de usuario — Analizador transparente

Versión 1.0.0 · Noviembre de 2026 · Yustin Rico, David Cardona y Santiago González (UAO)

> **Herramienta educativa.** Complementa la práctica con el analizador real (Fluke ESA620); no sirve para certificar equipos. No es un dispositivo médico.

## 1. ¿Qué es y para qué sirve?
El Analizador transparente simula las pruebas de seguridad eléctrica (IEC 60601-1) del electrocardiógrafo **Mindray BeneHeart R12**, como las haría el analizador del laboratorio. La diferencia es que, en vez de mostrar solo un número, **muestra por dentro el camino de la corriente** y explica por qué la lectura cambia en cada condición de prueba (polaridad invertida, tierra abierta, neutro abierto).

Úsalo para practicar solo, antes o después de la práctica con el equipo real. Puedes pausar cuando quieras: no hay límite de tiempo.

## 2. ¿Qué necesitas?
- Un **computador** con **Google Chrome** o **Microsoft Edge** (Windows).
- Conexión a internet solo para abrir la página; después todo se calcula en tu computador.
- No hay que instalar nada, crear cuenta ni iniciar sesión.
- Dirección: **https://yustrico.github.io/Analizador_Transparente/**
- En un celular la página abre, pero no se adapta a la pantalla; úsala en un computador.

📷 *Captura sugerida 1: la página recién abierta, con las cinco pestañas y el aviso educativo abajo.*

## 3. ¿Cómo se hace la práctica, paso a paso?

### Paso 1 — Conoce el equipo (pestaña «1. Equipo bajo prueba»)
Lee la ficha del R12: es **Clase I** (tiene conductor de protección a tierra) y sus partes aplicadas (electrodos y cable de paciente) son tipo **CF a prueba de desfibrilación**. La tabla compara los límites de las partes B, BF y CF: la CF es la más estricta porque los electrodos pueden quedar cerca del corazón (microchoque). La fuga a tierra tiene el mismo límite para B, BF y CF porque es un límite del equipo completo.

📷 *Captura sugerida 2: la ficha del equipo y la tabla de límites B/BF/CF.*

### Paso 2 — Haz la prueba guiada (pestaña «2. Prueba guiada»)
La prueba guiada tiene **4 pasos en orden fijo**: inspección visual → resistencia de tierra → aislamiento → corrientes de fuga.
1. Lee el **propósito** de seguridad del paso (por qué se hace).
2. Mira el **valor medido** en el laboratorio.
3. Presiona **«Entendido, siguiente paso»**.

No se pueden saltar pasos hacia adelante: un paso nuevo se habilita al completar el anterior. Los pasos completados quedan marcados con ✓ y puedes abrirlos con un clic para repasarlos sin perder tu avance (el botón te devuelve al paso pendiente). Al completar los 4, todos quedan libres. Al llegar al paso 4 se habilitan las pestañas *Analizador* y *Comparar*. Si recargas la página, tu avance se conserva.

📷 *Captura sugerida 3: un paso de la prueba guiada con su propósito, el valor medido y el botón.*

### Paso 3 — Mide en el Analizador (pestaña «3. Analizador»)
1. Elige la **medición**: *corriente de contacto* (lo que pasaría por una persona que toca el chasis), *corriente de paciente CF* (lo que pasa por los electrodos) o *corriente de fuga a tierra* (la que circula por el cable de tierra del equipo hacia la tierra de la instalación).
2. Elige la **condición** con los conmutadores:
   - **Polaridad**: normal o invertida.
   - **Tierra (PE)**: cerrada o abierta.
   - **Neutro**: cerrado o abierto.
   - No se puede abrir la tierra y el neutro a la vez: sería una **doble falla**, que la norma no evalúa. La página te explica por qué.
   - En la **fuga a tierra** la opción «tierra abierta» está deshabilitada: sin conductor de protección no hay por dónde circular la fuga a tierra; por eso, con la tierra abierta, se mide la corriente de contacto. Solo tiene 2 condiciones (normal y neutro abierto), cada una con las 2 polaridades.
3. Presiona **«Medir»**.
4. Lee el resultado:
   - **Lectura ± incertidumbre** en µA (lo que mostraría el analizador real y cuánto podría variar).
   - **Límite** que aplica (condición normal o primer defecto) y **qué tan cerca del límite** está la lectura (en %).
   - **Cumple / No cumple**.
5. Mira el **circuito**: el camino de la corriente se dibuja en **rojo** y muestra cuánta corriente va por cada rama (en la fuga a tierra, el camino rojo va por el conductor de protección). Pasa el mouse sobre cada parte para saber qué es; el cuadro «¿Qué es cada parte?» lo explica también. El recuadro punteado del circuito es lo que está dentro del Fluke ESA620.
6. Lee **«¿Por qué da este valor?»**: la explicación física y la fórmula con los números usados.

📷 *Captura sugerida 4: el Analizador con «tierra abierta» y corriente de contacto: lectura ≈ 14.73 ± 1.32 µA y el camino rojo por la persona (MD).*

**Prueba sugerida:** mide la corriente de contacto en condición normal (≈ 0 µA) y luego con tierra abierta (≈ 14.7 µA). Observa en el circuito por qué cambia: sin tierra, la corriente de fuga ya no tiene un camino de baja resistencia y pasa por la persona.

> La animación se detiene sola si no mueves el mouse durante 30 s (para ahorrar batería) y vuelve al moverlo. Si en Windows tienes desactivados los «Efectos de animación», el camino rojo se muestra quieto.

**¿Cómo se conecta en el laboratorio?**

Debajo del circuito, la tarjeta «Conexiones en el laboratorio» dibuja qué cable va a qué borne o jack del ESA620 y del R12 según la medición elegida, con sus pasos. En la Prueba guiada, los pasos 2 (resistencia de tierra) y 3 (aislamiento) muestran su propio dibujo. Esto es lo mismo, en texto:

*En todas las pruebas:*

1. El ESA620 enchufado a la pared y encendido.
2. El cable de poder del R12 va al tomacorriente de prueba del ESA620, no a la pared.
3. El tomacorriente de prueba arranca sin energía: se energiza con la tecla POLARITY.

*Corriente de contacto:*

1. R12 ENCENDIDO.
2. Los 10 latiguillos en sus bornes: R→RA/R, L→LA/L, F→LL/F, N→RL/N y C1…C6→V1/C1…V6/C6. IEC 60601-1 pide las partes aplicadas conectadas en esta medición.
3. Cable de prueba desde el jack 2 WIRE V/Ω/A rojo hasta una parte metálica accesible del R12 unida a tierra (el borne equipotencial).
4. Tecla µA → «Enclosure».

*Corriente de paciente CF:*

1. R12 ENCENDIDO.
2. Los 10 latiguillos en sus bornes: R→RA/R, L→LA/L, F→LL/F, N→RL/N y C1…C6→V1/C1…V6/C6.
3. Tecla µA → F4 (More) → flechas ▲▼ hasta el grupo que abarca todos los bornes → F1 (Select).
4. Revisar que el modo sea «Leakage AC+DC».

*Corriente de fuga a tierra:*

1. R12 ENCENDIDO.
2. Los 10 latiguillos en sus bornes: R→RA/R, L→LA/L, F→LL/F, N→RL/N y C1…C6→V1/C1…V6/C6.
3. No se agrega ningún cable.
4. Tecla µA y POLARITY para energizar el tomacorriente; la fuga a tierra la mide el ESA620 por el conductor de tierra del cable de poder.

> Polaridad, tierra y neutro se cambian con las teclas POLARITY, EARTH y NEUTRAL del ESA620, sin mover cables.

### Paso 4 — Compara (pestaña «4. Comparar»)
Arriba verás tu **avance**: «Has medido X de las 16 configuraciones que simula esta herramienta», con la lista de las que te faltan y de las que repetiste (y cuántas veces). El bloque «¿Por qué 16?» explica de dónde sale ese número: 12 de contacto y de paciente CF y 4 de fuga a tierra.

Debajo aparece la última lectura de cada configuración que hayas medido, en una tabla y en barras (una gráfica por medición). La franja clara de cada barra es el **margen de incertidumbre** del analizador: si dos lecturas difieren menos que esa franja, la diferencia puede ser del instrumento y no de la condición.

📷 *Captura sugerida 5: la tabla y las barras con varias configuraciones medidas.*

### Paso 5 — Genera tu reporte (pestaña «5. Historial y reporte»)
1. Revisa la tabla con todas tus lecturas, en orden y con la hora. (Al final de la pestaña hay un bloque cerrado, «Datos técnicos (para las especificaciones ES03 y ES09)», con el tiempo que tardó la página en abrir y, después de generar el reporte, el tiempo que tardó en generarse; solo se usan para verificar las especificaciones ES03 y ES09. El tiempo de carga también va en «Copiar resumen».)
2. Presiona **«Finalizar práctica»** y escribe tu nombre (opcional, máximo 60 caracteres). Presiona **«Generar reporte»**.
3. Presiona **«Descargar reporte (PDF)»**: se descarga el archivo `reporte_seguridad_electrica_AAAA-MM-DD.pdf` a tu carpeta de **Descargas**.
4. Presiona **«Copiar resumen»**: se copia un resumen corto.
5. **Para enviarlo:** abre tu correo (Outlook, Gmail o el de la universidad), **pega** el resumen (Ctrl + V) y **adjunta** el PDF.

Después de generar el reporte puedes volver a medir y generarlo otra vez.

📷 *Captura sugerida 6: la vista del reporte con los botones «Descargar reporte (PDF)» y «Copiar resumen».*
📷 *Captura sugerida 7: el PDF abierto en el navegador.*

## 4. ¿Qué pasa con tus datos?
- Tus lecturas se guardan **solo en esta pestaña del navegador**. Nada se envía a ningún servidor.
- **Se borran al cerrar la pestaña.** Descarga tu reporte antes de cerrar. (Recargar la página no las borra).
- El nombre solo aparece en tu reporte.

## 5. ¿Cómo se leen los números?
- **0.00 µA en condición normal:** casi toda la fuga se va por la tierra. El analizador real muestra ≈ 0.1 µA por su resolución.
- **± U (incertidumbre):** cuánto podría diferir la lectura del analizador real, según su exactitud ±(1 % de la lectura + 1 µA) y la guía GUM.
- **Límites (IEC 60601-1):** corriente de contacto 100 µA (normal) y 500 µA (primer defecto); corriente de paciente CF 10 µA (normal) y 50 µA (primer defecto); corriente de fuga a tierra 5 mA (normal) y 10 mA (primer defecto), según la 3.ª edición de la norma. El límite de fuga a tierra es del equipo completo: no depende del tipo de parte aplicada (B, BF o CF).<br><small>Nota: el manual del R12 usa límites más estrictos, 0.5 mA en condición normal y 1 mA en primer defecto, porque se basa en la edición anterior de la norma. El R12 cumple con ambos.</small>
- **Qué tan cerca del límite:** una corriente pequeña puede estar más cerca de su límite que una grande: compara la corriente de paciente CF (límite 10 µA) con la de contacto (límite 100 µA).

## 6. ¿De dónde salen los datos?
Los valores del simulador están calibrados con mediciones reales del Fluke ESA620 sobre el electrocardiógrafo Mindray BeneHeart R12 serie FN-84011415 (3 repeticiones por condición). Los parámetros del modelo (C<sub>L</sub>, C<sub>N</sub>, C<sub>AP</sub>, ΔI y k<sub>N</sub>) se calcularon con mediciones del R12 en polaridad normal y se comprobaron con las mediciones en polaridad invertida (E<sub>n</sub> ≤ 0,19 en las 16 configuraciones). El detalle de las mediciones y de la calibración está en `docs/06_Datos_ECG_R12_calibracion.md`.

## 7. ¿Qué hago si algo no funciona?
Consulta [solucion_problemas.md](solucion_problemas.md).
