/* =========================================================
   Tú Iglesia — Interactividad
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  const navbar = document.getElementById("navbar");
  const navToggle = document.getElementById("navToggle");
  const navLinks = document.getElementById("navLinks");

  /* --- Navbar con fondo al hacer scroll --- */
  const onScroll = () => {
    if (window.scrollY > 40) navbar.classList.add("scrolled");
    else navbar.classList.remove("scrolled");
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* --- Menú móvil --- */
  const closeMenu = () => {
    navLinks.classList.remove("open");
    navToggle.classList.remove("active");
    document.body.classList.remove("menu-open");
  };

  navToggle.addEventListener("click", () => {
    const isOpen = navLinks.classList.toggle("open");
    navToggle.classList.toggle("active", isOpen);
    document.body.classList.toggle("menu-open", isOpen);
  });

  // Cerrar el menú al hacer clic en un enlace
  navLinks.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeMenu);
  });

  // Cerrar al hacer clic fuera del menú
  document.addEventListener("click", (e) => {
    if (
      navLinks.classList.contains("open") &&
      !navLinks.contains(e.target) &&
      !navToggle.contains(e.target)
    ) {
      closeMenu();
    }
  });

  /* --- Animaciones al hacer scroll (reveal) --- */
  const reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    reveals.forEach((el) => observer.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add("visible"));
  }

  /* --- Año automático en el footer --- */
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* --- Formulario de contacto -> abre WhatsApp con el mensaje --- */
  // Cambia este número por el de la iglesia (formato internacional, sin "+")
  const WHATSAPP_NUMBER = "573132607084";

  const form = document.getElementById("contactForm");
  const note = document.getElementById("formNote");

  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const nombre = form.nombre.value.trim();
      const contacto = form.email.value.trim();
      const mensaje = form.mensaje.value.trim();

      if (!nombre || !contacto || !mensaje) {
        if (note) note.textContent = "Por favor completa todos los campos.";
        return;
      }

      const texto =
        `Hola Tú Iglesia 👋%0A%0A` +
        `*Nombre:* ${encodeURIComponent(nombre)}%0A` +
        `*Contacto:* ${encodeURIComponent(contacto)}%0A` +
        `*Mensaje:* ${encodeURIComponent(mensaje)}`;

      window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${texto}`, "_blank");

      if (note) note.textContent = "¡Gracias! Te estamos redirigiendo a WhatsApp.";
      form.reset();
    });
  }

  /* =========================================================
     TRANSMISIÓN EN VIVO
     Configura UNA de estas opciones (deja las demás vacías "").
     ========================================================= */
  const LIVE_CONFIG = {
    // OPCIÓN 1 (la mejor para YouTube): ID del canal, empieza por "UC...".
    // Con esto el video EN VIVO aparece solo cuando estés transmitiendo.
    // Cómo obtenerlo: entra a tu canal en YouTube > "Compartir canal" > "Copiar ID del canal".
    youtubeChannelId: "UCQ66SsvrinYowJMgebIEr2w",

    // OPCIÓN 2: ID de un video concreto de YouTube
    // (lo que va después de "watch?v=" en la URL del video).
    youtubeVideoId: "",

    // OPCIÓN 3: URL de la transmisión o video de Facebook
    // (la copias de la barra de direcciones del navegador).
    facebookVideoUrl: "",
  };

  const livePlayer = document.getElementById("livePlayer");
  if (livePlayer) {
    // Construimos la URL del reproductor según la opción configurada
    let embedSrc = "";
    if (LIVE_CONFIG.youtubeChannelId) {
      embedSrc = `https://www.youtube.com/embed/live_stream?channel=${LIVE_CONFIG.youtubeChannelId}`;
    } else if (LIVE_CONFIG.youtubeVideoId) {
      embedSrc = `https://www.youtube.com/embed/${LIVE_CONFIG.youtubeVideoId}`;
    } else if (LIVE_CONFIG.facebookVideoUrl) {
      embedSrc =
        "https://www.facebook.com/plugins/video.php?show_text=false&href=" +
        encodeURIComponent(LIVE_CONFIG.facebookVideoUrl);
    }

    const buildIframe = (src) => {
      const isFb = src.indexOf("facebook.com") !== -1;
      const allow = isFb
        ? "autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
        : "accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture";
      const extra = isFb ? ' scrolling="no"' : "";
      return `<iframe src="${src}" title="Transmisión en vivo" allow="${allow}" allowfullscreen${extra}></iframe>`;
    };

    if (embedSrc) {
      // Portada (facade): se ve bonita aunque no haya transmisión activa.
      // El reproductor se carga solo cuando la persona da clic en "play".
      livePlayer.innerHTML =
        '<button class="live-facade" type="button" aria-label="Reproducir transmisión en vivo">' +
        '<span class="live-badge"><span class="live-dot"></span> En directo</span>' +
        '<span class="live-play">▶</span>' +
        '<span class="live-facade-title">Ver transmisión en vivo</span>' +
        '<span class="live-facade-note">Toca para abrir el reproductor. Si estamos en vivo, el servicio empezará aquí mismo.</span>' +
        "</button>";

      livePlayer.querySelector(".live-facade").addEventListener("click", () => {
        const sep = embedSrc.indexOf("?") !== -1 ? "&" : "?";
        const isFb = embedSrc.indexOf("facebook.com") !== -1;
        const playSrc = embedSrc + sep + (isFb ? "autoplay=true" : "autoplay=1");
        livePlayer.innerHTML = buildIframe(playSrc);
      });
    } else {
      livePlayer.innerHTML =
        '<div class="live-offline">' +
        '<span class="live-badge"><span class="live-dot"></span> En vivo</span>' +
        "<h3>Aún no hay transmisión activa</h3>" +
        "<p>Síguenos en YouTube o Facebook y activa las notificaciones para no perderte el próximo servicio en vivo.</p>" +
        "</div>";
    }
  }

  /* --- Peticiones de oración -> WhatsApp del pastor --- */
  const prayerForm = document.getElementById("prayerForm");
  const prayerNote = document.getElementById("prayerNote");

  if (prayerForm) {
    prayerForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const nombre = prayerForm.pNombre.value.trim() || "Anónimo";
      const mensaje = prayerForm.pMensaje.value.trim();

      if (!mensaje) {
        if (prayerNote) prayerNote.textContent = "Por favor escribe tu petición.";
        return;
      }

      const texto =
        `🙏 *Petición de oración*%0A%0A` +
        `*De:* ${encodeURIComponent(nombre)}%0A` +
        `*Petición:* ${encodeURIComponent(mensaje)}`;

      window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${texto}`, "_blank");

      if (prayerNote)
        prayerNote.textContent = "Gracias por confiar en nosotros. Estaremos orando por ti. 🙏";
      prayerForm.reset();
    });
  }
});
