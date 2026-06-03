export default function Logo({ size = 34 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Hexagonal customs stamp background */}
      <path
        d="M32 4L56 18V46L32 60L8 46V18L32 4Z"
        fill="currentColor"
        className="text-primary-500"
        style={{ color: 'var(--primary)' }}
      />
      {/* Inner hexagon */}
      <path
        d="M32 9L52 20.5V43.5L32 55L12 43.5V20.5L32 9Z"
        fill="var(--primary-foreground)"
        opacity="0.95"
      />
      {/* D letter */}
      <text
        x="32"
        y="38"
        textAnchor="middle"
        fontSize="24"
        fontWeight="700"
        fontFamily="system-ui, -apple-system, sans-serif"
        fill="var(--primary)"
      >
        D
      </text>
      {/* AI sparkle — top right */}
      <circle cx="43" cy="22" r="2" fill="var(--primary)" opacity="0.6" />
      {/* AI node — bottom right */}
      <circle cx="46" cy="40" r="1.5" fill="var(--primary)" opacity="0.4" />
      {/* AI node — left */}
      <circle cx="18" cy="32" r="1.5" fill="var(--primary)" opacity="0.3" />
      {/* Connection lines */}
      <line x1="43" y1="22" x2="46" y2="40" stroke="var(--primary)" strokeWidth="0.8" opacity="0.3" />
      <line x1="43" y1="22" x2="34" y2="32" stroke="var(--primary)" strokeWidth="0.8" opacity="0.2" />
    </svg>
  )
}
