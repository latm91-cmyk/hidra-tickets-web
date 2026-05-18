import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = path.resolve(process.cwd());
const assetsDir = path.join(root, "public", "assets");

const assets = [
  {
    file: "logo-placeholder.webp",
    width: 960,
    height: 960,
    svg: `
      <svg xmlns="http://www.w3.org/2000/svg" width="960" height="960" viewBox="0 0 960 960">
        <defs>
          <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#0f172a"/>
            <stop offset="100%" stop-color="#334155"/>
          </linearGradient>
          <radialGradient id="glow" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stop-color="#fcd34d" stop-opacity="0.55"/>
            <stop offset="100%" stop-color="#fcd34d" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <rect width="960" height="960" rx="120" fill="url(#bg)"/>
        <circle cx="480" cy="320" r="220" fill="url(#glow)"/>
        <circle cx="480" cy="445" r="210" fill="#f8fafc" opacity="0.96"/>
        <circle cx="480" cy="445" r="145" fill="#0f172a"/>
        <path d="M412 496c48-8 85-42 85-90 0-31-15-56-39-73 8 20 8 45-6 62-8-26-33-53-63-60 12 23 8 49-8 69-15 18-26 28-26 50 0 25 21 43 57 42Z" fill="#fcd34d"/>
        <text x="480" y="755" text-anchor="middle" fill="#f8fafc" font-family="Arial, Helvetica, sans-serif" font-size="52" font-weight="700">El Agropecuario</text>
        <text x="480" y="815" text-anchor="middle" fill="#dbeafe" font-family="Arial, Helvetica, sans-serif" font-size="28">Rifas y sorteos</text>
      </svg>
    `,
  },
  {
    file: "hero-caballo.webp",
    width: 1600,
    height: 1000,
    svg: `
      <svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000" viewBox="0 0 1600 1000">
        <defs>
          <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#1f2937"/>
            <stop offset="100%" stop-color="#0f172a"/>
          </linearGradient>
          <radialGradient id="glow" cx="35%" cy="25%" r="60%">
            <stop offset="0%" stop-color="#fcd34d" stop-opacity="0.38"/>
            <stop offset="100%" stop-color="#fcd34d" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <rect width="1600" height="1000" rx="80" fill="url(#bg)"/>
        <circle cx="420" cy="220" r="260" fill="url(#glow)"/>
        <rect x="90" y="90" width="1420" height="820" rx="54" fill="none" stroke="#ffffff" stroke-opacity="0.08" stroke-width="2"/>
        <path d="M1060 820c-82-36-130-112-126-194 3-60 34-107 91-132 67-29 142-18 194 29 64 58 74 164 17 242-47 63-107 82-176 55Z" fill="#7c2d12"/>
        <path d="M1012 650c-72-68-82-166-29-245 39-58 112-93 182-86 33 3 61 15 81 33-24 3-45 12-61 28 31 10 55 36 62 68 13 62-16 116-64 147-17 11-35 21-52 32-31 19-69 39-119 23Z" fill="#d6a13e"/>
        <ellipse cx="1094" cy="438" rx="86" ry="72" fill="#fff8e7" opacity="0.9"/>
        <circle cx="1126" cy="427" r="11" fill="#0f172a"/>
        <path d="M1165 474c-12 30-35 53-68 67" stroke="#0f172a" stroke-width="10" stroke-linecap="round" fill="none"/>
        <path d="M1060 380c-26-44-64-70-110-76" stroke="#fff8e7" stroke-opacity="0.75" stroke-width="18" stroke-linecap="round" fill="none"/>
        <text x="160" y="190" fill="#fcd34d" font-family="Arial, Helvetica, sans-serif" font-size="60" font-weight="700">Gran sorteo</text>
        <text x="160" y="260" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="120" font-weight="900">Caballo Trochador</text>
        <text x="160" y="330" fill="#e2e8f0" font-family="Arial, Helvetica, sans-serif" font-size="44">Participa desde tu boleta y gana con tu número favorito.</text>
      </svg>
    `,
  },
  {
    file: "raffle-card.webp",
    width: 1200,
    height: 800,
    svg: `
      <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
        <defs>
          <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#7c2d12"/>
            <stop offset="100%" stop-color="#f59e0b"/>
          </linearGradient>
        </defs>
        <rect width="1200" height="800" rx="64" fill="url(#bg)"/>
        <rect x="52" y="52" width="1096" height="696" rx="40" fill="none" stroke="#fff" stroke-opacity="0.18" stroke-width="2"/>
        <circle cx="930" cy="220" r="150" fill="#fff" opacity="0.16"/>
        <circle cx="980" cy="520" r="180" fill="#fff" opacity="0.14"/>
        <path d="M250 590c108-22 185-101 185-208 0-70-34-127-90-166 18 44 18 99-13 137-19-58-72-118-137-134 27 50 19 108-16 151-33 40-58 61-58 108 0 56 46 95 129 112Z" fill="#fff8e7"/>
        <text x="90" y="160" fill="#fff" font-family="Arial, Helvetica, sans-serif" font-size="54" font-weight="700">Sorteo destacado</text>
        <text x="90" y="232" fill="#fff" font-family="Arial, Helvetica, sans-serif" font-size="90" font-weight="900">Tu premio aqui</text>
        <text x="90" y="305" fill="#fff7ed" font-family="Arial, Helvetica, sans-serif" font-size="38" font-weight="500">Imagen base local en formato webp</text>
      </svg>
    `,
  },
  {
    file: "winner-video.webp",
    width: 1280,
    height: 720,
    svg: `
      <svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
        <defs>
          <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#0f172a"/>
            <stop offset="100%" stop-color="#1d4ed8"/>
          </linearGradient>
        </defs>
        <rect width="1280" height="720" rx="56" fill="url(#bg)"/>
        <circle cx="290" cy="180" r="140" fill="#fcd34d" opacity="0.18"/>
        <circle cx="1040" cy="540" r="180" fill="#fcd34d" opacity="0.16"/>
        <rect x="110" y="110" width="1060" height="500" rx="44" fill="#ffffff" fill-opacity="0.08" stroke="#ffffff" stroke-opacity="0.12"/>
        <polygon points="560,250 560,470 760,360" fill="#fcd34d"/>
        <text x="640" y="610" text-anchor="middle" fill="#fff" font-family="Arial, Helvetica, sans-serif" font-size="42" font-weight="700">Video de ganador</text>
      </svg>
    `,
  },
  {
    file: "payment-methods.webp",
    width: 1200,
    height: 800,
    svg: `
      <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
        <defs>
          <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#0f172a"/>
            <stop offset="100%" stop-color="#334155"/>
          </linearGradient>
        </defs>
        <rect width="1200" height="800" rx="60" fill="url(#bg)"/>
        <rect x="70" y="70" width="1060" height="660" rx="40" fill="none" stroke="#ffffff" stroke-opacity="0.1" stroke-width="2"/>
        <rect x="150" y="180" width="260" height="180" rx="28" fill="#f8fafc" fill-opacity="0.12"/>
        <rect x="470" y="180" width="260" height="180" rx="28" fill="#f8fafc" fill-opacity="0.12"/>
        <rect x="790" y="180" width="260" height="180" rx="28" fill="#f8fafc" fill-opacity="0.12"/>
        <text x="280" y="280" text-anchor="middle" fill="#fcd34d" font-family="Arial, Helvetica, sans-serif" font-size="52" font-weight="700">Nequi</text>
        <text x="600" y="280" text-anchor="middle" fill="#fcd34d" font-family="Arial, Helvetica, sans-serif" font-size="52" font-weight="700">Daviplata</text>
        <text x="920" y="280" text-anchor="middle" fill="#fcd34d" font-family="Arial, Helvetica, sans-serif" font-size="52" font-weight="700">PSE</text>
        <text x="600" y="520" text-anchor="middle" fill="#fff" font-family="Arial, Helvetica, sans-serif" font-size="64" font-weight="900">Medios de pago</text>
      </svg>
    `,
  },
];

await fs.mkdir(assetsDir, { recursive: true });

for (const asset of assets) {
  const outputPath = path.join(assetsDir, asset.file);
  const buffer = Buffer.from(asset.svg.trim());
  await sharp(buffer).resize(asset.width, asset.height).webp({ quality: 92 }).toFile(outputPath);
}

console.log(`Generated ${assets.length} webp assets in ${assetsDir}`);
