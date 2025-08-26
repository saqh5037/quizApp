import { apiGet, apiPost, apiPut, apiDelete, apiUpload } from '../utils/api.utils';

export interface Manual {
  id: number;
  title: string;
  description?: string;
  filename?: string;
  originalName?: string;
  size: number;
  mimeType: string;
  status: 'processing' | 'ready' | 'failed';
  userId: number;
  tenantId?: number;
  createdAt: string;
  creator?: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl?: string;
  };
}

export interface ManualListResponse {
  success: boolean;
  data: Manual[];
  message?: string;
}

export interface ManualResponse {
  success: boolean;
  data: Manual;
  message?: string;
}

class ManualService {
  async uploadManual(formData: FormData): Promise<ManualResponse> {
    return await apiUpload('/manuals/upload', formData);
  }

  async getManuals(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  }): Promise<ManualListResponse> {
    const queryString = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return await apiGet(`/manuals${queryString}`);
  }

  async getManual(id: number): Promise<ManualResponse> {
    return await apiGet(`/manuals/${id}`);
  }

  async updateManual(id: number, data: {
    title?: string;
    description?: string;
    is_public?: boolean;
  }): Promise<ManualResponse> {
    return await apiPut(`/manuals/${id}`, data);
  }

  async deleteManual(id: number): Promise<{ success: boolean; message: string }> {
    return await apiDelete(`/manuals/${id}`);
  }

  async downloadManual(id: number): Promise<Blob> {
    // This would need a special implementation for blob responses
    throw new Error('Download not implemented yet');
  }
}

export const manualService = new ManualService();
export default manualService;