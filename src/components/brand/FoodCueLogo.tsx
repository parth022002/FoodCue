interface FoodCueLogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
  showTagline?: boolean;
}

export function FoodCueLogo({
  size = 36,
  className = "",
  showText = false,
  showTagline = false
}: FoodCueLogoProps) {
  return (
    <div className={`foodcue-brand-container ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="foodcue-logo-svg"
        aria-hidden="true"
      >
        {/* Container rounded card */}
        <rect width="100" height="100" rx="22" fill="#075A35" />
        {/* Shopping basket / food container body */}
        <path d="M25 45H75L68 76H32L25 45Z" fill="#72C900" />
        {/* Basket vertical slats */}
        <rect x="36" y="52" width="6" height="16" rx="3" fill="#075A35" />
        <rect x="47" y="52" width="6" height="16" rx="3" fill="#075A35" />
        <rect x="58" y="52" width="6" height="16" rx="3" fill="#075A35" />
        {/* Fresh food items (orange & red produce) */}
        <circle cx="68" cy="40" r="12" fill="#F39A1E" />
        <circle cx="45" cy="35" r="14" fill="#E53935" />
        {/* Scanner reticle corner brackets */}
        <path d="M22 28C22 24.6863 24.6863 22 28 22H36" stroke="#72C900" strokeWidth="6" strokeLinecap="round" />
        <path d="M78 28C78 24.6863 75.3137 22 72 22H64" stroke="#72C900" strokeWidth="6" strokeLinecap="round" />
        <path d="M22 72C22 75.3137 24.6863 78 28 78H36" stroke="#72C900" strokeWidth="6" strokeLinecap="round" />
        <path d="M78 72C78 75.3137 75.3137 78 72 78H64" stroke="#72C900" strokeWidth="6" strokeLinecap="round" />
      </svg>

      {showText && (
        <div className="brand-text-block">
          <span className="brand-name">FoodCue</span>
          {showTagline && (
            <span className="brand-tagline">Know your food. Manage your kitchen.</span>
          )}
        </div>
      )}
    </div>
  );
}
