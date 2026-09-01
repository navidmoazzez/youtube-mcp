# Working on youtube-mcp

An MCP server for YouTube: transcripts, research and channel management.

## Shape

TypeScript, Node 20+, ESM. Published as `@thenavidm/youtube-mcp`. stdio and
streamable HTTP. Tests run against fakes, never the network.

```
src/
  index.ts          entry, arg parsing, the auth and doctor commands
  server.ts         assembles the server and its instructions
  config.ts         env into settings and accounts
  safety.ts         confirm gating, read-only, audit log, MCP annotations
  auth.ts           the one-time OAuth flow
  doctor.ts         reports each credential layer separately
  youtube/          API client, transcripts, the yt-dlp transport
  tools/            kit.ts registers everything; one module per group
  transport/http.ts
```

## The things worth knowing before changing anything

**Tools are data, not registrations.** Every tool is a `defineTool` spec, and
`registerAll` applies guarding, annotations and error shaping in one place. Do
not call `server.tool` directly. When guarding is applied per tool instead, one
of them eventually forgets, and it is the one that deletes something.

**Read-only removes tools rather than refusing them.** `registerAll` skips every
non-read spec when `YOUTUBE_READ_ONLY=1`. A model cannot misuse a tool it cannot
see, and a refusal at call time still costs a turn and invites a retry.

**`confirm: true` goes on irreversible tools only.** Currently
`reply_to_comment` and `delete_video`. Not on `update_video`. The test is whether
the user could undo it from youtube.com in one action. Confirming reversible
things trains the reflex that makes the confirmation on a real deletion
worthless.

**Transcripts do not use the Captions API.** That one needs OAuth and channel
ownership, so it only ever reads your own videos. The track list is scraped from
the watch page, and the track body comes through `yt-dlp`, because YouTube began
answering the track URL with 200 and an empty body during 2026 unless the request
carries a proof-of-origin token. If transcripts break, check whether the watch
page shape moved before assuming yt-dlp is at fault.

**Both OAuth client spellings are read.** `YOUTUBE_CLIENT_ID` and
`YOUTUBE_OAUTH_CLIENT_ID`, same for the secret. A refresh token only works
against the client that issued it, so accepting one spelling and ignoring the
other produces `unauthorized_client`, which is indistinguishable from a revoked
grant and sends people reconnecting in circles. There is a test for this.

**Multi-account refuses rather than defaults.** With two or more channels
connected and no `account` passed, `resolveAccount` throws and names the
choices. Do not add a fallback to the first one.

## Before you say it works

```bash
npm run typecheck && npm run build && npm test
npx @modelcontextprotocol/inspector node dist/index.js
```

A green suite says nothing about whether the server starts and lists its tools.
Run the handshake.

Setup steps in the README and `references/setup.md` come from Google's live
documentation, not memory. The console was reorganised into **Google Auth
platform** and most tutorials online still describe the old Credentials flow. If
you touch those steps, re-read the source first.
