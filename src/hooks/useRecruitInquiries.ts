import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getRecruitInquiries,
  updateRecruitInquiry,
} from "@/services/recruitInquiries";
import type { InquiryListParams, UpdateInquiryInput } from "@/types/inquiry";

export function useRecruitInquiries(params: InquiryListParams = {}) {
  return useQuery({
    queryKey: ["recruit-inquiries", params],
    queryFn: () => getRecruitInquiries(params),
  });
}

export function useUpdateRecruitInquiry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateInquiryInput }) =>
      updateRecruitInquiry(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recruit-inquiries"] });
    },
  });
}
