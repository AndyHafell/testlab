"use client";

import { useEffect } from "react";

// Mounts once and fades in any element carrying the `reveal` class as it scrolls
// into view. Keeps section components as server components — they just add the
// class. Falls back to showing everything if IntersectionObserver is missing.
export default function RevealOnScroll() {
  useEffect(() => {
    const els = Array.from(
      document.querySelectorAll<HTMLElement>(".reveal:not(.is-visible)"),
    );
    if (els.length === 0) return;

    const reveal = (el: Element) => el.classList.add("is-visible");

    if (!("IntersectionObserver" in window)) {
      els.forEach(reveal);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            reveal(entry.target);
            io.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.06 },
    );

    els.forEach((el) => io.observe(el));

    // Safety net: if the observer never fires for an element (unusual viewports,
    // background tabs, prerender/screenshot tools), reveal it anyway so content
    // is never left stuck hidden.
    const fallback = window.setTimeout(() => els.forEach(reveal), 2200);

    return () => {
      window.clearTimeout(fallback);
      io.disconnect();
    };
  }, []);

  return null;
}
