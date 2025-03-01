# Slack Translator Bot

A Slack bot that automatically translates messages in channels and threads to multiple languages using Google Gemini AI.

## Features

- Translates messages in Slack channels to multiple languages
- Posts translations directly in the channel for regular messages
- Supports translation in threads by posting within the same thread
- Configurable supported languages via environment variables
- Channel-level control to enable/disable translations
- Powered by Google Gemini AI for high-quality translations

## Prerequisites

- Node.js (v14 or higher)
- A Slack workspace with permission to add apps
- Google Gemini API key

## Setup

1. **Clone this repository**

```bash
git clone <repository-url>
cd slack-translator
```

2. **Install dependencies**

```bash
npm install
```

3. **Create a Slack App**

You have two options to create your Slack app:

**Option 1: Using the App Manifest**
- Go to [Slack API](https://api.slack.com/apps) and click "Create New App"
- Select "From an app manifest"
- Choose your workspace
- Copy and paste the contents of `slack-manifest.yaml` from this repository
- Click "Create"
- Under "Basic Information", copy the Signing Secret
- Go to "Socket Mode" and click "Enable Socket Mode"
- Generate an App-Level Token with the `connections:write` scope and copy it
- Go to "OAuth & Permissions" and click "Install to Workspace"
- After installation, copy the Bot User OAuth Token (starts with `xoxb-`)

**Option 2: Manual Setup**
- Go to [Slack API](https://api.slack.com/apps) and create a new app
- Under "OAuth & Permissions", add the following bot token scopes:
  - `channels:history`
  - `channels:read`
  - `chat:write`
  - `groups:history`
  - `groups:read`
  - `im:history`
  - `im:read`
  - `mpim:history`
  - `mpim:read`
  - `reactions:read`
  - `reactions:write`
- Install the app to your workspace
- Copy the Bot User OAuth Token (starts with `xoxb-`)
- Under "Basic Information", copy the Signing Secret
- Enable Socket Mode and get an App-Level Token (starts with `xapp-`)

4. **Get a Google Gemini API Key**

- Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
- Create a new API key

5. **Configure environment variables**

- Copy `.env.example` to `.env`
- Fill in your Slack tokens and Google Gemini API key
- Configure the supported languages (comma-separated language codes)
- Optionally change the Gemini model (default is gemini-pro)

```bash
cp .env.example .env
# Edit .env with your tokens and settings
```

6. **Start the bot**

```bash
npm start
```

## Deploying to Heroku

You can deploy this bot to Heroku to run it 24/7:

1. **Create a Heroku account and install the Heroku CLI**

2. **Login to Heroku and create a new app**

```bash
heroku login
heroku create your-app-name
```

3. **Set up environment variables on Heroku**

```bash
heroku config:set SLACK_BOT_TOKEN=xoxb-your-token
heroku config:set SLACK_SIGNING_SECRET=your-signing-secret
heroku config:set SLACK_APP_TOKEN=xapp-your-app-token
heroku config:set GEMINI_API_KEY=your-gemini-api-key
heroku config:set GEMINI_MODEL=gemini-pro
heroku config:set SUPPORTED_LANGUAGES=en,es,fr,de
```

4. **Deploy to Heroku**

```bash
git push heroku main
```

5. **Verify the app is running**

```bash
heroku logs --tail
```

### Troubleshooting Heroku Deployment

If you encounter an R10 boot timeout error (Web process failed to bind to $PORT within 60 seconds of launch), make sure:

1. Your application is correctly binding to the port provided by Heroku via the `PORT` environment variable
2. You're not using a hardcoded port number in your application
3. The application is properly starting both the Slack socket mode connection and an HTTP server that binds to the port

The bot uses Socket Mode to connect to Slack, but Heroku requires a web process that binds to a port. The application handles this by running both the Socket Mode connection and a simple HTTP server.

## Usage

1. Invite the bot to any channel where you want translations to happen
2. The bot will automatically translate any message posted in those channels
3. Translations will be posted directly in the channel for regular messages
4. For messages in threads, translations will be posted within the same thread

### Controlling Translations

You can control translations in each channel using the following slash commands:

- `/translate-on` - Enable translations in the current channel
- `/translate-off` - Disable translations in the current channel
- `/translate-toggle` - Toggle translations on/off in the current channel
- `/translate-status` - Check if translations are currently enabled

These commands affect the entire channel, not individual users. By default, translations are enabled for all channels where the bot is added.

## Supported Languages

Configure the languages you want to support in the `.env` file using the `SUPPORTED_LANGUAGES` variable. Use comma-separated language codes.

Example:
```
SUPPORTED_LANGUAGES=en,es,fr,de,ja,zh,uk
```

Common language codes:
- `en` - English
- `es` - Spanish
- `fr` - French
- `de` - German
- `it` - Italian
- `ja` - Japanese
- `ko` - Korean
- `zh` - Chinese (Simplified)
- `ru` - Russian
- `pt` - Portuguese
- `ar` - Arabic
- `uk` - Ukrainian

## Troubleshooting

### Bot not responding to messages
- Make sure the bot is invited to the channel
- Check that your Slack tokens are correct in the `.env` file
- Verify that Socket Mode is enabled in your Slack app settings
- Check the console logs for any error messages

### Translation issues
- Ensure your Google Gemini API key is valid
- Check that the language codes in `SUPPORTED_LANGUAGES` are valid ISO 639-1 codes
- Enable DEBUG=true in your `.env` file to see more detailed logs

## Extending the Bot

### Adding more languages
- Add new language codes to the `SUPPORTED_LANGUAGES` variable
- Add corresponding language names in the `languageNames` object in `src/translator.js`

### Customizing translation behavior
- Modify the prompt templates in `src/translator.js` to customize how translations are generated
- Adjust the formatting of translations in the `formatTranslations` function in `src/app.js`

## Configuration Options

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SLACK_BOT_TOKEN` | Bot User OAuth Token from Slack | Required |
| `SLACK_SIGNING_SECRET` | Signing Secret from Slack | Required |
| `SLACK_APP_TOKEN` | App-Level Token for Socket Mode | Required |
| `GEMINI_API_KEY` | Google Gemini API Key | Required |
| `GEMINI_MODEL` | Google Gemini model to use | gemini-pro |
| `SUPPORTED_LANGUAGES` | Comma-separated language codes | en,es,fr,de,ja,zh |
| `DEBUG` | Enable debug logging | false |

### Available Gemini Models

You can specify which Gemini model to use by setting the `GEMINI_MODEL` environment variable:

- `gemini-pro` - Good general-purpose model (default)
- `gemini-1.5-pro` - Newer model with improved capabilities
- `gemini-1.5-flash` - Faster, more efficient model

For the latest available models, check the [Google AI documentation](https://ai.google.dev/models/gemini).

## License

MIT 