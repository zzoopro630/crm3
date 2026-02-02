import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getConsultantInquiries,
  updateConsultantInquiry,
} from "@/services/consultantInquiries";
import type {
  ConsultantInquiryListParams,
  UpdateConsultantInquiryInput,
} from "@/types/consultantInquiry";

export function useConsultantInquiries(
  params: ConsultantInquiryListParams = {}
) {
  return useQuery({
    queryKey: ["consultant-inquiries", params],
    queryFn: () => getConsultantInquiries(params),
  });
}

export function useUpdateConsultantInquiry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: number;
      input: UpdateConsultantInquiryInput;
    }) => updateConsultantInquiry(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["consultant-inquiries"] });
    },
  });
}
