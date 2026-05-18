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
const RAFFLE_SELECTOR_LIMIT = 180;
const raffleSelectorState = {
  open: false,
  site: null,
  slug: "",
  raffle: null,
  query: "",
  selected: [],
  numbers: [],
  stats: null,
  loading: false,
  error: "",
  notice: "",
  noticeTone: "info",
  updatedAt: "",
  requestId: 0,
  pollTimer: null,
  queryTimer: null,
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

function getRaffleDisplayTitle(raffle = {}) {
  return (
    raffle?.publicConfig?.publicTitle
    || raffle?.publicTitle
    || raffle?.campaign?.name
    || raffle?.campaign?.nombre
    || raffle?.campaign?.descripcion
    || "Sorteo"
  );
}

function getRaffleDisplayDescription(raffle = {}) {
  return (
    raffle?.publicConfig?.publicDescription
    || raffle?.publicDescription
    || raffle?.campaign?.descripcion
    || ""
  );
}

function getRaffleDisplayImage(raffle = {}, site = {}) {
  return (
    raffle?.publicConfig?.coverImageUrl
    || raffle?.coverImageUrl
    || site?.settings?.heroImageUrl
    || ASSETS.raffle
  );
}

function getRaffleDisplayPrice(raffle = {}) {
  const raw = raffle?.campaign?.numberValue ?? raffle?.campaign?.valor_numero ?? raffle?.numberValue ?? raffle?.valor_numero;
  const numeric = Number(raw || 0);
  return Number.isFinite(numeric) && numeric > 0 ? currencyFormatter.format(numeric) : "";
}

function getRaffleDisplayDate(raffle = {}) {
  const value = raffle?.campaign?.drawDate || raffle?.campaign?.fecha_sorteo || raffle?.drawDate || raffle?.fecha_sorteo;
  return value ? formatDate(value) : "";
}

function getRaffleDisplayMode(raffle = {}) {
  return String(
    raffle?.campaign?.registrationMode
      || raffle?.campaign?.ticketRegistrationMode
      || raffle?.registrationMode
      || raffle?.ticketRegistrationMode
      || "automatico",
  ).trim();
}

function getRaffleDisplayTotal(raffle = {}) {
  const raw = raffle?.campaign?.totalNumeros ?? raffle?.campaign?.total_numeros ?? raffle?.totalNumeros ?? raffle?.total_numeros;
  const numeric = Number(raw || 0);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
}

function getRaffleDisplayWhatsApp(site = {}) {
  return site?.settings?.whatsappNumber || site?.company?.whatsapp_number || "";
}

function normalizeTicketDisplayValue(value) {
  return String(value ?? "").trim();
}

function formatTicketSelectionLabel(ticket = {}) {
  const numbers = Array.isArray(ticket.numbers)
    ? ticket.numbers.map(normalizeTicketDisplayValue).filter(Boolean)
    : [];

  if (ticket.display) {
    return String(ticket.display).trim();
  }

  if (numbers.length > 1) {
    return numbers.join(" · ");
  }

  if (ticket.number) {
    return String(ticket.number).trim();
  }

  return numbers[0] || "";
}

function buildSelectionMessage(raffle = {}, selected = []) {
  const title = getRaffleDisplayTitle(raffle);
  const numbers = selected.map((item) => String(item || "").trim()).filter(Boolean);
  return `Hola, quiero participar en "${title}" con estos números: ${numbers.join(", ")}.`;
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

function escapeAttr(value) {
  return escapeHtml(value).replaceAll("`", "&#96;");
}

window.__PUBLIC_VIDEO_MODAL__ = window.__PUBLIC_VIDEO_MODAL__ || null;

function openVideoModal(payload = {}) {
  const modal = document.getElementById("video-modal");
  const frame = document.getElementById("video-modal-frame");
  const title = document.getElementById("video-modal-title");
  const subtitle = document.getElementById("video-modal-subtitle");

  if (!modal || !frame || !title || !subtitle) {
    return;
  }

  const embedded = buildEmbeddedVideoUrl(payload.url || "");
  const source = embedded || String(payload.url || "").trim();

  title.textContent = payload.title || "Video";
  subtitle.textContent = payload.subtitle || "Ganador verificado";

  if (embedded) {
    frame.innerHTML = `<iframe class="video-modal-player" src="${escapeAttr(embedded)}" title="${escapeAttr(payload.title || "Video")}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
  } else if (source) {
    frame.innerHTML = `<video class="video-modal-player" controls autoplay playsinline preload="metadata"><source src="${escapeAttr(source)}" />Tu navegador no soporta la reproduccion de video.</video>`;
  } else {
    frame.innerHTML = `<div class="video-modal-empty">No hay video disponible.</div>`;
  }

  modal.classList.add("is-open");
  document.body.classList.add("modal-open");
  window.__PUBLIC_VIDEO_MODAL__ = payload;
}

function closeVideoModal() {
  const modal = document.getElementById("video-modal");
  const frame = document.getElementById("video-modal-frame");
  if (modal) {
    modal.classList.remove("is-open");
  }
  if (frame) {
    frame.innerHTML = "";
  }
  document.body.classList.remove("modal-open");
  window.__PUBLIC_VIDEO_MODAL__ = null;
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

  const featured = raffles[0];
  const rest = raffles.slice(1);
  const renderRaffleCard = ({ campaign, publicConfig }, featuredMode = false) => {
    const image = getRaffleDisplayImage({ campaign, publicConfig }, site);
    const isFeatured = featuredMode || publicConfig?.isFeatured;
    const heroTitle = getRaffleDisplayTitle({ campaign, publicConfig });
    const description = getRaffleDisplayDescription({ campaign, publicConfig });
    const drawDate = getRaffleDisplayDate({ campaign, publicConfig });
    const price = getRaffleDisplayPrice({ campaign, publicConfig });
    const mode = getRaffleDisplayMode({ campaign, publicConfig });
    const total = getRaffleDisplayTotal({ campaign, publicConfig });

    if (featuredMode) {
      return `
        <article class="raffle-feature">
          <div class="raffle-feature-media">
            <img src="${escapeHtml(image)}" alt="${escapeHtml(heroTitle)}" />
            <div class="raffle-feature-badge">${isFeatured ? "Sorteo destacado" : "Sorteo disponible"}</div>
          </div>
          <div class="raffle-feature-body">
            <span class="section-tag">Sorteo destacado</span>
            <div class="chip-row">
              ${price ? `<span class="chip">Boleta ${price}</span>` : ""}
              ${drawDate ? `<span class="chip">${escapeHtml(drawDate)}</span>` : ""}
            </div>
            <h3 class="raffle-feature-title">${escapeHtml(heroTitle)}</h3>
            ${description ? `<p class="raffle-feature-copy">${escapeHtml(description)}</p>` : ""}
            <div class="raffle-feature-meta">
              <span>${escapeHtml(mode)}</span>
              ${total ? `<span>${escapeHtml(String(total))} boletas</span>` : ""}
            </div>
            <div class="raffle-feature-actions">
              <button
                type="button"
                class="button gold js-open-raffle-selector"
                data-raffle-id="${escapeAttr(String(campaign?.id || ""))}"
              >
                Escoger mis números
              </button>
            </div>
          </div>
        </article>
      `;
    }

    return `
      <article class="raffle-card raffle-card-compact">
        <div class="raffle-card-media">
          <img src="${escapeHtml(image)}" alt="${escapeHtml(heroTitle)}" />
          ${isFeatured ? `<div class="card-flag">Destacado</div>` : ""}
        </div>
        <div class="raffle-card-body">
          <h3 class="raffle-card-title">${escapeHtml(heroTitle)}</h3>
          ${description ? `<p class="raffle-card-copy">${escapeHtml(description)}</p>` : ""}
          <div class="chip-row">
            ${price ? `<span class="chip">Boleta ${price}</span>` : ""}
            <span class="chip">${escapeHtml(mode)}</span>
          </div>
          <div class="chip-row">
            ${drawDate ? `<span class="chip">${escapeHtml(drawDate)}</span>` : ""}
            ${total ? `<span class="chip">${escapeHtml(String(total))} boletas</span>` : ""}
          </div>
          <div class="raffle-card-actions">
            <button
              type="button"
              class="button gold js-open-raffle-selector"
              data-raffle-id="${escapeAttr(String(campaign?.id || ""))}"
            >
              Escoger mis números
            </button>
          </div>
        </div>
      </article>
    `;
  };

  return `
    <div class="raffle-showcase">
      ${renderRaffleCard(featured, true)}
      ${rest.length ? `
        <div class="raffle-list">
          ${rest.slice(0, 2).map((raffle) => {
            const campaign = raffle.campaign || {};
            const publicConfig = raffle.publicConfig || {};
            const heroTitle = getRaffleDisplayTitle({ campaign, publicConfig });
            const image = getRaffleDisplayImage({ campaign, publicConfig }, site);
            const drawDate = getRaffleDisplayDate({ campaign, publicConfig });
            const price = getRaffleDisplayPrice({ campaign, publicConfig });
            return `
              <article class="raffle-mini">
                <div class="raffle-mini-media">
                  <img src="${escapeHtml(image)}" alt="${escapeHtml(heroTitle)}" />
                </div>
                <div class="raffle-mini-body">
                  <h4>${escapeHtml(heroTitle)}</h4>
                  <div class="chip-row">
                    ${price ? `<span class="chip">Boleta ${price}</span>` : ""}
                    ${drawDate ? `<span class="chip">${escapeHtml(drawDate)}</span>` : ""}
                  </div>
                  <button
                    type="button"
                    class="button secondary js-open-raffle-selector"
                    data-raffle-id="${escapeAttr(String(campaign?.id || ""))}"
                  >
                    Ver números
                  </button>
                </div>
              </article>
            `;
          }).join("")}
        </div>
      ` : ""}
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
                <img src="${escapeHtml(preview)}" alt="${escapeHtml(video.title)}" />
                ${video.videoUrl ? `
                  <button
                    type="button"
                    class="play-overlay"
                    data-video-url="${escapeAttr(video.videoUrl)}"
                    data-video-title="${escapeAttr(video.title)}"
                    data-video-subtitle="${escapeAttr(video.winnerName || "Ganador verificado")}"
                    aria-label="Reproducir video"
                  >
                    <span class="play-overlay-badge">▶</span>
                    <span class="play-overlay-text">
                      <strong>Ver video</strong>
                      <small>Reproducir testimonio</small>
                    </span>
                  </button>
                ` : ""}
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

function getRaffleSelectorNumbers() {
  return asArray(raffleSelectorState.numbers).map((ticket) => ({
    ...ticket,
    display: formatTicketSelectionLabel(ticket),
  }));
}

function formatRelativeTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const diff = Math.max(0, Date.now() - date.getTime());
  const seconds = Math.round(diff / 1000);
  const minutes = Math.round(seconds / 60);
  const hours = Math.round(minutes / 60);

  if (seconds < 30) return "hace unos segundos";
  if (seconds < 60) return "hace menos de 1 minuto";
  if (minutes < 2) return "hace 1 minuto";
  if (minutes < 60) return `hace ${minutes} minutos`;
  if (hours < 2) return "hace 1 hora";
  if (hours < 24) return `hace ${hours} horas`;

  return new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function renderRaffleSelectorContent() {
  const raffle = raffleSelectorState.raffle || null;
  const site = raffleSelectorState.site || {};
  const title = raffle ? getRaffleDisplayTitle(raffle) : "Selecciona un sorteo";
  const description = raffle ? getRaffleDisplayDescription(raffle) : "";
  const image = raffle ? getRaffleDisplayImage(raffle, site) : ASSETS.raffle;
  const price = raffle ? getRaffleDisplayPrice(raffle) : "";
  const drawDate = raffle ? getRaffleDisplayDate(raffle) : "";
  const mode = raffle ? getRaffleDisplayMode(raffle) : "";
  const total = raffle ? getRaffleDisplayTotal(raffle) : 0;
  const stats = raffleSelectorState.stats || {};
  const availableCount = Number(stats.availableCount || raffleSelectorState.numbers.length || 0);
  const inventoryTotal = Number(stats.inventoryTotal || total || 0);
  const selected = raffleSelectorState.selected || [];
  const selectedCopy = selected.length
    ? selected
      .map((item) => `
        <button
          type="button"
          class="selected-chip"
          data-selector-remove="${escapeAttr(item)}"
        >
          <span>${escapeHtml(item)}</span>
          <strong>×</strong>
        </button>
      `)
      .join("")
    : `<div class="selector-empty">Aun no has elegido numeros. Toca alguno para armar tu seleccion.</div>`;
  const numbers = getRaffleSelectorNumbers();
  const numbersHtml = raffleSelectorState.loading
    ? Array.from({ length: 18 }).map(() => `<span class="ticket-chip skeleton"></span>`).join("")
    : numbers.length > 0
      ? numbers
        .map((ticket) => {
          const label = ticket.display || ticket.number || "";
          const isSelected = selected.includes(label);
          return `
            <button
              type="button"
              class="ticket-chip ${isSelected ? "is-selected" : ""}"
              data-selector-ticket="${escapeAttr(label)}"
            >
              ${escapeHtml(label)}
            </button>
          `;
        })
        .join("")
      : `<div class="selector-empty selector-empty-large">No hay numeros disponibles en este momento.</div>`;
  const isReady = raffle && !raffleSelectorState.loading;
  const whatsappNumber = getRaffleDisplayWhatsApp(site);
  const cleanWhatsapp = String(whatsappNumber || "").replace(/\D/g, "");
  const whatsappHref = cleanWhatsapp && selected.length
    ? `https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent(buildSelectionMessage(raffle, selected))}`
    : "#";
  const limitInfo = raffleSelectorState.query ? `Resultados para "${escapeHtml(raffleSelectorState.query)}"` : `${numbers.length} boletas visibles`;
  const lastUpdated = raffleSelectorState.updatedAt ? formatRelativeTime(raffleSelectorState.updatedAt) : "Actualizando...";
  const notice = raffleSelectorState.notice
    ? `<div class="selector-notice selector-notice-${escapeHtml(raffleSelectorState.noticeTone || "info")}">${escapeHtml(raffleSelectorState.notice)}</div>`
    : "";

  return `
    <div class="selector-head">
      <div class="selector-head-copy">
        <span class="section-tag">Boletas en tiempo real</span>
        <h3>${escapeHtml(title)}</h3>
        ${description ? `<p>${escapeHtml(description)}</p>` : ""}
      </div>
      <button type="button" class="selector-close" data-action="close-raffle-selector">Cerrar</button>
    </div>

    ${raffle ? `
      <div class="selector-hero">
        <div class="selector-hero-media">
          <img src="${escapeHtml(image)}" alt="${escapeHtml(title)}" />
        </div>
        <div class="selector-hero-body">
          <div class="chip-row">
            ${price ? `<span class="chip">Boleta ${price}</span>` : ""}
            ${drawDate ? `<span class="chip">${escapeHtml(drawDate)}</span>` : ""}
            ${mode ? `<span class="chip">${escapeHtml(mode)}</span>` : ""}
          </div>
          <div class="selector-hero-stats">
            <div>
              <strong>${escapeHtml(String(availableCount))}</strong>
              <span>Disponibles ahora</span>
            </div>
            <div>
              <strong>${escapeHtml(String(inventoryTotal || availableCount))}</strong>
              <span>Total del sorteo</span>
            </div>
            <div>
              <strong>${escapeHtml(lastUpdated)}</strong>
              <span>Actualizacion</span>
            </div>
          </div>
        </div>
      </div>
    ` : ""}

    <div class="selector-layout">
      <div class="selector-main">
        <div class="selector-toolbar">
          <label class="selector-search">
            <span>Buscar numero</span>
            <input
              type="search"
              data-selector-search
              value="${escapeHtml(raffleSelectorState.query || "")}"
              placeholder="Ej. 705"
              autocomplete="off"
            />
          </label>
          <div class="selector-toolbar-actions">
            <div class="selector-toolbar-note">${escapeHtml(limitInfo)}</div>
            <button type="button" class="button secondary selector-refresh" data-action="refresh-raffle-selector">Actualizar</button>
          </div>
        </div>
        ${notice}
        <div class="ticket-grid">
          ${numbersHtml}
        </div>
      </div>

      <aside class="selector-summary">
        <div class="selector-summary-head">
          <span class="section-tag">Tu seleccion</span>
          <h4>${selected.length ? `${selected.length} numero${selected.length === 1 ? "" : "s"}` : "Aun no seleccionas numeros"}</h4>
        </div>
        <div class="selected-list">
          ${selectedCopy}
        </div>
        <div class="selector-summary-footer">
          <div class="selector-summary-note">
            <strong>${selected.length ? buildSelectionMessage(raffle, selected) : "Selecciona los numeros que quieras apartar."}</strong>
          </div>
          <div class="selector-summary-actions">
            <button type="button" class="button secondary" data-action="clear-raffle-selection" ${selected.length ? "" : "disabled"}>Limpiar</button>
            <a
              class="button gold ${selected.length && isReady ? "" : "is-disabled"}"
              href="${escapeHtml(whatsappHref)}"
              target="_blank"
              rel="noreferrer"
              ${selected.length && isReady ? "" : 'aria-disabled="true" tabindex="-1"'}
            >
              Continuar por WhatsApp
            </a>
          </div>
        </div>
      </aside>
    </div>

    <div class="selector-summary-mobile">
      <div class="selector-summary-mobile-copy">
        <span class="section-tag">Tu seleccion</span>
        <strong>${selected.length ? `${selected.length} numero${selected.length === 1 ? "" : "s"} elegidos` : "Sin numeros aun"}</strong>
        <span>${selected.length ? buildSelectionMessage(raffle, selected) : "Toca un numero para empezar."}</span>
      </div>
      <div class="selector-summary-mobile-chips">
        ${selected.length
          ? selected
            .map((item) => `<button type="button" class="selected-chip mobile" data-selector-remove="${escapeAttr(item)}">${escapeHtml(item)}<strong>×</strong></button>`)
            .join("")
          : `<div class="selector-empty selector-empty-inline">Aun no has elegido numeros.</div>`}
      </div>
      <div class="selector-summary-mobile-actions">
        <button type="button" class="button secondary" data-action="clear-raffle-selection" ${selected.length ? "" : "disabled"}>Limpiar</button>
        <a
          class="button gold ${selected.length && isReady ? "" : "is-disabled"}"
          href="${escapeHtml(whatsappHref)}"
          target="_blank"
          rel="noreferrer"
          ${selected.length && isReady ? "" : 'aria-disabled="true" tabindex="-1"'}
        >
          WhatsApp
        </a>
      </div>
    </div>
  `;
}

function renderRaffleSelectorModal() {
  return `
    <div
      id="raffle-selector-modal"
      class="raffle-selector-modal"
      role="dialog"
      aria-modal="true"
      aria-hidden="true"
    >
      <div class="raffle-selector-card">
        <div id="raffle-selector-content" class="raffle-selector-content">
          <div class="selector-empty selector-empty-large">Selecciona un sorteo para ver sus numeros disponibles.</div>
        </div>
      </div>
    </div>
  `;
}

function syncRaffleSelectorModal() {
  const modal = document.getElementById("raffle-selector-modal");
  if (!modal) return;
  modal.classList.toggle("is-open", raffleSelectorState.open);
  modal.setAttribute("aria-hidden", raffleSelectorState.open ? "false" : "true");
  document.body.classList.toggle("modal-open", raffleSelectorState.open);
}

function paintRaffleSelector() {
  const content = document.getElementById("raffle-selector-content");
  if (!content) return;
  content.innerHTML = renderRaffleSelectorContent();
  syncRaffleSelectorModal();
}

function clearRaffleSelectorTimers() {
  if (raffleSelectorState.pollTimer) {
    clearInterval(raffleSelectorState.pollTimer);
    raffleSelectorState.pollTimer = null;
  }
  if (raffleSelectorState.queryTimer) {
    clearTimeout(raffleSelectorState.queryTimer);
    raffleSelectorState.queryTimer = null;
  }
}

async function fetchRaffleSelectorNumbers({ silent = false } = {}) {
  const site = raffleSelectorState.site || {};
  const slug = raffleSelectorState.slug || "";
  const raffle = raffleSelectorState.raffle || null;
  if (!site || !slug || !raffle?.campaign?.id) {
    return;
  }

  const requestId = ++raffleSelectorState.requestId;
  raffleSelectorState.loading = !silent;
  raffleSelectorState.error = "";
  if (!silent) {
    raffleSelectorState.notice = "Cargando numeros disponibles...";
    raffleSelectorState.noticeTone = "info";
  }
  paintRaffleSelector();

  try {
    const searchParams = new URLSearchParams();
    searchParams.set("limit", String(RAFFLE_SELECTOR_LIMIT));
    if (raffleSelectorState.query) {
      searchParams.set("query", raffleSelectorState.query);
    }

    const response = await fetch(
      `${API_BASE_URL}/public-site/${encodeURIComponent(slug)}/raffles/${encodeURIComponent(raffle.campaign.id)}/availability?${searchParams.toString()}`,
      { cache: "no-store" },
    );

    if (!response.ok) {
      throw new Error("No fue posible cargar los numeros de este sorteo.");
    }

    const payload = await response.json();
    if (requestId !== raffleSelectorState.requestId) {
      return;
    }

    raffleSelectorState.raffle = payload?.raffle
      ? {
          ...raffle,
          campaign: {
            ...(raffle.campaign || {}),
            id: payload.raffle.id,
            codigo: payload.raffle.code,
            nombre: payload.raffle.name,
            descripcion: payload.raffle.description,
            fecha_sorteo: payload.raffle.drawDate,
            hora_sorteo: payload.raffle.drawTime,
            valor_numero: payload.raffle.numberValue,
            total_numeros: payload.raffle.totalNumeros,
            ticket_registration_mode: payload.raffle.ticketRegistrationMode,
            ticket_auto_config: payload.raffle.ticketAutoConfig || {},
            updated_at: payload.raffle.updatedAt,
          },
        }
      : raffle;
    raffleSelectorState.numbers = asArray(payload?.numbers);
    raffleSelectorState.stats = payload?.stats || null;
    raffleSelectorState.updatedAt = payload?.updatedAt || new Date().toISOString();
    raffleSelectorState.loading = false;
    raffleSelectorState.error = "";
    raffleSelectorState.notice = raffleSelectorState.query
      ? `Resultados actualizados para "${raffleSelectorState.query}".`
      : "Numeros actualizados en tiempo real.";
    raffleSelectorState.noticeTone = "success";
    paintRaffleSelector();
  } catch (error) {
    if (requestId !== raffleSelectorState.requestId) {
      return;
    }
    raffleSelectorState.loading = false;
    raffleSelectorState.error = error?.message || "No fue posible cargar los numeros.";
    raffleSelectorState.notice = raffleSelectorState.error;
    raffleSelectorState.noticeTone = "error";
    paintRaffleSelector();
  }
}

function openRaffleSelector(raffleId) {
  const site = raffleSelectorState.site || window.__PUBLIC_SITE_STATE__?.site || null;
  const raffles = asArray(site?.activeRaffles);
  const raffle = raffles.find((item) => String(item?.campaign?.id || "") === String(raffleId));
  if (!raffle) {
    return;
  }

  raffleSelectorState.site = site;
  raffleSelectorState.slug = window.__PUBLIC_SITE_STATE__?.slug || raffleSelectorState.slug || "";
  raffleSelectorState.raffle = raffle;
  raffleSelectorState.query = "";
  raffleSelectorState.selected = [];
  raffleSelectorState.numbers = [];
  raffleSelectorState.stats = null;
  raffleSelectorState.loading = true;
  raffleSelectorState.error = "";
  raffleSelectorState.notice = "Cargando numeros disponibles...";
  raffleSelectorState.noticeTone = "info";
  raffleSelectorState.updatedAt = "";
  raffleSelectorState.open = true;

  clearRaffleSelectorTimers();
  syncRaffleSelectorModal();
  paintRaffleSelector();
  fetchRaffleSelectorNumbers();
  raffleSelectorState.pollTimer = setInterval(() => {
    if (raffleSelectorState.open) {
      fetchRaffleSelectorNumbers({ silent: true });
    }
  }, 18000);
}

function closeRaffleSelector() {
  raffleSelectorState.open = false;
  raffleSelectorState.raffle = null;
  raffleSelectorState.query = "";
  raffleSelectorState.selected = [];
  raffleSelectorState.numbers = [];
  raffleSelectorState.stats = null;
  raffleSelectorState.loading = false;
  raffleSelectorState.error = "";
  raffleSelectorState.notice = "";
  raffleSelectorState.noticeTone = "info";
  raffleSelectorState.updatedAt = "";
  raffleSelectorState.requestId += 1;
  clearRaffleSelectorTimers();
  paintRaffleSelector();
  syncRaffleSelectorModal();
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

function renderTrustStrip(site) {
  const settings = site?.settings || {};
  const company = site?.company || {};
  const items = [
    {
      title: "Compra segura",
      text: "Tu información y tu pago se gestionan desde el backend.",
    },
    {
      title: "Sorteos visibles",
      text: `${asArray(site.activeRaffles).length} sorteos activos en la landing.`,
    },
    {
      title: "Premios reales",
      text: `${asArray(site.winnerVideos).length} videos de ganadores publicados.`,
    },
    {
      title: "Atención directa",
      text: settings.whatsappNumber || company.whatsapp_number ? `WhatsApp: ${settings.whatsappNumber || company.whatsapp_number}` : "Soporte por WhatsApp",
    },
  ];

  return `
    <section class="section shell trust-strip">
      ${items
        .map(
          (item) => `
            <div class="trust-item">
              <div class="trust-icon">✦</div>
              <div>
                <strong>${escapeHtml(item.title)}</strong>
                <span>${escapeHtml(item.text)}</span>
              </div>
            </div>
          `,
        )
        .join("")}
    </section>
  `;
}

function renderHowItWorks() {
  const steps = [
    ["Escoge tus números", "Selecciona los números que más te gusten."],
    ["Realiza el pago", "Paga por el medio que prefieras."],
    ["Envía comprobante", "Sube el soporte desde WhatsApp."],
    ["Recibe tu boleta", "La boleta queda lista para seguimiento."],
  ];

  return `
    <section class="section shell section-anchor" id="como-participar">
      <div class="section-head">
        <div>
          <span class="section-tag">Cómo participar</span>
          <h2>Compra en menos de 2 minutos</h2>
          <p>Una ruta clara y rápida para pasar de ver el sorteo a tener tu boleta registrada.</p>
        </div>
      </div>
      <div class="grid-4">
        ${steps
          .map(
            ([title, text], index) => `
              <article class="step-card">
                <div class="step-number">${index + 1}</div>
                <strong>${escapeHtml(title)}</strong>
                <p>${escapeHtml(text)}</p>
              </article>
            `,
          )
          .join("")}
      </div>
    </section>
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
  raffleSelectorState.site = site;
  raffleSelectorState.slug = slug;
  window.__PUBLIC_SITE_STATE__ = {
    site,
    slug,
    raffles: asArray(site.activeRaffles),
  };

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
              <span class="brand-subtitle">Tu portal de rifas y ganadores</span>
            </div>
          </div>
          <nav class="top-nav" aria-label="Navegación principal">
            <a href="#inicio">Inicio</a>
            <a href="#sorteos">Sorteos</a>
            <a href="#videos">Ganadores</a>
            <a href="#como-participar">Cómo participar</a>
            <a href="#faq">Ayuda</a>
          </nav>
          <div class="top-actions">
            ${settings.whatsappNumber ? `<a class="button topbar-cta" href="${escapeHtml(whatsappLink(settings.whatsappNumber))}" target="_blank" rel="noreferrer">Escríbenos</a>` : ""}
          </div>
        </div>
      </header>

      <main>
        <section class="hero" id="inicio">
          <div class="shell hero-card">
            <div class="hero-grid">
              <div>
                <span class="eyebrow">Premios reales · Compra segura</span>
                <h1>${escapeHtml(heroTitle)}${slogan ? ` <span class="accent">${escapeHtml(slogan)}</span>` : ""}</h1>
                <p>${escapeHtml(heroSubtitle)}</p>
                <div class="hero-actions">
                  ${heroButton ? `<a class="button gold" href="${escapeHtml(heroButton)}" target="_blank" rel="noreferrer">${escapeHtml(heroLabel)}</a>` : ""}
                  <a class="button secondary" href="#sorteos">Ver sorteos</a>
                </div>
                <div class="hero-ribbon">
                  <span>✦</span>
                  <span>${escapeHtml(settings.heroButtonUrl ? "Contenido actualizado desde el panel" : "Contenido actualizado desde el panel")}</span>
                </div>
                <div class="hero-meta">
                  <div class="meta-card">
                    <strong>${escapeHtml(String(raffleCount))}</strong>
                    <span>Sorteos visibles</span>
                  </div>
                  <div class="meta-card">
                    <strong>${escapeHtml(String(videosCount))}</strong>
                    <span>Ganadores reales</span>
                  </div>
                  <div class="meta-card">
                    <strong>${escapeHtml(String(faqCount))}</strong>
                    <span>Dudas resueltas</span>
                  </div>
                </div>
              </div>

              <div class="hero-media">
                ${heroVideo ? renderInlineVideo(heroVideo, heroTitle) : `<img src="${escapeHtml(heroImage)}" alt="${escapeHtml(heroTitle)}" />`}
                <div class="overlay">
                  <strong>${escapeHtml(heroTitle)}</strong>
                  <div style="margin-top:6px">${escapeHtml(settings.heroButtonLabel || "Escoge tu boleta y participa")}</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        ${renderTrustStrip(site)}

        <section class="section shell section-anchor" id="sorteos">
          <div class="section-head">
            <div>
              <span class="section-tag">Sorteos disponibles</span>
              <h2>Sorteos disponibles</h2>
              <p>Selecciona el sorteo que quieras comprar y mira sus numeros disponibles en tiempo real.</p>
            </div>
          </div>
          ${renderRaffles(site)}
        </section>

        ${renderHowItWorks()}

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
              <span class="section-tag">Ganadores</span>
              <h2>Ganadores reales, historias que inspiran confianza</h2>
              <p>Mira entregas, testimonios y momentos reales de quienes ya participaron y ganaron.</p>
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
        ${renderRaffleSelectorModal()}
      <div id="video-modal" class="video-modal" role="dialog" aria-modal="true" aria-hidden="true" onclick="if (event.target.id === 'video-modal') { closeVideoModal(); }">
        <div class="video-modal-card" role="document">
          <button type="button" class="video-modal-close" aria-label="Cerrar video" onclick="closeVideoModal()">×</button>
          <div class="video-modal-head">
            <div class="section-tag">Video de ganador</div>
            <h3 id="video-modal-title">Video</h3>
            <p id="video-modal-subtitle"></p>
          </div>
          <div id="video-modal-frame" class="video-modal-frame"></div>
        </div>
      </div>
    </div>
  `;

  document.querySelectorAll("[data-video-url]").forEach((button) => {
    button.addEventListener("click", () => {
      openVideoModal({
        url: button.getAttribute("data-video-url") || "",
        title: button.getAttribute("data-video-title") || "",
        subtitle: button.getAttribute("data-video-subtitle") || "",
      });
    });
  });
}

app.addEventListener("click", (event) => {
  const openButton = event.target.closest("[data-raffle-id].js-open-raffle-selector");
  if (openButton && app.contains(openButton)) {
    event.preventDefault();
    openRaffleSelector(openButton.getAttribute("data-raffle-id") || "");
    return;
  }

  const modal = event.target.closest("#raffle-selector-modal");
  if (modal && event.target.id === "raffle-selector-modal") {
    closeRaffleSelector();
    return;
  }

  const action = event.target.closest("[data-action]");
  if (!action) {
    return;
  }

  const actionName = action.getAttribute("data-action");
  if (actionName === "close-raffle-selector") {
    event.preventDefault();
    closeRaffleSelector();
    return;
  }

  if (actionName === "refresh-raffle-selector") {
    event.preventDefault();
    fetchRaffleSelectorNumbers();
    return;
  }

  if (actionName === "clear-raffle-selection") {
    event.preventDefault();
    raffleSelectorState.selected = [];
    raffleSelectorState.notice = "Seleccion limpiada.";
    raffleSelectorState.noticeTone = "info";
    paintRaffleSelector();
    return;
  }
});

app.addEventListener("click", (event) => {
  const ticketButton = event.target.closest("[data-selector-ticket]");
  if (ticketButton && app.contains(ticketButton)) {
    event.preventDefault();
    const value = normalizeTicketDisplayValue(ticketButton.getAttribute("data-selector-ticket"));
    if (!value) {
      return;
    }

    const exists = raffleSelectorState.selected.includes(value);
    raffleSelectorState.selected = exists
      ? raffleSelectorState.selected.filter((item) => item !== value)
      : [...raffleSelectorState.selected, value];
    raffleSelectorState.notice = exists
      ? `Quitaste ${value} de tu seleccion.`
      : `Agregaste ${value} a tu seleccion.`;
    raffleSelectorState.noticeTone = "success";
    paintRaffleSelector();
  }
});

app.addEventListener("click", (event) => {
  const removeButton = event.target.closest("[data-selector-remove]");
  if (removeButton && app.contains(removeButton)) {
    event.preventDefault();
    const value = normalizeTicketDisplayValue(removeButton.getAttribute("data-selector-remove"));
    raffleSelectorState.selected = raffleSelectorState.selected.filter((item) => item !== value);
    raffleSelectorState.notice = value ? `Quitaste ${value} de tu seleccion.` : "";
    raffleSelectorState.noticeTone = "info";
    paintRaffleSelector();
  }
});

app.addEventListener("input", (event) => {
  const input = event.target.closest("[data-selector-search]");
  if (!input || !app.contains(input)) {
    return;
  }

  raffleSelectorState.query = String(input.value || "").trim();
  if (raffleSelectorState.queryTimer) {
    clearTimeout(raffleSelectorState.queryTimer);
  }

  raffleSelectorState.queryTimer = setTimeout(() => {
    fetchRaffleSelectorNumbers();
  }, 300);
});

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






