/**
 * API Utilities
 * Helper functions for making API requests
 */

import { apiConfig, getAuthHeaders } from '../config/api.config';
import { useAuthStore } from '../stores/authStore';

/**
 * Make a GET request to the API
 */
export const apiGet = async (endpoint: string, options?: RequestInit) => {
  const token = useAuthStore.getState().accessToken;
  const response = await fetch(`${apiConfig.baseURL}${endpoint}`, {
    method: 'GET',
    headers: getAuthHeaders(token || undefined),
    ...options,
  });
  
  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`);
  }
  
  return response.json();
};

/**
 * Make a POST request to the API
 */
export const apiPost = async (endpoint: string, data?: any, options?: RequestInit) => {
  const token = useAuthStore.getState().accessToken;
  const response = await fetch(`${apiConfig.baseURL}${endpoint}`, {
    method: 'POST',
    headers: getAuthHeaders(token || undefined),
    body: data ? JSON.stringify(data) : undefined,
    ...options,
  });
  
  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`);
  }
  
  return response.json();
};

/**
 * Make a PUT request to the API
 */
export const apiPut = async (endpoint: string, data?: any, options?: RequestInit) => {
  const token = useAuthStore.getState().accessToken;
  const response = await fetch(`${apiConfig.baseURL}${endpoint}`, {
    method: 'PUT',
    headers: getAuthHeaders(token || undefined),
    body: data ? JSON.stringify(data) : undefined,
    ...options,
  });
  
  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`);
  }
  
  return response.json();
};

/**
 * Make a DELETE request to the API
 */
export const apiDelete = async (endpoint: string, options?: RequestInit) => {
  const token = useAuthStore.getState().accessToken;
  const response = await fetch(`${apiConfig.baseURL}${endpoint}`, {
    method: 'DELETE',
    headers: getAuthHeaders(token || undefined),
    ...options,
  });
  
  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`);
  }
  
  return response.json();
};

/**
 * Upload a file to the API
 */
export const apiUpload = async (endpoint: string, formData: FormData, options?: RequestInit) => {
  const token = useAuthStore.getState().accessToken;
  const headers: HeadersInit = {};
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(`${apiConfig.baseURL}${endpoint}`, {
    method: 'POST',
    headers,
    body: formData,
    ...options,
  });
  
  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`);
  }
  
  return response.json();
};