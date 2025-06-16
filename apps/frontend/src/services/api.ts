import axios from 'axios';
import type {
  Customer,
  Order,
  CreateCustomerRequest,
  UpdateCustomerRequest,
  CreateOrderRequest,
  UpdateOrderRequest,
  GenerateOrderNumberResponse,
} from '../types';

const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api`,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add response interceptor to handle errors gracefully
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    // Return empty arrays for failed requests to prevent reduce errors
    if (error.response?.status >= 500 || error.code === 'NETWORK_ERROR') {
      return Promise.resolve({ data: [] });
    }
    return Promise.reject(error);
  }
);

// Customer API
export const customersApi = {
  getAll: () => api.get<Customer[]>('/customers'),
  getById: (id: string) => api.get<Customer>(`/customers/${id}`),
  create: (data: CreateCustomerRequest) => api.post<Customer>('/customers', data),
  update: (id: string, data: UpdateCustomerRequest) => 
    api.patch<Customer>(`/customers/${id}`, data),
  delete: (id: string) => api.delete(`/customers/${id}`),
  search: (query: string) => api.get<Customer[]>(`/customers/search?q=${query}`),
};

// Orders API
export const ordersApi = {
  getAll: () => api.get<Order[]>('/orders'),
  getById: (id: string) => api.get<Order>(`/orders/${id}`),
  create: (data: CreateOrderRequest) => api.post<Order>('/orders', data),
  update: (id: string, data: UpdateOrderRequest) => 
    api.patch<Order>(`/orders/${id}`, data),
  delete: (id: string) => api.delete(`/orders/${id}`),
  search: (query: string) => api.get<Order[]>(`/orders/search?q=${query}`),
  getByCustomer: (customerId: string) => 
    api.get<Order[]>(`/orders/by-customer/${customerId}`),
  getByStatus: (status: string) => 
    api.get<Order[]>(`/orders/by-status/${status}`),
  generateOrderNumber: () => 
    api.get<GenerateOrderNumberResponse>('/orders/generate-order-number'),
};

export default api;
