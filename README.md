# vsts-octobot

A GitHub App built with [probot](https://github.com/probot/probot) that links GitHub Enterprise and VSTS

## Setup

Create a secret with `dd if=/dev/urandom bs=32 count=1 2>/dev/null | openssl base64` and set the `FERNET_SECRET` variable in the `.env` file

```
# Install dependencies
npm install

# Run the bot
npm start
```

See [docs/deploy.md](docs/deploy.md) if you would like to run your own instance of this app.
