# vsts-octobot

A GitHub App built with [probot](https://github.com/probot/probot) that links GitHub Enterprise and VSTS

## Usage



## Deploy your own

1. Create [a new GitHub app](https://github.com/settings/apps/new)
1. Clone the repository
1. Create and configure a `.env` file in the root directory as explained below
1. Install and run Redis using a persistent configuration
1. Update the dependencies with `npm install`
1. Run with `npm start`

#### Content of the `.env` file 
- `APP_ID`: the id of the GitHub app generated when registering the new GitHub App
- `WEBHOOK_SECRET`: the optional Webhook secret set during the registration of the new GitHub App
- `BASE_URL`: The URL at which VSTS will post back events. Exemple: `http://yourserver:3000/` or `https://yourname.localtunnel.me`
- `FERNET_SECRET`: The secret used to encode and securely store the VSTS tokens. You can create a secret with `dd if=/dev/urandom bs=32 count=1 2>/dev/null | openssl base64`.
- `LOG_LEVEL`: Set to `trace` or `info` to get more outputs.
- `SUBDOMAIN`: Subdomain to use for localtunnel server. Defaults to your local username.
- `REDIS_URL`: URL to connect to Redis in the shape of `[redis:]//[[user][:password@]][host][:port][/db-number][?db=db-number[&password=bar[&option=value]]]`. Do not set if you want to use the default values (localhost unauthenticated).
