# Tooleytube

A tiny, curated YouTube viewer for kids. Multiple profiles, per-profile channel allowlists, per-profile daily-time tracking, parent-gated settings. You pick what each kid sees.

Installs to the iPad home screen as a PWA — no App Store, no dev account, no expiring certs.

## What's in here

```
tooleytube/
├── index.html                  # The whole app. No config editing needed — set up in-app.
├── manifest.json               # Makes it installable on iPad
├── sw.js                       # Service worker (offline app shell)
├── staticwebapp.config.json    # Azure Static Web Apps config (ignored elsewhere)
├── icon-192.png                # App icons
├── icon-512.png
└── .vscode/launch.json         # VS Code Chrome debug profile (dev only)
```

Everything — profiles, channel lists, the API key, daily watch times — is managed inside the app and stored in the iPad's localStorage.

---

## One-time setup

### 1. Get a YouTube Data API key

1. Go to <https://console.cloud.google.com/>
2. Top-left dropdown → **New Project**. Name it whatever.
3. Search bar → **YouTube Data API v3** → **Enable**.
4. Left sidebar → **APIs & Services → Credentials → + Create Credentials → API key**. Copy it.
5. Click the new key and add restrictions:
   - **API restrictions**: Restrict → only **YouTube Data API v3**.
   - **Application restriction**: select **Websites** + your deployed domain (e.g. `tooleytube-xyz.azurestaticapps.net/*`). For local-only use, leave as None.

Free tier: 10,000 units/day. Tooleytube typically uses 1–10 units per page load (cached 60 min). The app tracks usage locally in Settings so you can see where you stand — see **Quota tracking** below.

### 2. Add the key inside the app

Open the app. On first launch you'll see a "YouTube API key needed" screen — tap **Open settings**, solve the parent-gate math, and paste your key into the **YouTube API key** section. Tap **Test** to verify it works, then **Save**.

The key lives only in the browser's localStorage on that device — it's never sent anywhere except to YouTube's own API. If another parent installs the app, they set up their own key the same way.

> **Developer shortcut:** If you want to pre-seed a key at build time for your personal deploy, set `CONFIG.apiKey` near the top of `index.html`. It's used once on first launch, saved to localStorage, then ignored.

### 3. Host it

PWAs need HTTPS (or `localhost`). Pick one:

- **Azure Static Web Apps** (what this project is set up for): Azure Portal → Create Static Web App → connect to GitHub → pick repo/branch → Custom build preset, app location `/`, no API, no build output. The included `staticwebapp.config.json` handles caching headers for the PWA correctly. Use the **Deployment token** authorization (not GitHub Identity) — scoped to this single app and easy to rotate.
- **Cloudflare Pages**: push to GitHub, connect in Cloudflare dashboard, done. Free HTTPS URL.
- **GitHub Pages**: Settings → Pages → Deploy from branch.
- **Local dev**: `python3 -m http.server 8080` then hit `http://localhost:8080`. Safari won't install a PWA from plain `http://`, but you can still develop and test there.

After deploying, **immediately add your deployed domain to the API key's HTTP referrer restrictions** in Google Cloud Console — the key is visible in the page's localStorage once set, and anyone viewing the site could extract it otherwise.

### 4. Install on the iPad

1. Open the site in **Safari** (Chrome on iOS can't install PWAs).
2. Share button → **Add to Home Screen** → Add.
3. Tap the icon — it opens full-screen, no browser chrome.

If you rename the app later and the home-screen tile still shows the old name, delete and re-add the shortcut — iOS captures the title at install time.

---

## How the app works

### Profiles

First launch seeds one profile called "Default". Tap the avatar in the header (top-right) any time to open the profile picker.

- **Picker screen**: big cards with an emoji avatar and name. Your kid taps theirs → enters the app. Everything after is filtered to their channel list.
- **Settings** (gear icon on the picker): add, edit, or delete profiles. Parent-gated.

Each profile has:
- Name (up to 30 chars)
- Emoji avatar (24 options) + avatar color (4 options)
- **Background color** for the whole app while this profile is active (6 options: cream, peach, blush, mint, sky, lavender)
- **Daily time limits** (see below)
- Own channel list

### The daily timer

A small pill next to the avatar tracks how long *this* profile has been watching today. It persists across app sessions and only ticks while the kid is in a content view (Latest / Channels) — browsing Settings or the picker doesn't count.

The pill changes color as the day's watch time grows:

- **Cream** (under the yellow limit) — all clear
- **Yellow** (warn limit) — nudging a limit
- **Red** (alert limit) — above the daily cap

Both limits are configurable per profile in the profile editor. Defaults: yellow at 20 min, red at 30 min. Counts reset at local midnight.

### The parent gate

Any parent-only action — opening Settings, adding a new profile from the picker — triggers a math challenge:

> **7 × 23 = ?**

Wrong answer shakes the modal and regenerates a new question. This isn't bulletproof, but it filters out the toddler/preschool range and matches what real kid apps use.

### Adding channels (in-app)

In a profile's editor, the "Add channel" input accepts:

- **Full URL**: `https://www.youtube.com/@markrober`
- **@handle**: `@markrober`
- **Raw channel ID**: `UCY1kMZp36IQSyNx_9h4mpCg`

The app resolves handles via `channels.list?forHandle=` and verifies IDs before saving, so you don't end up with dead entries.

### Randomize (per channel)

On any channel's detail page, tap **🔀 Randomize** to swap the recent-uploads list for a random selection from the channel's full history. The app deep-fetches up to 200 of the channel's uploads (~4 quota units), shuffles them, and shows 15 random picks.

Subsequent **Reshuffle** taps cost zero quota — the pool is cached in memory. Great for rediscovering older content instead of always watching the latest.

Randomize is **automatically disabled when daily quota usage is at 80% or higher** to prevent burning through the remaining budget. It'll re-enable at midnight Pacific when Google resets the quota.

### Quota tracking

Settings shows a live counter of today's YouTube API usage:

- Current units / 10,000 daily cap
- Progress bar in sage → mustard → coral as you approach the limit
- Call count for the day
- Resets at midnight Pacific (Google's reset time)

This counter is **local to each device**. If you share an API key across multiple iPads, the actual Google-side total is the sum of each device's counter.

### Per-profile cache

Each profile has its own video cache (60 min TTL), stored in localStorage. Switching kids doesn't mix their feeds. Adding or removing a channel invalidates that profile's cache automatically so the next view is fresh.

**"Clear all caches"** in Settings forces a full refetch on next load and also clears the in-memory randomize pools.

### Export / Import profiles

Settings → **Backup** has two buttons:

- **Export profiles** downloads `tooleytube-profiles-YYYY-MM-DD.json` containing all your profiles, their channel lists, limits, and background preferences.
- **Import profiles** reads a previously-exported JSON and gives you **Merge** (add alongside existing) or **Replace everything** (wipe current, use imported) options. Replace requires a second confirmation.

**The API key is deliberately not in the export.** Keys are tied to a specific domain via referrer restrictions and should be set fresh on each device. Daily timer counts and caches are also excluded — they're ephemeral.

Import validates every field before touching your data. Malformed entries are silently dropped rather than imported in a broken state.

---

## Honest caveats

- **Ads play.** YouTube's ToS require their embedded player, which shows ads. The only legit way to skip them is YouTube Premium on the account logged in on the iPad — embeds respect Premium ad-free on the signed-in device.
- **No algorithmic recommendations.** "Latest" is a date-sorted merge of recent uploads from the allowlist. Intentional — no rabbit hole — but means no discovery beyond what you've explicitly added and what Randomize can find.
- **End-of-video suggestions still show** as channel thumbnails (the `rel=0` param limits them to the same channel, but doesn't eliminate them). If it bothers you, swap the bare embed for the IFrame API and listen for `YT.PlayerState.ENDED` to auto-close.
- **localStorage lives on the device.** If you wipe Safari data or the iPad, profiles vanish. Use the **Export profiles** button periodically to keep a JSON backup.
- **Quota tracking is per-device.** Multi-device deployments sharing one key will under-count real usage on any single device.

---

## Locking down the iPad

- **Guided Access** (Settings → Accessibility → Guided Access) — triple-click side button while Tooleytube is open → locks iPad to that app. Unlock with your passcode. Great for handing it to a toddler.
- **Screen Time → App Limits** for daily time caps (in addition to Tooleytube's in-app limits).
- **Restrictions → Web Content** can block all other browsing if the iPad is dedicated to Tooleytube.

### Screen Time web content restrictions

If web content restrictions are enabled, videos will appear blank with no error shown. Go to **Settings → Screen Time → Content & Privacy Restrictions → Content Restrictions → Web Content** and add these domains to **Always Allow**:

| Domain | Purpose |
|---|---|
| Your app domain (e.g. `azurestaticapps.net`) | The PWA itself |
| `youtube-nocookie.com` | Embed player iframe |
| `youtube.com` | Player resources |
| `googlevideo.com` | Video stream delivery (CDN) |
| `ytimg.com` | Video thumbnails |
| `googleapis.com` | YouTube Data API |

If using **Allowed Websites Only** mode, all six must be added. If using **Limit Adult Websites**, add them to the Always Allow list only.

---

## Debugging

For local dev, Chrome DevTools against `python3 -m http.server 8080` is usually fastest — Application → Local Storage shows all the `tooleytube:*` keys (the storage keys kept the original name to preserve existing user data; see the source comment).

For VS Code integrated debugging, the included `.vscode/launch.json` has a Chrome launch profile. Press F5 to attach breakpoints against the editor.

For the installed iPad PWA, Web Inspector against Safari on a Mac is the only real option. See the in-app "Developer mode" discussion in past commits for a console overlay if you don't have a Mac handy.

### Useful console one-liners

```js
store                           // all profiles
activeProfile()                 // current profile object
getTodayQuota()                 // { date, units, calls }
Object.keys(localStorage).filter(k => k.startsWith('tooleytube:'))

// Preview timer colors
displayTimerSeconds(25 * 60);  // yellow
displayTimerSeconds(35 * 60);  // red

// Reset things
localStorage.removeItem('tooleytube:store:v2');           // nuke profiles
localStorage.removeItem('tooleytube:apikey:v1');          // remove API key
localStorage.removeItem('tooleytube:quota:v1');           // reset today's count
```