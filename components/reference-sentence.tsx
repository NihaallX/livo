"use client"

import { useState } from "react"
import { REFERENCE_SENTENCES } from "@/lib/constants"
import { Shuffle, BookOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface ReferenceSentenceProps {
  selectedId: string
  onSelect: (id: string, text: string) => void
  disabled?: boolean
}

export default function ReferenceSentence({ selectedId, onSelect, disabled }: ReferenceSentenceProps) {
  const [animating, setAnimating] = useState(false)

  const selected = REFERENCE_SENTENCES.find((s) => s.id === selectedId) || REFERENCE_SENTENCES[0]

  const shuffle = () => {
    setAnimating(true)
    const others = REFERENCE_SENTENCES.filter((s) => s.id !== selectedId)
    const next = others[Math.floor(Math.random() * others.length)]
    setTimeout(() => {
      onSelect(next.id, next.text)
      setAnimating(false)
    }, 200)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-foreground">Reference Sentence</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={shuffle}
          disabled={disabled}
          className="text-muted-foreground hover:text-foreground h-8"
          id="shuffle-sentence"
        >
          <Shuffle className="w-3.5 h-3.5 mr-1.5" />
          Shuffle
        </Button>
      </div>

      <div
        className={`
          p-5 rounded-lg bg-panel border border-panel-border transition-all duration-200
          ${animating ? "opacity-0 scale-95" : "opacity-100 scale-100"}
        `}
      >
        <p className="text-lg sm:text-xl font-medium text-foreground leading-relaxed tracking-wide">
          &ldquo;{selected.text}&rdquo;
        </p>
        <div className="flex gap-2 mt-3">
          <Badge variant="outline" className="text-xs border-panel-muted text-muted-foreground">
            {selected.category}
          </Badge>
          <Badge
            variant="outline"
            className={`text-xs border-panel-muted ${
              selected.difficulty === "Hard"
                ? "text-status-mispronounced"
                : selected.difficulty === "Medium"
                  ? "text-status-unclear"
                  : "text-status-correct"
            }`}
          >
            {selected.difficulty}
          </Badge>
        </div>
      </div>

      {/* Sentence selector pills */}
      <div className="flex flex-wrap gap-1.5">
        {REFERENCE_SENTENCES.map((s) => (
          <button
            key={s.id}
            onClick={() => onSelect(s.id, s.text)}
            disabled={disabled}
            className={`
              px-2.5 py-1 rounded-full text-xs transition-all
              ${s.id === selectedId
                ? "bg-primary text-primary-foreground"
                : "bg-panel text-muted-foreground border border-panel-border hover:bg-muted"
              }
            `}
          >
            {s.category}
          </button>
        ))}
      </div>
    </div>
  )
}
