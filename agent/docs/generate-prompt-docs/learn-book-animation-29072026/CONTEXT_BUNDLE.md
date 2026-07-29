# Context Bundle — Learn Book Opening Animation

## Problem
The book on the Learn page home screen has two issues:
1. **Book texture not rendering properly** — the CSS classes `.lyceum-book-cloth`, `.lyceum-book-shadow`, `.lyceum-book-pages` were missing from the stylesheet. They've been added but may not be applying correctly.
2. **Animation not triggering on app entry** — the current `BookOpening` component uses `setTimeout` which doesn't sync with the page mount animation. The animation should start immediately when the user enters the Learn page.

## Current Implementation

### BookOpening.tsx (current — BROKEN)
```tsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface BookOpeningProps {
  onComplete?: () => void;
}

export function BookOpening({ onComplete }: BookOpeningProps) {
  const [phase, setPhase] = useState<'closed' | 'opening' | 'open' | 'pages'>('closed');

  useEffect(() => {
    const timer1 = setTimeout(() => setPhase('opening'), 800);
    const timer2 = setTimeout(() => setPhase('open'), 1800);
    const timer3 = setTimeout(() => setPhase('pages'), 2400);
    const timer4 = setTimeout(() => onComplete?.(), 4000);
    return () => { clearTimeout(timer1); clearTimeout(timer2); clearTimeout(timer3); clearTimeout(timer4); };
  }, [onComplete]);

  return (
    <div className="relative w-[320px] h-[220px] perspective-[1200px]">
      {/* Book shadow */}
      <motion.div className="absolute bottom-0..." animate={{width: ...}} />
      
      {/* Left cover — clay gradient */}
      <motion.div className="absolute left-[calc(50%-160px)]..." 
        style={{ background: 'linear-gradient(135deg, #c2553a 0%, #8f3a25 100%)' }}
        animate={{ rotateY: phase === 'closed' ? 0 : -160 }}
      />
      
      {/* Right cover — clay gradient */}
      <motion.div className="absolute left-[calc(50%)]..." 
        style={{ background: 'linear-gradient(225deg, #c2553a 0%, #8f3a25 100%)' }}
        animate={{ rotateY: phase === 'closed' ? 0 : 160 }}
      />
      
      {/* Left page — cream color */}
      <motion.div style={{ background: '#faf6ee' }}
        animate={{ rotateY: phase === 'closed' ? 0 : -155 }}
      />
      
      {/* Right page — cream color */}
      <motion.div style={{ background: '#faf6ee' }}
        animate={{ rotateY: phase === 'closed' ? 0 : 155 }}
      />
      
      {/* Page flip animation — 3 pages flipping */}
      <AnimatePresence>
        {phase === 'pages' && [0,1,2].map(i => (
          <motion.div animate={{ rotateY: -180, opacity: 0 }} />
        ))}
      </AnimatePresence>
    </div>
  );
}
```

### WelcomeEmptyState.tsx (relevant section)
```tsx
{/* Right: animated book opening */}
<BlurFade delay={0.2} direction="up" inView>
  <div className="relative mx-auto w-fit">
    <BookOpening />
  </div>
</BlurFade>
```

### CSS (lyceum-learn-features.css — recently added)
```css
.lyceum-book-cloth {
  background: linear-gradient(150deg, #c2553a 0%, #8f3a25 100%);
  box-shadow: inset 0 0 0 1px rgba(255,255,255,0.07), inset -16px 0 26px -20px rgba(0,0,0,0.6), 0 30px 60px -28px rgba(0,0,0,0.7);
}
.lyceum-book-cloth::before { /* fabric texture */ }
.lyceum-book-cloth::after { /* spine shadow */ }
.lyceum-book-shadow { background: radial-gradient(...); }
.lyceum-book-pages { background: repeating-linear-gradient(...); }
.lyceum-book-spine { /* spine highlight */ }
.lyceum-book-gilt { color: #f3d9a4; text-shadow: 0 1px 2px rgba(0,0,0,0.3); }
```

## Design System (Warm Wood Theme)
- **Primary clay:** #c2553a (book covers)
- **Deep clay:** #8f3a25 (book cover gradient end)
- **Gilt text:** #f3d9a4 (gold accents on book)
- **Page color:** #faf6ee (cream/off-white pages)
- **Dark background:** #0f0e0d (page bg)
- **Font serif:** for book titles
- **Font mono:** for volume labels

## Requirements for the Animation
1. **Starts immediately on page mount** — no delay, no setTimeout
2. **Book opens from closed to fully open** — covers swing out, pages revealed
3. **Pages flip through** — multiple pages turning from right to left
4. **Book texture visible** — cloth texture, spine shadow, gilt text
5. **Smooth 3D perspective** — realistic book opening feel
6. **Loop or settle** — animation completes and stays open, or loops subtly
7. **Responsive** — works on mobile and desktop

## Tech Stack
- React 18
- Framer Motion 11
- Tailwind CSS
- TypeScript
