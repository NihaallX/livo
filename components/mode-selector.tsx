"use client"

import { BookOpen, MessageCircle } from "lucide-react"

interface ModeSelectorProps {
  mode: "scripted" | "free_speech" | null
  onModeChange: (mode: "scripted" | "free_speech") => void
  disabled?: boolean
}

export default function ModeSelector({ mode, onModeChange, disabled }: ModeSelectorProps) {
  const modes = [
    {
      value: "scripted" as const,
      icon: BookOpen,
      title: "Read a Sentence",
      description: "Read a reference sentence aloud. We'll compare your pronunciation word-by-word.",
    },
    {
      value: "free_speech" as const,
      icon: MessageCircle,
      title: "Free Speech",
      description: "Speak freely on any topic. We'll analyze your clarity and fluency.",
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {modes.map((m) => {
        const isSelected = mode === m.value
        const Icon = m.icon

        return (
          <button
            key={m.value}
            onClick={() => onModeChange(m.value)}
            disabled={disabled}
            className={`
              relative p-4 rounded-lg border text-left transition-all duration-200
              ${isSelected
                ? "bg-panel border-primary"
                : "bg-panel border-panel-border hover:border-panel-muted"
              }
              ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
            `}
            id={`mode-${m.value}`}
          >
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-md ${isSelected ? "bg-primary/10" : "bg-muted"}`}>
                <Icon className={`w-5 h-5 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
              </div>
              <div>
                <h3 className={`text-sm font-semibold ${isSelected ? "text-foreground" : "text-muted-foreground"}`}>
                  {m.title}
                </h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {m.description}
                </p>
              </div>
            </div>

            {/* Selection indicator */}
            {isSelected && (
              <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-primary" />
            )}
          </button>
        )
      })}
    </div>
  )
}
