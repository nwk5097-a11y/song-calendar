/**
 * iCalendar (.ics) 파일 생성 유틸리티
 * 구글 캘린더, 아이폰 캘린더 등에서 사용 가능한 표준 형식
 */

interface CalendarEvent {
  date: Date;
  title: string;
  description?: string;
}

/**
 * 날짜를 iCalendar 형식으로 변환 (YYYYMMDD)
 */
function formatDateForICS(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

/**
 * 텍스트를 iCalendar 형식에 맞게 이스케이프
 */
function escapeICS(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

/**
 * 일정 목록을 iCalendar (.ics) 형식으로 변환
 */
export function generateICS(events: CalendarEvent[]): string {
  const lines: string[] = [];

  // iCalendar 헤더
  lines.push("BEGIN:VCALENDAR");
  lines.push("VERSION:2.0");
  lines.push("PRODID:-//Calendar App//EN");
  lines.push("CALSCALE:GREGORIAN");
  lines.push("METHOD:PUBLISH");

  // 각 이벤트 추가
  events.forEach((event, index) => {
    const startDate = formatDateForICS(event.date);
    const endDate = formatDateForICS(
      new Date(event.date.getTime() + 24 * 60 * 60 * 1000)
    ); // 다음 날

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${Date.now()}-${index}@calendar-app`);
    lines.push(`DTSTART;VALUE=DATE:${startDate}`);
    lines.push(`DTEND;VALUE=DATE:${endDate}`);
    lines.push(`SUMMARY:${escapeICS(event.title)}`);
    if (event.description) {
      lines.push(`DESCRIPTION:${escapeICS(event.description)}`);
    }
    lines.push(`DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`);
    lines.push("END:VEVENT");
  });

  // iCalendar 푸터
  lines.push("END:VCALENDAR");

  return lines.join("\r\n");
}

/**
 * iCalendar 파일을 다운로드
 */
export function downloadICS(events: CalendarEvent[], filename: string = "calendar.ics") {
  const icsContent = generateICS(events);
  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
