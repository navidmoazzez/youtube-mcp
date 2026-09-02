# Security

## Reporting a vulnerability

Report it privately through
[GitHub security advisories](https://github.com/navidmoazzez/youtube-mcp/security/advisories/new),
not as a public issue.

## What this server holds

Credentials live in your MCP client's config and in this process's environment.
Nothing is written to disk by the server itself, and there is no backend: every
request goes from your machine to Google directly.

A connected refresh token reaches a real channel. It can read private videos,
edit titles, post public comments and delete videos. Treat it like a password.

`youtube-mcp auth` prints a refresh token to your terminal and stores nothing.
That is deliberate: the token belongs in your client config, and a cache file
would be a second copy to leak and a second place to go stale.

## The write-safety model

Writes work by default, because managing a channel is the point of the tool.

`reply_to_comment` and `delete_video` require `confirm: true`, because neither
can be taken back. `update_video` does not, because it is reversible.

`YOUTUBE_READ_ONLY=1` removes every write tool from the list rather than failing
at call time. Use it when pointing an agent you do not fully trust at a real
channel.

`YOUTUBE_AUDIT_LOG=<path>` appends one JSON line per attempted write, allowed and
blocked alike.

## Running it over HTTP

`--http` binds to `127.0.0.1` unless `YOUTUBE_HTTP_HOST` says otherwise. Set
`YOUTUBE_HTTP_TOKEN` before you change the host. Without a token, anyone who can
reach the port can act on every connected channel.

There is no TLS here. Put it behind a reverse proxy that terminates it.

## Untrusted input

Video descriptions, titles and comments are written by other people and can
contain text engineered to look like instructions to a model. Tool descriptions
and the shipped `SKILL.md` tell the model to treat that content as data. Keep
that in mind when wiring this into anything that runs unattended.

## Good-faith research

Look at whatever you like in this repository. When testing, please do not access,
change or delete data that is not yours, and do not disrupt a service other
people depend on. If a test could affect anyone else, stop and send a private
report first.

Research done in that spirit is welcome, and nothing here is a trap.
