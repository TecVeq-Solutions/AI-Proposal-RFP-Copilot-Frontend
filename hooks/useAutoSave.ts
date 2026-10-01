import { useCallback, useEffect, useRef, useState } from "react";

export type AutoSaveState = "idle" | "pending" | "saving" | "saved" | "error";

/**
 * Day 40: debounced auto-save. Call `trigger(value)` on every content change;
 * it debounces 2s, then calls `save(value)`. `flush()` saves immediately
 * (Ctrl+S, section switch, beforeunload).
 */
export function useAutoSave<T>(save: (value: T) => Promise<void>, debounceMs = 2000) {
  const [state, setState] = useState<AutoSaveState>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestValue = useRef<T | null>(null);
  const savingRef = useRef(false);

  const doSave = useCallback(
    async (value: T) => {
      savingRef.current = true;
      setState("saving");
      try {
        await save(value);
        setState("saved");
        setTimeout(() => setState((s) => (s === "saved" ? "idle" : s)), 3000);
      } catch {
        setState("error");
      } finally {
        savingRef.current = false;
      }
    },
    [save]
  );

  const trigger = useCallback(
    (value: T) => {
      latestValue.current = value;
      setState("pending");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        if (latestValue.current !== null) void doSave(latestValue.current);
      }, debounceMs);
    },
    [doSave, debounceMs]
  );

  const flush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    if (latestValue.current !== null) void doSave(latestValue.current);
  }, [doSave]);

  useEffect(() => {
    function onBeforeUnload() {
      flush();
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [flush]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        flush();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [flush]);

  return { state, trigger, flush };
}
