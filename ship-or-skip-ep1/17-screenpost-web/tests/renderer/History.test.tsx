// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { History } from "../../src/renderer/screens/History";
import type { Draft } from "../../src/domain/types";

beforeEach(() => {
  const d: Draft = {
    id: "h1", createdAt: "2026-06-14T10:00:00.000Z", status: "posted",
    context: "shipped the queue", why: "git",
    content: { twitter: ["posted tweet"], linkedin: "", threads: "", instagram: "", facebook: "" },
    publishResult: { perPlatform: { twitter: { ok: true } } },
  };
  (window as any).api = { listHistory: vi.fn(async () => [d]) };
});

describe("History", () => {
  it("renders posted drafts with status", async () => {
    render(<History />);
    await waitFor(() => expect(screen.getByText(/shipped the queue/)).toBeInTheDocument());
    expect(screen.getByText(/posted/)).toBeInTheDocument();
  });
});
