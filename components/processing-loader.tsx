"use client"

import { useEffect, useState } from "react"
import { Loader2, CheckCircle2 } from "lucide-react"

interface ProcessingLoaderProps {
  stage?: "uploading" | "transcribing" | "analyzing" | "generating"
}

const STAGES = [
  { key: "uploading", label: "Uploading audio…", icon: "📤" },
  { key: "transcribing", label: "Transcribing with Whisper…", icon: "🎙️" },
  { key: "analyzing", label: "Analyzing pronunciation…", icon: "🔍" },
  { key: "generating", label: "Generating feedback…", icon: "✨" },
]

export default function ProcessingLoader({ stage = "transcribing" }: ProcessingLoaderProps) {
  const [dots, setDots] = useState("")

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((d) => (d.length >= 3 ? "" : d + "."))
    }, 500)
    return () => clearInterval(interval)
  }, [])

  const currentIdx = STAGES.findIndex((s) => s.key === stage)

  return (
    <div className="flex flex-col items-center py-12 px-4">
      {/* Simple spinner */}
      <div className="mb-8">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>

      {/* Pipeline stages */}
      <div className="space-y-3 w-full max-w-xs">
        {STAGES.map((s, idx) => {
          const isCompleted = idx < currentIdx
          const isCurrent = idx === currentIdx
          const isPending = idx > currentIdx

          return (
            <div
              key={s.key}
              className={`
                flex items-center gap-3 px-4 py-2.5 rounded-md transition-all duration-300
                ${isCurrent ? "bg-panel border border-primary" : "border border-transparent"}
                ${isCompleted ? "opacity-60" : ""}
                ${isPending ? "opacity-30" : ""}
              `}
            >
              {isCompleted ? (
                <CheckCircle2 className="w-4 h-4 text-status-correct flex-shrink-0" />
              ) : isCurrent ? (
                <Loader2 className="w-4 h-4 text-primary animate-spin flex-shrink-0" />
              ) : (
                <span className="w-4 h-4 rounded-full border border-muted-foreground flex-shrink-0" />
              )}
              <span className={`text-sm ${isCurrent ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                {s.label}
                {isCurrent ? dots : ""}
              </span>
            </div>
          )
        })}
      </div>

      <p className="text-xs text-muted-foreground mt-6">
        This usually takes 5–15 seconds
      </p>
    </div>
  )
}
