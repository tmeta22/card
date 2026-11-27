# CardYeung

CardYeung is a free-to-use loyalty wallet for Telegram. The public GitHub Pages site serves a landing page and a device-local sample wallet. The Node service serves the same interface and provides authenticated accounts, owner-managed programs, member balances, and a Telegram webhook.

## Run

Use Node.js 24 or newer. Run `npm install`, then `npm start` and open http://localhost:4173/. Run `npm test` to check the loyalty, authentication, recovery and admin flows. Storage is PostgreSQL when `DATABASE_URL` is set (production) and a local SQLite file otherwise (`DB_FILE`, default `wallet.sqlite`). The only runtime dependency is `pg`; set `TEST_DATABASE_URL` to run the tests against Postgres.

## Deploy to InstaCloud

InstaCloud provides the Postgres database and the container host. With the `insta` CLI signed in and linked to a project (`npx -y insta@latest agent setup --create`), run `deploy/instacloud.sh` from the repo root. It creates a Postgres service and an always-on compute service, binds `DATABASE_URL`, prompts for `BOT_TOKEN`, `WEBHOOK_SECRET`, `ADMIN_PASSWORD` and `BOT_USERNAME`, builds the `Dockerfile` remotely and deploys. Then set `APP_URL` to the printed URL, run `insta compute restart` and register the bot with `node server.mjs --configure-bot`. `/healthz` checks the database connection.

## Connect Telegram

1. Create a bot in BotFather. Store its token as the server environment variable `BOT_TOKEN`.
2. Deploy the Node service behind HTTPS. Set `APP_URL` to its HTTPS origin including a trailing slash, `BOT_USERNAME` to the bot's username without `@` (used for join links), `WEBHOOK_SECRET` to a randomly generated secret (at least 16 URL-safe characters), and `DATABASE_URL` to the Postgres connection string (`DB_FILE` is only for local SQLite). With Postgres the service can run more than one instance; with SQLite use a single instance on a persistent volume.
3. Start the service with `node server.mjs`. Run `node server.mjs --configure-bot` once with the same environment to register the webhook and wallet menu.
4. Start the bot in a private chat. The wallet button opens the authenticated mini app. Sending /wallet retrieves balances from the same database.
5. In Shop studio create a program and share the join code. Customers add it to their wallet. Enter a customer's member code to award a stamp or redeem their completed card.

GitHub Pages serves static files from main /docs. Live Telegram sessions must use the HTTPS Node service. Credentials belong only on the server. Browsing outside Telegram uses fictional sample shops and browser-local storage. Saved existing membership numbers are display-only. No subscriptions or merchant fees are implemented. Hosting costs depend on the operator's provider.

## Accounts, recovery and admin

Sign-up needs no form: the first time someone opens the mini app, their signed Telegram identity creates the account. A welcome sheet then issues a one-time **recovery code** (stored only as a salted scrypt hash). If the person loses their Telegram account, they open the app from a new one, choose *I already have an account* and enter the code; their cards, rewards and shops move over, the old account is retired and a new code is issued. Wrong guesses are limited to 8 an hour per account.

The admin portal is at `/admin/`. Set `ADMIN_PASSWORD` (12+ characters; optionally `ADMIN_SECRET` to sign the session cookie) on the server. It shows total, new and active users (24 h / 7 d / 30 d), shop owners, cards, stamps, redemptions, recovery adoption, daily sign-up and stamp charts, the newest users (Telegram IDs masked) and the top programs. Without `ADMIN_PASSWORD` it stays disabled.

## How shop owners use it

Owners need no separate app or account. Every Telegram user can open **Shop studio** in the same mini app.

1. **Create a program** – name, category, reward and stamps per reward (2–50). It is free; there are no printed cards.
2. **Share the join QR** – the QR icon on the program shows a Telegram deep link (`https://t.me/<bot>?startapp=<code>`) that adds the shop to a customer's wallet in one tap. Show it at the counter, share it in a chat or print it as a poster. Set `BOT_USERNAME` and enable the bot's *Main Mini App* in BotFather so the link opens the wallet; without it the QR carries the plain join code, which the in-app scanner also accepts.
3. **Stamp each visit** – the customer opens their card, which shows a QR of their member code. The owner taps **Scan customer** (Telegram's built-in scanner) or **Enter code**, sees the customer's progress, and awards a stamp or redeems a completed card with one tap. Only the program's owner can stamp or look up its members, and every change is idempotent so a double tap never double-stamps.
4. **Watch the numbers** – each program shows members, stamps given and rewards waiting to be redeemed.

Not built yet: staff accounts with their own permissions, push reminders to lapsed customers and multi-branch reporting.

## Card artwork

The card faces in docs/wallet/assets are rendered procedurally, so they can be regenerated and tuned: `node tools/render-art.cjs` (uses the Chromium that ships with Playwright). Each uses a real material: pebbled forest-green leather with stitching and gold-foil beans for coffee, brushed cobalt aluminium with a knurled grip for fitness, burgundy velvet curtains with marquee bulbs for entertainment, and a pearl-mint ceramic with iridescent guilloche for other. The interface uses a stacked-card layout with notched corners, a mint statistics panel and a floating dock.

Khmer is the default language. The landing page and mini app share a remembered language preference. In the bot, use /english or /khmer to switch reply language.
