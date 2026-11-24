"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { SizeSelector } from "@/components/ui/size-selector";

const sizes = ["26", "27", "28", "29", "30", "31"].map((value) => ({ value, available: value !== "29" }));

export function ControlSpecimens() {
  const [size, setSize] = useState("28");
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  return (
    <div className="grid gap-12 lg:grid-cols-2 lg:gap-20">
      <div>
        <p className="mb-5 text-xs text-muted">Дії / 48 px</p>
        <div className="flex flex-wrap items-start gap-3">
          <Button onClick={() => setMessage("Приклад натискання. Замовлення не створюється.")}>Основна дія <span aria-hidden="true">↗</span></Button>
          <Button variant="secondary" onClick={() => setMessage("Другорядна дія спрацювала.")}>Другорядна дія</Button>
          <Button variant="denim" onClick={() => { setSize("28"); setQuery(""); setMessage("Початкові значення відновлено."); }}>Скинути приклад</Button>
          <Button disabled>Недоступно</Button>
        </div>
        <p role="status" className="mt-4 min-h-6 text-xs leading-6 text-muted">{message}</p>
        <div className="mt-8 border-t border-line pt-7">
          <SizeSelector name="specimen-size" options={sizes} value={size} onChange={setSize} />
          <p className="mt-3 text-xs leading-6 text-muted">29 — приклад недоступного розміру. Вибір: {size}.</p>
        </div>
      </div>
      <div className="grid content-start gap-6">
        <TextField id="specimen-search" label="Пошуковий запит" placeholder="Наприклад, прямі джинси" value={query} onChange={(event) => setQuery(event.target.value)} hint="Демонстрація поля. Пошук по каталогу ще не підключено." />
        <TextField id="specimen-error" label="Поле з помилкою" defaultValue="Некоректне значення" error="Приклад помилки. Перевірте введене значення." />
      </div>
    </div>
  );
}
