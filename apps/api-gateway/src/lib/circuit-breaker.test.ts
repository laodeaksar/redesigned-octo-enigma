/**
 * Unit tests for CircuitBreaker timer hygiene & AbortSignal propagation.
 *
 * Run with: bun test apps/api-gateway/src/lib/circuit-breaker.test.ts
 */

import { describe, it, expect, beforeEach } from "bun:test";
import {
  CircuitBreaker,
  CircuitBreakerManager,
  CircuitTimeoutError,
} from "./circuit-breaker";

const cfg = {
  serviceName: "test-service",
  failureThreshold: 3,
  resetTimeout: 1_000,
  requestTimeout: 100,
  successThreshold: 1,
  halfOpenMaxRequests: 1,
} as const;

describe("CircuitBreaker — timer hygiene", () => {
  beforeEach(() => {
    CircuitBreakerManager.resetAll();
  });

  it("clears the timeout when the operation resolves first", async () => {
    const cb = new CircuitBreaker({ ...cfg });

    const before = process.getActiveResourcesInfo?.().length ?? 0;

    for (let i = 0; i < 1000; i++) {
      await cb.execute(async () => "ok");
    }

    // Beri event loop kesempatan menjalankan microtask
    await new Promise((r) => setImmediate(r));
    const after = process.getActiveResourcesInfo?.().length ?? 0;

    // Boleh tumbuh sedikit untuk infrastruktur Bun, tapi tidak boleh
    // tumbuh ~1000 (satu Timeout per panggilan).
    expect(after - before).toBeLessThan(50);
  });

  it("propagates AbortSignal to the operation on timeout", async () => {
    const cb = new CircuitBreaker({ ...cfg, requestTimeout: 50 });

    let receivedSignal: AbortSignal | null = null;
    let aborted = false;

    const promise = cb.execute((signal) => {
      receivedSignal = signal;
      signal.addEventListener("abort", () => {
        aborted = true;
      });
      return new Promise<string>((resolve) => {
        // sengaja melebihi timeout
        setTimeout(() => resolve("late"), 500);
      });
    });

    await expect(promise).rejects.toBeInstanceOf(CircuitTimeoutError);
    expect(receivedSignal).not.toBeNull();
    expect(aborted).toBe(true);
    expect(receivedSignal!.aborted).toBe(true);
  });

  it("does NOT abort signal when operation finishes in time", async () => {
    const cb = new CircuitBreaker({ ...cfg, requestTimeout: 200 });

    let signalRef: AbortSignal | null = null;
    const result = await cb.execute(async (signal) => {
      signalRef = signal;
      return "fast";
    });

    expect(result).toBe("fast");
    expect(signalRef!.aborted).toBe(false);
  });

  it("aborts fetch via signal when timeout elapses", async () => {
    const cb = new CircuitBreaker({ ...cfg, requestTimeout: 50 });

    // Mock fetch yang menunda 500ms tapi menghormati AbortSignal
    const slowFetch = (signal: AbortSignal) =>
      new Promise<Response>((resolve, reject) => {
        const t = setTimeout(() => resolve(new Response("late")), 500);
        signal.addEventListener("abort", () => {
          clearTimeout(t);
          reject(new DOMException("Aborted", "AbortError"));
        });
      });

    // Race condition: reject pertama bisa dari timeoutPromise (CircuitTimeoutError)
    // ATAU dari operasi yang menerima abort (AbortError). Kedua-duanya valid —
    // yang penting promise reject dengan cepat (tidak menunggu 500ms) dan
    // tidak meninggalkan timer.
    const start = Date.now();
    let err: unknown;
    try {
      await cb.execute(slowFetch);
    } catch (e) {
      err = e;
    }
    const elapsed = Date.now() - start;

    expect(err).toBeDefined();
    expect(elapsed).toBeLessThan(200); // jauh di bawah 500ms operasi
    const isTimeout = err instanceof CircuitTimeoutError;
    const isAbort =
      err instanceof Error &&
      (err.name === "AbortError" || /aborted/i.test(err.message));
    expect(isTimeout || isAbort).toBe(true);
  });
});
