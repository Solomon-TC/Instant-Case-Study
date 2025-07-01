import { NextResponse } from "next/server";

export async function GET() {
  const baseUrl = "https://instantcasestudy.com";
  const staticPages = ["", "/success", "/login"];

  const urls = staticPages
    .map(
      (path) =>
        `  <url><loc>${baseUrl}${path}</loc><changefreq>weekly</changefreq></url>`,
    )
    .join("\n");

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
  <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${urls}
  </urlset>`;

  return new NextResponse(sitemap, {
    headers: {
      "Content-Type": "application/xml",
    },
  });
}
