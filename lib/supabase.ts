import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// 클라이언트 사이드에서만 체크 (서버 사이드에서는 빈 값일 수 있음)
if (typeof window !== "undefined" && (!supabaseUrl || !supabaseAnonKey)) {
  console.warn(
    "Supabase environment variables are not set. Please check your .env.local file."
  );
}

// 빈 값이어도 클라이언트 생성 (에러 방지)
export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-key"
);

// 타입 정의
export interface CalendarEvent {
  id?: string;
  date: string; // YYYY-MM-DD 형식
  title: string;
  category?: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

// 일정 저장
export async function saveEvent(event: Omit<CalendarEvent, "id" | "created_at" | "updated_at">) {
  // 환경 변수가 설정되지 않은 경우 에러
  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes("placeholder")) {
    throw new Error("Supabase가 설정되지 않았습니다. .env.local 파일을 확인해주세요.");
  }

  const { data, error } = await supabase
    .from("calendars")
    .insert([
      {
        date: event.date,
        title: event.title,
        category: event.category || null,
        description: event.description || null,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error("Error saving event:", error);
    throw error;
  }

  return data;
}

// 일정 목록 불러오기
export async function getEvents(startDate?: string, endDate?: string) {
  // 환경 변수가 설정되지 않은 경우 빈 배열 반환
  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes("placeholder")) {
    console.warn("Supabase가 설정되지 않아 일정을 불러올 수 없습니다.");
    return [];
  }

  let query = supabase.from("calendars").select("*").order("date", { ascending: true });

  if (startDate) {
    query = query.gte("date", startDate);
  }

  if (endDate) {
    query = query.lte("date", endDate);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching events:", error);
    // 에러가 발생해도 빈 배열 반환 (앱이 계속 작동하도록)
    return [];
  }

  return (data || []) as CalendarEvent[];
}

// 일정 업데이트
export async function updateEvent(
  id: string,
  updates: Partial<Omit<CalendarEvent, "id" | "created_at" | "updated_at">>
) {
  const { data, error } = await supabase
    .from("calendars")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating event:", error);
    throw error;
  }

  return data;
}

// 일정 삭제
export async function deleteEvent(id: string) {
  const { error } = await supabase.from("calendars").delete().eq("id", id);

  if (error) {
    console.error("Error deleting event:", error);
    throw error;
  }
}
