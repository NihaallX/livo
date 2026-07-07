"use client"

import type { AnalysisResult, WordResult } from "@/lib/api"
import ScoreGauge from "./score-gauge"
import WordHighlight from "./word-highlight"
import { useState } from "react"
import {
  BarChart3,
  Clock,
  Hash,
  Target,
  Sparkles,
  Eye,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  MessageSquareText,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface ResultsViewProps {
  result: AnalysisResult
  onReset: () => void
}

export default function ResultsView({ result, onReset }: ResultsViewProps) {
  const [selectedWord, setSelectedWord] = useState<WordResult | null>(null)
  const [showAllFeedback, setShowAllFeedback] = useState(false)

  const flaggedWords = result.words.filter((w) => w.status !== "correct" && w.feedback)
  const correctCount = result.words.filter((w) => w.status === "correct").length
  const totalWords = result.words.length

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Score Section */}
      <div className="flex flex-col items-center py-6">
        <ScoreGauge score={result.score} />
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          icon={<Target className="w-4 h-4 text-primary" />}
          label="Accuracy"
          value={
            result.word_accuracy_pct !== null
              ? `${result.word_accuracy_pct}%`
              : "N/A"
          }
        />
        <StatCard
          icon={<Sparkles className="w-4 h-4 text-status-correct" />}
          label="Fluency"
          value={`${result.fluency_score}`}
        />
        <StatCard
          icon={<Eye className="w-4 h-4 text-status-unclear" />}
          label="Clarity"
          value={`${result.clarity_score}`}
        />
        <StatCard
          icon={<Clock className="w-4 h-4 text-primary" />}
          label="Duration"
          value={`${result.duration_seconds}s`}
        />
      </div>

      {/* Transcript with Highlighting */}
      <div className="rounded-lg bg-panel border border-panel-border p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <MessageSquareText className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Transcript</h3>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs border-panel-muted text-muted-foreground">
              <Hash className="w-3 h-3 mr-1" />
              {correctCount}/{totalWords} correct
            </Badge>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mb-4 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-transparent border border-muted-foreground" />
            <span className="text-muted-foreground">Correct</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-status-mispronounced-bg" />
            <span className="text-muted-foreground">Mispronounced</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-status-unclear-bg" />
            <span className="text-muted-foreground">Unclear</span>
          </span>
          {result.mode === "scripted" && (
            <>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-status-missing-bg" />
                <span className="text-muted-foreground">Missing</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-status-extra-bg" />
                <span className="text-muted-foreground">Extra</span>
              </span>
            </>
          )}
        </div>

        {/* Words */}
        <div className="leading-relaxed text-base sm:text-lg">
          {result.words.map((word, idx) => (
            <WordHighlight
              key={`${word.word}-${idx}`}
              wordData={word}
              index={idx}
              onSelect={setSelectedWord}
            />
          ))}
        </div>
      </div>

      {/* Selected Word Detail */}
      {selectedWord && selectedWord.feedback && (
        <div className="rounded-lg bg-panel border border-status-mispronounced p-4 animate-slide-up">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-lg font-bold text-foreground">&ldquo;{selectedWord.word}&rdquo;</span>
              <Badge className="ml-2 text-xs" variant="outline">
                {selectedWord.status}
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedWord(null)}
              className="text-muted-foreground hover:text-foreground h-6 w-6"
            >
              ×
            </Button>
          </div>
          <p className="text-sm text-foreground mt-2 leading-relaxed">
            {selectedWord.feedback}
          </p>
        </div>
      )}

      {/* Flagged Words List */}
      {flaggedWords.length > 0 && (
        <div className="rounded-lg bg-panel border border-panel-border p-5">
          <button
            onClick={() => setShowAllFeedback(!showAllFeedback)}
            className="flex items-center justify-between w-full"
          >
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">
                Pronunciation Notes ({flaggedWords.length})
              </h3>
            </div>
            {showAllFeedback ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </button>

          {showAllFeedback && (
            <div className="mt-4 space-y-3">
              {flaggedWords.map((word, idx) => (
                <div
                  key={`flag-${idx}`}
                  className="flex items-start gap-3 p-3 rounded-md bg-panel border border-panel-border"
                >
                  <Badge
                    variant="outline"
                    className={`text-xs mt-0.5 flex-shrink-0 ${
                      word.status === "mispronounced"
                        ? "border-status-mispronounced text-status-mispronounced"
                        : word.status === "unclear"
                          ? "border-status-unclear text-status-unclear"
                          : "border-panel-muted text-muted-foreground"
                    }`}
                  >
                    {word.word}
                  </Badge>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {word.feedback}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Fluency Comment */}
      {result.fluency_comment && (
        <div className="rounded-lg bg-panel border border-status-correct p-5">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-status-correct" />
            <h3 className="text-sm font-semibold text-foreground">Coach&apos;s Feedback</h3>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {result.fluency_comment}
          </p>
        </div>
      )}

      {/* Try Again */}
      <div className="flex justify-center pt-2">
        <Button
          onClick={onReset}
          className="px-8"
          id="try-again-button"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      </div>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-panel border border-panel-border">
      {icon}
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-bold text-foreground">{value}</p>
      </div>
    </div>
  )
}
