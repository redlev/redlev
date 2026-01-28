/* main.js (REDLEV)
   Objetivo: que actualices el sitio editando SOLO data/content.json

   ¿Qué puedes editar mensualmente?
   - next_activity (título, fecha/hora, descripción, link de inscripción)
   - activities.recent (historial de seminarios)
   - featured_research (investigación del mes)
*/

(function () {
  const $ = (id) => document.getElementById(id);

  // Helpers para no repetir código
  function setText(id, value) {
    const el = $(id);
    if (!el) return;
    el.textContent = value ?? "";
  }

  function setLink(id, url, label) {
    const el = $(id);
    if (!el) return;

    // Si el link está vacío, ocultamos el botón/enlace
    if (!url) {
      el.style.display = "none";
      return;
    }

    el.href = url;
    if (label) el.textContent = label;
    el.style.display = "";
  }

  function setImage(id, src, alt) {
    const el = $(id);
    if (!el) return;

    if (!src) {
      el.style.display = "none";
      return;
    }

    el.src = src;
    if (alt) el.alt = alt;
    el.style.display = "";
  }

  // Menú móvil
  const toggle = document.querySelector(".nav-toggle");
  if (toggle) {
    toggle.addEventListener("click", () => {
      const isOpen = document.body.classList.toggle("nav-open");
      toggle.setAttribute("aria-expanded", String(isOpen));
    });
  }

  // Año en footer
  setText("year", new Date().getFullYear());

  // Iniciar reloj (no depende del JSON)
  startPanamaClock();

  // Cargar contenido
  fetch(new URL("data/content.json", window.location.href))
    .then((r) => {
      if (!r.ok) throw new Error("No se pudo cargar data/content.json");
      return r.json();
    })
    .then((data) => {
      renderGlobal(data);
      renderSections(data);

      // Si quieres que el label del reloj venga del JSON:
      // (requiere que tu HTML tenga id="timezoneMetricLabel")
      if (data?.site?.default_timezone_label) {
        setText("timezoneMetricLabel", data.site.default_timezone_label);
      }
    })
    .catch((err) => {
      console.error(err);
      setText(
        "heroObjective",
        "No se pudo cargar el contenido. Revisa data/content.json y la consola del navegador."
      );
    });

  // =========================
  // Reloj Hora Panamá (UTC-5)
  // =========================
  function startPanamaClock() {
    const el = document.getElementById("panamaClock");
    if (!el) return;

    // Intentamos usar Intl con zona horaria; si falla, hacemos fallback UTC-5 manual.
    let fmt = null;
    try {
      fmt = new Intl.DateTimeFormat("es-PA", {
        timeZone: "America/Panama",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
        // second: "2-digit"
      });
    } catch (e) {
      fmt = null;
    }

    const tick = () => {
      try {
        if (fmt) {
          el.textContent = fmt.format(new Date());
          return;
        }

        // Fallback UTC-5 manual (Panamá no usa DST actualmente; esto es suficiente como plan B)
        const now = new Date();
        const utc = now.getTime() + now.getTimezoneOffset() * 60000;
        const pan = new Date(utc + (-5) * 3600000);
        const hh = String(pan.getHours()).padStart(2, "0");
        const mm = String(pan.getMinutes()).padStart(2, "0");
        el.textContent = `${hh}:${mm}`;
      } catch (err) {
        el.textContent = "--:--";
        console.error("Clock error:", err);
      }
    };

    tick();
    setInterval(tick, 30000); // cada 30s (si activas segundos, cambia a 1000)
  }

  // =========================
  // Render global
  // =========================
  function renderGlobal(data) {
    // Identidad
    setText("siteName", data?.site?.name);
    setText("siteTagline", data?.site?.tagline);
    setText("footerName", data?.site?.name);

    // Métricas
    setText("foundedYear", data?.site?.founded_year);
    setText("membersCount", data?.site?.members_count);

    // IMPORTANTE:
    // Antes usabas setText(\"timezone\", ...). Eso puede pisar el reloj si existe ese id.
    // Ahora usamos (opcional) timezoneMetricLabel para el texto bajo la hora:
    setText("timezoneMetricLabel", data?.site?.default_timezone_label);

    // Formularios / links operacionales
    setLink("joinLink", data?.links?.join_form, "Únete");
    setLink("joinLink2", data?.links?.join_form, "Formulario de registro");
    setLink("contactLink", data?.links?.contact_form, "Contacto");
    setLink("contactLink2", data?.links?.contact_form, "Contacto");
    setLink("privacyLink", data?.links?.privacy_policy, "Privacidad");

    // Redes (si algún link está vacío, se oculta)
    setLink("youtubeLink", data?.links?.youtube, "YouTube");
    setLink("youtubeLink2", data?.links?.youtube, "YouTube");
    setLink("xLink", data?.links?.x, "X");
    setLink("facebookLink", data?.links?.facebook_group, "Facebook");
    setLink("instagramLink", data?.links?.instagram, "Instagram");
    setLink("linkedinLink", data?.links?.linkedin, "LinkedIn");
  }

  // =========================
  // Render secciones
  // =========================
  function renderSections(data) {
    // Hero
    setText("heroTitle", data?.site?.tagline);
    setText("heroObjective", data?.home?.objective);

    // Quiénes somos
    setText("aboutText", data?.about?.intro);

    // Próxima actividad (destacado)
    const na = data?.next_activity || {};
    setText("nextEyebrow", na.eyebrow || "Próxima actividad");
    setText("nextTitle", na.title);
    setText("nextMeta", na.datetime_text);
    setText("nextDescription", na.description);

    // Botón de inscripción: si no hay URL, se ocultará
    setLink("nextCta", na.cta_url, na.cta_label || "Inscripción / Información");
    setImage("nextImage", na.image, na.image_alt || "Imagen actividad");

    // Actividades recientes
    renderRecentActivities(data?.activities?.recent || []);

    // Investigación destacada del mes
    const fr = data?.featured_research || {};
    setText("researchEyebrow", fr.eyebrow || "Este mes destacamos");
    setText("researchTitle", fr.title);
    setText("researchCitation", fr.citation);
    setText("researchAbstract", fr.abstract);
    setLink("researchLink", fr.paper_url, fr.paper_label || "Ver publicación");

    // Comité
    renderCommittee(data?.committee || []);
  }

  // =========================
  // Actividades recientes
  // =========================
  function renderRecentActivities(items) {
    const wrap = $("recentActivities");
    if (!wrap) return;

    wrap.innerHTML = "";

    items.forEach((it) => {
      const card = document.createElement("article");
      card.className = "card";

      const h = document.createElement("h3");
      h.className = "h3";
      h.textContent = it.title || "Seminario REDLEV";

      const sub = document.createElement("p");
      sub.className = "text";
      sub.textContent = it.subtitle || "";

      const sp = document.createElement("p");
      sp.className = "meta";
      sp.textContent = it.speaker || "";

      card.appendChild(h);
      if (it.subtitle) card.appendChild(sub);
      if (it.speaker) card.appendChild(sp);

      if (it.cta_url) {
        const actions = document.createElement("div");
        actions.className = "actions";

        const a = document.createElement("a");
        a.className = "button button-secondary";
        a.href = it.cta_url;
        a.target = "_blank";
        a.rel = "noreferrer";
        a.textContent = it.cta_label || "Ver";

        actions.appendChild(a);
        card.appendChild(actions);
      }

      wrap.appendChild(card);
    });
  }

  // =========================
  // Comité (sin fotos, nombre con link)
  // =========================
  function renderCommittee(items) {
    const wrap = $("committeeGrid");
    if (!wrap) return;

    wrap.innerHTML = "";

    items.forEach((m) => {
      const card = document.createElement("article");
      card.className = "card";

      const h = document.createElement("h3");
      h.className = "h3";
      h.style.marginBottom = "6px";

      if (m.url) {
        const a = document.createElement("a");
        a.href = m.url;
        a.target = "_blank";
        a.rel = "noreferrer";
        a.className = "committee-name";
        a.textContent = m.name || "Nombre Apellido";
        h.appendChild(a);
      } else {
        h.textContent = m.name || "Nombre Apellido";
      }

      const p = document.createElement("p");
      p.className = "text";
      p.textContent = m.focus || "";

      card.appendChild(h);
      card.appendChild(p);

      wrap.appendChild(card);
    });
  }
})();
