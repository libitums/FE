import type { APIRoute } from "astro";
import { deployEnvironment } from "../seo/deploy-env";
import { answerEngineCrawlers, buildRobotsTxt } from "../seo/robots-txt";

export const GET: APIRoute = ({ site }) => {
  // 프리뷰 배포는 어떤 수집기에게도 열지 않습니다.
  const body = deployEnvironment(process.env).indexable
    ? buildRobotsTxt({ siteUrl: site?.origin ?? "", crawlers: answerEngineCrawlers })
    : "User-agent: *\nDisallow: /\n";
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
