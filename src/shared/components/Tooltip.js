"use client";

import {
  Tooltip as ShadTooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/shared/components/ui/tooltip";

export default function Tooltip({ text, children, position = "top" }) {
  return (
    <TooltipProvider delayDuration={120}>
      <ShadTooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex">{children}</span>
        </TooltipTrigger>
        <TooltipContent side={position} className="max-w-56 text-[11px] leading-snug whitespace-normal">
          {text}
        </TooltipContent>
      </ShadTooltip>
    </TooltipProvider>
  );
}
