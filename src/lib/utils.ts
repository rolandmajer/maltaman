import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Height of the sticky app header, so scrolled-to cards don't end up hidden underneath it. */
const STICKY_HEADER_OFFSET = 72;

/**
 * Scrolls a card's header back into view. Used by the "Zavrieť" buttons at the bottom of long
 * expanded cards: collapsing from the bottom would otherwise leave the technician somewhere far
 * down the page, with the thing they just closed off-screen above them.
 *
 * Deferred with a timer, not requestAnimationFrame: the position has to be measured after React
 * has committed the collapse, but rAF callbacks don't run in a non-painting tab, which would
 * leave the scroll silently skipped. Instant rather than smooth — the technician asked to close
 * this card, so put them back at it rather than animating across the height the collapse removed.
 */
export function scrollCardIntoView(element: HTMLElement | null) {
  if (!element) return;
  setTimeout(() => {
    const top = element.getBoundingClientRect().top + window.scrollY - STICKY_HEADER_OFFSET;
    window.scrollTo(0, Math.max(0, top));
  }, 0);
}
