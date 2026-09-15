import { fireEvent, render, screen } from "@lynx-js/react/testing-library";
import { color } from "@libitums/design-tokens";
import { describe, expect, test, vi } from "vitest";

import { Card } from "./index";

describe("Card UI", () => {
  test("Static Card는 header, body, footer를 읽기 순서대로 조합한다", () => {
    render(
      <Card padding="l">
        <Card.Content>
          <Card.Header title="오늘의 학습" overline="추천" trailing={<text>완료</text>} />
          <Card.Body>
            <Card.BodyText languageTag="ko-KR">새로운 표현을 연습해 보세요</Card.BodyText>
          </Card.Body>
          <Card.Footer primaryAction={<view data-testid="primary-action" />} />
        </Card.Content>
      </Card>,
    );

    const card = screen.getByTestId("ui-lynx-card");
    expect(card).toHaveClass("ui-lynx-card-static", "ui-lynx-card-l");
    expect(card).toHaveAttribute("accessibility-element", "false");
    expect(card).toHaveAttribute("focusable", "false");
    expect(screen.getByText("오늘의 학습")).toHaveAttribute("accessibility-traits", "header");
    expect(screen.getByTestId("ui-lynx-card-body-text")).toHaveAttribute("data-lang", "ko-KR");
    expect(screen.getByTestId("primary-action")).toBeInTheDocument();
    expect(screen.queryByTestId("ui-lynx-card-arrow")).not.toBeInTheDocument();
  });

  test("Interactive Card는 하나의 control로 노출하고 탭을 한 번 전달한다", () => {
    const onTap = vi.fn<() => void>();
    render(
      <Card
        interaction="interactive"
        accessibilityLabel="오늘의 학습"
        accessibilityDescription="새로운 표현 5개"
        accessibilityRole="link"
        bindtap={onTap}
      >
        <Card.Content>
          <Card.Header title="오늘의 학습" />
          <Card.Body>
            <Card.BodyText>새로운 표현 5개</Card.BodyText>
          </Card.Body>
        </Card.Content>
      </Card>,
    );

    const card = screen.getByTestId("ui-lynx-card");
    fireEvent.tap(card as unknown as Element, {});
    expect(onTap).toHaveBeenCalledTimes(1);
    expect(card).toHaveAttribute("accessibility-element", "true");
    expect(card).toHaveAttribute("accessibility-label", "오늘의 학습");
    expect(card).toHaveAttribute("accessibility-value", "새로운 표현 5개");
    expect(card).toHaveAttribute("accessibility-traits", "link");
    expect(card).toHaveAttribute("focusable", "true");
    expect(card.firstElementChild).toHaveAttribute("accessibility-elements-hidden", "true");
    const arrow = screen.getByTestId("ui-lynx-card-arrow");
    expect(arrow).toHaveAttribute("current-color", color.fg["neutral-subtle"]);
    expect(arrow.getAttribute("content")).not.toContain("currentColor");
  });

  test("Interactive Card는 nested trailing과 Footer action을 거부한다", () => {
    const interactiveProps = {
      interaction: "interactive" as const,
      accessibilityLabel: "학습",
      accessibilityRole: "button" as const,
      bindtap: () => undefined,
    };

    expect(() =>
      render(
        <Card {...interactiveProps}>
          <Card.Content>
            <Card.Header title="학습" trailing={<view />} />
          </Card.Content>
        </Card>,
      ),
    ).toThrow("Interactive Card must not contain a trailing action or indicator");

    expect(() =>
      render(
        <Card {...interactiveProps}>
          <Card.Content>
            <Card.Header title="학습" />
            <Card.Footer primaryAction={<view />} />
          </Card.Content>
        </Card>,
      ),
    ).toThrow("Interactive Card must not contain footer actions");
  });

  test("Media는 기본적으로 장식이고 이름이 있으면 image로 노출한다", () => {
    const decorative = render(
      <Card>
        <Card.Media>
          <view data-testid="decorative-media" />
        </Card.Media>
        <Card.Content>
          <Card.Header title="장식 이미지" />
        </Card.Content>
      </Card>,
    );
    expect(decorative.getByTestId("ui-lynx-card-media")).toHaveAttribute(
      "accessibility-elements-hidden",
      "true",
    );
    decorative.unmount();

    render(
      <Card>
        <Card.Media accessibilityLabel="서울의 카페 외관">
          <view />
        </Card.Media>
        <Card.Content>
          <Card.Header title="정보 이미지" />
        </Card.Content>
      </Card>,
    );
    const informative = screen.getByTestId("ui-lynx-card-media");
    expect(informative).toHaveAttribute("accessibility-element", "true");
    expect(informative).toHaveAttribute("accessibility-label", "서울의 카페 외관");
    expect(informative).toHaveAttribute("accessibility-traits", "image");
    expect(informative.firstElementChild).toHaveAttribute("accessibility-elements-hidden", "true");
  });

  test("compound slot은 Card 밖에서 사용하지 못한다", () => {
    expect(() => render(<Card.Body>본문</Card.Body>)).toThrow(
      "Card.Body must be rendered inside Card",
    );
  });
});
