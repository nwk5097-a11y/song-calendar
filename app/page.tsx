"use client";

import * as React from "react";
import { Calendar } from "@/components/calendar";
import { AddEventModal } from "@/components/add-event-modal";
import { UploadScheduleButton } from "@/components/upload-schedule-button";
import { Heart, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { saveEvent, getEvents, CalendarEvent } from "@/lib/supabase";
import { format } from "date-fns";
import { downloadICS } from "@/lib/ical-export";

export default function Home() {
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(null);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [events, setEvents] = React.useState<
    { date: Date; title: string; description?: string; category?: string; id?: string }[]
  >([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setIsModalOpen(true);
  };

  // 페이지 로드 시 Supabase에서 일정 불러오기
  React.useEffect(() => {
    const loadEvents = async () => {
      try {
        setIsLoading(true);
        const supabaseEvents = await getEvents("2026-01-01", "2026-12-31");
        
        // Supabase 데이터를 컴포넌트 형식으로 변환
        const convertedEvents = supabaseEvents.map((event) => ({
          id: event.id,
          date: new Date(event.date + "T00:00:00"),
          title: event.title,
          description: event.description,
          category: event.category,
        }));
        
        setEvents(convertedEvents);
      } catch (error) {
        console.error("일정 불러오기 오류:", error);
        // 오류가 발생해도 앱은 계속 작동하도록 함
      } finally {
        setIsLoading(false);
      }
    };

    loadEvents();
  }, []);

  const handleAddEvent = async (event: {
    date: Date;
    title: string;
    description?: string;
    category?: string;
  }) => {
    try {
      // Supabase에 저장
      const dateStr = format(event.date, "yyyy-MM-dd");
      const savedEvent = await saveEvent({
        date: dateStr,
        title: event.title,
        description: event.description,
        category: event.category,
      });

      // 로컬 상태 업데이트
      setEvents((prev) => [
        ...prev,
        {
          id: savedEvent.id,
          date: event.date,
          title: event.title,
          description: event.description,
          category: event.category,
        },
      ]);
    } catch (error) {
      console.error("일정 저장 오류:", error);
      alert("일정 저장 중 오류가 발생했습니다. 다시 시도해주세요.");
      // 오류가 발생해도 로컬 상태는 업데이트 (오프라인 지원)
      setEvents((prev) => [...prev, event]);
    }
  };

  const handleScheduleExtracted = async (extractedEvents: {
    date: Date;
    title: string;
    description?: string;
  }[]) => {
    try {
      // 모든 이벤트를 Supabase에 저장
      const savePromises = extractedEvents.map(async (event) => {
        const dateStr = format(event.date, "yyyy-MM-dd");
        return await saveEvent({
          date: dateStr,
          title: event.title,
          description: event.description,
          category: "근무표", // 근무표에서 추출한 일정은 카테고리로 표시
        });
      });

      const savedEvents = await Promise.all(savePromises);

      // 로컬 상태 업데이트
      const convertedEvents = savedEvents.map((savedEvent, index) => ({
        id: savedEvent.id,
        date: extractedEvents[index].date,
        title: extractedEvents[index].title,
        description: extractedEvents[index].description,
        category: "근무표",
      }));

      setEvents((prev) => [...prev, ...convertedEvents]);
    } catch (error) {
      console.error("일정 저장 오류:", error);
      alert("일부 일정 저장 중 오류가 발생했습니다.");
      // 오류가 발생해도 로컬 상태는 업데이트
      setEvents((prev) => [...prev, ...extractedEvents]);
    }
  };

  // 캘린더 내보내기 (iCalendar 형식)
  const handleExportCalendar = () => {
    if (events.length === 0) {
      alert("내보낼 일정이 없습니다.");
      return;
    }

    const calendarEvents = events.map((event) => ({
      date: event.date,
      title: event.title,
      description: event.description || "",
    }));

    const filename = `calendar-${format(new Date(), "yyyy-MM-dd")}.ics`;
    downloadICS(calendarEvents, filename);
  };

  return (
    <main className="min-h-screen p-4 md:p-8 lg:p-12">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 md:mb-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Heart className="h-8 w-8 md:h-10 md:w-10 text-pink-500 fill-pink-500 animate-pulse" />
            <h1 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-pink-500 to-pink-700 bg-clip-text text-transparent">
              2026 러블리 달력
            </h1>
            <Heart className="h-8 w-8 md:h-10 md:w-10 text-pink-500 fill-pink-500 animate-pulse" />
          </div>
          <p className="text-pink-600 text-sm md:text-base mb-4">
            날짜를 클릭하여 일정을 추가하세요 ✨
          </p>
          <div className="flex justify-center gap-3 flex-wrap">
            <UploadScheduleButton onScheduleExtracted={handleScheduleExtracted} />
            <Button
              variant="outline"
              onClick={handleExportCalendar}
              disabled={events.length === 0}
              className="border-pink-300 text-pink-600 hover:bg-pink-50 hover:border-pink-400"
            >
              <Download className="mr-2 h-4 w-4" />
              캘린더 내보내기
            </Button>
          </div>
        </div>

        {/* Calendar Container */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl p-4 md:p-8 border border-pink-200">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-pink-600">일정을 불러오는 중...</div>
            </div>
          ) : (
            <Calendar
              selectedDate={selectedDate || undefined}
              onDateClick={handleDateClick}
              events={events}
            />
          )}
        </div>

        {/* Events List */}
        {events.length > 0 && (
          <div className="mt-8 bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl p-4 md:p-8 border border-pink-200">
            <h2 className="text-xl md:text-2xl font-bold text-pink-600 mb-4">
              내 일정
            </h2>
            <div className="space-y-3">
              {events.map((event, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-4 rounded-xl bg-pink-50 border border-pink-200 hover:bg-pink-100 transition-colors"
                >
                  <div className="flex-shrink-0 w-2 h-2 rounded-full bg-pink-500 mt-2" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs md:text-sm font-medium text-pink-600">
                        {event.date.toLocaleDateString("ko-KR", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-800 text-sm md:text-base">
                        {event.title}
                      </h3>
                      {event.category && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-pink-200 text-pink-700 rounded-full">
                          {event.category}
                        </span>
                      )}
                    </div>
                    {event.description && (
                      <p className="text-sm text-gray-600 mt-1">
                        {event.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modal */}
        <AddEventModal
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          selectedDate={selectedDate}
          onAddEvent={handleAddEvent}
        />
      </div>
    </main>
  );
}
