import axios from 'axios';
import { showToast, authToast, inventoryToast } from '../utils/toast';

const API_BASE_URL = process.env.REACT_APP_API_URL;

// Create axios instance with default configuration
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling and token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle network errors
    if (!error.response) {
      inventoryToast.networkError();
      return Promise.reject(new Error('Network error. Please check your connection.'));
    }

    // Handle token refresh for 401/403 errors
    if (
      (error.response.status === 401 || error.response.status === 403) &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        });

        const { accessToken } = response.data;
        localStorage.setItem('accessToken', accessToken);
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        
        return api(originalRequest);
      } catch (refreshError) {
        // Clear tokens and redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        inventoryToast.unauthorizedAccess();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export const authAPI = {
  login: async (credentials) => {
    try {
      const response = await api.post('/auth/login', credentials);
      if (response.data.user) {
        authToast.loginSuccess(response.data.user.name);
      }
      return response;
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed';
      authToast.loginError(message);
      throw error;
    }
  },

  signup: async (userData) => {
    try {
      const response = await api.post('/auth/signup', userData);
      authToast.signupSuccess();
      return response;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to create account';
      authToast.signupError(message);
      throw error;
    }
  },

  logout: async () => {
    try {
      const response = await api.post('/auth/logout');
      authToast.logoutSuccess();
      return response;
    } catch (error) {
      throw error;
    }
  },

  getProfile: () => api.get('/auth/me'),
  refreshToken: (refreshToken) => api.post('/auth/refresh', { refreshToken }),
};

export const productAPI = {
  getProducts: (params) => api.get('/products', { params }),
  searchProducts: (name) => api.get('/products/search', { params: { name } }),
  
  createProduct: async (productData) => {
    try {
      const response = await api.post('/products', productData);
      if (response.data.product) {
        inventoryToast.productCreated(response.data.product.name);
      }
      return response;
    } catch (error) {
      const message = error.response?.data?.message;
      if (message && message.includes('already exists')) {
        inventoryToast.duplicateProduct(productData.name);
      } else {
        showToast.error(message || 'Failed to create product');
      }
      throw error;
    }
  },

  updateProduct: async (id, productData) => {
    try {
      const response = await api.put(`/products/${id}`, productData);
      if (response.data.product) {
        inventoryToast.productUpdated(response.data.product.name);
      }
      return response;
    } catch (error) {
      const message = error.response?.data?.message;
      if (message && message.includes('already exists')) {
        inventoryToast.duplicateProduct(productData.name);
      } else {
        showToast.error(message || 'Failed to update product');
      }
      throw error;
    }
  },

  deleteProduct: async (id, productName) => {
    try {
      const response = await api.delete(`/products/${id}`);
      if (productName) {
        inventoryToast.productDeleted(productName);
      } else {
        showToast.success('Product deleted successfully');
      }
      return response;
    } catch (error) {
      showToast.error(error.response?.data?.message || 'Failed to delete product');
      throw error;
    }
  },

  importProducts: async (formData) => {
    const toastId = inventoryToast.importStarted();
    try {
      const response = await api.post('/products/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      showToast.dismiss(toastId);
      
      if (response.data) {
        const { successCount = 0, skipCount = 0, errorCount = 0 } = response.data;
        inventoryToast.importCompleted(successCount, skipCount, errorCount);
      }
      return response;
    } catch (error) {
      showToast.dismiss(toastId);
      showToast.error(error.response?.data?.message || 'Import failed');
      throw error;
    }
  },

  exportProducts: async () => {
    const toastId = inventoryToast.exportStarted();
    try {
      const response = await api.get('/products/export', { responseType: 'blob' });
      showToast.dismiss(toastId);
      inventoryToast.exportCompleted();
      return response;
    } catch (error) {
      showToast.dismiss(toastId);
      showToast.error(error.response?.data?.message || 'Export failed');
      throw error;
    }
  },

  getAllInventoryLogs: (params) => api.get('/products/all-logs', { params }),
};

export default api;