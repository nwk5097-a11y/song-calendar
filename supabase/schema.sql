-- calendars 테이블 생성
CREATE TABLE IF NOT EXISTS calendars (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  title TEXT NOT NULL,
  category TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성 (날짜로 빠른 검색을 위해)
CREATE INDEX IF NOT EXISTS idx_calendars_date ON calendars(date);
CREATE INDEX IF NOT EXISTS idx_calendars_category ON calendars(category);

-- updated_at 자동 업데이트를 위한 트리거 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- updated_at 트리거 생성
CREATE TRIGGER update_calendars_updated_at
  BEFORE UPDATE ON calendars
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security) 활성화
ALTER TABLE calendars ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 읽고 쓸 수 있도록 정책 생성 (필요에 따라 수정 가능)
CREATE POLICY "Allow all operations for authenticated users" ON calendars
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 또는 인증된 사용자만 접근 가능하도록 설정하려면:
-- CREATE POLICY "Allow all operations for authenticated users" ON calendars
--   FOR ALL
--   USING (auth.role() = 'authenticated')
--   WITH CHECK (auth.role() = 'authenticated');
