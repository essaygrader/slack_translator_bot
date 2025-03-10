require('dotenv').config();
const { App } = require('@slack/bolt');
const { translateToAllLanguages, getLanguageName } = require('./translator');
const { parseCommaSeparatedList, parseBoolean, logError, debug } = require('./utils');
const { 
  isTranslationEnabled, 
  enableTranslation, 
  disableTranslation, 
  toggleTranslation,
  setChannelLanguages,
  getChannelLanguages
} = require('./channelPreferences');
const http = require('http');

// Initialize the Slack app
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
  // Remove customRoutes as we'll handle this with a separate HTTP server
});

// Create a simple HTTP server for Heroku
const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200);
    res.end(JSON.stringify({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    }));
  } else {
    res.writeHead(200);
    res.end('Slack Translator Bot is running!');
  }
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

// Command to set languages for a channel
app.command('/translate-languages', async ({ command, ack, respond }) => {
  await ack();
  
  try {
    const languages = parseCommaSeparatedList(command.text);
    
    if (languages.length === 0) {
      await respond({
        text: '❌ Please specify at least one language code. Example: `/translate-languages es,fr,de`',
        response_type: 'ephemeral'
      });
      return;
    }
    
    setChannelLanguages(command.channel_id, languages);
    
    const languageNames = languages.map(lang => getLanguageName(lang)).join(', ');
    await respond({
      text: `✅ Channel languages set to: ${languageNames}`,
      response_type: 'in_channel'
    });
  } catch (error) {
    logError('Error setting channel languages', error);
    await respond({
      text: `❌ Error setting channel languages: ${error.message}`,
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
    
    // Check if message contains +t flag or if translations are enabled for this channel
    if (!event.text.includes('+t') && !isTranslationEnabled(event.channel)) {
      debug('Translations disabled for channel and no +t flag found', event.channel);
      return;
    }
    
    // Remove the +t flag from the text if present
    const textToTranslate = event.text.replace('+t', '').trim();
    
    debug('Processing message', event);
    
    // Get channel-specific languages or use default supported languages
    const channelLanguages = getChannelLanguages(event.channel);
    const languagesToUse = channelLanguages || parseCommaSeparatedList(process.env.SUPPORTED_LANGUAGES, ['en']);
    
    // Translate the message to specified languages
    const translations = await translateToAllLanguages(textToTranslate, languagesToUse);
    
    // Format and post translations
    const formattedTranslations = formatTranslations(translations, languagesToUse);
    
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
function formatTranslations(translations, languages) {
  // Filter translations to only include specified languages
  const filteredTranslations = Object.entries(translations)
    .filter(([lang]) => languages.includes(lang));
  
  // If there's only one language in the translations, don't show the prefix
  if (filteredTranslations.length === 1) {
    const [, text] = filteredTranslations[0];
    return text;
  }
  
  // Otherwise, format with language prefixes
  return filteredTranslations
    .map(([lang, text]) => `*${getLanguageName(lang)}*: ${text}`)
    .join('\n\n');
}

// Start the app
(async () => {
  try {
    // Start the Slack app
    await app.start();
    console.log('⚡️ Slack Translator Bot is running!');
    
    // Start the HTTP server on the port Heroku provides
    const port = process.env.PORT || 3000;
    server.listen(port, () => {
      console.log(`HTTP server listening on port ${port}!`);
      console.log(`Health check available at http://localhost:${port}/health`);
    });
    
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
    console.log('  /translate-languages - Set languages for the channel (e.g., /translate-languages es,fr,de)');
  } catch (error) {
    logError('Failed to start the app', error);
    process.exit(1);
  }
})(); 