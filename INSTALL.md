# Install

## Setting up Google credentials

This is the long version. The README has the short one.

Everything here happens in your own Google Cloud project. There is no shared key
to borrow: quota is counted per project and an OAuth client only works with the
tokens it issued itself, so every user runs their own. It is free.

Console labels below were checked against Google's own documentation in
September 2026. Google renames things, so if a label has moved, the goal in each
step still holds.

## What you actually need

Work out which of these you want before starting, because the second one takes
longer and plenty of people never need it.

**Nothing at all** gets you transcripts, on any public video. If that is all you
came for, close this file. It already works.

**An API key** gets you search, channel lookup and `analyze_channel`. Ten
minutes.

**An OAuth client** gets you your own channels: private videos, comment replies,
and Analytics. Half an hour, most of it waiting on forms.

## 1. Make a project

Go to the [Google Cloud console](https://console.cloud.google.com). Create a
project from the project picker in the top bar and give it a name only you will
read.

A project is a billing and quota boundary, not a product. Nothing here costs
money, and the YouTube Data API does not ask for a card.

## 2. Turn on the APIs

In **APIs & Services > Library**, enable:

- **YouTube Data API v3** for everything
- **YouTube Analytics API** only if you want watch time and retention

An API that is off returns 403 with a message about the API not being enabled
for the project. If a call fails that way, this is the step that was missed.

## 3. Get an API key

In **APIs & Services > Credentials**, choose **Create credentials > API key**.
Copy it.

Restrict it before you leave the page. Click **Restrict key**, and under API
restrictions allow only the YouTube APIs you enabled. An unrestricted key that
leaks can be spent against everything in the project.

That is `YOUTUBE_API_KEY`. Search and research work now.

## 4. Set up the consent screen

Only needed for your own channels. Skip if the API key is enough.

Go to **Google Auth platform > Branding** and click **Get Started**.

- **App information**: an app name only you will see, and your address under
  **User support email**
- **Audience**: choose **External**. Internal is for Workspace organisations
  only, and a YouTube channel usually sits on an ordinary Google account
- **Contact information**: your address again
- **Finish**: agree to the user data policy, then **Create**

Then open **Audience**. Under **Test users**, click **Add users** and add the
Google address that owns each channel you plan to connect.

**This step is the one people skip, and it is the one that blocks them.** An
External app stays in testing until Google verifies it, and an app in testing
only issues tokens to addresses on that list. Miss it and authorisation fails
with a message about the app being blocked, which reads like your account is at
fault when it is not.

You do not need to submit for verification. Verification is for handing an app to
strangers. Testing mode is the correct end state for a tool you run yourself.

## 5. Create the OAuth client

Go to **Google Auth platform > Clients** and click **Create Client**.

Under **Application type** choose **Desktop app**, name it, and click **Create**.

Desktop app is right even though this runs on a server. It is the type that
issues a client secret and permits a localhost redirect, which is what
`youtube-mcp auth` catches. Web application does not issue a usable secret for
this flow.

Copy the client ID and the client secret. The secret is retrievable later from
the same page, but copying both now saves a trip.

    YOUTUBE_CLIENT_ID=...apps.googleusercontent.com
    YOUTUBE_CLIENT_SECRET=...

## 6. Connect each channel

    YOUTUBE_CLIENT_ID=... YOUTUBE_CLIENT_SECRET=... npx -y @thenavidm/youtube-mcp auth

A browser opens. Pick the channel, approve, and the refresh token is printed in
your terminal.

**Run it once per channel**, choosing a different one in Google's account chooser
each time. Each run prints one entry. Collect them:

    YOUTUBE_ACCOUNTS=[{"name":"Main","refresh_token":"1//..."},{"name":"Clips","refresh_token":"1//..."}]

For a single channel, `YOUTUBE_REFRESH_TOKEN=1//...` is enough.

The `name` is what you pass as `account` on a tool call, so make it something you
would actually say out loud.

## The failures worth knowing in advance

**`unauthorized_client` on refresh.** The token was issued by a different OAuth
client than the one now configured. It reads exactly like a revoked grant and
leads people to reconnect repeatedly, which does not help. Check that
`YOUTUBE_CLIENT_ID` is the client that authorised the channel. If you rebuilt
the client, every existing token is dead and each channel has to be reconnected
once.

**No refresh token came back.** Google issues one on first consent only. If this
client was already authorised for that channel, revoke it at
[Google Account permissions](https://myaccount.google.com/permissions) and run
`auth` again.

**403 saying the API is not enabled.** Step 2, on the project this client belongs
to. A project with the API off looks identical to a credential problem.

**403 on captions or comment moderation.** Those need the `force-ssl` scope. It
is requested by `auth` already, so this means the token predates it. Reconnect.

**Quota exhausted.** The pool resets at midnight Pacific. Search has its own
allowance of 100 calls a day, separate from the 10,000-unit pool everything else
shares, and it is almost always search that runs out first.
