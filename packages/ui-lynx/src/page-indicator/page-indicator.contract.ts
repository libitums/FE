export const PAGE_INDICATOR_MAX_PAGE_COUNT = 100;

export type PageIndicatorProps = {
  pageCount: number;
  currentPage: number;
};

export type PageIndicatorItem = {
  page: number;
  isCurrent: boolean;
};

export type PageIndicatorModel = {
  pageCount: number;
  currentPage: number;
  items: PageIndicatorItem[];
  accessibilityLabel: string | null;
  shouldRender: boolean;
};

export function getPageIndicatorModel(props: PageIndicatorProps): PageIndicatorModel {
  const rawPageCount = Number.isFinite(props.pageCount)
    ? Math.max(0, Math.trunc(props.pageCount))
    : 0;
  const pageCount = Math.min(rawPageCount, PAGE_INDICATOR_MAX_PAGE_COUNT);

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
