"use client";

import { FormEvent, useState } from "react";
import { Loader2, MessageSquarePlus, Star } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

/** Floating beta feedback button (bottom-right on every dashboard page) + slide-over form. */
export function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (rating < 1 || !text.trim()) {
      toast.error("Please pick a rating and write a few words.");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/api/feedback", { rating, feedbackText: text.trim() });
      toast.success("Thank you! Your feedback helps us improve.");
      setOpen(false);
      setRating(0);
      setText("");
    } catch {
      // Error toast is shown by the global Axios interceptor (lib/api.ts).
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-40 min-h-11 rounded-full shadow-lg"
      >
        <MessageSquarePlus /> Give Feedback
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Give Feedback</SheetTitle>
            <SheetDescription>Tell us what is working and what is not.</SheetDescription>
          </SheetHeader>
          <form onSubmit={onSubmit} className="mt-6 space-y-5">
            <div className="space-y-2">
              <Label id="rating-label">How would you rate RFP Copilot?</Label>
              <div role="radiogroup" aria-labelledby="rating-label" className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={rating === n}
                    aria-label={`${n} star${n > 1 ? "s" : ""}`}
                    onClick={() => setRating(n)}
                    className="rounded p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                  >
                    <Star
                      className={cn(
                        "h-7 w-7",
                        n <= rating ? "fill-amber-400 text-amber-400" : "text-slate-300"
                      )}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="feedback-text">Your feedback</Label>
              <Textarea
                id="feedback-text"
                rows={6}
                maxLength={4000}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="What could be better?"
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="animate-spin" /> Sending…
                </>
              ) : (
                "Submit"
              )}
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}
