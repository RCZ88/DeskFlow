export type GapMode = 'combined' | 'separate'

export interface Gap {
  start: string
  end: string
  durationSeconds: number
}

export interface SlotPrediction {
  app: string
  category: string
  confidence: number
  avgSeconds: number
  daysUsed: number
}

export interface PredictedSlot {
  slotStart: string
  slotEnd: string
  predictions: SlotPrediction[]
  durationSeconds: number
}

export interface PredictedGap {
  start: string
  end: string
  durationSeconds: number
  slots: PredictedSlot[]
}

export interface DayGapGroup {
  gapStart: string
  gapEnd: string
  durationSeconds: number
  slots: PredictedSlot[]
  predicted: boolean
}

export interface ConfirmFill {
  slotStart: string
  slotEnd: string
  app: string
  category: string
}
