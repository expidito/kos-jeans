import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "KOS JEANS — сайт у розробці",
    template: "%s | KOS JEANS",
  },
  description: "Майбутній інтернет-магазин одягу KOS JEANS. Сайт у розробці.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="uk">
      <body>
        <a
          href="#main-content"
          className="sr-only fixed top-4 left-4 z-50 bg-white px-4 py-3 text-black focus:not-sr-only"
        >
          Перейти до вмісту
        </a>
        {children}
      </body>
    </html>
  );
}
