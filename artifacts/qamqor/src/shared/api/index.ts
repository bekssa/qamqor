import { IKamkorApi } from './IKamkorApi';
import { MockKamkorApi } from './mock.api';
import { RealKamkorApi } from './real.api';

// Export everything for external usage
export * from './types';
export * from './IKamkorApi';

// Factory to select the right implementation
function createApiInstance(): IKamkorApi {
    // Use Vite's environment variables to determine mode
    const apiMode = import.meta.env.VITE_API_MODE;
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://api.qamqor.kz/v1';

    if (apiMode === 'real') {
        console.log('🌐 Initializing REAL Kamkor API');
        return new RealKamkorApi(baseUrl);
    }

    console.log('🧪 Initializing MOCK Kamkor API');
    return new MockKamkorApi();
}

// Ensure it's a singleton instance
export const api = createApiInstance();
