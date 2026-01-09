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
          content: `당신은 근무표 이미지를 분석하는 전문가입니다. 이미지 전체를 보고 날짜 셀들의 배경색을 **클러스터링(Clustering)** 방식으로 딱 두 가지 그룹으로만 분류하세요.

## 🎯 클러스터링 접근 방식 (색상 이름 금지!)

**중요: 색상 이름을 맞추려고 하지 마라. 이미지 전체를 보고 상대적인 온도 차이로만 구분해라.**

### Step 1: 이미지 전체 스캔
1. 이미지 전체의 모든 날짜 셀을 한 번에 스캔하세요
2. 배경색이 있는 모든 셀을 확인하세요
3. 흰색 배경은 무시하세요

### Step 2: 두 그룹으로 클러스터링
모든 날짜 셀의 배경색을 다음 두 그룹으로만 분류:

**Group 1 (warm) - 따뜻한 느낌**
- 약간이라도 노란끼(Yellowish)가 있는 색상
- 따뜻한 느낌(Warm)이 느껴지는 색상
- 올리브색, 연두색 계열 (하지만 색 이름이 아니라 느낌으로 판단!)

**Group 2 (cool) - 차가운 느낌**
- 푸른끼(Blueish)가 있는 색상
- 차가운 느낌(Cool)이 느껴지는 색상
- 하늘색, 파란색 계열 (하지만 색 이름이 아니라 느낌으로 판단!)

### Step 3: 상대적 온도 차이 판단
각 날짜 셀을 분석할 때:

1. **이미지 내 다른 셀들과 비교**
   - 다른 셀들 중 따뜻한 느낌(warm)이 있는 그룹과 비교
   - 다른 셀들 중 차가운 느낌(cool)이 있는 그룹과 비교

2. **상대적 위치 결정**
   - 해당 셀이 따뜻한 그룹에 더 가깝다면 → colorGroup: "warm"
   - 해당 셀이 차가운 그룹에 더 가깝다면 → colorGroup: "cool"

3. **RGB 값 참고 (보조 수단)**
   - RGB 값은 참고용으로만 사용
   - 최종 판단은 **상대적 온도 차이**로 결정

## 최종 매핑 규칙

- **colorGroup: "warm"** → 무조건 **type: "휴무"**
- **colorGroup: "cool"** → 무조건 **type: "근무"**

## 반환 형식

다음과 같은 JSON 배열 형식으로 반환하세요 (colorGroup 필드 필수!):
[
  {
    "date": "2026-01-01",
    "color": "배경색 설명",
    "colorGroup": "warm",
    "type": "휴무",
    "reasoning": "이미지 전체 스캔 결과, 다른 셀들과 비교 시 따뜻한 느낌(warm)이 느껴짐. 노란끼가 도는 톤. Group 1(warm)에 속함. 최종: 휴무"
  },
  {
    "date": "2026-01-02",
    "color": "배경색 설명",
    "colorGroup": "cool",
    "type": "근무",
    "reasoning": "이미지 전체 스캔 결과, 다른 셀들과 비교 시 차가운 느낌(cool)이 느껴짐. 푸른끼가 도는 톤. Group 2(cool)에 속함. 최종: 근무"
  },
  {
    "date": "2026-01-03",
    "color": "배경색 설명",
    "colorGroup": "cool",
    "type": "근무",
    "reasoning": "이미지 내 다른 파란색 셀들과 비교 시 동일한 차가운 느낌. Group 2(cool)에 속함. 최종: 근무"
  }
]

## 🚨 절대 금지 사항

- ❌ 색상 이름(연두색, 하늘색 등)을 맞추려고 하는 것
- ❌ 개별 셀을 독립적으로 분석하는 것 (반드시 이미지 전체를 보고 클러스터링!)
- ❌ colorGroup 필드를 생략하는 것
- ❌ warm 그룹인데 "근무"로 분류하는 것
- ❌ cool 그룹인데 "휴무"로 분류하는 것
- ❌ 상대적 비교 없이 RGB 값만으로 판단하는 것

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

        // 색상 기반 타입 결정 (최우선: colorGroup 기반)
        let workType = "";
        const color = (item.color || "").toLowerCase();
        const type = item.type || "";
        const colorGroup = (item.colorGroup || "").toLowerCase();
        const reasoning = item.reasoning || "";

        // Step 1: colorGroup 필드 우선 처리 (클러스터링 결과)
        if (colorGroup === "warm") {
          workType = "휴무";
        } else if (colorGroup === "cool") {
          workType = "근무";
        }

        // Step 2: colorGroup이 없으면 reasoning에서 RGB 값 직접 파싱
        if (!workType) {
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
        }

        // Step 3: 색상 키워드 기반 판단 (위 방법들이 실패한 경우)
        if (!workType) {
          // 연두색/올리브 그린 계열 - 무조건 휴무
          const greenKeywords = [
            "연두", "lime", "yellow-green", "light green", "chartreuse", 
            "초록", "green", "grass", "emerald", "mint", "olive",
            "verdant", "leaf", "forest", "jade", "teal-green",
            "#b0bf08", "#B0BF08", "b0bf08", "warm" // warm 키워드도 포함
          ];
          const isGreen = greenKeywords.some(keyword => color.includes(keyword) || reasoning.toLowerCase().includes(keyword));

          // 파란색/하늘색 계열 - 무조건 근무
          const blueKeywords = [
            "파란", "하늘", "blue", "cyan", "sky", "azure", "navy",
            "light blue", "steel blue", "royal blue", "powder blue",
            "cornflower", "turquoise", "aqua", "cerulean", "sapphire",
            "#0082eb", "#0082EB", "0082eb", // 기준 색상 코드
            "#57bbe7", "#57BBE7", "57bbe7", "cool" // cool 키워드도 포함
          ];
          const isBlue = blueKeywords.some(keyword => color.includes(keyword) || reasoning.toLowerCase().includes(keyword));

          if (isGreen) {
            workType = "휴무";
          } else if (isBlue) {
            workType = "근무";
          }
        }

        // Step 4: type 필드 사용 (위 방법들이 모두 실패한 경우)
        if (!workType && type && (type === "휴무" || type === "근무")) {
          workType = type;
        }

        // Step 5: 모두 실패하면 기타
        if (!workType) {
          workType = "기타";
        }

        return {
          date: dateStr,
          text: workType, // 최종 결정된 근무 유형
          originalColor: item.color || "",
          colorGroup: colorGroup || "", // 클러스터링 그룹 (warm/cool)
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
