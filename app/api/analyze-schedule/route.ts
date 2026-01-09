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
          content: `당신은 근무표 이미지를 정확히 분석하는 전문가입니다. 캘린더 이미지에서 각 날짜 칸의 배경색을 정밀 분석하여 JSON 형식으로 반환하세요.

## 🚨 절대적 색상 판별 규칙 (100% 준수 필수!)

### 🔵 근무 (파란색/하늘색 계열) - 무조건 "근무"
**기준 색상 코드:**
- #0082EB (RGB: 0, 130, 235) - 진한 파란색
- #57BBE7 (RGB: 87, 187, 231) - 하늘색/밝은 파란색

**판별 기준 (하나라도 해당하면 무조건 "근무"):**
1. RGB에서 B(파란색) 값이 R, G 값보다 높으면 → **무조건 "근무"**
2. B 값이 150 이상이면 → **무조건 "근무"**
3. B 값이 G 값보다 높으면 → **무조건 "근무"**
4. #0082EB, #57BBE7와 유사한 색상이면 → **무조건 "근무"**

**예시 (모두 "근무"):**
- RGB(0, 130, 235) → B(235)가 최고 → 근무 ✅
- RGB(87, 187, 231) → B(231)가 최고 → 근무 ✅
- RGB(50, 100, 200) → B(200)가 최고 → 근무 ✅
- RGB(100, 150, 180) → B(180)가 최고 → 근무 ✅

### 🟢 휴무 (연두색/올리브 그린 계열) - 무조건 "휴무"
**기준 색상 코드:**
- #B0BF08 (RGB: 176, 191, 8) - 올리브 그린/연두색

**판별 기준 (하나라도 해당하면 무조건 "휴무"):**
1. RGB에서 G(초록색) 값이 R, B 값보다 높으면 → **무조건 "휴무"**
2. G 값이 150 이상이고 B 값이 50 이하면 → **무조건 "휴무"**
3. G 값이 B 값보다 높으면 → **무조건 "휴무"**
4. #B0BF08와 유사한 색상이면 → **무조건 "휴무"**

**예시 (모두 "휴무"):**
- RGB(176, 191, 8) → G(191)가 최고 → 휴무 ✅
- RGB(150, 200, 50) → G(200)가 최고 → 휴무 ✅
- RGB(180, 220, 100) → G(220)가 최고 → 휴무 ✅
- RGB(200, 240, 150) → G(240)가 최고 → 휴무 ✅

## Step-by-Step 분석 프로세스

각 날짜를 분석할 때 반드시 다음 순서로 진행하세요:

### Step 1: RGB 색상 톤 분석 (가장 중요!)
**1단계: RGB 값 추출**
- 각 날짜 셀의 배경색 R, G, B 값을 정확히 추출하세요
- 이미지의 색상을 정밀하게 분석하여 RGB 값을 파악하세요

**2단계: B와 G 비교 (절대적 규칙)**
- **B > G 이면 → 무조건 "근무"** (파란색 계열)
- **G > B 이면 → 무조건 "휴무"** (초록색 계열)
- **B = G 이면 → Step 2로 (회색 계열 가능성)**

**3단계: 절대값 기준 확인**
- B ≥ 150 이면 → **무조건 "근무"**
- G ≥ 150 이고 B ≤ 50 이면 → **무조건 "휴무"**

**판별 예시 (반드시 이렇게 판단):**
- RGB(0, 130, 235): B(235) > G(130) → **근무** ✅
- RGB(87, 187, 231): B(231) > G(187) → **근무** ✅
- RGB(176, 191, 8): G(191) > B(8) → **휴무** ✅
- RGB(100, 200, 250): B(250) > G(200) → **근무** ✅
- RGB(150, 220, 100): G(220) > B(100) → **휴무** ✅

### Step 2: 색상이 애매한 경우 보조 판단
배경색이 명확하지 않거나 회색/흰색 계열인 경우:

1. **텍스트(글자) 색상 확인**
   - 날짜 숫자나 텍스트의 색상을 확인
   - 텍스트가 파란색 계열이면 → 근무
   - 텍스트가 초록색 계열이면 → 휴무

2. **주변 셀과의 명암 차이 비교**
   - 주변 셀(위, 아래, 좌, 우)의 색상과 비교
   - 해당 셀이 주변보다 파란색 톤이 강하면 → 근무
   - 해당 셀이 주변보다 초록색 톤이 강하면 → 휴무

3. **텍스트 내용 참고 (최후의 수단)**
   - 색상 판별이 매우 애매한 경우에만 텍스트 내용 참고
   - "OFF", "휴", "ATDO", "ADO" → 휴무
   - "KE"로 시작, 비행 관련 텍스트 → 근무

### Step 3: Reasoning 기록
각 날짜에 대해 다음을 reasoning 필드에 기록:
- RGB 톤 분석 결과 (반드시 "RGB(R, G, B)" 형식으로 포함)
- 판단 근거 (예: "RGB(0, 130, 235) 분석: B(235) > G(130), B값이 높아 파란색 계열. 최종: 근무")

## 반환 형식

다음과 같은 JSON 배열 형식으로 반환하세요:
[
  {
    "date": "2026-01-01",
    "color": "#B0BF08 또는 유사한 연두색",
    "type": "휴무",
    "reasoning": "RGB(176, 191, 8) 분석: G(191) > B(8), G값이 높아 초록색 계열로 판단. 기준 색상 #B0BF08와 일치. 최종: 휴무"
  },
  {
    "date": "2026-01-02",
    "color": "#0082EB 또는 유사한 파란색",
    "type": "근무",
    "reasoning": "RGB(0, 130, 235) 분석: B(235) > G(130), B값이 높아 파란색 계열로 판단. 기준 색상 #0082EB와 일치. 최종: 근무"
  },
  {
    "date": "2026-01-03",
    "color": "#57BBE7 또는 유사한 하늘색",
    "type": "근무",
    "reasoning": "RGB(87, 187, 231) 분석: B(231) > G(187), B값이 높아 파란색 계열로 판단. 기준 색상 #57BBE7와 일치. 최종: 근무"
  }
]

## 🚨 최종 체크리스트 (반드시 확인!)

각 날짜를 분석할 때 반드시 다음을 확인하세요:

1. **RGB 값 추출했나요?** → R, G, B 값을 정확히 파악
2. **B와 G를 비교했나요?**
   - B > G → **"근무"** (절대 규칙)
   - G > B → **"휴무"** (절대 규칙)
3. **reasoning에 RGB(R, G, B) 형식으로 값을 명시했나요?**
   - 예: "RGB(0, 130, 235) 분석: B(235) > G(130), B값이 높아 파란색 계열. 최종: 근무"

**절대 금지 사항:**
- ❌ B > G인데 "휴무"로 분류하는 것
- ❌ G > B인데 "근무"로 분류하는 것
- ❌ RGB 값을 확인하지 않고 추측하는 것
- ❌ reasoning에 RGB 값을 포함하지 않는 것

날짜는 2026년 기준으로 파싱하세요.
JSON만 반환하고 다른 설명은 포함하지 마세요.`,
        },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`,
                detail: "high", // high로 복원하여 정확도 향상
              },
            },
          ],
        },
      ],
      max_tokens: 4000, // 토큰 수 늘려서 상세한 분석 가능
      temperature: 0.2, // 낮은 temperature로 정확도 향상
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

        // 색상 기반 타입 결정 (최우선)
        let workType = "";
        const color = (item.color || "").toLowerCase();
        const type = item.type || "";
        const reasoning = item.reasoning || "";

        // Step 1: reasoning에서 RGB 값 직접 파싱 (가장 정확)
        const rgbMatch = reasoning.match(/RGB\((\d+),\s*(\d+),\s*(\d+)\)/i) || 
                        reasoning.match(/rgb[:\s]+(\d+)[,\s]+(\d+)[,\s]+(\d+)/i);
        if (rgbMatch) {
          const r = parseInt(rgbMatch[1]);
          const g = parseInt(rgbMatch[2]);
          const b = parseInt(rgbMatch[3]);
          
          // 절대 규칙: B > G면 근무, G > B면 휴무
          if (b > g) {
            workType = "근무";
          } else if (g > b) {
            workType = "휴무";
          } else if (b >= 150) {
            workType = "근무";
          } else if (g >= 150 && b <= 50) {
            workType = "휴무";
          }
        }

        // Step 2: 색상 키워드 기반 판단 (RGB 파싱 실패 시)
        if (!workType) {
          // 연두색/올리브 그린 계열 (#B0BF08와 유사) - 무조건 휴무
          const greenKeywords = [
            "연두", "lime", "yellow-green", "light green", "chartreuse", 
            "초록", "green", "grass", "emerald", "mint", "olive",
            "verdant", "leaf", "forest", "jade", "teal-green",
            "#b0bf08", "#B0BF08", "b0bf08" // 기준 색상 코드
          ];
          const isGreen = greenKeywords.some(keyword => color.includes(keyword));

          // 파란색/하늘색 계열 (#0082EB, #57BBE7와 유사) - 무조건 근무
          const blueKeywords = [
            "파란", "하늘", "blue", "cyan", "sky", "azure", "navy",
            "light blue", "steel blue", "royal blue", "powder blue",
            "cornflower", "turquoise", "aqua", "cerulean", "sapphire",
            "#0082eb", "#0082EB", "0082eb", // 기준 색상 코드
            "#57bbe7", "#57BBE7", "57bbe7"  // 기준 색상 코드
          ];
          const isBlue = blueKeywords.some(keyword => color.includes(keyword));

          if (isGreen) {
            workType = "휴무";
          } else if (isBlue) {
            workType = "근무";
          }
        }

        // Step 3: type 필드 사용 (위 방법들이 모두 실패한 경우)
        if (!workType && type && (type === "휴무" || type === "근무")) {
          workType = type;
        }

        // Step 4: 모두 실패하면 기타
        if (!workType) {
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
