import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getInquiries,
  updateInquiry,
  createInquiry,
} from "@/services/inquiries";
import type { InquiryListParams, UpdateInquiryInput, CreateInquiryInput } from "@/types/inquiry";

export function useInquiries(params: InquiryListParams = {}) {
  return useQuery({
    queryKey: ["inquiries", params],
    queryFn: () => getInquiries(params),
  });
}

export function useUpdateInquiry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateInquiryInput }) =>
      updateInquiry(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inquiries"] });
    },
  });
}

export function useCreateInquiry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateInquiryInput) => createInquiry(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inquiries"] });
    },
  });
}
