import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getOrders,
  getOrder,
  createOrder,
  updateOrderStatus,
} from "@/services/orders";
import type { CreateProductInput, UpdateProductInput, CreateOrderInput } from "@/types/order";

// ---- Products ----
export function useLeadProducts(all = false) {
  return useQuery({
    queryKey: ["leadProducts", { all }],
    queryFn: () => getProducts(all),
    staleTime: 1000 * 60 * 60, // 1시간
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProductInput) => createProduct(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leadProducts"] });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateProductInput }) =>
      updateProduct(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leadProducts"] });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leadProducts"] });
    },
  });
}

// ---- Orders ----
export function useLeadOrders(params: { page?: number; limit?: number; status?: string } = {}) {
  return useQuery({
    queryKey: ["leadOrders", params],
    queryFn: () => getOrders(params),
    staleTime: 1000 * 60, // 1분
  });
}

export function useLeadOrder(id: number | null) {
  return useQuery({
    queryKey: ["leadOrder", id],
    queryFn: () => getOrder(id!),
    enabled: id !== null,
    staleTime: 1000 * 60,
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateOrderInput) => createOrder(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leadOrders"] });
    },
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      updateOrderStatus(id, status),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["leadOrders"] });
      queryClient.invalidateQueries({ queryKey: ["leadOrder", variables.id] });
    },
  });
}
