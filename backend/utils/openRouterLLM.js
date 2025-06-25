const axios = require('axios');

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

/**
 * Sends a technical log message to OpenRouter LLM and returns a user-friendly summary.
 * @param {string} logMessage - The technical log message to summarize.
 * @returns {Promise<string>} - The user-friendly summary or a fallback message.
 */
async function summarizeLogForUser(logMessage) {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OpenRouter API key is not set in .env');
  }

  const prompt = `You are a helpful assistant that translates technical system log errors into one-line, human-friendly explanations.

Given a raw error log, provide a short, clear explanation that a non-technical user can understand. Avoid mentioning technical terms like "stack trace", "exception", or "array index out of bounds".

Example:

Log: "Raster exception: array index out of bound"  
Output: "The PDF couldn't be opened because it may be corrupted or unsupported."

Give me output in one line without any quotation or ant like Output: 
it should be simple one line 

Now process this:
Log: ${logMessage}`;

  try {
    const response = await axios.post(
      OPENROUTER_API_URL,
      {
        //model: 'google/gemma-3-27b-it:free',
        model: 'qwen/qwq-32b:free',
        messages: [
          { role: 'user', content: prompt }
        ],
        max_tokens: 100
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    if (
      response.data &&
      response.data.choices &&
      response.data.choices[0] &&
      response.data.choices[0].message &&
      response.data.choices[0].message.content
    ) {
      return response.data.choices[0].message.content.trim();
    } else {
      return 'An error occurred, but we are unable to provide more details at this time.';
    }
  } catch (error) {
    if (error.response) {
      console.error('OpenRouter API error response:', error.response.data);
    } else {
      console.error('Error calling OpenRouter API:', error.message);
    }
    return 'An error occurred, but we are unable to provide more details at this time.';
  }
}

module.exports = { summarizeLogForUser }; 