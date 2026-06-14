// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import React from "react";
import { Clips } from "../../src/renderer/screens/Clips";
import type { ClipItem } from "../../src/domain/types";

function clip(): ClipItem {
  return { id: "c1", kind: "text", createdAt: "2026-06-14T10:00:00.000Z", sourceApp: "Code", textContent: "copied snippet", hash: "h1" };
}

beforeEach(() => {
  (window as any).api = {
    listClips: vi.fn(async () => [clip()]),
    postClip: vi.fn(async () => null),
  };
});

describe("Clips", () => {
  it("renders clips and posts one on click", async () => {
    render(<Clips />);
    await waitFor(() => expect(screen.getByText(/copied snippet/)).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /post/i }));
    await waitFor(() => expect((window as any).api.postClip).toHaveBeenCalledWith("c1"));
  });
});
