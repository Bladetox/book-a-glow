import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const seoPath = path.join(root, "src", "data", "seo-pages.json");
const pages = JSON.parse(fs.readFileSync(seoPath, "utf8"));
const baseHtml = fs.readFileSync(path.join(dist, "index.html"), "utf8");
const siteUrl = "https://www.nextslot.co.za";

const esc = (value) => String(value)
  .replace(/&/g, "&amp;")
  .replace(/"/g, "&quot;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;");

function schemaFor(route, page) {
  const url = siteUrl + (route === "/" ? "/" : route);
  if (route === "/") {
    return {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Organization",
          "@id": siteUrl + "/#organization",
          "name": "NextSlot",
          "url": siteUrl + "/",
          "logo": siteUrl + "/web-app-manifest-512x512.png"
        },
        {
          "@type": "WebSite",
          "@id": siteUrl + "/#website",
          "url": siteUrl + "/",
          "name": "NextSlot",
          "publisher": { "@id": siteUrl + "/#organization" }
        },
        {
          "@type": "SoftwareApplication",
          "name": "NextSlot",
          "url": siteUrl + "/",
          "logo": siteUrl + "/web-app-manifest-512x512.png",
          "description": page.description,
          "applicationCategory": "BusinessApplication",
          "operatingSystem": "Web",
          "offers": {
            "@type": "Offer",
            "priceCurrency": "ZAR",
            "availability": "https://schema.org/InStock"
          },
          "areaServed": { "@type": "Country", "name": "South Africa" },
          "audience": {
            "@type": "Audience",
            "audienceType": "Independent service businesses"
          }
        }
      ]
    };
  }

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": url + "#webpage",
        "url": url,
        "name": page.title,
        "description": page.description,
        "isPartOf": { "@id": siteUrl + "/#website" },
        "about": { "@id": siteUrl + "/#organization" }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "NextSlot", "item": siteUrl + "/" },
          { "@type": "ListItem", "position": 2, "name": page.eyebrow || page.title, "item": url }
        ]
      }
    ]
  };
}

function patch(html, route, page) {
  const url = siteUrl + (route === "/" ? "/" : route);
  const robots = page.indexable ? "index, follow, max-image-preview:large" : "noindex, nofollow";
  const tags = [
    [/<title>[\s\S]*?<\/title>/, "<title>" + esc(page.title) + "</title>"],
    [/<meta name="description" content="[^"]*" \/>/, '<meta name="description" content="' + esc(page.description) + '" />'],
    [/<meta name="robots" content="[^"]*" \/>/, '<meta name="robots" content="' + robots + '" />'],
    [/<link rel="canonical" href="[^"]*" \/>/, '<link rel="canonical" href="' + url + '" />'],
    [/<meta property="og:url" content="[^"]*" \/>/, '<meta property="og:url" content="' + url + '" />'],
    [/<meta property="og:title" content="[^"]*" \/>/, '<meta property="og:title" content="' + esc(page.title) + '" />'],
    [/<meta property="og:description" content="[^"]*" \/>/, '<meta property="og:description" content="' + esc(page.description) + '" />'],
    [/<meta name="twitter:url" content="[^"]*" \/>/, '<meta name="twitter:url" content="' + url + '" />'],
    [/<meta name="twitter:title" content="[^"]*" \/>/, '<meta name="twitter:title" content="' + esc(page.title) + '" />'],
    [/<meta name="twitter:description" content="[^"]*" \/>/, '<meta name="twitter:description" content="' + esc(page.description) + '" />']
  ];

  let output = html;
  for (const [pattern,replacement] of tags) output = output.replace(pattern,replacement);

  const jsonLd = JSON.stringify(schemaFor(route,page)).replace(/</g,"\\u003c");
  const schemaPattern = /<script type="application\/ld\+json">[\s\S]*?<\/script>/;
  output = output.replace(schemaPattern, '<script type="application/ld+json">' + jsonLd + "</script>");

  return output;
}

const indexable = Object.entries(pages).filter(([,page]) => page.indexable);
for (const [route,page] of indexable) {
  if (route === "/") continue;
  const dir = path.join(dist, route.replace(/^\//,""));
  fs.mkdirSync(dir,{recursive:true});
  fs.writeFileSync(path.join(dir,"index.html"),patch(baseHtml,route,page));
}

const sitemap = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...indexable.map(([route,page]) => [
    "  <url>",
    "    <loc>" + siteUrl + (route === "/" ? "/" : route) + "</loc>",
    "    <lastmod>" + page.lastmod + "</lastmod>",
    "  </url>"
  ].join("\n")),
  "</urlset>",
  ""
].join("\\n");
fs.writeFileSync(path.join(dist,"sitemap.xml"),sitemap);
console.log("SEO pages generated:", indexable.map(([route]) => route).join(", "));
