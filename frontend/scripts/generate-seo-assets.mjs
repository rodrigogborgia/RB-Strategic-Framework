import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, "..");
const publicDir = path.join(projectRoot, "public");

mkdirSync(publicDir, { recursive: true });

const rawSiteUrl = process.env.VITE_SITE_URL || "https://rodrigoborgia.com";
// Garantizar que siempre usamos https://rodrigoborgia.com (sin www, sin trailing slash)
const siteUrl = rawSiteUrl
  .replace(/\/+$/, "") // Remover trailing slashes
  .replace(/^https?:\/\/(www\.)?/, "https://") // Normalizar protocolo
  .replace(/www\./i, ""); // Remover www

if (!siteUrl.startsWith("https://rodrigoborgia.com")) {
  console.warn(`⚠️ [seo] ADVERTENCIA: URL de sitio normalizada a: ${siteUrl}`);
}

const buildDate = new Date().toISOString().slice(0, 10);

// URLs permitidas con validación
const allowedUrls = [
  { path: "/", changefreq: "weekly", priority: 1.0 },
  { path: "/negociar-bajo-presion", changefreq: "monthly", priority: 0.8 },
  {
    path: "/negociacion-bajo-presion-guia",
    changefreq: "monthly",
    priority: 0.7,
  },
];

// Filtrar y validar URLs
const validatedUrls = allowedUrls.filter((url) => {
  // Rechazar URLs de prueba o categorías vacías
  const testPatterns = [
    /\/test/i,
    /\/debug/i,
    /\/staging/i,
    /\/uncategorized/i,
    /\/category\/uncategorized/i,
    /\/draft/i,
  ];

  const isTestUrl = testPatterns.some((pattern) => pattern.test(url.path));
  if (isTestUrl) {
    console.warn(`⚠️ [seo] URL de prueba ignorada: ${url.path}`);
    return false;
  }

  // Rechazar URLs con www o http
  if (url.path.includes("www") || url.path.includes("http")) {
    console.warn(
      `⚠️ [seo] URL inválida ignorada (contiene www o http): ${url.path}`,
    );
    return false;
  }

  return true;
});

const robotsTxt = `# Robots.txt para https://rodrigoborgia.com
# Última actualización: ${buildDate}

# Permitir acceso general
User-agent: *
Allow: /

# Desalentar rastreo de rutas internas/administrativas
Disallow: /admin/
Disallow: /api/
Disallow: /test/
Disallow: /staging/
Disallow: /debug/
Disallow: /.well-known/acme-challenge/

# Prevenir rastreo de rutas duplicadas
Disallow: /*?*accept-language=
Disallow: /*?*utm_

# Indicar ubicación del sitemap
Sitemap: ${siteUrl}/sitemap.xml

# Tiempo entre peticiones crawl
Crawl-delay: 1
`;

const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${validatedUrls
  .map(
    (url) => `  <url>
    <loc>${siteUrl}${url.path}</loc>
    <lastmod>${buildDate}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`,
  )
  .join("\n")}
</urlset>
`;

writeFileSync(path.join(publicDir, "robots.txt"), robotsTxt, "utf8");
writeFileSync(path.join(publicDir, "sitemap.xml"), sitemapXml, "utf8");

console.log(
  `✅ [seo] robots.txt generado (${validatedUrls.length} URLs validadas)`,
);
console.log(
  `✅ [seo] sitemap.xml generado con ${validatedUrls.length} URLs validas`,
);
console.log(`ℹ️  [seo] Sitemap URL: ${siteUrl}/sitemap.xml`);

async function generateOgPng() {
  const sourceSvg = path.join(publicDir, "og-image.svg");
  const targetPng = path.join(publicDir, "og-image.png");

  try {
    const svg = readFileSync(sourceSvg);
    const sharp = (await import("sharp")).default;

    await sharp(svg)
      .resize(1200, 630, { fit: "cover" })
      .png({ quality: 92 })
      .toFile(targetPng);

    console.log("[seo] og-image.png generado correctamente.");
  } catch (error) {
    console.warn("[seo] No se pudo generar og-image.png desde og-image.svg.");
    console.warn(error instanceof Error ? error.message : String(error));
  }
}

await generateOgPng();
console.log("[seo] ✅ Generación de assets SEO completada.");
