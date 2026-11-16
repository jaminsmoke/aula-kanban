import { describe, expect, it } from "vitest";
import { metadata } from "./layout";
import { SITE_DESCRIPTION, SITE_NAME, SOCIAL_IMAGE, siteUrl } from "../lib/domain/site";

describe("metadatos sociales", () => {
  const openGraph = metadata.openGraph as {
    title: string;
    description: string;
    url: URL;
    siteName: string;
    locale: string;
    type: string;
    images: { url: string; width: number; height: number; alt: string }[];
  };
  const twitter = metadata.twitter as {
    card: string;
    title: string;
    description: string;
    images: { url: string; width: number; height: number; alt: string }[];
  };

  it("publica la base canónica y la tarjeta Open Graph", () => {
    expect(metadata.metadataBase?.toString()).toBe(siteUrl.toString());
    expect(openGraph.title).toBe(SITE_NAME);
    expect(openGraph.description).toBe(SITE_DESCRIPTION);
    expect(openGraph.url.toString()).toBe(siteUrl.toString());
    expect(openGraph.siteName).toBe(SITE_NAME);
    expect(openGraph.locale).toBe("es_ES");
    expect(openGraph.type).toBe("website");
    expect(openGraph.images[0]).toMatchObject({
      url: new URL(SOCIAL_IMAGE.path, siteUrl).toString(),
      width: 1200,
      height: 630,
      alt: SOCIAL_IMAGE.alt,
    });
  });

  it("publica una Twitter Card grande con la misma imagen", () => {
    expect(twitter.card).toBe("summary_large_image");
    expect(twitter.title).toBe(SITE_NAME);
    expect(twitter.description).toBe(SITE_DESCRIPTION);
    expect(twitter.images[0].url).toBe(new URL(SOCIAL_IMAGE.path, siteUrl).toString());
    expect(twitter.images[0].alt).toBe(SOCIAL_IMAGE.alt);
  });

  it("mantiene el título y la descripción de la página alineados", () => {
    expect(metadata.title).toBe(SITE_NAME);
    expect(metadata.description).toBe(SITE_DESCRIPTION);
  });

  it("enlaza el manifest de la aplicación instalable", () => {
    expect(metadata.manifest).toBe("/manifest.webmanifest");
  });
});
