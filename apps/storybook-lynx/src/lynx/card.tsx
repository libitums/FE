import { root, useInitData } from "@lynx-js/react";
import { Button } from "@libitums/ui-lynx/button";
import { Card } from "@libitums/ui-lynx/card";
import { StatusIndicator } from "@libitums/ui-lynx/status-indicator";

import { dispatchCardStoryTap, normalizeCardStoryArgs } from "../card-story";
import "./story-canvas.css";

function App() {
  const data = normalizeCardStoryArgs(useInitData());

  function emitTap() {
    "background only";
    dispatchCardStoryTap(data, (envelope) => {
      NativeModules.bridge?.call?.(
        envelope.channel,
        { name: envelope.name, args: envelope.args },
        () => undefined,
      );
    });
  }

  const media = data.showMedia ? (
    <Card.Media>
      <view className="story-card-media-demo">
        <text className="story-card-media-label">DURU</text>
      </view>
    </Card.Media>
  ) : null;

  return (
    <view className="story-canvas">
      <view className="story-card">
        <text className="story-eyebrow">LYNX COMPONENT</text>
        <text className="story-title">Card</text>
        {data.interaction === "interactive" ? (
          <Card
            interaction="interactive"
            padding={data.padding}
            direction={data.direction}
            accessibilityLabel={data.title}
            accessibilityDescription={data.body}
            accessibilityRole="link"
            bindtap={emitTap}
          >
            {media}
            <Card.Content>
              <Card.Header title={data.title} overline={data.overline || undefined} />
              <Card.Body>
                <Card.BodyText>{data.body}</Card.BodyText>
              </Card.Body>
            </Card.Content>
          </Card>
        ) : (
          <Card padding={data.padding} direction={data.direction}>
            {media}
            <Card.Content>
              <Card.Header
                title={data.title}
                overline={data.overline || undefined}
                trailing={<StatusIndicator status="completed" label="완료" />}
              />
              <Card.Body>
                <Card.BodyText>{data.body}</Card.BodyText>
              </Card.Body>
              <Card.Footer
                primaryAction={<Button label="학습 시작" variant="brand" size="m" width="fill" />}
                secondaryAction={<Button label="나중에" variant="subtle" size="m" width="fill" />}
              />
            </Card.Content>
          </Card>
        )}
      </view>
    </view>
  );
}

root.render(<App />);
export default App;
