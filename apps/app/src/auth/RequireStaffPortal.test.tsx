// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import React from "react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type MockUser = {
  publicMetadata?: Record<string, unknown> | null;
};

let mockUseUser: () => { isLoaded: boolean; user: MockUser | null };

vi.mock("@clerk/react", () => ({
  useUser: () => mockUseUser(),
  UserButton: () => <button data-testid="user-button">User</button>,
}));

import { RequireStaffPortal } from "./RequireStaffPortal";

function LocationProbe() {
  const location = useLocation();
  return <span data-testid="location">{location.pathname}</span>;
}

beforeEach(() => {
  mockUseUser = () => ({ isLoaded: false, user: null });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("RequireStaffPortal", () => {
  it("renders a loading state when Clerk is still hydrating", () => {
    mockUseUser = () => ({ isLoaded: false, user: null });
    render(
      <MemoryRouter initialEntries={["/sponsor"]}>
        <RequireStaffPortal portal="sponsor">
          <div data-testid="protected">Sponsor portal content</div>
        </RequireStaffPortal>
      </MemoryRouter>,
    );
    expect(screen.getByText(/loading session/i)).toBeTruthy();
    expect(screen.queryByTestId("protected")).toBeNull();
  });

  it("renders children when user has the requested portal", () => {
    mockUseUser = () => ({
      isLoaded: true,
      user: { publicMetadata: { corridorPortals: ["sponsor", "etc"] } },
    });
    render(
      <MemoryRouter initialEntries={["/sponsor"]}>
        <RequireStaffPortal portal="sponsor">
          <div data-testid="protected">Sponsor portal content</div>
        </RequireStaffPortal>
      </MemoryRouter>,
    );
    expect(screen.getByTestId("protected").textContent).toContain("Sponsor portal");
    expect(screen.getByTestId("user-button")).toBeTruthy();
  });

  it("redirects to the user's default portal when they lack the requested one", () => {
    mockUseUser = () => ({
      isLoaded: true,
      user: {
        publicMetadata: {
          corridorPortals: ["etc"],
          corridorDefaultPortal: "etc",
        },
      },
    });
    render(
      <MemoryRouter initialEntries={["/sponsor"]}>
        <Routes>
          <Route
            path="/sponsor"
            element={
              <RequireStaffPortal portal="sponsor">
                <div data-testid="protected">Should not render</div>
              </RequireStaffPortal>
            }
          />
          <Route path="/etc" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByTestId("location").textContent).toBe("/etc");
    expect(screen.queryByTestId("protected")).toBeNull();
  });

  it("renders NoAssignedPortal instead of looping when default portal == denied portal", () => {
    mockUseUser = () => ({
      isLoaded: true,
      user: {
        publicMetadata: {
          corridorPortals: ["etc"],
          corridorDefaultPortal: "sponsor",
        },
      },
    });
    render(
      <MemoryRouter initialEntries={["/sponsor"]}>
        <Routes>
          <Route
            path="/sponsor"
            element={
              <RequireStaffPortal portal="sponsor">
                <div>Should not render</div>
              </RequireStaffPortal>
            }
          />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText(/no corridor portal is assigned/i)).toBeTruthy();
  });

  it("renders NoAssignedPortal when user has no portals at all", () => {
    mockUseUser = () => ({ isLoaded: true, user: { publicMetadata: {} } });
    render(
      <MemoryRouter initialEntries={["/sponsor"]}>
        <RequireStaffPortal portal="sponsor">
          <div>Should not render</div>
        </RequireStaffPortal>
      </MemoryRouter>,
    );
    expect(screen.getByText(/no corridor portal is assigned/i)).toBeTruthy();
  });

  it("filters invalid corridorPortals values defensively", () => {
    mockUseUser = () => ({
      isLoaded: true,
      user: {
        publicMetadata: {
          corridorPortals: ["evil", "sponsor", "stillEvil"],
        },
      },
    });
    render(
      <MemoryRouter initialEntries={["/sponsor"]}>
        <RequireStaffPortal portal="sponsor">
          <div data-testid="protected">Sponsor portal content</div>
        </RequireStaffPortal>
      </MemoryRouter>,
    );
    // sponsor IS in the filtered list, so children render
    expect(screen.getByTestId("protected")).toBeTruthy();
  });
});
