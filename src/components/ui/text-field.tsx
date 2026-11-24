import type { InputHTMLAttributes } from "react";

type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "id"> & {
  id: string;
  label: string;
  hint?: string;
  error?: string;
};

export function TextField({ id, label, hint, error, className = "", "aria-describedby": describedBy, ...props }: TextFieldProps) {
  const description = [describedBy, hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ");
  return (
    <div className="grid gap-2">
      <label htmlFor={id} className="text-sm font-semibold">{label}</label>
      <input {...props} id={id} aria-invalid={error ? true : undefined} aria-describedby={description || undefined} className={`min-h-12 w-full rounded-none border bg-paper px-4 text-base text-ink placeholder:text-muted disabled:bg-canvas ${error ? "border-danger" : "border-control hover:border-ink"} ${className}`} />
      {hint && <p id={`${id}-hint`} className="text-xs leading-5 text-muted">{hint}</p>}
      {error && <p id={`${id}-error`} className="text-xs leading-5 text-danger">{error}</p>}
    </div>
  );
}
