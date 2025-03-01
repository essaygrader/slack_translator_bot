require('dotenv').config();
const { App } = require('@slack/bolt');
const { translateToAllLanguages, getLanguageName } = require('./translator');
const { parseCommaSeparatedList, parseBoolean, logError, debug } = require('./utils');
const { isTranslationEnabled, enableTranslation, disableTranslation, toggleTranslation } = require('./channelPreferences');

// Initialize the Slack app
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
  customRoutes: [
    {
      path: '/health',
      method: ['GET'],
      handler: (req, res) => {
        res.writeHead(200);
        res.end(JSON.stringify({
          status: 'ok',
          timestamp: new Date().toISOString(),
          uptime: process.uptime()
        }));
      },
    },
  ],
});

// Store processed message IDs to avoid duplicate translations
const processedMessages = new Set();

// Command to enable translations in a channel
app.command('/translate-on', async ({ command, ack, respond }) => {
  await ack();
  
  try {
    enableTranslation(command.channel_id);
    await respond({
      text: '✅ Translations have been *enabled* for this channel.',
      response_type: 'in_channel'
    });
  } catch (error) {
    logError('Error enabling translations', error);
    await respond({
      text: `❌ Error enabling translations: ${error.message}`,
      response_type: 'ephemeral'
    });
  }
});

// Command to disable translations in a channel
app.command('/translate-off', async ({ command, ack, respond }) => {
  await ack();
  
  try {
    disableTranslation(command.channel_id);
    await respond({
      text: '🚫 Translations have been *disabled* for this channel.',
      response_type: 'in_channel'
    });
  } catch (error) {
    logError('Error disabling translations', error);
    await respond({
      text: `❌ Error disabling translations: ${error.message}`,
      response_type: 'ephemeral'
    });
  }
});

// Command to toggle translations in a channel
app.command('/translate-toggle', async ({ command, ack, respond }) => {
  await ack();
  
  try {
    const newStatus = toggleTranslation(command.channel_id);
    await respond({
      text: newStatus 
        ? '✅ Translations have been *enabled* for this channel.'
        : '🚫 Translations have been *disabled* for this channel.',
      response_type: 'in_channel'
    });
  } catch (error) {
    logError('Error toggling translations', error);
    await respond({
      text: `❌ Error toggling translations: ${error.message}`,
      response_type: 'ephemeral'
    });
  }
});

// Command to check translation status
app.command('/translate-status', async ({ command, ack, respond }) => {
  await ack();
  
  try {
    const status = isTranslationEnabled(command.channel_id);
    await respond({
      text: status 
        ? '✅ Translations are currently *enabled* for this channel.'
        : '🚫 Translations are currently *disabled* for this channel.',
      response_type: 'in_channel'
    });
  } catch (error) {
    logError('Error checking translation status', error);
    await respond({
      text: `❌ Error checking translation status: ${error.message}`,
      response_type: 'ephemeral'
    });
  }
});

// Listen for message events
app.event('message', async ({ event, client }) => {
  try {
    // Skip messages from the bot itself
    if (event.bot_id || event.user === app.botId) {
      return;
    }
    
    // Skip messages that have already been processed
    const messageId = `${event.channel}-${event.ts}`;
    if (processedMessages.has(messageId)) {
      return;
    }
    processedMessages.add(messageId);
    
    // Clean up the processed messages set periodically to prevent memory leaks
    setTimeout(() => {
      processedMessages.delete(messageId);
    }, 3600000); // 1 hour
    
    // Skip messages without text
    if (!event.text || event.text.trim() === '') {
      return;
    }
    
    // Check if translations are enabled for this channel
    if (!isTranslationEnabled(event.channel)) {
      debug('Translations disabled for channel', event.channel);
      return;
    }
    
    debug('Processing message', event);
    
    // Translate the message to all supported languages
    const translations = await translateToAllLanguages(event.text);
    
    // Format and post translations
    const formattedTranslations = formatTranslations(translations);
    
    // Message posting configuration
    const messageConfig = {
      channel: event.channel,
      text: formattedTranslations,
      unfurl_links: false,
      unfurl_media: false,
    };
    
    // If the message is in a thread, post in the same thread
    if (event.thread_ts) {
      messageConfig.thread_ts = event.thread_ts;
    }
    
    // Post the translations
    await client.chat.postMessage(messageConfig);
  } catch (error) {
    logError('Error processing message', error);
  }
});

// Format translations for Slack message
function formatTranslations(translations) {
  const supportedLanguages = parseCommaSeparatedList(process.env.SUPPORTED_LANGUAGES, ['en']);
  
  return Object.entries(translations)
    .filter(([lang]) => supportedLanguages.includes(lang))
    .map(([lang, text]) => `*${getLanguageName(lang)}*: ${text}`)
    .join('\n\n');
}

// Start the app
(async () => {
  try {
    const port = process.env.PORT || 3000;
    await app.start(port);
    console.log(`⚡️ Slack Translator Bot is running on port ${port}!`);
    console.log(`Health check available at http://localhost:${port}/health`);
    
    const supportedLanguages = parseCommaSeparatedList(process.env.SUPPORTED_LANGUAGES, ['en']);
    console.log(`Supported languages: ${supportedLanguages.join(', ')}`);
    
    if (parseBoolean(process.env.DEBUG)) {
      console.log('Debug mode: ENABLED');
    }
    
    console.log('Translation commands available:');
    console.log('  /translate-on - Enable translations in a channel');
    console.log('  /translate-off - Disable translations in a channel');
    console.log('  /translate-toggle - Toggle translations in a channel');
    console.log('  /translate-status - Check if translations are enabled');
  } catch (error) {
    logError('Failed to start the app', error);
    process.exit(1);
  }
})(); 