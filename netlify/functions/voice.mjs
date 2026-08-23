import OpenAI from "openai";

function cleanText(value, max = 1900) {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}

export default async (request) => {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const body = await request.json();
    const text = cleanText(body?.text);
    if (!text) return Response.json({ error: "Text is required." }, { status: 400 });

    const client = new OpenAI();
    const speech = await client.audio.speech.create({
      model: Netlify.env.get("OPENAI_TTS_MODEL") || "gpt-4o-mini-tts",
      voice: Netlify.env.get("OPENAI_TTS_VOICE") || "marin",
      input: text,
      instructions: [
        "You are PaceScene Soft, a smooth, warm, feminine-presenting performance-rehearsal voice.",
        "Speak gently and naturally, like an excellent sports psychologist sitting nearby rather than a meditation announcer.",
        "Use a calm, low-intensity emotional range, soft edges, relaxed confidence, and subtle warmth.",
        "Keep the cadence unhurried but human. Avoid sing-song delivery, exaggerated breathiness, hype, or theatrical drama.",
        "Let short performance cues land clearly. Use natural micro-pauses after reset phrases and before decisive moments.",
        "Pronounce endurance-sport numbers, distances, pace and common training language clearly.",
        "The listener should feel steadier and more capable, not sleepy or sedated."
      ].join(" "),
      response_format: "mp3"
    });

    const audio = await speech.arrayBuffer();
    return new Response(audio, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff"
      }
    });
  } catch (error) {
    console.error("PaceScene voice error:", error);
    return Response.json({ error: "PaceScene Soft is unavailable right now." }, { status: 500 });
  }
};

export const config = { path: "/api/voice" };
