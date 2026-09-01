/**
 * `youtube-mcp auth` — one-time OAuth for a channel.
 *
 * Google will not hand a refresh token to a command line, so this opens a
 * browser, catches the redirect on localhost, exchanges the code, and prints
 * the refresh token for the user to paste into their MCP client config. It
 * writes nothing to disk: the token belongs in the client's env block, and a
 * cache file would be a second place for it to go stale.
 *
 * Run it once per channel. Each run prints one entry for YOUTUBE_ACCOUNTS.
 */

import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";

const PORT = Number(process.env.YOUTUBE_OAUTH_PORT ?? 8765);
const REDIRECT_URI = `http://localhost:${PORT}/callback`;
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

/**
 * The account tools need read AND write on the channel, plus Analytics.
 * `force-ssl` is the one people miss: captions and comment moderation both
 * refuse to work without it, with an error that blames the wrong thing.
 */
const SCOPES = [
  "https://www.googleapis.com/auth/youtube",
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube.force-ssl",
  "https://www.googleapis.com/auth/yt-analytics.readonly",
];

function openBrowser(url: string): void {
  const cmd =
    process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
  try {
    spawn(cmd, [url], { detached: true, stdio: "ignore" }).unref();
  } catch {
    // Printing the URL below is the real fallback.
  }
}

const page = (title: string, body: string) =>
  `<!doctype html><meta charset="utf-8"><title>${title}</title>` +
  `<body style="font:15px/1.6 -apple-system,BlinkMacSystemFont,sans-serif;max-width:520px;margin:80px auto;padding:0 24px">` +
  `<h1 style="font-size:20px">${title}</h1>${body}</body>`;

export async function auth(): Promise<number> {
  const clientId = (process.env.YOUTUBE_CLIENT_ID ?? process.env.YOUTUBE_OAUTH_CLIENT_ID ?? "").trim();
  const clientSecret = (
    process.env.YOUTUBE_CLIENT_SECRET ??
    process.env.YOUTUBE_OAUTH_CLIENT_SECRET ??
    ""
  ).trim();

  if (!clientId || !clientSecret) {
    console.error(
      "Set YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET first.\n\n" +
        "They come from your own Google Cloud project — see the README section\n" +
        '"Connect your channels". Nobody else\'s client will work, because a\n' +
        "refresh token only ever works against the client that issued it.",
    );
    return 1;
  }

  const state = randomBytes(16).toString("hex");
  const url =
    `${AUTH_URL}?` +
    new URLSearchParams({
      client_id: clientId,
      redirect_uri: REDIRECT_URI,
      response_type: "code",
      scope: SCOPES.join(" "),
      // Without both of these Google returns an access token only, and the
      // connection dies an hour later with no way to renew it.
      access_type: "offline",
      prompt: "consent",
      state,
    }).toString();

  console.error(`Opening your browser. If nothing happens, paste this:\n\n${url}\n`);
  console.error("Pick the channel you want to connect. Run this again for each one.\n");

  return new Promise<number>((resolve) => {
    const server = createServer(async (req, res) => {
      const incoming = new URL(req.url ?? "/", `http://localhost:${PORT}`);
      if (incoming.pathname !== "/callback") {
        res.writeHead(404).end();
        return;
      }

      const error = incoming.searchParams.get("error");
      const code = incoming.searchParams.get("code");

      if (error || !code) {
        res.writeHead(400, { "Content-Type": "text/html" });
        res.end(page("Authorization cancelled", `<p>Google said: <code>${error ?? "no code"}</code></p>`));
        server.close();
        resolve(1);
        return;
      }
      if (incoming.searchParams.get("state") !== state) {
        res.writeHead(400, { "Content-Type": "text/html" });
        res.end(page("State mismatch", "<p>Start over.</p>"));
        server.close();
        resolve(1);
        return;
      }

      const tokenRes = await fetch(TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: REDIRECT_URI,
          grant_type: "authorization_code",
        }).toString(),
      });
      const token = (await tokenRes.json()) as {
        refresh_token?: string;
        access_token?: string;
        error?: string;
        error_description?: string;
      };

      if (!tokenRes.ok || !token.refresh_token) {
        const why =
          token.error === undefined && token.access_token
            ? "Google returned an access token but no refresh token. That happens when this client was already authorized for this channel. Revoke it at https://myaccount.google.com/permissions and run auth again."
            : `${token.error ?? tokenRes.status}: ${token.error_description ?? ""}`;
        res.writeHead(500, { "Content-Type": "text/html" });
        res.end(page("Could not get a refresh token", `<p>${why}</p>`));
        console.error(`\n${why}`);
        server.close();
        resolve(1);
        return;
      }

      // Name the entry after the channel so `account` reads naturally later.
      let channelName = "channel";
      try {
        const me = await fetch(
          "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true",
          { headers: { Authorization: `Bearer ${token.access_token}` } },
        );
        const body = (await me.json()) as { items?: { snippet?: { title?: string } }[] };
        channelName = body.items?.[0]?.snippet?.title ?? channelName;
      } catch {
        // Naming is a convenience, not a requirement.
      }

      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(
        page(
          `${channelName} connected`,
          "<p>The refresh token is in your terminal. You can close this tab.</p>",
        ),
      );

      console.log(`\nConnected: ${channelName}\n`);
      console.log("One channel — add to your MCP client config:\n");
      console.log(`  YOUTUBE_REFRESH_TOKEN=${token.refresh_token}\n`);
      console.log("Several channels — collect one entry each into YOUTUBE_ACCOUNTS:\n");
      console.log(
        `  ${JSON.stringify([{ name: channelName, refresh_token: token.refresh_token }])}\n`,
      );

      server.close();
      resolve(0);
    });

    server.listen(PORT, () => openBrowser(url));
    server.on("error", (err: NodeJS.ErrnoException) => {
      console.error(
        err.code === "EADDRINUSE"
          ? `Port ${PORT} is busy. Free it, or set YOUTUBE_OAUTH_PORT to another port and add that redirect URI in the Cloud console.`
          : String(err),
      );
      resolve(1);
    });
  });
}
