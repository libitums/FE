import type { ReactNode } from "@lynx-js/react";
import arrowRight from "@libitums/icons/lynx/arrow-right";
import info02 from "@libitums/icons/lynx/info-02";
import { Button } from "@libitums/ui-lynx/button";
import type { ButtonSize, ButtonVariant } from "@libitums/ui-lynx/button";
import { RoundButton } from "@libitums/ui-lynx/round-button";

const variants: ButtonVariant[] = ["neutral", "brand", "outline", "subtle", "text"];
const sizes: ButtonSize[] = ["s", "m", "l", "xl"];

function Section(props: { title: string; children: ReactNode }) {
  return (
    <view className="playground-section">
      <text className="playground-section-title">{props.title}</text>
      {props.children}
    </view>
  );
}

export function ButtonCatalog() {
  return (
    <scroll-view scroll-bar-enable={false} className="playground" scroll-orientation="vertical">
      <Section title="Button · variant">
        {variants.map((variant) => (
          <view key={variant} className="playground-row">
            <Button label="계속하기" variant={variant} />
            <Button label="계속하기" variant={variant} disabled />
            <Button label="계속하기" variant={variant} loading />
          </view>
        ))}
      </Section>
      <Section title="Round Button · loading">
        <view className="playground-row">
          <RoundButton accessibilityLabel="정보" icon={info02} variant="neutral" />
          <RoundButton accessibilityLabel="정보" icon={info02} variant="neutral" loading />
          <RoundButton accessibilityLabel="정보" icon={info02} variant="brand" loading />
        </view>
      </Section>
      <Section title="Button · size">
        {sizes.map((size) => (
          <view key={size} className="playground-row">
            <Button label={`size ${size}`} variant="brand" size={size} />
          </view>
        ))}
      </Section>
      <Section title="Button · fill">
        <Button label="계속하기" variant="brand" size="xl" width="fill" />
      </Section>
      <Section title="Button · fill · icon · loading">
        <Button
          label="계속하기"
          variant="brand"
          size="xl"
          width="fill"
          icon={arrowRight}
          iconPosition="trailing"
        />
        <Button
          label="계속하기"
          variant="brand"
          size="xl"
          width="fill"
          icon={arrowRight}
          iconPosition="trailing"
          loading
        />
      </Section>
    </scroll-view>
  );
}
