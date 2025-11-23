import React, { memo } from "react";

interface StepperProps {
  steps: string[];
  current: number; // zero-based index of current step
}

const Stepper: React.FC<StepperProps> = ({ steps, current }) => {
  return (
    <nav aria-label="Host game steps" className="w-full">
      <ol className="flex items-center justify-between w-full">
        {steps.map((label, i) => {
          const isDone = i < current;
          const isActive = i === current;

          return (
            <li key={label} className="flex-1">
              <div className="flex items-center">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all mx-1 ${
                    isDone
                      ? "bg-primary text-black"
                      : isActive
                      ? "bg-primary text-black ring-4 ring-primary/30"
                      : "bg-card/80 border-2 border-primary/20 text-muted-foreground"
                  }`}
                >
                  {isDone ? (
                    <svg
                      className="w-5 h-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-hidden
                    >
                      <path
                        d="M20 6L9 17l-5-5"
                        stroke="currentColor"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    <span>{i + 1}</span>
                  )}
                </div>

                {/* connector */}
                {i < steps.length - 1 && (
                  <div
                    className={`flex-1 h-1 mx-2 rounded ${isDone ? "bg-primary" : "bg-primary/20"}`}
                    aria-hidden
                  />
                )}
              </div>

              <div className={`text-xs mt-2 text-center ${i <= current ? "text-foreground" : "text-muted-foreground"}`}>
                {label}
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default memo(Stepper);
