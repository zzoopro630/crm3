-- marketing.consultant_inquiries 테이블 생성
CREATE TABLE IF NOT EXISTS marketing.consultant_inquiries (
  id SERIAL PRIMARY KEY,
  customer_name TEXT NOT NULL,
  phone TEXT,
  product_name TEXT,
  consultant TEXT,
  tf_ref TEXT,
  referer_page TEXT,
  request TEXT,
  source_url TEXT,
  inquiry_date TIMESTAMPTZ DEFAULT NOW(),
  manager_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'new',
  memo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- inquiry_date 시간 자동 보정 트리거 (기존 inquiries와 동일)
CREATE OR REPLACE FUNCTION marketing.fix_consultant_inquiry_time()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.inquiry_date IS NOT NULL THEN
    IF EXTRACT(HOUR FROM NEW.inquiry_date) = 0
       AND EXTRACT(MINUTE FROM NEW.inquiry_date) = 0
       AND EXTRACT(SECOND FROM NEW.inquiry_date) = 0 THEN
      NEW.inquiry_date := NEW.inquiry_date + INTERVAL '12 hours';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_fix_consultant_inquiry_time
  BEFORE INSERT OR UPDATE ON marketing.consultant_inquiries
  FOR EACH ROW
  EXECUTE FUNCTION marketing.fix_consultant_inquiry_time();
