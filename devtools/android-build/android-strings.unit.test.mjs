// `unit` 계층(AL1 ~ AL2, ADR-0185 언어 검증): Android 네이티브 문구(알림 채널 이름 · 설명)가 화면 언어 여덟의 기기 언어마다 있다.
// 시스템 알림 설정 화면은 앱 UI 언어가 아니라 기기 언어를 따르므로 `values-<언어>`가 있어야 합니다. 대만 중국어는 `values-zh-rTW`(zh-TW)와
// `values-b+zh+Hant`(zh-HK · zh-MO 등 번체 기기)에 같은 문구를 둡니다. 간체(zh-CN)는 영어 기본값입니다.

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const res = (dir) =>
  fileURLToPath(new URL(`../../apps/android/app/src/main/res/${dir}/strings.xml`, import.meta.url));
const KEYS = ["notification_channel_name", "notification_channel_description"];
const DIRS = [
  "values-es",
  "values-in",
  "values-ja",
  "values-vi",
  "values-th",
  "values-my",
  "values-zh-rTW",
  "values-b+zh+Hant",
];

function valueOf(text, key) {
  return text.match(new RegExp(`<string name="${key}">([^<]*)</string>`))?.[1] ?? null;
}

test("AL1. 영어 밖 일곱 언어(대만 중국어는 두 폴더) 모두 알림 채널 문구가 있고 영어를 베끼지 않았다", () => {
  const base = readFileSync(res("values"), "utf8");
  for (const dir of DIRS) {
    assert.ok(existsSync(res(dir)), `${dir}/strings.xml이 없습니다`);
    const text = readFileSync(res(dir), "utf8");
    for (const key of KEYS) {
      const value = valueOf(text, key);
      assert.ok(value, `${dir}: ${key}가 없습니다`);
      assert.notEqual(value, valueOf(base, key), `${dir}: ${key}가 영어 그대로입니다`);
    }
  }
});

test("AL2. 대만 중국어 두 폴더는 같은 번체 문구다", () => {
  const tw = readFileSync(res("values-zh-rTW"), "utf8");
  const hant = readFileSync(res("values-b+zh+Hant"), "utf8");
  for (const key of KEYS) {
    assert.equal(valueOf(hant, key), valueOf(tw, key), key);
    assert.match(valueOf(tw, key) ?? "", /[一-鿿]/u, key);
  }
});
