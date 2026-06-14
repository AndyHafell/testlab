// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import React from "react";
import { Settings } from "../../src/renderer/screens/Settings";
import { DEFAULT_SETTINGS } from "../../src/domain/types";

beforeEach(() => {
  (window as any).api = {
    getSettings: vi.fn(async () => ({ ...DEFAULT_SETTINGS })),
    setSettings: vi.fn(async (p: any) => ({ ...DEFAULT_SETTINGS, ...p })),
    secretStatus: vi.fn(async () => ({ ANTHROPIC_API_KEY: true })),
    setSecret: vi.fn(async () => undefined),
  };
});

describe("Settings", () => {
  it("loads current settings and shows secret presence", async () => {
    render(<Settings />);
    await waitFor(() => expect(screen.getByLabelText(/interval/i)).toHaveValue(60));
    expect(screen.getByText(/ANTHROPIC_API_KEY.*set/i)).toBeInTheDocument();
  });

  it("saves a changed interval", async () => {
    render(<Settings />);
    await waitFor(() => screen.getByLabelText(/interval/i));
    fireEvent.change(screen.getByLabelText(/interval/i), { target: { value: "30" } });
    fireEvent.click(screen.getByRole("button", { name: /save settings/i }));
    await waitFor(() => expect((window as any).api.setSettings).toHaveBeenCalledWith(expect.objectContaining({ intervalMinutes: 30 })));
  });
});
