// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import React from "react";
import { Queue } from "../../src/renderer/screens/Queue";
import type { Draft } from "../../src/domain/types";

function draft(): Draft {
  return {
    id: "d1", createdAt: "2026-06-14T10:00:00.000Z", status: "pending",
    context: "built the scheduler", why: "transcript + screenshot",
    content: { twitter: ["hook tweet"], linkedin: "li post", threads: "th", instagram: "ig", facebook: "fb" },
  };
}

beforeEach(() => {
  (window as any).api = {
    listQueue: vi.fn(async () => [draft()]),
    approve: vi.fn(async () => ({ draft: draft(), result: { perPlatform: { twitter: { ok: true } } } })),
    reject: vi.fn(async () => undefined),
    regenerate: vi.fn(async () => draft()),
    generateNow: vi.fn(async () => draft()),
  };
});

describe("Queue", () => {
  it("renders pending drafts with their why line and X thread", async () => {
    render(<Queue />);
    await waitFor(() => expect(screen.getByText(/built the scheduler/)).toBeInTheDocument());
    expect(screen.getByText(/transcript \+ screenshot/)).toBeInTheDocument();
    expect(screen.getByDisplayValue("hook tweet")).toBeInTheDocument();
  });

  it("calls approve when Approve is clicked", async () => {
    render(<Queue />);
    await waitFor(() => screen.getByText(/built the scheduler/));
    fireEvent.click(screen.getByRole("button", { name: /approve/i }));
    await waitFor(() => expect((window as any).api.approve).toHaveBeenCalledWith("d1", expect.any(Object)));
  });
});
