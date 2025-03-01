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
 * Detect the language of a text using Google Gemini
 * @param {string} text - The text to detect language for
 * @returns {Promise<string>} - The detected language code
 */
async function detectLanguage(text) {
  try {
    const prompt = `Detect the language of the following text. 
    Only return the ISO 639-1 language code (like 'en', 'es', 'fr', etc.), nothing else:
    
    "${text}"`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const detectedLang = response.text().trim().toLowerCase();
    
    debug('Detected language', detectedLang);
    
    return detectedLang;
  } catch (error) {
    logError('Language detection error', error);
    return 'unknown';
  }
}

/**
 * Translates text to all supported languages
 * @param {string} text - The text to translate
 * @param {string} sourceLang - The source language code (optional)
 * @returns {Promise<Object>} - Object with language codes as keys and translations as values
 */
async function translateToAllLanguages(text, sourceLang = null) {
  // Get supported languages from environment variable
  const supportedLanguages = parseCommaSeparatedList(process.env.SUPPORTED_LANGUAGES, ['en']);
  
  // Detect source language if not provided
  if (!sourceLang) {
    sourceLang = await detectLanguage(text);
  }
  
  const translations = {};
  
  // Add original text with detected language
  translations[sourceLang] = text;
  
  // Translate to all other supported languages
  const translationPromises = supportedLanguages
    .filter(lang => lang !== sourceLang) // Skip source language
    .map(async (lang) => {
      translations[lang] = await translateText(text, lang);
    });
  
  await Promise.all(translationPromises);
  
  return translations;
}

module.exports = {
  translateText,
  translateToAllLanguages,
  detectLanguage,
  getLanguageName
}; 