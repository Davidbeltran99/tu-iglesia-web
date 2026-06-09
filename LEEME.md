# Tú Iglesia — Página web + Portal de líderes

Sitio web de la iglesia (landing pública) **más** un portal privado con login,
roles por ministerio, calendario/eventos, base de datos de personas y reportes.
Corre con Node + Express (servidor `server.js`) y guarda los datos en un archivo
JSON (`data/iglesia.json`).

## 📂 Estructura

```
PAGINA DE LA IGLESIA/
├── server.js         ← Servidor Express (landing + API del portal)
├── db.js             ← Almacén de datos (JSON: ministerios, usuarios, eventos, personas)
├── auth.js           ← Login (contraseñas + JWT en cookie)
├── package.json      ← Dependencias
├── data/             ← Base de datos JSON (NO se sube a GitHub)
├── public/           ← Todo lo que ve el navegador
│   ├── index.html    ← Landing pública
│   ├── login.html    ← Acceso de líderes (entrar / registrarse)
│   ├── portal.html   ← Panel privado (eventos, personas, aprobaciones…)
│   ├── reporte.html  ← Reporte imprimible de personas por ministerio
│   ├── portal.js / portal.css
│   ├── css/ js/ video/
│   └── img/
│       └── logo-tuiglesia.jpg  ← Tu logo original (de respaldo)
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

> Ahora el sitio **necesita Node** (por el portal de líderes), así que Netlify "drag & drop"
> ya no aplica. Se publica en **Railway** (donde ya está) o cualquier hosting Node.

### Railway — recomendado
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

---

## 🔐 Portal de líderes (login, roles, eventos, personas, reportes)

Área privada en **/login.html** (enlace "Acceso líderes" en el footer).

### Cómo funciona
- **El pastor** es el administrador. Su cuenta se crea sola al arrancar el servidor
  usando las variables `ADMIN_EMAIL` / `ADMIN_PASSWORD`.
- **Los líderes se registran solos** eligiendo su ministerio y quedan *pendientes*.
- El pastor entra al portal → **Aprobaciones** → aprueba la cuenta (y confirma
  ministerio/rol). Recién ahí el líder puede ingresar.
- Cada líder ve y registra **solo las personas de su ministerio**; el pastor ve y
  administra **todas** y puede **imprimir el reporte** por ministerio (botón Reportes → Imprimir/PDF).
- El pastor publica **eventos** (normales y especiales) y todos los líderes los ven.

### Variables de entorno (configúralas en Railway → Variables)

| Variable | Para qué | Ejemplo |
|---|---|---|
| `JWT_SECRET` | Firma las sesiones (pon algo largo y secreto) | `una-frase-larga-y-secreta-123` |
| `ADMIN_EMAIL` | Correo del pastor (admin) | `pastor@tuiglesia.com.co` |
| `ADMIN_PASSWORD` | Contraseña inicial del pastor | `(elige una segura)` |
| `ADMIN_NOMBRE` | Nombre que se muestra | `Pastor Jaime Cardozo` |
| `DB_PATH` | Dónde se guarda la base | `/app/data/iglesia.json` |

### ⚠️ Volumen persistente (MUY importante)
En Railway hay que añadir un **Volume** montado en **`/app/data`**. Si no, la base de
datos (líderes, eventos, personas) **se borra en cada despliegue**.

Railway → tu servicio → pestaña **Volumes** → **+ New Volume** → Mount path: `/app/data`.

### Probar en local
```bash
npm install
# PowerShell:
$env:JWT_SECRET="dev"; $env:ADMIN_EMAIL="pastor@tuiglesia.com.co"; $env:ADMIN_PASSWORD="Pastor123"; $env:ADMIN_NOMBRE="Pastor Jaime"; node server.js
```
Luego abre http://localhost:3000/login.html

Cuando quieras un dominio propio (ej. `tuiglesia.com`), me dices y te guío.

---

¿Quieres que agreguemos sección de **prédicas/videos de YouTube**, **galería de
fotos**, **diezmos/ofrendas en línea** o **formulario que envíe a un correo real**?
Solo pídelo. 🙏
