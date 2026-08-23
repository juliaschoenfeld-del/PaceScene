import OpenAI from "openai";

const ALLOWED_CONTEXTS = new Set(["race", "session", "block"]);
const ALLOWED_LENGTHS = new Set(["primer", "full", "deep"]);
const ALLOWED_TONES = new Set(["calm", "charged", "flow", "resilient"]);
const ALLOWED_PERSPECTIVES = new Set(["you", "i"]);

function clean(value, max = 1500) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

function sanitize(input = {}) {
  return {
    context: ALLOWED_CONTEXTS.has(input.context) ? input.context : "race",
    name: clean(input.name, 80),
    sport: clean(input.sport, 100),
    event: clean(input.event, 180),
    distance: clean(input.distance, 100),
    when: clean(input.when, 150),
    goal: clean(input.goal),
    target: clean(input.target, 250),
    pace: clean(input.pace, 250),
    course: clean(input.course),
    fear: clean(input.fear),
    pressure: clean(input.pressure),
    cue: clean(input.cue, 250),
    anchor: clean(input.anchor, 250),
    startPhase: clean(input.startPhase),
    settlePhase: clean(input.settlePhase),
    decisivePhase: clean(input.decisivePhase),
    finishPhase: clean(input.finishPhase),
    tone: ALLOWED_TONES.has(input.tone) ? input.tone : "calm",
    length: ALLOWED_LENGTHS.has(input.length) ? input.length : "full",
    perspective: ALLOWED_PERSPECTIVES.has(input.perspective) ? input.perspective : "you",
    lockedFacts: clean(input.lockedFacts),
  };
}

function wordTarget(length) {
  if (length === "primer") return "450-650 words";
  if (length === "deep") return "1300-1700 words";
  return "800-1100 words";
}

function phaseGuide(context) {
  if (context === "session") {
    return ["ARRIVE", "WARM UP", "MAIN WORK", "HARD PATCH", "FINISH", "RECOVER"];
  }
  if (context === "block") {
    return ["BEGIN", "BUILD", "SETTLE", "HARD WEEK", "ADAPT", "ARRIVE"];
  }
  return ["ARRIVE", "START", "SETTLE", "PRESSURE", "COMMIT", "FINISH"];
}

function promptFor(d) {
  const perspective = d.perspective === "i"
    ? "Write in first person present tense using ‘I / my’."
    : "Write in guided second person present tense using ‘you / your’.";

  return `
You are the writing engine for PaceScene, a mental-rehearsal product for endurance athletes.

Create ONE vivid, realistic, psychologically credible rehearsal. It is not manifestation magic, therapy, or a prediction.

NON-NEGOTIABLE RULES
- Never guarantee a PB, win, podium, target time, body change, selection, health outcome, or training adaptation.
- Never invent named people, exact weather, exact venue details, medical facts, family details, coach dialogue, equipment, course features, or personal history unless the athlete supplied them.
- Treat the athlete's "lockedFacts" as hard constraints.
- Do not tell an athlete to train through injury, illness, dangerous symptoms, or unsafe conditions.
- If pain/injury is part of the input, normalize sensible adjustment and professional guidance, not grit-through-it behavior.
- Include a difficult or imperfect moment and a believable recovery response.
- Confidence should come from controllable behavior: pacing, technique, judgment, self-talk, attention, fueling/routine if supplied, recovery, and commitment.
- Avoid mystical language such as “the universe”, “destined”, “manifested”, “guaranteed”, “inevitable”.
- Avoid generic motivational filler. Use the athlete's exact cues and concrete endurance details where available.
- Do not invent sensory details under strict uncertainty. Neutral phrases like “the sounds around you” are fine.
- Keep language natural when read aloud. Short paragraphs. No bullet lists inside phase text.
- ${perspective}

CONTEXT-SPECIFIC RULES
Race/event:
- Rehearse pacing discipline, settling, the feared hard section, a decisive section, and finishing.
- The result may come into view, but only after execution is rehearsed.

Key session:
- Treat the workout as training, not a referendum on fitness.
- Rehearse warm-up, useful main work, fatigue/frustration, intelligent adjustment, and recovery.
- Do not glorify completing a session at all costs.

Training block:
- Rehearse weeks rather than one cinematic day.
- Include ordinary sessions, accumulated fatigue, a disappointing workout or difficult week, recovery/adjustment, gradual adaptation, and arriving ready.
- Do not portray every week as improving linearly.

TONE
${d.tone}

TARGET LENGTH
${wordTarget(d.length)}

REQUIRED PHASES, IN THIS ORDER
${phaseGuide(d.context).join(", ")}

ATHLETE INPUT
${JSON.stringify(d, null, 2)}

Return ONLY valid JSON with this exact shape:
{
  "title": "short human title",
  "subtitle": "one sentence describing the rehearsal",
  "sections": [
    {"label": "PHASE LABEL", "text": "narration text"}
  ]
}

The sections array must contain exactly the required phases above, in order. Do not include markdown fences.
`.trim();
}

function parseJson(text) {
  const trimmed = String(text || "").trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "");
  return JSON.parse(trimmed);
}

export default async (request) => {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const raw = await request.json();
    const data = sanitize(raw);

    if (!data.sport || !data.event || !data.goal) {
      return Response.json(
        { error: "Sport, scenario and success description are required." },
        { status: 400 }
      );
    }

    const client = new OpenAI();
    const completion = await client.chat.completions.create({
      model: Netlify.env.get("OPENAI_MODEL") || "gpt-4o-mini",
      messages: [{ role: "user", content: promptFor(data) }],
      max_tokens: data.length === "deep" ? 3500 : data.length === "primer" ? 1600 : 2600,
      temperature: 0.7
    });

    const parsed = parseJson(completion.choices?.[0]?.message?.content || "");
    const expected = phaseGuide(data.context);

    if (!Array.isArray(parsed.sections) || parsed.sections.length !== expected.length) {
      throw new Error("Model returned an invalid phase structure.");
    }

    const sections = parsed.sections.map((section, index) => ({
      label: expected[index],
      text: clean(section?.text, 6000)
    }));

    if (sections.some(s => !s.text)) {
      throw new Error("Model returned an empty phase.");
    }

    return Response.json({
      title: clean(parsed.title, 140) || data.event,
      subtitle: clean(parsed.subtitle, 260) || data.goal,
      sections,
      model: Netlify.env.get("OPENAI_MODEL") || "gpt-4o-mini"
    }, {
      headers: {
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    console.error("PaceScene generation error:", error);
    return Response.json(
      { error: "We couldn't generate this rehearsal right now. Please try again." },
      { status: 500 }
    );
  }
};

export const config = {
  path: "/api/generate"
};
