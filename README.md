# BukatanaHUB Cash Flow Tracker

A small logging + overview tool for tracking company cash held across several
people's personal accounts, backed by a Google Sheet.

**Stack:** static HTML/CSS/JS (hosted free on GitHub Pages) → Google Apps
Script Web App (free API layer) → Google Sheet (free database).

## How the numbers work

- **Cash In** by a person increases the company's total cash and increases
  that person's balance (they're now holding company money).
- **Cash Out** by a person decreases the company's total cash and decreases
  that person's balance (they spent from what they were holding — if they
  spend more than they've taken in, their balance goes negative, meaning the
  company owes them).
- **Transfers** move balance from one person to another with no effect on
  the company total (money just changes hands internally).
- **Total cash on hand** = all Cash In − all Cash Out (all-time). This
  always equals the sum of everyone's individual balance.

## 1. Set up the Google Sheet

Use the Sheet you already have, in your shared Drive folder. You don't need
to pre-build the tabs — the script creates `Transactions` and `Transfers`
automatically the first time it runs, with headers. If you'd rather create
them yourself first:

- **Transactions**: Timestamp, Date, Type, Person, Amount, Event, Category, Notes
- **Transfers**: Timestamp, Date, From, To, Amount, Notes

## 2. Deploy the Apps Script backend

1. In the Sheet, open **Extensions → Apps Script**.
2. Delete any starter code and paste in the contents of `apps-script/Code.gs`.
3. Click **Deploy → New deployment**.
4. Click the gear icon next to "Select type" and choose **Web app**.
5. Set **Execute as: Me**, **Who has access: Anyone**.
6. Click **Deploy**, authorize when prompted, and copy the **Web app URL**
   (ends in `/exec`).

Whenever you edit `Code.gs` later, use **Deploy → Manage deployments → Edit
→ New version** so the URL keeps working.

## 3. Deploy the frontend on GitHub Pages

1. Push this whole folder to a GitHub repo.
2. In the repo, go to **Settings → Pages**.
3. Under "Build and deployment", set **Source: Deploy from a branch**,
   branch `main`, folder `/ (root)`. Save.
4. GitHub gives you a URL like `https://yourname.github.io/reponame/`.

## 4. Connect the app to your Sheet

Open your GitHub Pages URL. On first load it'll prompt you for the data
source — paste the Web app URL from step 2. It's saved in that browser only
(not in the repo), so each person entering data does this once on their own
device/browser. Click the **⚙** button in the top bar any time to change it.

## Customizing

- **People / categories / currency**: edit `config.js`.
- **Colors / fonts**: edit `style.css` (`:root` variables at the top).

## Optional: light protection

Because GitHub Pages (on a free/public repo) is publicly visible, anyone who
finds your Apps Script URL could technically post entries to your Sheet —
there's no real authentication layer in a purely static + Apps Script setup.
For an internal tool this is usually an acceptable risk, but if you want a
speed bump: set `SHARED_PIN` in `Code.gs` to some short string, redeploy,
and add `pin: "that string"` to the payloads in `log.js`. This isn't real
security (the PIN would still be visible in your public repo's source) — it
just filters out casual/automated noise, not a determined person.
