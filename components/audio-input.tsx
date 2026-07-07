"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Mic, Square, Upload, FileAudio, X, AlertCircle } from "lucide-react"
import { AUDIO_CONSTRAINTS } from "@/lib/constants"
import { validateAudioFile, formatDuration, getAudioDuration } from "@/lib/audio-utils"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface AudioInputProps {
  onAudioReady: (blob: Blob, duration: number, filename?: string) => void
  disabled?: boolean
}

export default function AudioInput({ onAudioReady, disabled }: AudioInputProps) {
  const [activeTab, setActiveTab] = useState<string>("record")
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioDuration, setAudioDuration] = useState<number | null>(null)
  const [audioName, setAudioName] = useState<string>("")
  const [error, setError] = useState<string>("")
  const [isDragging, setIsDragging] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number>(0)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const audioStreamRef = useRef<MediaStream | null>(null)
  const waveformDataRef = useRef<number[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopEverything()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext("2d")
      if (ctx) drawEmptyWaveform(ctx, canvas.width, canvas.height)
    }
  }, [])

  // Auto-stop at max duration
  useEffect(() => {
    if (isRecording && recordingTime >= AUDIO_CONSTRAINTS.maxDuration) {
      stopRecording()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordingTime, isRecording])

  const stopEverything = useCallback(() => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {})
      audioContextRef.current = null
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((t) => t.stop())
      audioStreamRef.current = null
    }
    if (timerRef.current) clearInterval(timerRef.current)
  }, [])

  const drawEmptyWaveform = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.fillStyle = "#222222"
    ctx.fillRect(0, 0, width, height)
    ctx.beginPath()
    ctx.setLineDash([5, 5])
    ctx.strokeStyle = "#444444"
    ctx.moveTo(0, height / 2)
    ctx.lineTo(width, height / 2)
    ctx.stroke()
    waveformDataRef.current = Array(width).fill(2)
  }

  const drawMovingWaveform = () => {
    const canvas = canvasRef.current
    if (!canvas || !analyserRef.current) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height
    const centerY = height / 2

    const bufferLength = analyserRef.current.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)
    analyserRef.current.getByteFrequencyData(dataArray)

    let sum = 0
    for (let i = 0; i < bufferLength; i++) sum += dataArray[i]
    const average = sum / bufferLength
    const barHeight = Math.max(2, Math.min((average / 255) * (height / 2), height / 2))

    waveformDataRef.current.shift()
    waveformDataRef.current.push(barHeight)

    ctx.fillStyle = "#222222"
    ctx.fillRect(0, 0, width, height)

    // Center line
    ctx.beginPath()
    ctx.setLineDash([5, 5])
    ctx.strokeStyle = "#444444"
    ctx.moveTo(0, centerY)
    ctx.lineTo(width, centerY)
    ctx.stroke()

    // Waveform
    ctx.setLineDash([])
    ctx.lineWidth = 2
    ctx.strokeStyle = "#FFFFFF"

    for (let i = 0; i < width; i++) {
      const h = waveformDataRef.current[i] || 2
      ctx.beginPath()
      ctx.moveTo(i, centerY - h)
      ctx.lineTo(i, centerY + h)
      ctx.stroke()
    }

    animationFrameRef.current = requestAnimationFrame(drawMovingWaveform)
  }

  const startRecording = async () => {
    setError("")
    setAudioBlob(null)
    setAudioDuration(null)
    setRecordingTime(0)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      audioStreamRef.current = stream

      const audioContext = new AudioContext()
      audioContextRef.current = audioContext
      const analyser = audioContext.createAnalyser()
      analyserRef.current = analyser
      analyser.fftSize = 256

      const source = audioContext.createMediaStreamSource(stream)
      source.connect(analyser)

      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder

      const chunks: BlobPart[] = []
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data)
      }

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: "audio/webm" })
        try {
          const dur = await getAudioDuration(blob)
          setAudioBlob(blob)
          setAudioDuration(dur)
          setAudioName("recording.webm")

          if (dur < AUDIO_CONSTRAINTS.minDuration) {
            setError(`Recording is too short (${formatDuration(dur)}). Please record at least ${AUDIO_CONSTRAINTS.minDuration} seconds.`)
          } else {
            onAudioReady(blob, dur, "recording.webm")
          }
        } catch {
          setAudioBlob(blob)
          setAudioDuration(recordingTime)
          setAudioName("recording.webm")
          if (recordingTime >= AUDIO_CONSTRAINTS.minDuration) {
            onAudioReady(blob, recordingTime, "recording.webm")
          }
        }
      }

      mediaRecorder.start()
      setIsRecording(true)

      const canvas = canvasRef.current
      if (canvas) waveformDataRef.current = Array(canvas.width).fill(2)

      drawMovingWaveform()

      // Timer
      timerRef.current = setInterval(() => {
        setRecordingTime((t) => t + 1)
      }, 1000)
    } catch {
      setError("Could not access your microphone. Please check browser permissions.")
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop()
    }
    setIsRecording(false)

    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((t) => t.stop())
    }
    if (timerRef.current) clearInterval(timerRef.current)

    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext("2d")
      if (ctx) drawEmptyWaveform(ctx, canvas.width, canvas.height)
    }
  }

  const handleFileUpload = async (file: File) => {
    setError("")
    setAudioBlob(null)
    setAudioDuration(null)

    const result = await validateAudioFile(file)
    if (!result.valid) {
      setError(result.error || "Invalid audio file.")
      return
    }

    setAudioBlob(file)
    setAudioDuration(result.duration!)
    setAudioName(file.name)
    onAudioReady(file, result.duration!, file.name)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileUpload(file)
  }

  const clearAudio = () => {
    setAudioBlob(null)
    setAudioDuration(null)
    setAudioName("")
    setError("")
    setRecordingTime(0)
  }

  const timerColor =
    recordingTime >= AUDIO_CONSTRAINTS.maxDuration - 5
      ? "text-status-mispronounced"
      : recordingTime >= AUDIO_CONSTRAINTS.minDuration
        ? "text-status-correct"
        : "text-foreground"

  return (
    <div className="w-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-panel border border-panel-border">
          <TabsTrigger
            value="record"
            disabled={disabled || !!audioBlob}
          >
            <Mic className="w-4 h-4 mr-2" />
            Record
          </TabsTrigger>
          <TabsTrigger
            value="upload"
            disabled={disabled || isRecording}
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload
          </TabsTrigger>
        </TabsList>

        <TabsContent value="record" className="mt-4 space-y-4">
          {/* Waveform Canvas */}
          <div className="w-full rounded-lg overflow-hidden bg-[#222222] p-4">
            <canvas
              ref={canvasRef}
              width={500}
              height={100}
              className="w-full h-[100px]"
            />
          </div>

          {/* Timer */}
          {(isRecording || recordingTime > 0) && (
            <div className="text-center">
              <span className={`text-2xl font-mono font-bold ${timerColor}`}>
                {formatDuration(recordingTime)}
              </span>
              <span className="text-xs text-muted-foreground ml-2">
                / {formatDuration(AUDIO_CONSTRAINTS.maxDuration)}
              </span>
              {isRecording && recordingTime < AUDIO_CONSTRAINTS.minDuration && (
                <p className="text-xs text-muted-foreground mt-1">
                  Record at least {AUDIO_CONSTRAINTS.minDuration - recordingTime}s more
                </p>
              )}
            </div>
          )}

          {/* Record Controls */}
          <div className="flex justify-center gap-3">
            {!isRecording && !audioBlob && (
              <Button
                onClick={startRecording}
                disabled={disabled}
                className="rounded-full w-12 h-12 p-0"
                id="record-button"
              >
                <Mic className="h-5 w-5" />
              </Button>
            )}
            {isRecording && (
              <Button
                variant="destructive"
                onClick={stopRecording}
                className="rounded-full w-12 h-12 p-0"
                id="stop-button"
              >
                <Square className="h-5 w-5" fill="currentColor" />
              </Button>
            )}
          </div>

          {/* Audio preview after recording */}
          {audioBlob && !isRecording && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-panel border border-panel-border">
              <FileAudio className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground truncate">{audioName}</p>
                {audioDuration && (
                  <p className="text-xs text-muted-foreground">{formatDuration(audioDuration)}</p>
                )}
              </div>
              <audio
                controls
                src={URL.createObjectURL(audioBlob)}
                className="h-8 max-w-[180px]"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={clearAudio}
                className="text-muted-foreground hover:text-foreground flex-shrink-0"
                id="clear-audio-button"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="upload" className="mt-4 space-y-4">
          {!audioBlob ? (
            <div
              onDragOver={(e) => {
                e.preventDefault()
                setIsDragging(true)
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`
                flex flex-col items-center justify-center p-8 rounded-lg border-2 border-dashed
                transition-all cursor-pointer bg-panel
                ${isDragging
                  ? "border-primary"
                  : "border-panel-border hover:border-panel-muted"
                }
              `}
              onClick={() => document.getElementById("file-input")?.click()}
            >
              <Upload className={`w-10 h-10 mb-3 ${isDragging ? "text-primary" : "text-muted-foreground"}`} />
              <p className="text-sm text-foreground font-medium">
                Drop your audio file here or click to browse
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                MP3, WAV, WebM, M4A, OGG, FLAC • 30–45 seconds • Max 25MB
              </p>
              <input
                id="file-input"
                type="file"
                accept="audio/*"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleFileUpload(file)
                  e.target.value = ""
                }}
                className="hidden"
              />
            </div>
          ) : (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-panel border border-panel-border">
              <FileAudio className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground truncate">{audioName}</p>
                {audioDuration && (
                  <p className="text-xs text-muted-foreground">{formatDuration(audioDuration)}</p>
                )}
              </div>
              <audio
                controls
                src={URL.createObjectURL(audioBlob)}
                className="h-8 max-w-[180px]"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={clearAudio}
                className="text-muted-foreground hover:text-foreground flex-shrink-0"
                id="clear-upload-button"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Error display */}
      {error && (
        <div className="flex items-start gap-2 mt-3 p-3 rounded-lg bg-status-mispronounced-bg border border-status-mispronounced">
          <AlertCircle className="w-4 h-4 text-status-mispronounced flex-shrink-0 mt-0.5" />
          <p className="text-sm text-status-mispronounced">{error}</p>
        </div>
      )}
    </div>
  )
}
