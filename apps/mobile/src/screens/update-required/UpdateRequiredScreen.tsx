import { useRef, useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { Button } from "@libitums/ui-lynx/button";

import { announce } from "../../lib/accessibility";
import type { AppUpdateStoreOutcome } from "../../lib/app-update.contract";
import { useUiCopy } from "../../lib/ui-copy";
import type { UpdateRequiredScreenProps, UpdateRequiredState } from "./update-required.contract";

import "./update-required-screen.css";

const idle: UpdateRequiredState = { kind: "idle", failure: null };

/**
 * 강제 업데이트 화면입니다(ADR-0086). 제목 · 본문 · `Update` 버튼 하나이고 나가는 수단이 없습니다 — 스토어에서
 * 업데이트한 뒤 다시 켜는 것이 유일한 길입니다. 버튼은 호스트가 응답할 때까지 로딩이고, 스토어를 못 열면
 * 버튼 위에 실패 문구가 서며 한 번 낭독합니다. 다시 누르면 문구를 지우고 다시 시도합니다.
 */
export function UpdateRequiredScreen({ onUpdate }: UpdateRequiredScreenProps): ReactNode {
  const copy = useUiCopy().appUpdate;
  const [state, setState] = useState<UpdateRequiredState>(idle);
  // 응답 전 다시 누름을 막습니다 — `Button`도 로딩이면 탭을 받지 않지만, 상태가 그려지기 전의 틈을 ref가 막습니다.
  const openingRef = useRef(false);

  const update = () => {
    if (openingRef.current) return;
    openingRef.current = true;
    setState({ kind: "opening" });
    let outcome: Promise<AppUpdateStoreOutcome>;
    try {
      outcome = onUpdate();
    } catch {
      outcome = Promise.resolve("unavailable");
    }
    void outcome
      .then(
        (result) => result,
        (): AppUpdateStoreOutcome => "unavailable",
      )
      .then((result) => {
        openingRef.current = false;
        if (result === "opened") {
          setState(idle);
          return;
        }
        setState({ kind: "idle", failure: "store" });
        announce(copy.failure);
      });
  };

  return (
    <view className="update-required-screen" data-testid="update-required-screen">
      {/* 내용은 스크롤 상자에 둔다 — 큰 글꼴에서 본문이 잘리지 않게(WCAG 1.4.4 · 규약 「화면 골격」). 버튼은 아래 고정.
          `scroll-orientation`은 적는다(초기값이 가로). 직계 자식은 상자 하나다(ADR-0022 D4). */}
      <scroll-view
        className="update-required-screen-body"
        data-testid="update-required-screen-body"
        scroll-orientation="vertical"
        scroll-bar-enable={false}
      >
        <view className="update-required-screen-content">
          <text
            className="update-required-screen-title"
            data-testid="update-required-screen-title"
            flatten={false}
            accessibility-element={true}
            accessibility-traits="header"
            accessibility-heading={true}
          >
            {copy.title}
          </text>
          <text
            className="update-required-screen-description"
            data-testid="update-required-screen-description"
            flatten={false}
            accessibility-element={true}
          >
            {copy.description}
          </text>
        </view>
      </scroll-view>
      <view className="update-required-screen-footer">
        {state.kind === "idle" && state.failure !== null ? (
          <text
            className="update-required-screen-failure"
            data-testid="update-required-screen-failure"
            flatten={false}
            accessibility-element={true}
          >
            {copy.failure}
          </text>
        ) : null}
        <view data-testid="update-required-screen-update">
          <Button
            label={copy.update}
            variant="brand"
            size="xl"
            width="fill"
            loading={state.kind === "opening"}
            bindtap={update}
          />
        </view>
      </view>
    </view>
  );
}
