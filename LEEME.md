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

### Transmisión en vivo

En `js/main.js` está `LIVE_CONFIG`. Rellena **una** de las opciones:
- `youtubeChannelId` → el ID de tu canal (empieza por `UC...`). Es la mejor opción:
  el video EN VIVO aparece solo cuando transmites. Lo sacas en YouTube →
  "Compartir canal" → "Copiar ID del canal".
- `youtubeVideoId` → el ID de un video puntual (lo que va después de `watch?v=`).
- `facebookVideoUrl` → la URL de la transmisión de Facebook (copiada del navegador).

### Cambiar colores

En `css/styles.css`, arriba del todo, está la sección `:root` con los colores de
la llama:
- `--flame-1` … `--flame-4` → amarillo → naranja → rojo → magenta.
- `--accent` → el tono de los antetítulos.
- `--dark` / `--dark-2` → los fondos oscuros (hero, en vivo, footer).

## 🖼️ Agregar fotos

Guarda las fotos en la carpeta `img/`. Luego me avisas y reemplazo el fondo del
hero (degradado) por una foto real de la iglesia, y agrego una galería.

## 🌐 Publicar en internet

### Opción rápida (sin servidor)
- **Netlify**: https://app.netlify.com/drop y arrastra la carpeta. Link en segundos.

### Railway (con el servidor incluido) — recomendado
El proyecto ya trae todo lo necesario (`server.js`, `package.json`):

1. Sube el código a **GitHub** (ver abajo).
2. Entra a https://railway.app → **New Project** → **Deploy from GitHub repo**.
3. Elige este repositorio. Railway detecta Node, instala y ejecuta `npm start`.
4. En **Settings → Networking → Generate Domain** obtienes tu link público.

> Railway asigna el puerto por la variable `PORT`; el `server.js` ya la usa.

### Subir a GitHub (con GitHub CLI)
Ya está instalado `gh`. En tu terminal (PowerShell), dentro de esta carpeta:

```powershell
gh auth login        # GitHub.com → HTTPS → Login with a web browser
gh repo create tu-iglesia-web --public --source=. --remote=origin --push
```

Eso crea el repo y sube todo. Para cambios futuros: `git add -A && git commit -m "cambios" && git push`.

Cuando quieras un dominio propio (ej. `tuiglesia.com`), me dices y te guío.

---

¿Quieres que agreguemos sección de **prédicas/videos de YouTube**, **galería de
fotos**, **diezmos/ofrendas en línea** o **formulario que envíe a un correo real**?
Solo pídelo. 🙏
