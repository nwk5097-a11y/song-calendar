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

  // 이미지 전처리: 채도와 대비 향상
  const enhanceImage = (image: HTMLImageElement): Promise<string> => {
    return new Promise((resolve, reject) => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas context를 가져올 수 없습니다."));
          return;
        }

        canvas.width = image.width;
        canvas.height = image.height;

        // 원본 이미지 그리기
        ctx.drawImage(image, 0, 0);

        // 이미지 데이터 가져오기
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // 채도와 대비 향상 파라미터
        const saturationBoost = 1.5; // 채도 50% 증가
        const contrastBoost = 1.3; // 대비 30% 증가
        const brightnessAdjust = 1.05; // 밝기 약간 증가

        // 각 픽셀 처리
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          // RGB를 HSL로 변환 (간단한 버전)
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const l = (max + min) / 2;
          const delta = max - min;

          let h = 0;
          let s = 0;

          if (delta !== 0) {
            s = delta / (255 - Math.abs(2 * l - 255));
            
            if (max === r) {
              h = ((g - b) / delta) % 6;
            } else if (max === g) {
              h = (b - r) / delta + 2;
            } else {
              h = (r - g) / delta + 4;
            }
            h *= 60;
            if (h < 0) h += 360;
          }

          // 채도 향상
          s = Math.min(1, s * saturationBoost);

          // 밝기 조정
          let newL = l * brightnessAdjust;
          newL = Math.min(255, Math.max(0, newL));

          // 대비 향상 (중간값 128 기준)
          newL = (newL - 128) * contrastBoost + 128;
          newL = Math.min(255, Math.max(0, newL));

          // HSL을 RGB로 다시 변환
          const c = (1 - Math.abs(2 * newL / 255 - 1)) * s * 255;
          const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
          const m = newL - c / 2;

          let newR = 0, newG = 0, newB = 0;

          if (h < 60) {
            newR = c; newG = x; newB = 0;
          } else if (h < 120) {
            newR = x; newG = c; newB = 0;
          } else if (h < 180) {
            newR = 0; newG = c; newB = x;
          } else if (h < 240) {
            newR = 0; newG = x; newB = c;
          } else if (h < 300) {
            newR = x; newG = 0; newB = c;
          } else {
            newR = c; newG = 0; newB = x;
          }

          data[i] = Math.min(255, Math.max(0, newR + m));
          data[i + 1] = Math.min(255, Math.max(0, newG + m));
          data[i + 2] = Math.min(255, Math.max(0, newB + m));
        }

        // 수정된 이미지 데이터를 캔버스에 다시 그리기
        ctx.putImageData(imageData, 0, 0);

        // Canvas를 base64로 변환
        const base64String = canvas.toDataURL("image/jpeg", 0.95);
        // data:image/jpeg;base64, 부분 제거
        const base64 = base64String.includes(",") 
          ? base64String.split(",")[1] 
          : base64String;

        resolve(base64);
      } catch (error) {
        reject(error);
      }
    });
  };

  const fileToBase64 = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const result = reader.result as string;
          
          // 이미지 로드
          const img = new Image();
          img.onload = async () => {
            try {
              // 이미지 전처리 (채도, 대비 향상)
              const enhancedBase64 = await enhanceImage(img);
              resolve(enhancedBase64);
            } catch (error) {
              // 전처리 실패 시 원본 사용
              console.warn("이미지 전처리 실패, 원본 사용:", error);
              const base64String = result.includes(",") 
                ? result.split(",")[1] 
                : result;
              resolve(base64String);
            }
          };
          img.onerror = () => {
            // 이미지 로드 실패 시 원본 사용
            const base64String = result.includes(",") 
              ? result.split(",")[1] 
              : result;
            resolve(base64String);
          };
          img.src = result;
        } catch (error) {
          reject(error);
        }
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
