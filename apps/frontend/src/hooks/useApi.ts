import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customersApi, ordersApi } from '../services/api';
import type {
  Customer,
  Order,
  CreateCustomerRequest,
  UpdateCustomerRequest,
  CreateOrderRequest,
  UpdateOrderRequest,
} from '../types';

// Customer hooks
export const useCustomers = () => {
  return useQuery({
    queryKey: ['customers'],
    queryFn: () => customersApi.getAll().then((res) => res.data),
  });
};

export const useCustomer = (id: string) => {
  return useQuery({
    queryKey: ['customers', id],
    queryFn: () => customersApi.getById(id).then((res) => res.data),
    enabled: !!id,
  });
};

export const useCreateCustomer = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CreateCustomerRequest) =>
      customersApi.create(data).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
};

export const useUpdateCustomer = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCustomerRequest }) =>
      customersApi.update(id, data).then((res) => res.data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customers', id] });
    },
  });
};

export const useDeleteCustomer = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => customersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
};

export const useSearchCustomers = (query: string) => {
  return useQuery({
    queryKey: ['customers', 'search', query],
    queryFn: () => customersApi.search(query).then((res) => res.data),
    enabled: !!query,
  });
};

// Order hooks
export const useOrders = () => {
  return useQuery({
    queryKey: ['orders'],
    queryFn: () => ordersApi.getAll().then((res) => res.data),
  });
};

export const useOrder = (id: string) => {
  return useQuery({
    queryKey: ['orders', id],
    queryFn: () => ordersApi.getById(id).then((res) => res.data),
    enabled: !!id,
  });
};

export const useCreateOrder = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CreateOrderRequest) =>
      ordersApi.create(data).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
};

export const useUpdateOrder = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateOrderRequest }) =>
      ordersApi.update(id, data).then((res) => res.data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders', id] });
    },
  });
};

export const useDeleteOrder = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => ordersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
};

export const useGenerateOrderNumber = () => {
  return useQuery({
    queryKey: ['orders', 'generate-number'],
    queryFn: () => ordersApi.generateOrderNumber().then((res) => res.data.orderNumber),
  });
};

export const useOrdersByCustomer = (customerId: string) => {
  return useQuery({
    queryKey: ['orders', 'by-customer', customerId],
    queryFn: () => ordersApi.getByCustomer(customerId).then((res) => res.data),
    enabled: !!customerId,
  });
};

export const useOrdersByStatus = (status: string) => {
  return useQuery({
    queryKey: ['orders', 'by-status', status],
    queryFn: () => ordersApi.getByStatus(status).then((res) => res.data),
    enabled: !!status,
  });
};

export const useTopProfitOrders = (limit?: number) => {
  return useQuery({
    queryKey: ['orders', 'top-profit', limit],
    queryFn: () => ordersApi.getTopProfitOrders(limit).then((res) => res.data),
  });
};

export const useProfitAnalytics = () => {
  return useQuery({
    queryKey: ['orders', 'profit-analytics'],
    queryFn: () => ordersApi.getProfitAnalytics().then((res) => res.data),
  });
};
