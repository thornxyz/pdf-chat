import axios from 'axios';
import { LoginCredentials, RegisterCredentials, AuthToken, User } from './types';

export const API_BASE_URL = 'http://localhost:8000';

// Create axios instance with base configuration
const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add request interceptor to include auth token
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Authentication API calls
export const authApi = {
    login: async (credentials: LoginCredentials): Promise<AuthToken> => {
        const formData = new FormData();
        formData.append('username', credentials.username);
        formData.append('password', credentials.password);

        const response = await axios.post(`${API_BASE_URL}/auth/token`, formData, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        });
        return response.data;
    },

    register: async (credentials: RegisterCredentials): Promise<User> => {
        const response = await axios.post(`${API_BASE_URL}/auth/register`, credentials);
        return response.data;
    },

    getCurrentUser: async (): Promise<User> => {
        const response = await api.get('/auth/me');
        return response.data;
    },
};

// Export the configured axios instance for other API calls
export default api;
