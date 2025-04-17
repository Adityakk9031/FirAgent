import { processUserInput } from './api';
import { GeminiResponse } from '@/types';

/**
 * Process user input with Gemini AI and extract information
 * 
 * @param userInput - User input text
 * @returns A promise with the processed response
 */
export async function processCrimeDescription(userInput: string): Promise<GeminiResponse> {
  try {
    const response = await processUserInput(userInput);
    return response;
  } catch (error) {
    console.error('Error processing with Gemini:', error);
    throw new Error('Failed to process with Gemini. Please try again.');
  }
}
