# RHEO Landing Page — Premium Polish Guide

> **Status:** Foundation built (70%). Now making it PREMIUM (30%).
> **Goal:** Award-worthy, screenshot-worthy, "how did they do that?" level.
> **Reference:** pacomepertant.com, vshslv.com, motion.dev, awwwards SOTD quality.

---

## WHAT MAKES A WEBSITE PREMIUM

### The Difference Between "Good" and "Premium"

| Good Website | Premium Website |
|-------------|-----------------|
| Animations work | Animations feel PHYSICAL |
| Colors match | Colors have DEPTH and ATMOSPHERE |
| Typography is readable | Typography is SCULPTURAL |
| Layout is balanced | Layout BREATHES |
| Interactions function | Interactions DELIGHT |
| Loads fast | Loads with INTENTION |
| Responsive | Responsive with GRACE |

### The 5 Pillars of Premium

1. **Tactility** — Everything feels physical. Weight, momentum, resistance.
2. **Atmosphere** — The page has a mood. Light, shadow, depth, haze.
3. **Rhythm** — Pacing. Fast moments, slow moments. Silence and noise.
4. **Detail** — Micro-interactions that reward attention.
5. **Coherence** — Every element feels like it belongs to the same world.

---

## 1. TACTILITY — Making Things Feel Physical

### 1.1 Custom Easing Curves

**NEVER use default `ease` or `ease-in-out`.** Premium sites use custom cubic-bezier curves.

```css
/* The "premium" easing — fast start, gentle settle */
--ease-premium: cubic-bezier(0.16, 1, 0.3, 1);

/* The "spring" easing — slight overshoot */
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);

/* The "dramatic" easing — slow start, fast end */
--ease-dramatic: cubic-bezier(0.87, 0, 0.13, 1);

/* The "gentle" easing — for subtle movements */
--ease-gentle: cubic-bezier(0.4, 0, 0.2, 1);
```

**Where to use:**
- Hero text entrance: `--ease-dramatic`
- Card hover: `--ease-spring`
- Section transitions: `--ease-premium`
- Micro-interactions: `--ease-gentle`

### 1.2 Spring Physics (Motion.dev)

```tsx
import { motion } from "motion";

// Spring animation for cards
<motion.div
  whileHover={{ scale: 1.02, y: -4 }}
  transition={{ type: "spring", stiffness: 400, damping: 25 }}
>
```

**Why:** Spring physics feel organic. They have weight and momentum. Default transitions feel robotic.

### 1.3 Scroll-Velocity-Based Effects

```tsx
// Elements that skew based on scroll speed
const { scrollYProgress } = useScroll();
const skewY = useTransform(scrollYProgress, [0, 1], [0, 5]);

// Or: Elements that stretch slightly when scrolling fast
const velocity = useVelocity(scrollYProgress);
const scaleY = useTransform(velocity, [-1000, 1000], [0.95, 1.05]);
```

**Why:** When you scroll fast, the page should feel like it's resisting slightly. Like flipping through heavy paper.

### 1.4 Magnetic Buttons

```tsx
// Button follows cursor within 50px radius
const MagneticButton = ({ children }) => {
  const ref = useRef<HTMLButtonElement>(null);

  const handleMouseMove = (e: MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    ref.current.style.transform = `translate(${x * 0.3}px, ${y * 0.3}px)`;
  };

  const handleMouseLeave = () => {
    if (!ref.current) return;
    ref.current.style.transform = 'translate(0, 0)';
  };

  return (
    <button
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ transition: 'transform 0.3s var(--ease-gentle)' }}
    >
      {children}
    </button>
  );
};
```

**Why:** The button reaches toward your cursor. It feels alive. It wants to be clicked.

---

## 2. ATMOSPHERE — Creating Depth and Mood

### 2.1 Layered Backgrounds

**NEVER use flat `#09090b`.** Premium sites have depth.

```css
/* Layer 1: Deepest void */
.bg-void { background: #050505; }

/* Layer 2: Subtle radial gradient (center glow) */
.bg-atmosphere {
  background: 
    radial-gradient(ellipse 80% 50% at 50% 0%, rgba(251, 191, 36, 0.03) 0%, transparent 70%),
    radial-gradient(ellipse 60% 40% at 80% 80%, rgba(194, 112, 61, 0.02) 0%, transparent 60%),
    #09090b;
}

/* Layer 3: Noise texture overlay */
.bg-noise {
  position: relative;
}
.bg-noise::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
  opacity: 0.02;
  pointer-events: none;
  mix-blend-mode: overlay;
}
```

**Why:** Flat black feels cheap. Subtle gradients and noise create the feeling of a physical space — like a dark room with one warm light source.

### 2.2 Vignette Effect

```css
.vignette {
  position: fixed;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(ellipse 90% 80% at 50% 50%, transparent 40%, rgba(5, 5, 5, 0.4) 100%);
  z-index: 40;
}
```

**Why:** Draws the eye to the center. Creates focus. Feels cinematic.

### 2.3 Ambient Particles (Dust Motes)

```tsx
// Floating dust particles — amber and terracotta
const DustParticles = () => {
  const particles = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 2 + 1,
    duration: Math.random() * 20 + 10,
    delay: Math.random() * 5,
    opacity: Math.random() * 0.3 + 0.1,
    color: Math.random() > 0.5 ? '#fbbf24' : '#c2703d',
  }));

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute rounded-full animate-float"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            opacity: p.opacity,
            animation: `float ${p.duration}s ease-in-out ${p.delay}s infinite alternate`,
          }}
        />
      ))}
    </div>
  );
};

// CSS animation
@keyframes float {
  0% { transform: translate(0, 0) rotate(0deg); }
  33% { transform: translate(30px, -30px) rotate(120deg); }
  66% { transform: translate(-20px, 20px) rotate(240deg); }
  100% { transform: translate(10px, -10px) rotate(360deg); }
}
```

**Why:** Makes the space feel lived-in. Like dust floating in a beam of light. Subtle, atmospheric.

### 2.4 Thread Glow at Intersections

```tsx
// SVG filter for glow
const GlowFilter = () => (
  <defs>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <filter id="strong-glow" x="-100%" y="-100%" width="300%" height="300%">
      <feGaussianBlur stdDeviation="6" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
);

// Apply to active warp
<line
  filter={isActive ? "url(#strong-glow)" : "url(#glow)"}
  stroke={isActive ? "#fbbf24" : "#c2703d"}
  strokeWidth={isActive ? 3 : 1.5}
/>
```

**Why:** The intersection where weft crosses warp is the most important visual moment. It should glow like a filament.

---

## 3. RHYTHM — Pacing and Timing

### 3.1 The Scroll Rhythm

**NOT every section should animate the same way.**

```
Section 1 (Hero):     CINEMATIC — slow, deliberate, one focal element
Section 2 (Threads):  NARRATIVE — medium pace, sequential reveals  
Section 3 (Shuttle):  NARRATIVE — medium pace, caption stagger
Section 4 (Fabric):   CINEMATIC — slow zoom, big reveal
Section 5 (Store):    REACTIVE — fast, snappy, hover-driven
Section 6 (Quiet):    MINIMAL — almost nothing, let the user breathe
Section 7 (OpenSource): REACTIVE — counters, stats, badges
Section 8 (Footer):   MINIMAL — calm landing
```

### 3.2 The "Quiet" Moments

**Premium sites have silence between the notes.**

- After a heavy animation section, add 200px of empty space
- Let the user scroll through "nothing" for a moment
- Then hit them with the next section

```tsx
// Add breathing room between sections
<section className="h-[50vh] bg-bg" aria-hidden="true">
  {/* Empty space — let the user breathe */}
</section>
```

### 3.3 Stagger Patterns

**NEVER reveal everything at once.**

```tsx
// Bad: All cards appear simultaneously
// Good: Cards appear with calculated stagger

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,      // 80ms between each
      delayChildren: 0.2,         // Wait 200ms after trigger
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.16, 1, 0.3, 1],    // Premium easing
    },
  },
};
```

---

## 4. DETAIL — Micro-Interactions That Reward Attention

### 4.1 Text Selection Color

```css
::selection {
  background: rgba(251, 191, 36, 0.3);
  color: #fafafa;
}

::-moz-selection {
  background: rgba(251, 191, 36, 0.3);
  color: #fafafa;
}
```

**Why:** When someone selects text, it should feel like highlighting with a gold marker.

### 4.2 Custom Cursor

```tsx
const CustomCursor = () => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const [isClicking, setIsClicking] = useState(false);

  useEffect(() => {
    const move = (e: MouseEvent) => setPosition({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', move);

    // Detect hover on interactive elements
    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('a, button, [role="button"]')) {
        setIsHovering(true);
      }
    };
    const handleMouseOut = () => setIsHovering(false);

    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('mouseout', handleMouseOut);

    const handleDown = () => setIsClicking(true);
    const handleUp = () => setIsClicking(false);
    window.addEventListener('mousedown', handleDown);
    window.addEventListener('mouseup', handleUp);

    return () => {
      window.removeEventListener('mousemove', move);
      document.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('mouseout', handleMouseOut);
      window.removeEventListener('mousedown', handleDown);
      window.removeEventListener('mouseup', handleUp);
    };
  }, []);

  return (
    <>
      {/* Main cursor dot */}
      <div
        className="fixed pointer-events-none z-[9999] mix-blend-difference"
        style={{
          left: position.x,
          top: position.y,
          transform: `translate(-50%, -50%) scale(${isClicking ? 0.5 : 1})`,
          transition: 'transform 0.15s ease-out',
        }}
      >
        <div
          className="rounded-full bg-amber"
          style={{
            width: isHovering ? 40 : 8,
            height: isHovering ? 40 : 8,
            transition: 'width 0.3s ease-out, height 0.3s ease-out',
            opacity: 0.9,
          }}
        />
      </div>

      {/* Trailing ring */}
      <div
        className="fixed pointer-events-none z-[9998]"
        style={{
          left: position.x,
          top: position.y,
          transform: 'translate(-50%, -50%)',
          transition: 'left 0.1s ease-out, top 0.1s ease-out',
        }}
      >
        <div
          className="rounded-full border border-amber/30"
          style={{
            width: isHovering ? 48 : 32,
            height: isHovering ? 48 : 32,
            transition: 'width 0.5s ease-out, height 0.5s ease-out',
          }}
        />
      </div>
    </>
  );
};
```

**Why:** The cursor is the user's primary tool. Making it feel responsive and tactile transforms the entire experience.

**Note:** Hide default cursor:
```css
* { cursor: none !important; }
@media (pointer: coarse) { * { cursor: auto !important; } }
```

### 4.3 Link Underline Animation

```css
/* Underline that slides in from left */
.link-premium {
  position: relative;
  text-decoration: none;
}

.link-premium::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  width: 0;
  height: 1px;
  background: #fbbf24;
  transition: width 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.link-premium:hover::after {
  width: 100%;
}
```

### 4.4 Button Ripple Effect

```tsx
const RippleButton = ({ children, onClick }) => {
  const [ripples, setRipples] = useState([]);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = Date.now();

    setRipples(prev => [...prev, { id, x, y }]);
    setTimeout(() => setRipples(prev => prev.filter(r => r.id !== id)), 600);

    onClick?.();
  };

  return (
    <button onClick={handleClick} className="relative overflow-hidden">
      {children}
      {ripples.map(ripple => (
        <span
          key={ripple.id}
          className="absolute rounded-full bg-white/30 animate-ripple"
          style={{
            left: ripple.x,
            top: ripple.y,
            transform: 'translate(-50%, -50%)',
          }}
        />
      ))}
    </button>
  );
};

// CSS
@keyframes ripple {
  to {
    width: 200px;
    height: 200px;
    opacity: 0;
  }
}

.animate-ripple {
  animation: ripple 0.6s ease-out forwards;
  width: 0;
  height: 0;
}
```

### 4.5 Number Counter Animation

```tsx
const AnimatedCounter = ({ target, suffix = '' }) => {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          let start = 0;
          const duration = 2000;
          const startTime = performance.now();

          const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Ease out expo
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(eased * target));

            if (progress < 1) {
              requestAnimationFrame(animate);
            }
          };

          requestAnimationFrame(animate);
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);

  return <span ref={ref}>{count}{suffix}</span>;
};
```

---

## 5. TYPOGRAPHY — Sculptural Text

### 5.1 Variable Font Animation

```tsx
// If using Geist (variable font)
const AnimatedHeadline = ({ text }) => {
  const [weight, setWeight] = useState(400);

  useEffect(() => {
    const handleScroll = () => {
      const scrollProgress = window.scrollY / (document.body.scrollHeight - window.innerHeight);
      setWeight(400 + scrollProgress * 500); // 400 → 900
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <h1 
      className="text-[clamp(3rem,8vw,7rem)] leading-[0.9] tracking-tight"
      style={{ fontWeight: weight }}
    >
      {text}
    </h1>
  );
};
```

**Why:** The headline gets bolder as you scroll. It feels like it's gaining weight, presence, importance.

### 5.2 Text Reveal Animation

```tsx
const TextReveal = ({ text, delay = 0 }) => {
  const words = text.split(' ');

  return (
    <span className="inline-flex flex-wrap">
      {words.map((word, i) => (
        <motion.span
          key={i}
          className="inline-block mr-[0.25em] overflow-hidden"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ delay: delay + i * 0.08, duration: 0.5 }}
          viewport={{ once: true, margin: "-100px" }}
        >
          <motion.span
            className="inline-block"
            initial={{ y: '100%' }}
            whileInView={{ y: 0 }}
            transition={{ 
              delay: delay + i * 0.08, 
              duration: 0.6,
              ease: [0.16, 1, 0.3, 1]
            }}
            viewport={{ once: true, margin: "-100px" }}
          >
            {word}
          </motion.span>
        </motion.span>
      ))}
    </span>
  );
};
```

**Why:** Words slide up from below their baseline, like they're emerging from water. Elegant, not flashy.

### 5.3 Kinetic Typography (Hero)

```tsx
// Letters that respond to mouse position
const KineticText = ({ text }) => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMove);
    return () => window.removeEventListener('mousemove', handleMove);
  }, []);

  return (
    <div className="relative">
      {text.split('').map((char, i) => {
        const charX = (i % 10) * 50 + 100; // Approximate position
        const charY = Math.floor(i / 10) * 60 + 100;
        const distX = mousePos.x - charX;
        const distY = mousePos.y - charY;
        const distance = Math.sqrt(distX * distX + distY * distY);
        const maxDist = 200;
        const force = Math.max(0, 1 - distance / maxDist);

        return (
          <motion.span
            key={i}
            className="inline-block"
            animate={{
              x: distX * force * 0.1,
              y: distY * force * 0.1,
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            {char === ' ' ? ' ' : char}
          </motion.span>
        );
      })}
    </div>
  );
};
```

**Why:** The text subtly pushes away from the cursor. Like it's made of something physical.

---

## 6. LOADING — First Impressions Matter

### 6.1 Preloader

```tsx
const Preloader = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Simulate loading (or use actual asset loading)
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(onComplete, 500);
          return 100;
        }
        return prev + Math.random() * 15;
      });
    }, 100);

    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      className="fixed inset-0 z-[100] bg-void flex flex-col items-center justify-center"
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* RHEO logo drawing in */}
      <svg width="120" height="40" viewBox="0 0 120 40">
        <text
          x="60"
          y="30"
          textAnchor="middle"
          className="fill-amber text-3xl font-bold"
          style={{
            strokeDasharray: 200,
            strokeDashoffset: 200 - (progress / 100) * 200,
            stroke: '#fbbf24',
            strokeWidth: 1,
            fill: 'none',
          }}
        >
          RHEO
        </text>
      </svg>

      {/* Progress bar */}
      <div className="w-48 h-[2px] bg-surface mt-8 overflow-hidden rounded-full">
        <motion.div
          className="h-full bg-amber"
          style={{ width: `${Math.min(progress, 100)}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      <p className="text-text-muted text-xs mt-4 font-mono">
        {Math.min(Math.floor(progress), 100)}%
      </p>
    </motion.div>
  );
};
```

**Why:** The first 2 seconds set the tone. A preloader that draws the logo in makes the site feel crafted, not generated.

### 6.2 Skeleton Loading (for dynamic content)

```tsx
const SkeletonCard = () => (
  <div className="bg-surface rounded-xl p-6 animate-pulse">
    <div className="h-4 bg-raised rounded w-3/4 mb-4" />
    <div className="h-3 bg-raised rounded w-full mb-2" />
    <div className="h-3 bg-raised rounded w-5/6" />
  </div>
);

// Better: Shimmer effect
const ShimmerSkeleton = () => (
  <div className="bg-surface rounded-xl p-6 overflow-hidden relative">
    <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/5 to-transparent" />
    <div className="h-4 bg-raised/50 rounded w-3/4 mb-4" />
    <div className="h-3 bg-raised/50 rounded w-full mb-2" />
    <div className="h-3 bg-raised/50 rounded w-5/6" />
  </div>
);

@keyframes shimmer {
  100% { transform: translateX(100%); }
}
```

---

## 7. PERFORMANCE — Premium FEELS Fast

### 7.1 Lazy Loading Strategy

```tsx
// Only load heavy components when needed
const HeavySection = lazy(() => import('./sections/HeavySection'));

// In App.tsx
<Suspense fallback={<ShimmerSkeleton />}>
  <HeavySection />
</Suspense>
```

### 7.2 Will-Change Hints

```css
/* Only apply to actively animating elements */
.will-animate {
  will-change: transform, opacity;
}

/* Remove after animation completes */
.animation-complete {
  will-change: auto;
}
```

### 7.3 GPU-Accelerated Properties Only

**Animate ONLY these properties:**
- `transform` (translate, scale, rotate)
- `opacity`
- `filter` (sparingly)

**NEVER animate:**
- `width`, `height`, `top`, `left` (causes reflow)
- `margin`, `padding` (causes reflow)
- `border-width` (causes reflow)

### 7.4 Image Optimization

```tsx
// Use WebP with fallback
<picture>
  <source srcSet="/images/hero.webp" type="image/webp" />
  <img 
    src="/images/hero.jpg" 
    alt="Hero" 
    loading="lazy"
    decoding="async"
    width="1920"
    height="1080"
  />
</picture>
```

### 7.5 Font Loading

```html
<!-- Preload critical fonts -->
<link rel="preload" href="/fonts/Geist-Variable.woff2" as="font" type="font/woff2" crossorigin>

<!-- Font display swap -->
<style>
  @font-face {
    font-family: 'Geist';
    src: url('/fonts/Geist-Variable.woff2') format('woff2');
    font-weight: 100 900;
    font-display: swap;
  }
</style>
```

---

## 8. RESPONSIVE — Premium on Every Screen

### 8.1 Breakpoint Strategy

```css
/* Mobile-first */
/* Base: 320px+ */
/* sm: 640px+ */
/* md: 768px+ */
/* lg: 1024px+ */
/* xl: 1280px+ */
/* 2xl: 1536px+ */
```

### 8.2 Touch Device Adjustments

```tsx
const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

// Disable custom cursor on touch
{!isTouchDevice && <CustomCursor />}

// Reduce particle count on mobile
const particleCount = isTouchDevice ? 10 : 30;

// Simplify animations on low-power mode
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
```

### 8.3 Mobile Loom Simplification

```tsx
// On mobile: fewer threads, no captions, simpler animation
const warpThreads = isMobile ? 5 : 7;
const showCaptions = !isMobile;
const weftAmplitude = isMobile ? 15 : 26;
```

---

## 9. THE "WOW" MOMENTS

### 9.1 The Fabric Reveal

When the user scrolls to the Fabric section:
1. The camera "pulls back" from the loom
2. The individual threads blur slightly
3. They resolve into a woven pattern
4. A subtle "shimmer" passes across the fabric (like light on silk)
5. The text "Fifteen tools. One thread." fades in

```tsx
// Shimmer effect on fabric
const FabricShimmer = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <motion.div
        className="absolute top-0 -left-full w-full h-full"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(251, 191, 36, 0.1), transparent)',
        }}
        animate={{ left: '100%' }}
        transition={{ duration: 2, ease: 'easeInOut', repeat: Infinity, repeatDelay: 5 }}
      />
    </div>
  );
};
```

### 9.2 The Admin Toggle Cascade

When the user toggles "Admin Mode":
1. The toggle switch slides with a spring
2. All price tags flip simultaneously with a 0.05s stagger
3. A subtle "unlock" sound (optional)
4. Gold border glow pulses on all cards
5. Confetti burst from the toggle (subtle, amber particles)

### 9.3 The Download Button

When the user hovers the download button:
1. The button glows brighter
2. A ripple expands from the cursor position
3. The text shifts slightly (magnetic effect)
4. On click: the button compresses (scale 0.95), then releases
5. A "success" state: checkmark appears, button turns green briefly

---

## 10. CHECKLIST — Premium Verification

Before shipping, verify EVERY item:

### Tactility
- [ ] Custom easing curves used (not default ease)
- [ ] Spring physics on interactive elements
- [ ] Scroll-velocity effects
- [ ] Magnetic buttons
- [ ] Button ripple effects

### Atmosphere
- [ ] Layered backgrounds (not flat black)
- [ ] Noise texture overlay
- [ ] Vignette effect
- [ ] Ambient particles
- [ ] Thread glow at intersections
- [ ] Glow filters on SVG

### Rhythm
- [ ] Different animation speeds per section
- [ ] "Quiet" moments between heavy sections
- [ ] Staggered reveals (not simultaneous)
- [ ] Scroll progress indicator

### Detail
- [ ] Custom text selection color
- [ ] Custom cursor (desktop only)
- [ ] Link underline animations
- [ ] Number counter animations
- [ ] Hover states on ALL interactive elements

### Typography
- [ ] Variable font weight animation
- [ ] Text reveal (word-by-word)
- [ ] Kinetic typography (optional)
- [ ] Proper letter-spacing and line-height

### Loading
- [ ] Preloader with brand identity
- [ ] Skeleton screens for dynamic content
- [ ] Smooth page transitions

### Performance
- [ ] Lazy loading for heavy sections
- [ ] GPU-accelerated animations only
- [ ] Image optimization (WebP, lazy)
- [ ] Font preloading
- [ ] 60fps on all animations

### Responsive
- [ ] Works at 320px, 768px, 1024px, 1920px
- [ ] Touch device optimizations
- [ ] Reduced motion support
- [ ] No horizontal overflow

### The "Wow"
- [ ] Fabric shimmer effect
- [ ] Admin toggle cascade
- [ ] Download button delight
- [ ] At least 3 "how did they do that?" moments

---

## MCP COMPONENTS FOR PREMIUM EFFECTS

```bash
# Magic UI — Premium effects
npx shadcn@latest add @magicui/text-reveal        # Word-by-word text reveal
npx shadcn@latest add @magicui/animated-shiny-text  # Button shine
npx shadcn@latest add @magicui/particles           # Background particles
npx shadcn@latest add @magicui/border-beam         # Card border glow
npx shadcn@latest add @magicui/blur-fade           # Section transitions
npx shadcn@latest add @magicui/scroll-based-velocity # Scroll speed text

# React Bits — Backgrounds
npx shadcn@latest add @react-bits/Aurora-TS-TW     # Aurora background
npx shadcn@latest add @react-bits/Threads-TS-TW    # Thread lines
```

---

## SUMMARY

**The 30% that makes it premium:**

1. **Tactility** — Custom easing, spring physics, magnetic buttons
2. **Atmosphere** — Layered backgrounds, noise, particles, glow
3. **Rhythm** — Pacing, stagger, quiet moments
4. **Detail** — Custom cursor, text selection, link animations
5. **Typography** — Variable fonts, text reveal, kinetic type
6. **Loading** — Preloader, skeletons
7. **Performance** — 60fps, lazy loading, GPU only
8. **Responsive** — Graceful at every size
9. **Wow moments** — Fabric shimmer, toggle cascade, button delight

**This is what separates a "good" website from an award-winning one.**

---

*Implement everything in this guide. Don't skip items. Every detail matters.*
