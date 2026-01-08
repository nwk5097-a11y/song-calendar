"use client";

import * as React from "react";
import { Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SchedulePreviewModal } from "@/components/schedule-preview-modal";

interface UploadScheduleButtonProps {
  onScheduleExtracted: (events: { date: Date; title: string; description?: string }[]) => void;
}

export function UploadScheduleButton({ onScheduleExtracted }: UploadScheduleButtonProps) {
  const [isUploading, setIsUploading] = React.useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = React.useState(false);
  const [extractedData, setExtractedData] = React.useState<{ date: string; text: string; reasoning?: string }[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 이미지 파일만 허용
    if (!file.type.startsWith("image/")) {
      alert("이미지 파일만 업로드 가능합니다.");
      return;
    }

    setIsUploading(true);

    try {
      // 이미지를 base64로 변환
      const base64 = await fileToBase64(file);

      // API 호출
      const response = await fetch("/api/analyze-schedule", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ imageBase64: base64 }),
      });

      // 응답이 JSON인지 확인
      const contentType = response.headers.get("content-type");
      let data;
      
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error("Non-JSON response:", text.substring(0, 500));
        
        // HTML 에러 페이지인 경우
        if (text.includes("<!DOCTYPE") || text.includes("<html")) {
          throw new Error(
            "서버 오류가 발생했습니다. .env.local 파일에 OPENAI_API_KEY를 설정하고 개발 서버를 재시작해주세요.\n\n" +
            "설정 방법:\n" +
            "1. 프로젝트 루트에 .env.local 파일 생성\n" +
            "2. OPENAI_API_KEY=your_api_key_here 추가\n" +
            "3. 개발 서버 재시작 (npm run dev)"
          );
        }
        
        throw new Error(
          `서버에서 예상치 못한 응답을 받았습니다. (Content-Type: ${contentType})`
        );
      }

      data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "이미지 분석에 실패했습니다.");
      }

      // 추출된 데이터를 미리보기 모달로 전달
      const rawData = data.schedule.map((item: { date: string; text?: string; type?: string; reasoning?: string }) => ({
        date: item.date,
        text: item.text || item.type || "",
        reasoning: item.reasoning || "",
      }));

      setExtractedData(rawData);
      setIsPreviewModalOpen(true);
    } catch (error: any) {
      console.error("업로드 오류:", error);
      alert(error.message || "근무표 분석 중 오류가 발생했습니다.");
    } finally {
      setIsUploading(false);
      // 파일 입력 초기화
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // data:image/jpeg;base64, 부분 제거
        const base64String = result.includes(",") 
          ? result.split(",")[1] 
          : result;
        resolve(base64String);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handlePreviewConfirm = (mappedEvents: { date: Date; title: string; description?: string }[]) => {
    onScheduleExtracted(mappedEvents);
    alert(`${mappedEvents.length}개의 일정이 성공적으로 저장되었습니다!`);
    setIsPreviewModalOpen(false);
    setExtractedData([]);
  };

  return (
    <>
      <div className="relative">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          id="schedule-upload"
          disabled={isUploading}
        />
        <Button
          variant="default"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className={cn(
            "bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white shadow-lg",
            isUploading && "opacity-50 cursor-not-allowed"
          )}
        >
          {isUploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              분석 중...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              근무표 사진 업로드
            </>
          )}
        </Button>
      </div>

      <SchedulePreviewModal
        open={isPreviewModalOpen}
        onOpenChange={setIsPreviewModalOpen}
        extractedData={extractedData}
        onConfirm={handlePreviewConfirm}
      />
    </>
  );
}
