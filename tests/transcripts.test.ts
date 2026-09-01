import { describe, expect, it } from "vitest";
import {
  formatTimestamp,
  parseVideoId,
  searchSegments,
  toPlainText,
  toTimestampedText,
  type TranscriptSegment,
} from "../src/youtube/transcripts.js";

describe("parseVideoId", () => {
  it("accepts every URL shape a person might paste", () => {
    const id = "dQw4w9WgXcQ";
    expect(parseVideoId(id)).toBe(id);
    expect(parseVideoId(`https://youtu.be/${id}`)).toBe(id);
    expect(parseVideoId(`https://www.youtube.com/watch?v=${id}`)).toBe(id);
    expect(parseVideoId(`https://www.youtube.com/watch?v=${id}&t=42s`)).toBe(id);
    expect(parseVideoId(`https://youtube.com/shorts/${id}`)).toBe(id);
    expect(parseVideoId(`https://www.youtube.com/embed/${id}`)).toBe(id);
    expect(parseVideoId(`https://www.youtube.com/live/${id}`)).toBe(id);
  });

  it("rejects anything that is not a video id", () => {
    expect(parseVideoId("")).toBeNull();
    expect(parseVideoId("garbage")).toBeNull();
    expect(parseVideoId("https://youtube.com/@somechannel")).toBeNull();
    // Eleven characters is the rule, so ten and twelve are both wrong.
    expect(parseVideoId("dQw4w9WgXc")).toBeNull();
  });
});

describe("formatTimestamp", () => {
  it("drops the hour until there is one", () => {
    expect(formatTimestamp(0)).toBe("0:00");
    expect(formatTimestamp(65)).toBe("1:05");
    expect(formatTimestamp(3661)).toBe("1:01:01");
  });
});

const segments: TranscriptSegment[] = [
  { start: 0, duration: 2, text: "never gonna give you up" },
  { start: 2, duration: 2, text: "never gonna let you down" },
  { start: 40, duration: 2, text: "never gonna run around" },
];

describe("rendering", () => {
  it("joins fragments into prose", () => {
    expect(toPlainText(segments)).toBe(
      "never gonna give you up never gonna let you down never gonna run around",
    );
  });

  it("groups timestamped lines into buckets rather than one line per fragment", () => {
    const lines = toTimestampedText(segments, 30).split("\n");
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain("[0:00]");
    expect(lines[1]).toContain("[0:40]");
  });
});

describe("searchSegments", () => {
  it("finds every occurrence and reports its timestamp", () => {
    const hits = searchSegments(segments, "never gonna", 0);
    expect(hits).toHaveLength(3);
    expect(hits[0]?.timestamp).toBe("0:00");
  });

  it("is case insensitive and returns nothing for a miss", () => {
    expect(searchSegments(segments, "NEVER GONNA GIVE", 0)).toHaveLength(1);
    expect(searchSegments(segments, "absent", 0)).toHaveLength(0);
    expect(searchSegments(segments, "", 0)).toHaveLength(0);
  });

  it("includes neighbouring segments for context", () => {
    const [hit] = searchSegments(segments, "let you down", 1);
    expect(hit?.text).toContain("give you up");
    expect(hit?.text).toContain("run around");
  });
});
