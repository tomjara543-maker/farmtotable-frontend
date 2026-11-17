# FarmToTable: directrices de diseño

Tienda online de frutas y vegetales frescos. Estilo moderno, limpio y cercano: debe sentirse como una tienda de barrio
de alta gama, no como un supermercado.

## Principios

1. **Mucho aire.** Secciones con 80–112 px de margen vertical (`py-20` / `py-24`). El espacio vacío también comunica frescura.
2. **Un acento por vista.** El verde profundo (`#235347`) marca la acción principal; lo demás se queda en tonos suaves.
3. **Cero emojis.** Solo iconos de línea (trazos de Lucide, grosor 1.5–1.75, puntas redondeadas) en `src/components/landing/icons.tsx`.
4. **Bordes suaves.** Radio 24 px en tarjetas (`rounded-3xl`), 16 px en imágenes, píldora en botones (`rounded-full`).
5. **Sombras casi invisibles.** Solo en hover (`shadow-xl shadow-ink/5`); la separación se hace con bordes `--line`.

## Paleta (estricta)

| Token Tailwind | HEX | Uso |
| --- | --- | --- |
| `ink` | `#051F20` | Texto principal, pie de página |
| `deep` | `#0B2B26` | Sección de contraste (Nosotros) |
| `forest` | `#163832` | Tarjetas oscuras, hover de botones |
| `pine` | `#235347` | Botones principales, acentos, bordes destacados |
| `sage` | `#8EB69B` | Subtítulos sobre oscuro, detalles, estados inactivos |
| `mint` | `#DAF1DE` | Fondos claros, contenedores de iconos, placeholders |

Escala tonal interna (mezclas de los mismos tonos, sin colores externos):

| Variable | HEX | Origen |
| --- | --- | --- |
| `--bg` | `#EEF8F0` | menta claro aclarado: fondo general |
| `--surface` | `#F8FCF9` | menta claro muy aclarado: tarjetas |
| `--line` | `#C3DEC9` | menta + salvia: bordes |
| `--muted` | `#3A6658` | profundo + salvia: texto secundario (contraste AA sobre claros) |

Los estados de error, aviso e información también se resuelven con la paleta (sin rojos, amarillos ni azules). En modo
oscuro los papeles se invierten: fondo `ink`, superficies `deep` / `forest`, texto `mint`.

## Tipografía

| Rol | Fuente | Tamaño / peso | Clase |
| --- | --- | --- | --- |
| Display (H1) | Fraunces | 48 → 72 px, 500, interlineado 1.05 | `font-display text-5xl sm:text-6xl lg:text-7xl` |
| H2 de sección | Fraunces | 30 → 36 px, 500 | `font-display text-3xl sm:text-4xl` |
| H3 / nombre de producto | Geist | 16–18 px, 600 | `text-lg font-semibold` |
| Precio | Fraunces | 24 px, 600 | `font-display text-2xl font-semibold` |
| Cuerpo | Geist | 16–18 px, 400, interlineado 1.6 | `text-lg leading-relaxed` |
| Eyebrow | Geist | 12 px, 600, mayúsculas, tracking 0.18em | `.eyebrow` |
| Legal / meta | Geist | 12 px | `text-xs` |

La cursiva de Fraunces se reserva para una o dos palabras con énfasis (en el titular y en el logo).

## Componentes

- **Cabecera**: logo tipográfico `farm`*to*`table`, menú (Inicio, Productos, Nosotros, Contacto), iconos de búsqueda,
  favoritos, cuenta y carrito con contador. Se vuelve translúcida con desenfoque al hacer scroll; en móvil, menú desplegable.
- **Botón primario**: píldora `pine` con texto `mint`; hover `forest`. Uno solo por bloque.
- **Botón secundario**: enlace subrayado con `decoration-sage`.
- **Tarjeta de categoría**: icono en cuadro `mint`, nombre, descripción y flecha. La última (canastas) va en `forest` como cierre visual.
- **Tarjeta de producto**: imagen 4:3 (placeholder `mint` con icono), etiqueta opcional, botón de favorito,
  origen, nombre, precio + unidad y botón "Agregar al carrito" que pasa a "Agregado".
- **Propuesta de valor**: fondo `deep`, tres bloques `forest` separados por líneas de 1 px `pine`.
- **Pie de página**: fondo `ink`, títulos `mint` en mayúsculas pequeñas, enlaces `sage`, franja legal inferior.

## Estructura de archivos

```
src/app/page.tsx                    Landing (compone las secciones)
src/components/SiteFrame.tsx        Cabecera de tienda en "/", navegación por roles en el resto
src/components/landing/
  SiteHeader.tsx  Hero.tsx  Categories.tsx  FeaturedProducts.tsx
  ProductCard.tsx ValueProps.tsx  SiteFooter.tsx  Wordmark.tsx  icons.tsx
```

Las imágenes de producto son placeholders: reemplázalas por `next/image` con fotos sobre fondo `mint` o `#F8FCF9`.
