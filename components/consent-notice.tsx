"use client"

import { Checkbox } from "@/components/ui/checkbox"
import { Shield, ChevronDown, ChevronUp } from "lucide-react"
import { useState } from "react"

interface ConsentNoticeProps {
  consented: boolean
  onConsentChange: (consented: boolean) => void
  disabled?: boolean
}

export default function ConsentNotice({ consented, onConsentChange, disabled }: ConsentNoticeProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="rounded-lg bg-panel border border-panel-border p-4">
      <div className="flex items-start gap-3">
        <Checkbox
          id="consent-checkbox"
          checked={consented}
          onCheckedChange={(checked) => onConsentChange(checked === true)}
          disabled={disabled}
          className="mt-0.5 border-panel-muted data-[state=checked]:bg-primary data-[state=checked]:border-primary"
        />
        <div className="flex-1">
          <label
            htmlFor="consent-checkbox"
            className="text-sm text-foreground cursor-pointer leading-relaxed"
          >
            I consent to processing my audio for pronunciation analysis.
            Audio is sent to Groq&apos;s API for transcription and is{" "}
            <span className="text-primary font-medium">not stored</span> after processing.
          </label>

          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 mt-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Shield className="w-3 h-3" />
            Privacy details (DPDP Act 2023)
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {expanded && (
            <div className="mt-3 p-3 rounded-md bg-panel-muted/30 border border-panel-border text-xs text-muted-foreground space-y-2">
              <p>
                <strong className="text-foreground">What we collect:</strong> Your audio recording is
                processed in-memory to generate a pronunciation assessment.
              </p>
              <p>
                <strong className="text-foreground">Data processor:</strong> Audio is sent to
                Groq Inc.&apos;s API (groq.com) for speech-to-text transcription and AI analysis.
              </p>
              <p>
                <strong className="text-foreground">Storage:</strong> No audio, transcripts, or
                personal data are stored beyond the duration of this request. Processing happens
                in a serverless function that terminates after each response.
              </p>
              <p>
                <strong className="text-foreground">Deletion:</strong> Since no data is retained,
                there is nothing to delete. Your right to erasure under the DPDP Act is satisfied
                by design.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
