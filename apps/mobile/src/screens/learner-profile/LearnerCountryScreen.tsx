import { useEffect, useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import arrowLeft from "@libitums/icons/lynx/arrow-left-03";
import arrowRight from "@libitums/icons/lynx/arrow-right";
import cross from "@libitums/icons/lynx/cross";
import search from "@libitums/icons/lynx/search";
import tick from "@libitums/icons/lynx/tick";
import { color } from "@libitums/design-tokens";
import { Button } from "@libitums/ui-lynx/button";
import { RoundButton } from "@libitums/ui-lynx/round-button";
import { TextField } from "@libitums/ui-lynx/text-field";

import { EntryStepBar } from "../../components/EntryStepBar";
import { announce } from "../../lib/accessibility";
import {
  countrySearchAnnouncement,
  learnerCountryAnnounceDelayMs,
  learnerCountrySectionsOf,
} from "../../lib/learner-profile-form";
import { playSound } from "../../lib/sound-effects";
import { useScreenBack } from "../../lib/use-back-handler";
import { useUiCopy } from "../../lib/ui-copy";
import type { LearnerCountryScreenProps } from "./learner-profile-screens.contract";

import "../login/login-screen.css";
import "../vocab-card/vocab-card-activity.css";
import "./learner-signup-screen.css";

const letterId = (letter: string) => `learner-country-letter-${letter}`;

// 글자 머리로 목록을 내립니다. `invoke`는 ID 선택자만 받습니다. 못 내려도 손으로 스크롤할 수 있습니다.
function jumpTo(letter: string): void {
  "background only";
  try {
    lynx
      .createSelectorQuery()
      .select(`#${letterId(letter)}`)
      .invoke({
        method: "scrollIntoView",
        params: { scrollIntoViewOptions: { block: "start", behavior: "none" } },
      })
      .exec();
  } catch {
    // 목록은 손으로 내려 찾을 수 있습니다.
  }
}

// 가입 직후 ② 나라입니다(캔버스 ProfCountry). 추천 줄 · 「기타」 없이 전체 목록(영어 이름 순, 첫 글자 머리)과
// 오른쪽 글자 막대, 검색 칸을 둡니다. 고른 나라는 아래 미리보기 문장에 곧바로 들어갑니다. 줄은 OptionSelector가
// 아니라 앱이 짓습니다 — 글자 묶음에 나라가 하나뿐인 경우(Q · Y …)가 있는데 OptionSelector는 두 줄부터 섭니다.
export function LearnerCountryScreen({
  learnerName,
  initialCountryCode,
  port,
  onContinue,
  onBack,
}: LearnerCountryScreenProps): ReactNode {
  const copy = useUiCopy().learnerProfile;
  const [query, setQuery] = useState("");
  const [countryCode, setCountryCode] = useState<string | null>(initialCountryCode);
  const [noticed, setNoticed] = useState(false);
  // 입력 칸이 비제어라 지우기는 키를 바꿔 다시 세웁니다.
  const [clears, setClears] = useState(0);
  useScreenBack(onBack);

  const rows = port.search(query);
  const sections = learnerCountrySectionsOf(rows);
  const country = countryCode === null ? null : port.byCode(countryCode);
  const preview = country === null ? null : port.previewOf(null, country);
  const searching = query.trim() !== "";
  const countLine = !searching
    ? copy.signup.country.allCountries(rows.length)
    : rows.length === 0
      ? copy.picker.noMatches
      : copy.picker.matches(rows.length);

  // 결과 수는 타자가 멈춘 뒤 한 번 읽습니다. 다시 치면 앞의 기다림을 버립니다.
  useEffect(() => {
    const message = countrySearchAnnouncement(query, rows.length, copy);
    if (message === null) return undefined;
    const timer = setTimeout(() => announce(message), learnerCountryAnnounceDelayMs);
    return () => clearTimeout(timer);
  }, [query, rows.length, copy]);

  function choose(code: string) {
    setCountryCode(code);
    setNoticed(false);
    const chosen = port.byCode(code);
    if (searching && chosen !== null) announce(copy.picker.countrySet(chosen.en));
  }

  function handleContinue() {
    playSound("button");
    if (country !== null) {
      onContinue({ name: learnerName, countryCode: country.code });
      return;
    }
    setNoticed(true);
    announce(copy.countryMissing);
  }

  return (
    <view className="learner-signup-screen" data-testid="learner-country-screen">
      <view className="learner-signup-header">
        <view data-testid="learner-country-screen-back">
          <RoundButton
            accessibilityLabel={copy.signup.back}
            icon={arrowLeft}
            variant="neutral"
            size="xl"
            bindtap={onBack}
          />
        </view>
        <EntryStepBar current={2} total={3} />
      </view>

      <view className="learner-profile-heading">
        <text
          className="learner-profile-title"
          data-testid="learner-country-screen-title"
          flatten={false}
          accessibility-element={true}
          accessibility-heading={true}
          accessibility-traits="header"
        >
          {copy.signup.country.title}
        </text>
        <text className="learner-profile-caption" flatten={false} accessibility-element={true}>
          {copy.signup.country.caption}
        </text>
      </view>

      <view data-testid="learner-country-screen-search">
        <TextField
          key={clears}
          accessibilityLabel={copy.picker.searchLabel}
          placeholder={copy.signup.country.searchPlaceholder(port.search("").length)}
          purpose="search"
          leading={{ kind: "icon", icon: search }}
          trailing={
            query === ""
              ? undefined
              : {
                  kind: "action",
                  icon: cross,
                  accessibilityLabel: copy.picker.clearSearch,
                  bindtap: () => {
                    setClears(clears + 1);
                    setQuery("");
                  },
                }
          }
          bindinput={setQuery}
        />
      </view>

      <text
        className="learner-signup-count"
        data-testid="learner-country-screen-count"
        flatten={false}
        accessibility-element={true}
      >
        {countLine}
      </text>

      <view className="learner-signup-list-row">
        <scroll-view
          className="learner-signup-list"
          data-testid="learner-country-screen-list"
          scroll-orientation="vertical"
          scroll-bar-enable={false}
        >
          <view className="learner-signup-list-content">
            {sections.map((section) => (
              <view key={section.letter} className="learner-signup-list-content">
                <text
                  id={letterId(section.letter)}
                  className="learner-signup-letter"
                  data-testid={`learner-country-screen-letter-${section.letter}`}
                  accessibility-element={false}
                >
                  {section.letter}
                </text>
                {section.countries.map((row) => {
                  const selected = row.code === countryCode;
                  return (
                    <view
                      key={row.code}
                      className={`learner-signup-row${selected ? " learner-signup-row-selected" : ""}`}
                      data-testid={`learner-country-screen-row-${row.code}`}
                      data-selected={selected ? "true" : "false"}
                      accessibility-element={true}
                      accessibility-traits="button"
                      accessibility-label={selected ? `${row.en}, selected` : row.en}
                      bindtap={() => choose(row.code)}
                    >
                      <text className="learner-signup-row-label" accessibility-element={false}>
                        {copy.picker.row(row.en, row.ko)}
                      </text>
                      {selected ? (
                        <svg
                          className="learner-signup-row-check"
                          content={tick}
                          current-color={color.brand.primary}
                        />
                      ) : null}
                    </view>
                  );
                })}
              </view>
            ))}
          </view>
        </scroll-view>

        {/* 글자 막대는 손가락으로 건너뛰는 지름길이라 보조기술에서는 숨깁니다 — 목록과 검색으로 같은 곳에 닿습니다. */}
        {searching ? null : (
          <view
            className="learner-signup-jump"
            data-testid="learner-country-screen-jump"
            accessibility-elements-hidden={true}
          >
            {sections.map((section) => (
              <view
                key={section.letter}
                className="learner-signup-jump-letter"
                data-testid={`learner-country-screen-jump-${section.letter}`}
                bindtap={() => jumpTo(section.letter)}
              >
                <text className="learner-signup-jump-label">{section.letter}</text>
              </view>
            ))}
          </view>
        )}
      </view>

      <view className="learner-signup-footer">
        {noticed && country === null ? (
          <text
            className="learner-profile-country-error"
            data-testid="learner-country-screen-error"
            flatten={false}
            accessibility-element={true}
          >
            {copy.countryMissing}
          </text>
        ) : null}
        {preview === null ? null : (
          <view
            className="learner-profile-preview"
            data-testid="learner-country-screen-preview"
            flatten={false}
            accessibility-element={true}
            accessibility-label={copy.preview.label(
              "yours",
              preview.lines.map((line) => line.ko).join(" "),
              preview.lines.map((line) => line.en).join(" "),
            )}
          >
            {preview.lines.flatMap((line) => [
              <text
                key={`ko-${line.ko}`}
                className="learner-profile-preview-text"
                accessibility-element={false}
              >
                {line.ko}
              </text>,
              <text
                key={`en-${line.ko}`}
                className="learner-profile-preview-translation"
                accessibility-element={false}
              >
                {line.en}
              </text>,
            ])}
          </view>
        )}
        <view data-testid="learner-country-screen-next">
          <Button
            label={copy.signup.continue}
            variant="brand"
            size="xl"
            width="fill"
            icon={arrowRight}
            iconPosition="trailing"
            bindtap={handleContinue}
          />
        </view>
      </view>
    </view>
  );
}
