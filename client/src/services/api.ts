import { apiRequest } from '@/lib/queryClient';
import type { FIR, StatusUpdate, GeminiResponse } from '@/types';
import { queryClient } from '@/lib/queryClient';

// FIR API
export async function getAllFirs(): Promise<FIR[]> {
  const response = await apiRequest('GET', '/api/firs');
  return response.json();
}

export async function getFir(firId: string): Promise<FIR> {
  const response = await apiRequest('GET', `/api/firs/${firId}`);
  return response.json();
}

export async function createFir(fir: Omit<FIR, 'id' | 'createdAt'>): Promise<FIR> {
  const response = await apiRequest('POST', '/api/firs', fir);
  
  // Invalidate query cache
  queryClient.invalidateQueries({ queryKey: ['/api/firs'] });
  
  return response.json();
}

export async function updateFirStatus(firId: string, status: string): Promise<FIR> {
  const response = await apiRequest('PATCH', `/api/firs/${firId}/status`, { status });
  
  // Invalidate query cache
  queryClient.invalidateQueries({ queryKey: ['/api/firs'] });
  queryClient.invalidateQueries({ queryKey: [`/api/firs/${firId}`] });
  
  return response.json();
}

// Status Updates API
export async function getStatusUpdates(firId: string): Promise<StatusUpdate[]> {
  const response = await apiRequest('GET', `/api/firs/${firId}/status-updates`);
  return response.json();
}

export async function createStatusUpdate(
  firId: string, 
  status: string, 
  description: string
): Promise<StatusUpdate> {
  const response = await apiRequest(
    'POST', 
    `/api/firs/${firId}/status-updates`, 
    { status, description }
  );
  
  // Invalidate query cache
  queryClient.invalidateQueries({ queryKey: [`/api/firs/${firId}/status-updates`] });
  queryClient.invalidateQueries({ queryKey: ['/api/firs'] });
  queryClient.invalidateQueries({ queryKey: [`/api/firs/${firId}`] });
  
  return response.json();
}

// PDF Generation
export function getFirPdfUrl(firId: string): string {
  return `/api/firs/${firId}/pdf`;
}

// Gemini API
export async function processUserInput(userInput: string): Promise<GeminiResponse> {
  const response = await apiRequest('POST', '/api/gemini/process', { userInput });
  return await response.json();
}

// AI Lawyer API
export async function askAILawyer(question: string): Promise<{ answer: string; question: string }> {
  const response = await apiRequest('POST', '/api/ai-lawyer/ask', { question });
  return await response.json();
}
