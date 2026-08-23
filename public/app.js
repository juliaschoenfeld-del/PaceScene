const $ = id => document.getElementById(id);
const $$ = q => [...document.querySelectorAll(q)];

const state = {
  screen: "home",
  step: 1,
  context: "race",
  tone: "calm",
  data: null,
  sections: [],
  title: "",
  subtitle: "",
  editedText: "",
  speaking: false,
  paused: false,
  loop: false,
  speechToken: 0,
  voices: []
};

const contextCopy = {
  race: {
    builder: "Where are we going?",
    event: "Race / event",
    distance: "Distance",
    when: "When is it?",
    course: "What do you know about the environment?",
    goal: "If this goes really well, what are you doing?",
    target: "Outcome you care about",
    placeholders: {
      event: "City 10K",
      distance: "10 km",
      when: "Saturday morning",
      course: "Cool morning, crowded start, flat roads, small rise near 7 km.",
      target: "Sub-40, PB, podium…"
    }
  },
  session: {
    builder: "What session are we rehearsing?",
    event: "Key session",
    distance: "Session volume",
    when: "When is it?",
    course: "What do you know about the setting?",
    goal: "If this session is useful and well executed, what are you doing?",
    target: "Training output you care about",
    placeholders: {
      event: "6 × 1 km threshold session",
      distance: "10 km total / 6 reps",
      when: "Tuesday morning",
      course: "Track at the club, cool conditions, alone for the warm-up.",
      target: "Hold controlled threshold pace"
    }
  },
  block: {
    builder: "What block are we stepping into?",
    event: "Training block",
    distance: "Block length / volume",
    when: "When does it run?",
    course: "What context matters across these weeks?",
    goal: "If this block goes well, what are you repeatedly doing?",
    target: "End goal / marker you care about",
    placeholders: {
      event: "6-week 10K build",
      distance: "6 weeks",
      when: "September to mid-October",
      course: "Two quality sessions each week, long run Sunday, travel in week 3.",
      target: "Arrive ready to race 10K"
    }
  }
};

const phaseLabels = {
  race: ["GROUND", "ARRIVE", "START", "RHYTHM", "PRESSURE", "RESET", "COMMIT", "REMEMBER"],
  session: ["GROUND", "ARRIVE", "WARM UP", "MAIN WORK", "HARD PATCH", "RESET", "FINISH", "RECOVER"],
  block: ["GROUND", "BEGIN", "BUILD", "ORDINARY DAYS", "HARD WEEK", "ADAPT", "SHARPEN", "ARRIVE"]
};

function screen(name) {
  stopSpeech();
  state.screen = name;
  $$(".screen").forEach(el => el.classList.toggle("active", el.id === name));
  if (name === "builder") updateStep();
  if (name === "library") renderLibrary();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

$$("[data-screen]").forEach(btn => {
  btn.addEventListener("click", () => screen(btn.dataset.screen));
});

function setContext(value) {
  state.context = value;
  $$(".context-choice").forEach(btn => btn.classList.toggle("active", btn.dataset.context === value));
  const c = contextCopy[value];
  $("builderTitle").textContent = c.builder;
  $("eventLabel").textContent = c.event;
  $("distanceLabel").textContent = c.distance;
  $("whenLabel").textContent = c.when;
  $("courseLabel").textContent = c.course;
  $("goalLabel").textContent = c.goal;
  $("targetLabel").innerHTML = `${c.target} <span>(optional)</span>`;
  $("event").placeholder = c.placeholders.event;
  $("distance").placeholder = c.placeholders.distance;
  $("when").placeholder = c.placeholders.when;
  $("course").placeholder = c.placeholders.course;
  $("target").placeholder = c.placeholders.target;
}

$$(".context-choice").forEach(btn => btn.addEventListener("click", () => setContext(btn.dataset.context)));

function updateStep() {
  $$(".step").forEach(el => el.classList.toggle("active", Number(el.dataset.step) === state.step));
  $("stepCopy").textContent = `${state.step} / 5`;
  $("progressFill").style.width = `${state.step * 20}%`;
  $("backButton").style.visibility = state.step === 1 ? "hidden" : "visible";
  $("nextButton").textContent = state.step === 5 ? "Create my scene ✦" : "Continue →";
}

$("backButton").addEventListener("click", () => {
  if (state.step > 1) {
    state.step--;
    updateStep();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
});

$("nextButton").addEventListener("click", async () => {
  if (state.step < 5) {
    state.step++;
    updateStep();
    window.scrollTo({ top: 0, behavior: "smooth" });
  } else {
    await generate();
  }
});

$$(".choice").forEach(btn => btn.addEventListener("click", () => {
  $$(".choice").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  state.tone = btn.dataset.tone;
}));

$("beforeReady").addEventListener("input", () => $("beforeValue").textContent = $("beforeReady").value);
$("afterReady").addEventListener("input", () => $("afterValue").textContent = $("afterReady").value);
$("rate").addEventListener("input", () => $("rateText").textContent = `${Number($("rate").value).toFixed(2)}×`);

const val = (id, fallback = "") => (($(`${id}`)?.value) || fallback).trim();

function collect() {
  const cue = val("cue", "Long exhale. Relax. Next useful action.");
  const anchor = val("anchor", "soft shoulders and purposeful rhythm");
  const pressure = val("pressure", "tension rises and breathing feels more urgent");
  const thoughtTrap = val("thoughtTrap", "this is going wrong");
  const ifThen = val(
    "ifThen",
    `If I notice ${thoughtTrap.toLowerCase()} and ${pressure.toLowerCase()}, then I use "${cue}" and return to ${anchor}.`
  );

  return {
    context: state.context,
    name: val("name"),
    sport: val("sport", "Running"),
    event: val("event", state.context === "race" ? "your race" : state.context === "session" ? "your key session" : "your training block"),
    distance: val("distance"),
    when: val("when"),
    course: val("course"),
    goal: val("goal", "execute with patience, judgment and commitment"),
    target: val("target"),
    pace: val("pace"),
    decisive: val("decisive", "the point where staying with the process matters most"),
    identityCue: val("identityCue", "calm, committed and responsive"),
    fear: val("fear", "the effort becomes difficult and doubt appears"),
    pressure,
    thoughtTrap,
    cue,
    anchor,
    ifThen,
    evidence: val("evidence", "training has shown that I can settle, adapt and keep making useful decisions"),
    tone: state.tone,
    length: val("length", "full"),
    perspective: val("perspective", "you"),
    lockedFacts: val("lockedFacts"),
    beforeReady: Number($("beforeReady").value)
  };
}

function fallbackSections(d) {
  const labels = phaseLabels[d.context];
  const person = d.perspective === "i" ? "I" : "You";
  const poss = d.perspective === "i" ? "my" : "your";
  const sections = [];
  const push = (label, text) => sections.push({ label, text });

  push(labels[0], `${person} let the day become quiet for a moment. One easy breath in. A longer breath out. ${person} notice ${poss} body without asking it to feel perfect. The aim is simply to arrive.`);
  push(labels[1], `${person} enter ${d.event}. ${d.course ? d.course + " " : ""}${person} do not need certainty. ${person} only need the next useful action. ${d.goal}.`);
  if (d.context === "race") {
    push(labels[2], `${person} begin with patience. ${d.pace ? `The cue ${d.pace} sits lightly in the background. ` : ""}${person} let other people have their urgency. ${person} choose ${poss} rhythm.`);
    push(labels[3], `${person} settle into the work. Attention gets simple: posture, rhythm, breath, the piece of the course in front of ${d.perspective === "i" ? "me" : "you"}. Confidence comes from decisions that can be repeated.`);
  } else if (d.context === "session") {
    push(labels[2], `${person} warm up without demanding proof of fitness. ${person} notice, adjust, and let the body come online in its own time.`);
    push(labels[3], `${person} enter the main work with a useful target, not a verdict. ${d.pace ? `${d.pace}. ` : ""}${person} make each repetition or segment its own task.`);
  } else {
    push(labels[2], `${person} build through repeated ordinary choices. Some sessions feel fluent. Others feel average. The block is allowed to contain both.`);
    push(labels[3], `${person} rehearse the unglamorous days too: showing up, recovering, adjusting, sleeping, and returning without needing every session to prove progress.`);
  }
  push(labels[4], `Then the scene gets noisy. ${d.fear}. ${d.pressure}. The thought appears: “${d.thoughtTrap}.” ${person} do not make it a prophecy. ${person} notice the signal.`);
  push(labels[5], `${d.ifThen} ${person} use ${poss} cue: “${d.cue}” ${d.anchor}. The response is small enough to repeat under pressure. If anything feels unsafe or medically concerning, adjust or stop rather than override it.`);
  push(labels[6], `${person} return to the performance. ${d.decisive}. ${d.target ? `The outcome ${d.target} can matter without taking over attention. ` : ""}${person} keep choosing what is controllable.`);
  push(labels[7], `${d.evidence}. That is where belief comes from. ${person} rehearse being ${d.identityCue}. This scene is not a guarantee. It is a response pattern that can become more familiar through practice.`);

  return sections;
}

async function generate() {
  state.data = collect();
  state.editedText = "";
  $("generationOverlay").classList.add("active");
  $("nextButton").disabled = true;

  try {
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(state.data)
    });

    if (!response.ok) throw new Error("AI generation unavailable");
    const result = await response.json();
    state.sections = result.sections;
    state.title = result.title || state.data.event;
    state.subtitle = result.subtitle || state.data.goal;
  } catch (error) {
    console.warn("PaceScene used its local fallback:", error);
    state.sections = fallbackSections(state.data);
    state.title = state.data.event;
    state.subtitle = state.data.goal;
  } finally {
    $("generationOverlay").classList.remove("active");
    $("nextButton").disabled = false;
  }

  renderSession();
  screen("session");
}

function renderSession() {
  const d = state.data;
  const type = d.context === "race" ? "RACE / EVENT" : d.context === "session" ? "KEY SESSION" : "TRAINING BLOCK";
  $("typeTag").textContent = `${type} · REHEARSAL`;
  $("sessionSport").textContent = `${d.sport.toUpperCase()}${d.distance ? ` · ${d.distance.toUpperCase()}` : ""}`;
  $("sessionName").textContent = state.title || d.event;
  $("sessionGoal").textContent = state.subtitle || d.goal;
  $("coverTitle").textContent = d.event;
  $("coverMeta").textContent = `${d.length === "primer" ? "2–3" : d.length === "deep" ? "8–10" : "5–6"} minute scene · ${state.tone === "charged" ? "quiet fire" : state.tone}`;
  $("cueDisplay").textContent = d.cue;
  $("ifThenDisplay").textContent = d.ifThen;
  $("identityDisplay").textContent = d.identityCue;
  $("afterReady").value = d.beforeReady;
  $("afterValue").textContent = d.beforeReady;
  renderStory();
}

function renderStory() {
  const el = $("story");
  el.innerHTML = "";
  if (state.editedText) {
    el.textContent = state.editedText;
    $("phaseNav").innerHTML = "";
    return;
  }
  state.sections.forEach((section, i) => {
    const h = document.createElement("div");
    h.className = "phase-heading";
    h.id = `phase-${i}`;
    h.textContent = section.label;
    const p = document.createElement("div");
    p.textContent = section.text;
    el.append(h, p);
  });
  $("phaseNav").innerHTML = state.sections.map((s, i) => `<button data-jump="${i}">${escapeHtml(s.label)}</button>`).join("");
  $$("[data-jump]").forEach(btn => btn.addEventListener("click", () => {
    document.getElementById(`phase-${btn.dataset.jump}`).scrollIntoView({ behavior: "smooth", block: "start" });
  }));
}

function narration() {
  if (state.editedText) return state.editedText;
  return state.sections.map(s => `${s.label}. ${s.text}`).join("\n\n");
}

$("editButton").addEventListener("click", () => {
  const wrap = $("storyEditorWrap");
  const opening = wrap.classList.contains("hidden");
  wrap.classList.toggle("hidden", !opening);
  $("story").style.display = opening ? "none" : "block";
  $("phaseNav").style.display = opening ? "none" : "flex";
  $("editButton").textContent = opening ? "Cancel edit" : "Edit script";
  if (opening) $("storyEditor").value = narration();
});

$("applyEdits").addEventListener("click", () => {
  state.editedText = $("storyEditor").value.trim();
  $("storyEditorWrap").classList.add("hidden");
  $("story").style.display = "block";
  $("phaseNav").style.display = "flex";
  $("editButton").textContent = "Edit script";
  renderStory();
});

function scoreVoice(v) {
  const name = (v.name || "").toLowerCase();
  const lang = (v.lang || "").toLowerCase();
  let score = 0;
  if (lang.startsWith("en")) score += 20;
  if (v.localService) score += 8;
  ["samantha","ava","serena","sonia","aria","jenny","moira","karen","victoria","google uk english female","microsoft"].forEach((term, i) => {
    if (name.includes(term)) score += 30 - i;
  });
  ["compact","robot","novelty"].forEach(term => { if (name.includes(term)) score -= 25; });
  return score;
}

function loadVoices() {
  if (!("speechSynthesis" in window)) return;
  const voices = speechSynthesis.getVoices().slice().sort((a, b) => scoreVoice(b) - scoreVoice(a));
  state.voices = voices;
  const select = $("voiceSelect");
  select.innerHTML = "";
  if (!voices.length) {
    select.innerHTML = "<option>Calm guide · system default</option>";
    return;
  }
  voices.slice(0, 18).forEach((voice, i) => {
    const option = document.createElement("option");
    option.value = String(i);
    option.textContent = `${i === 0 ? "Calm guide · " : ""}${voice.name}`;
    select.appendChild(option);
  });
}
if ("speechSynthesis" in window) {
  loadVoices();
  speechSynthesis.onvoiceschanged = loadVoices;
}

function selectedVoice() {
  const index = Number($("voiceSelect").value || 0);
  return state.voices[index] || state.voices[0] || null;
}

function splitEdited(text) {
  const paras = text.split(/\n{2,}/).map(s => s.trim()).filter(Boolean);
  const chunks = [];
  paras.forEach(p => {
    if (p.length <= 900) chunks.push(p);
    else {
      const sentences = p.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [p];
      let current = "";
      sentences.forEach(s => {
        if ((current + s).length > 850 && current) {
          chunks.push(current.trim());
          current = s;
        } else current += s;
      });
      if (current.trim()) chunks.push(current.trim());
    }
  });
  return chunks;
}

function speechChunks() {
  const d = state.data;
  const intro = d.perspective === "i"
    ? "I get comfortable. I let my eyes soften or close if that feels good. One easy breath in. A longer breath out. I do not need to force calm. I am simply arriving."
    : "Get comfortable. Let your eyes soften or close if that feels good. One easy breath in. A longer breath out. You do not need to force calm. You are simply arriving.";
  if (state.editedText) return [intro, ...splitEdited(state.editedText)];
  return [intro, ...state.sections.map(s => `${s.label}. ${s.text}`)];
}

function stopSpeech() {
  state.speechToken++;
  if ("speechSynthesis" in window) speechSynthesis.cancel();
  state.speaking = false;
  state.paused = false;
  if ($("playButton")) $("playButton").textContent = "▶";
  if ($("pauseButton")) $("pauseButton").textContent = "Pause";
}

function speakSequence() {
  if (!("speechSynthesis" in window)) {
    alert("Text-to-speech is not supported in this browser.");
    return;
  }
  if (!state.data) return;
  if (state.speaking && !state.paused) {
    stopSpeech();
    return;
  }
  if (state.paused) {
    speechSynthesis.resume();
    state.paused = false;
    $("pauseButton").textContent = "Pause";
    return;
  }

  const chunks = speechChunks();
  const token = ++state.speechToken;
  let index = 0;
  state.speaking = true;
  $("playButton").textContent = "■";

  const next = () => {
    if (token !== state.speechToken) return;
    if (index >= chunks.length) {
      state.speaking = false;
      $("playButton").textContent = "▶";
      if (state.loop) setTimeout(() => {
        if (token === state.speechToken) {
          state.speaking = false;
          speakSequence();
        }
      }, 1200);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(chunks[index++]);
    utterance.rate = Number($("rate").value);
    utterance.pitch = 0.96;
    utterance.volume = 0.95;
    const voice = selectedVoice();
    if (voice) utterance.voice = voice;
    utterance.onend = () => {
      if (token !== state.speechToken) return;
      setTimeout(next, index === 1 ? 900 : 650);
    };
    utterance.onerror = () => {
      if (token !== state.speechToken) return;
      setTimeout(next, 250);
    };
    speechSynthesis.speak(utterance);
  };
  next();
}

$("playButton").addEventListener("click", speakSequence);
$("restartButton").addEventListener("click", () => { stopSpeech(); setTimeout(speakSequence, 100); });
$("pauseButton").addEventListener("click", () => {
  if (!state.speaking) return;
  if (state.paused) {
    speechSynthesis.resume();
    state.paused = false;
    $("pauseButton").textContent = "Pause";
  } else {
    speechSynthesis.pause();
    state.paused = true;
    $("pauseButton").textContent = "Resume";
  }
});
$("loopButton").addEventListener("click", () => {
  state.loop = !state.loop;
  $("loopButton").textContent = `Loop: ${state.loop ? "on" : "off"}`;
});

$("heroPlay").addEventListener("click", () => {
  if (!("speechSynthesis" in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance("The effort rises. You notice the urge to panic. One long exhale. Loose hands. Eyes forward. Next two hundred. You know this response.");
  u.rate = 0.80;
  u.pitch = 0.96;
  const voice = selectedVoice();
  if (voice) u.voice = voice;
  speechSynthesis.speak(u);
});

const storageKey = "pacescene_sessions_v3";
const oldStorageKey = "pacescene_sessions";
function loadSessions() {
  try {
    const newer = JSON.parse(localStorage.getItem(storageKey) || "[]");
    if (newer.length) return newer;
    return JSON.parse(localStorage.getItem(oldStorageKey) || "[]");
  } catch { return []; }
}
function saveSessions(sessions) {
  localStorage.setItem(storageKey, JSON.stringify(sessions));
}

$("saveButton").addEventListener("click", () => {
  const sessions = loadSessions();
  sessions.unshift({
    id: Date.now(),
    created: new Date().toISOString(),
    data: state.data,
    sections: state.sections,
    editedText: state.editedText,
    title: state.title,
    subtitle: state.subtitle,
    readiness: []
  });
  saveSessions(sessions.slice(0, 50));
  $("saveButton").textContent = "Saved ♡";
});

$("logButton").addEventListener("click", () => {
  let sessions = loadSessions();
  let found = sessions.find(x => x.data?.event === state.data.event);
  if (!found) {
    $("saveButton").click();
    sessions = loadSessions();
    found = sessions[0];
  }
  found.readiness = found.readiness || [];
  found.readiness.push({ before: state.data.beforeReady, after: Number($("afterReady").value) });
  saveSessions(sessions);
  $("logButton").textContent = "Logged ✓";
});

$("shareButton").addEventListener("click", async () => {
  const text = `${state.data.event}\n\n${narration()}`;
  try {
    if (navigator.share) await navigator.share({ title: state.data.event, text });
    else {
      await navigator.clipboard.writeText(text);
      $("shareButton").textContent = "Copied ✓";
    }
  } catch {}
});

$("alternateButton").addEventListener("click", generate);

function escapeHtml(s = "") {
  return String(s).replace(/[&<>"']/g, m => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[m]));
}

function renderLibrary() {
  const sessions = loadSessions();
  const logs = sessions.flatMap(x => x.readiness || []);
  const lift = logs.length ? (logs.reduce((n, x) => n + x.after - x.before, 0) / logs.length).toFixed(1) : "—";
  $("libraryStats").innerHTML = `
    <div class="stat"><b>${sessions.length}</b><span>saved scenes</span></div>
    <div class="stat"><b>${sessions.filter(x => x.data?.context === "race").length}</b><span>race reps</span></div>
    <div class="stat"><b>${sessions.filter(x => x.data?.context !== "race").length}</b><span>training reps</span></div>
    <div class="stat"><b>${lift === "—" ? "—" : `${Number(lift) > 0 ? "+" : ""}${lift}`}</b><span>readiness change</span></div>`;
  renderSessionList();
}

function renderSessionList() {
  const filter = $("contextFilter").value;
  const sessions = loadSessions().filter(x => filter === "all" || x.data?.context === filter);
  $("sessionList").innerHTML = sessions.length ? sessions.map(x => `
    <div class="saved-session">
      <div>
        <small>${escapeHtml((x.data?.context || "scene").toUpperCase())} · ${escapeHtml(x.data?.sport || "")}</small>
        <h3>${escapeHtml(x.title || x.data?.event || "Saved scene")}</h3>
        <p>${new Date(x.created).toLocaleDateString()} · ${escapeHtml(x.data?.identityCue || x.data?.goal || "")}</p>
      </div>
      <div class="saved-buttons">
        <button class="button soft" data-open="${x.id}">Open</button>
        <button class="button ghost" data-delete="${x.id}">Delete</button>
      </div>
    </div>`).join("") : `<div class="empty">No saved scenes yet. Your future-self library starts here ✦</div>`;

  $$("[data-open]").forEach(btn => btn.addEventListener("click", () => {
    const x = loadSessions().find(y => String(y.id) === String(btn.dataset.open));
    if (!x) return;
    state.data = x.data;
    state.sections = x.sections || [];
    state.editedText = x.editedText || "";
    state.title = x.title || x.data.event;
    state.subtitle = x.subtitle || x.data.goal;
    state.context = x.data.context || "race";
    renderSession();
    screen("session");
  }));

  $$("[data-delete]").forEach(btn => btn.addEventListener("click", () => {
    saveSessions(loadSessions().filter(x => String(x.id) !== String(btn.dataset.delete)));
    renderLibrary();
  }));
}

$("contextFilter").addEventListener("change", renderSessionList);

$("demoButton").addEventListener("click", async () => {
  setContext("race");
  $("name").value = "Maya";
  $("sport").value = "Running";
  $("event").value = "City 10K";
  $("distance").value = "10 km";
  $("when").value = "Saturday morning";
  $("course").value = "Cool air, a crowded start, flat roads and a small rise near 7 km.";
  $("goal").value = "Stay patient for the first 3 km, settle into efficient rhythm, then race the final 2 km with courage.";
  $("target").value = "break 40 minutes";
  $("pace").value = "around 4:00 per kilometre";
  $("decisive").value = "At 8 km I stop protecting the result and start racing the people ahead.";
  $("identityCue").value = "patient early, brave late, calm when it gets noisy";
  $("fear").value = "I feel heavy halfway, the pace slips, and I decide the goal is gone.";
  $("pressure").value = "My shoulders tighten, hands tense and breathing starts to feel urgent.";
  $("thoughtTrap").value = "This is too hard. You’ve blown it.";
  $("cue").value = "Long exhale. Tall posture. Next 200.";
  $("anchor").value = "Loose hands, tall chest, quick light feet.";
  $("ifThen").value = "If I notice myself staring at the watch and spiralling, then I take one long exhale, loosen my hands and focus only on the next 200 metres.";
  $("evidence").value = "I have finished hard reps after rough starts, and my rhythm improves when I stop forcing reassurance.";
  $("lockedFacts").value = "Do not promise sub-40. Do not invent a coach or family member at the finish.";
  state.tone = "resilient";
  $$(".choice").forEach(b => b.classList.toggle("active", b.dataset.tone === "resilient"));
  state.step = 5;
  updateStep();
  await generate();
});

window.addEventListener("beforeunload", stopSpeech);
setContext("race");
updateStep();
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("/service-worker.js").catch(() => {}));
}
