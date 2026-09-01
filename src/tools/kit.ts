/**
 * The seam every tool is registered through.
 *
 * Tools are declared as data rather than registered by hand so that guarding,
 * annotations and error shaping happen in exactly one place. When they are
 * applied per tool instead, one of thirty tools eventually forgets the guard,
 * and it is the one that deletes something.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { z, ZodRawShape } from "zod";
import type { Config } from "../config.js";
import { annotationsFor, WriteGuard, type Risk } from "../safety.js";
import { YouTubeClient } from "../youtube/api.js";
import { resolveAccount } from "../config.js";

export type ToolContext = {
  config: Config;
  guard: WriteGuard;
  /** A client bound to the requested channel, or to the API key when none is asked for. */
  clientFor: (accountHint?: string) => YouTubeClient;
};

export type ToolSpec<S extends ZodRawShape> = {
  name: string;
  title: string;
  description: string;
  schema: S;
  risk: Risk;
  idempotent?: boolean;
  /** One line describing what the call is about to do, for the confirm message and the audit log. */
  summary?: (args: z.infer<z.ZodObject<S>>) => string;
  handler: (args: z.infer<z.ZodObject<S>>, ctx: ToolContext) => Promise<string>;
};

export function defineTool<S extends ZodRawShape>(spec: ToolSpec<S>): ToolSpec<S> {
  return spec;
}

/**
 * A tool of any shape, for the one place tools are collected into a list.
 *
 * `ToolSpec` is generic over its schema, so a list of tools with different
 * schemas has no single type: each handler takes a different argument shape and
 * function parameters are contravariant. The safety that matters is inside each
 * `defineTool` call, where schema and handler are checked against each other.
 * This only loosens the seam where they are gathered.
 */
export type AnyToolSpec = Omit<ToolSpec<ZodRawShape>, "handler" | "summary"> & {
  handler: (args: never, ctx: ToolContext) => Promise<string>;
  summary?: (args: never) => string;
};

const ok = (text: string) => ({ content: [{ type: "text" as const, text }] });
const fail = (error: unknown) => ({
  content: [
    { type: "text" as const, text: error instanceof Error ? error.message : String(error) },
  ],
  isError: true,
});

/** Register one tool, with guarding, annotations and error handling applied. */
export function register(server: McpServer, ctx: ToolContext, spec: AnyToolSpec): void {
  server.registerTool(
    spec.name,
    {
      title: spec.title,
      description: spec.description,
      inputSchema: spec.schema,
      annotations: {
        title: spec.title,
        ...annotationsFor(spec.risk, { idempotent: spec.idempotent }),
      },
    },
    // The SDK derives its callback type from the schema generic. This wrapper is
    // generic over the same shape, but TypeScript cannot prove the two equal
    // through the indirection, so the cast lives at this single boundary rather
    // than in every tool definition.
    (async (args: Record<string, unknown>) => {
      try {
        if (spec.risk !== "read") {
          const summary = spec.summary?.(args as never) ?? spec.name;
          const confirm = (args as { confirm?: boolean }).confirm;
          ctx.guard.check(spec.name, spec.risk, confirm, summary);
        }
        return ok(await spec.handler(args as never, ctx));
      } catch (error) {
        return fail(error);
      }
    }) as never,
  );
}

/**
 * Register a list, dropping every write when the server is read-only.
 *
 * They are removed from the list rather than made to fail when called. A model
 * cannot misuse a tool it cannot see, and an error at call time still spends a
 * turn and still invites a retry.
 */
export function registerAll(server: McpServer, ctx: ToolContext, specs: AnyToolSpec[]): void {
  for (const spec of specs) {
    if (ctx.guard.readOnly && spec.risk !== "read") continue;
    register(server, ctx, spec);
  }
}

export function makeContext(config: Config, guard: WriteGuard): ToolContext {
  return {
    config,
    guard,
    clientFor: (hint?: string) =>
      new YouTubeClient({ apiKey: config.apiKey, account: resolveAccount(config, hint) }),
  };
}

/** Clamp a caller-supplied limit into a range the Data API will accept. */
export function clamp(value: number | undefined, fallback: number, max = 50): number {
  if (value === undefined || !Number.isFinite(value)) return fallback;
  return Math.min(Math.max(Math.trunc(value), 1), max);
}
