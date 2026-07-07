"use client"

import { useState, useCallback } from "react"
import { toast } from "sonner"
import AudioInput from "@/components/audio-input"
import ModeSelector from "@/components/mode-selector"
import ReferenceSentence from "@/components/reference-sentence"
import ConsentNotice from "@/components/consent-notice"
import ProcessingLoader from "@/components/processing-loader"
import ResultsView from "@/components/results-view"
import { Button } from "@/components/ui/button"
import { analyzePronunciation, type AnalysisResult } from "@/lib/api"
import { REFERENCE_SENTENCES } from "@/lib/constants"
import { Send, Waves } from "lucide-react"

type AppStage = "input" | "processing" | "results" | "error"

export default function Page() {
  // -- State --
  const [stage, setStage] = useState<AppStage>("input")
  const [mode, setMode] = useState<"scripted" | "free_speech" | null>(null)
  const [selectedSentenceId, setSelectedSentenceId] = useState(REFERENCE_SENTENCES[0].id)
  const [referenceText, setReferenceText] = useState(REFERENCE_SENTENCES[0].text)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioDuration, setAudioDuration] = useState<number | null>(null)
  const [audioFilename, setAudioFilename] = useState<string | undefined>()
  const [consented, setConsented] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [errorMessage, setErrorMessage] = useState("")
  const [processingStage, setProcessingStage] = useState<"uploading" | "transcribing" | "analyzing" | "generating">("uploading")

  // -- Handlers --
  const handleAudioReady = useCallback((blob: Blob, duration: number, filename?: string) => {
    setAudioBlob(blob)
    setAudioDuration(duration)
    setAudioFilename(filename)
  }, [])

  const handleSentenceSelect = useCallback((id: string, text: string) => {
    setSelectedSentenceId(id)
    setReferenceText(text)
  }, [])

  const canSubmit = audioBlob && mode && consented

  const handleSubmit = async () => {
    if (!audioBlob || !mode) return

    setStage("processing")
    setProcessingStage("uploading")
    setErrorMessage("")

    try {
      // Simulate pipeline stages for UX
      setTimeout(() => setProcessingStage("transcribing"), 500)
      setTimeout(() => setProcessingStage("analyzing"), 3000)
      setTimeout(() => setProcessingStage("generating"), 6000)

      const analysisResult = await analyzePronunciation(
        audioBlob,
        mode,
        mode === "scripted" ? referenceText : undefined,
        audioDuration ?? undefined,
        audioFilename
      )

      setResult(analysisResult)
      setStage("results")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong. Please try again."
      setErrorMessage(message)
      setStage("error")
      toast.error(message)
    }
  }

  const handleReset = () => {
    setStage("input")
    setAudioBlob(null)
    setAudioDuration(null)
    setAudioFilename(undefined)
    setConsented(false)
    setResult(null)
    setErrorMessage("")
    setProcessingStage("uploading")
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="relative max-w-2xl mx-auto px-4 py-8 sm:py-12">
        {/* Header */}
        <header className="text-center mb-8 sm:mb-12">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="p-2 rounded-lg bg-panel border border-panel-border">
              <Waves className="w-6 h-6 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Pronunciation Coach
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Record or upload audio • Get AI-powered pronunciation feedback
          </p>
        </header>

        {/* Input Stage */}
        {stage === "input" && (
          <div className="space-y-6 animate-fade-in duration-300">
            {/* Step 1: Mode */}
            <Section number={1} title="Choose a mode">
              <ModeSelector mode={mode} onModeChange={setMode} />
            </Section>

            {/* Step 2: Reference (scripted only) */}
            {mode === "scripted" && (
              <Section number={2} title="Your sentence">
                <ReferenceSentence
                  selectedId={selectedSentenceId}
                  onSelect={handleSentenceSelect}
                />
              </Section>
            )}

            {/* Step 3: Audio */}
            <Section number={mode === "scripted" ? 3 : 2} title="Record or upload audio (30–45 seconds)">
              <AudioInput onAudioReady={handleAudioReady} disabled={!mode} />
            </Section>

            {/* Step 4: Consent */}
            {audioBlob && (
              <Section number={mode === "scripted" ? 4 : 3} title="Privacy consent">
                <ConsentNotice consented={consented} onConsentChange={setConsented} />
              </Section>
            )}

            {/* Submit */}
            {audioBlob && (
              <div className="flex justify-center pt-2">
                <Button
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  className="px-8 py-5 text-base w-full sm:w-auto"
                  id="submit-button"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Analyze Pronunciation
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Processing Stage */}
        {stage === "processing" && (
          <ProcessingLoader stage={processingStage} />
        )}

        {/* Results Stage */}
        {stage === "results" && result && (
          <ResultsView result={result} onReset={handleReset} />
        )}

        {/* Error Stage */}
        {stage === "error" && (
          <div className="flex flex-col items-center py-12 space-y-4 animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-status-mispronounced-bg flex items-center justify-center">
              <span className="text-3xl">😔</span>
            </div>
            <h2 className="text-lg font-semibold text-foreground">Something went wrong</h2>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              {errorMessage}
            </p>
            <Button
              onClick={handleReset}
              className="mt-4"
              id="error-retry-button"
            >
              Try Again
            </Button>
          </div>
        )}

        {/* Footer */}
        <footer className="text-center mt-12 pt-6 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Powered by Groq Whisper + LLaMA 3.3 • Audio is never stored
          </p>
        </footer>
      </div>
    </div>
  )
}

function Section({
  number,
  title,
  children,
}: {
  number: number
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2.5">
        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-primary text-xs font-bold">
          {number}
        </span>
        <h2 className="text-sm font-medium text-muted-foreground">{title}</h2>
      </div>
      {children}
    </div>
  )
}
