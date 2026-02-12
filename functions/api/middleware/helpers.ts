export function safeError(c: any, error: any, status: number = 500) {
  console.error("[API Error]", error?.message || error);
  if (status >= 400 && status < 500) {
    return c.json(
      { error: error?.message || "요청 처리 실패" },
      status as any
    );
  }
  const isDev = (c.env as any).ENVIRONMENT === "development";
  return c.json(
    { error: isDev ? error.message : "서버 오류가 발생했습니다." },
    500
  );
}

export function parsePagination(c: any) {
  let page = parseInt(c.req.query("page") || "1");
  let limit = parseInt(c.req.query("limit") || "20");
  if (isNaN(page) || page < 1) page = 1;
  if (isNaN(limit) || limit < 1) limit = 20;
  if (limit > 100) limit = 100;
  return { page, limit, offset: (page - 1) * limit };
}
