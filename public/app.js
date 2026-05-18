const CONFIG = window.__PUBLIC_SITE_CONFIG__ || {};
const API_BASE_URL = String(CONFIG.apiBaseUrl || "http://localhost:10000").replace(/\/+$/, "");
const app = document.getElementById("app");
const ASSETS = {
  brand: "/assets/logo-placeholder.webp",
  hero: "/assets/hero-caballo.webp",
  raffle: "/assets/raffle-card.webp",
  winner: "/assets/winner-video.webp",
  payments: "/assets/payment-methods.webp",
};

const currencyFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizeSlug(value = "") {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/^\/+|\/+$/g, "")
    .split("/")
    .filter(Boolean)[0] || "";
}

function getSlugFromLocation() {
  const fromQuery = new URL(window.location.href).searchParams.get("slug");
  const fromPath = normalizeSlug(window.location.pathname);
  return normalizeSlug(fromQuery || fromPath);
}

function pickHeroImage(site) {
  return site?.settings?.heroImageUrl || ASSETS.hero;
}

function pickHeroVideo(site) {
  return site?.settings?.heroVideoUrl || "";
}

function isYoutubeUrl(url = "") {
  return /(?:youtube\.com|youtu\.be)/i.test(String(url || ""));
}

function isVimeoUrl(url = "") {
  return /vimeo\.com/i.test(String(url || ""));
}

function buildEmbeddedVideoUrl(url = "") {
  const trimmed = String(url || "").trim();
  if (!trimmed) return "";

  if (isYoutubeUrl(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      const videoId =
        parsed.hostname.includes("youtu.be")
          ? parsed.pathname.split("/").filter(Boolean)[0]
          : parsed.searchParams.get("v") || parsed.pathname.split("/").filter(Boolean).pop();
      return videoId ? `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?rel=0&modestbranding=1&playsinline=1` : "";
    } catch {
      return "";
    }
  }

  if (isVimeoUrl(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      const videoId = parsed.pathname.split("/").filter(Boolean).pop();
      return videoId ? `https://player.vimeo.com/video/${encodeURIComponent(videoId)}?title=0&byline=0&portrait=0` : "";
    } catch {
      return "";
    }
  }

  return "";
}

function renderInlineVideo(url, title) {
  const embedded = buildEmbeddedVideoUrl(url);
  if (embedded) {
    return `<iframe class="embedded-video" src="${escapeHtml(embedded)}" title="${escapeHtml(title || "Video")}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
  }

  return `
    <video class="embedded-video" controls playsinline preload="metadata">
      <source src="${escapeHtml(url)}" />
      Tu navegador no soporta la reproduccion de video.
    </video>
  `;
}

function whatsappLink(number) {
  const digits = String(number || "").replace(/\D/g, "");
  return digits ? `https://wa.me/${digits}` : "#";
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("es-CO", { dateStyle: "medium" }).format(date);
}

function listFromConfig(config = {}) {
  const candidates = [
    config.items,
    config.methods,
    config.channels,
    config.links,
    config.steps,
    config.points,
    config.cards,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate) && candidate.length > 0) {
      return candidate.map((item) => {
        if (typeof item === "string") {
          return { title: item, text: "" };
        }
        return {
          title: item.title || item.label || item.name || item.text || "Item",
          text: item.text || item.description || item.subtitle || "",
          url: item.url || item.href || "",
        };
      });
    }
  }

  return [];
}

function sectionBody(section) {
  const config = section?.config || {};
  const text = config.text || config.content || config.body || section.subtitle || "";
  const items = listFromConfig(config);

  if (items.length === 0 && text) {
    return `<p class="card-copy">${escapeHtml(text)}</p>`;
  }

  if (items.length > 0) {
    return `
      <div class="list">
        ${items
          .map(
            (item) => `
              <div class="list-item">
                <strong>${escapeHtml(item.title)}</strong>
                ${item.text ? `<div>${escapeHtml(item.text)}</div>` : ""}
                ${item.url ? `<div style="margin-top:8px"><a class="button secondary" href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">Abrir enlace</a></div>` : ""}
              </div>
            `,
          )
          .join("")}
      </div>
    `;
  }

  return `<p class="card-copy">Esta seccion no tiene contenido definido todavia.</p>`;
}

function renderRaffles(site) {
  const raffles = asArray(site.activeRaffles);

  if (raffles.length === 0) {
    return `
      <div class="state-card">
        <h2>Sin sorteos publicados</h2>
        <p>No hay sorteos visibles en este momento.</p>
      </div>
    `;
  }

  return `
    <div class="grid-3">
      ${raffles
        .map(({ campaign, publicConfig }) => {
          const image = publicConfig?.coverImageUrl || ASSETS.raffle;
          const isFeatured = publicConfig?.isFeatured;
          const heroTitle = publicConfig?.publicTitle || campaign?.name || "Sorteo";
          const description = publicConfig?.publicDescription || campaign?.name || "";
          const drawDate = campaign?.drawDate ? formatDate(campaign.drawDate) : "";
          const buttonHref = site.settings?.heroButtonUrl || whatsappLink(site.settings?.whatsappNumber || site.company?.whatsapp_number);
          return `
            <article class="card">
              <div class="card-media">
                ${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(heroTitle)}" />` : ""}
                ${isFeatured ? `<div class="card-flag">Destacado</div>` : ""}
              </div>
              <div class="card-body">
                <div class="chip-row">
                  ${drawDate ? `<span class="chip">Sorteo ${escapeHtml(drawDate)}</span>` : ""}
                  ${campaign?.registrationMode ? `<span class="chip">${escapeHtml(campaign.registrationMode)}</span>` : ""}
                </div>
                <h3 class="card-title">${escapeHtml(heroTitle)}</h3>
                <p class="card-copy">${escapeHtml(description)}</p>
                <div class="chip-row">
                  ${campaign?.numberValue ? `<span class="chip">Boleta ${currencyFormatter.format(Number(campaign.numberValue))}</span>` : ""}
                  ${campaign?.totalNumeros ? `<span class="chip">${escapeHtml(String(campaign.totalNumeros))} boletas</span>` : ""}
                </div>
                <div style="margin-top:18px">
                  <a class="button gold" href="${escapeHtml(buttonHref)}" target="_blank" rel="noreferrer">Escoger mis numeros</a>
                </div>
              </div>
            </article>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderWinnerVideos(site) {
  const videos = asArray(site.winnerVideos);

  if (videos.length === 0) {
    return `<div class="state-card"><h2>Sin videos publicados</h2><p>Cuando cargues testimonios o entregas, apareceran aqui.</p></div>`;
  }

  return `
    <div class="grid-3">
      ${videos
        .map((video) => {
          const preview = video.thumbnailUrl || ASSETS.winner;
          return `
            <article class="card">
              <div class="card-media">
                ${video.videoUrl ? renderInlineVideo(video.videoUrl, video.title) : preview ? `<img src="${escapeHtml(preview)}" alt="${escapeHtml(video.title)}" />` : ""}
              </div>
              <div class="card-body">
                <div class="chip-row">
                  ${video.city ? `<span class="chip">${escapeHtml(video.city)}</span>` : ""}
                  ${video.drawDate ? `<span class="chip">${escapeHtml(formatDate(video.drawDate))}</span>` : ""}
                </div>
                <h3 class="card-title">${escapeHtml(video.title)}</h3>
                <p class="card-copy">${escapeHtml(video.winnerName || "Ganador verificado")}${video.prize ? ` · ${escapeHtml(video.prize)}` : ""}</p>
                
              </div>
            </article>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderFaq(site) {
  const faq = asArray(site.faq);
  if (faq.length === 0) {
    return `<div class="state-card"><h2>Sin preguntas frecuentes</h2><p>Aqui veras respuestas utiles cuando cargues el contenido en el admin.</p></div>`;
  }

  return `
    <div class="faq">
      ${faq
        .map(
          (item) => `
            <details>
              <summary>${escapeHtml(item.question)}</summary>
              <div class="answer">${escapeHtml(item.answer)}</div>
            </details>
          `,
        )
        .join("")}
    </div>
  `;
}

function renderSections(site, sections, title, description) {
  if (!sections || sections.length === 0) {
    return "";
  }

  return `
    <section class="section section-anchor">
      <div class="section-head">
        <div>
          <span class="section-tag">${escapeHtml(title)}</span>
          <h2>${escapeHtml(title)}</h2>
          ${description ? `<p>${escapeHtml(description)}</p>` : ""}
        </div>
      </div>
      <div class="grid-2">
        ${sections
          .map(
            (section) => `
              <article class="info-panel">
                <h3 style="margin:0 0 8px">${escapeHtml(section.title || "Seccion")}</h3>
                ${section.subtitle ? `<p class="card-copy">${escapeHtml(section.subtitle)}</p>` : ""}
                ${sectionBody(section)}
              </article>
            `,
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderPreview(site) {
  const settings = site?.settings || {};
  const company = site?.company || {};
  const heroImage = settings.heroImageUrl || ASSETS.hero;
  const heroTitle = settings.heroTitle || settings.title || company.nombre || "Rifas";
  const heroSubtitle = settings.heroSubtitle || settings.subtitle || "Una experiencia de rifas administrada desde el backend.";
  const raffles = asArray(site.activeRaffles).slice(0, 2);
  const videos = asArray(site.winnerVideos).slice(0, 2);

  return `
    <div class="site-preview">
      <div class="preview-hero">
        <div class="preview-hero-copy">
          <span class="section-tag">Vista previa del sitio público</span>
          <h3>${escapeHtml(heroTitle)}</h3>
          <p>${escapeHtml(heroSubtitle)}</p>
          <div class="chip-row">
            ${settings.whatsappNumber ? `<span class="chip">WhatsApp: ${escapeHtml(settings.whatsappNumber)}</span>` : ""}
            <span class="chip">${escapeHtml(String(asArray(site.activeRaffles).length))} sorteos</span>
            <span class="chip">${escapeHtml(String(asArray(site.winnerVideos).length))} videos</span>
          </div>
        </div>
        <div class="preview-hero-media">
          <img src="${escapeHtml(heroImage)}" alt="${escapeHtml(heroTitle)}" />
        </div>
      </div>
      <div class="preview-grid">
        <div class="preview-column">
          <h4>Sorteos visibles</h4>
          ${raffles.length ? raffles.map(({ campaign, publicConfig }) => `
            <div class="preview-item">
              <strong>${escapeHtml(publicConfig?.publicTitle || campaign?.name || "Sorteo")}</strong>
              <div>${escapeHtml(publicConfig?.publicDescription || campaign?.name || "")}</div>
            </div>
          `).join("") : `<div class="preview-empty">No hay sorteos visibles cargados.</div>`}
        </div>
        <div class="preview-column">
          <h4>Videos de ganadores</h4>
          ${videos.length ? videos.map((video) => `
            <div class="preview-item">
              <strong>${escapeHtml(video.title)}</strong>
              <div>${escapeHtml(video.winnerName || "Ganador verificado")}${video.city ? ` · ${escapeHtml(video.city)}` : ""}</div>
            </div>
          `).join("") : `<div class="preview-empty">No hay videos publicados.</div>`}
        </div>
      </div>
    </div>
  `;
}

function renderShell(site, slug) {
  const settings = site.settings || {};
  const company = site.company || {};
  const themePrimary = settings.primaryColor || "#0f172a";
  const themeSecondary = settings.secondaryColor || "#d6a13e";
  document.documentElement.style.setProperty("--primary", themePrimary);
  document.documentElement.style.setProperty("--secondary", themeSecondary);

  const heroImage = pickHeroImage(site);
  const heroVideo = pickHeroVideo(site);
  const heroTitle = settings.heroTitle || settings.title || company.nombre || "Rifas";
  const heroSubtitle = settings.heroSubtitle || settings.subtitle || "Una experiencia de rifas administrada desde el backend.";
  const heroLabel = settings.heroButtonLabel || "Escoger mis numeros";
  const heroButton = settings.heroButtonUrl || whatsappLink(settings.whatsappNumber || company.whatsapp_number);
  const slogan = settings.slogan || "";
  const raffleCount = asArray(site.activeRaffles).length;
  const faqCount = asArray(site.faq).length;
  const videosCount = asArray(site.winnerVideos).length;
  const paymentSections = asArray(site.paymentMethods);
  const legalSections = asArray(site.legal);
  const otherSections = asArray(site.otherSections);

  app.innerHTML = `
    <div class="page">
      <header class="topbar">
        <div class="shell topbar-inner">
          <div class="brand">
            <div class="brand-mark">
              <img src="${escapeHtml(settings.logoUrl || company.logo || ASSETS.brand)}" alt="${escapeHtml(company.nombre || settings.title || "Logo")}" style="width:100%;height:100%;object-fit:cover;border-radius:16px;" />
            </div>
            <div>
              <div class="brand-name">${escapeHtml(company.nombre || settings.title || "Rifas publicas")}</div>
              <span class="brand-subtitle">${escapeHtml(company.qr_logo ? "Sitio administrado desde el backend" : "Sitio administrado desde el backend")}</span>
            </div>
          </div>
          <div class="top-actions">
            ${slug ? `<span class="pill">/${escapeHtml(slug)}</span>` : `<span class="pill">Sin slug</span>`}
            ${settings.whatsappNumber ? `<a class="button secondary" href="${escapeHtml(whatsappLink(settings.whatsappNumber))}" target="_blank" rel="noreferrer">WhatsApp</a>` : ""}
            ${heroButton ? `<a class="button primary" href="${escapeHtml(heroButton)}" target="_blank" rel="noreferrer">${escapeHtml(heroLabel)}</a>` : ""}
          </div>
        </div>
      </header>

      <main>
        <section class="hero">
          <div class="shell hero-card">
            <div class="hero-grid">
              <div>
                <span class="eyebrow">Pagina publica activa · ${escapeHtml(company.activo ? "empresa activa" : "empresa inactiva")}</span>
                <h1>${escapeHtml(heroTitle)}${slogan ? ` <span class="accent">${escapeHtml(slogan)}</span>` : ""}</h1>
                <p>${escapeHtml(heroSubtitle)}</p>
                <div class="hero-actions">
                  ${heroButton ? `<a class="button gold" href="${escapeHtml(heroButton)}" target="_blank" rel="noreferrer">${escapeHtml(heroLabel)}</a>` : ""}
                  <a class="button secondary" href="#sorteos">Ver sorteos</a>
                </div>
                <div class="hero-ribbon">
                  <span>ðŸŒ¾</span>
                  <span>${escapeHtml(settings.heroButtonUrl ? "Contenido sincronizado con backend" : "Contenido sincronizado con backend")}</span>
                </div>
                <div class="hero-meta">
                  <div class="meta-card">
                    <strong>${escapeHtml(String(raffleCount))}</strong>
                    <span>Sorteos visibles</span>
                  </div>
                  <div class="meta-card">
                    <strong>${escapeHtml(String(videosCount))}</strong>
                    <span>Videos de ganadores</span>
                  </div>
                  <div class="meta-card">
                    <strong>${escapeHtml(String(faqCount))}</strong>
                    <span>Preguntas frecuentes</span>
                  </div>
                </div>
              </div>

              <div class="hero-media">
                ${heroVideo ? renderInlineVideo(heroVideo, heroTitle) : `<img src="${escapeHtml(heroImage)}" alt="${escapeHtml(heroTitle)}" />`}
                <div class="overlay">
                  <strong>${escapeHtml(company.nombre || "Rifas publicas")}</strong>
                  <div style="margin-top:6px">${escapeHtml(settings.heroButtonLabel || "Escoge tu boleta y participa")}</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section class="section shell section-anchor" id="sorteos">
          <div class="section-head">
            <div>
              <span class="section-tag">Sorteos visibles</span>
              <h2>Participa desde la pagina publica</h2>
              <p>Estos son los sorteos que el backend marca como visibles y que la landing debe mostrar automaticamente.</p>
            </div>
          </div>
          ${renderRaffles(site)}
        </section>

        ${paymentSections.length ? `
          <section class="section shell section-anchor" id="pagos">
          <div class="section-head">
            <div>
              <span class="section-tag">Metodos de pago</span>
              <h2>Opciones de pago visibles</h2>
              <p>La pagina publica toma estos bloques desde la configuracion del backend.</p>
            </div>
          </div>
          <div class="state-card" style="margin-bottom:18px">
            <img src="${escapeHtml(ASSETS.payments)}" alt="Metodos de pago" style="width:100%;height:auto;border-radius:22px;display:block;margin-bottom:16px" />
          </div>
          ${renderSections(site, paymentSections, "Metodos de pago", "Bloques administrables desde el panel.") }
          </section>
        ` : ""}

        <section class="section shell section-anchor" id="videos">
          <div class="section-head">
            <div>
              <span class="section-tag">Videos de ganadores</span>
              <h2>Prueba social y confianza</h2>
              <p>Videos y entregas administrados desde el backend para dar credibilidad al sorteo.</p>
            </div>
          </div>
          ${renderWinnerVideos(site)}
        </section>

        <section class="section shell section-anchor" id="faq">
          <div class="section-head">
            <div>
              <span class="section-tag">Preguntas frecuentes</span>
              <h2>Dudas resueltas antes de comprar</h2>
              <p>La landing muestra las respuestas que configuras en el panel administrativo.</p>
            </div>
          </div>
          ${renderFaq(site)}
        </section>

        ${legalSections.length ? `
          <section class="section shell section-anchor" id="legal">
            <div class="section-head">
              <div>
                <span class="section-tag">Legal</span>
                <h2>Terminos y condiciones</h2>
                <p>Bloques legales que se muestran publicamente sin tocar el codigo de la web.</p>
              </div>
            </div>
            ${renderSections(site, legalSections, "Legal", "T&C, autorizaciones, privacidad y otras politicas.") }
          </section>
        ` : ""}

        ${otherSections.length ? `
          <section class="section shell section-anchor" id="contenidos">
            <div class="section-head">
              <div>
                <span class="section-tag">Otros bloques</span>
                <h2>Contenido adicional</h2>
                <p>Secciones extra cargadas desde el CMS interno.</p>
              </div>
            </div>
            ${renderSections(site, otherSections, "Contenido adicional", "Bloques generales publicados por el administrador.") }
          </section>
        ` : ""}

        <section class="section shell">
          <div class="footer-card">
            <div>
              <strong>${escapeHtml(company.nombre || settings.title || "Rifas publicas")}</strong>
              <small>Slug publico: /${escapeHtml(slug || "sin-slug")}</small>
            </div>
            <div class="top-actions">
              ${settings.facebookUrl ? `<a class="button secondary" href="${escapeHtml(settings.facebookUrl)}" target="_blank" rel="noreferrer">Facebook</a>` : ""}
              ${settings.instagramUrl ? `<a class="button secondary" href="${escapeHtml(settings.instagramUrl)}" target="_blank" rel="noreferrer">Instagram</a>` : ""}
              ${settings.tiktokUrl ? `<a class="button secondary" href="${escapeHtml(settings.tiktokUrl)}" target="_blank" rel="noreferrer">TikTok</a>` : ""}
            </div>
          </div>
        </section>

        <section class="section shell">
          <div class="section-head">
            <div>
              <span class="section-tag">Vista interna</span>
              <h2>Snapshot consumido desde el backend</h2>
              <p>Esta primera version ya lee la API y renderiza contenido real; aqui puedes revisar el JSON recibido.</p>
            </div>
          </div>
          ${renderPreview(site)}
        </section>
      </main>
    </div>
  `;
}

async function loadSite() {
  const slug = getSlugFromLocation();

  if (!slug) {
    app.innerHTML = `
      <div class="page">
        <div class="loading-shell">
          <div class="loading-card">
            <div class="loading-badge">Falta slug</div>
            <h1>Abre la pagina con un slug publico</h1>
            <p>Usa una ruta como <strong>/agropecuario</strong> o agrega <strong>?slug=agropecuario</strong>.</p>
          </div>
        </div>
      </div>
    `;
    return;
  }

  app.innerHTML = `
    <div class="loading-shell">
      <div class="loading-card">
        <div class="loading-badge">Cargando sitio publico</div>
        <h1>Construyendo la landing de /${escapeHtml(slug)}</h1>
        <p>Estamos consultando el backend en ${escapeHtml(API_BASE_URL)}.</p>
      </div>
    </div>
  `;

  try {
    const response = await fetch(`${API_BASE_URL}/public-site/${encodeURIComponent(slug)}`);
    if (!response.ok) {
      throw new Error(`No se encontro el sitio para /${slug}`);
    }

    const site = await response.json();
    renderShell(site, slug);
  } catch (error) {
    app.innerHTML = `
      <div class="page">
        <div class="loading-shell">
          <div class="loading-card">
            <div class="loading-badge">Error</div>
            <h1>No fue posible cargar la pagina publica</h1>
            <p>${escapeHtml(error?.message || "Error inesperado")}</p>
            <div style="margin-top:18px">
              <a class="button primary" href="/" onclick="window.location.reload(); return false;">Intentar de nuevo</a>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

loadSite();




