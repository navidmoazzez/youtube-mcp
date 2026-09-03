<div align="center">
  <img src="https://cdn.navid.media/connectors/youtube-icon.png" alt="YouTube" width="88">
</div>

# YouTube MCP

[![npm](https://img.shields.io/npm/v/@thenavidm/youtube-mcp?color=orange&label=npm)](https://www.npmjs.com/package/@thenavidm/youtube-mcp)
[![Licence](https://img.shields.io/badge/licence-MIT-green)](./LICENSE)
[![YouTube](https://img.shields.io/badge/YouTube-@thenavidm-red?logo=youtube&logoColor=white)](https://youtube.com/@thenavidm?sub_confirmation=1)
[![X](https://img.shields.io/badge/X-@thenavidm-black?logo=x)](https://x.com/thenavidm)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-thenavidm-0A66C2?logo=linkedin&logoColor=white)](https://linkedin.com/in/thenavidm)

YouTube MCP server for Claude Code and AI agents. Transcripts, channel research, performance analysis, comments, analytics, multi-channel management.

Read the transcript of any public YouTube video, with nothing set up.

Search results come back with view counts attached, which YouTube's own search endpoint does not return.

16 tools. Connect as many channels as you own.

Built and maintained by [Navid Moazzez](https://navid.me).

```
You: what does this video actually say about pricing?
     https://youtu.be/dQw4w9WgXcQ

Claude: [search_transcript] Three mentions.

        [2:14] "we never charge for the first seat"
        [7:41] "the pricing page is deliberately one number"
        [11:02] "annual is not a discount, it is a commitment"

        Jump straight to 7:41 for the reasoning.
```

## Contents

| | Section | |
|---|---|---|
| 1 | [What you can ask it](#1-what-you-can-ask-it-) | Real prompts, not features |
| 2 | [Quick install](#2-quick-install-) | The package, no account needed |
| 3 | [Set up your account](#3-set-up-your-account-) | Every click |
| 4 | [Connect your client](#4-connect-your-client-) | Claude Code, Desktop, Cursor |
| 5 | [Check it worked](#5-check-it-worked-) | `doctor` |
| 6 | [Tools](#6-tools-) | All 16, by what they reach |
| 7 | [Writing safely](#7-writing-safely-) | What is guarded and what is not |
| 8 | [Notes and gotchas](#8-notes-and-gotchas-) | The platform's real behaviour |
| 9 | [Troubleshooting](#9-troubleshooting-) | Symptom to cause |
| 10 | [FAQ](#10-faq-) | Including what an MCP server is |

## 1. What you can ask it 💬

- "Summarise this video in five bullets."
- "Find where she talks about retention in this talk."
- "Pull the transcripts of these six videos and tell me what the openings have in common."
- "Which of this channel's last 30 videos actually overperformed?"
- "Compare how these two channels title their videos."
- "What did my last video do on watch time versus the one before?"
- "Show me videos about local-first software from the last year with over 50,000 views."
- "Read the comments on my newest upload and group them by what people are asking for."
- "Fix the typo in the title of that video."
- "Which of my videos are still unlisted?"

The one thing that is impossible without this: reading what was said in somebody
else's video. YouTube's Captions API only serves videos you own, so every
official route stops at your own channel. Transcripts here come from the public
caption tracks instead, so any public video is readable, and it needs no
credentials at all.

## 2. Quick install ⚡

Node 20 or newer, and `yt-dlp` for transcripts.

    npx -y @thenavidm/youtube-mcp --version

That is the whole install. `npx` fetches it on demand, so there is nothing to
update later.

Transcripts also need `yt-dlp`, because YouTube stopped serving caption text
directly:

    brew install yt-dlp        # macOS
    pipx install yt-dlp        # everywhere else

## 3. Set up your account 🔑

Three levels. Pick the one that matches what you want, because most people never
need the third.

**Transcripts need nothing.** Skip this whole section. It already works.

**Search and research need an API key.** About ten minutes.

**Your own channels need OAuth.** About half an hour, most of it forms.

### An API key

Go to the [Google Cloud console](https://console.cloud.google.com) and create a
project.

In **APIs & Services > Library**, enable **YouTube Data API v3**. Add **YouTube
Analytics API** too if you will want watch time later.

In **APIs & Services > Credentials**, choose **Create credentials > API key**.
Click **Restrict key** and limit it to the YouTube APIs before you leave the
page.

    YOUTUBE_API_KEY=...

### Your own channels

First the consent screen. Go to **Google Auth platform > Branding** and click
**Get Started**. Fill in an app name and your email, choose **External** as the
audience, and finish.

Then open **Audience**, and under **Test users** click **Add users**. Add the
Google address that owns each channel.

Skipping the test users step is the single most common reason this fails. An
External app stays in testing until Google verifies it, and an app in testing
only issues tokens to addresses on that list. You do not need verification:
testing mode is the correct end state for a tool you run yourself.

Now the client. Go to **Google Auth platform > Clients**, click **Create
Client**, choose **Desktop app** under **Application type**, and click
**Create**.

Desktop app is right even if you will run this on a server. It is the type that
issues a client secret and allows the localhost redirect the next command
catches.

    YOUTUBE_CLIENT_ID=...apps.googleusercontent.com
    YOUTUBE_CLIENT_SECRET=...

Then connect each channel:

    YOUTUBE_CLIENT_ID=... YOUTUBE_CLIENT_SECRET=... npx -y @thenavidm/youtube-mcp auth

A browser opens, you pick the channel, and the refresh token is printed in your
terminal. Run it once per channel, picking a different one each time.

[INSTALL.md](./INSTALL.md) has the long version, including
every failure worth knowing about in advance.

## 4. Connect your client 🔌

### Claude Code

    claude mcp add youtube -- npx -y @thenavidm/youtube-mcp

With credentials:

    claude mcp add youtube \
      -e YOUTUBE_API_KEY=your-key \
      -e YOUTUBE_CLIENT_ID=your-client-id \
      -e YOUTUBE_CLIENT_SECRET=your-client-secret \
      -e YOUTUBE_REFRESH_TOKEN=your-refresh-token \
      -- npx -y @thenavidm/youtube-mcp

### Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` on macOS,
or `%APPDATA%\Claude\claude_desktop_config.json` on Windows:

```json
{
  "mcpServers": {
    "youtube": {
      "command": "/usr/local/bin/npx",
      "args": ["-y", "@thenavidm/youtube-mcp"],
      "env": {
        "YOUTUBE_API_KEY": "your-key",
        "YOUTUBE_CLIENT_ID": "your-client-id",
        "YOUTUBE_CLIENT_SECRET": "your-client-secret",
        "YOUTUBE_REFRESH_TOKEN": "your-refresh-token"
      }
    }
  }
}
```

> [!TIP]
> Claude Desktop does not inherit your shell PATH, so a bare command name fails
> silently. Use the absolute path, and fully quit the app rather than closing
> the window.

Find yours with `which npx`.

### Cursor

Edit `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "youtube": {
      "command": "npx",
      "args": ["-y", "@thenavidm/youtube-mcp"],
      "env": { "YOUTUBE_API_KEY": "your-key" }
    }
  }
}
```

### Everything else

Any MCP client takes a command and an environment block:

    command: npx
    args:    ["-y", "@thenavidm/youtube-mcp"]

To run it somewhere always on, use HTTP instead:

    YOUTUBE_HTTP_TOKEN=a-long-random-string npx -y @thenavidm/youtube-mcp --http --port=8787

It binds to `127.0.0.1` unless `YOUTUBE_HTTP_HOST` says otherwise. Set the token
before you change the host: a connected refresh token can delete videos.

## 5. Check it worked 🩺

    npx -y @thenavidm/youtube-mcp doctor

It reports each layer separately, so you can see how far you got.

Two failures happen far more than the rest. **`yt-dlp not found`** means
transcripts cannot work until you install it, though everything else still will.
**`unauthorized_client`** on a channel means that token was issued by a different
OAuth client than the one configured now, which reads like a revoked grant but is
not: check `YOUTUBE_CLIENT_ID` before reconnecting anything.

## 6. Tools 🛠️

### Transcripts

No credentials. Reads any public video.

| Tool | What it does |
|---|---|
| `get_transcript` | The full transcript, as prose or timestamped lines |
| `list_transcript_languages` | Every caption language, and whether it is auto-generated |
| `search_transcript` | Find a phrase, get timestamps that link to the second |
| `get_transcripts` | Up to 20 videos in one call |

### Research

Needs `YOUTUBE_API_KEY`. Reads anyone's public data.

| Tool | What it does |
|---|---|
| `search_videos` | Search, with view counts and duration joined on |
| `get_channel` | Subscribers, total views, video count, uploads playlist |
| `analyze_channel` | Recent videos scored against that channel's own median |
| `get_video` | Full detail for one video |

### Your channels

Needs OAuth.

| Tool | What it does |
|---|---|
| `list_accounts` | Every connected channel |
| `get_my_channel` | Your exact subscriber count, not the rounded public one |
| `get_channel_analytics` | Watch time, retention, traffic sources, subscriber change |
| `list_my_videos` | Your videos, including private and unlisted |
| `list_comments` | Comment threads on a video |
| `update_video` | Title, description, tags, privacy |
| `reply_to_comment` | Public reply. Needs `confirm: true` |
| `delete_video` | Permanent. Needs `confirm: true` |

## 7. Writing safely 🛟

Writes work by default. The actions that cannot be undone take `confirm: true`.
`YOUTUBE_READ_ONLY=1` removes every write tool from the list.
`YOUTUBE_AUDIT_LOG=<path>` records every attempted write.

Two tools are guarded: `reply_to_comment`, because it is public the moment it
lands and notifies someone, and `delete_video`, because YouTube removes a video
immediately with no trash and no undo.

`update_video` is not guarded. A title is one keystroke to put back, and asking
to confirm reversible things teaches a model to confirm everything reflexively,
which is worse protection than not asking.

## 8. Notes and gotchas ⚠️

- **YouTube stopped serving caption text directly.** The track URL now answers
  200 with an empty body unless the request carries a proof-of-origin token. The
  language list still comes from the watch page; the text comes through `yt-dlp`.
  That is why it is a dependency rather than a nicety.
- **Search has its own daily allowance.** 100 calls a day, separate from the
  10,000-unit pool the other endpoints share. It is almost always search that
  runs out first, so do not call it speculatively.
- **Analytics exists only for your own channels.** Watch time, retention and
  traffic sources are not public for anyone else, at any price. No tool here can
  work around that, and a proxy metric would be a worse answer than none.
- **Analytics lags about two days.** An empty result for yesterday usually means
  the data has not landed yet, not that nothing happened.
- **Public subscriber counts are rounded.** YouTube rounds above 1,000 in its
  public API, so `get_channel` and `get_my_channel` disagree on your own channel.
  The second one is exact.
- **`update_video` replaces the whole snippet.** Passing only a title would blank
  the description, so the current values are read back and merged first. This is
  handled, but it is why the tool makes an extra call.
- **A refresh token only works with the client that issued it.** Rebuild the
  OAuth client and every existing token dies with `unauthorized_client`, which
  looks exactly like a revoked grant and sends people reconnecting in circles.
- **Video tags are only visible to the owner.** `get_video` shows them on your
  own videos and returns nothing for anyone else's. The API does this, not a
  permission you are missing.
- **Shorts skew channel analysis.** Their view counts are not comparable to
  long-form on the same channel, so `analyze_channel` flags them rather than
  quietly averaging them in.

## 9. Troubleshooting 🔧

Run `doctor` first. It checks each layer separately and most answers are in its
output.

| Symptom | Cause |
|---|---|
| `yt-dlp is not installed` | Transcripts need it. `brew install yt-dlp` or `pipx install yt-dlp` |
| `unauthorized_client` | The token came from a different OAuth client than the one configured |
| `Access blocked` at the consent screen | The channel's Google address is not in **Test users** |
| No refresh token returned | Google issues one on first consent only. Revoke at Google Account permissions, run `auth` again |
| 403, API not enabled | YouTube Data API v3 is off in that Cloud project |
| 403 on captions or comments | The token predates the `force-ssl` scope. Reconnect the channel |
| `quotaExceeded` | The pool resets at midnight Pacific |
| Search stops working before anything else | Search has its own 100-call daily allowance |
| HTTP 429 on a transcript | YouTube is rate limiting your IP. Waiting is the only fix |
| Tool refuses and lists your channels | Two or more are connected. Pass `account` |
| Every write tool has vanished | `YOUTUBE_READ_ONLY=1` is set |
| Server missing in Claude Desktop | Use the absolute path to `npx`, and fully quit the app |

## 10. FAQ ❓

<details>
<summary><b>What is an MCP server?</b></summary>

An MCP server is a standard way to give an AI assistant real access to a tool, so
it can act rather than guess. You install it once, your assistant gains the
tools, and it works in Claude, Cursor and anything else speaking MCP.

</details>

<details>
<summary><b>What is the YouTube Data API?</b></summary>

The YouTube Data API is Google's official interface to YouTube, covering videos,
channels, playlists and comments. It is what this server uses for everything
except transcripts, which the API does not offer for videos you do not own.

</details>

<details>
<summary><b>Do I need to be technical?</b></summary>

You need to paste a few lines into a config file. Transcripts work with no setup
whatsoever, so you can install it, try it, and only do the credential work if you
want search or your own channel.

</details>

<details>
<summary><b>Is my data sent anywhere?</b></summary>

Your credentials stay on your machine and go only to Google. This server has no
backend, collects nothing, and phones nowhere. The code is here to read.

</details>

<details>
<summary><b>What can it do that youtube.com cannot?</b></summary>

It reads the transcript of any public video as text you can search, compare and
feed to a model. The site shows you captions one video at a time. Pulling twenty
transcripts to find what their openings have in common is a minute here and an
afternoon by hand.

</details>

<details>
<summary><b>Can it delete one of my videos by accident?</b></summary>

It cannot delete anything without `confirm: true`, which a model has to set
deliberately after reading a description saying the action is permanent. If you
want the possibility gone entirely, set `YOUTUBE_READ_ONLY=1` and every write
tool disappears from the list.

</details>

<details>
<summary><b>Does it cost anything?</b></summary>

It costs nothing. The package is MIT, and the YouTube Data API is free within a
daily quota that ordinary use does not come near. Google does not ask for a card.

</details>

<details>
<summary><b>Does it work with ChatGPT and Cursor?</b></summary>

It works with any client that speaks MCP, including Cursor and Windsurf. Section
4 has a block for each one.

</details>

<details>
<summary><b>Can I connect more than one channel?</b></summary>

You can connect as many as you own. Run `auth` once per channel, collect the
entries into `YOUTUBE_ACCOUNTS`, and pass `account` on a call to pick one. With
two or more connected the tools refuse to guess, which is deliberate: acting on
the wrong channel is not something you can take back.

</details>

<details>
<summary><b>What happens when my token expires?</b></summary>

Access tokens last an hour and are refreshed automatically, so you will not
notice. A refresh token lasts until you revoke it, with one exception: an OAuth
app still in testing issues refresh tokens that expire after seven days. Publish
the app to stop that, or reconnect when it happens.

</details>

<details>
<summary><b>Why does it need yt-dlp?</b></summary>

YouTube stopped serving caption text from the track URL during 2026, answering
with an empty body unless the request proves it came from a real player session.
`yt-dlp` handles that and is maintained against YouTube's changes far faster than
this project could be, so it does that one job.

</details>

<details>
<summary><b>How do I disconnect it?</b></summary>

Remove the server from your client's config, and revoke the app at
[Google Account permissions](https://myaccount.google.com/permissions). Deleting
the Cloud project removes the API key and the OAuth client together.

</details>

## Questions

Run into a problem or have a question? [Open an issue](https://github.com/thenavidm/youtube-mcp/issues) and I will help.

## About the author 👋

Navid Moazzez is a leading AI business strategist, and the host of the AI Creator Summit, watched by 100,000+ creators. He helps creators and founders master AI and build their own AI Operating System (AI OS) to automate their business and life. This YouTube MCP server is one piece of that system.

**Links**

- Personal website: [navid.me](https://navid.me)
- Link in bio: [navid.bio](https://navid.bio)
- Navid Media: [navid.media](https://navid.media)
- YouTube: [@thenavidm](https://youtube.com/@thenavidm?sub_confirmation=1) and [@thenavidai](https://youtube.com/@thenavidai?sub_confirmation=1)
- X: [@thenavidm](https://x.com/thenavidm)
- Instagram: [@thenavidm](https://instagram.com/thenavidm)
- LinkedIn: [thenavidm](https://linkedin.com/in/thenavidm)

If this is useful, star the repo and come say hi on [X](https://x.com/thenavidm).

## Dependencies

| Library | Licence | What it does |
|---|---|---|
| [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk) | MIT | The MCP server and transports |
| [zod](https://github.com/colinhacks/zod) | MIT | Tool argument schemas and validation |

[yt-dlp](https://github.com/yt-dlp/yt-dlp) is an optional external command, used
only to fetch caption tracks. It is not bundled and is never loaded into this
process.

## License

[MIT](./LICENSE). Free to use, modify, and share.

Not affiliated with, endorsed by, or sponsored by Google LLC. YouTube is a
trademark of Google LLC.

---

© 2026 [NM Media](https://navid.media). Made with ❤️ by [Navid Moazzez](https://navid.me).
