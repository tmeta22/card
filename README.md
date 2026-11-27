# CardYeung

CardYeung is a free-to-use loyalty wallet for Telegram. The public GitHub Pages site serves a landing page and a device-local sample wallet. The Node service serves the same interface and provides authenticated accounts, owner-managed programs, member balances, and a Telegram webhook.

## Run

Use Node.js 24 or newer. Run `npm start` and open http://localhost:4173/. Run `npm test` to check the loyalty and authentication flows. The application has no third-party npm dependencies.

## Connect Telegram

1. Create a bot in BotFather. Store its token as the server environment variable `BOT_TOKEN`.
2. Deploy the Node service behind HTTPS. Set `APP_URL` to its HTTPS origin including a trailing slash, `WEBHOOK_SECRET` to a randomly generated secret (at least 16 URL-safe characters), and `DB_FILE` to a path on a persistent volume. Use a single service instance with persistent SQLite storage and backups.
3. Start the service with `node server.mjs`. Run `node server.mjs --configure-bot` once with the same environment to register the webhook and wallet menu.
4. Start the bot in a private chat. The wallet button opens the authenticated mini app. Sending /wallet retrieves balances from the same database.
5. In Shop studio create a program and share the join code. Customers add it to their wallet. Enter a customer's member code to award a stamp or redeem their completed card.

GitHub Pages serves static files from main /docs. Live Telegram sessions must use the HTTPS Node service. Credentials belong only on the server. Browsing outside Telegram uses fictional sample shops and browser-local storage. Saved existing membership numbers are display-only. No subscriptions or merchant fees are implemented. Hosting costs depend on the operator's provider.

## Card artwork

Built-in ImageGen created the three photographic backgrounds in docs/wallet/assets. The prompt called for full-bleed, text-free commercial photography with each subject on the right and dark space for lettering on the left: a forest-green cappuccino, cobalt hex dumbbells, and burgundy cinema popcorn.
