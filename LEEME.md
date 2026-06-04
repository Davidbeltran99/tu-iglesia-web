# Tú Iglesia — Página web

Página web estática (HTML + CSS + JavaScript). No necesita servidor ni base de datos:
solo abrir el archivo en el navegador.

## 📂 Estructura

```
PAGINA DE LA IGLESIA/
├── index.html        ← La página principal (todo el contenido)
├── css/
│   └── styles.css    ← Los estilos y colores
├── js/
│   └── main.js       ← El menú, animaciones y el formulario
├── img/
│   └── logo-tuiglesia.jpg  ← Tu logo original (de respaldo)
└── LEEME.md          ← Este archivo
```

## ▶️ Cómo verla

Haz doble clic en **index.html** y se abrirá en tu navegador.

## ✏️ Qué personalizar (lo más importante)

Todo se edita en **index.html** buscando el texto y reemplazándolo.

1. **Logo** → El logo (la llama + "TÚ IGLESIA" + "Lugar de Adoración") está hecho en
   código (SVG), por eso se ve nítido en cualquier tamaño y se adapta al fondo. Tu logo
   original quedó guardado en `img/logo-tuiglesia.jpg`. Si tienes el logo en **PNG con
   fondo transparente**, pásamelo y lo pongo tal cual.
2. **Número de WhatsApp y teléfono** → busca `573000000000` (aparece en `index.html`
   y en `js/main.js`). Reemplázalo por el número real, formato internacional sin "+".
   Ejemplo: para `+57 312 345 6789` se escribe `573123456789`.
3. **Dirección y correo** → en la sección "Contacto" (busca `Cra. 00` y
   `contacto@tuiglesia.com`).
4. **Horarios de culto** → sección `id="horarios"`.
5. **Ministerios y eventos** → secciones `id="ministerios"` y `id="eventos"`.
6. **Redes sociales** → en la sección de contacto, los enlaces `href="#"` de
   Facebook, Instagram y YouTube. Pon ahí las URLs reales.
7. **Mapa** → busca el `<iframe>` del mapa y cambia `Villavicencio,Meta,Colombia`
   por la dirección exacta de la iglesia.

### Cambiar colores

En `css/styles.css`, arriba del todo, está la sección `:root` con los colores.
- `--indigo-...` → el azul/morado principal.
- `--gold` → el dorado de los acentos.

## 🖼️ Agregar fotos

Crea una carpeta `img/` y guarda ahí las fotos. Luego me avisas y reemplazo el
fondo del hero (degradado) por una foto real de la iglesia, y agrego una galería.

## 🌐 Cómo publicarla en internet (gratis)

Cualquiera de estas opciones sirve y son gratuitas:

- **Netlify** (la más fácil): entra a https://app.netlify.com/drop y arrastra la
  carpeta completa. En segundos te da un link público.
- **Vercel**: https://vercel.com → "Add New Project".
- **GitHub Pages**: si la subes a un repositorio de GitHub.

Cuando quieras un dominio propio (ej. `tuiglesia.com`), me dices y te guío.

---

¿Quieres que agreguemos sección de **prédicas/videos de YouTube**, **galería de
fotos**, **diezmos/ofrendas en línea** o **formulario que envíe a un correo real**?
Solo pídelo. 🙏
