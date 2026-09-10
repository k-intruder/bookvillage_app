import type { MetadataRoute } from "next";
import { DEFAULT_BRANDING } from "@/lib/branding";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: DEFAULT_BRANDING.libraryName,
    short_name: DEFAULT_BRANDING.apartmentName,
    description: DEFAULT_BRANDING.description,
    start_url: "/",
    display: "standalone",
    background_color: "#FBF8F1",
    theme_color: "#553F1C",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
