// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { Button, ButtonLink, buttonClasses } from "./Button";

afterEach(cleanup);

describe("Button", () => {
  it("renders a <button type='button'> by default with the primary variant", () => {
    const { container } = render(<Button>Go</Button>);
    const btn = container.querySelector("button");
    expect(btn).not.toBeNull();
    expect(btn?.getAttribute("type")).toBe("button");
    expect(btn?.className).toContain("pill");
    expect(btn?.className).toContain("pill-primary");
  });

  it("maps the 'accent' variant to .pill-primary (alias — see Button.tsx docstring)", () => {
    const { container } = render(<Button variant="accent">Brand CTA</Button>);
    const btn = container.querySelector("button");
    expect(btn?.className).toContain("pill-primary");
    expect(btn?.className).not.toContain("pill-accent");
  });

  it("emits size + rounded modifier classes only when set", () => {
    const { container } = render(
      <Button size="sm" rounded>
        Small
      </Button>,
    );
    const btn = container.querySelector("button");
    expect(btn?.className).toContain("pill-sm");
    expect(btn?.className).toContain("pill-rounded");
  });

  it("renders outline and soft variants with their respective classes", () => {
    const outline = render(<Button variant="outline">Secondary</Button>);
    expect(outline.container.querySelector("button")?.className).toContain("pill-outline");
    cleanup();

    const soft = render(<Button variant="soft">Tertiary</Button>);
    expect(soft.container.querySelector("button")?.className).toContain("pill-soft");
  });
});

describe("ButtonLink", () => {
  it("renders an <a> with the same pill class system as Button", () => {
    const { container } = render(<ButtonLink href="/foo">Open</ButtonLink>);
    const a = container.querySelector("a");
    expect(a).not.toBeNull();
    expect(a?.getAttribute("href")).toBe("/foo");
    expect(a?.className).toContain("pill");
    expect(a?.className).toContain("pill-primary");
  });
});

describe("buttonClasses", () => {
  it("returns the same class string emitted by <Button>, for use on non-button elements", () => {
    expect(buttonClasses()).toContain("pill-primary");
    expect(buttonClasses({ variant: "outline", size: "lg" })).toContain("pill-outline");
    expect(buttonClasses({ variant: "outline", size: "lg" })).toContain("pill-lg");
    expect(buttonClasses({ variant: "accent" })).toContain("pill-primary");
  });
});
