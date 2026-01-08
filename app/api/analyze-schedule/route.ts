import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    let imageBase64;
    try {
      const body = await request.json();
      imageBase64 = body.imageBase64;
    } catch (parseError) {
      return NextResponse.json(
        { error: "요청 본문을 파싱할 수 없습니다." },
        { status: 400 }
      );
    }

    if (!imageBase64) {
      return NextResponse.json(
        { error: "이미지가 제공되지 않았습니다." },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API 키가 설정되지 않았습니다." },
        { status: 500 }
      );
    }

    // GPT-4o Vision API를 사용하여 이미지 분석
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `당신은 근무표 이미지를 분석하는 전문가입니다. 캘린더 이미지에서 날짜와 해당 날짜 칸의 배경색을 정확히 분석하여 JSON 형식으로 반환해주세요.

## 절대적 색상 판별 기준 (반드시 준수)

### 근무 (파란색 계열)
다음 색상 계열은 **무조건 "근무"**입니다:
- 청록색(Cyan): RGB에서 B(파란색) 값이 높고 G(초록색) 값도 높은 색상
- 하늘색(Sky Blue): RGB에서 B 값이 높고 R, G 값이 중간인 밝은 파란색
- 파란색(Blue): RGB에서 B 값이 R, G 값보다 훨씬 높은 색상
- 네이비 블루(Navy Blue): 어두운 파란색 계열
- Azure, Light Blue 등 모든 파란색 계열

### 휴무 (초록색 계열)
다음 색상 계열은 **무조건 "휴무"**입니다:
- 연두색(Lime): RGB에서 G(초록색) 값이 높고 R 값도 높은 밝은 초록색
- 초록색(Green): RGB에서 G 값이 R, B 값보다 훨씬 높은 색상
- 풀색(Grass Green): 자연스러운 초록색 계열
- Yellow-Green, Chartreuse 등 모든 초록색 계열

## Step-by-Step 분석 프로세스

각 날짜를 분석할 때 반드시 다음 순서로 진행하세요:

### Step 1: 범례(Legend) 확인 (최우선)
1. 이미지의 구석(보통 상단, 하단, 좌측, 우측)에 범례가 있는지 확인
2. 범례가 있다면:
   - 범례에서 "휴무" 또는 "근무"에 해당하는 색상을 먼저 확인
   - 범례의 색상이 최우선 기준입니다
   - 범례의 색상을 RGB 톤으로 정확히 파악

### Step 2: RGB 색상 톤 분석 (마음속으로 먼저 분석)
각 날짜 셀을 분석할 때:
1. **배경색의 RGB 톤을 먼저 분석**
   - R(빨강), G(초록), B(파랑) 값의 상대적 비율을 파악
   - B 값이 R, G보다 높으면 → 파란색 계열 → 근무
   - G 값이 R, B보다 높으면 → 초록색 계열 → 휴무
   - R, G, B가 비슷하면 → 회색/흰색 계열 → 추가 분석 필요

2. **색상 판별 예시:**
   - RGB(100, 200, 250) → B가 가장 높음 → 파란색 계열 → 근무
   - RGB(150, 220, 100) → G가 가장 높음 → 초록색 계열 → 휴무
   - RGB(200, 200, 200) → 비슷함 → 회색 계열 → Step 3으로

### Step 3: 색상이 애매한 경우 보조 판단
배경색이 명확하지 않거나 회색/흰색 계열인 경우:

1. **텍스트(글자) 색상 확인**
   - 날짜 숫자나 텍스트의 색상을 확인
   - 텍스트가 파란색 계열이면 → 근무
   - 텍스트가 초록색 계열이면 → 휴무

2. **주변 셀과의 명암 차이 비교**
   - 주변 셀(위, 아래, 좌, 우)의 색상과 비교
   - 해당 셀이 주변보다 파란색 톤이 강하면 → 근무
   - 해당 셀이 주변보다 초록색 톤이 강하면 → 휴무
   - 명암 차이를 통해 미세한 색상 차이를 감지

3. **텍스트 내용 참고 (최후의 수단)**
   - 색상 판별이 매우 애매한 경우에만 텍스트 내용 참고
   - "OFF", "휴", "ATDO", "ADO" → 휴무
   - "KE"로 시작, 비행 관련 텍스트 → 근무

### Step 4: Reasoning 기록
각 날짜에 대해 다음을 reasoning 필드에 기록:
- RGB 톤 분석 결과 (예: "RGB 톤 분석: B값이 높아 파란색 계열로 판단")
- 범례 참고 여부 (예: "범례에서 파란색이 근무로 표시됨")
- 보조 판단 사용 여부 (예: "배경색이 애매하여 텍스트 색상(파란색)으로 판단")
- 최종 판단 근거

## 반환 형식

다음과 같은 JSON 배열 형식으로 반환하세요:
[
  {
    "date": "2026-01-01",
    "color": "연두색",
    "type": "휴무",
    "reasoning": "Step 1: 범례 확인 - 범례에서 초록색이 휴무로 표시됨. Step 2: RGB 톤 분석 - 배경색 RGB(150, 220, 100), G값이 가장 높아 초록색 계열로 판단. 최종: 휴무"
  },
  {
    "date": "2026-01-02",
    "color": "파란색",
    "type": "근무",
    "reasoning": "Step 1: 범례 확인 - 범례에서 파란색이 근무로 표시됨. Step 2: RGB 톤 분석 - 배경색 RGB(100, 180, 250), B값이 가장 높아 파란색 계열로 판단. 최종: 근무"
  },
  {
    "date": "2026-01-03",
    "color": "하늘색",
    "type": "근무",
    "reasoning": "Step 2: RGB 톤 분석 - 배경색 RGB(200, 200, 200)으로 회색 계열. Step 3: 텍스트 색상 확인 - 텍스트가 하늘색(RGB: 135, 206, 235)으로 보임, B값이 높아 파란색 계열. 최종: 근무"
  }
]

## 중요 사항

1. **범례가 있으면 반드시 최우선으로 사용하세요**
2. **RGB 톤을 먼저 분석한 후 판단하세요** (바로 JSON 만들지 말 것)
3. **파란색과 초록색을 혼동하지 마세요** - B값이 높으면 파란색(근무), G값이 높으면 초록색(휴무)
4. **색상이 애매하면 Step 3의 보조 판단을 사용하세요**
5. **reasoning 필드에 Step-by-Step 분석 과정을 반드시 포함하세요**
6. 날짜는 2026년 기준으로 파싱하세요
7. JSON만 반환하고 다른 설명은 포함하지 마세요`,
        },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`,
                detail: "high",
              },
            },
          ],
        },
      ],
      max_tokens: 4000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json(
        { error: "이미지 분석에 실패했습니다." },
        { status: 500 }
      );
    }

    // JSON 추출 (마크다운 코드 블록 제거)
    let jsonString = content.trim();
    if (jsonString.startsWith("```json")) {
      jsonString = jsonString.replace(/```json\n?/g, "").replace(/```\n?/g, "");
    } else if (jsonString.startsWith("```")) {
      jsonString = jsonString.replace(/```\n?/g, "");
    }

    // JSON 파싱
    let scheduleData;
    try {
      scheduleData = JSON.parse(jsonString);
    } catch (parseError) {
      // JSON 파싱 실패 시, JSON 부분만 추출 시도
      const jsonMatch = jsonString.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        scheduleData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("JSON 형식으로 파싱할 수 없습니다.");
      }
    }

    // 데이터 유효성 검사 및 정규화
    if (!Array.isArray(scheduleData)) {
      throw new Error("일정 데이터가 배열 형식이 아닙니다.");
    }

    // 날짜 형식 검증 및 정규화
    const normalizedSchedule = scheduleData
      .map((item: any) => {
        if (!item.date) {
          return null;
        }

        // 날짜 파싱 (YYYY-MM-DD 형식으로 정규화)
        let dateStr = item.date;
        if (typeof dateStr === "string") {
          // 다양한 날짜 형식 지원
          const dateMatch = dateStr.match(/(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
          if (dateMatch) {
            const [, year, month, day] = dateMatch;
            dateStr = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
          }
        }

        // 색상 기반 타입 결정
        let workType = "";
        const color = (item.color || "").toLowerCase();
        const type = item.type || "";
        const reasoning = item.reasoning || "";

        // type 필드가 있으면 우선 사용 (API가 이미 판단한 경우)
        if (type) {
          workType = type;
        }
        // 색상 기반 판단
        else if (color.includes("연두") || color.includes("lime") || color.includes("yellow-green") || color.includes("light green") || color.includes("chartreuse")) {
          workType = "휴무";
        }
        else if (color.includes("파란") || color.includes("하늘") || color.includes("blue") || color.includes("cyan") || color.includes("sky") || color.includes("azure") || color.includes("navy")) {
          workType = "근무";
        }
        else {
          workType = "기타";
        }

        return {
          date: dateStr,
          text: workType, // 최종 결정된 근무 유형
          originalColor: item.color || "",
          reasoning: reasoning, // 판단 근거
        };
      })
      .filter((item: any) => item !== null);

    return NextResponse.json(
      { schedule: normalizedSchedule, raw: true }, // raw 플래그 추가
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error: any) {
    console.error("이미지 분석 오류:", error);
    
    // OpenAI API 에러 처리
    if (error instanceof Error) {
      if (error.message.includes("API key")) {
        return NextResponse.json(
          { error: "OpenAI API 키가 유효하지 않습니다. .env.local 파일을 확인해주세요." },
          {
            status: 401,
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
      }
    }

    return NextResponse.json(
      {
        error: error.message || "이미지 분석 중 오류가 발생했습니다.",
        details: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
}
