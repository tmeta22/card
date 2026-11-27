#!/usr/bin/env bash
# One-time InstaCloud setup for CardYeung: Postgres + compute service, then deploy.
# Run from the repo root in your own terminal after `npx -y insta@latest agent setup --create`
# (or `insta login` and `insta link`). Secrets are typed at the prompts; they never enter the repo.
set -euo pipefail
insta services add postgres db
insta services add compute app --always-on          # the Telegram webhook must answer within seconds
insta secrets bind DATABASE_URL postgres/db --to compute/app
for name in BOT_TOKEN WEBHOOK_SECRET ADMIN_PASSWORD; do insta secrets set "$name"; done
insta secrets set BOT_USERNAME                       # bot username without @
insta deploy .
echo
echo "Next: copy the service URL printed above, then"
echo "  insta secrets set APP_URL      # the https URL with a trailing slash"
echo "  insta compute restart"
echo "  APP_URL=<url> BOT_TOKEN=<token> WEBHOOK_SECRET=<secret> node server.mjs --configure-bot"
