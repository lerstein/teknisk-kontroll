# RC Portal – technical inspection, Wolfpack and handbook for the MC club

Same stack as the club sales app: **Google Sheet** (storage) + **Apps Script** (API) + **GitHub Pages** (phone app).

| File | Goes where |
|---|---|
| `Code.gs` | Apps Script editor of a new Google Sheet |
| `index.html` | GitHub repo → GitHub Pages |

## 1. Sheet + backend

1. Create a new, empty Google Sheet (e.g. "Teknisk kontroll"). Don't reuse the sales sheet.
2. **Extensions → Apps Script**. Replace the contents of `Code.gs` with this `Code.gs`.
3. **Project Settings** (gear icon) → Time zone: `(GMT+01:00) Oslo`.
4. At the top of `Code.gs`, fill in:
   ```js
   ADMIN_TELEFON: '<your number>',
   ADMIN_NAVN: 'Magnus Lerstein',
   ADMIN_AVDELING: 'Fredrikstad',
   ```
5. Select the function `oppsett` → **Run** → approve permissions.
   The **Execution log** shows `Aktiveringskode: 123456`. Write it down.
   The sheet now has the tabs `Avdelinger`, `Brukere`, `Sykler`, `Kontroller` and `Egenerklaeringer`.
6. **Deploy → New deployment → Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
   Copy the URL (ends in `/exec`).

`oppsett()` is safe to run again, for example after an update that adds columns. It never deletes data.

## Updating an existing installation (e.g. the photo update)

1. Paste the new `Code.gs` over the old one (keep your `ADMIN_*` values).
2. Run `oppsett()` once. This adds the `Bilder` sheet and creates the Drive folder **Teknisk kontroll – bilder**. Google asks you to **approve access to Drive**, which is new.
3. **Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy.**
   This keeps the same `/exec` URL. Choosing "New deployment" instead would give a new URL.
4. Replace `index.html` on GitHub. Phones may need a refresh to pick it up.

## Photos

- Types: **Kilometerstand**, **Bilde m/avis** (also sets "Bilde m/avis levert = Ja") and **Andre bilder** (multiple at once). The egenerklæring has km and other photos.
- The phone scales photos down to max 1600 px JPEG before upload (typically 200–400 kB), so mobile data and Drive space are no problem.
- Files are saved in your Drive under `Teknisk kontroll – bilder/<avdeling>/`, named `<date> <regnr> <type>.jpg`. The `Bilder` sheet has a `fil_url` column for opening them directly.
- The files are **private**, with no public links. The app fetches them through the API using the same access rules as everything else.
- Photos can be added afterwards from the control/declaration view for 7 days (admins always). Deleting a control also moves its photos to the Drive trash.

## 2. Frontend

1. In `index.html`, set `const API_URL = 'https://script.google.com/macros/s/…/exec';`
2. Push it to a GitHub repo and enable Pages, the same way as for the sales app.
3. Open the page on your phone → **Første gang** → phone number + code + choose a password.
4. Add it to the home screen ("Legg til på Hjem-skjerm") and it behaves like an app.

## 3a. Importing all members at once

1. In the Google Sheet: **File → Import → Upload** `Medlemsimport.xlsx` → **Insert new sheet(s)**. You get the tabs `Import` and `Sjekk før import`.
2. Go through `Sjekk før import` and fix the `Import` tab where needed. Typical fixes: avdeling, rolle (`medlem` / `rc` / `admin`), and missing regnr.
3. In Apps Script, run `importerMedlemmer()`. The log shows how many members and bikes were created.
   With ~80 members this takes up to a minute, because every password is hashed.
4. Delete the `Import` and `Sjekk før import` tabs. They hold names and phone numbers you no longer need there.

The file also has the tabs `ImportKontroll` (the May paper forms) and `ImportEgen` (the April paper forms) from the Eastside workbook. `importerMedlemmer()` imports them as history after the members and bikes. It finds each bike by regnr and skips a form if that bike already has one with the same date.

Everyone gets a **unique start password** (column `passord`, e.g. `k7mx-p4rt`). **Passordliste.xlsx** has the same passwords sorted by avdeling, with a ready-to-copy SMS text per member. Paste the GitHub Pages address into the yellow cell, and every SMS text updates. Members log in with phone number + start password, and the app makes them choose their own before showing anything (`CFG.TVING_BYTTE`, on by default). Until they have done that, the member list shows **IKKE LOGGET INN**.
Rows without a password fall back to `CFG.MIDLERTIDIG_PASSORD`. Keep the password list private, and delete it once everyone has logged in.
Running the import again is safe: existing members (same phone) are skipped, and bikes are only added if the regnr is new.
If you use the import, `CFG.ADMIN_TELEFON` can be left empty, because the import file already makes you admin.

## 3. Adding people

- **Medlemmer → + Legg til medlem** gives a 6-digit code (valid for 14 days). **Send kode på SMS** opens the phone's SMS app with a ready-made message containing the link and the code.
- The member opens the link → **Første gang** → phone number + code + their own password.
- Forgotten password: RC opens the member → **Glemt passord – lag ny kode**.
- Locked out as admin: run `nyAdminKode()` in the Apps Script editor; the code appears in the log.

## Roles

| Role | Sees | Can do |
|---|---|---|
| `medlem` | own bikes, own controls and declarations | add own bikes, fill in egenerklæring, inspect own bike (needs RC approval) |
| `president` | everything in own avdeling (read-only) | same as `medlem` for his own bikes – cannot change anything for others |
| `rc` | everything in own avdeling | register controls, approve/correct/reject members' own inspections, add/edit members (role medlem) and bikes in own avdeling, delete own control within 24 h |
| `officer` | everything, all avdelinger | the same as `rc`, but only in own avdeling |
| `admin` | everything | everything, incl. setting roles and deleting any control |

You can also edit roles directly in the `Brukere` sheet (`medlem` / `president` / `rc` / `officer` / `admin`). Set `aktiv` to `Nei` to block someone.

### Members inspecting their own bike
Everyone can inspect his own bike from the bike page ("Inspect the bike yourself"). The inspection counts at once (status, warnings, Wolfpack km),
but is marked **PENDING** (`status` = `venter` in `Kontroller`). The chapter's RC (or an admin / the chapter's officer) opens it from
"Waiting for approval" on the overview and chooses **Approve**, **Correct and approve** (edit the answers first) or **Reject** with a short reason.
A rejected inspection (`status` = `avvist`) no longer counts anywhere; the member sees the reason on "Mine" for 60 days.
The member can withdraw his own inspection while it is pending. Inspections an RC registers are approved at once.
Columns `status`, `godkjent_av`, `godkjent_tid`, `avvist_grunn` are added to `Kontroller` automatically.

## Season, forms and scale

| Month | Form | Filled in by |
|---|---|---|
| April | **Egenerklæring** (self-declaration) | the member |
| May | **Stor kontroll** (full checklist: tyres, brakes, bearings, suspension, lights, drivetrain, oils, battery) | Road Captain |
| June–October | **Enkel kontroll** (Lys, Dekk, Bremser, Ramme, Motor, Allmenn tilstand) | Road Captain |

Each inspection is saved with its month (`maaned`, e.g. `2026-06`) and form type (`skjema`: `stor`/`enkel`). The RC can switch to the other form type for a single inspection, e.g. a full check of a new member's bike in July. If a month gets a second inspection (a re-check after a repair), the newest one counts as that month's status.

Scale: **0 = OK, 1 = Bør utbedres, 2 = Kjøreforbud**. Any item at 2 automatically sets kjøreforbud.

The overview shows a season strip per bike (A M J J A S O): green = OK, yellow = bør utbedres, red = kjøreforbud, dashed = missing for a month that has passed.

The `sum_*` columns in `Kontroller` make up the tilstandsrapport. For a quick inspection, they hold the RC's ratings directly. For a full inspection, they are the highest score in each group:

- **Lys**: nær, fjern, brems, blink f/b
- **Dekk**: foran, bak
- **Bremser**: foran, bak
- **Ramme**: hjullager f/b, foring baksving, styrelager, dempere f/b
- **Motor**: belt/kjede, plus at least 1 if any oil or the battery is "Ikke OK"
- **sum_allmenn**: highest of all (incl. `allmenn_tilstand` on quick inspections), or 2 if kjøreforbud

## Language

Everyone can choose **Norsk / English** on the login screen and under Konto/Account. The choice is remembered on that phone. Server error messages follow the same choice. The data in the sheet is the same regardless of language.

## Security notes

- Passwords are stored as salted, iterated SHA-256 hashes, never in plain text. Logins are HMAC-signed tokens valid for 90 days. Changing a password, getting a new code or being deactivated logs that user out everywhere.
- 5 failed attempts lock a phone number for 15 minutes.
- No names or numbers are in `index.html`, since GitHub Pages is public. All data comes from the API and only after login.
- The Sheet itself contains everything (incl. egenerklæring data). Share it only with admins.

## Renaming an avdeling

Change the name in `Avdelinger` **and** in the `avdeling` column of `Brukere` (find & replace). Old controls keep the name they were registered with.

## Follow-up, statistics and warnings

- **Overview → Til oppfølging** lists everything that needs attention in the chapter: riding bans, passed deadlines, bikes missing this month's inspection (with a **SMS** button per member that opens a ready-made reminder), health cards expiring within 60 days, and tyre/battery warnings.
- **Tyre and battery warnings** use the latest value registered for the bike: tyres 6 years or older, tread under 2 mm, battery 5 years or older. Tyre dates may be a year (`2023`, `04.2023`) or a DOT code (`3922` = week 39, 2022). The thresholds are `DEKK_MAKS_AAR`, `MONSTER_MIN` and `BATTERI_MAKS_AAR` in `index.html`.
- **Overview → Statistikk** shows how many members use the app, the share of bikes inspected per month per chapter, and the most common issues this year. RCs see their own chapter, admins the whole club.

## Feedback

Every page has a **Gi tilbakemelding** link that opens an SMS to `CFG.TILBAKEMELDING_TLF` with the sender's name, chapter and page filled in. If it is empty, the first administrator who has logged in is used. The link is hidden for that person.

## Backup

Menu **Teknisk kontroll → Slå på ukentlig backup** (or run `slaaPaBackup()`) copies the whole spreadsheet every Sunday night into the Drive folder **Teknisk kontroll – backup** and keeps the newest 8 copies (`CFG.BACKUP_BEHOLD`). **Ta backup nå** takes one immediately. To restore, open a backup copy and copy the sheets you need back.

## Home-screen icon

Upload `manifest.webmanifest`, `icon-180.png`, `icon-192.png` and `icon-512.png` next to `index.html` on GitHub. "Add to Home Screen" then gives a proper app icon and opens the app full screen. Phones that already added it need to remove and re-add it to get the new icon.

## Installing as an app

The app is a PWA: `manifest.webmanifest`, the icons and `sw.js` make it installable from the browser, with no app store.
- **Android, and Chrome/Edge on PC/Mac:** when the browser offers installation, a banner **Installer appen** appears at the top; one tap installs it.
- **iPhone/iPad and Safari on Mac:** Apple allows no install button, so the banner opens a short guide (Share → Add to Home Screen / File → Add to Dock).
- **Ikke nå** hides the banner for 30 days; it is always available under **Konto**. Once installed it disappears.
`sw.js` only handles page loads (and shows an offline message); API calls are never cached.

## Handbook (Road Rules and Hand Signals)

The **Håndbok** tab shows the club's road rules and hand signals in English. The content lives in the `HB` object in `index.html`, and the illustrations are in the `haandbok/` folder (`image1.jpg` … `image9.jpg`, max 960 px). Signals without an illustration show a placeholder. To add an image, put the file in `haandbok/` and set `img` on the signal. Note that GitHub Pages is public: the handbook text and images can be opened by anyone who knows the address.

Account settings moved from the bottom bar to the name/person icon at the top right, to make room for the Handbook tab.

## Vehicle lookup (Statens vegvesen) and owner's manuals

On the bike form, **Slå opp hos Statens vegvesen** fills in model, model year and VIN from the registration number. The model year is decoded from position 10 of the VIN; if the VIN is missing, the year of first registration is used.

Setup (one time):
1. vegvesen.no → *API for tekniske kjøretøyopplysninger* → **Bestill API-nøkkel**, log in with BankID as a private person. Approval is automatic.
2. Apps Script → **Project Settings** (gear) → **Script Properties** → **Add script property**: `VEGVESEN_API_KEY` = the key.
3. Paste the new `Code.gs`, **Save**, then run **testVegvesen** once (approve the new permission "Connect to an external service"). The log shows the result for the first bike.
4. **Deploy → Manage deployments → Edit → New version → Deploy.**

The key is only stored in Script Properties – never in `index.html` or the sheet. Results are cached for 6 hours. Without a key, the button shows a friendly message and the fields can be filled in by hand.

Endpoint: `GET https://www.vegvesen.no/ws/no/vegvesen/kjoretoy/felles/datautlevering/enkeltoppslag/kjoretoydata?kjennemerke=<regnr>` with header `SVV-Authorization: Apikey <key>`. The response fields (`merke`, `handelsbetegnelse`, `understellsnummer`, `registrertForstegangNorgeDato`) are found by name anywhere in the response, so small changes in the structure don't break it.

**Finn eierhåndbok** on the bike page opens a search for the owner's manual on Harley-Davidson's own Service Information Portal (other makes: a general search). There is no official direct-link format, so it is a search, not a direct download.

## Phone list
The phone button in the header opens the club's phone list. It is read live from the club's own sheet
(`CFG.TELEFONLISTE_ID`, tab `CFG.TELEFONLISTE_ARK` = "Telefonliste BMC") and cached for 10 minutes, so changes there show up in the app by themselves.
Only chapter, clubhouse address, club phone, status, name and phone are read – birthdays, e-mail and licences are not.
The list is only sent to logged-in users. The account that owns the Apps Script must be able to open that sheet.
Run **Teknisk kontroll → Test telefonlisten** once after updating to approve access and see what the app reads.
Layout expected: column B = "BMC <chapter>" heading followed by address lines and "Telefon : …", C = status, E = name, G = phone.

## Calendar
"Coming up" on the overview and on "Mine" shows the next three events from the club's Google Calendars; "Full calendar"
lists everything for the next 180 days, and each event can be added to the phone's own calendar (.ics).
Set the calendars in `CFG.KALENDERE` in Code.gs: `id` is the Calendar ID (calendar → Settings and sharing → Integrate calendar),
`avdelinger: []` means everyone sees it, otherwise only members of the chapters listed – whatever their role.
The account that owns the Apps Script must have at least "See all event details" on each calendar.
Run **Teknisk kontroll → Test kalenderne** once after updating to approve calendar access and check what the app reads.
Nothing is ever sent to members – the calendar is read-only in the app. Results are cached for 10 minutes.

## Find a bike from a photo of the plate
On the overview there is a search field (reg. no., name or model) and a camera button. The camera button takes a photo of the
licence plate or picks one from the photo library; the app first looks for the white plate in the picture (also two-line MC plates), then reads it on the phone with Tesseract.js (loaded from cdn.jsdelivr.net the first time, a few MB) and matches
it against the bikes the user can see, allowing for typical misreadings (O/0, I/1, S/5, B/8 …). A sure match opens the bike;
otherwise the closest bikes are shown in the list. If the centre of the picture gives no sure match, the whole picture is read. The photo never leaves the phone. Works best when the plate fills the picture.
On iPhone, the search field also supports the keyboard's built-in "Scan Text".
