import { describe, expect, it } from "vitest";
import { annotationsFor, WriteBlockedError, WriteGuard } from "../src/safety.js";
import type { Config } from "../src/config.js";

const config = (over: Partial<Config> = {}): Config => ({
  accounts: [],
  readOnly: false,
  allowDestructive: true,
  requestTimeoutMs: 30000,
  defaultLanguage: "en",
  ...over,
});

describe("WriteGuard", () => {
  it("lets reads through whatever the mode", () => {
    const guard = new WriteGuard(config({ readOnly: true }));
    expect(() => guard.check("get_transcript", "read", undefined, "read")).not.toThrow();
  });

  it("lets a reversible write through without confirm", () => {
    const guard = new WriteGuard(config());
    expect(() => guard.check("update_video", "write", undefined, "edit")).not.toThrow();
  });

  it("refuses an irreversible write without confirm", () => {
    const guard = new WriteGuard(config());
    expect(() => guard.check("delete_video", "destructive", undefined, "delete x")).toThrow(
      WriteBlockedError,
    );
    expect(() => guard.check("delete_video", "destructive", true, "delete x")).not.toThrow();
  });

  it("names the pending action so the caller can show it before confirming", () => {
    const guard = new WriteGuard(config());
    expect(() => guard.check("delete_video", "destructive", undefined, "permanently delete abc")).toThrow(
      /permanently delete abc/,
    );
  });

  it("blocks every write in read-only mode, confirm or not", () => {
    const guard = new WriteGuard(config({ readOnly: true }));
    expect(() => guard.check("update_video", "write", undefined, "edit")).toThrow(/READ_ONLY/);
    expect(() => guard.check("delete_video", "destructive", true, "delete")).toThrow(/READ_ONLY/);
  });

  it("blocks the irreversible ones when destructive is disabled but keeps ordinary writes", () => {
    const guard = new WriteGuard(config({ allowDestructive: false }));
    expect(() => guard.check("update_video", "write", undefined, "edit")).not.toThrow();
    expect(() => guard.check("delete_video", "destructive", true, "delete")).toThrow(/ALLOW_DESTRUCTIVE/);
  });
});

describe("annotationsFor", () => {
  it("tells a client the truth about each risk level", () => {
    expect(annotationsFor("read")).toMatchObject({ readOnlyHint: true, destructiveHint: false });
    expect(annotationsFor("write")).toMatchObject({ readOnlyHint: false, destructiveHint: false });
    expect(annotationsFor("destructive")).toMatchObject({
      readOnlyHint: false,
      destructiveHint: true,
    });
  });

  it("marks everything open-world, because every call leaves the machine", () => {
    expect(annotationsFor("read").openWorldHint).toBe(true);
  });
});
