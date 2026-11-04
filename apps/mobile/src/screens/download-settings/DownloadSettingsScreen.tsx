import { useEffect, useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import arrowLeft from "@libitums/icons/lynx/arrow-left-03";
import { Button } from "@libitums/ui-lynx/button";
import { Dialog } from "@libitums/ui-lynx/dialog";
import { OptionSelector } from "@libitums/ui-lynx/option-selector";
import { RoundButton } from "@libitums/ui-lynx/round-button";

import { mobileDataPolicies } from "../../lib/download-policy";
import type { MobileDataPolicy } from "../../lib/download-policy";
import { useUiCopy } from "../../lib/ui-copy";
import { useScreenBack } from "../../lib/use-back-handler";
import { formatDownloadedSize } from "./download-settings";
import type { DownloadSettingsScreenProps } from "./download-settings.contract";

import "./download-settings-screen.css";

/**
 * 설정 › 다운로드(ADR-0095 D8, 시안 4) — 모바일 데이터로 받기(묻기 · 항상 · Wi-Fi만), 오프라인용으로 모두 받기, 받은
 * 크기. 시안의 「끝낸 편 지우기」는 두지 않습니다(D8). 고르는 즉시 저장은 결선이 합니다.
 */
export function DownloadSettingsScreen({
  loadPolicy,
  savePolicy,
  isOnMobileData,
  loadDownloadedBytes,
  onDownloadAll,
  onBack,
}: DownloadSettingsScreenProps): ReactNode {
  useScreenBack(onBack);
  const copy = useUiCopy();
  const text = copy.settings.downloads;
  const [policy, setPolicy] = useState<MobileDataPolicy>("ask");
  const [downloadedBytes, setDownloadedBytes] = useState<number | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [started, setStarted] = useState(false);
  // 저장소 읽기는 효과 안에서 — 그리기 중에는 저장소가 없을 수 있습니다(메인 스레드). 화면을 열 때 한 번만 읽습니다:
  // 결선은 렌더마다 새 함수를 넘기고, 받은 크기 읽기는 목록 · 표시를 모두 파싱합니다.
  useEffect(() => {
    setPolicy(loadPolicy());
    setDownloadedBytes(loadDownloadedBytes());
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startDownloadAll = () => {
    setConfirming(false);
    setStarted(true);
    onDownloadAll();
  };

  return (
    <view className="download-settings-screen" data-testid="download-settings-screen">
      <view className="download-settings-header">
        <RoundButton
          accessibilityLabel={copy.common.back}
          icon={arrowLeft}
          variant="neutral"
          size="xl"
          bindtap={onBack}
        />
      </view>
      <scroll-view
        className="download-settings-scroll"
        scroll-orientation="vertical"
        scroll-bar-enable={false}
      >
        <view className="download-settings-content">
          <view className="download-settings-heading">
            <text
              className="download-settings-title"
              data-testid="download-settings-title"
              accessibility-traits="header"
            >
              {text.title}
            </text>
            <text className="download-settings-caption">{text.caption}</text>
          </view>

          <text className="download-settings-section" accessibility-traits="header">
            {text.mobileDataHeading}
          </text>
          <OptionSelector
            groupLabel={text.mobileDataHeading}
            options={mobileDataPolicies.map((id) => ({ id, label: text.policy[id] }))}
            selectedIds={[policy]}
            variant="outlined"
            size="m"
            selection="single"
            commit="deferred"
            onChange={(ids) => {
              const next = mobileDataPolicies.find((id) => id === ids[0]);
              if (next === undefined) return;
              setPolicy(next);
              savePolicy(next);
            }}
          />

          <text className="download-settings-section" accessibility-traits="header">
            {text.offlineHeading}
          </text>
          <view className="download-settings-offline">
            <text className="download-settings-caption">{text.downloadAllCaption}</text>
            <view data-testid="download-settings-download-all">
              <Button
                label={text.downloadAll}
                variant="neutral"
                size="l"
                width="fill"
                bindtap={() => (isOnMobileData() ? setConfirming(true) : startDownloadAll())}
              />
            </view>
            {started ? (
              <text
                className="download-settings-note"
                data-testid="download-settings-download-all-started"
              >
                {text.downloadAllStarted}
              </text>
            ) : null}
            {downloadedBytes === null ? null : (
              <text className="download-settings-note" data-testid="download-settings-downloaded">
                {text.downloaded(formatDownloadedSize(downloadedBytes))}
              </text>
            )}
          </view>
        </view>
      </scroll-view>
      {confirming ? (
        <view data-testid="download-settings-confirm">
          <Dialog
            title={text.confirm.title}
            description={text.confirm.description}
            actions={[
              { id: "download", label: text.confirm.download },
              { id: "cancel", label: text.confirm.cancel },
            ]}
            bindaction={(id) => (id === "download" ? startDownloadAll() : setConfirming(false))}
          />
        </view>
      ) : null}
    </view>
  );
}
