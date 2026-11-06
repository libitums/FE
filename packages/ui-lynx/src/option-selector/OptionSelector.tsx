import type {} from "@lynx-js/react";
import cross from "@libitums/icons/lynx/cross";
import tick from "@libitums/icons/lynx/tick";

import { useMotion } from "../motion/MotionProvider";
import {
  type OptionSelectorContract,
  type OptionSelectorItemContract,
  type OptionSelectorProps,
  getOptionSelectorContract,
  isSameOptionSelection,
  nextOptionSelection,
} from "./option-selector.contract";

type OptionSelectorItemProps = {
  readonly contract: OptionSelectorItemContract;
  readonly languageTag?: string;
  readonly onSelect: (id: string) => void;
};

function OptionSelectorText({
  contract,
  languageTag,
}: {
  readonly contract: OptionSelectorItemContract;
  readonly languageTag?: string;
}) {
  const { id, label, meaning, romanization } = contract;
  const labelNode = (
    <text
      className="ui-lynx-option-selector-label"
      data-testid={`ui-lynx-option-selector-label-${id}`}
      data-lang={languageTag}
    >
      {label}
    </text>
  );
  if (meaning === null && romanization === null) return labelNode;
  // FE 확장: 로마자 · 뜻은 장식에 가까운 보조 줄이라 접근성 이름(항목 이름)에만 실립니다.
  // 로마자 줄은 뜻 줄의 색 규칙을 그대로 공유하고 기울임만 더합니다.
  // 줄이 있고 없음은 JSX 조건식이 아니라 갈래로 나눕니다 — 조건식은 줄마다 `wrapper`를 끼워 DOM 순서를 흐립니다.
  const romanNode = (
    <text
      className="ui-lynx-option-selector-meaning ui-lynx-option-selector-romanization"
      data-testid={`ui-lynx-option-selector-romanization-${id}`}
    >
      {romanization}
    </text>
  );
  const meaningNode = (
    <text
      className="ui-lynx-option-selector-meaning"
      data-testid={`ui-lynx-option-selector-meaning-${id}`}
    >
      {meaning}
    </text>
  );
  if (meaning === null) {
    return (
      <view className="ui-lynx-option-selector-text">
        {romanNode}
        {labelNode}
      </view>
    );
  }
  if (romanization === null) {
    return (
      <view className="ui-lynx-option-selector-text">
        {labelNode}
        {meaningNode}
      </view>
    );
  }
  return (
    <view className="ui-lynx-option-selector-text">
      {romanNode}
      {labelNode}
      {meaningNode}
    </view>
  );
}

function OptionSelectorItem({ contract, languageTag, onSelect }: OptionSelectorItemProps) {
  function handleTap() {
    "background only";
    onSelect(contract.id);
  }

  return (
    <view
      className={contract.className}
      data-testid={`ui-lynx-option-selector-item-${contract.id}`}
      data-id={contract.id}
      data-selected={contract.selected ? "true" : "false"}
      data-disabled={contract.disabled ? "true" : "false"}
      focusable={contract.interactive}
      accessibility-element={true}
      accessibility-label={contract.accessibilityLabel}
      accessibility-traits={contract.traits}
      bindtap={contract.interactive ? handleTap : undefined}
    >
      {/* 바깥 1px은 item 테두리, 안쪽 1px은 surface 테두리입니다. 두 겹이 늘 2px을 차지해 크기가 변하지 않습니다. */}
      <view className="ui-lynx-option-selector-surface" accessibility-elements-hidden={true}>
        {/* Indicator 자리를 양쪽에 대칭으로 확보해 Selected가 되어도 Label이 움직이지 않습니다. */}
        <view className="ui-lynx-option-selector-indicator-slot ui-lynx-option-selector-indicator-slot-leading" />
        {contract.icon === null ? (
          <OptionSelectorText contract={contract} languageTag={languageTag} />
        ) : (
          // FE 확장: 장식 그림 + Label을 한 묶음으로 가운데 둡니다.
          <view className="ui-lynx-option-selector-content">
            <svg
              className="ui-lynx-option-selector-icon"
              data-testid={`ui-lynx-option-selector-icon-${contract.id}`}
              content={contract.icon}
            />
            <OptionSelectorText contract={contract} languageTag={languageTag} />
          </view>
        )}
        <view className="ui-lynx-option-selector-indicator-slot">
          {contract.indicatorColor === null ? null : (
            <svg
              className="ui-lynx-option-selector-indicator"
              data-testid={`ui-lynx-option-selector-indicator-${contract.id}`}
              content={(contract.feedback === "incorrect" ? cross : tick).replace(
                /currentColor/g,
                contract.indicatorColor,
              )}
              current-color={contract.indicatorColor}
            />
          )}
        </view>
      </view>
    </view>
  );
}

function OptionSelectorRow({
  row,
  selector,
  onSelect,
}: {
  readonly row: readonly OptionSelectorItemContract[];
  readonly selector: OptionSelectorContract;
  readonly onSelect: (id: string) => void;
}) {
  return (
    <view className="ui-lynx-option-selector-row" data-testid="ui-lynx-option-selector-row">
      {row.map((item) => (
        <OptionSelectorItem
          key={item.id}
          contract={item}
          languageTag={selector.languageTag}
          onSelect={onSelect}
        />
      ))}
      {/* Grid의 마지막 행이 하나뿐이어도 열 너비를 반으로 유지합니다. */}
      {selector.layout === "grid" && row.length === 1 ? (
        <view className="ui-lynx-option-selector-cell-spacer" />
      ) : null}
    </view>
  );
}

export function OptionSelector(props: OptionSelectorProps) {
  const motion = useMotion();
  const selector = getOptionSelectorContract(props, motion);
  // standard에서는 data-motion 속성을 아예 넘기지 않습니다. undefined로 넘기면 테스트 렌더러가 "null" 문자열로 남깁니다.
  const motionProps = motion === "reduced" ? { "data-motion": "reduced" } : {};

  function handleSelect(id: string) {
    "background only";
    const item = selector.items.find((candidate) => candidate.id === id);
    if (!item || !item.interactive) return;
    const next = nextOptionSelection({
      options: props.options,
      selection: selector.selection,
      selectedIds: props.selectedIds,
      id,
    });
    if (!isSameOptionSelection(next, props.selectedIds)) props.onChange(next);
    if (selector.commit === "immediate") props.onCommit?.(id);
  }

  return (
    <view
      className={selector.className}
      data-testid="ui-lynx-option-selector"
      {...motionProps}
      data-variant={selector.variant}
      data-size={selector.size}
      data-selection={selector.selection}
      data-commit={selector.commit}
      data-layout={selector.layout}
      data-language={selector.contentLanguage}
      data-lang={selector.languageTag}
      data-committed={selector.committed ? "true" : "false"}
    >
      <view
        className={selector.listClassName}
        data-testid="ui-lynx-option-selector-list"
        accessibility-element={false}
        accessibility-label={selector.groupLabel}
      >
        {selector.rows.map((row) => (
          <OptionSelectorRow
            key={row.map((item) => item.id).join("|")}
            row={row}
            selector={selector}
            onSelect={handleSelect}
          />
        ))}
      </view>
    </view>
  );
}
