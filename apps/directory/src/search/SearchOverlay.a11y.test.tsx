// @vitest-environment jsdom
import axe from "axe-core";
import { cleanup, render } from "@testing-library/react";
import { IntlProvider } from "react-intl";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import messages from "../messages/en.json";
import { SearchOverlay } from "./SearchOverlay";

const apiMock = vi.hoisted(() => ({
  searchPublic: vi.fn(),
}));

vi.mock("../api/client", () => ({
  ApiNetworkError: class ApiNetworkError extends Error {},
  ApiSchemaError: class ApiSchemaError extends Error {},
  publicApi: {
    searchPublic: apiMock.searchPublic,
  },
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const AXE_OPTIONS: axe.RunOptions = {
  rules: {
    region: { enabled: false },
    "color-contrast": { enabled: false },
  },
};

describe("SearchOverlay a11y", () => {
  it("open empty state has no axe violations", async () => {
    const { baseElement } = render(
      <IntlProvider locale="en" messages={messages}>
        <MemoryRouter>
          <SearchOverlay open onClose={vi.fn()} />
        </MemoryRouter>
      </IntlProvider>,
    );

    const results = await axe.run(baseElement, AXE_OPTIONS);
    expect(results.violations).toEqual([]);
  });
});
