#!/usr/bin/env node
/**
 * Entry point.
 *
 *   youtube-mcp            stdio, which is what an MCP client launches
 *   youtube-mcp doctor     check the setup and say what is wrong
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { buildServer, VERSION } from "./server.js";
import { doctor } from "./doctor.js";
import { auth } from "./auth.js";
import { httpOptionsFromEnv, startHttpServer } from "./transport/http.js";

const HELP = `youtube-mcp ${VERSION}

  youtube-mcp             Run over stdio. This is what an MCP client launches.
  youtube-mcp --http      Run over HTTP, for a machine that is always on.
  youtube-mcp auth        Connect a channel. Run once per channel.
  youtube-mcp doctor      Check the setup and report what is wrong.
  youtube-mcp --version   Print the version.

Credentials. None are needed for transcripts.

  YOUTUBE_API_KEY         public search and channel lookup
  YOUTUBE_CLIENT_ID       OAuth client, for your own channels
  YOUTUBE_CLIENT_SECRET
  YOUTUBE_REFRESH_TOKEN   one channel
  YOUTUBE_ACCOUNTS        JSON array, for several channels at once

Options.

  YOUTUBE_READ_ONLY=1           disable every write
  YOUTUBE_ALLOW_DESTRUCTIVE=0   keep writes, block the irreversible ones
  YOUTUBE_TRANSCRIPT_LANG       default transcript language, default en
  YOUTUBE_YTDLP_PATH            path to yt-dlp if it is not on PATH

https://github.com/thenavidm/youtube-mcp
`;

async function main(): Promise<void> {
  const arg = process.argv[2];

  if (arg === "--help" || arg === "-h") {
    console.log(HELP);
    return;
  }
  if (arg === "--version" || arg === "-v") {
    console.log(VERSION);
    return;
  }
  if (arg === "auth") {
    process.exitCode = await auth();
    return;
  }
  if (arg === "doctor") {
    process.exitCode = await doctor();
    return;
  }

  const built = buildServer();

  if (process.argv.includes("--http")) {
    await startHttpServer(built, httpOptionsFromEnv(process.argv));
    return;
  }
  await built.server.connect(new StdioServerTransport());
}

main().catch((err: unknown) => {
  // stderr, never stdout: stdout is the MCP protocol channel and anything
  // written there that is not a JSON-RPC frame breaks the client's parser.
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
