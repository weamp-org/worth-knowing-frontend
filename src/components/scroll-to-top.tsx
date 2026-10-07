"use client";

import { ArrowUpIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

/**
 * How far down the page has to be before the button appears.
 *
 * Past roughly one viewport of feed, where the header — and with it any
 * sense of where the top is — has scrolled out of reach.
 */
const SHOW_AFTER_PX = 600;

/**
 * Back to the top of the page.
 *
 * Mounted once in the root layout, so it serves every long surface: the
 * feed, browse results with accumulated pages, tag listings, profiles, and
 * collection contents. Renders nothing until the reader has scrolled far
 * enough for the trip back to be work — and returns nothing (rather than a
 * hidden control) when there is nowhere to go, so it never sits in the tab
 * order pointlessly.
 */
export function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      setIsVisible(window.scrollY > SHOW_AFTER_PX);
    }

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!isVisible) return null;

  function scrollToTop() {
    window.scrollTo({
      top: 0,
      // Motion-sensitive readers get the destination without the ride.
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  }

  return (
    <Button
      size="icon"
      onClick={scrollToTop}
      aria-label="Scroll back to top"
      className="fixed right-6 bottom-6 z-40 shadow-md"
    >
      <ArrowUpIcon aria-hidden="true" />
    </Button>
  );
}
