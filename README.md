# Tooleytube

A tiny, curated YouTube viewer for kids. Multiple profiles, per-profile channel allowlists, parent-gated settings. You pick what each kid sees.

Installs to the iPad home screen as a PWA — no App Store, no dev account, no expiring certs.

## What's in here

```
tooleytube/
├── index.html       # The whole app. Set CONFIG.apiKey at the top.
├── manifest.json    # Makes it installable on iPad
├── sw.js            # Service worker (offline app shell)
├── icon-192.png     # App icons
└── icon-512.png
```

Everything that changes day-to-day — profiles, channel lists — lives in the iPad's localStorage and is edited inside the app.

---

## One-time setup

### 1. Get a YouTube Data API key

1. Go to <https://console.cloud.google.com/>
2. Top-left dropdown → **New Project**. Name it whatever.
3. Search bar → **YouTube Data API v3** → **Enable**.
4. Left sidebar → **APIs & Services → Credentials → + Create Credentials → API key**. Copy it.
5. Click the new key and add restrictions:
   - **API restrictions**: Restrict → only **YouTube Data API v3**.
   - **Application restriction**: "HTTP referrers" + your domain (e.g. `tooleytube.pages.dev/*`). For local use, leave as None.

Free tier: 10,000 units/day. Tooleytube burns ~2 units per channel per refresh, cached 60 min. You'd need dozens of profiles and constant refreshing to come close to the limit.

### 2. Paste the key

Open `index.html`, find the `CONFIG` block near the top:

```js
const CONFIG = {
  apiKey: 'PASTE_YOUR_YOUTUBE_DATA_API_KEY_HERE',
  defaultChannels: [],    // optional — starter channels for profile #1
  maxVideosPerChannel: 15,
  cacheMinutes: 60,
};
```

Paste your key in, save. Everything else is managed in-app.

### 3. Host it

PWAs need HTTPS (or `localhost`). Pick one:

- **Cloudflare Pages** (easiest): push to GitHub, connect in Cloudflare dashboard, done. Free HTTPS URL.
- **GitHub Pages**: Settings → Pages → Deploy from branch.
- **Local network only**: `python3 -m http.server 8080` then bookmark the LAN URL in Safari. Note: Safari won't install a PWA from `http://` — you'd need a local HTTPS setup (mkcert + Caddy, or a Cloudflare Tunnel) to get the full home-screen experience.

### 4. Install on the iPad

1. Open the site in **Safari** (Chrome on iOS can't install PWAs).
2. Share button → **Add to Home Screen** → Add.
3. Tap the icon — it opens full-screen, no browser chrome.

---

## How the app works

### Profiles

The first launch seeds one profile called "Default". Tap the avatar in the header (top-right) any time to open the profile picker.

- **Picker screen**: big cards with an emoji avatar and name. Your kid taps their own → enters the app. Everything after that is filtered to their channel list.
- **Settings** (gear icon on the picker): add, edit, or delete profiles. Parent-gated.

Each profile has:
- A name
- An emoji avatar (24 options) + background color (4 options)
- Its own channel list

### The parent gate

Any parent-only action — opening Settings, adding a new profile from the picker — triggers a math challenge:

> **7 × 23 = ?**

Wrong answer shakes and regenerates. This isn't bulletproof (any motivated 10-year-old could do it), but it filters out the toddler/preschool range and matches what real kid apps use.

If you want something stronger, the gate is a ~15-line block near the end of the script — swap in a PIN, a passphrase, or a word-reversal puzzle.

### Adding channels (in-app)

In a profile's editor, the "Add channel" input accepts:

- **Full URL**: `https://www.youtube.com/@markrober`
- **@handle**: `@markrober`
- **Raw channel ID**: `UCY1kMZp36IQSyNx_9h4mpCg`

The app calls `channels.list?forHandle=` to resolve handles and verifies IDs before saving, so you don't end up with dead entries.

### Per-profile cache

Each profile has its own cache (keyed by profile ID), stored in localStorage. Switching kids doesn't mix their feeds. Adding or removing a channel invalidates that profile's cache automatically so the next view is fresh.

"Clear all caches" in Settings forces a full refetch on next load.

---

## Honest caveats

- **Ads play.** YouTube's ToS require their embedded player, which shows ads. The only legit way to skip them is YouTube Premium on the account logged in on the iPad — embeds respect Premium ad-free on the signed-in device.
- **No algorithmic recommendations.** "Latest" is a date-sorted merge of recent uploads from the allowlist. That's intentional — no rabbit hole — but it means you build your own discovery logic if you want it.
- **End-of-video suggestions still show** as channel thumbnails (the `rel=0` param limits them to the same channel, but doesn't eliminate them). If this bothers you, swap the bare embed for the IFrame API and listen for `YT.PlayerState.ENDED` to auto-close.
- **localStorage lives on the device.** If you wipe Safari data or the iPad, profiles vanish. Back up by copying the `tooleytube:store:v2` key from Safari's dev tools, or build in an export/import button (trivial — just dump JSON).

## Locking down the iPad

- **Guided Access** (Settings → Accessibility → Guided Access) — triple-click side button while Tooleytube is open → locks iPad to that app. Unlock with your passcode. Great for handing it to a toddler.
- **Screen Time → App Limits** for daily time caps.
- **Restrictions → Web Content** can block all other browsing if the iPad is dedicated to Tooleytube.

## Natural next steps

If you want to keep building:

1. **Close on end.** Wire up the IFrame API with `onStateChange` → close player on `ENDED`.
2. **Favorites row.** ⭐ on video cards → store video IDs per profile → pinned row on Latest.
3. **Watch history per profile.** Log video IDs + timestamps on open; show "Watch again" row.
4. **Categories.** Add a `tag` field to channels in the editor; filter bar on Latest.
5. **Shuffle.** Big "Surprise me" button → random video from the cache.
6. **Export/import profiles.** JSON download + file upload in Settings — saves you re-typing after a Safari wipe.
7. **A cleaner gate.** Word reversal ("type TOMATO backwards"), multi-step tap sequence, or PIN.

Have fun.
