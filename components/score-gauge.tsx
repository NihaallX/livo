"use client"

import { useEffect, useState } from "react"
import { getScoreLabel } from "@/lib/constants"

interface ScoreGaugeProps {
  score: number
  size?: number
}

export default function ScoreGauge({ score, size = 180 }: ScoreGaugeProps) {
  const [animatedScore, setAnimatedScore] = useState(0)

  useEffect(() => {
    // Animate score from 0 to target
    const duration = 1200
    const start = performance.now()

    const animate = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setAnimatedScore(Math.round(score * eased))

      if (progress < 1) requestAnimationFrame(animate)
    }

    requestAnimationFrame(animate)
  }, [score])

  const strokeWidth = 10
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const progress = (animatedScore / 100) * circumference
  const offset = circumference - progress

  const label = getScoreLabel(score)

  // Color based on score using CSS variables
  const getStrokeColor = (s: number) => {
    if (s >= 71) return "var(--status-correct)"
    if (s >= 41) return "var(--status-unclear)"
    return "var(--status-mispronounced)"
  }

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          className="transform -rotate-90"
        >
          {/* Background track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--panel-border)"
            strokeWidth={strokeWidth}
          />
          {/* Progress arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={getStrokeColor(score)}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-300 ease-out"
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="text-4xl font-bold tabular-nums"
            style={{ color: getStrokeColor(score) }}
          >
            {score}
          </span>
          <span className="text-xs text-slate-400 mt-0.5">out of 100</span>
        </div>
      </div>

      <span className={`text-sm font-semibold mt-2 ${label.color}`}>
        {label.label}
      </span>
    </div>
  )
}
