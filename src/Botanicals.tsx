export function Flower({
  className = "",
  variant = 0,
}: {
  className?: string;
  variant?: number;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 220 280"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id={`petal-${variant}`}
          x1="55"
          y1="40"
          x2="155"
          y2="145"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#fac4c9" />
          <stop offset=".55" stopColor="#bd627a" />
          <stop offset="1" stopColor="#78344e" />
        </linearGradient>
        <linearGradient id={`leaf-${variant}`}>
          <stop stopColor="#758271" />
          <stop offset="1" stopColor="#394e40" />
        </linearGradient>
      </defs>
      <path
        d="M113 127C114 176 88 201 101 275"
        stroke="#73806c"
        strokeWidth="3"
      />
      <path
        d="M105 219C65 218 35 198 27 171C61 172 93 184 105 219Z"
        fill={`url(#leaf-${variant})`}
      />
      <path
        d="M106 195C147 182 159 162 159 140C130 148 110 165 106 195Z"
        fill={`url(#leaf-${variant})`}
      />
      <path
        d="M108 129C76 133 48 109 51 78C35 67 54 33 80 34C81 10 114 16 128 30C147 15 170 41 162 61C189 79 161 116 143 117C133 132 122 135 108 129Z"
        fill={`url(#petal-${variant})`}
      />
      <path
        d="M108 124C87 110 59 93 69 61C86 41 111 45 124 61C148 47 158 65 151 85C143 108 123 107 108 124Z"
        fill="#d991a1"
      />
      <path
        d="M107 104C81 91 80 66 99 60C113 54 130 64 135 80C131 98 119 99 107 104Z"
        fill="#af5a73"
      />
      <path
        d="M105 90C99 78 111 67 120 76C131 83 117 96 105 90Z"
        fill="#e4a5b1"
      />
      <path
        d="M111 126C113 117 122 112 143 117M53 77C68 94 87 102 108 124"
        stroke="#f5bcc6"
        strokeOpacity=".5"
        strokeWidth="1.5"
      />
    </svg>
  );
}
export function Petals() {
  return (
    <div className="petals" aria-hidden="true">
      {Array.from({ length: 28 }, (_, i) => (
        <i
          key={i}
          style={{
            left: `${(i * 3.6 + (i % 3) * 1.2) % 98}%`,
            animationDelay: `${-(i * 1.25)}s`,
            animationDuration: `${11 + (i % 6) * 2.3}s`,
            transform: `scale(${0.75 + (i % 4) * 0.2})`,
          }}
        />
      ))}
    </div>
  );
}
export function Balloons() {
  return (
    <div className="balloons" aria-hidden="true">
      <i />
      <i />
      <i />
    </div>
  );
}
