import type { APIRoute } from "astro";
import { answerEngineCrawlers, buildRobotsTxt } from "../seo/robots-txt";

export const GET: APIRoute = ({ site }) =>
  new Response(buildRobotsTxt({ siteUrl: site?.origin ?? "", crawlers: answerEngineCrawlers }), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
