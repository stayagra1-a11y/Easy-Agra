import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { ChevronRight } from "lucide-react";
import { EasyAgraLogo } from "@/components/logo";

const slides = [
  {
    id: 1,
    bg: "from-[#0d2b20] via-[#1a4a35] to-[#0d2b20]",
    accent: "#c9a84c",
    icon: (
      <img src="/logo.png" alt="Easy Agra" className="w-64 h-auto drop-shadow-2xl object-contain" />
    ),
    tag: "Easy Agra",
    title: "Easy Agra में\nआपका स्वागत है",
    subtitle: "Agra — UNESCO World Heritage City. Hotels, Restaurants, Spas aur Tourist Places — sab kuch ek hi jagah.",
  },
  {
    id: 2,
    bg: "from-[#1a1a3e] via-[#2d2d6b] to-[#1a1a3e]",
    accent: "#f0a500",
    icon: (
      <svg viewBox="0 0 200 160" className="w-72 h-56 drop-shadow-2xl" fill="none">
        {/* Agra Fort silhouette */}
        <rect x="20" y="90" width="160" height="55" fill="#f0a500" opacity="0.85" rx="3"/>
        {/* Battlements */}
        {[20,36,52,68,84,100,116,132,148,164].map((x, i) => (
          <rect key={i} x={x} y="76" width="10" height="16" fill="#f0a500" opacity="0.9" rx="1"/>
        ))}
        {/* Main gate */}
        <rect x="85" y="105" width="30" height="40" fill="#1a1a3e" rx="15" opacity="0.8"/>
        {/* Towers */}
        <rect x="20" y="55" width="28" height="38" fill="#f0a500" opacity="0.8" rx="2"/>
        <ellipse cx="34" cy="54" rx="15" ry="10" fill="#f0a500" opacity="0.9"/>
        <rect x="152" y="55" width="28" height="38" fill="#f0a500" opacity="0.8" rx="2"/>
        <ellipse cx="166" cy="54" rx="15" ry="10" fill="#f0a500" opacity="0.9"/>
        {/* Windows */}
        <ellipse cx="34" cy="80" rx="6" ry="8" fill="#1a1a3e" opacity="0.6"/>
        <ellipse cx="166" cy="80" rx="6" ry="8" fill="#1a1a3e" opacity="0.6"/>
        {/* Moon */}
        <circle cx="150" cy="30" r="14" fill="#f0c040" opacity="0.9"/>
        <circle cx="157" cy="25" r="10" fill="#2d2d6b"/>
        {/* Stars */}
        <circle cx="40" cy="25" r="1.5" fill="white" opacity="0.9"/>
        <circle cx="70" cy="15" r="1" fill="white" opacity="0.7"/>
        <circle cx="120" cy="20" r="1.5" fill="white" opacity="0.8"/>
        <circle cx="175" cy="40" r="1" fill="white" opacity="0.6"/>
      </svg>
    ),
    tag: "Mughal Empire",
    title: "Agra Fort —\nShahi Itihas\nKi Virasat",
    subtitle: "Akbar, Jahangir, Shah Jahan — 3 Mughal emperors ki taaqat ka markaz। Aaj bhi shehan-shaahi aura baaki hai।",
  },
  {
    id: 3,
    bg: "from-[#2b1a0d] via-[#4a3018] to-[#2b1a0d]",
    accent: "#ff6b35",
    icon: (
      <svg viewBox="0 0 200 160" className="w-72 h-56 drop-shadow-2xl" fill="none">
        {/* Hotel building */}
        <rect x="40" y="50" width="120" height="100" fill="#ff6b35" opacity="0.8" rx="4"/>
        <rect x="55" y="40" width="90" height="15" fill="#ff8c5a" opacity="0.9" rx="2"/>
        <rect x="70" y="32" width="60" height="12" fill="#ff8c5a" opacity="0.85" rx="2"/>
        {/* Windows - lit up */}
        {[60,85,110,135].map((x, i) => (
          <rect key={i} x={x} y="70" width="16" height="20" fill="#ffe082" opacity="0.9" rx="3"/>
        ))}
        {[60,85,110,135].map((x, i) => (
          <rect key={i} x={x} y="105" width="16" height="20" fill="#ffe082" opacity="0.7" rx="3"/>
        ))}
        {/* Door */}
        <rect x="88" y="125" width="24" height="25" fill="#2b1a0d" opacity="0.7" rx="3"/>
        {/* Stars/sky */}
        <circle cx="20" cy="20" r="1.5" fill="white" opacity="0.9"/>
        <circle cx="45" cy="12" r="1" fill="white" opacity="0.6"/>
        <circle cx="155" cy="18" r="1.5" fill="white" opacity="0.8"/>
        <circle cx="180" cy="30" r="1" fill="white" opacity="0.7"/>
        {/* Glow under building */}
        <ellipse cx="100" cy="153" rx="55" ry="6" fill="#ff6b35" opacity="0.25"/>
        {/* "5 stars" */}
        {[78,88,98,108,118].map((x, i) => (
          <polygon key={i} points={`${x},22 ${x+3},29 ${x+7},29 ${x+4},33 ${x+5},40 ${x},36 ${x-5},40 ${x-4},33 ${x-7},29 ${x-3},29`}
            fill="#f0c040" opacity="0.85" transform={`scale(0.5) translate(${x},0)`}/>
        ))}
        {[76,86,96,106,116].map((x, i) => (
          <circle key={i} cx={x} cy="23" r="2.5" fill="#f0c040" opacity="0.9"/>
        ))}
      </svg>
    ),
    tag: "Premium Stays",
    title: "Agra Ke\nSabse Achhe\nHotels",
    subtitle: "Budget se luxury tak — Taj Mahal ke paaس best hotels sirf ek tap mein book karein।",
  },
  {
    id: 4,
    bg: "from-[#0a2b1a] via-[#0d3d28] to-[#0a2b1a]",
    accent: "#4ade80",
    icon: (
      <svg viewBox="0 0 200 160" className="w-72 h-56 drop-shadow-2xl" fill="none">
        {/* Phone/app mockup */}
        <rect x="65" y="20" width="70" height="125" fill="#1a4a35" rx="12" stroke="#4ade80" strokeWidth="2"/>
        <rect x="70" y="28" width="60" height="100" fill="#0a2b1a" rx="8"/>
        {/* App UI inside phone */}
        <rect x="75" y="35" width="50" height="18" fill="#4ade80" opacity="0.3" rx="4"/>
        <rect x="78" y="39" width="20" height="4" fill="#4ade80" opacity="0.8" rx="2"/>
        <rect x="78" y="45" width="30" height="3" fill="#4ade80" opacity="0.4" rx="2"/>
        {/* Cards */}
        <rect x="75" y="58" width="22" height="22" fill="#c9a84c" opacity="0.7" rx="4"/>
        <rect x="102" y="58" width="22" height="22" fill="#ff6b35" opacity="0.7" rx="4"/>
        <rect x="75" y="85" width="22" height="22" fill="#4ade80" opacity="0.7" rx="4"/>
        <rect x="102" y="85" width="22" height="22" fill="#a78bfa" opacity="0.7" rx="4"/>
        {/* Map pin icons in cards */}
        <circle cx="86" cy="67" r="4" fill="white" opacity="0.8"/>
        <circle cx="113" cy="67" r="4" fill="white" opacity="0.8"/>
        <circle cx="86" cy="94" r="4" fill="white" opacity="0.8"/>
        <circle cx="113" cy="94" r="4" fill="white" opacity="0.8"/>
        {/* Bottom bar */}
        <rect x="75" y="112" width="50" height="8" fill="#4ade80" opacity="0.2" rx="4"/>
        <rect x="78" y="114" width="16" height="4" fill="#4ade80" opacity="0.6" rx="2"/>
        {/* Orbiting dots */}
        <circle cx="40" cy="60" r="6" fill="#4ade80" opacity="0.5"/>
        <circle cx="160" cy="90" r="8" fill="#c9a84c" opacity="0.5"/>
        <circle cx="30" cy="110" r="4" fill="#ff6b35" opacity="0.4"/>
        <circle cx="170" cy="50" r="5" fill="#a78bfa" opacity="0.4"/>
        {/* Connection lines */}
        <line x1="46" y1="60" x2="65" y2="80" stroke="#4ade80" strokeWidth="1" opacity="0.3" strokeDasharray="3,3"/>
        <line x1="154" y1="90" x2="135" y2="90" stroke="#c9a84c" strokeWidth="1" opacity="0.3" strokeDasharray="3,3"/>
      </svg>
    ),
    tag: "Easy Agra App",
    title: "Sab Kuch\nEk Hi App\nMein",
    subtitle: "Hotels • Restaurants • Spas • Tourist Places — Agra ghoomna ab aur bhi aasaan। Abhi shuru karein!",
  },
];

export default function Onboarding() {
  const [current, setCurrent] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [direction, setDirection] = useState<"next" | "prev">("next");
  const [, setLocation] = useLocation();
  const touchStartX = useRef<number | null>(null);
  const autoRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const goTo = (idx: number, dir: "next" | "prev" = "next") => {
    if (animating) return;
    setDirection(dir);
    setAnimating(true);
    setTimeout(() => {
      setCurrent(idx);
      setAnimating(false);
    }, 300);
  };

  const next = () => {
    if (current < slides.length - 1) goTo(current + 1, "next");
  };

  const finish = () => {
    localStorage.setItem("ea_onboarded", "1");
    setLocation("/login");
  };

  useEffect(() => {
    autoRef.current = setInterval(() => {
      setCurrent(c => {
        if (c < slides.length - 1) return c + 1;
        return c;
      });
    }, 3500);
    return () => { if (autoRef.current) clearInterval(autoRef.current); };
  }, []);

  const clearAuto = () => {
    if (autoRef.current) clearInterval(autoRef.current);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    clearAuto();
    if (diff > 50 && current < slides.length - 1) goTo(current + 1, "next");
    else if (diff < -50 && current > 0) goTo(current - 1, "prev");
    touchStartX.current = null;
  };

  const slide = slides[current];
  const isLast = current === slides.length - 1;

  return (
    <div
      className={`min-h-dvh bg-gradient-to-br ${slide.bg} flex flex-col relative transition-all duration-700`}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Skip button */}
      {!isLast && (
        <button
          onClick={finish}
          className="absolute z-20 text-white/60 text-sm font-medium px-3 py-1.5 rounded-full border border-white/20 hover:bg-white/10 transition-colors"
          style={{ top: 'max(1.25rem, env(safe-area-inset-top))', right: '1.25rem' }}
        >
          Skip
        </button>
      )}

      {/* Logo top-left */}
      <div className="absolute left-4 z-20" style={{ top: 'max(1rem, env(safe-area-inset-top))' }}>
        <EasyAgraLogo size="sm" variant="full" />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-16 pb-8">

        {/* Illustration */}
        <div
          className={`transition-all duration-300 ${animating ? (direction === "next" ? "-translate-x-8 opacity-0" : "translate-x-8 opacity-0") : "translate-x-0 opacity-100"}`}
        >
          <div className="flex items-center justify-center mb-6">
            {slide.icon}
          </div>
        </div>

        {/* Tag pill */}
        <div
          className={`transition-all duration-300 delay-75 ${animating ? "opacity-0 scale-90" : "opacity-100 scale-100"}`}
        >
          <span
            className="text-xs font-bold px-3 py-1 rounded-full mb-4 inline-block tracking-widest uppercase"
            style={{ backgroundColor: `${slide.accent}25`, color: slide.accent, border: `1px solid ${slide.accent}40` }}
          >
            {slide.tag}
          </span>
        </div>

        {/* Title */}
        <div
          className={`transition-all duration-300 delay-100 ${animating ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0"}`}
        >
          <h1 className="text-4xl font-black text-white text-center leading-tight mb-4 whitespace-pre-line tracking-tight">
            {slide.title}
          </h1>
        </div>

        {/* Subtitle */}
        <div
          className={`transition-all duration-300 delay-150 ${animating ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0"}`}
        >
          <p className="text-white/60 text-center text-sm leading-relaxed max-w-xs">
            {slide.subtitle}
          </p>
        </div>
      </div>

      {/* Bottom section */}
      <div className="px-6 pb-10 space-y-6">
        {/* Dots */}
        <div className="flex items-center justify-center gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => { clearAuto(); goTo(i, i > current ? "next" : "prev"); }}
              className="transition-all duration-300 rounded-full"
              style={{
                width: i === current ? "28px" : "8px",
                height: "8px",
                backgroundColor: i === current ? slide.accent : `${slide.accent}40`,
              }}
            />
          ))}
        </div>

        {/* CTA Button */}
        {isLast ? (
          <button
            onClick={finish}
            className="w-full py-4 rounded-2xl text-base font-bold text-white shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-2"
            style={{ backgroundColor: slide.accent, boxShadow: `0 8px 32px ${slide.accent}50` }}
          >
            Get Started
            <ChevronRight className="h-5 w-5" />
          </button>
        ) : (
          <button
            onClick={() => { clearAuto(); next(); }}
            className="w-full py-4 rounded-2xl text-base font-bold text-white shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-2"
            style={{ backgroundColor: slide.accent, boxShadow: `0 8px 32px ${slide.accent}50` }}
          >
            Next
            <ChevronRight className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
}
