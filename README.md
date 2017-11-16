# vsts-octobot
[![Build Status](https://travis-ci.org/helaili/vsts-octobot.svg?branch=master)](https://travis-ci.org/helaili/vsts-octobot)


A GitHub App built with [probot](https://github.com/probot/probot) that links GitHub Enterprise and VSTS.
It triggers a VSTS build when a commit is pushed to a pull request and updates its status.

## Usage

1. Generate a VSTS token from `https://<whatever.visualstudio.com>/_details/security/tokens` with authorized scopes *Build (read and execute)* and *Service Endpoints (read, query and manage)*. Copy the generated token.
1. [Install VSTS-Octobot](https://github.com/apps/vsts-octobot/installations/new) on one or several repositories.
1. Provide the VSTS token when asked.
1. Commit a '.github/vsts-octobot.yml' file in the repositories which have been selected. See below for details on the content of this file.

#### Content of the `.github/vsts-octobot.yml` file

The content of this file can be easily populated by looking at the URL of your build definition page, which looks like `https://whatever.visualstudio.com/SpidersFromMars/_build/index?context=mine&path=%5C&definitionId=5&_a=completed`

- `instance`: The server name of your VSTS instance (`whatever.visualstudio.com` in the example above).
- `collection`: The collection your project belongs to. It is most likely `DefaultCollection`.
- `project`: The name of your project (`SpidersFromMars` in the example above).
- `buildDefinition`: The id of the build definition which will be triggered (`5` in the example above).

## Deploy your own

:wip: Note that there is a bug in a dependency which needs to be fixed before you can run your own instance. See Microsoft/vsts-node-api#125 :wip:

1. Create [a new GitHub app](https://github.com/settings/apps/new).
1. Clone the repository.
1. Create and configure a `.env` file in the root directory as explained below.
1. Install and run Redis using a persistent configuration.
1. Update the dependencies with `npm install`.
1. Run with `npm start`.

#### Content of the `.env` file
- `APP_ID`: the id of the GitHub app generated when registering the new GitHub App
- `WEBHOOK_SECRET`: the optional Webhook secret set during the registration of the new GitHub App
- `BASE_URL`: The URL at which VSTS will post back events. Exemple: `http://yourserver:3000/` or `https://yourname.localtunnel.me`
- `FERNET_SECRET`: The secret used to encode and securely store the VSTS tokens. You can create a secret with `dd if=/dev/urandom bs=32 count=1 2>/dev/null | openssl base64`.
- `LOG_LEVEL`: Set to `trace` or `info` to get more outputs.
- `SUBDOMAIN`: Subdomain to use for localtunnel server. Defaults to your local username.
- `REDIS_URL`: URL to connect to Redis in the shape of `[redis:]//[[user][:password@]][host][:port][/db-number][?db=db-number[&password=bar[&option=value]]]`. Do not set if you want to use the default values (localhost unauthenticated).
