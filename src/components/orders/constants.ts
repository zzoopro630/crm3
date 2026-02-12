export const REGIONS = [
  "서울/인천/경기",
  "대전/충청",
  "광주/전남",
  "전북",
  "대구/경북",
  "부산/울산/경남",
  "강원",
  "제주",
] as const;

export const AFFILIATIONS = [
  "GOAT",
  "감동",
  "다올",
  "다원",
  "달",
  "라온",
  "미르",
  "베스트",
  "센텀",
  "유럽",
  "직할",
  "캐슬",
  "해성",
  "혜윰",
] as const;

export const POSITIONS = ["총괄이사", "사업단장", "지점장", "팀장"] as const;

export const AS_CONDITIONS = {
  notes: [
    "모든 DB는 최소 5개부터 신청 가능합니다.",
    "전산으로 배분, 관리",
    "지사 단위 신청 가능, 추가 제한 없음",
    "90년생은 납품하지 않습니다.",
  ],
  asBlocked: [
    "장기 부재 및 단박 거절",
    "상담(TA) 중 고객과 약속이 잡힌 경우",
  ],
  images: [
    { src: "/images/as-b-1.png", label: "AS필독" },
    { src: "/images/as-b-2.png", label: "AS조건" },
  ],
} as const;

export const BANK_ACCOUNT = {
  bank: "카카오뱅크",
  number: "3333-36-3512633",
  holder: "송낙주(영업지원팀)",
} as const;
