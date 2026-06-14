// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import React from "react";
import { Swipe } from "../../src/renderer/screens/Swipe";
import type { SwipeEntry } from "../../src/domain/types";

function entry(): SwipeEntry {
  return { id: "s1", date: "2026-03-31", tweet: "winning tweet", platform: "x", likes: 3800, comments: 134, retweets: 271, impressions: 188000, note: "anti-SaaS angle" };
}

beforeEach(() => {
  (window as any).api = {
    listSwipe: vi.fn(async () => [entry()]),
    addSwipe: vi.fn(async (e: Omit<SwipeEntry, "id">) => ({ id: "new", ...e })),
    removeSwipe: vi.fn(async () => undefined),
    updateSwipe: vi.fn(async () => undefined),
  };
});

describe("Swipe", () => {
  it("lists swipe entries with engagement", async () => {
    render(<Swipe />);
    await waitFor(() => expect(screen.getByText(/winning tweet/)).toBeInTheDocument());
    expect(screen.getByText(/3800/)).toBeInTheDocument();
  });

  it("adds an entry", async () => {
    render(<Swipe />);
    await waitFor(() => screen.getByText(/winning tweet/));
    fireEvent.change(screen.getByPlaceholderText(/tweet text/i), { target: { value: "new winner" } });
    fireEvent.click(screen.getByRole("button", { name: /add/i }));
    await waitFor(() => expect((window as any).api.addSwipe).toHaveBeenCalled());
  });

  it("saves an edited note via updateSwipe", async () => {
    render(<Swipe />);
    await waitFor(() => screen.getByText(/winning tweet/));
    fireEvent.change(screen.getByPlaceholderText(/edit note/i), { target: { value: "new note" } });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));
    await waitFor(() =>
      expect((window as any).api.updateSwipe).toHaveBeenCalledWith("s1", { note: "new note" }),
    );
  });
});
