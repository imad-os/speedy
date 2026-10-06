# Speedy

Lightweight project for fetching subtitles and organizing media links.

## Live demo
http://speedy.geekspro.us/

## Features
- Fetch subtitles from cloud endpoints
- Simple UI expectations (loader, sorting)
- Minimal and fast design

## API endpoints (mirrors)
- https://ff.geekspro.us/getLocation/



## Samsung TV compatibility notes
- `css/tailwind.css` is **generated**. The Tailwind v4 output (`tools/tailwind.src.css`) uses CSS
  nesting, range media queries, `oklch()` and `@layer`, which older Tizen engines drop (screens
  overflow). After regenerating Tailwind, down-level it:
  `npm i lightningcss postcss && node tools/compat-css.mjs tools/tailwind.src.css css/tailwind.css`
- Voice Guide (TTS): never put `aria-hidden` on `<body>`. Icon-only controls use
  `data-i18n-aria-label`, decorative icons are hidden by `js/core/a11y.js`.
- Firebase and QRCode libraries are bundled in `js/libs/` (no CDN needed at startup).

## TODO
- Add sorting by rating and by year


BUUUG

url ERROR when modal AR is visible , the focus stay still on  QR modal
errror modal should be first served in focusManager

check error management at first sratt when QR modal is on



onsubtitl soft  restart :
it doesnot keep tracks audio and subitle
it deos not show connecting or loaders

readd error handling onError


onprevhyw loader spect



clear overlay values on start preview or full


hide subtitle and settings button in overly for live




DONE : [TR][Basic Fuction][VPN/Out network][ATSC] The language change does not apply in all the UI
Open | B | 2025-12-29 | Resolve
TOTEST : [TR][Playback][VPN/Out network][ATSC] Content does not resume after connect the network
Open | B | 2025-12-29 | Resolve
TOTEST : [TR][Playback][VPN/Out network][ATSC] There is no network pop up
Open | B | 2025-12-29 | Resolve
TOIMPLEMENT :[TR][Trick Play][VPN/Out network][ATSC] Trick play do not work
Open | B | 2025-12-29 | Resolve
DONE :[TR][Basic Fuction][VPN/Out network][ATSC] TTS works in the app
Open | B | 2025-12-29 | Resolve
25TV_PREMIUM4 (Tizen 9.0)

