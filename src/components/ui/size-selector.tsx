"use client";

export type SizeOption = { value: string; available: boolean };

export function SizeSelector({ name, options, value, onChange, legend = "Розмір" }: {
  name: string;
  options: readonly SizeOption[];
  value: string;
  onChange: (value: string) => void;
  legend?: string;
}) {
  return (
    <fieldset>
      <legend className="mb-3 text-sm font-semibold">{legend}{value && <span className="ml-2 font-normal text-muted"> — {value}</span>}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <label key={option.value} className={option.available ? "cursor-pointer" : "cursor-not-allowed"}>
            <input type="radio" name={name} value={option.value} checked={value === option.value} disabled={!option.available} onChange={() => onChange(option.value)} className="peer sr-only" aria-label={option.available ? option.value : `${option.value} — немає в наявності`} />
            <span className="flex min-h-12 min-w-12 items-center justify-center border border-control px-3 text-sm peer-checked:border-ink peer-checked:bg-ink peer-checked:text-paper peer-focus-visible:outline-2 peer-focus-visible:outline-offset-3 peer-focus-visible:outline-denim peer-disabled:border-line peer-disabled:bg-canvas peer-disabled:text-muted peer-disabled:line-through">{option.value}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
