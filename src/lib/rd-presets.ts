// Reaction-Diffusion organism presets
// Ported from jasonwebb/reaction-diffusion-playground/js/parameterPresets.js
// Values sourced from Robert Munafo's Gray-Scott parametrization

export const RD_PRESETS = {
  coral:        { f: 0.054,  k: 0.062  },
  worms:        { f: 0.058,  k: 0.065  },
  mitosis:      { f: 0.030,  k: 0.063  },
  fingerprints: { f: 0.037,  k: 0.060  },
  maze:         { f: 0.046,  k: 0.063  },
  turing:       { f: 0.042,  k: 0.059  },
  pulses:       { f: 0.025,  k: 0.060  },
  uskate:       { f: 0.062,  k: 0.0609 },
  waves:        { f: 0.014,  k: 0.045  },
} as const;

export type Organism = keyof typeof RD_PRESETS;

// Page → organism (meaning-matched, not random)
export const PAGE_ORGANISM: Record<string, Organism> = {
  "/":           "coral",
  "/activity":   "turing",
  "/ide":        "fingerprints",
  "/life":       "mitosis",
  "/finance":    "maze",
  "/external":   "worms",
  "/terminal":   "uskate",
  "/ai":         "pulses",
  "/learn":      "maze",
  "/settings":   "coral",
  "/database":   "turing",
  "/reports":    "fingerprints",
  "/resume":     "mitosis",
};
