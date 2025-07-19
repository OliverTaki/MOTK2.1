import axios from 'axios';
import { ApiResponse } from '@shared/types';

const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for handling errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const { response } = error;
    
    // Handle authentication errors
    if (response && response.status === 401) {
      localStorage.removeItem('auth_token');
      window.location.href = '/';
    }
    
    return Promise.reject(error);
  }
);

// Generic API request function with type safety
export const apiRequest = async <T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  url: string,
  data?: any
): Promise<ApiResponse<T>> => {
  try {
    const response = await apiClient({
      method,
      url,
      data,
    });
    
    return response.data as ApiResponse<T>;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      return {
        success: false,
        error: error.response.data.error || 'An error occurred',
        message: error.response.data.message || error.message,
      };
    }
    
    return {
      success: false,
      error: 'Network Error',
      message: 'Unable to connect to the server',
    };
  }
};

export default apiClient;