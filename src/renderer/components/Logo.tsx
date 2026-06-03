export default function Logo({ size = 34 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Outer hexagon — customs stamp border */}
      <path
        d="M24 3L43 14V34L24 45L5 34V14L24 3Z"
        stroke="var(--primary)"
        strokeWidth="1.8"
        fill="none"
      />
      {/* Inner hexagon — subtle fill */}
      <path
        d="M24 8L37 15.5V32.5L24 40L11 32.5V15.5L24 8Z"
        fill="var(--primary)"
        opacity="0.1"
      />
      {/* Central AI node */}
      <circle cx="24" cy="24" r="3" fill="var(--primary)" opacity="0.9" />
      {/* Orbiting nodes */}
      <circle cx="24" cy="13" r="1.8" fill="var(--primary)" opacity="0.55" />
      <circle cx="34.5" cy="21" r="1.8" fill="var(--primary)" opacity="0.5" />
      <circle cx="34" cy="30" r="1.5" fill="var(--primary)" opacity="0.45" />
      <circle cx="24" cy="36" r="1.5" fill="var(--primary)" opacity="0.4" />
      <circle cx="14" cy="30" r="1.5" fill="var(--primary)" opacity="0.45" />
      <circle cx="13.5" cy="19" r="1.8" fill="var(--primary)" opacity="0.5" />
      {/* Neural connections */}
      <line x1="24" y1="14.8" x2="24" y2="21" stroke="var(--primary)" strokeWidth="0.7" opacity="0.2" />
      <line x1="32.7" y1="21.2" x2="27" y2="22.8" stroke="var(--primary)" strokeWidth="0.7" opacity="0.2" />
      <line x1="32.5" y1="29.5" x2="27" y2="25.5" stroke="var(--primary)" strokeWidth="0.7" opacity="0.2" />
      <line x1="24" y1="34.5" x2="24" y2="27" stroke="var(--primary)" strokeWidth="0.7" opacity="0.2" />
      <line x1="15.5" y1="29.5" x2="21" y2="25.5" stroke="var(--primary)" strokeWidth="0.7" opacity="0.2" />
      <line x1="15.3" y1="19.2" x2="21" y2="22.8" stroke="var(--primary)" strokeWidth="0.7" opacity="0.2" />
    </svg>
  )
}
