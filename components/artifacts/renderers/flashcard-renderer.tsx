// "use client";

// import { useState } from "react";
// import type { FlashcardsData } from "@/types";

// type FlashcardsRendererProps = {
//   data: FlashcardsData;
// };

// export function FlashcardsRenderer({
//   data,
// }: FlashcardsRendererProps) {
//   const [currentIndex, setCurrentIndex] = useState(0);
//   const [showAnswer, setShowAnswer] = useState(false);

//   const cards = data.cards ?? [];

//   if (cards.length === 0) {
//     return (
//       <div className="rounded-lg border p-6 text-center">
//         <p className="text-sm text-muted-foreground">
//           No flashcards available.
//         </p>
//       </div>
//     );
//   }

//   const currentCard = cards[currentIndex];

//   function goToPrevious() {
//     setShowAnswer(false);

//     setCurrentIndex((index) =>
//       index === 0 ? cards.length - 1 : index - 1,
//     );
//   }

//   function goToNext() {
//     setShowAnswer(false);

//     setCurrentIndex((index) =>
//       index === cards.length - 1 ? 0 : index + 1,
//     );
//   }

//   function toggleAnswer() {
//     setShowAnswer((visible) => !visible);
//   }

//   return (
//     <div className="w-full space-y-4">
//       {/* Progress */}
//       <div className="flex items-center justify-between text-sm">
//         <span>
//           Card {currentIndex + 1} of {cards.length}
//         </span>

//         <span className="text-muted-foreground">
//           {showAnswer ? "Answer" : "Question"}
//         </span>
//       </div>

//       {/* Card */}
//       <div className="min-h-[240px] rounded-xl border p-6">
//         <div className="flex min-h-[200px] flex-col items-center justify-center text-center">
//           {!showAnswer ? (
//             <>
//               <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">
//                 Question
//               </p>

//               <h3 className="text-lg font-medium">
//                 {currentCard.question}
//               </h3>
//             </>
//           ) : (
//             <>
//               <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">
//                 Answer
//               </p>

//               <p className="text-base leading-7">
//                 {currentCard.answer}
//               </p>
//             </>
//           )}
//         </div>
//       </div>

//       {/* Show / Hide Answer */}
//       <button
//         type="button"
//         onClick={toggleAnswer}
//         className="w-full rounded-md border px-4 py-2 text-sm font-medium"
//       >
//         {showAnswer ? "Hide Answer" : "Show Answer"}
//       </button>

//       {/* Navigation */}
//       <div className="flex items-center justify-between gap-3">
//         <button
//           type="button"
//           onClick={goToPrevious}
//           className="rounded-md border px-4 py-2 text-sm"
//         >
//           Previous
//         </button>

//         <button
//           type="button"
//           onClick={goToNext}
//           className="rounded-md border px-4 py-2 text-sm"
//         >
//           Next
//         </button>
//       </div>
//     </div>
//   );
// }


"use client";

import { useState, useEffect, useCallback } from "react";
import type { FlashcardsData } from "@/types";
import {
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Sparkles,
  HelpCircle,
  Lightbulb,
  Check,
} from "lucide-react";

type FlashcardsRendererProps = {
  data: FlashcardsData;
};

export function FlashcardsRenderer({ data }: FlashcardsRendererProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const cards = data.cards ?? [];

  const goToPrevious = useCallback(() => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev === 0 ? cards.length - 1 : prev - 1));
  }, [cards.length]);

  const goToNext = useCallback(() => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev === cards.length - 1 ? 0 : prev + 1));
  }, [cards.length]);

  const toggleFlip = useCallback(() => {
    setIsFlipped((prev) => !prev);
  }, []);

  // Keyboard navigation support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (cards.length === 0) return;
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        toggleFlip();
      } else if (e.key === "ArrowLeft") {
        goToPrevious();
      } else if (e.key === "ArrowRight") {
        goToNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToNext, goToPrevious, toggleFlip, cards.length]);

  if (cards.length === 0) {
    return (
      <div className="relative mx-auto w-full max-w-2xl overflow-hidden rounded-3xl border border-dashed border-border/80 bg-card/50 p-12 text-center backdrop-blur-sm">
        <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-xl bg-muted/60 text-muted-foreground shadow-inner">
          <HelpCircle className="size-6" />
        </div>
        <h3 className="text-base font-semibold text-foreground">No flashcards found</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          This deck does not contain any cards yet.
        </p>
      </div>
    );
  }

  const currentCard = cards[currentIndex];
  const progressPercentage = ((currentIndex + 1) / cards.length) * 100;

  return (
    <div className="relative mx-auto w-full max-w-2xl overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-b from-card via-card/95 to-card/50 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
      {/* Top Ambient Glow */}
      <div className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 size-64 rounded-full bg-primary/10 blur-3xl" />

      {/* Header Info */}
      <div className="relative flex items-center justify-between">
        <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/40 px-3 py-1 shadow-sm">
          <span className="size-1.5 rounded-full bg-primary animate-pulse" />
          <span className="text-xs font-semibold tracking-wide text-foreground">
            Card {currentIndex + 1} of {cards.length}
          </span>
        </div>

        <div className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
          <span className="hidden sm:inline">Press</span>
          <kbd className="rounded border border-border/60 bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground shadow-sm">
            Space
          </kbd>
          <span className="hidden sm:inline">to flip</span>
        </div>
      </div>

      {/* Progress Track */}
      <div className="relative mt-4 h-1.5 w-full overflow-hidden rounded-full bg-muted/60">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary/80 to-primary transition-all duration-500 ease-out"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      {/* Interactive 3D Flip Card Container */}
      <div
        className="relative mt-6 min-h-[300px] w-full cursor-pointer sm:mt-8 sm:min-h-[340px]"
        style={{ perspective: "1200px" }}
        onClick={toggleFlip}
      >
        <div
          className="relative size-full rounded-2xl transition-transform duration-500 [transform-style:preserve-3d]"
          style={{
            transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
          }}
        >
          {/* Front Face (Question) */}
          <div className="absolute inset-0 flex flex-col justify-between rounded-2xl border border-border/60 bg-card/90 p-6 shadow-sm backdrop-blur-md transition-all hover:border-primary/40 [backface-visibility:hidden] sm:p-8">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                <Sparkles className="size-3.5" /> Question
              </span>
              <span className="text-xs font-medium text-muted-foreground">
                Click to flip
              </span>
            </div>

            <div className="my-auto py-4 text-center">
              <h3 className="text-lg font-semibold leading-relaxed tracking-tight text-foreground sm:text-xl md:text-2xl">
                {currentCard.question}
              </h3>
            </div>

            <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground/80">
              <RotateCw className="size-3.5" />
              <span>Click card to reveal answer</span>
            </div>
          </div>

          {/* Back Face (Answer) */}
          <div
            className="absolute inset-0 flex flex-col justify-between rounded-2xl border border-primary/30 bg-primary/5 p-6 shadow-sm backdrop-blur-md transition-all [backface-visibility:hidden] [transform:rotateY(180deg)] sm:p-8"
          >
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <Lightbulb className="size-3.5" /> Solution
              </span>
              <span className="text-xs font-medium text-muted-foreground">
                Click to flip
              </span>
            </div>

            <div className="my-auto py-4 text-center">
              <p className="text-base font-normal leading-relaxed text-foreground sm:text-lg">
                {currentCard.answer}
              </p>
            </div>

            <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground/80">
              <RotateCw className="size-3.5" />
              <span>Click card to view question</span>
            </div>
          </div>
        </div>
      </div>

      {/* Control Actions */}
      <div className="mt-8 flex items-center justify-between gap-3 border-t border-border/50 pt-5">
        <button
          type="button"
          onClick={goToPrevious}
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-border/60 bg-card px-4 text-sm font-medium text-foreground shadow-sm transition-all hover:bg-muted active:scale-[0.98]"
        >
          <ChevronLeft className="size-4" />
          <span className="hidden sm:inline">Previous</span>
        </button>

        <button
          type="button"
          onClick={toggleFlip}
          className="inline-flex h-10 flex-1 max-w-[200px] items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground shadow-md shadow-primary/20 transition-all hover:bg-primary/90 active:scale-[0.98]"
        >
          <RotateCw className={`size-4 transition-transform duration-300 ${isFlipped ? "rotate-180" : ""}`} />
          <span>{isFlipped ? "Show Question" : "Show Answer"}</span>
        </button>

        <button
          type="button"
          onClick={goToNext}
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-border/60 bg-card px-4 text-sm font-medium text-foreground shadow-sm transition-all hover:bg-muted active:scale-[0.98]"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}