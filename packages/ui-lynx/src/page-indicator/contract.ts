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
