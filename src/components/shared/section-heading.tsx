import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  eyebrow: string;
  title: string;
  description?: string;
  align?: "start" | "center";
  className?: string;
  action?: ReactNode;
  as?: "h1" | "h2";
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "start",
  className,
  action,
  as: Heading = "h2",
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-6 md:flex-row md:items-end md:justify-between",
        align === "center" && "md:flex-col md:items-center",
        className,
      )}
    >
      <div className={cn("max-w-2xl", align === "center" && "text-center")}>
        <span className="eyebrow">{eyebrow}</span>
        <Heading className="mt-4 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          {title}
        </Heading>
        {description ? (
          <p className="mt-4 text-base leading-7 text-muted-foreground md:text-[1.05rem]">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
