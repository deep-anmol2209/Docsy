// "use client";

// import { useState } from "react";
// import type { QuizData } from "@/types";

// type QuizRendererProps = {
//   data: QuizData;
// };

// export function QuizRenderer({ data }: QuizRendererProps) {
//   const questions = data.questions ?? [];

//   const [currentIndex, setCurrentIndex] = useState(0);
//   const [selectedOption, setSelectedOption] = useState<string | null>(null);
//   const [score, setScore] = useState(0);
//   const [submitted, setSubmitted] = useState(false);

//   if (questions.length === 0) {
//     return (
//       <div className="rounded-lg border p-6 text-center">
//         <p className="text-sm text-muted-foreground">
//           No quiz questions available.
//         </p>
//       </div>
//     );
//   }

//   const currentQuestion = questions[currentIndex];
//   const isLastQuestion = currentIndex === questions.length - 1;

//   function selectOption(optionId: string) {
//     if (submitted) return;

//     setSelectedOption(optionId);
//   }

//   function submitAnswer() {
//     if (!selectedOption || submitted) return;

//     setSubmitted(true);

//     if (selectedOption === currentQuestion.correctOptionId) {
//       setScore((value) => value + 1);
//     }
//   }

//   function nextQuestion() {
//     if (!submitted) return;

//     setCurrentIndex((index) => index + 1);
//     setSelectedOption(null);
//     setSubmitted(false);
//   }

//   function restartQuiz() {
//     setCurrentIndex(0);
//     setSelectedOption(null);
//     setScore(0);
//     setSubmitted(false);
//   }

//   const selectedIsCorrect =
//     selectedOption === currentQuestion.correctOptionId;

//   return (
//     <div className="w-full space-y-5">
//       {/* Header */}
//       <div className="flex items-center justify-between">
//         <div>
//           <p className="text-sm font-medium">
//             Question {currentIndex + 1} of {questions.length}
//           </p>

//           <p className="text-xs text-muted-foreground">
//             Score: {score}/{currentIndex + (submitted ? 1 : 0)}
//           </p>
//         </div>
//       </div>

//       {/* Progress */}
//       <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
//         <div
//           className="h-full rounded-full bg-primary transition-all"
//           style={{
//             width: `${
//               ((currentIndex + (submitted ? 1 : 0)) /
//                 questions.length) *
//               100
//             }%`,
//           }}
//         />
//       </div>

//       {/* Question */}
//       <div className="rounded-xl border p-6">
//         <h2 className="text-base font-medium leading-7">
//           {currentQuestion.prompt}
//         </h2>

//         {/* Options */}
//         <div className="mt-5 space-y-3">
//           {currentQuestion.options.map((option) => {
//             const isSelected = selectedOption === option.id;
//             const isCorrect =
//               option.id === currentQuestion.correctOptionId;

//             let optionClass =
//               "border hover:bg-muted/50";

//             if (submitted && isCorrect) {
//               optionClass =
//                 "border-green-500 bg-green-50 dark:bg-green-950/30";
//             } else if (submitted && isSelected && !isCorrect) {
//               optionClass =
//                 "border-red-500 bg-red-50 dark:bg-red-950/30";
//             } else if (isSelected) {
//               optionClass =
//                 "border-primary bg-primary/5";
//             }

//             return (
//               <button
//                 key={option.id}
//                 type="button"
//                 disabled={submitted}
//                 onClick={() => selectOption(option.id)}
//                 className={`flex w-full items-start gap-3 rounded-lg border p-4 text-left transition ${optionClass}`}
//               >
//                 <span className="flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-medium">
//                   {option.id}
//                 </span>

//                 <span className="pt-0.5 text-sm">
//                   {option.text}
//                 </span>
//               </button>
//             );
//           })}
//         </div>

//         {/* Feedback */}
//         {submitted && (
//           <div className="mt-5 rounded-lg bg-muted p-4">
//             <p className="text-sm font-medium">
//               {selectedIsCorrect ? "Correct!" : "Not quite."}
//             </p>

//             {currentQuestion.explanation && (
//               <p className="mt-1 text-sm text-muted-foreground">
//                 {currentQuestion.explanation}
//               </p>
//             )}
//           </div>
//         )}

//         {/* Actions */}
//         <div className="mt-5 flex justify-end">
//           {!submitted ? (
//             <button
//               type="button"
//               disabled={!selectedOption}
//               onClick={submitAnswer}
//               className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:pointer-events-none disabled:opacity-50"
//             >
//               Check Answer
//             </button>
//           ) : isLastQuestion ? (
//             <button
//               type="button"
//               onClick={restartQuiz}
//               className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
//             >
//               Restart Quiz
//             </button>
//           ) : (
//             <button
//               type="button"
//               onClick={nextQuestion}
//               className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
//             >
//               Next Question
//             </button>
//           )}
//         </div>
//       </div>

//       {/* Final score */}
//       {submitted && isLastQuestion && (
//         <div className="rounded-xl border p-5 text-center">
//           <p className="text-sm text-muted-foreground">
//             Quiz completed
//           </p>

//           <p className="mt-1 text-2xl font-semibold">
//             {score}/{questions.length}
//           </p>
//         </div>
//       )}
//     </div>
//   );
// }


"use client";

import { useState } from "react";
import type { QuizData } from "@/types";
import {
  CheckCircle2,
  XCircle,
  ArrowRight,
  RotateCcw,
  Sparkles,
  Trophy,
  HelpCircle,
  Check,
} from "lucide-react";

type QuizRendererProps = {
  data: QuizData;
};

export function QuizRenderer({ data }: QuizRendererProps) {
  const questions = data.questions ?? [];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  if (questions.length === 0) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-dashed border-border/80 bg-card/50 p-12 text-center backdrop-blur-sm">
        <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-xl bg-muted/60 text-muted-foreground shadow-inner">
          <HelpCircle className="size-6" />
        </div>
        <h3 className="text-base font-semibold text-foreground">No questions found</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          This quiz module doesnt have any active questions yet.
        </p>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const isLastQuestion = currentIndex === questions.length - 1;
  const progressPercentage = ((currentIndex + (submitted ? 1 : 0)) / questions.length) * 100;

  function selectOption(optionId: string) {
    if (submitted) return;
    setSelectedOption(optionId);
  }

  function submitAnswer() {
    if (!selectedOption || submitted) return;
    setSubmitted(true);
    if (selectedOption === currentQuestion.correctOptionId) {
      setScore((value) => value + 1);
    }
  }

  function nextQuestion() {
    if (!submitted) return;
    setCurrentIndex((index) => index + 1);
    setSelectedOption(null);
    setSubmitted(false);
  }

  function restartQuiz() {
    setCurrentIndex(0);
    setSelectedOption(null);
    setScore(0);
    setSubmitted(false);
  }

  const isCompleted = submitted && isLastQuestion;
  const selectedIsCorrect = selectedOption === currentQuestion.correctOptionId;

  // Completion View
  if (isCompleted) {
    const accuracy = Math.round((score / questions.length) * 100);
    return (
      <div className="relative mx-auto w-full max-w-2xl overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-b from-card via-card/90 to-card/50 p-8 shadow-2xl backdrop-blur-xl sm:p-10">
        <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 size-48 rounded-full bg-primary/20 blur-3xl" />
        
        <div className="relative flex flex-col items-center text-center">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/25 shadow-lg shadow-primary/10">
            <Trophy className="size-8" />
          </div>

          <span className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold tracking-wide text-primary">
            <Sparkles className="size-3.5" /> Assessment Complete
          </span>

          <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {accuracy >= 80 ? "Outstanding Work!" : accuracy >= 50 ? "Well Done!" : "Keep Practicing!"}
          </h2>
          
          <p className="mt-2 text-sm text-muted-foreground max-w-sm">
            You answered <span className="font-semibold text-foreground">{score}</span> out of{" "}
            <span className="font-semibold text-foreground">{questions.length}</span> questions correctly ({accuracy}%).
          </p>

          <div className="mt-8 grid w-full grid-cols-2 gap-4 rounded-2xl border border-border/50 bg-muted/20 p-4 backdrop-blur-sm">
            <div className="flex flex-col items-center justify-center border-r border-border/50 p-2">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Score</span>
              <span className="mt-1 text-2xl font-bold tracking-tight text-foreground">{score} / {questions.length}</span>
            </div>
            <div className="flex flex-col items-center justify-center p-2">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Accuracy</span>
              <span className="mt-1 text-2xl font-bold tracking-tight text-foreground">{accuracy}%</span>
            </div>
          </div>

          <button
            type="button"
            onClick={restartQuiz}
            className="mt-8 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/25 active:scale-[0.98]"
          >
            <RotateCcw className="size-4" />
            Retake Quiz
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative mx-auto w-full max-w-2xl overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-b from-card via-card/95 to-card/50 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
      {/* Top Ambient Glow */}
      <div className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 size-64 rounded-full bg-primary/10 blur-3xl" />

      {/* Header Info */}
      <div className="relative flex items-center justify-between">
        <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/40 px-3 py-1 shadow-sm">
          <span className="size-1.5 rounded-full bg-primary animate-pulse" />
          <span className="text-xs font-semibold tracking-wide text-foreground">
            Question {currentIndex + 1} of {questions.length}
          </span>
        </div>

        <div className="text-xs font-medium text-muted-foreground">
          Current Score: <span className="font-semibold text-foreground">{score}</span>
        </div>
      </div>

      {/* Progress Track */}
      <div className="relative mt-4 h-1.5 w-full overflow-hidden rounded-full bg-muted/60">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary/80 to-primary transition-all duration-500 ease-out"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      {/* Question Prompt */}
      <div className="relative mt-6 sm:mt-8">
        <h2 className="text-lg font-semibold leading-relaxed tracking-tight text-foreground sm:text-xl">
          {currentQuestion.prompt}
        </h2>

        {/* Options List */}
        <div className="mt-6 space-y-3">
          {currentQuestion.options.map((option) => {
            const isSelected = selectedOption === option.id;
            const isCorrect = option.id === currentQuestion.correctOptionId;

            let containerStyles = "border-border/60 bg-card hover:border-primary/40 hover:bg-muted/30 text-card-foreground";
            let badgeStyles = "border-border/60 bg-muted/50 text-muted-foreground group-hover:border-primary/40 group-hover:text-foreground";

            if (submitted) {
              if (isCorrect) {
                containerStyles = "border-emerald-500/80 bg-emerald-500/10 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 ring-1 ring-emerald-500/50";
                badgeStyles = "border-emerald-500/40 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400";
              } else if (isSelected && !isCorrect) {
                containerStyles = "border-rose-500/80 bg-rose-500/10 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 ring-1 ring-rose-500/50";
                badgeStyles = "border-rose-500/40 bg-rose-500/20 text-rose-600 dark:text-rose-400";
              } else {
                containerStyles = "opacity-50 border-border/40 bg-card/40 cursor-not-allowed";
              }
            } else if (isSelected) {
              containerStyles = "border-primary bg-primary/5 text-primary ring-1 ring-primary/40 shadow-sm";
              badgeStyles = "border-primary bg-primary text-primary-foreground";
            }

            return (
              <button
                key={option.id}
                type="button"
                disabled={submitted}
                onClick={() => selectOption(option.id)}
                className={`group relative flex w-full items-center justify-between rounded-xl border p-4 text-left transition-all duration-200 active:scale-[0.99] ${containerStyles}`}
              >
                <div className="flex items-center gap-3.5 pr-3">
                  <span
                    className={`flex size-8 shrink-0 items-center justify-center rounded-lg border text-xs font-semibold uppercase tracking-wider transition-colors duration-200 ${badgeStyles}`}
                  >
                    {option.id}
                  </span>
                  <span className="text-sm font-medium leading-snug">
                    {option.text}
                  </span>
                </div>

                {/* State Indicators */}
                <div className="flex shrink-0 items-center pl-2">
                  {submitted && isCorrect && (
                    <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400" />
                  )}
                  {submitted && isSelected && !isCorrect && (
                    <XCircle className="size-5 text-rose-600 dark:text-rose-400" />
                  )}
                  {!submitted && isSelected && (
                    <div className="flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check className="size-3 stroke-[3]" />
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Feedback Section */}
        {submitted && (
          <div
            className={`mt-6 overflow-hidden rounded-2xl border p-4.5 transition-all duration-300 animate-in fade-in slide-in-from-top-2 ${
              selectedIsCorrect
                ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-950 dark:text-emerald-200"
                : "border-rose-500/30 bg-rose-500/5 text-rose-950 dark:text-rose-200"
            }`}
          >
            <div className="flex items-center gap-2">
              {selectedIsCorrect ? (
                <CheckCircle2 className="size-4.5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <XCircle className="size-4.5 text-rose-600 dark:text-rose-400" />
              )}
              <h4 className="text-sm font-semibold">
                {selectedIsCorrect ? "Correct answer!" : "Incorrect answer"}
              </h4>
            </div>

            {currentQuestion.explanation && (
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                {currentQuestion.explanation}
              </p>
            )}
          </div>
        )}

        {/* Action Controls */}
        <div className="mt-8 flex items-center justify-end border-t border-border/50 pt-5">
          {!submitted ? (
            <button
              type="button"
              disabled={!selectedOption}
              onClick={submitAnswer}
              className="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground shadow-md shadow-primary/20 transition-all hover:bg-primary/90 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40"
            >
              Submit Answer
            </button>
          ) : (
            <button
              type="button"
              onClick={nextQuestion}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground shadow-md shadow-primary/20 transition-all hover:bg-primary/90 active:scale-[0.98]"
            >
              {isLastQuestion ? "View Summary" : "Next Question"}
              <ArrowRight className="size-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}