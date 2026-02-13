export const DESIGN_LABELS = [
  "가로형1",
  "가로형2",
  "가로형3-블랙골드",
  "가로형4-블루실버",
  "가로형5-퍼플",
  "가로형6-화이트골드",
  "세로형1",
  "세로형2-블랙골드",
  "세로형3-화이트골드",
];

export const PRICE_PER_SET = 12000;

export const GRADE_OPTIONS = [
  "총괄이사",
  "사업단장",
  "지점장",
  "팀장",
  "설계사",
  "FC",
  "컨설턴트",
];

export const BRANCH_OPTIONS = [
  "감동",
  "다올",
  "다원",
  "라온",
  "미르",
  "베스트",
  "센텀",
  "유럽",
  "윈윈",
  "직할",
  "캐슬",
  "해성",
];

export type Step = "order" | "shipping" | "success";
export type CardType = "로고형" | "전화번호형";

export type Applicant = {
  design: number;
  designLabel: string;
  cardType: string;
  name: string;
  grade: string;
  branch: string;
  phone: string;
  email: string;
  request: string;
  qty: number;
  fax?: string;
  addrBase?: string;
  addrDetail?: string;
};

export type OrderResult = {
  id: number;
  totalQty: number;
  deliveryFee: number;
  totalAmount: number;
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
};

export const getCardImagePath = (designId: number, type: CardType) => {
  const suffix = type === "로고형" ? 1 : 2;
  return `/card-designs/${designId}-${suffix}.png`;
};

export const formatPhone = (val: string) => {
  let digits = val.replace(/[^0-9]/g, "");
  if (digits.length > 0 && !digits.startsWith("010")) digits = "010" + digits;
  if (digits.length > 11) digits = digits.substring(0, 11);
  if (digits.length > 7)
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  if (digits.length > 3)
    return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return digits;
};

export const formatFax = (val: string) => {
  let digits = val.replace(/[^0-9]/g, "");
  if (digits.length > 12) digits = digits.substring(0, 12);
  let areaLen = 3;
  if (digits.startsWith("02")) areaLen = 2;
  else if (digits.startsWith("050")) areaLen = 4;
  if (digits.length > areaLen + 4)
    return `${digits.slice(0, areaLen)}-${digits.slice(areaLen, areaLen + 4)}-${digits.slice(areaLen + 4)}`;
  if (digits.length > areaLen)
    return `${digits.slice(0, areaLen)}-${digits.slice(areaLen)}`;
  return digits;
};
