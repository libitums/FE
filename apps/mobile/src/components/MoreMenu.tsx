import type { ReactNode } from "@lynx-js/react";

import { color } from "@libitums/design-tokens";
import arrowRight from "@libitums/icons/lynx/arrow-right";
import book from "@libitums/icons/lynx/book";
import settings from "@libitums/icons/lynx/settings";
import { useMotion } from "@libitums/ui-lynx/motion";

import type { MoreRoot } from "../app/nav-state";
import { LETTERS_MENU_GLYPH } from "../lib/letters/jamo";
import { playSound } from "../lib/sound-effects";
import { useUiCopy } from "../lib/ui-copy";
import { moreMenuTestIds as ids, type MoreMenuProps } from "./more-menu.contract";

import "./more-menu.css";

type Row = {
  readonly root: MoreRoot;
  readonly title: string;
  readonly description: string;
  readonly fresh: boolean;
  readonly tone: "brand" | "neutral";
};

// 더보기 메뉴 카드입니다(ADR-0169, 시안 MoreSheet). 스크림 · 바텀 시트가 아니라 바 바로 위(8)에 떠오르는 흰 카드이고, 줄은
// SettingsCell 모양(높이 72 · 패딩 16/20 · 제목 · 설명 · 화살표)에 아이콘 동그라미가 앞에 섭니다. ui-lynx SettingsCell은 앞 아이콘 ·
// 태그를 받지 못해 같은 토큰으로 여기서 짓습니다. 바깥을 누르면 닫히도록 투명한 막(`more-menu-catch`)이 카드 뒤 화면을 덮습니다.
export function MoreMenu({ words, due, onSelect, onClose }: MoreMenuProps): ReactNode {
  const copy = useUiCopy();
  const menu = copy.more.menu;
  const motion = useMotion();
  const rows: readonly Row[] = [
    {
      root: "letters",
      title: menu.letters,
      description: menu.lettersDescription,
      fresh: true,
      tone: "brand",
    },
    {
      root: "wordbook",
      title: menu.wordbook,
      description: menu.wordbookDescription(words, due),
      fresh: false,
      tone: "brand",
    },
    {
      root: "settings",
      title: menu.settings,
      description: menu.settingsDescription,
      fresh: false,
      tone: "neutral",
    },
  ];

  const handleClose = () => {
    "background only";
    onClose();
  };

  return (
    <>
      <view className="more-menu-catch" data-testid={ids.catch} bindtap={handleClose} />
      <view
        className={motion === "reduced" ? "more-menu more-menu-motion-reduced" : "more-menu"}
        data-testid={ids.menu}
        accessibility-role-description="menu"
      >
        {rows.map((row) => (
          <MoreMenuRow key={row.root} row={row} newBadge={copy.shell.tabNew} onSelect={onSelect} />
        ))}
      </view>
    </>
  );
}

function MoreMenuRow({
  row,
  newBadge,
  onSelect,
}: {
  readonly row: Row;
  readonly newBadge: { readonly badge: string; readonly spoken: string };
  readonly onSelect: (root: MoreRoot) => void;
}): ReactNode {
  const handleTap = () => {
    "background only";
    playSound("button");
    onSelect(row.root);
  };
  const label = [row.title, row.fresh ? newBadge.spoken : null, row.description]
    .filter((part): part is string => part !== null)
    .join(", ");
  return (
    <view
      className="more-menu-row"
      data-testid={ids.row(row.root)}
      accessibility-element={true}
      accessibility-label={label}
      accessibility-traits="button"
      flatten={false}
      bindtap={handleTap}
    >
      <view
        className={`more-menu-icon more-menu-icon-${row.tone}`}
        accessibility-elements-hidden={true}
      >
        {row.root === "letters" ? (
          <text className="more-menu-glyph">{LETTERS_MENU_GLYPH}</text>
        ) : (
          <svg
            className="more-menu-icon-svg"
            content={row.root === "wordbook" ? book : settings}
            current-color={row.tone === "brand" ? color.white : color.fg["neutral-muted"]}
          />
        )}
      </view>
      <view className="more-menu-content">
        <view className="more-menu-title-row">
          <text className="more-menu-title">{row.title}</text>
          {row.fresh ? (
            <view className="more-menu-tag">
              <text className="more-menu-tag-label">{newBadge.badge}</text>
            </view>
          ) : null}
        </view>
        <text className="more-menu-description">{row.description}</text>
      </view>
      <svg className="more-menu-arrow" content={arrowRight} current-color={color.gray["500"]} />
    </view>
  );
}
