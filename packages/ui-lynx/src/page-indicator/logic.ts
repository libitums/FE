import type { PageIndicatorModel, PageIndicatorProps } from "./contract";

export function getPageIndicatorModel(props: PageIndicatorProps): PageIndicatorModel {
  const pageCount = Number.isFinite(props.pageCount) ? Math.max(0, Math.trunc(props.pageCount)) : 0;

  if (pageCount === 0) {
    return {
      pageCount: 0,
      currentPage: 0,
      items: [],
      accessibilityLabel: null,
      shouldRender: false,
    };
  }

  const candidate = Number.isFinite(props.currentPage) ? Math.trunc(props.currentPage) : 1;
  const currentPage = Math.min(pageCount, Math.max(1, candidate));

  return {
    pageCount,
    currentPage,
    items: Array.from({ length: pageCount }, (_, index) => ({
      page: index + 1,
      isCurrent: index + 1 === currentPage,
    })),
    accessibilityLabel: `Scene ${currentPage} of ${pageCount}`,
    shouldRender: true,
  };
}
