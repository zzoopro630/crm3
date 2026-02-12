import Database from "better-sqlite3";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const db = new Database(join(__dirname, "rank-check.db"));

// WAL 모드 활성화 (성능 향상)
db.pragma("journal_mode = WAL");

// 외래키 제약 활성화
db.pragma("foreign_keys = ON");

// 스키마 실행
const schema = readFileSync(join(__dirname, "schema.sql"), "utf-8");
db.exec(schema);

export default db;
