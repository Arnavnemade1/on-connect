import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return { name: "Onconnect", short_name: "Onconnect", description: "Adaptive medical education for children with cancer and their families", start_url: "/chat", display: "standalone", background_color: "#F6F8FB", theme_color: "#315F91",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }] };
}
