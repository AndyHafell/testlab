// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { App } from "../../src/renderer/App";

beforeEach(() => {
  (window as any).appEvents = { on: vi.fn() };
  (window as any).api = {
    listQueue: vi.fn(async () => []),
    listHistory: vi.fn(async () => []),
    listSwipe: vi.fn(async () => []),
    listClips: vi.fn(async () => []),
    getSettings: vi.fn(async () => ({
      intervalMinutes: 60, dailyCap: 6,
      enabledSignals: { screenshot: true, transcript: true, gitFiles: true, clipboard: true },
      enabledPlatforms: { twitter: true, linkedin: true, threads: true, instagram: true, facebook: true },
      watchedFolders: [], persona: "p", blotatoAccountIds: {}, facebookPageId: "",
    })),
    secretStatus: vi.fn(async () => ({})),
    schedulerStatus: vi.fn(async () => ({ paused: false, minutesUntilNext: 42, postsToday: 1, dailyCap: 6 })),
  };
});

describe("App", () => {
  it("shows the Queue tab by default and can switch to Settings", async () => {
    render(<App />);
    expect(screen.getByRole("button", { name: /queue/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /settings/i }));
    await waitFor(() => expect(screen.getByLabelText(/interval/i)).toBeInTheDocument());
  });

  it("shows the scheduler status in the header", async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText(/next run in 42m/i)).toBeInTheDocument());
  });
});
