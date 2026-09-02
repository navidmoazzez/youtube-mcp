# Versions

## 1.0.0

First release. 16 tools.

**Transcripts, with no setup at all.** Reads any public video, not only your own.
No API key, no OAuth, no quota. Prose or timestamped output, phrase search that
returns links jumping to the second, and batch fetching for up to 20 videos.

YouTube stopped serving caption text from the track URL directly during 2026: it
answers with 200 and an empty body unless the request carries a proof-of-origin
token tied to a real player session. The track list still comes from the watch
page, and the track body now comes through `yt-dlp`, which mints one.

**Research that carries statistics.** YouTube's search endpoint returns no view
counts, subscriber counts or durations, so results cannot be judged. Every search
here joins the statistics back on before returning.

`analyze_channel` scores recent videos against the channel's own median rather
than an absolute view count, which is the only comparison that transfers between
a small channel and a large one. Shorts are flagged separately.

**Multi-channel from the start.** With more than one channel connected, every
account tool requires `account` and refuses to guess, because acting on the wrong
channel is not recoverable.

**Writes on, with two guarded.** `reply_to_comment` and `delete_video` need
`confirm: true`. `update_video` does not, because it is reversible.
`YOUTUBE_READ_ONLY=1` removes every write from the tool list rather than failing
at call time.
