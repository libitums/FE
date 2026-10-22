import { expect, test } from "vitest";
import { render, screen } from "@lynx-js/react/testing-library";

import { TextRoles } from "./TextRoles";

// `ui` 계층: 글 역할(로마자 · 구분선 · 뜻)의 클래스 · testid · 낭독 속성만 봅니다. 값(기울임 · 색)은 CSS 몫입니다.

test("TR1. Romanization(m)은 text-role-romanization 클래스와 조각 수만큼 inline text를 그린다", () => {
  render(
    <TextRoles.Romanization
      testId="roman"
      size="m"
      segments={[
        { text: "annyeonghaseyo! ", emphasis: "answer" },
        { text: "hangugeun cheoeumiseyo?", emphasis: "none" },
      ]}
    />,
  );

  const roman = screen.getByTestId("roman");
  expect(roman).toHaveClass("text-role-romanization");
  expect(roman).not.toHaveClass("text-role-romanization-s");
  expect(roman).toHaveTextContent("annyeonghaseyo! hangugeun cheoeumiseyo?");
  const pieces = roman.querySelectorAll("text");
  expect(pieces).toHaveLength(2);
  expect(pieces[0]).toHaveClass("text-role-romanization-answer");
  expect(pieces[1]).not.toHaveClass("text-role-romanization-answer");
});

test("TR1. Romanization(s)는 -s 클래스를 더하고 강조 없는 한 조각은 answer 클래스가 없다", () => {
  render(
    <TextRoles.Romanization
      testId="roman"
      size="s"
      segments={[{ text: "annyeonghaseyo!", emphasis: "none" }]}
    />,
  );

  const roman = screen.getByTestId("roman");
  expect(roman).toHaveClass("text-role-romanization");
  expect(roman).toHaveClass("text-role-romanization-s");
  expect(roman.querySelectorAll("text")).toHaveLength(1);
  expect(roman.innerHTML).not.toContain("text-role-romanization-answer");
});

test("TR2. Divider는 text-role-divider이고 접근성 정지점이 아니다(가림 속성 없음)", () => {
  render(<TextRoles.Divider testId="divider" />);

  const divider = screen.getByTestId("divider");
  expect(divider).toHaveClass("text-role-divider");
  expect(divider).not.toHaveAttribute("accessibility-element");
  expect(divider).not.toHaveAttribute("accessibility-label");
  expect(divider).not.toHaveAttribute("accessibility-elements-hidden");
});

test("TR3. Meaning은 m · s 클래스로 글을 그린다", () => {
  const first = render(
    <TextRoles.Meaning testId="meaning" size="m" text="Your Korean is so good!" />,
  );
  const medium = screen.getByTestId("meaning");
  expect(medium).toHaveClass("text-role-meaning");
  expect(medium).not.toHaveClass("text-role-meaning-s");
  expect(medium).toHaveTextContent("Your Korean is so good!");
  first.unmount();

  render(<TextRoles.Meaning testId="meaning" size="s" text="Hi" />);
  const small = screen.getByTestId("meaning");
  expect(small).toHaveClass("text-role-meaning");
  expect(small).toHaveClass("text-role-meaning-s");
});

test("TR4. Romanization의 accessibilityLabel을 주면 그 이름이고 안 주면 Pronunciation 접두를 붙인 로마자가 이름이다", () => {
  const first = render(
    <TextRoles.Romanization
      testId="roman"
      size="m"
      accessibilityLabel="Say: annyeonghaseyo! hangugeun cheoeumiseyo?"
      segments={[
        { text: "annyeonghaseyo! ", emphasis: "answer" },
        { text: "hangugeun cheoeumiseyo?", emphasis: "none" },
      ]}
    />,
  );
  expect(screen.getByTestId("roman")).toHaveAttribute(
    "accessibility-label",
    "Say: annyeonghaseyo! hangugeun cheoeumiseyo?",
  );
  first.unmount();

  render(
    <TextRoles.Romanization
      testId="roman"
      size="m"
      segments={[{ text: "annyeonghaseyo!", emphasis: "none" }]}
    />,
  );
  const roman = screen.getByTestId("roman");
  expect(roman).toHaveAttribute("accessibility-element", "true");
  expect(roman).toHaveAttribute("accessibility-label", "Pronunciation: annyeonghaseyo!");
  expect(roman).toHaveTextContent("annyeonghaseyo!");
});
