import { type RefObject, useLayoutEffect } from "react";

type Options = {
  maxHeight?: number;
};

/**
 * Auto-resize a textarea to fit content, up to a max height.
 * Keeps UX modern (no big empty area) and avoids manual dragging.
 */
export function useAutosizeTextarea(
  ref: RefObject<HTMLTextAreaElement | null>,
  value: string,
  options: Options = {}
) {
  const { maxHeight } = options;

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Reset height so scrollHeight is accurate for shrinking as well.
    el.style.height = "0px";
    const next = el.scrollHeight;

    if (typeof maxHeight === "number" && maxHeight > 0) {
      el.style.height = `${Math.min(next, maxHeight)}px`;
      el.style.overflowY = next > maxHeight ? "auto" : "hidden";
    } else {
      el.style.height = `${next}px`;
      el.style.overflowY = "hidden";
    }
  }, [ref, value, maxHeight]);
}


