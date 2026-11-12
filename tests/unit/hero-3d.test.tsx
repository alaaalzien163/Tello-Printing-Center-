import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Lazy3DContainer } from "@/components/3d/lazy-3d-container";
import { SceneFallback } from "@/components/3d/scene-fallback";

describe("hero 3D fallback", () => {
  it("renders the static poster before any scene is activated", () => {
    render(<Lazy3DContainer posterAlt="Hero printer preview" />);

    expect(screen.getByTestId("hero-3d-container")).toHaveAttribute(
      "data-scene-mode",
      "poster",
    );
    expect(screen.getByTestId("hero-scene-fallback")).toBeInTheDocument();
    expect(screen.getByAltText("Hero printer preview")).toBeInTheDocument();
    expect(document.querySelector("canvas")).toBeNull();
  });

  it("exposes a meaningful image description on its own", () => {
    render(<SceneFallback alt="Professional printing equipment" />);

    expect(screen.getByAltText("Professional printing equipment")).toBeInTheDocument();
  });
});
