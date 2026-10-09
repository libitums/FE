import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { JSDOM } from "jsdom";

// ui 테스트 공용 렌더 헬퍼입니다. 환경은 node이고, Container가 낸 문자열을 JSDOM으로 파싱합니다.
// (.astro는 vitest의 jsdom 환경에서는 서버 컴포넌트로 변환되지 않습니다.)

type Component = Parameters<AstroContainer["renderToString"]>[0];

export interface Rendered {
  html: string;
  document: Document;
}

export async function render(
  component: Component,
  options: { props?: Record<string, unknown>; site?: string } = {},
): Promise<Rendered> {
  const container = await AstroContainer.create(
    options.site === undefined ? {} : { astroConfig: { site: options.site } },
  );
  const html = await container.renderToString(component, { props: options.props ?? {} });
  return { html, document: new JSDOM(html).window.document };
}

export const texts = (nodes: Iterable<Element>): string[] =>
  [...nodes].map((node) => node.textContent ?? "");

/** 제목 줄바꿈 태그를 뺀 글자(`a<br />b` → `ab`)입니다. */
export const plain = (html: string): string => html.replace(/<br\s*\/?>/g, "");

export const jsonLd = (document: Document): unknown[] =>
  [...document.querySelectorAll('script[type="application/ld+json"]')].map((node) =>
    JSON.parse(node.textContent ?? ""),
  );
