import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  return [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/solo`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/lobby`, changeFrequency: "weekly", priority: 0.8 }
  ];
}
