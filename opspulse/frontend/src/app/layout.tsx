import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AnomaLog // Telemetry",
  description: "Advanced Agentic AI-SRE Dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="font-sans">
      <head>
        <style dangerouslySetInnerHTML={{__html: `
          :root {
            --font-geist-sans: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            --font-geist-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
          }
        `}} />
      </head>
      <body>{children}</body>
    </html>
  );
}
