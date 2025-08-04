import { InterviewApiService, createInterviewApiService, AudioApiService, createAudioApiService } from './api';

// Re-export API services
export { InterviewApiService, createInterviewApiService, AudioApiService, createAudioApiService } from './api';

// Re-export database services
export { DatabaseService } from './database';
export { 
  JobsDatabaseService, 
  InterviewsDatabaseService, 
  UserSessionsDatabaseService, 
  InterviewTurnsDatabaseService 
} from './database/';

// Create a central API service factory
export class ApiServiceFactory {
  private static instance: ApiServiceFactory;
  private apiUrl: string;

  private constructor(apiUrl: string) {
    this.apiUrl = apiUrl;
  }

  public static getInstance(apiUrl?: string): ApiServiceFactory {
    if (!ApiServiceFactory.instance) {
      if (!apiUrl) {
        throw new Error('API URL must be provided for first initialization');
      }
      ApiServiceFactory.instance = new ApiServiceFactory(apiUrl);
    }
    return ApiServiceFactory.instance;
  }

  public get interview() {
    return createInterviewApiService(this.apiUrl);
  }

  public get audio() {
    return createAudioApiService(this.apiUrl);
  }

  public updateApiUrl(newUrl: string) {
    this.apiUrl = newUrl;
  }
}

// Convenience function for getting API services
export const getApiServices = (apiUrl?: string) => {
  return ApiServiceFactory.getInstance(apiUrl);
};
