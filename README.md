# Phantom — installable app

Two ways to run it.

## 1. Fastest: single file
Open `phantom-standalone.html` on any device. Everything is inlined — no internet
needed after the fonts load. AirDrop it to your phone and open in Safari.

## 2. Real installed app (home screen icon, fullscreen, offline)
An installable PWA needs to be served over https. Pick one:

**Netlify Drop (30 seconds, free)**
1. Go to app.netlify.com/drop
2. Drag this whole folder onto the page
3. Open the URL it gives you on your phone

**GitHub Pages**
1. Push these files to a repo
2. Settings → Pages → deploy from main branch, root
3. Open the URL

**Local test on your computer**
```
python3 -m http.server 8080
```
then visit http://localhost:8080

### Installing to your home screen
- **iPhone:** open the URL in Safari → Share → Add to Home Screen
- **Android:** Chrome → menu → Install app

You get the ghost icon, no browser chrome, and it works with no signal.
Balances, trades and positions are saved to the device.

## 3. Native App Store build (optional)
```
npm install -D @capacitor/cli @capacitor/core @capacitor/ios @capacitor/android
npx cap init Phantom com.yourname.phantom --web-dir=.
npx cap add ios        # needs a Mac + Xcode
npx cap add android    # needs Android Studio
npx cap open ios
```
Sideloading to your own iPhone via Xcode is free (app expires every 7 days).
App Store distribution needs a $99/yr Apple Developer account — and note that
Apple rejects apps impersonating existing brands, so ship it under your own name.

## Files
- `index.html` + `app.js` + `styles.css` — the app
- `manifest.webmanifest` — name, icon, standalone display
- `sw.js` — service worker, caches everything for offline
- `icon-*.png` — app icons
- `phantom-standalone.html` — everything in one file
