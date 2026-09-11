import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@lynx-js/react/testing-library";
import { VisualNovelScene } from "./VisualNovelScene";
import type { VisualNovelBeat } from "./visual-novel.contract";

const beat: VisualNovelBeat = {
  index: 1,
  id: "find",
  backgroundId: "cafe-exterior-day",
  characterId: "jimin",
  characterPoseId: "jimin-smile",
  speakerName: "지민",
  dialogue: "2번 출구 오른쪽이라 금방 찾았죠?",
};

const arriveBeat: VisualNovelBeat = {
  index: 0,
  id: "arrive",
  backgroundId: "cafe-exterior-day",
  characterId: "jimin",
  characterPoseId: "jimin-neutral",
  speakerName: "지민",
  dialogue: "여기가 우리가 만나기로 한 카페예요.",
};

describe("VisualNovelScene UI", () => {
  it("renders exact scene, asset IDs, sources, and decorative image semantics", () => {
    render(
      <VisualNovelScene
        beat={beat}
        backgroundArtwork={{
          id: "cafe-exterior-day",
          kind: "background",
          source: "background.png",
        }}
        characterArtwork={{
          id: "jimin-smile",
          kind: "character",
          characterId: "jimin",
          source: "smile.png",
        }}
        replaying={false}
      />,
    );
    const scene = screen.getByTestId("visual-novel-scene-find");
    expect(scene).toBeInTheDocument();
    const background = screen.getByTestId("visual-novel-background-cafe-exterior-day");
    expect(background).toHaveAttribute("src", "background.png");
    // Asset identity is carried by the contract-stable test ID; avoid asserting
    // data-* attributes that Lynx's DOM adapter rewrites as unsupported props.
    expect(background).toHaveAttribute("accessibility-element", "false");
    const character = screen.getByTestId("visual-novel-character-jimin-smile");
    expect(character).toHaveAttribute("src", "smile.png");
    // The pose test ID plus the beat fixture's characterId proves the selected
    // character without relying on adapter-specific custom attributes.
    expect(character).toHaveAttribute("accessibility-element", "false");
  });

  it("keeps the scene usable when either image reports an error", () => {
    render(
      <VisualNovelScene
        beat={beat}
        backgroundArtwork={{
          id: "cafe-exterior-day",
          kind: "background",
          source: "bad-background.png",
        }}
        characterArtwork={{
          id: "jimin-smile",
          kind: "character",
          characterId: "jimin",
          source: "bad-character.png",
        }}
        replaying={false}
      />,
    );
    fireEvent(
      screen.getByTestId("visual-novel-background-cafe-exterior-day"),
      new window.Event("bindEvent:error"),
    );
    fireEvent(
      screen.getByTestId("visual-novel-character-jimin-smile"),
      new window.Event("bindEvent:error"),
    );
    expect(screen.getByTestId("visual-novel-scene-find")).toBeInTheDocument();
  });

  it("does not carry an image error into a replacement source", () => {
    const view = render(
      <VisualNovelScene
        beat={arriveBeat}
        backgroundArtwork={{
          id: "cafe-exterior-day",
          kind: "background",
          source: "background.png",
        }}
        characterArtwork={{
          id: "jimin-neutral",
          kind: "character",
          characterId: "jimin",
          source: "neutral.png",
        }}
        replaying={false}
      />,
    );
    fireEvent(
      screen.getByTestId("visual-novel-character-jimin-neutral"),
      new window.Event("bindEvent:error"),
    );

    view.rerender(
      <VisualNovelScene
        beat={beat}
        backgroundArtwork={{
          id: "cafe-exterior-day",
          kind: "background",
          source: "background.png",
        }}
        characterArtwork={{
          id: "jimin-smile",
          kind: "character",
          characterId: "jimin",
          source: "smile.png",
        }}
        replaying={false}
      />,
    );

    expect(screen.getByTestId("visual-novel-character-jimin-smile")).toBeInTheDocument();
  });

  it("requires a replacement source to report its own load", () => {
    const view = render(
      <VisualNovelScene
        beat={arriveBeat}
        backgroundArtwork={{
          id: "cafe-exterior-day",
          kind: "background",
          source: "background.png",
        }}
        characterArtwork={{
          id: "jimin-neutral",
          kind: "character",
          characterId: "jimin",
          source: "neutral.png",
        }}
        replaying={false}
      />,
    );
    fireEvent(
      screen.getByTestId("visual-novel-character-jimin-neutral"),
      new window.Event("bindEvent:load"),
    );
    expect(screen.getByTestId("visual-novel-character-jimin-neutral")).toHaveClass(
      "visual-novel-image-loaded",
    );

    view.rerender(
      <VisualNovelScene
        beat={beat}
        backgroundArtwork={{
          id: "cafe-exterior-day",
          kind: "background",
          source: "background.png",
        }}
        characterArtwork={{
          id: "jimin-smile",
          kind: "character",
          characterId: "jimin",
          source: "smile.png",
        }}
        replaying={false}
      />,
    );

    expect(screen.getByTestId("visual-novel-character-jimin-smile")).not.toHaveClass(
      "visual-novel-image-loaded",
    );
  });
});
