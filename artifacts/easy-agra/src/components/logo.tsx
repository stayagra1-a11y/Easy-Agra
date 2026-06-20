interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "full" | "icon";
  className?: string;
}

const sizes = {
  sm: { icon: 28, text: "text-base", gap: "gap-1.5" },
  md: { icon: 38, text: "text-xl", gap: "gap-2" },
  lg: { icon: 52, text: "text-3xl", gap: "gap-3" },
  xl: { icon: 72, text: "text-5xl", gap: "gap-4" },
};

export function EasyAgraLogo({ size = "md", variant = "full", className = "" }: LogoProps) {
  const s = sizes[size];

  const IconSVG = (
    <svg
      width={s.icon}
      height={s.icon}
      viewBox="0 0 180 180"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="flex-shrink-0"
    >
      <rect width="180" height="180" rx="38" fill="#0d2b20" />

      {/* Taj Mahal dome */}
      <ellipse cx="90" cy="62" rx="22" ry="24" fill="#c9a84c" />
      <ellipse cx="90" cy="44" rx="12" ry="14" fill="#d4b45c" />
      <ellipse cx="90" cy="32" rx="6" ry="9" fill="#d4b45c" />
      <line x1="90" y1="23" x2="90" y2="17" stroke="#d4b45c" strokeWidth="2.5" />
      <ellipse cx="90" cy="16" rx="3" ry="4" fill="#d4b45c" />

      {/* Left minaret */}
      <rect x="52" y="70" width="8" height="38" fill="#c9a84c" opacity="0.75" rx="2" />
      <ellipse cx="56" cy="69" rx="5" ry="7" fill="#c9a84c" opacity="0.85" />
      <line x1="56" y1="62" x2="56" y2="58" stroke="#c9a84c" strokeWidth="1.5" />
      <ellipse cx="56" cy="57" rx="2" ry="2.5" fill="#c9a84c" opacity="0.8" />

      {/* Right minaret */}
      <rect x="120" y="70" width="8" height="38" fill="#c9a84c" opacity="0.75" rx="2" />
      <ellipse cx="124" cy="69" rx="5" ry="7" fill="#c9a84c" opacity="0.85" />
      <line x1="124" y1="62" x2="124" y2="58" stroke="#c9a84c" strokeWidth="1.5" />
      <ellipse cx="124" cy="57" rx="2" ry="2.5" fill="#c9a84c" opacity="0.8" />

      {/* Main body */}
      <rect x="66" y="78" width="48" height="30" fill="#c9a84c" rx="1" />

      {/* Arched door */}
      <rect x="83" y="88" width="14" height="20" fill="#0d2b20" rx="7" />

      {/* Base */}
      <rect x="42" y="107" width="96" height="8" fill="#c9a84c" opacity="0.5" rx="2" />

      {/* EA text */}
      <text
        x="90" y="148"
        fontFamily="Georgia, serif"
        fontSize="28"
        fontWeight="700"
        fill="#c9a84c"
        textAnchor="middle"
        letterSpacing="4"
      >
        EA
      </text>

      {/* Stars */}
      <circle cx="25" cy="28" r="2" fill="#c9a84c" opacity="0.6" />
      <circle cx="155" cy="35" r="2" fill="#c9a84c" opacity="0.6" />
      <circle cx="30" cy="55" r="1.5" fill="#c9a84c" opacity="0.4" />
      <circle cx="150" cy="55" r="1.5" fill="#c9a84c" opacity="0.4" />
    </svg>
  );

  if (variant === "icon") {
    return <div className={className}>{IconSVG}</div>;
  }

  return (
    <div className={`flex items-center ${s.gap} ${className}`}>
      {IconSVG}
      <div className="flex flex-col leading-none">
        <span
          className={`font-black tracking-tight ${s.text}`}
          style={{ color: "#c9a84c", fontFamily: "Georgia, serif" }}
        >
          Easy
        </span>
        <span
          className={`font-black tracking-tight ${s.text}`}
          style={{ color: "#ffffff", fontFamily: "Georgia, serif" }}
        >
          Agra
        </span>
      </div>
    </div>
  );
}
