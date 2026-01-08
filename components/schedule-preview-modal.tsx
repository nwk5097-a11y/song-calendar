"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface SchedulePreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  extractedData: { date: string; text: string; reasoning?: string }[];
  onConfirm: (events: { date: Date; title: string; description?: string }[]) => void;
}

export function SchedulePreviewModal({
  open,
  onOpenChange,
  extractedData,
  onConfirm,
}: SchedulePreviewModalProps) {
  const [scheduleItems, setScheduleItems] = React.useState<
    { date: Date; type: string; reasoning?: string }[]
  >([]);

  // 초기 데이터 설정
  React.useEffect(() => {
    if (open && extractedData.length > 0) {
      const items = extractedData
        .map((item) => {
          try {
            const date = new Date(item.date + "T00:00:00");
            if (isNaN(date.getTime())) {
              return null;
            }
            return {
              date,
              type: item.text || "기타",
              reasoning: item.reasoning,
            };
          } catch (error) {
            return null;
          }
        })
        .filter((item) => item !== null) as { date: Date; type: string; reasoning?: string }[];
      setScheduleItems(items);
    }
  }, [open, extractedData]);

  // 날짜 클릭 시 휴무 ↔ 근무 토글
  const handleToggleType = React.useCallback((index: number) => {
    setScheduleItems((prev) => {
      const newItems = prev.map((item, i) => {
        if (i === index) {
          const currentType = item.type;
          // 휴무 ↔ 근무만 토글
          if (currentType === "휴무") {
            return { ...item, type: "근무" };
          } else if (currentType === "근무") {
            return { ...item, type: "휴무" };
          }
          // 기타는 근무로 변경
          else {
            return { ...item, type: "근무" };
          }
        }
        return item;
      });
      return newItems;
    });
  }, []);

  // 확정 및 저장
  const handleConfirm = () => {
    const events = scheduleItems.map((item) => ({
      date: item.date,
      title: item.type,
      description: item.reasoning
        ? `근무표에서 추출: ${item.reasoning}`
        : `근무표에서 추출된 일정`,
    }));

    onConfirm(events);
    onOpenChange(false);
  };

  if (!open || scheduleItems.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>근무표 분석 결과 확인</DialogTitle>
          <DialogDescription>
            분석 결과를 확인하고 수정하세요. 날짜를 클릭하면 휴무 ↔ 근무가 토글됩니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 통계 */}
          <div className="flex gap-4 p-4 bg-pink-50 rounded-lg border border-pink-200">
            <div className="flex-1 text-center">
              <div className="text-2xl font-bold text-pink-600">
                {scheduleItems.filter((item) => item.type === "휴무").length}
              </div>
              <div className="text-sm text-gray-600">휴무</div>
            </div>
            <div className="flex-1 text-center">
              <div className="text-2xl font-bold text-blue-600">
                {scheduleItems.filter((item) => item.type === "근무").length}
              </div>
              <div className="text-sm text-gray-600">근무</div>
            </div>
            <div className="flex-1 text-center">
              <div className="text-2xl font-bold text-gray-600">{scheduleItems.length}</div>
              <div className="text-sm text-gray-600">전체</div>
            </div>
          </div>

          {/* 일정 리스트 */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {scheduleItems.map((item, index) => {
              const isOff = item.type === "휴무";
              const isWork = item.type === "근무";

              return (
                <div
                  key={`${item.date.toISOString()}-${index}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleType(index);
                  }}
                  onMouseDown={(e) => e.preventDefault()}
                  className={cn(
                    "flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md select-none",
                    isOff && "bg-green-50 border-green-300 hover:bg-green-100",
                    isWork && "bg-blue-50 border-blue-300 hover:bg-blue-100",
                    !isOff && !isWork && "bg-gray-50 border-gray-300 hover:bg-gray-100"
                  )}
                >
                  {/* 아이콘 */}
                  <div className="flex-shrink-0">
                    {isOff ? (
                      <XCircle className="h-6 w-6 text-green-600" />
                    ) : isWork ? (
                      <CheckCircle2 className="h-6 w-6 text-blue-600" />
                    ) : (
                      <div className="h-6 w-6 rounded-full bg-gray-400" />
                    )}
                  </div>

                  {/* 날짜 */}
                  <div className="flex-shrink-0 min-w-[120px]">
                    <div className="font-semibold text-gray-800">
                      {format(item.date, "yyyy년 M월 d일")}
                    </div>
                    <div className="text-xs text-gray-500">
                      {format(item.date, "E요일")}
                    </div>
                  </div>

                  {/* 상태 배지 */}
                  <div className="flex-1">
                    <span
                      className={cn(
                        "px-3 py-1 rounded-full text-sm font-medium",
                        isOff && "bg-green-200 text-green-700",
                        isWork && "bg-blue-200 text-blue-700",
                        !isOff && !isWork && "bg-gray-200 text-gray-700"
                      )}
                    >
                      {item.type}
                    </span>
                  </div>

                  {/* Reasoning (있는 경우) */}
                  {item.reasoning && (
                    <div className="flex-1 text-xs text-gray-500 italic max-w-md truncate">
                      {item.reasoning}
                    </div>
                  )}

                  {/* 클릭 안내 */}
                  <div className="flex-shrink-0 text-xs text-gray-400">
                    클릭하여 변경
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button variant="default" onClick={handleConfirm} className="bg-pink-500 hover:bg-pink-600">
            확정 및 저장
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
