-- inquiry_date에 시간 정보가 없으면(00:00:00) created_at 시간으로 대체
CREATE OR REPLACE FUNCTION marketing.set_inquiry_time()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.inquiry_date IS NULL OR NEW.inquiry_date::time = '00:00:00' THEN
    NEW.inquiry_date := COALESCE(NEW.created_at, NOW());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_inquiry_time ON marketing.inquiries;
CREATE TRIGGER trg_set_inquiry_time
  BEFORE INSERT ON marketing.inquiries
  FOR EACH ROW
  EXECUTE FUNCTION marketing.set_inquiry_time();

-- 기존 데이터 보정
UPDATE marketing.inquiries
SET inquiry_date = created_at
WHERE inquiry_date::time = '00:00:00' AND created_at IS NOT NULL;
