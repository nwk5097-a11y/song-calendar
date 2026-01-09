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
          content: `근무표 이미지 분석: 날짜와 배경색을 분석하여 JSON 반환.

## 절대 규칙
- B > G → "근무" (#0082EB, #57BBE7 계열)
- G > B → "휴무" (#B0BF08 계열)
- B ≥ 150 → "근무"
- G ≥ 150 and B ≤ 50 → "휴무"

## 분석 순서
1. RGB 값 추출 (R, G, B)
2. B와 G 비교 → B>G면 근무, G>B면 휴무
3. 애매하면 텍스트 색상/내용 참고

## 반환 형식
[
  {"date": "2026-01-01", "color": "색상명", "type": "휴무", "reasoning": "RGB(176,191,8): G(191)>B(8), 휴무"},
  {"date": "2026-01-02", "color": "색상명", "type": "근무", "reasoning": "RGB(0,130,235): B(235)>G(130), 근무"}
]

reasoning에 반드시 RGB(R,G,B) 형식 포함. 날짜는 2026년 기준. JSON만 반환.`,
        },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`,
                detail: "low", // low로 변경하여 처리 속도 향상 (색상 구분에는 충분)
              },
            },
          ],
        },
      ],
      max_tokens: 2000, // 토큰 수 줄여서 응답 속도 향상
      temperature: 0.3, // 낮은 temperature로 더 빠르고 일관된 응답
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
