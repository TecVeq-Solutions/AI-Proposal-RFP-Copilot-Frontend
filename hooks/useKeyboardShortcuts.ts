import { useEffect, useRef } from "react";

export interface Shortcut {
  /** Key value, case-insensitive (e.g. "k", "n"). */
  key: string;
  /** Requires Ctrl (or Cmd on macOS). */
  mod?: boolean;
  handler: (event: KeyboardEvent) => void;
  /** Also fire while typing in an input/textarea/contenteditable. Default: only when mod is held. */
  allowInInputs?: boolean;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

/**
 * Registers global keyboard shortcuts. Modifier shortcuts (Ctrl/Cmd+K, Ctrl/Cmd+N) work everywhere;
 * bare-key shortcuts are ignored while typing. Escape-to-close is handled natively by the Radix
 * dialog/sheet/dropdown primitives, so it needs no shortcut here. Ctrl+S in the proposal editor
 * lives in useAutoSave (it flushes the pending save).
 */
export function useKeyboardShortcuts(shortcuts: Shortcut[]) {
  const ref = useRef(shortcuts);
  ref.current = shortcuts;

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const hasMod = e.ctrlKey || e.metaKey;
      for (const s of ref.current) {
        if (e.key.toLowerCase() !== s.key.toLowerCase()) continue;
        if (Boolean(s.mod) !== hasMod) continue;
        if (!s.mod && !s.allowInInputs && isTypingTarget(e.target)) continue;
        e.preventDefault();
        s.handler(e);
        return;
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
