// 근무표 텍스트를 근무 유형으로 매핑하는 유틸리티 함수

const DEFAULT_MAPPING_RULES: Record<string, string[]> = {
  "휴무": ["ATDO", "ADO", "OFF", "휴", "X", "휴무"],
  "근무": ["KE", "FLIGHT", "비행", "근무"],
};

/**
 * 텍스트를 근무 유형으로 변환
 */
export function mapTextToWorkType(text: string, customRules?: Record<string, string>): string {
  const textUpper = text.trim().toUpperCase();
  
  // 커스텀 규칙이 있으면 사용, 없으면 기본 규칙 사용
  const rules = customRules 
    ? Object.entries(customRules).reduce((acc, [type, keywords]) => {
        acc[type] = keywords.split(",").map(k => k.trim().toUpperCase()).filter(k => k);
        return acc;
      }, {} as Record<string, string[]>)
    : DEFAULT_MAPPING_RULES;

  // 각 근무 유형의 키워드와 매칭
  for (const [workType, keywords] of Object.entries(rules)) {
    // KE로 시작하는 경우 특별 처리 (비행)
    if (workType === "비행" && textUpper.startsWith("KE")) {
      return workType;
    }
    
    if (keywords.some(keyword => textUpper.includes(keyword))) {
      return workType;
    }
  }

  // 매칭되지 않으면 원본 텍스트 반환
  return text;
}

/**
 * 추출된 데이터를 근무 유형으로 매핑
 */
export function mapScheduleData(
  data: { date: string; text: string }[],
  customRules?: Record<string, string>
): { date: Date; title: string; description?: string }[] {
  return data
    .map((item) => {
      try {
        const date = new Date(item.date + "T00:00:00");
        if (isNaN(date.getTime())) {
          return null;
        }

        const workType = mapTextToWorkType(item.text, customRules);

        return {
          date,
          title: workType,
          description: `근무표에서 추출: ${item.text}`,
        };
      } catch (error) {
        console.error("날짜 파싱 오류:", error);
        return null;
      }
    })
    .filter((event): event is { date: Date; title: string; description?: string } => event !== null);
}
