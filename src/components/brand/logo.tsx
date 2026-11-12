import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  markClassName?: string;
  showWordmark?: boolean;
}

export function Logo({ className, markClassName, showWordmark = true }: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <svg
        viewBox="0 0 40 40"
        className={cn("size-9 shrink-0", markClassName)}
        aria-hidden="true"
        focusable="false"
      >
        <path
          d="M20 2.8 36 11.4 20 20 4 11.4Z"
          className="fill-primary"
          opacity=".95"
        />
        <path
          d="M4 19.8 20 28.4 36 19.8"
          fill="none"
          className="stroke-primary"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity=".72"
        />
        <path
          d="M4 27.6 20 36.2 36 27.6"
          fill="none"
          className="stroke-brand-cyan"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {showWordmark ? (
        <span className="flex flex-col leading-none">
          <span className="font-heading text-[1.05rem] font-semibold tracking-[0.2em] text-foreground">
            TELLO
          </span>
          <span className="mt-1 text-[0.53rem] font-medium tracking-[0.28em] text-muted-foreground">
            PRINTING CENTER
          </span>
        </span>
      ) : null}
    </span>
  );
}
