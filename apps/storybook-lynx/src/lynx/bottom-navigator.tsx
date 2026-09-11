import { root, useEffect, useInitData, useState } from "@lynx-js/react";
import house from "@libitums/icons/lynx/house";
import map from "@libitums/icons/lynx/map";
import notification from "@libitums/icons/lynx/notification";
import settings from "@libitums/icons/lynx/settings";
import userGroup from "@libitums/icons/lynx/user-group";
import { BottomNavigator } from "@libitums/ui-lynx/bottom-navigator";
import type { BottomNavigatorItem } from "@libitums/ui-lynx/bottom-navigator";

import type { BottomNavigatorStoryArgs } from "../story-types";
import {
  dispatchBottomNavigatorStorySelect,
  normalizeBottomNavigatorStoryArgs,
} from "../bottom-navigator-story";
import "./story-canvas.css";

const icons = { house, map, "user-group": userGroup, settings, notification } as const;

function App() {
  const data = normalizeBottomNavigatorStoryArgs(
    useInitData() as Partial<BottomNavigatorStoryArgs>,
  );
  const [selectedId, setSelectedId] = useState(data.selectedId);

  useEffect(() => {
    setSelectedId(data.selectedId);
  }, [data.disabledLast, data.preset, data.selectedId]);

  const items: readonly BottomNavigatorItem[] = data.items.map((item) => {
    const base = {
      id: item.id,
      accessibilityLabel: item.accessibilityLabel,
      icon: icons[item.icon],
      ...(item.badge ? { badge: item.badge } : {}),
    };
    return item.availability === "disabled"
      ? { ...base, availability: "disabled", disabledReason: item.disabledReason }
      : { ...base, availability: "enabled" };
  });

  function emitSelect(id: string) {
    "background only";
    const didSelect = dispatchBottomNavigatorStorySelect(data, id, (envelope) => {
      NativeModules.bridge?.call?.(
        envelope.channel,
        { name: envelope.name, args: envelope.args },
        () => undefined,
      );
    });
    if (didSelect) setSelectedId(id);
  }

  return (
    <view className="story-canvas">
      <view className="story-card">
        <text className="story-eyebrow">LYNX COMPONENT</text>
        <text className="story-title">Bottom Navigator</text>
      </view>
      <BottomNavigator items={items} selectedId={selectedId} bindselect={emitSelect} />
    </view>
  );
}

root.render(<App />);
export default App;
