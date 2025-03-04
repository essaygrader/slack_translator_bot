const { GoogleGenerativeAI } = require('@google/generative-ai');
const { parseCommaSeparatedList, debug, logError } = require('./utils');

// Initialize Google Generative AI with API key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// Use the model specified in the environment variable, with fallback to gemini-pro
const modelName = process.env.GEMINI_MODEL || 'gemini-pro';
const model = genAI.getGenerativeModel({ model: modelName });

// Log which model is being used
console.log(`Using Google Gemini model: ${modelName}`);

// Language names mapping for better readability in Slack messages
const languageNames = {
  'en': 'English',
  'es': 'Spanish',
  'fr': 'French',
  'de': 'German',
  'it': 'Italian',
  'ja': 'Japanese',
  'ko': 'Korean',
  'zh': 'Chinese',
  'ru': 'Russian',
  'pt': 'Portuguese',
  'ar': 'Arabic',
  'uk': 'Ukrainian',
  'pl': 'Polish',
  // Add more languages as needed
};

/**
 * Translates text to a specific language using Google Gemini
 * @param {string} text - The text to translate
 * @param {string} targetLang - The target language code
 * @returns {Promise<string>} - The translated text
 */
async function translateText(text, targetLang) {
  try {
    const prompt = `Translate the following text to ${getLanguageName(targetLang)}. 
    Only return the translated text, no explanations or additional text:
    
    "${text}"`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const translatedText = response.text().trim();
    
    debug(`Translated to ${targetLang}`, translatedText);
    
    return translatedText;
  } catch (error) {
    logError(`Translation error for ${targetLang}`, error);
    return `[Translation error: ${error.message}]`;
  }
}

/**
 * Get the full language name from a language code
 * @param {string} langCode - The language code
 * @returns {string} - The full language name
 */
function getLanguageName(langCode) {
  return languageNames[langCode] || langCode;
}

/**
 * Detects the language of the given text using Gemini
 * @param {string} text - The text to detect language for
 * @returns {Promise<string>} - The detected language code
 */
async function detectLanguage(text) {
  try {
    const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-pro' });
    
    const prompt = `
    Detect the language of the following text and respond with ONLY the ISO 639-1 language code (e.g., 'en' for English, 'es' for Spanish, etc.).
    
    Text: "${text}"
    
    Language code:
    `;
    
    const result = await model.generateContent(prompt);
    const response = result.response;
    const languageCode = response.text().trim().toLowerCase();
    
    // If the detected language is not in our supported languages, default to 'en'
    const supportedLanguages = parseCommaSeparatedList(process.env.SUPPORTED_LANGUAGES, ['en']);
    if (!supportedLanguages.includes(languageCode)) {
      debug(`Detected language ${languageCode} is not in supported languages, defaulting to 'en'`);
      return 'en';
    }
    
    return languageCode;
  } catch (error) {
    logError('Error detecting language', error);
    return 'en'; // Default to English on error
  }
}

/**
 * Translates text to multiple languages
 * @param {string} text - The text to translate
 * @param {string[]} [languages] - Optional array of language codes to translate to
 * @returns {Promise<Object>} - Object with language codes as keys and translated text as values
 */
async function translateToAllLanguages(text, languages) {
  try {
    // If no languages specified, use all supported languages
    const targetLanguages = languages || Object.keys(languageNames);
    
    // Detect the source language
    const sourceLang = await detectLanguage(text);
    debug('Detected source language', sourceLang);
    
    // Remove source language from target languages if present
    const filteredLanguages = targetLanguages.filter(lang => lang !== sourceLang);
    
    // Translate to each target language
    const translations = {};
    for (const lang of filteredLanguages) {
      try {
        translations[lang] = await translateText(text, lang);
      } catch (error) {
        logError(`Error translating to ${lang}`, error);
        // Continue with other languages even if one fails
      }
    }
    
    return translations;
  } catch (error) {
    logError('Error in translateToAllLanguages', error);
    throw error;
  }
}

module.exports = {
  translateText,
  translateToAllLanguages,
  detectLanguage,
  getLanguageName
}; 