import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { config } from 'dotenv';

config({ path: 'env/.env.local.user' });

interface ServiceNowConfig {
  instance: string;
  username: string;
  password: string;
}

class HttpClient {
  private axiosInstance: AxiosInstance;
  private config: ServiceNowConfig;

  constructor() {
    this.config = {
      instance: process.env.SN_INSTANCE || '',
      username: process.env.SN_USERNAME || '',
      password: process.env.SN_PASSWORD || '',
    };

    this.axiosInstance = axios.create({
      baseURL: `https://${this.config.instance}.service-now.com/api/now/table`,
      auth: {
        username: this.config.username,
        password: this.config.password,
      },
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000, // 10 second timeout
      maxRedirects: 5,
      validateStatus: (status) => status >= 200 && status < 300,
    });

    // Add request interceptor for logging
    this.axiosInstance.interceptors.request.use(
      (config) => {
        console.log(`🚀 ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('❌ Request error:', error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for logging
    this.axiosInstance.interceptors.response.use(
      (response) => {
        console.log(`✅ ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        console.error('❌ Response error:', error.response?.status, error.response?.statusText);
        return Promise.reject(error);
      }
    );
  }

  async get<T = any>(endpoint: string, params?: Record<string, any>): Promise<AxiosResponse<T>> {
    return this.axiosInstance.get(endpoint, { params });
  }

  async post<T = any>(endpoint: string, data?: any): Promise<AxiosResponse<T>> {
    return this.axiosInstance.post(endpoint, data);
  }

  async put<T = any>(endpoint: string, data?: any): Promise<AxiosResponse<T>> {
    return this.axiosInstance.put(endpoint, data);
  }

  async delete<T = any>(endpoint: string): Promise<AxiosResponse<T>> {
    return this.axiosInstance.delete(endpoint);
  }
}

export default new HttpClient();