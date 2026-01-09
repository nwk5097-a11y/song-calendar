# 2026 러블리 달력

Next.js, Tailwind CSS, Shadcn UI를 사용하여 만든 모던하고 핑크 톤의 러블리한 디자인의 달력 웹사이트입니다.

## 기능

- 📅 2026년 달력 표시
- ✨ 날짜 클릭 시 일정 추가 모달
- 📸 근무표 사진 업로드 및 AI 분석 (GPT-4o)
- 🤖 OpenAI GPT-4o를 통한 근무표 자동 인식
- 💾 Supabase를 통한 일정 데이터 영구 저장
- 💖 핑크 톤의 러블리한 디자인
- 📱 반응형 디자인 (모바일 지원)
- 🎨 모던한 UI/UX

## 시작하기

### 설치

```bash
npm install
```

### 환경 변수 설정

`.env.local` 파일을 생성하고 다음 환경 변수를 설정하세요:

```bash
# OpenAI API Key
OPENAI_API_KEY=your_openai_api_key_here

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

**OpenAI API 키**: [OpenAI Platform](https://platform.openai.com/api-keys)에서 발급받을 수 있습니다.

**Supabase 설정**:
1. [Supabase](https://supabase.com)에서 프로젝트 생성
2. Settings > API에서 URL과 Anon Key 확인
3. SQL Editor에서 `supabase/schema.sql` 파일의 내용을 실행하여 테이블 생성

### Supabase 테이블 생성

1. Supabase 대시보드에 로그인
2. SQL Editor로 이동
3. `supabase/schema.sql` 파일의 내용을 복사하여 실행

또는 직접 SQL Editor에서 다음 쿼리를 실행:

```sql
CREATE TABLE IF NOT EXISTS calendars (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  title TEXT NOT NULL,
  category TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calendars_date ON calendars(date);
CREATE INDEX IF NOT EXISTS idx_calendars_category ON calendars(category);
```

### 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인하세요.

### 빌드

```bash
npm run build
```

### 프로덕션 실행

```bash
npm start
```

## 기술 스택

- **Next.js 14** - React 프레임워크
- **TypeScript** - 타입 안정성
- **Tailwind CSS** - 유틸리티 우선 CSS 프레임워크
- **Shadcn UI** - 재사용 가능한 UI 컴포넌트
- **OpenAI GPT-4o** - 이미지 분석 및 텍스트 추출
- **Supabase** - 데이터베이스 및 백엔드
- **date-fns** - 날짜 유틸리티
- **lucide-react** - 아이콘

## 프로젝트 구조

```
├── app/
│   ├── api/
│   │   └── analyze-schedule/
│   │       └── route.ts  # OpenAI API 라우트
│   ├── globals.css      # 전역 스타일
│   ├── layout.tsx       # 루트 레이아웃
│   └── page.tsx         # 메인 페이지
├── components/
│   ├── calendar.tsx     # 달력 컴포넌트
│   ├── add-event-modal.tsx  # 일정 추가 모달
│   ├── upload-schedule-button.tsx  # 근무표 업로드 버튼
│   └── ui/              # UI 컴포넌트들
├── lib/
│   ├── supabase.ts      # Supabase 클라이언트 및 함수
│   └── utils.ts         # 유틸리티 함수
├── supabase/
│   └── schema.sql       # 데이터베이스 스키마
└── package.json
```

## 사용법

### 수동 일정 추가

1. 달력에서 원하는 날짜를 클릭합니다.
2. 모달창에서 일정 제목, 설명, 카테고리를 입력합니다.
3. "추가하기" 버튼을 클릭하여 일정을 저장합니다.
4. 일정이 있는 날짜는 핑크색으로 표시됩니다.
5. 일정은 Supabase에 자동으로 저장됩니다.

### 근무표 사진 업로드 (AI 분석)

1. 메인 화면 상단의 "근무표 사진 업로드" 버튼을 클릭합니다.
2. 근무표 이미지 파일을 선택합니다.
3. GPT-4o가 이미지를 분석하여 날짜와 근무 유형('휴무', '당직', '데이', '나이트')을 자동으로 추출합니다.
4. 추출된 일정이 자동으로 캘린더에 등록되고 Supabase에 저장됩니다.

### 지원하는 근무 유형

- **휴무**: 휴일/휴무일
- **당직**: 당직 근무
- **데이**: 주간 근무
- **나이트**: 야간 근무

## 데이터베이스 스키마

### calendars 테이블

| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| id | UUID | 기본 키 (자동 생성) |
| date | DATE | 일정 날짜 |
| title | TEXT | 일정 제목 |
| category | TEXT | 일정 카테고리 (선택사항) |
| description | TEXT | 일정 설명 (선택사항) |
| created_at | TIMESTAMP | 생성 시간 |
| updated_at | TIMESTAMP | 수정 시간 |

## 주의사항

- OpenAI API 키와 Supabase 설정이 올바르게 되어 있어야 모든 기능이 정상 작동합니다.
- Supabase 테이블을 먼저 생성해야 일정 저장 기능이 작동합니다.
- 환경 변수 변경 후에는 개발 서버를 재시작해야 합니다.
# love-calendar-2026
# song-calendar
