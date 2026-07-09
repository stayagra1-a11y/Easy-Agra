interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "full" | "icon";
  className?: string;
}

const sizes = {
  sm: { width: 90, text: "text-base", gap: "gap-1.5" },
  md: { width: 110, text: "text-xl", gap: "gap-2" },
  lg: { width: 140, text: "text-3xl", gap: "gap-3" },
  xl: { width: 180, text: "text-5xl", gap: "gap-4" },
};

export function EasyAgraLogo({ size = "md", variant = "full", className = "" }: LogoProps) {
  const s = sizes[size];

  const LogoImg = (
    <img
      src="/logo.png"
      alt="Easy Agra"
      width={s.width}
      className="flex-shrink-0 object-contain"
    />
  );

  if (variant === "icon") {
    return <div className={className}>{LogoImg}</div>;
  }

  return (
    <div className={`flex items-center ${s.gap} ${className}`}>
      {LogoImg}
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
