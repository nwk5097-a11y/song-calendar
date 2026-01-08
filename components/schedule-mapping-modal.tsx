"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface ScheduleMappingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  extractedData: { date: string; text: string }[];
  onConfirm: (mappedEvents: { date: Date; title: string; description?: string }[]) => void;
}

const WORK_TYPES = ["휴무", "근무"];

// 기본 매핑 규칙 (ATDO, ADO 등은 자동으로 휴무로 처리)
const defaultMappingRules: Record<string, string> = {
  "휴무": "ATDO,ADO,OFF,휴,X,휴무",
  "근무": "KE,FLIGHT,비행,근무",
};

export function ScheduleMappingModal({
  open,
  onOpenChange,
  extractedData,
  onConfirm,
}: ScheduleMappingModalProps) {
  const [mappingRules, setMappingRules] = React.useState<Record<string, string>>({
    "휴무": "",
    "근무": "",
  });

  // 로컬 스토리지에서 매핑 규칙 불러오기
  React.useEffect(() => {
    if (open) {
      const saved = localStorage.getItem("scheduleMappingRules");
      if (saved) {
        try {
          const savedRules = JSON.parse(saved);
          // 기본 규칙과 저장된 규칙 병합 (저장된 규칙 우선)
          setMappingRules({ ...defaultMappingRules, ...savedRules });
        } catch (e) {
          console.error("매핑 규칙 불러오기 실패:", e);
          setMappingRules(defaultMappingRules);
        }
      } else {
        // 저장된 규칙이 없으면 기본 규칙 사용
        setMappingRules(defaultMappingRules);
      }
    }
  }, [open]);

  const handleMappingChange = (workType: string, value: string) => {
    setMappingRules((prev) => ({
      ...prev,
      [workType]: value,
    }));
  };

  const handleSaveMapping = () => {
    // 매핑 규칙을 로컬 스토리지에 저장
    localStorage.setItem("scheduleMappingRules", JSON.stringify(mappingRules));
  };

  const handleConfirm = () => {
    // 매핑 규칙 저장
    handleSaveMapping();

    // 추출된 데이터를 매핑 규칙에 따라 변환
    const mappedEvents = extractedData
      .map((item) => {
        const date = new Date(item.date + "T00:00:00");
        if (isNaN(date.getTime())) {
          return null;
        }

        // 이미 API에서 색상 기반으로 타입이 결정되었으므로 그대로 사용
        let workType = item.text || "기타";
        
        // 필요시 추가 매핑 규칙 적용 (사용자가 수정한 경우)
        const text = workType.trim().toUpperCase();
        for (const [type, keywords] of Object.entries(mappingRules)) {
          if (!keywords) continue;
          const keywordList = keywords
            .split(",")
            .map((k) => k.trim().toUpperCase())
            .filter((k) => k);
          
          if (keywordList.some((keyword) => text.includes(keyword))) {
            workType = type;
            break;
          }
        }

        return {
          date,
          title: workType,
          description: `근무표에서 추출: ${item.text}`,
        };
      })
      .filter((event): event is { date: Date; title: string; description: string } => event !== null);

    onConfirm(mappedEvents);
    onOpenChange(false);
  };

  // 자동 적용 버튼 핸들러 (기본 규칙으로 자동 매핑)
  const handleAutoApply = () => {
    const mappedEvents = extractedData
      .map((item) => {
        const date = new Date(item.date + "T00:00:00");
        if (isNaN(date.getTime())) {
          return null;
        }

        // 이미 API에서 색상 기반으로 타입이 결정되었으므로 그대로 사용
        let workType = item.text || "기타";

        return {
          date,
          title: workType,
          description: `근무표에서 추출: ${item.text}`,
        };
      })
      .filter((event): event is { date: Date; title: string; description: string } => event !== null);

    onConfirm(mappedEvents);
    onOpenChange(false);
  };

  if (!open || extractedData.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>근무 유형 매핑 설정</DialogTitle>
          <DialogDescription>
            근무표에서 추출된 텍스트를 근무 유형으로 매핑해주세요. 쉼표(,)로 여러 키워드를 구분할 수 있습니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 매핑 규칙 설정 */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-800">근무 유형 키워드 설정</h3>
            {WORK_TYPES.map((type) => (
              <div key={type}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {type}
                </label>
                <Input
                  value={mappingRules[type] || ""}
                  onChange={(e) => handleMappingChange(type, e.target.value)}
                  placeholder={`예: OFF, 휴, X (${type}로 표기되는 키워드)`}
                  className="w-full"
                />
              </div>
            ))}
          </div>

          {/* 추출된 데이터 미리보기 */}
          <div className="space-y-3 border-t pt-4">
            <h3 className="font-semibold text-gray-800">추출된 데이터 미리보기</h3>
            <div className="max-h-60 overflow-y-auto space-y-2">
              {extractedData.slice(0, 10).map((item, index) => {
                const date = new Date(item.date + "T00:00:00");
                const workType = item.text || "기타";
                const originalColor = (item as any).originalColor || "";
                const reasoning = (item as any).reasoning || "";

                return (
                  <div
                    key={index}
                    className="flex flex-col gap-2 p-3 rounded-lg bg-gray-50 text-sm"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-gray-600 min-w-[100px]">
                        {date.toLocaleDateString("ko-KR")}
                      </span>
                      <div className="flex-1">
                        {originalColor && (
                          <span className="text-xs text-gray-500">색상: {originalColor}</span>
                        )}
                      </div>
                      <span className="px-2 py-0.5 bg-pink-200 text-pink-700 rounded text-xs font-medium">
                        → {workType}
                      </span>
                    </div>
                    {reasoning && (
                      <div className="text-xs text-gray-400 italic pl-[100px]">
                        근거: {reasoning}
                      </div>
                    )}
                  </div>
                );
              })}
              {extractedData.length > 10 && (
                <p className="text-xs text-gray-500 text-center">
                  외 {extractedData.length - 10}개 항목...
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={handleAutoApply}>
            기본 규칙으로 자동 적용
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button variant="default" onClick={handleConfirm}>
              적용하기
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
