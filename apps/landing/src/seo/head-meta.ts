import type { BuildHeadMeta } from "./seo.contract";

export const robotsIndexable = "index, follow, max-image-preview:large";
export const robotsNoindex = "noindex";

export const buildHeadMeta: BuildHeadMeta = ({ siteUrl, language, routes, imagePath }) => {
  const first = routes[0];
  if (first === undefined) throw new Error("buildHeadMeta: routes must not be empty.");
  const current = routes.find((route) => route.language === language);
  if (current === undefined) {
    throw new Error(`buildHeadMeta: language "${language}" is not in routes.`);
  }
  for (const path of [...routes.map((route) => route.path), imagePath]) {
    if (!path.startsWith("/")) {
      throw new Error(`buildHeadMeta: path "${path}" must start with "/".`);
    }
  }

  const ogLocale = current.locale;
  const ogLocaleAlternates = routes
    .filter((route) => route.language !== language)
    .map((route) => route.locale);

  if (siteUrl === "") return { ogLocale, ogLocaleAlternates, absolute: undefined };

  return {
    ogLocale,
    ogLocaleAlternates,
    absolute: {
      canonical: siteUrl + current.path,
      alternates: [
        ...routes.map((route) => ({ hreflang: route.language, href: siteUrl + route.path })),
        { hreflang: "x-default", href: siteUrl + first.path },
      ],
      imageUrl: siteUrl + imagePath,
    },
  };
};
