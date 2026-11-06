import type { BuildWebManifest } from "./web-manifest.contract";

export const buildWebManifest: BuildWebManifest = ({
  siteUrl,
  name,
  description,
  language,
  themeColor,
  backgroundColor,
  icons,
}) => {
  if (icons.length === 0) throw new Error("buildWebManifest: icons must not be empty.");
  for (const icon of icons) {
    if (!icon.path.startsWith("/")) {
      throw new Error(`buildWebManifest: icon path "${icon.path}" must start with "/".`);
    }
  }
  return {
    name,
    short_name: name,
    description,
    lang: language,
    start_url: "/",
    display: "browser",
    theme_color: themeColor,
    background_color: backgroundColor,
    icons: icons.map((icon) => ({
      src: siteUrl + icon.path,
      sizes: icon.sizes,
      type: "image/png",
    })),
  };
};
