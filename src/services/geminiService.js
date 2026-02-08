/**
 * Guardian Desktop ERP - Google Gemini AI Service
 * Used for intelligent PDF parsing and data extraction
 * Using @google/generative-ai SDK with gemini-2.0-flash model
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

// Default API key (can be overridden from app settings)
const DEFAULT_API_KEY = 'AIzaSyD3WJ9nRC2SLyFRS0YZCMCNMmEPwM2qrag';

// Retry configuration
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 15000; // 15 seconds base delay for quota errors

// Get API key from localStorage or use default
const getApiKey = () => {
  try {
    const appSettings = localStorage.getItem('guardian_app_settings');
    if (appSettings) {
      const settings = JSON.parse(appSettings);
      if (settings.gemini_api_key) {
        return settings.gemini_api_key;
      }
    }
  } catch (e) {
    console.error('Error reading API key from settings:', e);
  }
  return DEFAULT_API_KEY;
};

// Initialize Gemini AI client
const getGeminiClient = () => {
  const apiKey = getApiKey();
  return new GoogleGenerativeAI(apiKey);
};

// Helper function to delay execution
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to check if error is quota related
const isQuotaError = (error) => {
  const errorMsg = error?.message || '';
  return errorMsg.includes('429') || 
         errorMsg.includes('quota') || 
         errorMsg.includes('rate') ||
         errorMsg.includes('exceeded');
};

// Wrapper function with retry logic
const callWithRetry = async (fn, retries = MAX_RETRIES) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      console.error(`[Gemini] Attempt ${attempt} failed:`, error.message);
      
      if (isQuotaError(error) && attempt < retries) {
        const delayTime = BASE_DELAY_MS * attempt;
        console.log(`[Gemini] Quota exceeded. Waiting ${delayTime/1000}s before retry...`);
        await delay(delayTime);
        continue;
      }
      
      // Provide user-friendly error message
      if (isQuotaError(error)) {
        throw new Error(
          'AI service quota exceeded. Please try again in a few minutes, or update your Gemini API key in Settings > API Settings with a paid plan key.'
        );
      }
      throw error;
    }
  }
};

/**
 * Parse VOB/BOB PDF text using Gemini AI
 * @param {string} pdfText - Extracted text from PDF
 * @returns {Promise<object>} - Structured VOB data
 */
export const parseVOBWithAI = async (pdfText) => {
  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({ 
    model: 'gemini-2.0-flash',
    generationConfig: {
      temperature: 0.1,
      topK: 1,
      topP: 0.95,
      maxOutputTokens: 4096,
    },
  });
  
  const prompt = `You are a dental insurance VOB (Verification of Benefits) data extraction expert. 
Extract the following information from this dental insurance VOB document and return it as a valid JSON object.

IMPORTANT RULES:
1. Return ONLY valid JSON, no markdown, no explanation
2. Use empty string "" for any field you cannot find
3. Keep dates in their original format
4. Keep dollar amounts as numbers without $ symbol
5. Keep percentages as numbers without % symbol
6. Extract exact values as they appear in the document

Extract these fields:
{
  "patientInfo": {
    "patientName": "Full name of patient",
    "dob": "Date of birth",
    "memberId": "Member ID / Subscriber ID",
    "groupNumber": "Group number",
    "network": "In-Network or Out-of-Network",
    "address": "Claims mailing address"
  },
  "policyInfo": {
    "policyHolderName": "Policy holder name",
    "ssn": "SSN if shown (last 4 digits only)",
    "policyHolderDOB": "Policy holder DOB",
    "effectiveDate": "Coverage effective date",
    "type": "Plan type (PPO, HMO, etc.)"
  },
  "planInfo": {
    "planName": "Plan name",
    "employer": "Employer name",
    "calendarYear": "Calendar year date",
    "benefitYear": "Benefit year date",
    "waitingPeriod": "Waiting period info",
    "missingToothClause": "Yes or No",
    "cob": "COB information",
    "insuranceName": "Insurance company name"
  },
  "maxDeductible": {
    "annualMaxIndividual": "Annual max for individual",
    "annualMaxFamily": "Annual max for family",
    "maxUsed": "Amount of max used",
    "maxRemaining": "Remaining max",
    "deductibleIndividual": "Individual deductible",
    "deductibleFamily": "Family deductible",
    "deductibleUsed": "Deductible used",
    "deductibleRemaining": "Remaining deductible",
    "deductibleAppliesTo": "What deductible applies to",
    "orthoLifetimeMax": "Ortho lifetime max",
    "orthoMaxUsed": "Ortho max used",
    "orthoMaxRemaining": "Ortho max remaining",
    "orthoDeductible": "Ortho deductible",
    "orthoAgeLimitChild": "Ortho age limit child",
    "orthoAgeLimitAdult": "Ortho age limit adult"
  },
  "benefits": {
    "preventiveIn": "Preventive in-network %",
    "preventiveOut": "Preventive out-of-network %",
    "basicIn": "Basic in-network %",
    "basicOut": "Basic out-of-network %",
    "majorIn": "Major in-network %",
    "majorOut": "Major out-of-network %",
    "orthoIn": "Orthodontic in-network %",
    "orthoOut": "Orthodontic out-of-network %"
  },
  "limitations": {
    "prophy": "Prophylaxis frequency",
    "fmxPano": "FMX/Pano frequency",
    "bwx": "Bitewings frequency",
    "exam": "Exam frequency",
    "fluoride": "Fluoride frequency/age limit",
    "sealants": "Sealants frequency/age limit",
    "srp": "SRP frequency",
    "perio": "Perio maintenance frequency",
    "crowns": "Crown replacement frequency",
    "dentures": "Denture replacement frequency",
    "implants": "Implant info",
    "ortho": "Ortho frequency"
  },
  "callDetails": {
    "repName": "Insurance rep name",
    "callRef": "Call reference number",
    "date": "Date of call"
  }
}

VOB DOCUMENT TEXT:
${pdfText}

Return ONLY the JSON object, nothing else:`;

  try {
    console.log('[Gemini] Calling gemini-2.0-flash model via @google/generative-ai SDK...');
    
    // Use retry wrapper for API call
    const result = await callWithRetry(async () => {
      return await model.generateContent(prompt);
    });
    
    const response = await result.response;
    const responseText = response.text();
    
    if (!responseText) {
      console.error('[Gemini] No response text received');
      throw new Error('No response from Gemini AI. The model may have failed to generate output.');
    }

    console.log('[Gemini] Raw response:', responseText.substring(0, 500) + '...');

    // Clean up the response - remove markdown code blocks if present
    let cleanedResponse = responseText.trim();
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.slice(7);
    } else if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.slice(3);
    }
    if (cleanedResponse.endsWith('```')) {
      cleanedResponse = cleanedResponse.slice(0, -3);
    }
    cleanedResponse = cleanedResponse.trim();

    // Parse the JSON
    let parsedData;
    try {
      parsedData = JSON.parse(cleanedResponse);
    } catch (jsonError) {
      console.error('[Gemini] JSON Parse Error:', jsonError);
      console.error('[Gemini] Cleaned response was:', cleanedResponse.substring(0, 500));
      throw new Error('AI returned invalid JSON format. Please try again.');
    }
    
    console.log('[Gemini] Parsed data:', parsedData);
    
    return {
      success: true,
      data: parsedData,
      fieldsFound: countNonEmptyFields(parsedData)
    };

  } catch (error) {
    console.error('Gemini parsing error:', error);
    return {
      success: false,
      error: error.message,
      data: null,
      fieldsFound: 0
    };
  }
};

/**
 * Count non-empty fields in the parsed data
 */
const countNonEmptyFields = (obj) => {
  let count = 0;
  for (const key in obj) {
    const value = obj[key];
    if (typeof value === 'object' && value !== null) {
      count += countNonEmptyFields(value);
    } else if (value && value.toString().trim() !== '') {
      count++;
    }
  }
  return count;
};

/**
 * Test the Gemini API connection
 */
export const testGeminiConnection = async () => {
  try {
    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    
    // Use retry wrapper for API call
    const result = await callWithRetry(async () => {
      return await model.generateContent('Reply with only: "Connection successful"');
    }, 2); // Only 2 retries for connection test
    
    const response = await result.response;
    const text = response.text();
    
    if (text) {
      return { success: true, message: 'Gemini API connection successful!' };
    }
    return { success: false, error: 'No response received' };
  } catch (error) {
    console.error('[Gemini] Connection test failed:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get/Set App Settings (including API keys)
 */
export const appSettingsService = {
  get: () => {
    try {
      const settings = localStorage.getItem('guardian_app_settings');
      return settings ? JSON.parse(settings) : {
        gemini_api_key: DEFAULT_API_KEY,
        use_ai_parsing: true
      };
    } catch (e) {
      return {
        gemini_api_key: DEFAULT_API_KEY,
        use_ai_parsing: true
      };
    }
  },
  
  save: (settings) => {
    localStorage.setItem('guardian_app_settings', JSON.stringify(settings));
  },
  
  getApiKey: () => {
    return getApiKey();
  },
  
  setApiKey: (key) => {
    const settings = appSettingsService.get();
    settings.gemini_api_key = key;
    appSettingsService.save(settings);
  }
};

export default {
  parseVOBWithAI,
  testGeminiConnection,
  appSettingsService
};
