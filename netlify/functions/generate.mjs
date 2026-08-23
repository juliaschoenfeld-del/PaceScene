import OpenAI from "openai";

const ALLOWED_CONTEXTS = new Set(["race", "session", "block"]);
const ALLOWED_LENGTHS = new Set(["primer", "full", "deep"]);
const ALLOWED_TONES = new Set(["calm", "charged", "flow", "resilient"]);
const ALLOWED_PERSPECTIVES = new Set(["you", "i"]);

function clean(value, max = 1800) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

function sanitize(input = {}) {
  return {
    context: ALLOWED_CONTEXTS.has(input.context) ? input.context : "race",
    name: clean(input.name, 80),
    sport: clean(input.sport, 100),
    event: clean(input.event, 180),
    distance: clean(input.distance, 120),
    when: clean(input.when, 150),
    course: clean(input.course),
    goal: clean(input.goal),
    target: clean(input.target, 300),
    pace: clean(input.pace, 300),
    decisive: clean(input.decisive),
    identityCue: clean(input.identityCue, 400),
    fear: clean(input.fear),
    pressure: clean(input.pressure),
    thoughtTrap: clean(input.thoughtTrap),
    cue: clean(input.cue, 300),
    anchor: clean(input.anchor, 300),
    ifThen: clean(input.ifThen, 700),
    evidence: clean(input.evidence),
    tone: ALLOWED_TONES.has(input.tone) ? input.tone : "calm",
    length: ALLOWED_LENGTHS.has(input.length) ? input.length : "full",
    perspective: ALLOWED_PERSPECTIVES.has(input.perspective) ? input.perspective : "you",
    lockedFacts: clean(input.lockedFacts)
  };
}

function phases(context) {
  if (context === "session") return ["GROUND", "ARRIVE", "WARM UP", "MAIN WORK", "HARD PATCH", "RESET", "FINISH", "RECOVER"];
  if (context === "block") return ["GROUND", "BEGIN", "BUILD", "ORDINARY DAYS", "HARD WEEK", "ADAPT", "SHARPEN", "ARRIVE"];
  return ["GROUND", "ARRIVE", "START", "RHYTHM", "PRESSURE", "RESET", "COMMIT", "REMEMBER"];
}

function lengthGuide(length) {
  if (length === "primer") return "500-700 words total";
  if (length === "deep") return "1450-1850 words total";
  return "850-1150 words total";
}

function toneGuide(tone) {
  if (tone === "charged") return "quiet fire: energetic and brave, never shouty or aggressive";
  if (tone === "flow") return "fluid and rhythmic: absorbed, light, economical";
  if (tone === "resilient") return "warm resilience: sturdy, kind, adaptable after setbacks";
  return "calm confidence: spacious, warm, steady, quietly assured";
}

function promptFor(d) {
  const labels = phases(d.context);
  const perspective = d.perspective === "i"
    ? "Write in first-person present tense using I / me / my."
    : "Write in guided second-person present tense using you / your.";

  return `
You are PaceScene's performance-rehearsal writer for endurance athletes.

Create one vivid, calm, psychologically credible mental rehearsal. The product may feel uplifting and future-oriented, but it must NOT present manifestation as magic, certainty, or a guarantee. The athlete is rehearsing attention, emotion, decisions and action patterns.

DESIGN PRINCIPLES
Use evidence-informed sport imagery principles:
- Physical: include realistic body sensations relevant to the athlete's supplied facts.
- Environment: use only environment details the athlete supplied. Never invent exact weather, venue, people or course features.
- Task: rehearse the actual pacing, technique, decisions and controllable actions.
- Timing: let the sequence feel close to real-time rather than like a motivational montage.
- Emotion: include nerves, effort, doubt and relief without treating them as failure.
- Perspective: obey the requested first- or second-person perspective.
- Learning: rehearse the athlete's CURRENT response plan, cues and evidence, not an idealized superhuman version.

PERFORMANCE PSYCHOLOGY PRINCIPLES
- Include a realistic hard/imperfect moment.
- Use a notice → regulate → anchor → next-action sequence.
- Use the supplied reset phrase and physical anchor naturally.
- Use the athlete's if–then plan as a cue-response link. Do NOT convert it into "ignore pain" or "push through warning signs."
- Self-talk should be short, believable and instructional or motivational in a grounded way.
- Confidence should be tied to supplied training evidence and repeatable actions.
- The identity cue can be uplifting, but frame it as a rehearsed way of responding, not destiny.
- Outcome targets can matter, but should sit in the background until execution is established.
- If symptoms could indicate injury, illness or danger, explicitly preserve the option to adjust, stop or seek appropriate help.

NON-NEGOTIABLE SAFETY / REALISM
- Never guarantee a PB, win, podium, target time, selection, body change, adaptation or health outcome.
- Never invent named people, coach dialogue, family, medical history, nutrition/fueling plans, equipment, course details, prior results or exact conditions unless supplied.
- Treat lockedFacts as hard constraints.
- Never tell the athlete to override unsafe conditions or concerning pain.
- Do not use pseudo-neuroscience phrases such as "rewire your brain instantly", "your subconscious guarantees this", or "your body already knows the exact result".
- Avoid generic filler, hype, mystical language and clichés.
- Do not say "you are unstoppable."
- Do not overuse breath cues. One grounding breath sequence at the beginning and brief reset breaths later are enough.
- Make the narration pleasant to hear aloud: short paragraphs, clean sentences, natural pauses.

TONE
${toneGuide(d.tone)}

PERSPECTIVE
${perspective}

TARGET LENGTH
${lengthGuide(d.length)}

REQUIRED PHASES — EXACTLY THIS ORDER
${labels.join(", ")}

CONTEXT NOTES
Race/event:
- Ground before the start.
- Rehearse patient opening, settling, rising effort, feared moment, reset, decisive section and finish/remember.
- Do not make the finish a guaranteed target outcome.

Key session:
- Ground before training.
- Rehearse warm-up uncertainty, useful main work, a hard patch, intelligent reset/adjustment, finish and recovery.
- Training is not a referendum on fitness. Useful adjustment is allowed.

Training block:
- Ground into the weeks ahead.
- Rehearse ordinary days, consistency, overload, a difficult week or disappointing session, recovery/adjustment, adaptation and arriving ready.
- Do not portray linear progress or perfect adherence.

ATHLETE INPUT
${JSON.stringify(d, null, 2)}

OUTPUT
Return ONLY valid JSON:
{
  "title": "short, warm title",
  "subtitle": "one grounded sentence about what this scene rehearses",
  "sections": [
    {"label": "PHASE", "text": "spoken narration"}
  ]
}

The sections array must contain exactly ${labels.length} sections matching the required phase labels and order. No markdown fences.
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
      return Response.json({ error: "Sport, scene and execution description are required." }, { status: 400 });
    }

    const expected = phases(data.context);
    const client = new OpenAI();

    const completion = await client.chat.completions.create({
      model: Netlify.env.get("OPENAI_MODEL") || "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You write calm, realistic, evidence-informed sports mental rehearsals. You never guarantee outcomes or invent athlete facts."
        },
        { role: "user", content: promptFor(data) }
      ],
      max_tokens: data.length === "deep" ? 4200 : data.length === "primer" ? 1900 : 3000,
      temperature: 0.72,
      response_format: { type: "json_object" }
    });

    const parsed = parseJson(completion.choices?.[0]?.message?.content || "");

    if (!Array.isArray(parsed.sections) || parsed.sections.length !== expected.length) {
      throw new Error("Invalid phase structure.");
    }

    const sections = parsed.sections.map((section, index) => ({
      label: expected[index],
      text: clean(section?.text, 6500)
    }));

    if (sections.some(s => !s.text)) throw new Error("Empty phase.");

    return Response.json({
      title: clean(parsed.title, 150) || data.event,
      subtitle: clean(parsed.subtitle, 320) || data.goal,
      sections,
      model: Netlify.env.get("OPENAI_MODEL") || "gpt-4o-mini"
    }, { headers: { "Cache-Control": "no-store" } });

  } catch (error) {
    console.error("PaceScene generation error:", error);
    return Response.json(
      { error: "We couldn't generate this rehearsal right now. Please try again." },
      { status: 500 }
    );
  }
};

export const config = { path: "/api/generate" };
