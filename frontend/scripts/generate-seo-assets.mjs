import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, "..");
const publicDir = path.join(projectRoot, "public");

mkdirSync(publicDir, { recursive: true });

const rawSiteUrl = process.env.VITE_SITE_URL || "https://app.rodrigoborgia.com";
const siteUrl = rawSiteUrl.replace(/\/+$/, "");
const buildDate = new Date().toISOString().slice(0, 10);

const robotsTxt = `User-agent: *
Allow: /

Sitemap: ${siteUrl}/sitemap.xml
`;

const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${siteUrl}/</loc>
    <lastmod>${buildDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
`;

writeFileSync(path.join(publicDir, "robots.txt"), robotsTxt, "utf8");
writeFileSync(path.join(publicDir, "sitemap.xml"), sitemapXml, "utf8");

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
console.log("[seo] robots.txt y sitemap.xml actualizados.");
