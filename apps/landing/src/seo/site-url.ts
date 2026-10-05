import type { ResolveSiteUrl } from "./seo.contract";

const expected = "https://duru.example";

export const resolveSiteUrl: ResolveSiteUrl = ({ env, fallback }) => {
  const fromEnv = (env ?? "").trim();
  const useEnv = fromEnv !== "";
  const candidate = useEnv ? fromEnv : fallback.trim();
  if (candidate === "") return "";

  const source = useEnv ? "SITE_URL" : "fallbackSiteUrl";
  const reject = (): never => {
    throw new Error(
      `${source} must be an https origin without path, query or hash (for example ${expected}), but got "${candidate}".`,
    );
  };

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return reject();
  }
  if (
    url.protocol !== "https:" ||
    url.pathname !== "/" ||
    url.search !== "" ||
    url.hash !== "" ||
    url.username !== "" ||
    url.password !== ""
  ) {
    return reject();
  }
  return url.origin;
};
