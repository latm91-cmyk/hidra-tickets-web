const CONFIG = window.__PUBLIC_SITE_CONFIG__ || {};
const API_BASE_URL = String(CONFIG.apiBaseUrl || "http://localhost:10000").replace(/\/+$/, "");
const app = document.getElementById("app");
const ASSETS = {
  brand: "/assets/logo-placeholder.webp",
  hero: "/assets/hero-caballo.webp",
  raffle: "/assets/raffle-card.webp",
  winner: "/assets/winner-video.webp",
  payments: "/assets/payment-methods.webp",
  pse: "/assets/pse-logo.svg",
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

const paymentModalState = {
  open: false,
  site: null,
  slug: "",
  raffle: null,
  selected: [],
  amount: 0,
  customerName: "",
  customerCity: "",
  customerPhone: "",
  file: null,
  fileName: "",
  checkoutUrl: "",
  loading: false,
  error: "",
  notice: "",
  noticeTone: "info",
  requestId: 0,
};

const currencyFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

function formatCOP(value) {
  const numeric = Number(value || 0);
  return Number.isFinite(numeric) ? currencyFormatter.format(numeric) : currencyFormatter.format(0);
}

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
  const pricingConfig = getRafflePricingConfig(raffle);
  const raw = pricingConfig?.precioUnitario
    ?? pricingConfig?.precio_unitario
    ?? getRafflePricingPackages(raffle).find((item) => Number(item.quantity || 0) === 1)?.value
    ?? raffle?.campaign?.numberValue
    ?? raffle?.campaign?.valor_numero
    ?? raffle?.numberValue
    ?? raffle?.valor_numero;
  const numeric = Number(String(raw || "").replace(/[^\d.-]/g, "")) || 0;
  return Number.isFinite(numeric) && numeric > 0 ? currencyFormatter.format(numeric) : "";
}

function getRafflePricingConfig(raffle = {}) {
  const raw = raffle?.campaign?.pricingConfig || raffle?.campaign?.pricing_config || raffle?.pricingConfig || raffle?.pricing_config || {};
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }
  return raw && typeof raw === "object" ? raw : {};
}

function getRafflePricingStrategy(raffle = {}) {
  return String(
    raffle?.campaign?.pricingStrategy
      || raffle?.campaign?.pricing_strategy
      || raffle?.pricingStrategy
      || raffle?.pricing_strategy
      || "",
  ).toLowerCase();
}

function getRafflePricingPackages(raffle = {}) {
  const pricingConfig = getRafflePricingConfig(raffle);
  const rawPackages = Array.isArray(pricingConfig.packages) ? pricingConfig.packages : [];

  return rawPackages
    .map((item) => {
      const quantity = Number(item?.cantidad ?? item?.quantity ?? item?.cant ?? (item?.n || 0));
      const rawValue = item?.valor ?? item?.value ?? item?.precio ?? item?.price ?? "";
      const value = Number(String(rawValue || "").replace(/[^\d.-]/g, "")) || 0;
      return quantity > 0 && value > 0 ? { quantity, value } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.quantity - b.quantity);
}

function getRafflePriceForQuantity(raffle = {}, quantity = 1) {
  const packages = getRafflePricingPackages(raffle);
  const count = Math.max(1, Number.parseInt(quantity, 10) || 1);

  const exact = packages.find((item) => item.quantity === count);
  if (exact) {
    return exact.value;
  }

  if (!packages.length) {
    const fallback = Number(
      raffle?.campaign?.numberValue
      ?? raffle?.campaign?.valor_numero
      ?? raffle?.numberValue
      ?? raffle?.valor_numero
      ?? 0,
    );
    return Number.isFinite(fallback) ? fallback * count : 0;
  }

  const sorted = [...packages].sort((a, b) => b.quantity - a.quantity);
  let remaining = count;
  let total = 0;

  for (const item of sorted) {
    if (!item.quantity) continue;
    while (remaining >= item.quantity) {
      total += item.value;
      remaining -= item.quantity;
    }
  }

  if (remaining > 0) {
    const unit = packages.find((item) => item.quantity === 1);
    total += unit ? unit.value * remaining : (packages[0]?.value || 0) * remaining;
  }

  return total;
}

function formatRafflePricingSummary(raffle = {}) {
  const packages = getRafflePricingPackages(raffle);
  if (!packages.length) {
    const price = getRaffleDisplayPrice(raffle);
    return price ? `Precio por boleta ${price}` : "";
  }

  return packages
    .map((item) => `${item.quantity} boleta${item.quantity === 1 ? "" : "s"} = ${currencyFormatter.format(item.value)}`)
    .join(" | ");
}

function getRafflePricingBadge(raffle = {}) {
  const packages = getRafflePricingPackages(raffle);
  if (packages.length > 0) {
    return "";
  }

  const price = getRaffleDisplayPrice(raffle);
  return price ? `Boleta ${price}` : "";
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

function getRaffleSelectorAutoConfig(raffle = {}) {
  const raw = raffle?.campaign?.ticketAutoConfig || raffle?.campaign?.ticket_auto_config || {};
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }
  return raw && typeof raw === "object" ? raw : {};
}

function getRaffleSelectorFallbackNumbers(raffle = {}) {
  const total = Number(
    raffle?.campaign?.totalNumeros
    ?? raffle?.campaign?.total_numeros
    ?? raffle?.totalNumeros
    ?? raffle?.total_numeros
    ?? 0,
  );
  const autoConfig = getRaffleSelectorAutoConfig(raffle);
  const digitsRaw = Number(autoConfig.numberDigits || autoConfig.number_digits || 0);
  const digits = Number.isFinite(digitsRaw) && digitsRaw > 0
    ? Math.min(Math.max(digitsRaw, 2), 6)
    : Math.min(Math.max(String(Math.max(total, 1)).length, 2), 6);
  const startRaw = String(autoConfig.numberStart || autoConfig.number_start || "").trim();
  const endRaw = String(autoConfig.numberEnd || autoConfig.number_end || "").trim();

  const startNumeric = startRaw ? Number.parseInt(startRaw.replace(/\D/g, ""), 10) : NaN;
  const endNumeric = endRaw ? Number.parseInt(endRaw.replace(/\D/g, ""), 10) : NaN;

  let numbers = [];
  if (Number.isFinite(startNumeric) && Number.isFinite(endNumeric) && endNumeric >= startNumeric) {
    const limit = Math.min(endNumeric - startNumeric + 1, 500);
    for (let index = 0; index < limit; index += 1) {
      const value = startNumeric + index;
      numbers.push(String(value).padStart(digits, "0"));
    }
  } else if (total > 0) {
    const limit = Math.min(total, 500);
    for (let value = 1; value <= limit; value += 1) {
      numbers.push(String(value).padStart(digits, "0"));
    }
  }

  return numbers.map((number) => ({
    id: number,
    number,
    display: number,
    numbers: [number],
    updatedAt: null,
    source: "fallback",
  }));
}

function filterRaffleSelectorNumbers(numbers = [], query = "") {
  const normalizedQuery = String(query || "").trim().replace(/\s+/g, "");
  if (!normalizedQuery) {
    return numbers;
  }

  const queryDigits = normalizedQuery.replace(/\D/g, "");
  const queryLower = normalizedQuery.toLowerCase();

  return numbers.filter((ticket) => {
    const haystacks = [
      String(ticket?.display || ""),
      String(ticket?.number || ""),
      Array.isArray(ticket?.numbers) ? ticket.numbers.join(" ") : "",
    ]
      .map((item) => String(item || "").toLowerCase())
      .filter(Boolean);

    if (haystacks.some((value) => value.includes(queryLower))) {
      return true;
    }

    if (queryDigits && haystacks.some((value) => value.includes(queryDigits))) {
      return true;
    }

    return false;
  });
}

function selectRaffleSelectorTicket(value) {
  handleRaffleSelectorTicketValue(value);
}

function removeRaffleSelectorTicket(value) {
  handleRaffleSelectorRemoveValue(value);
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

function isMobileDevice() {
  return (
    typeof navigator !== "undefined"
    && (
      /Android|iPhone|iPad|iPod|IEMobile|Opera Mini/i.test(navigator.userAgent || "")
      || (navigator.maxTouchPoints || 0) > 1
      || window.matchMedia?.("(pointer: coarse)")?.matches
    )
  );
}

function buildWhatsAppHref(number, message) {
  const digits = String(number || "").replace(/\D/g, "");
  if (!digits) return "#";

  const text = encodeURIComponent(String(message || ""));
  if (isMobileDevice()) {
    return `https://wa.me/${digits}?text=${text}`;
  }

  return `https://web.whatsapp.com/send?phone=${digits}&text=${text}`;
}

function scrollToPaymentSection() {
  const target = document.getElementById("pagos");
  if (target) {
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

async function readJsonResponse(response) {
  const raw = await response.text();
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return { message: raw };
  }
}

function getSelectionStorageKey(raffleId) {
  const slug = raffleSelectorState.slug || window.__PUBLIC_SITE_STATE__?.slug || "public";
  return `hidra-tickets-selection:${slug}:${String(raffleId || "")}`;
}

function readPersistedSelection(raffleId) {
  try {
    const raw = window.localStorage.getItem(getSelectionStorageKey(raffleId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((item) => String(item || "").trim()).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function persistSelection(raffleId, selected) {
  try {
    const value = JSON.stringify(asArray(selected).map((item) => String(item || "").trim()).filter(Boolean));
    window.localStorage.setItem(getSelectionStorageKey(raffleId), value);
  } catch {
    // Ignore storage failures.
  }
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
    const pricingBadge = getRafflePricingBadge({ campaign, publicConfig });
    const pricingSummary = formatRafflePricingSummary({ campaign, publicConfig });
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
              ${pricingBadge ? `<span class="chip">${escapeHtml(pricingBadge)}</span>` : ""}
              ${drawDate ? `<span class="chip">${escapeHtml(drawDate)}</span>` : ""}
            </div>
            ${pricingSummary ? `
              <div class="raffle-price-label">Precio de boletería:</div>
              <p class="raffle-price-summary">${escapeHtml(pricingSummary)}</p>
            ` : ""}
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
            ${pricingBadge ? `<span class="chip">${escapeHtml(pricingBadge)}</span>` : ""}
            <span class="chip">${escapeHtml(mode)}</span>
          </div>
          ${pricingSummary ? `<p class="raffle-price-summary">${escapeHtml(pricingSummary)}</p>` : ""}
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
            const pricingBadge = getRafflePricingBadge({ campaign, publicConfig });
            const pricingSummary = formatRafflePricingSummary({ campaign, publicConfig });
            return `
              <article class="raffle-mini">
                <div class="raffle-mini-media">
                  <img src="${escapeHtml(image)}" alt="${escapeHtml(heroTitle)}" />
                </div>
                <div class="raffle-mini-body">
                  <h4>${escapeHtml(heroTitle)}</h4>
                  <div class="chip-row">
                    ${pricingBadge ? `<span class="chip">${escapeHtml(pricingBadge)}</span>` : ""}
                    ${drawDate ? `<span class="chip">${escapeHtml(drawDate)}</span>` : ""}
                  </div>
                  ${pricingSummary ? `
                    <div class="raffle-price-label">Precio de boletería:</div>
                    <p class="raffle-price-summary">${escapeHtml(pricingSummary)}</p>
                  ` : ""}
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
  const raffle = raffleSelectorState.raffle || null;
  const rawNumbers = asArray(raffleSelectorState.numbers);
  const numbers = rawNumbers.length > 0 ? rawNumbers : getRaffleSelectorFallbackNumbers(raffle);

  return filterRaffleSelectorNumbers(
    numbers.map((ticket) => ({
      ...ticket,
      display: formatTicketSelectionLabel(ticket),
    })),
    raffleSelectorState.query || "",
  );
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
    const pricingBadge = raffle ? getRafflePricingBadge(raffle) : "";
  const drawDate = raffle ? getRaffleDisplayDate(raffle) : "";
  const mode = raffle ? getRaffleDisplayMode(raffle) : "";
  const total = raffle ? getRaffleDisplayTotal(raffle) : 0;
  const pricingSummary = raffle ? formatRafflePricingSummary(raffle) : "";
  const stats = raffleSelectorState.stats || {};
  const availableCount = Number(stats.availableCount || raffleSelectorState.numbers.length || 0);
  const inventoryTotal = Number(stats.inventoryTotal || total || 0);
  const persistedSelected = raffle ? readPersistedSelection(raffle.campaign.id) : [];
  const selected = raffleSelectorState.selected?.length
    ? raffleSelectorState.selected
    : persistedSelected;
  const selectedAmount = raffle ? getRafflePriceForQuantity(raffle, selected.length || 1) * (selected.length > 0 ? 1 : 0) : 0;
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
              aria-pressed="${isSelected ? "true" : "false"}"
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
  const whatsappMessage = buildSelectionMessage(raffle, selected);
  const whatsappHref = cleanWhatsapp && selected.length ? buildWhatsAppHref(cleanWhatsapp, whatsappMessage) : "#";
  const whatsappLabel = isMobileDevice() ? "Abrir WhatsApp" : "Continuar por WhatsApp Web";
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
              ${pricingBadge ? `<span class="chip">${escapeHtml(pricingBadge)}</span>` : ""}
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
          ${pricingSummary ? `
            <div class="raffle-price-label selector-price-label">Precio de boletería:</div>
            <p class="raffle-price-summary selector-price-summary">${escapeHtml(pricingSummary)}</p>
          ` : ""}
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
        ${selected.length ? `
          <div class="selector-live-summary">
            <strong>${selected.length} numero${selected.length === 1 ? "" : "s"} seleccionados</strong>
            <span>${escapeHtml(formatCOP(selectedAmount))}</span>
            <p>${escapeHtml(buildSelectionMessage(raffle, selected))}</p>
          </div>
        ` : ""}
        <div class="ticket-grid">
          ${numbersHtml}
        </div>
      </div>

      <aside class="selector-summary">
        <div class="selector-summary-head">
          <span class="section-tag">Tu seleccion</span>
          <h4>${selected.length ? `${selected.length} numero${selected.length === 1 ? "" : "s"}` : "Aun no seleccionas numeros"}</h4>
          ${selected.length ? `<p class="selector-summary-total">${escapeHtml(formatCOP(selectedAmount))}</p>` : ""}
        </div>
        <div class="selected-list">
          ${selectedCopy}
        </div>
        <div class="selector-summary-footer">
          <div class="selector-summary-note">
            <strong>${selected.length ? buildSelectionMessage(raffle, selected) : "Selecciona los numeros que quieras apartar."}</strong>
            <span>${selected.length ? "Tus numeros ya estan listos para continuar al pago." : "Cuando selecciones numeros, aqui veras el acceso al pago."}</span>
          </div>
          <div class="selector-summary-actions">
            <button type="button" class="button primary" data-action="go-payment-section" ${selected.length ? "" : "disabled"}>Continuar al pago</button>
            <button type="button" class="button secondary" data-action="clear-raffle-selection" ${selected.length ? "" : "disabled"}>Limpiar</button>
            <a
              class="button whatsapp ${selected.length && isReady ? "" : "is-disabled"}"
              href="${escapeHtml(whatsappHref)}"
              target="_blank"
              rel="noreferrer"
              ${selected.length && isReady ? "" : 'aria-disabled="true" tabindex="-1"'}
            >
              <span class="whatsapp-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
                  <path d="M12 2.25c-5.38 0-9.75 4.22-9.75 9.42 0 1.84.56 3.56 1.53 5.01L2.25 21.75l5.21-1.35a10.1 10.1 0 0 0 4.54 1.06c5.38 0 9.75-4.22 9.75-9.42S17.38 2.25 12 2.25zm5.83 13.3c-.25.7-1.45 1.3-1.99 1.38-.51.08-1.16.12-3.73-.88-3.1-1.2-5.1-4.35-5.25-4.56-.15-.2-1.24-1.66-1.24-3.16 0-1.5.79-2.24 1.07-2.55.28-.31.61-.39.82-.39h.59c.19 0 .44-.07.69.52.25.6.85 2.08.93 2.23.08.16.13.34.02.55-.11.22-.17.36-.33.55-.17.19-.35.43-.49.58-.16.17-.33.36-.14.67.19.31.84 1.41 1.8 2.28 1.24 1.12 2.28 1.47 2.61 1.64.33.17.52.14.71-.08.19-.22.81-.94 1.03-1.26.22-.31.43-.26.72-.15.28.11 1.78.84 2.09.99.31.15.52.23.6.36.08.14.08.79-.17 1.49z" fill="currentColor"/>
                </svg>
              </span>
              <span>${escapeHtml(whatsappLabel)}</span>
            </a>
          </div>
        </div>
      </aside>
    </div>

    <div class="selector-summary-mobile">
      <div class="selector-summary-mobile-copy">
        <span class="section-tag">Tu seleccion</span>
        <strong>${selected.length ? `${selected.length} numero${selected.length === 1 ? "" : "s"} elegidos` : "Sin numeros aun"}</strong>
        ${selected.length ? `<span class="selector-summary-mobile-total">${escapeHtml(formatCOP(selectedAmount))}</span>` : ""}
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
        <button type="button" class="button primary" data-action="go-payment-section" ${selected.length ? "" : "disabled"}>Continuar al pago</button>
        <button type="button" class="button secondary" data-action="clear-raffle-selection" ${selected.length ? "" : "disabled"}>Limpiar</button>
        <a
          class="button whatsapp ${selected.length && isReady ? "" : "is-disabled"}"
          href="${escapeHtml(whatsappHref)}"
          target="_blank"
          rel="noreferrer"
          ${selected.length && isReady ? "" : 'aria-disabled="true" tabindex="-1"'}
        >
          <span class="whatsapp-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
              <path d="M12 2.25c-5.38 0-9.75 4.22-9.75 9.42 0 1.84.56 3.56 1.53 5.01L2.25 21.75l5.21-1.35a10.1 10.1 0 0 0 4.54 1.06c5.38 0 9.75-4.22 9.75-9.42S17.38 2.25 12 2.25zm5.83 13.3c-.25.7-1.45 1.3-1.99 1.38-.51.08-1.16.12-3.73-.88-3.1-1.2-5.1-4.35-5.25-4.56-.15-.2-1.24-1.66-1.24-3.16 0-1.5.79-2.24 1.07-2.55.28-.31.61-.39.82-.39h.59c.19 0 .44-.07.69.52.25.6.85 2.08.93 2.23.08.16.13.34.02.55-.11.22-.17.36-.33.55-.17.19-.35.43-.49.58-.16.17-.33.36-.14.67.19.31.84 1.41 1.8 2.28 1.24 1.12 2.28 1.47 2.61 1.64.33.17.52.14.71-.08.19-.22.81-.94 1.03-1.26.22-.31.43-.26.72-.15.28.11 1.78.84 2.09.99.31.15.52.23.6.36.08.14.08.79-.17 1.49z" fill="currentColor"/>
            </svg>
          </span>
          <span>${escapeHtml(whatsappLabel)}</span>
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

function getPaymentModalSelectionTotal(raffle = {}, selected = []) {
  const quantity = Math.max(0, asArray(selected).length);
  if (!raffle || quantity <= 0) {
    return 0;
  }

  return getRafflePriceForQuantity(raffle, quantity);
}

function openPaymentModal(payload = {}) {
  const raffle = payload.raffle || null;
  const selected = asArray(payload.selected)
    .map((item) => String(item || "").trim())
    .filter(Boolean);

  paymentModalState.open = true;
  paymentModalState.site = payload.site || null;
  paymentModalState.slug = String(payload.slug || "").trim();
  paymentModalState.raffle = raffle;
  paymentModalState.selected = [...new Set(selected)];
  paymentModalState.amount = getPaymentModalSelectionTotal(raffle, paymentModalState.selected);
  paymentModalState.customerName = "";
  paymentModalState.customerCity = "";
  paymentModalState.customerPhone = "";
  paymentModalState.file = null;
  paymentModalState.fileName = "";
  paymentModalState.checkoutUrl = "";
  paymentModalState.loading = false;
  paymentModalState.error = "";
  paymentModalState.notice = "";
  paymentModalState.noticeTone = "info";
  paymentModalState.requestId += 1;
  syncPaymentModal();
  paintPaymentModal();
}

function closePaymentModal() {
  paymentModalState.open = false;
  paymentModalState.site = null;
  paymentModalState.slug = "";
  paymentModalState.raffle = null;
  paymentModalState.selected = [];
  paymentModalState.amount = 0;
  paymentModalState.customerName = "";
  paymentModalState.customerCity = "";
  paymentModalState.customerPhone = "";
  paymentModalState.file = null;
  paymentModalState.fileName = "";
  paymentModalState.checkoutUrl = "";
  paymentModalState.loading = false;
  paymentModalState.error = "";
  paymentModalState.notice = "";
  paymentModalState.noticeTone = "info";
  paymentModalState.requestId += 1;
  paintPaymentModal();
  syncPaymentModal();
}

function syncPaymentModal() {
  const modal = document.getElementById("payment-modal");
  if (!modal) return;
  modal.classList.toggle("is-open", paymentModalState.open);
  modal.setAttribute("aria-hidden", paymentModalState.open ? "false" : "true");
  document.body.classList.toggle("modal-open", paymentModalState.open || raffleSelectorState.open);
}

function refreshPaymentModalActionState() {
  const modal = document.getElementById("payment-modal");
  if (!modal) return;
  const ready = Boolean(
    paymentModalState.open
    && !paymentModalState.loading
    && String(paymentModalState.customerName || "").trim()
    && String(paymentModalState.customerCity || "").trim()
    && String(paymentModalState.customerPhone || "").trim()
    && asArray(paymentModalState.selected).length > 0,
  );

  modal.querySelectorAll('[data-action="start-public-pse"], [data-action="trigger-public-receipt-upload"]').forEach((button) => {
    if (button instanceof HTMLButtonElement) {
      button.disabled = !ready;
    }
  });
}

function renderPaymentModalContent() {
  const raffle = paymentModalState.raffle || null;
  const site = paymentModalState.site || {};
  const selected = asArray(paymentModalState.selected);
  const title = raffle ? getRaffleDisplayTitle(raffle) : "Pago";
  const description = raffle
    ? (getRaffleDisplayDescription(raffle) || "Continúa con tu pago con el método que prefieras.")
    : "Continúa con tu pago con el método que prefieras.";
  const total = Number(paymentModalState.amount || getPaymentModalSelectionTotal(raffle, selected) || 0);
  const pricingSummary = raffle ? formatRafflePricingSummary(raffle) : "";
  const selectedChips = selected.length
    ? selected
      .map((item) => `<span class="payment-chip">${escapeHtml(item)}</span>`)
      .join("")
    : `<div class="selector-empty selector-empty-inline">Aun no hay numeros seleccionados.</div>`;
  const receiptLabel = paymentModalState.fileName
    ? `<div class="payment-file-name">${escapeHtml(paymentModalState.fileName)}</div>`
    : "";
  const notice = paymentModalState.notice
    ? `<div class="payment-modal-notice payment-modal-notice-${escapeHtml(paymentModalState.noticeTone || "info")}">${escapeHtml(paymentModalState.notice)}</div>`
    : "";
  const checkoutUrl = paymentModalState.checkoutUrl || "";
  const customerName = String(paymentModalState.customerName || "").trim();
  const customerCity = String(paymentModalState.customerCity || "").trim();
  const customerPhone = String(paymentModalState.customerPhone || "").trim();
  const isContactReady = Boolean(selected.length && customerName && customerCity && customerPhone);
  const isDisabled = !isContactReady || paymentModalState.loading;
  const supportLabel = getRaffleDisplayWhatsApp(site) ? `Soporte por WhatsApp: ${getRaffleDisplayWhatsApp(site)}` : "Soporte por WhatsApp";

  return `
    <div class="payment-modal-head">
      <div class="payment-modal-head-copy">
        <span class="section-tag">Pago de boletas</span>
        <h3>Completa tu compra</h3>
        <p>${escapeHtml(description)}</p>
      </div>
      <button type="button" class="selector-close" data-action="close-payment-modal">Cerrar</button>
    </div>

    ${notice}

    <div class="payment-modal-grid">
        <div class="payment-modal-summary">
        <span class="payment-modal-kicker">Sorteo seleccionado</span>
        <h4>${escapeHtml(title)}</h4>
        <p class="payment-modal-copy">${escapeHtml(selected.length ? `Llevas ${selected.length} numero${selected.length === 1 ? "" : "s"} apartados.` : "Selecciona numeros antes de pagar.")}</p>
        <div class="payment-modal-chips">
          ${selectedChips}
        </div>
        <div class="payment-modal-total">
          <span>Total a pagar</span>
          <strong>${escapeHtml(formatCOP(total))}</strong>
        </div>
        ${pricingSummary ? `
          <div class="payment-modal-pricing">
            <span>Precio de boletería:</span>
            <p>${escapeHtml(pricingSummary)}</p>
          </div>
        ` : ""}
          <div class="payment-modal-footnote">${escapeHtml(supportLabel)}</div>
        </div>

        <div class="payment-modal-actions">
          <div class="payment-action-card payment-contact-card">
            <div class="payment-action-icon payment-action-icon-contact">✎</div>
            <div>
              <strong>Datos del comprador</strong>
              <p>Necesitamos estos datos para marcar y enviarte tus boletas y dejar tu compra registrada.</p>
            </div>
            <div class="payment-form-grid">
              <label class="payment-field">
                <span>Nombre</span>
                <input type="text" data-payment-field="customerName" value="${escapeAttr(paymentModalState.customerName || "")}" placeholder="Ej. Jennyfer Alvarado" />
              </label>
              <label class="payment-field">
                <span>Ciudad</span>
                <input type="text" data-payment-field="customerCity" value="${escapeAttr(paymentModalState.customerCity || "")}" placeholder="Ej. Neiva" />
              </label>
              <label class="payment-field">
                <span>Teléfono</span>
                <input type="tel" data-payment-field="customerPhone" value="${escapeAttr(paymentModalState.customerPhone || "")}" placeholder="Ej. 3001234567" />
              </label>
            </div>
          </div>

          <div class="payment-action-card">
            <div class="payment-action-icon payment-action-icon-pse">
              <img src="${escapeHtml(ASSETS.pse)}" alt="PSE" />
            </div>
            <div>
              <strong>Pago en línea</strong>
              <p>Abre la pasarela para completar la transacción.</p>
            </div>
            <button type="button" class="button payment-pse" data-action="start-public-pse" ${isDisabled ? "disabled" : ""}>PSE</button>
            ${checkoutUrl ? `<a class="button secondary payment-checkout-link" href="${escapeHtml(checkoutUrl)}" target="_blank" rel="noreferrer">Abrir checkout</a>` : ""}
          </div>

          <div class="payment-action-card">
            <div class="payment-action-icon payment-action-icon-upload">↥</div>
            <div>
              <strong>Cargar comprobante</strong>
              <p>Sube una imagen o un PDF para enviarlo a revisión.</p>
            </div>
            <input type="file" accept="image/*,application/pdf" data-public-receipt-input hidden />
            <button type="button" class="button secondary" data-action="trigger-public-receipt-upload" ${isDisabled ? "disabled" : ""}>Cargar comprobante</button>
            ${receiptLabel}
          </div>

        <button type="button" class="button secondary payment-back" data-action="close-payment-modal">Volver</button>
      </div>
    </div>
  `;
}

function paintPaymentModal() {
  const content = document.getElementById("payment-modal-content");
  if (!content) return;
  content.innerHTML = renderPaymentModalContent();
  syncPaymentModal();
  refreshPaymentModalActionState();
}

function renderPaymentModal() {
  return `
    <div
      id="payment-modal"
      class="payment-modal"
      role="dialog"
      aria-modal="true"
      aria-hidden="true"
    >
      <div class="payment-modal-card">
        <div id="payment-modal-content" class="payment-modal-content">
          <div class="selector-empty selector-empty-large">Selecciona numeros para continuar con el pago.</div>
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
  bindRaffleSelectorActions(content);
  syncRaffleSelectorModal();
}

function handleRaffleSelectorTicketValue(rawValue) {
  const value = normalizeTicketDisplayValue(rawValue);
  if (!value || !raffleSelectorState.raffle) {
    return;
  }

  const exists = raffleSelectorState.selected.includes(value);
  raffleSelectorState.selected = exists
    ? raffleSelectorState.selected.filter((item) => item !== value)
    : [...raffleSelectorState.selected, value];
  persistSelection(raffleSelectorState.raffle?.campaign?.id, raffleSelectorState.selected);
  raffleSelectorState.notice = exists
    ? `Quitaste ${value} de tu seleccion.`
    : `Agregaste ${value} a tu seleccion.`;
  raffleSelectorState.noticeTone = "success";
  paintRaffleSelector();
}

function handleRaffleSelectorRemoveValue(rawValue) {
  const value = normalizeTicketDisplayValue(rawValue);
  if (!raffleSelectorState.raffle) {
    return;
  }

  raffleSelectorState.selected = raffleSelectorState.selected.filter((item) => item !== value);
  persistSelection(raffleSelectorState.raffle?.campaign?.id, raffleSelectorState.selected);
  raffleSelectorState.notice = value ? `Quitaste ${value} de tu seleccion.` : "";
  raffleSelectorState.noticeTone = "info";
  paintRaffleSelector();
}

function bindRaffleSelectorActions(content) {
  if (!content) {
    return;
  }

  if (!content.dataset.raffleSelectorBound) {
    content.dataset.raffleSelectorBound = "1";
    content.addEventListener("click", (event) => {
      const ticketButton = event.target.closest("[data-selector-ticket]");
      if (ticketButton && content.contains(ticketButton)) {
        event.preventDefault();
        event.stopPropagation();
        handleRaffleSelectorTicketValue(ticketButton.getAttribute("data-selector-ticket"));
        return;
      }

      const removeButton = event.target.closest("[data-selector-remove]");
      if (removeButton && content.contains(removeButton)) {
        event.preventDefault();
        event.stopPropagation();
        handleRaffleSelectorRemoveValue(removeButton.getAttribute("data-selector-remove"));
      }
    });
  }
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
    const payloadNumbers = asArray(payload?.numbers).map((ticket) => ({
      ...ticket,
      display: formatTicketSelectionLabel(ticket),
    }));
    raffleSelectorState.numbers = payloadNumbers.length > 0
      ? payloadNumbers
      : getRaffleSelectorFallbackNumbers(raffleSelectorState.raffle);
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
  const raffle =
    raffles.find((item) => String(item?.campaign?.id || "") === String(raffleId))
    || raffles.find((item) => item?.publicConfig?.isFeatured)
    || raffles[0]
    || null;
  if (!raffle) {
    return;
  }

  raffleSelectorState.site = site;
  raffleSelectorState.slug = window.__PUBLIC_SITE_STATE__?.slug || raffleSelectorState.slug || "";
  raffleSelectorState.raffle = raffle;
  raffleSelectorState.query = "";
  raffleSelectorState.selected = readPersistedSelection(raffle.campaign.id);
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

function submitPublicPaymentStateNotice(message, tone = "info") {
  paymentModalState.notice = message;
  paymentModalState.noticeTone = tone;
  paymentModalState.error = tone === "error" ? message : "";
  paintPaymentModal();
}

function updatePaymentModalField(field, value) {
  const normalized = String(value || "");
  if (field === "customerName") {
    paymentModalState.customerName = normalized;
  } else if (field === "customerCity") {
    paymentModalState.customerCity = normalized;
  } else if (field === "customerPhone") {
    paymentModalState.customerPhone = normalized;
  }
  refreshPaymentModalActionState();
}

function getPaymentModalContactPayload() {
  return {
    customer_name: String(paymentModalState.customerName || "").trim(),
    customer_city: String(paymentModalState.customerCity || "").trim(),
    customer_phone: String(paymentModalState.customerPhone || "").trim(),
  };
}

function ensurePaymentModalContactReady() {
  const payload = getPaymentModalContactPayload();
  if (!payload.customer_name || !payload.customer_city || !payload.customer_phone) {
    return false;
  }
  return true;
}

async function submitPublicPseCheckout() {
  const site = paymentModalState.site || window.__PUBLIC_SITE_STATE__?.site || null;
  const slug = paymentModalState.slug || window.__PUBLIC_SITE_STATE__?.slug || "";
  const raffle = paymentModalState.raffle || null;
  const selected = asArray(paymentModalState.selected);
  if (!site || !slug || !raffle?.campaign?.id || !selected.length || paymentModalState.loading || !ensurePaymentModalContactReady()) {
    submitPublicPaymentStateNotice("Completa nombre, ciudad y teléfono para continuar.", "warning");
    return;
  }

  const checkoutWindow = window.open("", "_blank");
  paymentModalState.loading = true;
  paymentModalState.checkoutUrl = "";
  submitPublicPaymentStateNotice("Preparando el checkout de PSE...", "info");

  try {
    const response = await fetch(
      `${API_BASE_URL}/public-site/${encodeURIComponent(slug)}/raffles/${encodeURIComponent(raffle.campaign.id)}/pse`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          selected_numbers: selected,
          ...getPaymentModalContactPayload(),
        }),
        cache: "no-store",
      },
    );

    const payload = await readJsonResponse(response);
    if (!response.ok) {
      throw new Error(payload?.message || "No fue posible preparar el pago en linea.");
    }

    paymentModalState.loading = false;
    paymentModalState.checkoutUrl = payload?.checkout_url || "";
    paintPaymentModal();

    if (paymentModalState.checkoutUrl) {
      if (checkoutWindow) {
        checkoutWindow.location.href = paymentModalState.checkoutUrl;
        checkoutWindow.focus?.();
        submitPublicPaymentStateNotice("Abrimos la pasarela de PSE en una nueva pestaña.", "success");
      } else {
        submitPublicPaymentStateNotice("Ya esta listo tu checkout de PSE. Usa el boton para abrirlo.", "warning");
      }
    } else {
      submitPublicPaymentStateNotice("El checkout quedo listo, pero no recibimos la URL de apertura.", "warning");
    }
  } catch (error) {
    paymentModalState.loading = false;
    try {
      checkoutWindow?.close?.();
    } catch {
      // Ignore popup cleanup failures.
    }
    submitPublicPaymentStateNotice(error?.message || "No fue posible preparar el pago en linea.", "error");
  }
}

async function submitPublicReceiptUpload(file = null) {
  const site = paymentModalState.site || window.__PUBLIC_SITE_STATE__?.site || null;
  const slug = paymentModalState.slug || window.__PUBLIC_SITE_STATE__?.slug || "";
  const raffle = paymentModalState.raffle || null;
  const selected = asArray(paymentModalState.selected);
  if (!site || !slug || !raffle?.campaign?.id || !selected.length || paymentModalState.loading || !file || !ensurePaymentModalContactReady()) {
    return;
  }

  paymentModalState.loading = true;
  paymentModalState.file = file;
  paymentModalState.fileName = file.name || "Comprobante";
  submitPublicPaymentStateNotice(`Cargando ${paymentModalState.fileName}...`, "info");

  try {
    const formData = new FormData();
    formData.append("selected_numbers", JSON.stringify(selected));
    formData.append("receipt_file", file, file.name || "comprobante");
    const contactPayload = getPaymentModalContactPayload();
    formData.append("customer_name", contactPayload.customer_name);
    formData.append("customer_city", contactPayload.customer_city);
    formData.append("customer_phone", contactPayload.customer_phone);

    const response = await fetch(
      `${API_BASE_URL}/public-site/${encodeURIComponent(slug)}/raffles/${encodeURIComponent(raffle.campaign.id)}/receipt`,
      {
        method: "POST",
        body: formData,
        cache: "no-store",
      },
    );

    const payload = await readJsonResponse(response);
    if (!response.ok) {
      throw new Error(payload?.message || "No fue posible cargar el comprobante.");
    }

    paymentModalState.loading = false;
    paymentModalState.file = null;
    paymentModalState.fileName = "";
    paymentModalState.checkoutUrl = "";
    submitPublicPaymentStateNotice(
      payload?.client_message || "Tu comprobante quedo cargado y ya esta en revision.",
      "success",
    );
  } catch (error) {
    paymentModalState.loading = false;
    submitPublicPaymentStateNotice(error?.message || "No fue posible cargar el comprobante.", "error");
  }
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
  const pageTitle = [
    company.nombre || settings.title || "Rifas",
    "Rifas publicas",
  ].filter(Boolean).join(" | ");
  document.title = pageTitle;
  const themePrimary = settings.primaryColor || "#0f172a";
  const themeSecondary = settings.secondaryColor || "#d6a13e";
  document.documentElement.style.setProperty("--primary", themePrimary);
  document.documentElement.style.setProperty("--secondary", themeSecondary);

  const heroImage = pickHeroImage(site);
  const heroVideo = pickHeroVideo(site);
  const heroTitle = settings.heroTitle || settings.title || company.nombre || "Rifas";
  const heroSubtitle = settings.heroSubtitle || settings.subtitle || "Una experiencia de rifas administrada desde el backend.";
  const heroButton = settings.heroButtonUrl || "#sorteos";
  const heroLabel = settings.heroButtonLabel || (settings.heroButtonUrl ? "Escríbenos" : "Ver sorteos");
  const slogan = settings.slogan || "";
  const featuredRaffle = asArray(site.activeRaffles)[0] || null;
  const heroSpotlightTitle = featuredRaffle ? getRaffleDisplayTitle(featuredRaffle) : heroTitle;
  const heroSpotlightDescription = featuredRaffle
    ? (getRaffleDisplayDescription(featuredRaffle) || "Compra segura y numeros visibles en tiempo real.")
    : (settings.heroOverlayText || "Compra segura y numeros visibles en tiempo real.");
  const heroSpotlightImage = featuredRaffle ? getRaffleDisplayImage(featuredRaffle, site) : heroImage;
  const heroSpotlightLabel = featuredRaffle ? "Sorteo destacado" : "Compra segura";
  const heroSpotlightChips = [
    featuredRaffle ? getRaffleDisplayDate(featuredRaffle) : "",
    featuredRaffle ? getRaffleDisplayPrice(featuredRaffle) : "",
  ].filter(Boolean);
  const raffleCount = asArray(site.activeRaffles).length;
  const faqCount = asArray(site.faq).length;
  const videosCount = asArray(site.winnerVideos).length;
  const heroSignals = [
    raffleCount > 0 ? `${raffleCount} sorteos visibles` : "",
    videosCount > 0 ? `${videosCount} ganadores publicados` : "",
  ].filter(Boolean);
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
                <p>${escapeHtml(heroSubtitle || "Participa por premios reales con sorteos visibles, ganadores publicados y atención por WhatsApp.")}</p>
                <div class="hero-actions">
                  ${heroButton ? `<a class="button gold" href="${escapeHtml(heroButton)}"${String(heroButton).startsWith("#") ? "" : ' target="_blank" rel="noreferrer"'}>${escapeHtml(heroLabel)}</a>` : ""}
                  <a class="button secondary" href="#videos">Ganadores reales</a>
                </div>
                ${heroSignals.length ? `
                  <div class="hero-badges">
                    ${heroSignals
                      .map(
                        (item) => `
                          <span class="hero-badge">${escapeHtml(item)}</span>
                        `,
                      )
                      .join("")}
                  </div>
                ` : ""}
              </div>

              <div class="hero-media">
                ${heroVideo ? renderInlineVideo(heroVideo, heroTitle) : `<img src="${escapeHtml(heroSpotlightImage)}" alt="${escapeHtml(heroSpotlightTitle)}" />`}
                <div class="overlay">
                  <span class="overlay-label">${escapeHtml(heroSpotlightLabel)}</span>
                  <strong>${escapeHtml(heroSpotlightTitle)}</strong>
                  <div>${escapeHtml(heroSpotlightDescription)}</div>
                  ${heroSpotlightChips.length ? `
                    <div class="overlay-meta">
                      ${heroSpotlightChips.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
                    </div>
                  ` : ""}
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
      </main>
        ${renderRaffleSelectorModal()}
        ${renderPaymentModal()}
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

  const paymentOverlay = event.target.closest("#payment-modal");
  if (paymentOverlay && event.target.id === "payment-modal") {
    closePaymentModal();
    return;
  }

  const action = event.target.closest("[data-action]");
  if (!action) {
    return;
  }

  const actionName = action.getAttribute("data-action");
  if (actionName === "close-raffle-selector") {
    event.preventDefault();
    event.stopPropagation();
    closeRaffleSelector();
    return;
  }

  if (actionName === "refresh-raffle-selector") {
    event.preventDefault();
    event.stopPropagation();
    fetchRaffleSelectorNumbers();
    return;
  }

  if (actionName === "clear-raffle-selection") {
    event.preventDefault();
    event.stopPropagation();
    raffleSelectorState.selected = [];
    persistSelection(raffleSelectorState.raffle?.campaign?.id, raffleSelectorState.selected);
    raffleSelectorState.notice = "Seleccion limpiada.";
    raffleSelectorState.noticeTone = "info";
    paintRaffleSelector();
    return;
  }

  if (actionName === "go-payment-section") {
    event.preventDefault();
    event.stopPropagation();
    const currentRaffle = raffleSelectorState.raffle || null;
    const selected = asArray(raffleSelectorState.selected).length
      ? [...raffleSelectorState.selected]
      : readPersistedSelection(currentRaffle?.campaign?.id);
    const site = raffleSelectorState.site || window.__PUBLIC_SITE_STATE__?.site || null;
    const slug = raffleSelectorState.slug || window.__PUBLIC_SITE_STATE__?.slug || "";
    if (!currentRaffle || !selected.length) {
      return;
    }
    closeRaffleSelector();
    openPaymentModal({
      site,
      slug,
      raffle: currentRaffle,
      selected,
    });
    return;
  }

  if (actionName === "close-payment-modal") {
    event.preventDefault();
    event.stopPropagation();
    closePaymentModal();
    return;
  }

  if (actionName === "start-public-pse") {
    event.preventDefault();
    event.stopPropagation();
    submitPublicPseCheckout();
    return;
  }

  if (actionName === "trigger-public-receipt-upload") {
    event.preventDefault();
    event.stopPropagation();
    if (!ensurePaymentModalContactReady()) {
      return;
    }
    const receiptInput = app.querySelector("[data-public-receipt-input]");
    if (receiptInput) {
      receiptInput.click();
    }
    return;
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

app.addEventListener("change", (event) => {
  const receiptInput = event.target.closest("[data-public-receipt-input]");
  if (!receiptInput || !app.contains(receiptInput)) {
    return;
  }

  const file = receiptInput.files?.[0] || null;
  receiptInput.value = "";
  if (!file) {
    return;
  }

  submitPublicReceiptUpload(file);
});

app.addEventListener("input", (event) => {
  const field = event.target.closest("[data-payment-field]");
  if (!field || !app.contains(field)) {
    return;
  }

  updatePaymentModalField(field.getAttribute("data-payment-field"), field.value);
});

async function loadSite() {
  const slug = getSlugFromLocation();

  if (!slug) {
    app.innerHTML = `
      <div class="page">
        <div class="loading-shell loading-shell-minimal" aria-label="Cargando sitio">
          <div class="loading-spinner"></div>
        </div>
      </div>
    `;
    return;
  }

  app.innerHTML = `
    <div class="loading-shell loading-shell-minimal" aria-label="Cargando sitio">
      <div class="loading-spinner"></div>
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
            <p>Estamos teniendo un problema temporal al abrir el sitio.</p>
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






