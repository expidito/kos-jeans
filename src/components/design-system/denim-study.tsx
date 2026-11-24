/** Original vector study. A design specimen, not a product photograph. */
export function DenimStudy({ light = false }: { light?: boolean }) {
  return (
    <svg viewBox="0 0 320 400" fill="none" aria-hidden="true" className="h-full w-full">
      <path d="M107 44 214 44 230 158 253 354 192 361 162 186 143 361 80 354 97 157Z" fill={light ? "#9aaebd" : "#38566f"} />
      <g stroke={light ? "#657e91" : "#a4b6c5"} strokeWidth="1.2">
        <path d="m107 44 107 0-1 19-108 0zM160 63v96l10 12M97 157l39-19 9-75M227 153l-38-15-12-75M103 70l30 4-6 31-30-4M186 74l30-4 7 31-30 4M110 167 92 344M211 167l28 177M153 66v50" />
        <path d="m108 51 103 0M106 57l105 0M82 344l60 7M191 351l59-7" strokeDasharray="2 3" />
      </g>
      <circle cx="164" cy="53" r="2.5" fill="#d4d0c1" />
    </svg>
  );
}
