import type {} from "@lynx-js/react";
import tick from "@libitums/icons/lynx/tick";

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
      {/* 바깥 1px은 item 테두리, 안쪽 1px은 surface 테두리다. 두 겹이 늘 2px을 차지해 크기가 변하지 않는다. */}
      <view className="ui-lynx-option-selector-surface" accessibility-elements-hidden={true}>
        {/* Indicator 자리를 양쪽에 대칭으로 확보해 Selected가 되어도 Label이 움직이지 않는다. */}
        <view className="ui-lynx-option-selector-indicator-slot ui-lynx-option-selector-indicator-slot-leading" />
        {contract.icon === null ? (
          <text
            className="ui-lynx-option-selector-label"
            data-testid={`ui-lynx-option-selector-label-${contract.id}`}
            data-lang={languageTag}
          >
            {contract.label}
          </text>
        ) : (
          // FE 확장: 장식 그림 + Label을 한 묶음으로 가운데 둔다.
          <view className="ui-lynx-option-selector-content">
            <svg
              className="ui-lynx-option-selector-icon"
              data-testid={`ui-lynx-option-selector-icon-${contract.id}`}
              content={contract.icon}
            />
            <text
              className="ui-lynx-option-selector-label"
              data-testid={`ui-lynx-option-selector-label-${contract.id}`}
              data-lang={languageTag}
            >
              {contract.label}
            </text>
          </view>
        )}
        <view className="ui-lynx-option-selector-indicator-slot">
          {contract.indicatorColor === null ? null : (
            <svg
              className="ui-lynx-option-selector-indicator"
              data-testid={`ui-lynx-option-selector-indicator-${contract.id}`}
              content={tick.replace(/currentColor/g, contract.indicatorColor)}
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
      {/* Grid의 마지막 행이 하나뿐이어도 열 너비를 반으로 유지한다. */}
      {selector.layout === "grid" && row.length === 1 ? (
        <view className="ui-lynx-option-selector-cell-spacer" />
      ) : null}
    </view>
  );
}

export function OptionSelector(props: OptionSelectorProps) {
  const selector = getOptionSelectorContract(props);

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
