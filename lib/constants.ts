/** Reference sentences and app configuration constants. */

export const REFERENCE_SENTENCES = [
  {
    id: "pangram",
    text: "The quick brown fox jumps over the lazy dog",
    category: "Pangram",
    difficulty: "Easy",
  },
  {
    id: "seashells",
    text: "She sells seashells by the seashore",
    category: "Tongue Twister",
    difficulty: "Medium",
  },
  {
    id: "peter-piper",
    text: "Peter Piper picked a peck of pickled peppers",
    category: "Tongue Twister",
    difficulty: "Medium",
  },
  {
    id: "woodchuck",
    text: "How much wood would a woodchuck chuck if a woodchuck could chuck wood",
    category: "Tongue Twister",
    difficulty: "Hard",
  },
  {
    id: "thieves",
    text: "The thirty three thieves thought that they thrilled the throne throughout Thursday",
    category: "Th Sounds",
    difficulty: "Hard",
  },
  {
    id: "copper",
    text: "A proper copper coffee pot brews proper coffee properly",
    category: "P & R Sounds",
    difficulty: "Medium",
  },
  {
    id: "sheikh",
    text: "The sixth sick sheikh's sixth sheep is sick",
    category: "S & Sh Sounds",
    difficulty: "Hard",
  },
  {
    id: "butter",
    text: "Betty Botter bought some butter but she said the butter is bitter",
    category: "B & T Sounds",
    difficulty: "Medium",
  },
] as const;

export type ReferenceSentence = (typeof REFERENCE_SENTENCES)[number];

export const AUDIO_CONSTRAINTS = {
  minDuration: 30,
  maxDuration: 45,
  maxFileSize: 25 * 1024 * 1024, // 25 MB
  allowedTypes: [
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/wave",
    "audio/x-wav",
    "audio/webm",
    "audio/mp4",
    "audio/x-m4a",
    "audio/ogg",
    "audio/flac",
  ],
  allowedExtensions: [".mp3", ".wav", ".webm", ".m4a", ".ogg", ".flac", ".mp4"],
} as const;

export const SCORE_THRESHOLDS = {
  excellent: { min: 91, label: "Excellent", color: "text-status-correct" },
  good: { min: 71, label: "Good", color: "text-status-correct" },
  fair: { min: 41, label: "Getting There", color: "text-status-unclear" },
  poor: { min: 0, label: "Needs Practice", color: "text-status-mispronounced" },
} as const;

export function getScoreLabel(score: number) {
  if (score >= 91) return SCORE_THRESHOLDS.excellent;
  if (score >= 71) return SCORE_THRESHOLDS.good;
  if (score >= 41) return SCORE_THRESHOLDS.fair;
  return SCORE_THRESHOLDS.poor;
}
