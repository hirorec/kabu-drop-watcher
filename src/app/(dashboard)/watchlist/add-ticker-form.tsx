"use client";

import { useState, useTransition } from "react";
import { addTicker } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export function AddTickerForm() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      const result = await addTicker(formData);
      if (result.error) {
        setError(result.error);
      } else {
        setOpen(false);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>+ 銘柄を追加</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>銘柄を追加</DialogTitle>
          <DialogDescription>
            ウォッチリストに監視する銘柄を追加します。
          </DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="mt-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ticker">銘柄コード</Label>
            <Input
              id="ticker"
              name="ticker"
              placeholder="例: 7974"
              required
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="companyName">企業名</Label>
            <Input
              id="companyName"
              name="companyName"
              placeholder="例: 任天堂"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="memo">メモ（任意）</Label>
            <Input
              id="memo"
              name="memo"
              placeholder="例: 決算 5/7 発表予定"
            />
          </div>
          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setOpen(false);
                setError(null);
              }}
            >
              キャンセル
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "追加中..." : "追加"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
