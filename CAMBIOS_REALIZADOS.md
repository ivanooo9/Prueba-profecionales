# Cambios realizados

## Vista de Beneficios

- Se hizo la vista más sencilla y ordenada.
- Se agregaron sombras alrededor de los cards.
- Se hicieron más visibles los bordes.
- Se centró el contenido de los cards.
- Los cards se adaptan mejor a la cantidad de texto.
- Se ajustó el tamaño de los nombres de los convenios.
- El recuadro naranja de descuento quedó debajo de la categoría y antes del nombre del convenio.
- Los recuadros de “Condición para Canjear” tienen un fondo y borde más visibles.
- Se mantuvieron los datos que vienen de la base de datos.

## Vista de Contacto

- Se agregaron bordes y sombras al card de información de contacto.
- Se agregaron bordes y sombras al formulario.
- Los campos del formulario tienen bordes más visibles.
- El título “Contáctanos” quedó dentro de un card.
- La sección “¿Por qué contactarnos?” quedó dentro de un card separado.
- Se incluyeron las razones:
  - Soporte técnico especializado.
  - Consultas sobre preinscripción.
  - Alianzas y convenios.
- Se ajustó el tamaño y la posición de los cards para alinearlos mejor con el formulario.
- Se restauró el título “Envíanos un mensaje” en el formulario.

## Efecto de Difuminado en Inicio (Scroll-Driven Blur)

- Se agregó un efecto de difuminado y opacidad gradual a la sección inferior de llamado a la acción (CTA) y al pie de página (footer) en la página de inicio (`index.ejs`).
- El efecto inicia difuminado (`blur(12px)`) y con baja opacidad (`0.3`) y se aclara progresivamente de forma continua al aproximarse al final de la página (entre el 70% y el 100% de la altura de scroll del documento).
- Se implementó utilizando CSS Scroll-Driven Animations nativo (`scroll()`) en navegadores compatibles.
- Se agregó un fallback de alto rendimiento utilizando un listener de eventos de scroll en JavaScript para navegadores sin soporte nativo (como Firefox) que interpola el desenfoque y la opacidad dinámicamente.
- Se respetó la preferencia del sistema de los usuarios mediante la media query `prefers-reduced-motion` para desactivar el efecto si así está configurado en el sistema operativo.

## Optimización de Scroll Reveal en Inicio

- Se ajustó y optimizó la transición del efecto "Scroll Reveal" nativo de la página de inicio (`index.ejs`), haciéndola más suave y fluida mediante una función de aceleración personalizada (`cubic-bezier(0.215, 0.61, 0.355, 1)`) similar a los estándares premium modernos.
- Se agregó la directiva de rendimiento `will-change: transform, opacity` a las clases CSS para habilitar aceleración por hardware (GPU compositor) y evitar saltos visuales durante el scroll.
- Se ajustó el umbral del `IntersectionObserver` de `0.12` a `0.05` y se agregó un margen inferior negativo (`rootMargin: '0px 0px -40px 0px'`). Esto asegura que los elementos se revelen de forma consistente en todo tipo de pantallas (incluyendo móviles) exactamente cuando el elemento se haya desplazado ligeramente dentro de la vista.

## Compatibilidad

- Los cambios fueron visuales y aplicados de manera progresiva.
- Se conservaron las rutas y la información existente.
- Se conservaron los formularios y sus funciones.
- Las vistas siguen trabajando junto al backend.
