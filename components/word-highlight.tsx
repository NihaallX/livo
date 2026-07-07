"use client"

import { useState } from "react"
import type { WordResult } from "@/lib/api"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface WordHighlightProps {
  wordData: WordResult
  index: number
  onSelect?: (word: WordResult) => void
}

const STATUS_STYLES: Record<string, { bg: string; text: string; border: string; label: string }> = {
  correct: {
    bg: "bg-transparent",
    text: "text-slate-200",
    border: "border-transparent",
    label: "Correct",
  },
  mispronounced: {
    bg: "bg-status-mispronounced-bg",
    text: "text-status-mispronounced",
    border: "border-status-mispronounced",
    label: "Mispronounced",
  },
  unclear: {
    bg: "bg-status-unclear-bg",
    text: "text-status-unclear",
    border: "border-status-unclear border-dashed",
    label: "Unclear",
  },
  missing: {
    bg: "bg-status-missing-bg",
    text: "text-status-missing line-through",
    border: "border-status-missing",
    label: "Missing",
  },
  extra: {
    bg: "bg-status-extra-bg",
    text: "text-status-extra",
    border: "border-status-extra",
    label: "Extra",
  },
}

export default function WordHighlight({ wordData, index, onSelect }: WordHighlightProps) {
  const [isOpen, setIsOpen] = useState(false)
  const style = STATUS_STYLES[wordData.status] || STATUS_STYLES.correct
  const hasFeedback = wordData.status !== "correct" && wordData.feedback

  const wordElement = (
    <span
      className={`
        inline-block px-1 py-0.5 rounded-sm cursor-default transition-all duration-200
        border-b-2
        ${style.bg} ${style.text} ${style.border}
        ${hasFeedback ? "cursor-pointer hover:opacity-80" : ""}
      `}
      onClick={() => hasFeedback && onSelect?.(wordData)}
    >
      {wordData.word}
    </span>
  )

  if (!hasFeedback) {
    return <>{wordElement} </>
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip open={isOpen} onOpenChange={setIsOpen}>
        <TooltipTrigger asChild>
          {wordElement}
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="max-w-xs bg-slate-800 border-slate-700 px-3 py-2"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-semibold ${style.text}`}>
                {style.label}
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {wordData.feedback}
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
      {" "}
    </TooltipProvider>
  )
}
