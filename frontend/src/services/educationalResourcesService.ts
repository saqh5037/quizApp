import { apiGet, apiPost, apiPatch } from '../utils/api.utils';

export interface EducationalResourceRequest {
  contentType: 'summary' | 'study_guide' | 'flash_cards';
  title: string;
  description?: string;
  // Summary specific
  summaryType?: 'brief' | 'detailed' | 'key_points';
  // Study Guide specific  
  difficultyLevel?: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime?: number;
  learningObjectives?: string[];
  // Flash Cards specific
  cardCount?: number;
  cardDifficulty?: 'easy' | 'medium' | 'hard';
  categories?: string[];
  // General
  isPublic?: boolean;
  customPrompt?: string;
}

export interface EducationalResourceResponse {
  id: string;
  title: string;
  contentType: 'summary' | 'study_guide' | 'flash_cards';
  status: 'generating' | 'ready' | 'failed';
  manualId: string;
  manualTitle: string;
}

export interface ResourceContent {
  id: string;
  resourceType: 'summary' | 'study_guide' | 'flash_cards';
  title: string;
  content?: string;
  // Summary specific
  summary_type?: 'brief' | 'detailed' | 'key_points';
  word_count?: number;
  // Study Guide specific
  difficulty_level?: 'beginner' | 'intermediate' | 'advanced';
  estimated_time?: number;
  topics?: string[];
  learning_objectives?: string[];
  // Flash Cards specific
  set_title?: string;
  cards?: Array<{
    front: string;
    back: string;
    category?: string;
    difficulty?: string;
    tags?: string[];
    hints?: string;
  }>;
  total_cards?: number;
  // General
  status: 'generating' | 'ready' | 'failed';
  is_public?: boolean;
  created_at: string;
  updated_at: string;
  manual?: {
    id: string;
    title: string;
    description?: string;
  };
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface ResourceList {
  manual: {
    id: string;
    title: string;
    description?: string;
  };
  resources: {
    summaries: Array<{
      id: string;
      title: string;
      summary_type: string;
      status: string;
      created_at: string;
      user: {
        firstName: string;
        lastName: string;
      };
      resourceType: 'summary';
    }>;
    studyGuides: Array<{
      id: string;
      title: string;
      difficulty_level: string;
      estimated_time: number;
      status: string;
      created_at: string;
      user: {
        firstName: string;
        lastName: string;
      };
      resourceType: 'study_guide';
    }>;
    flashCards: Array<{
      id: string;
      title: string;
      total_cards: number;
      difficulty_level: string;
      status: string;
      created_at: string;
      user: {
        firstName: string;
        lastName: string;
      };
      resourceType: 'flash_cards';
    }>;
  };
}

export const educationalResourcesService = {
  // Generate educational resource
  generateResource: async (
    manualId: string, 
    data: EducationalResourceRequest
  ): Promise<EducationalResourceResponse> => {
    const response = await apiPost(`/educational-resources/manuals/${manualId}/resources`, data);
    // Extract the data from the response
    return response.data || response;
  },

  // Get specific educational resource
  getResource: async (
    resourceType: 'summary' | 'study_guide' | 'flash_cards',
    resourceId: string
  ): Promise<ResourceContent> => {
    const response = await apiGet(`/educational-resources/resources/${resourceType}/${resourceId}`);
    return response.data || response;
  },

  // List all educational resources for a manual
  listResources: async (manualId: string): Promise<ResourceList> => {
    const response = await apiGet(`/educational-resources/manuals/${manualId}/resources`);
    return response.data || response;
  },

  // Update flash card study statistics
  updateFlashCardStats: async (
    flashCardId: string,
    stats: { correctAnswers: number; totalReviews: number }
  ): Promise<{ id: string; stats: any }> => {
    const response = await apiPatch(`/educational-resources/flash-cards/${flashCardId}/stats`, stats);
    return response.data || response;
  },

  // Poll resource generation status
  pollResourceStatus: async (
    resourceType: 'summary' | 'study_guide' | 'flash_cards',
    resourceId: string,
    onUpdate?: (resource: ResourceContent) => void
  ): Promise<ResourceContent> => {
    const poll = async (): Promise<ResourceContent> => {
      const resource = await educationalResourcesService.getResource(resourceType, resourceId);
      
      if (onUpdate) {
        onUpdate(resource);
      }

      if (resource.status === 'generating') {
        // Poll again in 2 seconds
        await new Promise(resolve => setTimeout(resolve, 2000));
        return poll();
      }

      return resource;
    };

    return poll();
  }
};

export default educationalResourcesService;