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
          content: `당신은 근무표 이미지를 분석하는 전문가입니다. 캘린더 이미지에서 각 날짜 칸의 배경색을 정밀 분석하여 JSON 형식으로 반환하세요.

## 🚨 두 가지 색상 세계관 (절대 규칙)

너에게는 딱 두 가지 색상 범주만 존재한다. 다른 색상은 없다.

### 범주 A (휴무) - 녹색 계열
- 연두색, 올리브색, 라임색, 노란끼가 도는 초록색 계열
- 따뜻한 느낌의 녹색 톤
- 기준 색상: #B0BF08 (RGB: 176, 191, 8) - 올리브 그린/연두색

### 범주 B (근무) - 청색 계열
- 하늘색, 파란색, 청록색(Cyan), 시원한 느낌의 파란색 계열
- 차가운 느낌의 청색 톤
- 기준 색상: #0082EB (RGB: 0, 130, 235), #57BBE7 (RGB: 87, 187, 231)

## 🎯 색상 비교 판단 프로세스 (Reasoning First)

**중요: 단순히 색 이름을 맞추려 하지 마라. 반드시 비교 판단을 해라.**

각 날짜 셀을 분석할 때 다음 순서로 진행:

### Step 1: RGB 값 추출 및 비교 분석
1. **배경색의 RGB(R, G, B) 값을 정확히 추출**
2. **범주 A(녹색 계열)와 범주 B(청색 계열) 중 어디에 더 가까운지 비교 판단**

**비교 판단 기준:**
- **G(초록) 값이 B(파랑) 값보다 높으면 → 범주 A(녹색 계열)에 가까움 → 휴무**
- **B(파랑) 값이 G(초록) 값보다 높으면 → 범주 B(청색 계열)에 가까움 → 근무**
- **G와 B가 비슷하면 → 주변 셀과 비교하여 상대적 따뜻함/차가움 판단**

### Step 2: 주변 셀과의 상대적 비교 (애매한 경우)
색상이 애매하거나 G와 B가 비슷한 경우:

1. **주변 셀(위, 아래, 좌, 우)의 색상을 확인**
2. **다른 파란색 셀(범주 B)과 비교**
   - 해당 셀이 주변 파란색 셀보다 **따뜻한 느낌(녹색 쪽)**이면 → 범주 A → 휴무
   - 해당 셀이 주변 파란색 셀보다 **차가운 느낌(청색 쪽)**이면 → 범주 B → 근무
3. **상대적인 색온도(따뜻함/차가움)를 판단 근거로 사용**

### Step 3: Reasoning 필드 작성 (반드시 먼저 작성!)
JSON 출력 전에 반드시 reasoning 필드에 다음을 먼저 서술:

1. **RGB 값**: "RGB(R, G, B) 추출"
2. **비교 판단 과정**: 
   - "G(값) vs B(값) 비교 → 범주 A/B 중 어디에 더 가까운지"
   - "주변 셀과 비교 → 따뜻함/차가움 판단" (필요시)
3. **최종 결정**: "범주 A(녹색 계열)에 가까움 → 휴무" 또는 "범주 B(청색 계열)에 가까움 → 근무"

## 최종 결정 규칙

- **범주 A(녹색 계열)에 더 가깝다면** → 무조건 **"휴무"**
- **범주 B(청색 계열)에 더 가깝다면** → 무조건 **"근무"**
- **색상이 전혀 없는 흰색 배경** → 무시 (해당 날짜 제외)

## 반환 형식

다음과 같은 JSON 배열 형식으로 반환하세요:
[
  {
    "date": "2026-01-01",
    "color": "연두색/올리브색",
    "type": "휴무",
    "reasoning": "RGB(176, 191, 8) 추출. G(191) vs B(8) 비교 → G가 B보다 훨씬 높음. 범주 A(녹색 계열)에 가까움. 따뜻한 느낌의 올리브 그린 톤. 최종: 휴무"
  },
  {
    "date": "2026-01-02",
    "color": "하늘색/파란색",
    "type": "근무",
    "reasoning": "RGB(0, 130, 235) 추출. G(130) vs B(235) 비교 → B가 G보다 훨씬 높음. 범주 B(청색 계열)에 가까움. 차가운 느낌의 파란색 톤. 최종: 근무"
  },
  {
    "date": "2026-01-03",
    "color": "하늘색",
    "type": "근무",
    "reasoning": "RGB(87, 187, 231) 추출. G(187) vs B(231) 비교 → B가 G보다 높음. 범주 B(청색 계열)에 가까움. 주변 파란색 셀과 비교 시 차가운 느낌. 최종: 근무"
  }
]

## 🚨 절대 금지 사항

- ❌ 범주 A(녹색 계열)인데 "근무"로 분류하는 것
- ❌ 범주 B(청색 계열)인데 "휴무"로 분류하는 것
- ❌ RGB 값을 확인하지 않고 색 이름만으로 추측하는 것
- ❌ 비교 판단 없이 바로 결론 내리는 것
- ❌ reasoning에 비교 판단 과정을 생략하는 것

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
