import { root, useInitData, useState } from "@lynx-js/react";
import { MotionProvider } from "@libitums/ui-lynx/motion";
import { SettingsCell, SettingsGroup } from "@libitums/ui-lynx/settings-cell";

import type { SettingsCellStoryArgs } from "../settings-cell-story";
import { normalizeSettingsCellStoryArgs } from "../settings-cell-story";
import "./story-canvas.css";
import "./settings-cell-story.css";

function App() {
  const args = normalizeSettingsCellStoryArgs(useInitData() as Partial<SettingsCellStoryArgs>);
  const [checked, setChecked] = useState(args.checked);
  const [selected, setSelected] = useState("");
  const avatar = args.leading === "avatar" ? { name: "김말랑" } : undefined;
  const description = args.description || undefined;
  const value = args.value || undefined;

  return (
    <MotionProvider motion={args.motion}>
      <view className="story-canvas">
        <view className="story-card settings-cell-story-card">
          <text className="story-eyebrow">LYNX COMPONENT</text>
          <text className="story-title">Settings Cell</text>
          {args.variant === "group" ? (
            <SettingsGroup
              accessibilityLabel="학습 설정"
              items={[
                {
                  id: "profile",
                  trailing: "navigation",
                  title: "프로필",
                  description: "계정 정보를 확인합니다",
                  value: "김말랑",
                  avatar,
                  onNavigate: () => setSelected("프로필"),
                },
                {
                  id: "autoplay",
                  trailing: "toggle",
                  title: "자동 재생",
                  description: "다음 학습을 자동으로 시작합니다",
                  avatar,
                  checked,
                  onChange: setChecked,
                },
                {
                  id: "notifications",
                  trailing: "navigation",
                  title: "알림 설정",
                  avatar,
                  disabled: true,
                  onNavigate: () => setSelected("알림 설정"),
                },
              ]}
            />
          ) : args.variant === "toggle" ? (
            <SettingsCell
              trailing="toggle"
              title={args.title}
              description={description}
              avatar={avatar}
              checked={checked}
              disabled={args.disabled}
              focused={args.focused}
              onChange={setChecked}
            />
          ) : (
            <SettingsCell
              trailing="navigation"
              title={args.title}
              description={description}
              avatar={avatar}
              value={value}
              disabled={args.disabled}
              focused={args.focused}
              onNavigate={() => setSelected(args.title)}
            />
          )}
          <text className="settings-cell-story-feedback">
            {selected
              ? `${selected} 선택됨`
              : args.variant === "toggle" || args.variant === "group"
                ? `자동 재생: ${checked ? "켜짐" : "꺼짐"}`
                : "행을 눌러 보세요"}
          </text>
        </view>
      </view>
    </MotionProvider>
  );
}

root.render(<App />);
export default App;
