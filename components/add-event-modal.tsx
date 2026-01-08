"use client";

import * as React from "react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface AddEventModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date | null;
  onAddEvent: (event: { date: Date; title: string; description?: string; category?: string }) => void;
}

export function AddEventModal({
  open,
  onOpenChange,
  selectedDate,
  onAddEvent,
}: AddEventModalProps) {
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [category, setCategory] = React.useState("");

  React.useEffect(() => {
    if (open) {
      setTitle("");
      setDescription("");
      setCategory("");
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim() && selectedDate) {
      onAddEvent({
        date: selectedDate,
        title: title.trim(),
        description: description.trim() || undefined,
        category: category.trim() || undefined,
      });
      onOpenChange(false);
      setTitle("");
      setDescription("");
      setCategory("");
    }
  };

  if (!selectedDate) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>일정 추가</DialogTitle>
          <DialogDescription>
            {format(selectedDate, "yyyy년 M월 d일")}에 일정을 추가하세요
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              제목 <span className="text-pink-500">*</span>
            </label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="일정 제목을 입력하세요"
              required
              className="w-full"
            />
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              설명
            </label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="일정 설명을 입력하세요 (선택사항)"
              rows={4}
              className="w-full"
            />
          </div>
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
              카테고리
            </label>
            <Input
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="예: 회의, 개인, 업무 등 (선택사항)"
              className="w-full"
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              취소
            </Button>
            <Button type="submit" variant="default">
              추가하기
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
