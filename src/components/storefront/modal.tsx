"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { Icon } from "./icon";

export function Modal({ open, onClose, title, children, drawer = false }: {
  open: boolean; onClose: () => void; title: string; children: ReactNode; drawer?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!open || !dialog) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (!dialog.open) dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
      document.body.style.overflow = overflow;
    };
  }, [open]);

  return <dialog ref={ref} aria-labelledby={titleId} onCancel={onClose} onClose={onClose}
    onKeyDown={(event) => {
      if (event.key !== "Tab") return;
      const controls = [...event.currentTarget.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex='-1'])")].filter((element) => element.getClientRects().length > 0);
      const first = controls[0];
      const last = controls.at(-1);
      if (event.shiftKey && (document.activeElement === first || document.activeElement === event.currentTarget)) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === event.currentTarget)) { event.preventDefault(); first?.focus(); }
    }}
    onClick={(event) => { if (event.target === event.currentTarget) { const b = event.currentTarget.getBoundingClientRect(); if (event.clientX < b.left || event.clientX > b.right || event.clientY < b.top || event.clientY > b.bottom) onClose(); } }}
    className={`border-0 bg-paper p-0 text-ink backdrop:bg-ink/45 ${drawer ? "fixed inset-y-0 right-0 left-auto m-0 h-dvh max-h-dvh w-full max-w-lg" : "fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-3xl"}`}>
    <div className="flex items-center justify-between gap-5 border-b border-line px-5 py-5 sm:px-8">
      <h2 id={titleId} className="text-lg font-semibold tracking-tight">{title}</h2>
      <button type="button" onClick={onClose} aria-label="Закрити вікно" className="flex h-11 w-11 shrink-0 items-center justify-center hover:bg-canvas"><Icon name="close" /></button>
    </div>
    <div className="p-5 sm:p-8">{children}</div>
  </dialog>;
}
