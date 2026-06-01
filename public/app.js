const CONFIG = window.__PUBLIC_SITE_CONFIG__ || {};
const API_BASE_URL = String(CONFIG.apiBaseUrl || "http://localhost:10000").replace(/\/+$/, "");
const app = document.getElementById("app");
const PUBLIC_SITE_CACHE_PREFIX = "public-site-cache:v1:";
const ASSETS = {
  brand: "/assets/logo-placeholder.webp",
  hero: "/assets/hero-caballo.webp",
  raffle: "/assets/raffle-card.webp",
  winner: "/assets/winner-video.webp",
  payments: "/assets/payment-methods.webp",
  pse: "/assets/pse-logo.svg",
};
const RAFFLE_SELECTOR_LIMIT = 180;
const RAFFLE_SELECTOR_PAGE_SIZE = 100;
const raffleSelectorState = {
  open: false,
  site: null,
  slug: "",
  raffle: null,
  query: "",
  page: 1,
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

const receiptUploadState = {
  open: false,
  title: "Subiendo comprobante",
  description: "Espera un momento mientras verificamos tu pago.",
  detail: "No cierres esta ventana hasta que termine el proceso.",
  tone: "info",
  requestId: 0,
};

const deliveryModalState = {
  open: false,
  loading: false,
  site: null,
  slug: "",
  raffle: null,
  paymentReference: "",
  customerPhone: "",
  assets: [],
  whatsappUrl: "",
  expanded: false,
  downloadRequested: false,
  error: "",
  notice: "",
  noticeTone: "info",
  requestId: 0,
};

const publicUiState = {
  mobileMenuOpen: false,
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

function socialIconMarkup(type) {
  const icons = {
    facebook: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 8.5V7c0-.7.5-1.2 1.2-1.2h1.8V3h-2.5C12.3 3 11 4.4 11 6.3v2.2H8.5V11H11v10h3v-10h2.6l.4-2.5H14Z" fill="currentColor"/></svg>',
    instagram: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3.5h10A3.5 3.5 0 0 1 20.5 7v10A3.5 3.5 0 0 1 17 20.5H7A3.5 3.5 0 0 1 3.5 17V7A3.5 3.5 0 0 1 7 3.5Zm0 2A1.5 1.5 0 0 0 5.5 7v10A1.5 1.5 0 0 0 7 18.5h10a1.5 1.5 0 0 0 1.5-1.5V7A1.5 1.5 0 0 0 17 5.5H7Zm5 2.2A4.3 4.3 0 1 1 7.7 12 4.3 4.3 0 0 1 12 7.7Zm0 2A2.3 2.3 0 1 0 14.3 12 2.3 2.3 0 0 0 12 9.7Zm4.7-3.2a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z" fill="currentColor"/></svg>',
    tiktok: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16.5 3.5c.8 2.5 2.4 3.7 4.5 3.9V11c-1.7 0-3.3-.5-4.5-1.4V16a5.5 5.5 0 1 1-5.5-5.5c.3 0 .6 0 .9.1v3.3a2.2 2.2 0 1 0 1.6 2.1V3.5h3Z" fill="currentColor"/></svg>',
    youtube: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21.6 7.3a3 3 0 0 0-2.1-2.1C17.7 4.7 12 4.7 12 4.7s-5.7 0-7.5.5a3 3 0 0 0-2.1 2.1A31.3 31.3 0 0 0 2 12a31.3 31.3 0 0 0 .4 4.7 3 3 0 0 0 2.1 2.1c1.8.5 7.5.5 7.5.5s5.7 0 7.5-.5a3 3 0 0 0 2.1-2.1A31.3 31.3 0 0 0 22 12a31.3 31.3 0 0 0-.4-4.7ZM10 15.2V8.8l5.6 3.2L10 15.2Z" fill="currentColor"/></svg>',
    whatsapp: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.2 3.8A10.6 10.6 0 0 0 2.3 15.7L1 22l6.4-1.7a10.6 10.6 0 0 0 5.1 1.3h0A10.6 10.6 0 0 0 20.2 3.8Zm-8 16.5h0a8.8 8.8 0 0 1-4.5-1.2l-.3-.2-3.8 1 1-3.7-.2-.4a8.8 8.8 0 1 1 7.8 4.5Zm5-6.5c-.3-.2-1.7-.9-1.9-1s-.3-.2-.4.2-.7 1-1 1.2-.4.2-.7 0a7.2 7.2 0 0 1-2.1-1.3 8 8 0 0 1-1.5-1.9c-.2-.4 0-.6.2-.8l.4-.5c.2-.2.2-.3.3-.5.1-.2 0-.4 0-.6 0-.2-.5-1.4-.7-1.9-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.6.1-.9.4s-1.1 1.1-1.1 2.6 1.2 3 1.4 3.2c.2.2 2.1 3.2 5.1 4.4.7.3 1.2.5 1.7.7.7.2 1.3.2 1.7.1.5-.1 1.7-.7 1.9-1.4.2-.6.2-1.1.1-1.2 0-.1-.2-.2-.5-.4Z" fill="currentColor"/></svg>',
  };
  return icons[type] || "";
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

function getRaffleAdvanceStats(site = {}) {
  const stats = site?.raffleStats || site?.stats || null;
  const total = Number(stats?.inventoryTotal || stats?.inventory_total || 0);
  const sold = Number(stats?.soldCount || stats?.sold_count || 0);
  const reserved = Number(stats?.reservedCount || stats?.reserved_count || 0);
  const processed = Math.max(0, sold + reserved);
  const percent = total > 0 ? Math.min(100, Math.max(0, (processed / total) * 100)) : 0;
  return {
    total,
    sold,
    reserved,
    processed,
    percent: Math.round(percent),
  };
}

function formatRaffleAdvanceLabel(advance = {}) {
  if (!advance.total) {
    return "Avance del sorteo";
  }

  return `${advance.percent}% vendido`;
}

function renderRaffleAdvanceBlock(raffle = {}) {
  const campaignId = String(raffle?.campaign?.id || "");
  const title = getRaffleDisplayTitle(raffle);
  const total = getRaffleDisplayTotal(raffle);
  const fallbackAdvance = {
    total,
    sold: 0,
    reserved: 0,
    processed: 0,
    percent: 0,
  };

  return `
    <div class="raffle-progress" data-raffle-progress data-raffle-id="${escapeHtml(campaignId)}" data-raffle-title="${escapeHtml(title)}">
      <div class="raffle-progress-track" aria-hidden="true">
        <span class="raffle-progress-fill" data-raffle-progress-fill style="width: 0%"></span>
      </div>
      <div class="raffle-progress-meta" data-raffle-progress-meta>
        ${total ? `${escapeHtml(String(fallbackAdvance.percent))}% de avance` : "Cargando avance del sorteo..."}
      </div>
    </div>
  `;
}

function getRaffleDisplayWhatsApp(site = {}) {
  return site?.settings?.whatsappNumber || site?.company?.whatsapp_number || "";
}

function getFooterSocialLinks(site = {}) {
  const settings = site?.settings || {};
  const company = site?.company || {};
  const links = [
    (settings.whatsappNumber || company.whatsapp_number) ? { key: "whatsapp", label: "WhatsApp", href: whatsappLink(settings.whatsappNumber || company.whatsapp_number) } : null,
    settings.facebookUrl || settings.facebook_url ? { key: "facebook", label: "Facebook", href: settings.facebookUrl || settings.facebook_url } : null,
    settings.instagramUrl || settings.instagram_url ? { key: "instagram", label: "Instagram", href: settings.instagramUrl || settings.instagram_url } : null,
    settings.tiktokUrl || settings.tiktok_url ? { key: "tiktok", label: "TikTok", href: settings.tiktokUrl || settings.tiktok_url } : null,
    settings.youtubeUrl || settings.youtube_url ? { key: "youtube", label: "YouTube", href: settings.youtubeUrl || settings.youtube_url } : null,
  ];

  return links.filter(Boolean);
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

function getRaffleSelectorCombinationSize(raffle = {}) {
  const autoConfig = getRaffleSelectorAutoConfig(raffle);
  const configured = Number(
    autoConfig.combinationsPerTicket
    || autoConfig.combinations_per_ticket
    || 0,
  );

  return Number.isFinite(configured) && configured > 0
    ? Math.min(Math.max(configured, 1), 12)
    : 1;
}

function getRaffleSelectorSelectionSummary(raffle = {}, selected = []) {
  const normalizedSelected = asArray(selected)
    .map((item) => String(item || "").trim())
    .filter(Boolean);
  const groupSize = getRaffleSelectorCombinationSize(raffle);
  const totalNumbers = normalizedSelected.length;
  const completeTickets = groupSize > 0 ? Math.floor(totalNumbers / groupSize) : 0;
  const remainder = groupSize > 0 ? totalNumbers % groupSize : totalNumbers;
  const isComplete = totalNumbers > 0 && remainder === 0;
  const missingForNext = isComplete ? 0 : (groupSize - remainder);
  const total = completeTickets > 0 ? getRafflePriceForQuantity(raffle, completeTickets) : 0;

  return {
    groupSize,
    totalNumbers,
    completeTickets,
    remainder,
    isComplete,
    missingForNext,
    total,
  };
}

function groupRaffleSelections(selected = [], groupSize = 1) {
  const normalizedSelected = asArray(selected)
    .map((item) => String(item || "").trim())
    .filter(Boolean);
  const safeGroupSize = Number.isFinite(Number(groupSize)) && Number(groupSize) > 0
    ? Math.max(1, Number(groupSize))
    : 1;
  const groups = [];

  for (let index = 0; index < normalizedSelected.length; index += safeGroupSize) {
    groups.push(normalizedSelected.slice(index, index + safeGroupSize));
  }

  return groups;
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
  return `Estas seleccionando tus números para el sorteo "${title}" llevas estos seleccionados: ${numbers.join(", ")}.`;
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

function normalizePublicVideoType(value = "") {
  const normalized = String(value || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/-+/g, "_");

  if (["social", "social_support", "apoyo_social", "apoyos_sociales", "apoyos", "support"].includes(normalized)) {
    return "social_support";
  }

  return "winner";
}

function groupPublicVideosByType(site = {}) {
  const videos = asArray(site.winnerVideos).filter((video) => video && video.isVisible !== false);
  const winner = [];
  const socialSupport = [];

  for (const video of videos) {
    const type = normalizePublicVideoType(video.videoType || video.video_type || video.type || "winner");
    if (type === "social_support") {
      socialSupport.push(video);
    } else {
      winner.push(video);
    }
  }

  return { winner, socialSupport };
}

function renderVideoCards(videos = [], kind = "winner", layout = "grid") {
  const containerClass = layout === "strip" ? "grid-3 video-strip" : "grid-3";
  return `
    <div class="${containerClass}">
      ${videos
        .map((video) => {
          const preview = video.thumbnailUrl || ASSETS.winner;
          const subtitle = kind === "social_support"
            ? (video.winnerName || "Apoyo social")
            : (video.winnerName || "Ganador verificado");
          const cardBadge = kind === "social_support" ? "Apoyo social" : "Ganador";
          return `
            <article class="card">
              <div class="card-media">
                <img src="${escapeHtml(preview)}" alt="${escapeHtml(video.title)}" loading="lazy" decoding="async" />
                ${video.videoUrl ? `
                  <button
                    type="button"
                    class="play-overlay"
                    data-video-url="${escapeAttr(video.videoUrl)}"
                    data-video-title="${escapeAttr(video.title)}"
                    data-video-subtitle="${escapeAttr(subtitle)}"
                    aria-label="Reproducir video"
                  >
                    <span class="play-overlay-badge">▶</span>
                    <span class="play-overlay-text">
                      <strong>Ver video</strong>
                      <small>${escapeHtml(cardBadge)}</small>
                    </span>
                  </button>
                ` : ""}
              </div>
              <div class="card-body">
                <div class="chip-row">
                  <span class="chip">${escapeHtml(cardBadge)}</span>
                  ${video.city ? `<span class="chip">${escapeHtml(video.city)}</span>` : ""}
                  ${video.drawDate ? `<span class="chip">${escapeHtml(formatDate(video.drawDate))}</span>` : ""}
                </div>
                <h3 class="card-title">${escapeHtml(video.title)}</h3>
                <p class="card-copy">${escapeHtml(subtitle)}${video.prize ? ` · ${escapeHtml(video.prize)}` : ""}</p>
              </div>
            </article>
          `;
        })
        .join("")}
    </div>
  `;
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll("`", "&#96;");
}

function getPublicSiteCacheKey(slug = "") {
  return `${PUBLIC_SITE_CACHE_PREFIX}${normalizeSlug(slug)}`;
}

function readCachedPublicSite(slug = "") {
  const key = getPublicSiteCacheKey(slug);
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !parsed.site) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeCachedPublicSite(slug = "", site = null) {
  const key = getPublicSiteCacheKey(slug);
  try {
    window.localStorage.setItem(key, JSON.stringify({
      site,
      cachedAt: new Date().toISOString(),
    }));
  } catch {
    // Ignore storage errors on restricted browsers.
  }
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

async function fetchFreshPublicSite(slug = "") {
  const normalizedSlug = normalizeSlug(slug);
  if (!normalizedSlug) {
    return null;
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/public-site/${encodeURIComponent(normalizedSlug)}`,
      { cache: "no-store" },
    );
    if (!response.ok) {
      return null;
    }

    const site = await response.json();
    return site && typeof site === "object" ? site : null;
  } catch {
    return null;
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

function readDomSelectedTickets() {
  return Array.from(document.querySelectorAll("#raffle-selector-content [data-selector-ticket].is-selected"))
    .map((button) => String(button.getAttribute("data-selector-ticket") || "").trim())
    .filter(Boolean);
}

function getCurrentRaffleSelection(raffleId) {
  const inMemory = asArray(raffleSelectorState.selected)
    .map((item) => String(item || "").trim())
    .filter(Boolean);
  if (inMemory.length > 0) {
    return [...new Set(inMemory)];
  }

  const persisted = readPersistedSelection(raffleId);
  if (persisted.length > 0) {
    return [...new Set(persisted)];
  }

  const fromDom = readDomSelectedTickets();
  if (fromDom.length > 0) {
    return [...new Set(fromDom)];
  }

  return [];
}

function getCurrentRaffleSelectionForRender(raffleId) {
  const inMemory = asArray(raffleSelectorState.selected)
    .map((item) => String(item || "").trim())
    .filter(Boolean);
  if (inMemory.length > 0) {
    return [...new Set(inMemory)];
  }

  const persisted = readPersistedSelection(raffleId);
  if (persisted.length > 0) {
    return [...new Set(persisted)];
  }

  return [];
}

function persistSelection(raffleId, selected) {
  try {
    const value = JSON.stringify(asArray(selected).map((item) => String(item || "").trim()).filter(Boolean));
    window.localStorage.setItem(getSelectionStorageKey(raffleId), value);
  } catch {
    // Ignore storage failures.
  }
}

function clearPersistedSelection(raffleId) {
  try {
    window.localStorage.removeItem(getSelectionStorageKey(raffleId));
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

function getPaymentInstructionsText(raffle = {}, site = {}) {
  const candidates = [
    raffle?.campaign?.instrucciones_pago,
    site?.settings?.instrucciones_pago,
    raffle?.publicConfig?.instrucciones_pago,
    raffle?.instrucciones_pago,
    site?.instrucciones_pago,
  ];

  for (const candidate of candidates) {
    const text = String(candidate || "").trim();
    if (text) {
      return text;
    }
  }

  return "";
}

function renderPaymentInstructionsPanel(text = "") {
  const normalized = String(text || "").trim();
  if (!normalized) {
    return `<div class="selector-empty selector-empty-inline">Aun no hay instrucciones de pago configuradas para este sorteo.</div>`;
  }

  const lines = normalized.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  return `
    <div class="payment-instructions-panel">
      ${lines.map((line) => `<p>${escapeHtml(line)}</p>`).join("")}
    </div>
  `;
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
            <img src="${escapeHtml(image)}" alt="${escapeHtml(heroTitle)}" loading="eager" fetchpriority="high" decoding="async" />
            <div class="raffle-feature-badge">${isFeatured ? "Sorteo destacado" : "Sorteo disponible"}</div>
          </div>
            <div class="raffle-feature-body">
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
            ${renderRaffleAdvanceBlock({ campaign, publicConfig })}
            <div class="raffle-feature-actions">
              <button
                type="button"
                class="button gold js-open-raffle-selector"
                data-raffle-id="${escapeAttr(String(campaign?.id || ""))}"
              >
                Escoger mis números
              </button>
            </div>
            <div class="raffle-feature-meta">
              <span>${escapeHtml(mode)}</span>
              ${total ? `<span>${escapeHtml(String(total))} boletas</span>` : ""}
            </div>
          </div>
        </article>
      `;
    }

    return `
      <article class="raffle-card raffle-card-compact">
        <div class="raffle-card-media">
          <img src="${escapeHtml(image)}" alt="${escapeHtml(heroTitle)}" loading="lazy" decoding="async" />
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
          ${rest.map((raffle) => {
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
                  <img src="${escapeHtml(image)}" alt="${escapeHtml(heroTitle)}" loading="lazy" decoding="async" />
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
  const { winner, socialSupport } = groupPublicVideosByType(site);

  if (winner.length === 0 && socialSupport.length === 0) {
    return `<div class="state-card"><h2>Sin videos publicados</h2><p>Cuando cargues testimonios, entregas o apoyos sociales, apareceran aqui.</p></div>`;
  }

  return `
    ${winner.length ? `
      <div class="section-group">
        <div class="section-head section-head-small">
          <div>
            <span class="section-kicker">Ganadores</span>
            <h3>Videos de ganadores</h3>
            <p>Testimonios, entregas y momentos reales de quienes ya participaron.</p>
          </div>
          <div class="section-scroll-hint">Desliza hacia los lados</div>
        </div>
        ${renderVideoCards(winner, "winner", "strip")}
      </div>
    ` : ""}

    ${socialSupport.length ? `
      <div class="section-group">
        <div class="section-head section-head-small">
          <div>
            <span class="section-kicker">Apoyos sociales</span>
            <h3>Historias de apoyo</h3>
            <p>Ayudas, aportes y acciones sociales que el cliente quiera mostrar públicamente.</p>
          </div>
          <div class="section-scroll-hint">Desliza hacia los lados</div>
        </div>
        ${renderVideoCards(socialSupport, "social_support")}
      </div>
    ` : ""}
  `;
}

function getRaffleSelectorNumbers() {
  const raffle = raffleSelectorState.raffle || null;
  const rawNumbers = asArray(raffleSelectorState.numbers);
  const numbers = rawNumbers.length > 0 ? rawNumbers : getRaffleSelectorFallbackNumbers(raffle);

  const expandedNumbers = numbers.flatMap((ticket) => {
    const ticketNumbers = Array.isArray(ticket?.numbers) && ticket.numbers.length > 0
      ? ticket.numbers.map(normalizeTicketDisplayValue).filter(Boolean)
      : [normalizeTicketDisplayValue(ticket?.number)].filter(Boolean);
    const groupedDisplay = formatTicketSelectionLabel(ticket);

    if (ticketNumbers.length <= 1) {
      return ticketNumbers.map((number) => ({
        ...ticket,
        number,
        display: number,
        groupedDisplay,
        groupSize: 1,
      }));
    }

    return ticketNumbers.map((number, index) => ({
      ...ticket,
      number,
      display: number,
      groupedDisplay,
      groupSize: ticketNumbers.length,
      itemIndex: index,
    }));
  });

  return filterRaffleSelectorNumbers(
    expandedNumbers,
    raffleSelectorState.query || "",
  );
}

function getRaffleSelectorPagination(numbers = []) {
  const total = Array.isArray(numbers) ? numbers.length : 0;
  const totalPages = Math.max(1, Math.ceil(total / RAFFLE_SELECTOR_PAGE_SIZE));
  const requestedPage = Number.parseInt(raffleSelectorState.page, 10) || 1;
  const page = Math.min(Math.max(1, requestedPage), totalPages);
  const start = total > 0 ? (page - 1) * RAFFLE_SELECTOR_PAGE_SIZE : 0;
  const end = total > 0 ? Math.min(start + RAFFLE_SELECTOR_PAGE_SIZE, total) : 0;
  const pageNumbers = total > 0
    ? numbers.slice(start, start + RAFFLE_SELECTOR_PAGE_SIZE)
    : [];

  return {
    page,
    total,
    totalPages,
    start,
    end,
    pageNumbers,
    hasPrev: page > 1,
    hasNext: page < totalPages,
  };
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
  const pricingPackages = raffle ? getRafflePricingPackages(raffle) : [];
  const selected = raffle ? getCurrentRaffleSelectionForRender(raffle.campaign.id) : [];
  const selectionSummary = raffle ? getRaffleSelectorSelectionSummary(raffle, selected) : {
    groupSize: 1,
    totalNumbers: selected.length,
    completeTickets: 0,
    remainder: 0,
    isComplete: false,
    missingForNext: 0,
    total: 0,
  };
  const selectedAmount = selectionSummary.total;
  const progressPercent = selectionSummary.groupSize > 0
    ? Math.min(100, Math.round((selectionSummary.totalNumbers / selectionSummary.groupSize) * 100))
    : 0;
  const progressMarkup = selected.length ? `
    <div class="selector-progress">
      <div class="selector-progress-row">
        <span class="selector-progress-chip is-active">${selectionSummary.totalNumbers} numero${selectionSummary.totalNumbers === 1 ? "" : "s"}</span>
        <span class="selector-progress-chip">${selectionSummary.completeTickets} boleta${selectionSummary.completeTickets === 1 ? "" : "s"} completa${selectionSummary.completeTickets === 1 ? "" : "s"}</span>
        <span class="selector-progress-chip ${selectionSummary.isComplete ? "is-ready" : "is-warning"}">${selectionSummary.isComplete ? "Listo para pagar" : `Faltan ${selectionSummary.missingForNext}`}</span>
      </div>
      <div class="selector-progress-bar" aria-hidden="true">
        <span style="width: ${progressPercent}%"></span>
      </div>
    </div>
  ` : "";
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
    : `<div class="selector-empty selector-empty-inline">Aun no has elegido numeros.</div>`;
  const numbers = getRaffleSelectorNumbers();
  const pagination = getRaffleSelectorPagination(numbers);
  const numbersHtml = raffleSelectorState.loading
    ? `
      <div class="selector-loading-panel">
        <div class="selector-loading-clock" aria-hidden="true"></div>
        <strong>Cargando numeros disponibles...</strong>
        <span>Estamos preparando la seleccion real del sorteo.</span>
      </div>
    `
    : pagination.pageNumbers.length > 0
      ? pagination.pageNumbers
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
  const canContinueToPayment = Boolean(selected.length && selectionSummary.isComplete);
  const whatsappNumber = getRaffleDisplayWhatsApp(site);
  const cleanWhatsapp = String(whatsappNumber || "").replace(/\D/g, "");
  const whatsappMessage = buildSelectionMessage(raffle, selected);
  const whatsappHref = cleanWhatsapp && selected.length ? buildWhatsAppHref(cleanWhatsapp, whatsappMessage) : "#";
  const whatsappLabel = isMobileDevice() ? "Abrir WhatsApp" : "Continuar por WhatsApp";
  const limitInfo = raffleSelectorState.query ? `Resultados para "${escapeHtml(raffleSelectorState.query)}"` : `${numbers.length} numeros visibles`;
  const pageInfo = numbers.length > 0
    ? `Página ${pagination.page} de ${pagination.totalPages}`
    : "Sin paginacion";
  const pageRange = numbers.length > 0
    ? `${pagination.start + 1}-${pagination.end}`
    : "";
  const notice = raffleSelectorState.notice
    ? `<div class="selector-notice selector-notice-${escapeHtml(raffleSelectorState.noticeTone || "info")}">${escapeHtml(raffleSelectorState.notice)}</div>`
    : `<div class="selector-notice selector-notice-placeholder" aria-hidden="true"></div>`;
  const liveSummary = `
    <div class="selector-live-summary ${selected.length ? "is-active" : "is-empty"}">
      ${progressMarkup}
      <strong>${selected.length ? `${selectionSummary.completeTickets} boleta${selectionSummary.completeTickets === 1 ? "" : "s"} completas` : "Selecciona tus números para empezar"}</strong>
      <span>${selected.length ? `${escapeHtml(formatCOP(selectedAmount))} · ${selectionSummary.completeTickets} boleta${selectionSummary.completeTickets === 1 ? "" : "s"} lista${selectionSummary.completeTickets === 1 ? "" : "s"}${selectionSummary.isComplete ? "" : ` · te faltan ${selectionSummary.missingForNext} número${selectionSummary.missingForNext === 1 ? "" : "s"} para completar la siguiente boleta`}` : "Tu total aparecerá aquí al instante."}</span>
      <p>${selected.length ? `Cada boleta se arma con ${selectionSummary.groupSize} números. ${selectionSummary.isComplete ? `Tienes ${selectionSummary.totalNumbers} números y ya puedes continuar al pago.` : `Llevas ${selectionSummary.totalNumbers} números: ${selectionSummary.completeTickets} boleta${selectionSummary.completeTickets === 1 ? "" : "s"} completa${selectionSummary.completeTickets === 1 ? "" : "s"} y te faltan ${selectionSummary.missingForNext} para la siguiente.`}` : "Toca cualquier número para empezar."}</p>
    </div>
  `;
  const priceChips = pricingPackages.length
    ? pricingPackages.slice(0, 4).map((item) => `
        <span class="selector-price-chip">
          <strong>${escapeHtml(`${item.quantity} boleta${item.quantity === 1 ? "" : "s"}`)}</strong>
          <small>${escapeHtml(currencyFormatter.format(item.value))}</small>
        </span>
      `).join("")
    : (pricingSummary ? `
        <span class="selector-price-chip selector-price-chip-wide">
          <strong>Precio de boletería</strong>
          <small>${escapeHtml(pricingSummary)}</small>
        </span>
      ` : "");
  if (isMobileDevice()) {
    return `
      <div class="selector-head selector-head-mobile">
        <div class="selector-head-copy">
          <h3>${escapeHtml(title)}</h3>
          ${description ? `<p>${escapeHtml(description)}</p>` : ""}
        </div>
        <button type="button" class="selector-close" data-action="close-raffle-selector">Cerrar</button>
      </div>

      ${raffle ? `
        <div class="selector-mobile-meta selector-mobile-meta-compact">
          ${pricingBadge ? `<span class="chip">${escapeHtml(pricingBadge)}</span>` : ""}
          ${drawDate ? `<span class="chip">${escapeHtml(drawDate)}</span>` : ""}
          ${mode ? `<span class="chip">${escapeHtml(mode)}</span>` : ""}
        </div>
      ` : ""}

      <div class="selector-mobile-toolbar">
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
        <div class="selector-toolbar-actions selector-toolbar-actions-mobile">
          <div class="selector-toolbar-note">${escapeHtml(limitInfo)}</div>
          <button type="button" class="button secondary selector-refresh" data-action="refresh-raffle-selector">Actualizar</button>
        </div>
      </div>

      ${notice}
      ${liveSummary}

      <div class="selector-mobile-pagination selector-mobile-pagination-compact">
        <button type="button" class="selector-page-button" data-selector-page="prev" ${pagination.hasPrev ? "" : "disabled"}>Anterior</button>
        <div class="selector-pagination-current">
          <span>${escapeHtml(pageInfo)}</span>
          <strong>${escapeHtml(pageRange)}</strong>
        </div>
        <button type="button" class="selector-page-button" data-selector-page="next" ${pagination.hasNext ? "" : "disabled"}>Siguiente</button>
      </div>

      <div class="ticket-grid-shell selector-mobile-grid-shell">
        <div class="ticket-grid">
          ${numbersHtml}
        </div>
      </div>

      <div class="selector-summary-mobile selector-summary-mobile-inline selector-summary-mobile-compact">
        <div class="selector-summary-mobile-chips">
          ${selected.length
            ? selected
              .map((item) => `<button type="button" class="selected-chip mobile" data-selector-remove="${escapeAttr(item)}">${escapeHtml(item)}<strong>×</strong></button>`)
              .join("")
            : `<div class="selector-empty selector-empty-inline">Aun no has elegido numeros.</div>`}
        </div>
        <div class="selector-summary-mobile-actions">
          <button type="button" class="button primary" data-action="go-payment-section" ${canContinueToPayment ? "" : "disabled"}>Continuar al pago</button>
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
  return `
      <div class="selector-head">
        <div class="selector-head-copy">
          <h3>${escapeHtml(title)}</h3>
          ${description ? `<p>${escapeHtml(description)}</p>` : ""}
        </div>
      <button type="button" class="selector-close" data-action="close-raffle-selector">Cerrar</button>
    </div>

    ${raffle ? `
      <div class="selector-hero selector-hero-minimal">
        <div class="selector-hero-body selector-hero-body-minimal">
          <div class="selector-hero-topline">
            <span class="selector-kicker">Precio de boletería</span>
            <div class="selector-price-strip">
              ${priceChips}
            </div>
          </div>
          <div class="selector-hero-chiprow selector-hero-chiprow-minimal">
            ${pricingBadge ? `<span class="chip">${escapeHtml(pricingBadge)}</span>` : ""}
            ${drawDate ? `<span class="chip">${escapeHtml(drawDate)}</span>` : ""}
            ${mode ? `<span class="chip">${escapeHtml(mode)}</span>` : ""}
          </div>
        </div>
      </div>
    ` : ""}

    <div class="selector-layout">
      <div class="selector-main">
        <div class="selector-main-top">
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
        ${liveSummary}
        <div class="selector-pagination selector-pagination-top">
          <button type="button" class="selector-page-button" data-selector-page="prev" ${pagination.hasPrev ? "" : "disabled"}>Anterior</button>
          <div class="selector-pagination-current">
            <span>${escapeHtml(pageInfo)}</span>
            <strong>${escapeHtml(pageRange)}</strong>
          </div>
          <button type="button" class="selector-page-button" data-selector-page="next" ${pagination.hasNext ? "" : "disabled"}>Siguiente</button>
        </div>
        </div>
        <div class="ticket-grid-shell">
          <div class="ticket-grid">
            ${numbersHtml}
          </div>
        </div>
        <div class="selector-pagination selector-pagination-bottom">
          <button type="button" class="selector-page-button" data-selector-page="prev" ${pagination.hasPrev ? "" : "disabled"}>Anterior</button>
          <div class="selector-pagination-current">
            <span>${escapeHtml(pageInfo)}</span>
            <strong>${escapeHtml(pageRange)}</strong>
          </div>
          <button type="button" class="selector-page-button" data-selector-page="next" ${pagination.hasNext ? "" : "disabled"}>Siguiente</button>
        </div>
      </div>

      <aside class="selector-summary">
      <div class="selector-summary-head">
          <h4>${selected.length ? `${selectionSummary.completeTickets} boleta${selectionSummary.completeTickets === 1 ? "" : "s"} completas` : "Aun no seleccionas numeros"}</h4>
          ${selected.length ? `<p class="selector-summary-total">${escapeHtml(formatCOP(selectedAmount))}</p>` : ""}
        </div>
        <div class="selected-list">
          ${selectedCopy}
        </div>
        <div class="selector-summary-footer">
          <div class="selector-summary-note">
            <strong>${selected.length ? `Cada boleta se arma con ${selectionSummary.groupSize} números.` : "Selecciona los numeros que quieras apartar."}</strong>
            <span>${selected.length ? (selectionSummary.isComplete ? `Tienes ${selectionSummary.totalNumbers} números y ${selectionSummary.completeTickets} boleta${selectionSummary.completeTickets === 1 ? "" : "s"} lista${selectionSummary.completeTickets === 1 ? "" : "s"} para pagar.` : `Llevas ${selectionSummary.totalNumbers} números: ${selectionSummary.completeTickets} boleta${selectionSummary.completeTickets === 1 ? "" : "s"} completa${selectionSummary.completeTickets === 1 ? "" : "s"} y te faltan ${selectionSummary.missingForNext} para la siguiente.`) : "Cuando selecciones numeros, aqui veras el acceso al pago."}</span>
          </div>
          <div class="selector-summary-actions">
            <button type="button" class="button primary" data-action="go-payment-section" ${canContinueToPayment ? "" : "disabled"}>Continuar al pago</button>
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
        <button type="button" class="button primary" data-action="go-payment-section" ${canContinueToPayment ? "" : "disabled"}>Continuar al pago</button>
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
  const summary = getRaffleSelectorSelectionSummary(raffle, selected);
  if (!raffle || summary.completeTickets <= 0) {
    return 0;
  }

  return summary.total;
}

function openPaymentModal(payload = {}) {
  const raffle = payload.raffle || null;
  const selected = asArray(payload.selected)
    .map((item) => String(item || "").trim())
    .filter(Boolean);
  const resolvedSelected = selected.length > 0
    ? selected
    : raffle
      ? getCurrentRaffleSelection(raffle.campaign.id)
      : [];

  paymentModalState.open = true;
  paymentModalState.site = payload.site || null;
  paymentModalState.slug = String(payload.slug || "").trim();
  paymentModalState.raffle = raffle;
  paymentModalState.selected = [...new Set(resolvedSelected)];
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

function syncDeliveryModal() {
  const modal = document.getElementById("delivery-modal");
  if (!modal) return;
  modal.classList.toggle("is-open", deliveryModalState.open);
  modal.setAttribute("aria-hidden", deliveryModalState.open ? "false" : "true");
  document.body.classList.toggle("modal-open", deliveryModalState.open || raffleSelectorState.open || paymentModalState.open);
}

function closeDeliveryModal() {
  deliveryModalState.open = false;
  deliveryModalState.loading = false;
  deliveryModalState.site = null;
  deliveryModalState.slug = "";
  deliveryModalState.raffle = null;
  deliveryModalState.paymentReference = "";
  deliveryModalState.customerPhone = "";
  deliveryModalState.assets = [];
  deliveryModalState.whatsappUrl = "";
  deliveryModalState.expanded = false;
  deliveryModalState.error = "";
  deliveryModalState.notice = "";
  deliveryModalState.noticeTone = "info";
  deliveryModalState.requestId += 1;
  paintDeliveryModal();
  syncDeliveryModal();
}

function submitDeliveryNotice(message, tone = "info") {
  deliveryModalState.notice = message;
  deliveryModalState.noticeTone = tone;
  deliveryModalState.error = tone === "error" ? message : "";
  paintDeliveryModal();
}

function triggerDeliveryAssetDownload(item = {}, index = 0) {
  const href = String(item?.dataUrl || "").trim();
  if (!href) return;

  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = String(item?.fileName || `boleta-${index + 1}.png`).trim() || `boleta-${index + 1}.png`;
  anchor.target = "_blank";
  anchor.rel = "noreferrer";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

function downloadDeliveryAssets() {
  const assets = Array.isArray(deliveryModalState.assets) ? deliveryModalState.assets : [];
  if (!assets.length) return false;

  assets.forEach((item, index) => {
    window.setTimeout(() => triggerDeliveryAssetDownload(item, index), index * 250);
  });
  return true;
}

async function loadPublicDeliveryAssets() {
  const requestId = deliveryModalState.requestId;
  const site = deliveryModalState.site || window.__PUBLIC_SITE_STATE__?.site || null;
  const slug = deliveryModalState.slug || window.__PUBLIC_SITE_STATE__?.slug || "";
  const raffle = deliveryModalState.raffle || null;
  const paymentReference = String(deliveryModalState.paymentReference || "").trim();
  const customerPhone = String(deliveryModalState.customerPhone || "").trim();

  if (!site || !slug || !raffle?.campaign?.id || !paymentReference) {
    return;
  }

  deliveryModalState.loading = true;
  submitDeliveryNotice("Preparando tus boletas para descarga y WhatsApp...", "info");

  try {
    const params = new URLSearchParams();
    params.set("reference", paymentReference);
    if (customerPhone) {
      params.set("customer_phone", customerPhone);
    }

    const response = await fetch(
      `${API_BASE_URL}/public-site/${encodeURIComponent(slug)}/raffles/${encodeURIComponent(raffle.campaign.id)}/delivery?${params.toString()}`,
      { cache: "no-store" },
    );
    const payload = await readJsonResponse(response);
    if (!response.ok) {
      throw new Error(payload?.message || "No fue posible preparar tus boletas.");
    }

    if (requestId !== deliveryModalState.requestId) {
      return;
    }

    deliveryModalState.assets = Array.isArray(payload?.tickets) ? payload.tickets : [];
    deliveryModalState.whatsappUrl = String(payload?.whatsapp_url || "").trim();
    deliveryModalState.loading = false;
    deliveryModalState.expanded = deliveryModalState.assets.length > 0;
    deliveryModalState.notice = deliveryModalState.assets.length > 0
      ? "Ya puedes descargar tus boletas o recibirlas por WhatsApp."
      : "Tus boletas estan listas.";
    deliveryModalState.noticeTone = "success";
    paintDeliveryModal();

    if (deliveryModalState.downloadRequested && deliveryModalState.assets.length > 0) {
      downloadDeliveryAssets();
      deliveryModalState.downloadRequested = false;
    }
  } catch (error) {
    if (requestId !== deliveryModalState.requestId) {
      return;
    }
    deliveryModalState.loading = false;
    submitDeliveryNotice(error?.message || "No fue posible preparar tus boletas.", "error");
  }
}

function openDeliveryModal({ site = null, slug = "", raffle = null, paymentReference = "", customerPhone = "" } = {}) {
  deliveryModalState.open = true;
  deliveryModalState.loading = false;
  deliveryModalState.site = site || null;
  deliveryModalState.slug = String(slug || "").trim();
  deliveryModalState.raffle = raffle || null;
  deliveryModalState.paymentReference = String(paymentReference || "").trim();
  deliveryModalState.customerPhone = String(customerPhone || "").trim();
  deliveryModalState.assets = [];
  deliveryModalState.whatsappUrl = "";
  deliveryModalState.expanded = false;
  deliveryModalState.downloadRequested = false;
  deliveryModalState.error = "";
  deliveryModalState.notice = "";
  deliveryModalState.noticeTone = "info";
  deliveryModalState.requestId += 1;
  paintDeliveryModal();
  syncDeliveryModal();
  loadPublicDeliveryAssets();
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
  const selectionSummary = getRaffleSelectorSelectionSummary(paymentModalState.raffle || {}, paymentModalState.selected);
  const ready = Boolean(
    paymentModalState.open
    && !paymentModalState.loading
    && String(paymentModalState.customerName || "").trim()
    && String(paymentModalState.customerCity || "").trim()
    && String(paymentModalState.customerPhone || "").trim()
    && selectionSummary.isComplete,
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
  const selectionSummary = getRaffleSelectorSelectionSummary(raffle, selected);
  const paymentInstructions = getPaymentInstructionsText(raffle, site);
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
  const isContactReady = Boolean(selectionSummary.isComplete && customerName && customerCity && customerPhone);
  const isDisabled = !isContactReady || paymentModalState.loading;
  const supportLabel = getRaffleDisplayWhatsApp(site) ? `Soporte por WhatsApp: ${getRaffleDisplayWhatsApp(site)}` : "Soporte por WhatsApp";
  const paymentProgressMarkup = selected.length ? `
    <div class="payment-progress">
      <div class="payment-progress-row">
        <span class="payment-progress-chip is-active">${selectionSummary.totalNumbers} numero${selectionSummary.totalNumbers === 1 ? "" : "s"}</span>
        <span class="payment-progress-chip">${selectionSummary.completeTickets} boleta${selectionSummary.completeTickets === 1 ? "" : "s"} completa${selectionSummary.completeTickets === 1 ? "" : "s"}</span>
        <span class="payment-progress-chip ${selectionSummary.isComplete ? "is-ready" : "is-warning"}">${selectionSummary.isComplete ? "Puedes pagar" : `Faltan ${selectionSummary.missingForNext}`}</span>
      </div>
      <div class="payment-progress-bar" aria-hidden="true">
        <span style="width: ${selectionSummary.groupSize > 0 ? Math.min(100, Math.round((selectionSummary.totalNumbers / selectionSummary.groupSize) * 100)) : 0}%"></span>
      </div>
    </div>
  ` : "";

  return `
      <div class="payment-modal-head">
        <div class="payment-modal-head-copy">
          <h3>Completa tu compra</h3>
          <p>${escapeHtml(description)}</p>
        </div>
      <button type="button" class="selector-close" data-action="close-payment-modal">Cerrar</button>
    </div>

    ${notice}

    <div class="payment-modal-grid">
      <div class="payment-modal-left">
        <div class="payment-modal-summary">
          ${paymentProgressMarkup}
          <span class="payment-modal-kicker">Sorteo seleccionado</span>
          <h4>${escapeHtml(title)}</h4>
          <p class="payment-modal-copy">${escapeHtml(selected.length ? (selectionSummary.isComplete ? `Llevas ${selectionSummary.completeTickets} boleta${selectionSummary.completeTickets === 1 ? "" : "s"} completa${selectionSummary.completeTickets === 1 ? "" : "s"}.` : `Llevas ${selected.length} números y te faltan ${selectionSummary.missingForNext} para completar la siguiente boleta.`) : "Selecciona numeros antes de pagar.")}</p>
          <div class="payment-modal-chips">
            ${selectedChips}
          </div>
          <div class="payment-modal-total">
            <span>Total a pagar</span>
            <strong>${escapeHtml(formatCOP(total))}</strong>
          </div>
          ${selected.length && !selectionSummary.isComplete ? `
            <div class="payment-modal-pricing">
              <span>Estado de la selección:</span>
              <p>Te faltan ${selectionSummary.missingForNext} número${selectionSummary.missingForNext === 1 ? "" : "s"} para completar una boleta de ${selectionSummary.groupSize} números.</p>
            </div>
          ` : ""}
          ${pricingSummary ? `
            <div class="payment-modal-pricing">
              <span>Precio de boletería:</span>
              <p>${escapeHtml(pricingSummary)}</p>
            </div>
          ` : ""}
          <div class="payment-modal-footnote">${escapeHtml(supportLabel)}</div>
        </div>

          <div class="payment-action-card payment-instructions-card">
            <div class="payment-card-topline">
              <span class="payment-card-kicker">Instrucciones de pago</span>
              <span class="payment-card-badge">Lee antes de pagar</span>
            </div>
            <div class="payment-action-icon payment-action-icon-note">⌁</div>
            <div class="payment-card-copy">
              <strong>Así debes realizar tu pago</strong>
              <p>Esta información viene directamente de la configuración del sorteo.</p>
            </div>
            ${renderPaymentInstructionsPanel(paymentInstructions)}
          </div>
      </div>

      <div class="payment-modal-right">
          <div class="payment-action-card payment-contact-card">
            <div class="payment-action-icon payment-action-icon-contact">✎</div>
            <div class="payment-card-copy">
              <span class="payment-card-kicker">Datos del comprador</span>
              <strong>Completa tus datos</strong>
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
            <div class="payment-action-icon payment-action-icon-upload">↥</div>
            <div class="payment-card-copy">
              <span class="payment-card-kicker">Comprobante</span>
              <strong>Sube tu soporte</strong>
              <p>Sube una imagen de tu comprobante para enviarlo a revisión.</p>
            </div>
            <input type="file" accept="image/*" data-public-receipt-input hidden />
            <button type="button" class="button secondary" data-action="trigger-public-receipt-upload" ${isDisabled ? "disabled" : ""}>Cargar comprobante</button>
            ${receiptLabel}
          </div>

          <div class="payment-action-card">
            <div class="payment-action-icon payment-action-icon-pse">
              <img src="${escapeHtml(ASSETS.pse)}" alt="PSE" />
            </div>
            <div class="payment-card-copy">
              <span class="payment-card-kicker">Pago en línea</span>
              <strong>Completa la transacción</strong>
              <p>Abre la pasarela para completar la transacción.</p>
            </div>
            <button type="button" class="button payment-pse" data-action="start-public-pse" ${isDisabled ? "disabled" : ""}>PSE</button>
            ${checkoutUrl ? `<a class="button secondary payment-checkout-link" href="${escapeHtml(checkoutUrl)}" target="_blank" rel="noreferrer">Abrir checkout</a>` : ""}
          </div>

          <button type="button" class="button secondary payment-back" data-action="close-payment-modal">Volver</button>
      </div>
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

function renderDeliveryModalContent() {
  const raffle = deliveryModalState.raffle || paymentModalState.raffle || null;
  const title = raffle ? `Recibe tus boletas de ${getRaffleDisplayTitle(raffle)}` : "Recibe tus boletas";
  const description = raffle
    ? "El pago fue exitoso. Elige si quieres recibirlas por WhatsApp o descargarlas en tu celular."
    : "El pago fue exitoso. Elige cómo deseas recibir tus boletas.";
  const referenceChip = deliveryModalState.paymentReference
    ? `<span class="delivery-reference-chip">Referencia ${escapeHtml(deliveryModalState.paymentReference)}</span>`
    : "";
  const notice = deliveryModalState.notice
    ? `<div class="delivery-modal-notice delivery-modal-notice-${escapeHtml(deliveryModalState.noticeTone || "info")}">${escapeHtml(deliveryModalState.notice)}</div>`
    : "";
  const whatsappUrl = deliveryModalState.whatsappUrl || "";
  const whatsappDisabled = !whatsappUrl || deliveryModalState.loading;
  const downloadCards = deliveryModalState.assets.length > 0
    ? deliveryModalState.assets.map((item, index) => `
        <a class="delivery-download-card" href="${escapeHtml(item.dataUrl || "")}" download="${escapeAttr(item.fileName || `boleta-${index + 1}.png`)}" target="_blank" rel="noreferrer">
          <span class="delivery-download-index">Boleta ${index + 1}</span>
          <strong>${escapeHtml(item.label || item.fileName || `Boleta ${index + 1}`)}</strong>
          <small>Descargar PNG</small>
        </a>
      `).join("")
    : `<div class="delivery-empty">Aun no cargamos las boletas para descarga.</div>`;

  return `
    <div class="delivery-modal-head">
      <div class="delivery-modal-head-copy">
        <span class="payment-card-kicker">Pago exitoso</span>
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(description)}</p>
        ${referenceChip}
      </div>
      <button type="button" class="selector-close" data-action="close-delivery-modal">Cerrar</button>
    </div>

    ${notice}

    <div class="delivery-choice-grid">
      <div class="delivery-choice-card delivery-choice-whatsapp">
        <div class="payment-action-icon payment-action-icon-whatsapp">◌</div>
        <div class="payment-card-copy">
          <strong>Enviar por WhatsApp</strong>
          <p>Se abrirá WhatsApp con un mensaje que lleva tu código de compra.</p>
        </div>
        <a class="button payment-whatsapp ${whatsappDisabled ? "is-disabled" : ""}" href="${escapeHtml(whatsappUrl || "#")}" target="_blank" rel="noreferrer" ${whatsappDisabled ? 'aria-disabled="true"' : ""}>Enviar por WhatsApp</a>
      </div>

      <div class="delivery-choice-card delivery-choice-download">
        <div class="payment-action-icon payment-action-icon-upload">↥</div>
        <div class="payment-card-copy">
          <strong>Descargar tus boletas</strong>
          <p>Presiona para descargar tus boletas en el celular. Tambien puedes abrir cada imagen de forma individual.</p>
        </div>
        <button type="button" class="button secondary" data-action="download-delivery-boletas">Descargar boletas</button>
      </div>
    </div>

    ${deliveryModalState.expanded ? `
      <div class="delivery-download-grid">
        ${deliveryModalState.loading ? `<div class="delivery-empty">Preparando archivos...</div>` : downloadCards}
      </div>
    ` : ""}
  `;
}

function paintDeliveryModal() {
  const content = document.getElementById("delivery-modal-content");
  if (!content) return;
  content.innerHTML = renderDeliveryModalContent();
  syncDeliveryModal();
}

function renderDeliveryModal() {
  return `
    <div
      id="delivery-modal"
      class="delivery-modal"
      role="dialog"
      aria-modal="true"
      aria-hidden="true"
    >
      <div class="delivery-modal-card">
        <div id="delivery-modal-content" class="delivery-modal-content">
          <div class="selector-empty selector-empty-large">Estamos preparando la entrega de tus boletas.</div>
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
        return;
      }

      const pageButton = event.target.closest("[data-selector-page]");
      if (pageButton && content.contains(pageButton)) {
        event.preventDefault();
        event.stopPropagation();
        const pagination = getRaffleSelectorPagination(getRaffleSelectorNumbers());
        const direction = pageButton.getAttribute("data-selector-page");
        if (direction === "prev" && pagination.hasPrev) {
          raffleSelectorState.page = Math.max(1, pagination.page - 1);
        } else if (direction === "next" && pagination.hasNext) {
          raffleSelectorState.page = Math.min(pagination.totalPages, pagination.page + 1);
        } else {
          return;
        }
        paintRaffleSelector();
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
            pricing_strategy: payload.raffle.pricingStrategy,
            pricing_config: payload.raffle.pricingConfig || {},
            total_numeros: payload.raffle.totalNumeros,
            ticket_registration_mode: payload.raffle.ticketRegistrationMode,
            ticket_auto_config: payload.raffle.ticketAutoConfig || {},
            instrucciones_pago: payload.raffle.paymentInstructions || payload.raffle.payment_instructions || "",
            paymentInstructions: payload.raffle.paymentInstructions || payload.raffle.payment_instructions || "",
            payment_instructions: payload.raffle.paymentInstructions || payload.raffle.payment_instructions || "",
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

async function openRaffleSelector(raffleId) {
  const fallbackSite = raffleSelectorState.site || window.__PUBLIC_SITE_STATE__?.site || null;
  const fallbackSlug = window.__PUBLIC_SITE_STATE__?.slug || raffleSelectorState.slug || getSlugFromLocation();
  const site = fallbackSite || window.__PUBLIC_SITE_STATE__?.site || null;
  const requestedId = String(raffleId || "");
  const previousRaffleId = String(raffleSelectorState.raffle?.campaign?.id || "");
  const initialRaffles = asArray(site?.activeRaffles);
  const raffle =
    initialRaffles.find((item) => String(item?.campaign?.id || "") === requestedId)
    || initialRaffles.find((item) => item?.publicConfig?.isFeatured)
    || initialRaffles[0]
    || null;
  if (!raffle) {
    const freshSite = await fetchFreshPublicSite(fallbackSlug);
    const freshRaffles = asArray(freshSite?.activeRaffles);
    const freshRaffle =
      freshRaffles.find((item) => String(item?.campaign?.id || "") === requestedId)
      || freshRaffles.find((item) => item?.publicConfig?.isFeatured)
      || freshRaffles[0]
      || null;
    if (!freshRaffle) {
      return;
    }

    raffleSelectorState.site = freshSite;
    raffleSelectorState.slug = fallbackSlug;
    raffleSelectorState.raffle = freshRaffle;
    raffleSelectorState.query = "";
    raffleSelectorState.page = 1;
    const currentSelection = previousRaffleId === String(freshRaffle.campaign?.id || "")
      ? asArray(raffleSelectorState.selected)
      : [];
    const persistedSelection = readPersistedSelection(freshRaffle.campaign.id);
    raffleSelectorState.selected = currentSelection.length > 0 ? currentSelection : persistedSelection;
    raffleSelectorState.numbers = [];
    raffleSelectorState.stats = null;
    raffleSelectorState.loading = true;
    raffleSelectorState.error = "";
    raffleSelectorState.notice = "Cargando numeros disponibles...";
    raffleSelectorState.noticeTone = "info";
    raffleSelectorState.updatedAt = "";
    raffleSelectorState.open = true;

    window.__PUBLIC_SITE_STATE__ = {
      site: freshSite,
      slug: fallbackSlug,
      raffles: freshRaffles,
    };

    clearRaffleSelectorTimers();
    syncRaffleSelectorModal();
    paintRaffleSelector();
    fetchRaffleSelectorNumbers();
    raffleSelectorState.pollTimer = setInterval(() => {
      if (raffleSelectorState.open) {
        fetchRaffleSelectorNumbers({ silent: true });
      }
    }, 18000);
    return;
  }

  raffleSelectorState.site = site;
  raffleSelectorState.slug = fallbackSlug;
  raffleSelectorState.raffle = raffle;
  raffleSelectorState.query = "";
  raffleSelectorState.page = 1;
  const currentSelection = previousRaffleId === requestedId
    && raffleSelectorState.selected.length > 0
    ? raffleSelectorState.selected
    : [];
  const persistedSelection = readPersistedSelection(raffle.campaign.id);
  raffleSelectorState.selected = currentSelection.length > 0 ? currentSelection : persistedSelection;
  raffleSelectorState.numbers = [];
  raffleSelectorState.stats = null;
  raffleSelectorState.loading = true;
  raffleSelectorState.error = "";
  raffleSelectorState.notice = "Cargando numeros disponibles...";
  raffleSelectorState.noticeTone = "info";
  raffleSelectorState.updatedAt = "";
  raffleSelectorState.open = true;

  window.__PUBLIC_SITE_STATE__ = {
    site,
    slug: fallbackSlug,
    raffles: asArray(site?.activeRaffles),
  };

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
  raffleSelectorState.page = 1;
  raffleSelectorState.numbers = [];
  raffleSelectorState.stats = null;
  raffleSelectorState.loading = false;
  raffleSelectorState.error = "";
  raffleSelectorState.notice = "";
  raffleSelectorState.noticeTone = "info";
  raffleSelectorState.updatedAt = "";
  raffleSelectorState.requestId += 1;
  raffleSelectorState.retryCount = 0;
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

function syncReceiptUploadModal() {
  const modal = document.getElementById("receipt-upload-modal");
  if (!modal) return;
  modal.classList.toggle("is-open", receiptUploadState.open);
  modal.setAttribute("aria-hidden", receiptUploadState.open ? "false" : "true");
  document.body.classList.toggle("modal-open", receiptUploadState.open || deliveryModalState.open || raffleSelectorState.open || paymentModalState.open);
}

function openReceiptUploadModal({
  title = "Subiendo comprobante",
  description = "Espera un momento mientras verificamos tu pago.",
  detail = "No cierres esta ventana hasta que termine el proceso.",
  tone = "info",
} = {}) {
  receiptUploadState.open = true;
  receiptUploadState.title = String(title || "Subiendo comprobante").trim();
  receiptUploadState.description = String(description || "").trim();
  receiptUploadState.detail = String(detail || "").trim();
  receiptUploadState.tone = tone || "info";
  receiptUploadState.requestId += 1;
  paintReceiptUploadModal();
  syncReceiptUploadModal();
}

function closeReceiptUploadModal() {
  receiptUploadState.open = false;
  receiptUploadState.title = "Subiendo comprobante";
  receiptUploadState.description = "Espera un momento mientras verificamos tu pago.";
  receiptUploadState.detail = "No cierres esta ventana hasta que termine el proceso.";
  receiptUploadState.tone = "info";
  receiptUploadState.requestId += 1;
  syncReceiptUploadModal();
}

function renderReceiptUploadModalContent() {
  return `
    <div class="receipt-upload-modal-head">
      <div class="receipt-upload-spinner" aria-hidden="true"></div>
      <div class="receipt-upload-copy">
        <span class="payment-card-kicker">Procesando</span>
        <h3>${escapeHtml(receiptUploadState.title)}</h3>
        <p>${escapeHtml(receiptUploadState.description)}</p>
        <small>${escapeHtml(receiptUploadState.detail)}</small>
      </div>
    </div>
    <div class="receipt-upload-dots" aria-hidden="true">
      <span></span><span></span><span></span>
    </div>
  `;
}

function paintReceiptUploadModal() {
  const content = document.getElementById("receipt-upload-modal-content");
  if (!content) return;
  content.innerHTML = renderReceiptUploadModalContent();
  syncReceiptUploadModal();
}

function renderReceiptUploadModal() {
  return `
    <div
      id="receipt-upload-modal"
      class="receipt-upload-modal"
      role="dialog"
      aria-modal="true"
      aria-hidden="true"
    >
      <div class="receipt-upload-card">
        <div id="receipt-upload-modal-content" class="receipt-upload-content">
          <div class="selector-empty selector-empty-large">Subiendo comprobante...</div>
        </div>
      </div>
    </div>
  `;
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
  const selectionSummary = getRaffleSelectorSelectionSummary(raffle, selected);
  if (!site || !slug || !raffle?.campaign?.id || !selected.length || paymentModalState.loading || !ensurePaymentModalContactReady() || !selectionSummary.isComplete) {
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
          selected_numbers: groupRaffleSelections(selected, selectionSummary.groupSize),
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
  const selectionSummary = getRaffleSelectorSelectionSummary(raffle, selected);
  if (!site || !slug || !raffle?.campaign?.id || !selected.length || paymentModalState.loading || !file || !ensurePaymentModalContactReady() || !selectionSummary.isComplete) {
    return;
  }

  paymentModalState.loading = true;
  paymentModalState.file = file;
  paymentModalState.fileName = file.name || "Comprobante";
  openReceiptUploadModal({
    title: "Subiendo comprobante",
    description: "Espera un momento mientras verificamos tu pago.",
    detail: "Estamos leyendo el archivo y validando la compra.",
    tone: "info",
  });
  submitPublicPaymentStateNotice(`Cargando ${paymentModalState.fileName}...`, "info");

  try {
    const formData = new FormData();
    formData.append("selected_numbers", JSON.stringify(groupRaffleSelections(selected, selectionSummary.groupSize)));
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
      throw new Error(payload?.message || payload?.error || "No fue posible cargar el comprobante.");
    }

    paymentModalState.loading = false;
    paymentModalState.file = null;
    paymentModalState.fileName = "";
    paymentModalState.checkoutUrl = "";
    paymentModalState.selected = [];
    paymentModalState.amount = 0;
    raffleSelectorState.selected = [];
    clearPersistedSelection(raffleSelectorState.raffle?.campaign?.id || raffle?.campaign?.id || "");
    raffleSelectorState.notice = "Tu compra quedo registrada y la seleccion fue limpiada.";
    raffleSelectorState.noticeTone = "success";
    paintRaffleSelector();
    if (payload?.auto_approved && payload?.payment_reference) {
      const contactPayload = getPaymentModalContactPayload();
      const nextSite = site || window.__PUBLIC_SITE_STATE__?.site || null;
      const nextSlug = slug || window.__PUBLIC_SITE_STATE__?.slug || "";
      const nextRaffle = raffle || null;
      closeReceiptUploadModal();
      closePaymentModal();
      openDeliveryModal({
        site: nextSite,
        slug: nextSlug,
        raffle: nextRaffle,
        paymentReference: payload.payment_reference,
        customerPhone: contactPayload.customer_phone || contactPayload.customerPhone || "",
      });
    } else {
      closeReceiptUploadModal();
      paintPaymentModal();
      const validationReasons = asArray(payload?.validation?.reasons)
        .map((reason) => String(reason || "").trim())
        .filter(Boolean);
      const rejectionReason = validationReasons.length > 0
        ? validationReasons[0]
        : String(payload?.receipt_warning || "").trim();
      const reviewMessage = payload?.client_message || "Tu comprobante quedo cargado y ya esta en revision.";
      const fallbackReason = payload?.validation?.decision === "NEEDS_MANUAL_REVIEW"
        ? "La validacion automatica no encontro una coincidencia suficiente y quedo pendiente de revision manual."
        : "";
      const rejectionMessage = rejectionReason
        ? `${reviewMessage} Motivo: ${rejectionReason}.`
        : fallbackReason
          ? `${reviewMessage} Motivo: ${fallbackReason}`
          : reviewMessage;
      submitPublicPaymentStateNotice(rejectionMessage, payload?.receipt_warning ? "warning" : "warning");
    }
  } catch (error) {
    closeReceiptUploadModal();
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
      title: "Videos publicados",
      text: `${asArray(site.winnerVideos).length} videos visibles publicados.`,
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
    <section class="section shell section-anchor how-it-works-section" id="como-participar">
      <div class="how-it-works-panel">
        <div class="section-head how-it-works-head">
          <div>
            <span class="section-kicker">Proceso simple</span>
            <h2>Compra en menos de 2 minutos</h2>
            <p>Una ruta clara y rápida para pasar de ver el sorteo a tener tu boleta registrada.</p>
          </div>
          <div class="how-it-works-note">Selecciona, paga y recibe seguimiento</div>
        </div>
        <div class="how-it-works-track">
          ${steps
            .map(
              ([title, text], index) => `
                <article class="step-card premium-step">
                  <div class="step-card-top">
                    <div class="step-number">${index + 1}</div>
                    ${index < steps.length - 1 ? '<span class="step-connector"></span>' : ""}
                  </div>
                  <strong>${escapeHtml(title)}</strong>
                  <p>${escapeHtml(text)}</p>
                </article>
              `,
            )
            .join("")}
        </div>
      </div>
    </section>
  `;
}

function renderShell(site, slug) {
  const settings = site.settings || {};
  const company = site.company || {};
  const pageTitle = [
    company.nombre || settings.title || "Rifas",
    "Inversiones",
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
  const heroSpotlightLabelClass = featuredRaffle ? "overlay-label overlay-label-featured" : "overlay-label";
  const heroSpotlightChips = [
    featuredRaffle ? getRaffleDisplayDate(featuredRaffle) : "",
    featuredRaffle ? getRaffleDisplayPrice(featuredRaffle) : "",
  ].filter(Boolean);
  const raffleCount = asArray(site.activeRaffles).length;
  const faqCount = asArray(site.faq).length;
  const videosCount = asArray(site.winnerVideos).length;
  const heroSignals = [
    raffleCount > 0 ? `${raffleCount} sorteos visibles` : "",
    videosCount > 0 ? `${videosCount} videos publicados` : "",
  ].filter(Boolean);
  const footerQuickLinks = [
    ["Inicio", "#inicio"],
    ["Sorteos", "#sorteos"],
    ["Cómo participar", "#como-participar"],
    ["Ganadores", "#videos"],
    ["Ayuda", "#faq"],
  ];
  const topNavLinks = footerQuickLinks;
  const footerSocialLinks = getFooterSocialLinks(site);
  const paymentSections = asArray(site.paymentMethods);
  const legalSections = asArray(site.legal);
  const otherSections = asArray(site.otherSections);
  raffleSelectorState.site = site;
  raffleSelectorState.slug = slug;
  publicUiState.mobileMenuOpen = false;
  window.__PUBLIC_SITE_STATE__ = {
    site,
    slug,
    raffles: asArray(site.activeRaffles),
  };

  app.innerHTML = `
    <div class="page">
      <header class="topbar">
        <div class="shell topbar-inner">
          <div class="topbar-main">
            <div class="brand">
              <div class="brand-mark">
              <img src="${escapeHtml(settings.logoUrl || company.logo || ASSETS.brand)}" alt="${escapeHtml(company.nombre || settings.title || "Logo")}" loading="eager" decoding="async" style="width:100%;height:100%;object-fit:cover;border-radius:16px;" />
              </div>
              <div>
                <div class="brand-name">${escapeHtml(company.nombre || settings.title || "Rifas publicas")}</div>
                <span class="brand-subtitle">Tu portal de rifas y ganadores</span>
              </div>
            </div>
            <div class="top-actions">
              <button
                type="button"
                class="button topbar-menu-toggle"
                data-action="toggle-mobile-menu"
                aria-expanded="${publicUiState.mobileMenuOpen ? "true" : "false"}"
                aria-controls="topbar-mobile-menu"
                aria-label="${publicUiState.mobileMenuOpen ? "Cerrar menú" : "Abrir menú"}"
              >
                <span class="topbar-menu-icon" data-mobile-menu-icon aria-hidden="true">${publicUiState.mobileMenuOpen ? "×" : "☰"}</span>
                <span class="topbar-menu-label" data-mobile-menu-label>Menú</span>
              </button>
              ${settings.whatsappNumber ? `<a class="button topbar-cta" href="${escapeHtml(whatsappLink(settings.whatsappNumber))}" target="_blank" rel="noreferrer"><span class="whatsapp-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20.2 3.8A10.6 10.6 0 0 0 2.3 15.7L1 22l6.4-1.7a10.6 10.6 0 0 0 5.1 1.3h0A10.6 10.6 0 0 0 20.2 3.8Zm-8 16.5h0a8.8 8.8 0 0 1-4.5-1.2l-.3-.2-3.8 1 1-3.7-.2-.4a8.8 8.8 0 1 1 7.8 4.5Zm5-6.5c-.3-.2-1.7-.9-1.9-1s-.3-.2-.4.2-.7 1-1 1.2-.4.2-.7 0a7.2 7.2 0 0 1-2.1-1.3 8 8 0 0 1-1.5-1.9c-.2-.4 0-.6.2-.8l.4-.5c.2-.2.2-.3.3-.5.1-.2 0-.4 0-.6 0-.2-.5-1.4-.7-1.9-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.6.1-.9.4s-1.1 1.1-1.1 2.6 1.2 3 1.4 3.2c.2.2 2.1 3.2 5.1 4.4.7.3 1.2.5 1.7.7.7.2 1.3.2 1.7.1.5-.1 1.7-.7 1.9-1.4.2-.6.2-1.1.1-1.2 0-.1-.2-.2-.5-.4Z" fill="currentColor"/></svg></span><span>Contáctanos</span></a>` : ""}
            </div>
          </div>
          <nav class="top-nav top-nav-desktop" aria-label="Navegación principal">
            ${topNavLinks.map(([label, href]) => `<a href="${escapeHtml(href)}">${escapeHtml(label)}</a>`).join("")}
          </nav>
          <div class="topbar-mobile-panel" id="topbar-mobile-menu" data-mobile-nav-panel ${publicUiState.mobileMenuOpen ? "" : "hidden"}>
            ${topNavLinks.map(([label, href]) => `<a href="${escapeHtml(href)}">${escapeHtml(label)}</a>`).join("")}
          </div>
        </div>
        </header>

      <main>
        <section class="hero" id="inicio">
          <div class="shell hero-card">
            <div class="hero-grid">
              <div class="hero-copy">
                <div class="hero-company-line">${escapeHtml(settings.title || company.nombre || heroTitle || "Rifas publicas")}</div>
                <div class="hero-brand">
                  <div class="hero-brand-mark">
                    <img src="${escapeHtml(settings.logoUrl || company.logo || ASSETS.brand)}" alt="${escapeHtml(company.nombre || settings.title || "Logo")}" loading="lazy" decoding="async" />
                  </div>
                </div>
                ${slogan ? `<p class="hero-slogan">${escapeHtml(slogan)}</p>` : ""}
                <div class="hero-actions">
                  ${heroButton ? `<a class="button gold" href="${escapeHtml(heroButton)}"${String(heroButton).startsWith("#") ? "" : ' target="_blank" rel="noreferrer"'}>${escapeHtml(heroLabel)}</a>` : ""}
                  <a class="button secondary hero-secondary" href="#videos">Ver Ganadores</a>
                </div>
              </div>

                <div class="hero-media">
                ${heroVideo ? renderInlineVideo(heroVideo, heroTitle) : `<img src="${escapeHtml(heroSpotlightImage)}" alt="${escapeHtml(heroSpotlightTitle)}" loading="eager" fetchpriority="high" decoding="async" />`}
                <div class="overlay">
                  <div class="overlay-top">
                    <div class="overlay-copy">
                      <span class="${escapeHtml(heroSpotlightLabelClass)}">${escapeHtml(heroSpotlightLabel)}</span>
                      <strong>${escapeHtml(heroSpotlightTitle)}</strong>
                      <div>${escapeHtml(heroSpotlightDescription)}</div>
                      ${heroSpotlightChips.length ? `
                        <div class="overlay-meta">
                          ${heroSpotlightChips.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
                        </div>
                      ` : ""}
                    </div>
                    ${featuredRaffle ? `
                      <div class="overlay-actions">
                        <button
                          type="button"
                          class="button gold js-open-raffle-selector hero-buy-button"
                          data-raffle-id="${escapeHtml(String(featuredRaffle?.campaign?.id || ""))}"
                        >
                          Comprar
                        </button>
                      </div>
                    ` : ""}
                  </div>
                  ${featuredRaffle ? renderRaffleAdvanceBlock(featuredRaffle) : ""}
                </div>
              </div>
            </div>
          </div>
        </section>

        ${renderTrustStrip(site)}

          <section class="section shell section-anchor" id="sorteos">
            <div class="section-head">
              <div>
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
                <h2>Opciones de pago visibles</h2>
                <p>La pagina publica toma estos bloques desde la configuracion del backend.</p>
              </div>
          </div>
          <div class="state-card" style="margin-bottom:18px">
            <img src="${escapeHtml(ASSETS.payments)}" alt="Metodos de pago" loading="lazy" decoding="async" style="width:100%;height:auto;border-radius:22px;display:block;margin-bottom:16px" />
          </div>
          ${renderSections(site, paymentSections, "Metodos de pago", "Bloques administrables desde el panel.") }
          </section>
        ` : ""}

          <section class="section shell section-anchor" id="videos">
            <div class="section-head">
              <div>
                <h2>Videos y testimonios</h2>
                <p>Mira entregas, testimonios y apoyos sociales que el administrador decida publicar.</p>
              </div>
          </div>
          ${renderWinnerVideos(site)}
        </section>

          <section class="section shell section-anchor" id="faq">
            <div class="section-head">
              <div>
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
                  <h2>Contenido adicional</h2>
                  <p>Secciones extra cargadas desde el CMS interno.</p>
                </div>
            </div>
            ${renderSections(site, otherSections, "Contenido adicional", "Bloques generales publicados por el administrador.") }
          </section>
        ` : ""}

        <section class="section shell footer-shell">
          <div class="footer-card footer-card-premium">
            <div class="footer-brand">
              <div class="footer-brand-mark">
                <img src="${escapeHtml(settings.logoUrl || company.logo || ASSETS.brand)}" alt="${escapeHtml(company.nombre || settings.title || "Logo")}" loading="lazy" decoding="async" />
              </div>
              <div class="footer-brand-copy">
                <strong>${escapeHtml(company.nombre || settings.title || "Rifas publicas")}</strong>
                <p>${escapeHtml(settings.slogan || settings.subtitle || "Tu portal de rifas y ganadores")}</p>
              </div>
            </div>
            <div class="footer-links">
              <span class="footer-label">Navegación</span>
              <div class="footer-link-list">
                ${footerQuickLinks.map(([label, href]) => `<a href="${escapeHtml(href)}">${escapeHtml(label)}</a>`).join("")}
              </div>
            </div>
            <div class="footer-contact">
              <span class="footer-label">Redes sociales</span>
              ${footerSocialLinks.length ? `
                <div class="footer-social-grid">
                  ${footerSocialLinks.map((item) => `
                    <a class="social-link social-${escapeHtml(item.key)}" href="${escapeHtml(item.href)}" target="_blank" rel="noreferrer" aria-label="${escapeHtml(item.label)}">
                      <span class="social-link-icon">${socialIconMarkup(item.key)}</span>
                      <span>${escapeHtml(item.label)}</span>
                    </a>
                  `).join("")}
                </div>
              ` : ""}
              ${settings.whatsappNumber ? `<a class="footer-contact-pill" href="${escapeHtml(whatsappLink(settings.whatsappNumber))}" target="_blank" rel="noreferrer">WhatsApp ${escapeHtml(settings.whatsappNumber)}</a>` : ""}
              </div>
            </div>
          </div>
          <div class="footer-bar">
            <span>Compra segura · Seguimiento en tiempo real · Ganadores visibles</span>
            <span>${escapeHtml(slug || "sin-slug")}</span>
          </div>
        </section>
      </main>
        ${renderRaffleSelectorModal()}
        ${renderPaymentModal()}
        ${renderReceiptUploadModal()}
        ${renderDeliveryModal()}
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

  writeCachedPublicSite(slug, site);

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

async function refreshFeaturedRaffleAdvance(site, slug) {
  const featuredRaffle = asArray(site?.activeRaffles)[0] || null;
  if (!featuredRaffle?.campaign?.id) {
    return;
  }

  const progressRoot = app.querySelector(`[data-raffle-progress][data-raffle-id="${CSS.escape(String(featuredRaffle.campaign.id))}"]`);
  if (!progressRoot) {
    return;
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/public-site/${encodeURIComponent(slug)}/raffles/${encodeURIComponent(featuredRaffle.campaign.id)}/availability?limit=1`,
    );
    if (!response.ok) {
      return;
    }

    const payload = await response.json();
    const advance = getRaffleAdvanceStats(payload);
    const fill = progressRoot.querySelector("[data-raffle-progress-fill]");
    const meta = progressRoot.querySelector("[data-raffle-progress-meta]");

    if (meta) {
      meta.textContent = advance.total > 0
        ? `${advance.percent}% de avance`
        : "Avance del sorteo";
    }

    if (fill) {
      fill.style.width = "0%";
      window.requestAnimationFrame(() => {
        fill.style.width = `${advance.percent}%`;
      });
    }
  } catch {
    // Se deja silencioso para no romper la landing si el avance no responde.
  }
}

app.addEventListener("click", (event) => {
  const mobileMenuToggle = event.target.closest('[data-action="toggle-mobile-menu"]');
  if (mobileMenuToggle && app.contains(mobileMenuToggle)) {
    event.preventDefault();
    event.stopPropagation();
    publicUiState.mobileMenuOpen = !publicUiState.mobileMenuOpen;
    const topbar = app.querySelector(".topbar");
    const panel = app.querySelector("[data-mobile-nav-panel]");
    const label = app.querySelector("[data-mobile-menu-label]");
    const icon = app.querySelector("[data-mobile-menu-icon]");
    if (topbar) {
      topbar.classList.toggle("is-menu-open", publicUiState.mobileMenuOpen);
    }
    if (panel) {
      panel.hidden = !publicUiState.mobileMenuOpen;
    }
    if (label) {
      label.textContent = publicUiState.mobileMenuOpen ? "Cerrar" : "Menú";
    }
    if (icon) {
      icon.textContent = publicUiState.mobileMenuOpen ? "×" : "☰";
    }
    mobileMenuToggle.setAttribute("aria-expanded", publicUiState.mobileMenuOpen ? "true" : "false");
    mobileMenuToggle.setAttribute("aria-label", publicUiState.mobileMenuOpen ? "Cerrar menú" : "Abrir menú");
    return;
  }

  const mobileNavLink = event.target.closest("[data-mobile-nav-panel] a");
  if (mobileNavLink && app.contains(mobileNavLink)) {
    publicUiState.mobileMenuOpen = false;
    const topbar = app.querySelector(".topbar");
    const panel = app.querySelector("[data-mobile-nav-panel]");
    const toggle = app.querySelector('[data-action="toggle-mobile-menu"]');
    const label = app.querySelector("[data-mobile-menu-label]");
    const icon = app.querySelector("[data-mobile-menu-icon]");
    if (topbar) {
      topbar.classList.remove("is-menu-open");
    }
    if (panel) {
      panel.hidden = true;
    }
    if (toggle) {
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Abrir menú");
    }
    if (label) {
      label.textContent = "Menú";
    }
    if (icon) {
      icon.textContent = "☰";
    }
  }

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

  const deliveryOverlay = event.target.closest("#delivery-modal");
  if (deliveryOverlay && event.target.id === "delivery-modal") {
    closeDeliveryModal();
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

  if (actionName === "focus-selector-grid") {
    event.preventDefault();
    event.stopPropagation();
    const grid = document.querySelector(".ticket-grid");
    if (grid) {
      grid.scrollIntoView({ behavior: "smooth", block: "start" });
    }
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
    const selected = currentRaffle ? getCurrentRaffleSelection(currentRaffle.campaign.id) : [];
    const site = raffleSelectorState.site || window.__PUBLIC_SITE_STATE__?.site || null;
    const slug = raffleSelectorState.slug || window.__PUBLIC_SITE_STATE__?.slug || "";
    const selectionSummary = getRaffleSelectorSelectionSummary(currentRaffle || {}, selected);
    if (!currentRaffle || !selected.length) {
      return;
    }
    if (!selectionSummary.isComplete) {
      raffleSelectorState.notice = `Te faltan ${selectionSummary.missingForNext} número${selectionSummary.missingForNext === 1 ? "" : "s"} para completar una boleta de ${selectionSummary.groupSize} números.`;
      raffleSelectorState.noticeTone = "warning";
      paintRaffleSelector();
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

  if (actionName === "close-delivery-modal") {
    event.preventDefault();
    event.stopPropagation();
    closeDeliveryModal();
    return;
  }

  if (actionName === "download-delivery-boletas") {
    event.preventDefault();
    event.stopPropagation();
    deliveryModalState.downloadRequested = true;

    if (deliveryModalState.assets.length > 0) {
      downloadDeliveryAssets();
      deliveryModalState.downloadRequested = false;
      deliveryModalState.expanded = true;
      paintDeliveryModal();
      return;
    }

    deliveryModalState.expanded = true;
    paintDeliveryModal();
    if (!deliveryModalState.loading) {
      loadPublicDeliveryAssets();
    }
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
  raffleSelectorState.page = 1;
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

  const cached = readCachedPublicSite(slug);
  if (cached?.site) {
    try {
      renderShell(cached.site, slug);
      void refreshFeaturedRaffleAdvance(cached.site, slug);
      const cachedBanner = document.createElement("div");
      cachedBanner.className = "site-cache-banner";
      cachedBanner.textContent = "Mostrando contenido cargado previamente...";
      document.body.appendChild(cachedBanner);
      window.setTimeout(() => {
        cachedBanner.classList.add("is-hidden");
        window.setTimeout(() => cachedBanner.remove(), 220);
      }, 1800);
    } catch {
      // If cached render fails, fall back to loading shell below.
    }
  }

  if (!cached?.site) {
    app.innerHTML = `
      <div class="loading-shell loading-shell-minimal" aria-label="Cargando sitio">
        <div class="loading-spinner"></div>
      </div>
    `;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/public-site/${encodeURIComponent(slug)}`);
    if (!response.ok) {
      throw new Error(`No se encontro el sitio para /${slug}`);
    }

    const site = await response.json();
    renderShell(site, slug);
    void refreshFeaturedRaffleAdvance(site, slug);
  } catch (error) {
    if (!cached?.site) {
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
}

loadSite();
