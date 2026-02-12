import express from "express";
import cors from "cors";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import sitesRouter from "./routes/sites.js";
import keywordsRouter from "./routes/keywords.js";
import rankingsRouter from "./routes/rankings.js";
import urlTrackingRouter from "./routes/url-tracking.js";
import crawlRouter from "./routes/crawl.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

// 미들웨어
app.use(cors());
app.use(express.json());

// 라우터
app.use("/api/sites", sitesRouter);
app.use("/api/keywords", keywordsRouter);
app.use("/api/rankings", rankingsRouter);
app.use("/api/url-tracking", urlTrackingRouter);
app.use("/api/crawl", crawlRouter);

// 프로덕션: 빌드된 프론트엔드 서빙
const distPath = join(__dirname, "../dist");
app.use(express.static(distPath));

// SPA 라우팅: 모든 요청을 index.html로
app.get("/{*path}", (req, res) => {
  res.sendFile(join(distPath, "index.html"));
});

// 에러 핸들링
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "서버 오류가 발생했습니다." });
});

app.listen(PORT, () => {
  console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
});
