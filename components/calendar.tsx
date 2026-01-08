"use client";

import * as React from "react";
import { startOfMonth, endOfMonth, eachDayOfInterval, format, isSameMonth, isSameDay, getDay, addMonths, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CalendarProps {
  selectedDate?: Date;
  onDateClick?: (date: Date) => void;
  events?: { date: Date; title: string }[];
}

export function Calendar({ selectedDate, onDateClick, events = [] }: CalendarProps) {
  const [currentMonth, setCurrentMonth] = React.useState(new Date(2026, 0, 1));

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const firstDayOfWeek = getDay(monthStart);
  const daysBeforeMonth = Array.from({ length: firstDayOfWeek }, (_, i) => {
    const date = new Date(monthStart);
    date.setDate(date.getDate() - firstDayOfWeek + i);
    return date;
  });

  const handlePrevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const hasEvent = (date: Date) => {
    return events.some((event) => isSameDay(event.date, date));
  };

  const getEventType = (date: Date): string | null => {
    const event = events.find((event) => isSameDay(event.date, date));
    return event?.title || null;
  };

  const weekDays = ["일", "월", "화", "수", "목", "금", "토"];

  return (
    <div className="w-full">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={handlePrevMonth}
          className="text-pink-600 hover:text-pink-700 hover:bg-pink-50"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-2xl md:text-3xl font-bold text-pink-600">
          {format(currentMonth, "yyyy년 M월")}
        </h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleNextMonth}
          className="text-pink-600 hover:text-pink-700 hover:bg-pink-50"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Week Days Header */}
      <div className="grid grid-cols-7 gap-2 mb-2">
        {weekDays.map((day) => (
          <div
            key={day}
            className="text-center text-sm font-semibold text-pink-500 py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Days */}
      <div className="grid grid-cols-7 gap-2">
        {daysBeforeMonth.map((date, idx) => (
          <div
            key={`prev-${idx}`}
            className="aspect-square p-1"
          >
            <div className="h-full rounded-lg bg-gray-50 opacity-30" />
          </div>
        ))}
        {daysInMonth.map((date) => {
          const isSelected = selectedDate && isSameDay(date, selectedDate);
          const hasEventOnDate = hasEvent(date);
          const eventType = getEventType(date);
          const isOff = eventType === "휴무";
          const isWork = eventType === "근무";
          const isToday = isSameDay(date, new Date());

          return (
            <button
              key={date.toISOString()}
              onClick={() => onDateClick?.(date)}
              className={cn(
                "aspect-square p-1 transition-all hover:scale-105",
                "focus:outline-none focus:ring-2 focus:ring-pink-400 focus:ring-offset-2 rounded-lg"
              )}
            >
              <div
                className={cn(
                  "h-full rounded-lg flex flex-col items-center justify-center text-sm font-medium transition-colors",
                  {
                    // 선택된 날짜
                    "bg-pink-500 text-white shadow-lg": isSelected,
                    // 휴무 날짜 (핑크색)
                    "bg-pink-100 text-pink-700 hover:bg-pink-200": !isSelected && isOff,
                    // 근무 날짜 (회색)
                    "bg-gray-200 text-gray-700 hover:bg-gray-300": !isSelected && isWork,
                    // 오늘 날짜 (이벤트 없음)
                    "bg-white text-gray-700 hover:bg-pink-50 border-2 border-pink-200": !isSelected && !hasEventOnDate && isToday,
                    // 일반 날짜 (이벤트 없음)
                    "bg-white text-gray-700 hover:bg-pink-50": !isSelected && !hasEventOnDate && !isToday,
                  }
                )}
              >
                <span>{format(date, "d")}</span>
                {hasEventOnDate && !isSelected && !isWork && (
                  <span className="w-1.5 h-1.5 rounded-full bg-pink-500 mt-0.5" />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
