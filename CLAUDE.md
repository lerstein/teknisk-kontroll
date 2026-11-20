# RC Portal – frontend

Web app (PWA) for Road Captains and members: monthly technical inspection of the club's bikes (main purpose),
plus calendar with sign-up, Wolfpack/Camino, phone list, RC book/Blog, handbook and documents.
Live at **rcportal.mooo.com** (GitHub Pages from this repo, `CNAME`).

**This repo is public.** Never put sheet IDs, calendar IDs, phone numbers, member data or the club fonts here.
The Apps Script backends live in the **private** repo `lerstein/rcportal-backend` – read its `CLAUDE.md` before any backend change.

## Layout

- `index.html` – the whole app (HTML, CSS, JS in one file). Texts in `TXT.no` / `TXT.en`; the user picks the language.
- `KLUBBER` (top of the script) – one entry per club, each with its own backend `/exec` URL:
  `bmc` Bandidos MC Norway, `cmc` Camaradas MC, `imc` Inmortales MC. There is no club picker:
  login tries the clubs in turn (last used first). `tekst` rewrites wording per club (Wolfpack → Camino, RC book → Blog, Road Captain → Road King for CMC).
- `api(action, data)` – POST to the active club's backend. Every action must exist in all three backends,
  or the frontend must cope with it missing.
- `haandbok/` – images for the hand-signal / pack-riding handbook (kept in English).
- `sw.js`, `manifest.webmanifest`, `icon-*.png` – PWA install; logos and wordmarks per club.

## Decisions to keep

- Keep the app simple – many members are not tech-savvy. Main purpose is inspection and follow-up; the rest are add-ons.
- No automatic messages to ordinary members; RCs send messages manually.
- Scale: 0 OK, 1 Bør utbedres, 2 Kjøreforbud. Season April–October (April self-declaration, May full inspection, June–October quick inspection).
- Calendar: Jubileer and Bursdager are markers (no sign-up). Every other event has sign-up with Deltar/Kanskje/Avslår,
  and members who answer Deltar can add guests (stepper appears only after Deltar).
- Chapter calendars are visible only to that chapter (enforced in the backend). Camaradas never sees Eastside (Bandidos Fredrikstad).
- Installed from the browser (home screen/Dock); no App Store.
- RC/officer and secretaries (position in the phone list) can answer events for members of their own chapter; admin for anyone.
  Admin registers attendance (Kalender → Oppmøte, or the button in an event). Vaktlister: button on the calendar when the backend sends lists.

## Working on it

1. Make the change in `index.html`, check the script parses (e.g. `node -e "new Function(...)"` on the `<script>` block).
2. If it needs backend changes, do those first in all affected backends (see `rcportal-backend/CLAUDE.md`) – the frontend must not call an action that isn't deployed.
3. Commit and push to `main`; GitHub Pages updates within a minute or two.
4. Verify on rcportal.mooo.com in Magnus's Chrome (Claude in Chrome), e.g. `await api('kalender')` in the console.
