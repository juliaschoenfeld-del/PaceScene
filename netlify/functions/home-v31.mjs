const SOURCE = "https://raw.githubusercontent.com/juliaschoenfeld-del/PaceScene/main/public/index.html";

export default async () => {
  const response = await fetch(SOURCE, { headers: { "User-Agent": "PaceScene-Netlify" } });
  if (!response.ok) return new Response("PaceScene is temporarily unavailable.", { status: 502 });

  let html = await response.text();
  html = html
    .replace('</head>', '  <link rel="stylesheet" href="/v31.css">\n</head>')
    .replace('</body>', '  <script src="/v31.js"></script>\n</body>');

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-cache, no-store, must-revalidate"
    }
  });
};

export const config = { path: "/" };
