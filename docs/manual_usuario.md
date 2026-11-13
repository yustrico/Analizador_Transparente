# Manual de usuario — Analizador transparente

Versión 1.0.0 · Noviembre de 2026 · Yustin Rico, David Cardona y Santiago González (UAO)

> **Herramienta educativa.** Complementa la práctica con el analizador real (Fluke ESA620); no sirve para certificar equipos. No es un dispositivo médico.

## 1. Qué es y para qué sirve
El Analizador transparente simula la prueba de seguridad eléctrica (IEC 60601-1) del electrocardiógrafo **Mindray BeneHeart R12**, como la haría el analizador del laboratorio. La diferencia es que, en vez de mostrar solo un número, **muestra por dentro el camino de la corriente** y explica por qué la lectura cambia en cada condición de prueba (polaridad invertida, tierra abierta, neutro abierto).

Úsalo para practicar solo, antes o después de la práctica con el equipo real. Puedes pausar cuando quieras: no hay límite de tiempo.

## 2. Qué necesitas
- Un **computador** con **Google Chrome** o **Microsoft Edge** (Windows). No funciona en celular.
- Internet solo para abrir la página. Después de cargar, todos los cálculos se hacen en tu computador.
- No hay que instalar nada, crear cuenta ni iniciar sesión.

## 3. Cómo abrirla
1. Abre Chrome o Edge.
2. Escribe la dirección: **https://yustrico.github.io/Analizador_Transparente/**
3. Verás el encabezado azul y cinco pestañas: *1. Equipo bajo prueba*, *2. Prueba guiada*, *3. Analizador*, *4. Comparar* y *5. Historial y reporte*.

📷 *Captura sugerida 1: la página recién abierta, con las cinco pestañas y el aviso educativo abajo.*

## 4. Paso a paso de la práctica

### Paso 1 — Conoce el equipo (pestaña «1. Equipo bajo prueba»)
Lee la ficha del R12: es **Clase I** (tiene conductor de protección a tierra) y sus partes aplicadas (electrodos y cable de paciente) son tipo **CF a prueba de desfibrilación**. La tabla compara los límites de las partes B, BF y CF: la CF es la más estricta porque los electrodos pueden quedar cerca del corazón (microchoque).

📷 *Captura sugerida 2: la ficha del equipo y la tabla de límites B/BF/CF.*

### Paso 2 — Haz la prueba guiada (pestaña «2. Prueba guiada»)
La prueba tiene **4 pasos en orden fijo**: inspección visual → resistencia de tierra → aislamiento → corrientes de fuga.
1. Lee el **propósito** de seguridad del paso (por qué se hace).
2. Mira el **valor medido** en el laboratorio.
3. Presiona **«Entendido, siguiente paso»**.

No se puede saltar pasos. Al llegar al paso 4 se habilitan las pestañas *Analizador* y *Comparar*. Si recargas la página, tu avance se conserva.

📷 *Captura sugerida 3: un paso de la prueba guiada con su propósito, el valor medido y el botón.*

### Paso 3 — Mide en el Analizador (pestaña «3. Analizador»)
1. Elige la **medición**: *corriente de contacto* (lo que pasaría por una persona que toca el chasis) o *corriente de paciente CF* (lo que pasa por los electrodos).
2. Elige la **condición** con los conmutadores:
   - **Polaridad**: normal o invertida.
   - **Tierra (PE)**: cerrada o abierta.
   - **Neutro**: cerrado o abierto.
   - No se puede abrir la tierra y el neutro a la vez: sería una **doble falla**, que la norma no evalúa. La página te explica por qué.
3. Presiona **«Medir»**.
4. Lee el resultado:
   - **Lectura ± incertidumbre** en µA (lo que mostraría el analizador real y cuánto podría variar).
   - **Límite** que aplica (condición normal o primer defecto) y **% del límite** usado.
   - **Cumple / No cumple**.
5. Mira el **circuito**: el camino de la corriente se dibuja en **rojo** y muestra cuánta corriente va por cada rama. Pasa el mouse sobre cada parte para saber qué es; el cuadro «¿Qué es cada parte?» lo explica también.
6. Lee **«¿Por qué da este valor?»**: la explicación física y la fórmula con los números usados.

📷 *Captura sugerida 4: el Analizador con «tierra abierta» y corriente de contacto: lectura ≈ 14.73 ± 1.32 µA y el camino rojo por la persona (MD).*

**Prueba sugerida:** mide la corriente de contacto en condición normal (≈ 0 µA) y luego con tierra abierta (≈ 14.7 µA). Observa en el circuito por qué cambia: sin tierra, la corriente de fuga ya no tiene un camino de baja resistencia y pasa por la persona.

> La animación se detiene sola si no mueves el mouse durante 30 s (para ahorrar batería) y vuelve al moverlo. Si en Windows tienes desactivados los «Efectos de animación», el camino rojo se muestra quieto.

### Paso 4 — Compara (pestaña «4. Comparar»)
Aquí aparece la última lectura de cada configuración que hayas medido, en una tabla y en barras. La franja clara de cada barra es el **margen de incertidumbre** del analizador: si dos lecturas difieren menos que esa franja, la diferencia puede ser del instrumento y no de la condición.

📷 *Captura sugerida 5: la tabla y las barras con varias configuraciones medidas.*

### Paso 5 — Genera tu reporte (pestaña «5. Historial y reporte»)
1. Revisa la tabla con todas tus lecturas, en orden y con la hora.
2. Presiona **«Finalizar práctica»** y escribe tu nombre (opcional, máximo 60 caracteres). Presiona **«Generar reporte»**.
3. Presiona **«Descargar reporte (PDF)»**: se descarga el archivo `reporte_seguridad_electrica_AAAA-MM-DD.pdf` a tu carpeta de **Descargas**.
4. Presiona **«Copiar resumen»**: se copia un resumen corto.
5. **Para enviarlo:** abre tu correo (Outlook, Gmail o el de la universidad), **pega** el resumen (Ctrl + V) y **adjunta** el PDF.

Después de generar el reporte puedes volver a medir y generarlo otra vez.

📷 *Captura sugerida 6: la vista del reporte con los botones «Descargar reporte (PDF)» y «Copiar resumen».*
📷 *Captura sugerida 7: el PDF abierto en el navegador.*

## 5. Importante sobre tus datos
- Tus lecturas se guardan **solo en esta pestaña del navegador**. Nada se envía a ningún servidor.
- **Se borran al cerrar la pestaña.** Descarga tu reporte antes de cerrar. (Recargar la página no las borra).
- El nombre solo aparece en tu reporte.

## 6. Cómo leer los números
- **0.00 µA en condición normal:** casi toda la fuga se va por la tierra. El analizador real muestra ≈ 0.1 µA por su resolución.
- **± U (incertidumbre):** cuánto podría diferir la lectura del analizador real, según su exactitud ±(1 % de la lectura + 1 µA) y la guía GUM.
- **Límites (IEC 60601-1):** corriente de contacto 100 µA (normal) y 500 µA (primer defecto); corriente de paciente CF 10 µA (normal) y 50 µA (primer defecto).

## 7. Si algo no funciona
Consulta [solucion_problemas.md](solucion_problemas.md).
