import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { debounceValue } from "./useDebouncedValue";

describe("debounceValue", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("waits for the debounce window before emitting the latest value", () => {
    const callback = vi.fn();
    const debounced = debounceValue(callback, 300);

    debounced("a");
    debounced("ab");

    expect(callback).not.toHaveBeenCalled();

    vi.advanceTimersByTime(299);
    expect(callback).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenLastCalledWith("ab");
  });
});
