import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AIService {
  // Retry state signals
  isRetrying = signal<boolean>(false);
  retryAttempt = signal<number>(0);
  currentModel = signal<string>('gemini-3.5-flash');
  statusMessage = signal<string | null>(null);

  // Available models for fallback
  private models: string[] = [
    'gemini-3.5-flash',
    'gemini-2.5-flash',
    'gemini-1.5-flash',
    'gemini-2.5-pro'
  ];

  /**
   * Helper to perform an asynchronous non-blocking delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Calls a backend AI API endpoint with automatic exponential backoff retry and model fallback.
   * Logs complete API error details to the browser console for debugging.
   */
  async callApiWithRetryAndFallback<T>(url: string, body: Record<string, unknown>): Promise<T> {
    const maxRetries = 3;
    let attempt = 0;

    while (attempt <= maxRetries) {
      // Pick model from fallback array based on the attempt number
      const selectedModel = this.models[attempt % this.models.length];
      this.currentModel.set(selectedModel);
      this.retryAttempt.set(attempt);

      // Create a shallow copy of the request body and assign the active model
      const requestBody = { ...body, model: selectedModel };

      // Handle backoff delay on retries
      if (attempt > 0) {
        this.isRetrying.set(true);
        const backoffMs = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
        const backoffSec = Math.pow(2, attempt - 1);
        
        const msg = `Gemini is experiencing high demand. Retrying (Attempt ${attempt}/${maxRetries}) using model "${selectedModel}" in ${backoffSec}s...`;
        this.statusMessage.set(msg);
        console.warn(`[AIService] ${msg}`);
        
        await this.delay(backoffMs);
      } else {
        this.isRetrying.set(false);
        this.statusMessage.set('Contacting Gemini AI...');
      }

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        // Parse JSON response body if possible, to extract specific error messages or successful payload
        let responseData: unknown;
        const responseText = await response.text();
        try {
          responseData = JSON.parse(responseText);
        } catch {
          responseData = { rawText: responseText };
        }

        if (response.ok) {
          // Success! Reset states and return data
          this.resetState();
          return responseData as T;
        }

        // Response is not OK. Log full error payload to browser console for developers
        console.error(`[AIService] API error on endpoint "${url}" with status ${response.status}:`, {
          status: response.status,
          statusText: response.statusText,
          modelUsed: selectedModel,
          attempt,
          errorPayload: responseData
        });

        const parsedData = responseData as { error?: string | { code?: string | number; status?: string; message?: string }; message?: string } | null;
        
        let isUnavailable = response.status === 503 || response.status === 429;
        if (!isUnavailable && parsedData && parsedData.error) {
          const errObj = parsedData.error;
          if (typeof errObj === 'object') {
            isUnavailable = errObj.code === 503 ||
              errObj.code === '503' ||
              errObj.status === 'UNAVAILABLE' ||
              errObj.status === 'RESOURCE_EXHAUSTED';
          }
          if (!isUnavailable) {
            const errorStr = JSON.stringify(parsedData).toLowerCase();
            isUnavailable = errorStr.includes('unavailable') || errorStr.includes('high demand');
          }
        }

        if (isUnavailable && attempt < maxRetries) {
          // Retry on next attempt
          attempt++;
          continue;
        }

        // If it's a 503 or model unavailable error but retries are exhausted, throw a beautiful human-friendly message
        if (isUnavailable) {
          throw new Error('LifeSaver AI is currently experiencing very high demand. All backup servers are fully occupied. Please wait a moment and try again.');
        }

        // Throw generic server error or custom backend error message
        let errMsgFromData = '';
        if (parsedData && parsedData.error) {
          const errObj = parsedData.error;
          if (typeof errObj === 'string') {
            errMsgFromData = errObj;
          } else if (typeof errObj === 'object') {
            errMsgFromData = errObj.message || '';
          }
        }
        const serverMsg = errMsgFromData || parsedData?.message || `Server responded with status ${response.status}`;
        throw new Error(serverMsg);

      } catch (err: unknown) {
        const errorObject = err as { message?: string };
        // If it's a Network error (e.g. fetch fails completely) and we still have retries
        console.error(`[AIService] Caught exception during attempt ${attempt}:`, err);

        const isNetworkOrUnavailable = !errorObject.message || 
          errorObject.message.includes('failed to fetch') || 
          errorObject.message.includes('Load failed') ||
          errorObject.message.includes('high demand') ||
          errorObject.message.includes('unavailable');

        if (isNetworkOrUnavailable && attempt < maxRetries) {
          attempt++;
          continue;
        }

        // Propagate user-friendly error
        this.resetState();
        if (errorObject.message && (errorObject.message.includes('high demand') || errorObject.message.includes('unavailable'))) {
          throw new Error('LifeSaver AI is currently experiencing very high demand. All backup servers are fully occupied. Please wait a moment and try again.');
        }
        throw err;
      }
    }

    this.resetState();
    throw new Error('LifeSaver AI is currently experiencing very high demand. All backup servers are fully occupied. Please wait a moment and try again.');
  }

  private resetState() {
    this.isRetrying.set(false);
    this.retryAttempt.set(0);
    this.statusMessage.set(null);
  }
}
