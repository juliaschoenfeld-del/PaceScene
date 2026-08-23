(() => {
  const originalStopSpeech = stopSpeech;
  const originalSpeakSequence = speakSequence;

  state.aiAudioCache = state.aiAudioCache || new Map();
  state.aiAudioEl = null;
  state.aiAudioMode = "ai";

  const voiceSelect = $("voiceSelect");
  const rate = $("rate");
  const rateText = $("rateText");

  function ensureDisclosure() {
    let note = $("voiceDisclosure");
    if (!note) {
      note = document.createElement("p");
      note.id = "voiceDisclosure";
      note.style.cssText = "margin:7px 0 0;font-size:9px;line-height:1.45;color:#7d8782;font-weight:650";
      voiceSelect.insertAdjacentElement("afterend", note);
    }
    return note;
  }

  function scoreLocalVoice(v) {
    const name = (v.name || "").toLowerCase();
    const lang = (v.lang || "").toLowerCase();
    let score = lang.startsWith("en") ? 20 : 0;
    ["samantha", "ava", "serena", "sonia", "aria", "jenny", "moira", "karen", "victoria", "female"].forEach((term, i) => {
      if (name.includes(term)) score += 30 - i;
    });
    return score;
  }

  function setupVoiceSelect() {
    const current = voiceSelect.value || "ai";
    const voices = ("speechSynthesis" in window ? speechSynthesis.getVoices() : [])
      .slice().sort((a, b) => scoreLocalVoice(b) - scoreLocalVoice(a));
    state.voices = voices;
    voiceSelect.innerHTML = '<option value="ai">PaceScene Soft · AI voice</option>';
    voices.slice(0, 18).forEach((voice, i) => {
      const option = document.createElement("option");
      option.value = String(i);
      option.textContent = `Device voice · ${voice.name}`;
      voiceSelect.appendChild(option);
    });
    voiceSelect.value = [...voiceSelect.options].some(o => o.value === current) ? current : "ai";
    ensureDisclosure().textContent = voiceSelect.value === "ai"
      ? "✦ AI-generated voice · soft, calm and designed for PaceScene"
      : "Device voice · quality depends on your browser";
  }

  setupVoiceSelect();
  if ("speechSynthesis" in window) speechSynthesis.onvoiceschanged = setupVoiceSelect;

  rate.min = "0.80";
  rate.max = "1.08";
  rate.step = "0.02";
  rate.value = "0.92";
  rateText.textContent = "0.92×";

  function splitForAI(text, max = 1700) {
    const cleaned = String(text || "").trim();
    if (!cleaned) return [];
    if (cleaned.length <= max) return [cleaned];
    const sentences = cleaned.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [cleaned];
    const chunks = [];
    let current = "";
    for (const sentence of sentences) {
      if ((current + sentence).length > max && current.trim()) {
        chunks.push(current.trim());
        current = sentence;
      } else current += sentence;
    }
    if (current.trim()) chunks.push(current.trim());
    return chunks;
  }

  function aiChunks() {
    return speechChunks().flatMap(chunk => splitForAI(chunk));
  }

  async function audioUrl(text) {
    const key = text;
    if (state.aiAudioCache.has(key)) return state.aiAudioCache.get(key);
    const response = await fetch("/api/voice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    });
    if (!response.ok) throw new Error("PaceScene Soft unavailable");
    const blob = await response.blob();
    if (!blob.size) throw new Error("Empty voice response");
    const url = URL.createObjectURL(blob);
    state.aiAudioCache.set(key, url);
    return url;
  }

  function setUI(active, paused = false) {
    state.speaking = active;
    state.paused = paused;
    $("playButton").textContent = active && !paused ? "■" : "▶";
    $("pauseButton").textContent = paused ? "Resume" : "Pause";
  }

  stopSpeech = function () {
    state.speechToken++;
    if (state.aiAudioEl) {
      state.aiAudioEl.pause();
      state.aiAudioEl.onended = null;
      state.aiAudioEl.onerror = null;
      state.aiAudioEl = null;
    }
    originalStopSpeech();
    setUI(false, false);
  };

  async function playAISequence() {
    if (!state.data) return;
    const chunks = aiChunks();
    const token = ++state.speechToken;
    let index = 0;
    state.aiAudioMode = "ai";
    setUI(true, false);
    ensureDisclosure().textContent = "✦ AI-generated voice · PaceScene Soft";

    const next = async () => {
      if (token !== state.speechToken) return;
      if (index >= chunks.length) {
        setUI(false, false);
        if (state.loop) setTimeout(() => token === state.speechToken && playAISequence(), 1200);
        return;
      }
      try {
        const url = await audioUrl(chunks[index++]);
        if (token !== state.speechToken) return;
        const audio = new Audio(url);
        state.aiAudioEl = audio;
        audio.playbackRate = Number(rate.value);
        audio.preservesPitch = true;
        audio.onended = () => token === state.speechToken && setTimeout(next, index === 1 ? 700 : 480);
        await audio.play();
      } catch (error) {
        console.warn("PaceScene Soft fallback:", error);
        if (token !== state.speechToken) return;
        stopSpeech();
        const local = [...voiceSelect.options].find(o => o.value !== "ai");
        if (local) voiceSelect.value = local.value;
        ensureDisclosure().textContent = "Using a calm device voice · PaceScene Soft temporarily unavailable";
        state.aiAudioMode = "local";
        originalSpeakSequence();
      }
    };
    await next();
  }

  function play() {
    if (!state.data) return;
    if (state.speaking && !state.paused) {
      stopSpeech();
      return;
    }
    if (state.paused) {
      if (state.aiAudioMode === "ai" && state.aiAudioEl) state.aiAudioEl.play();
      else if ("speechSynthesis" in window) speechSynthesis.resume();
      setUI(true, false);
      return;
    }
    if (voiceSelect.value === "ai") playAISequence();
    else {
      state.aiAudioMode = "local";
      originalSpeakSequence();
    }
  }

  function replaceButton(id) {
    const old = $(id);
    const fresh = old.cloneNode(true);
    old.replaceWith(fresh);
    return fresh;
  }

  const playButton = replaceButton("playButton");
  const restartButton = replaceButton("restartButton");
  const pauseButton = replaceButton("pauseButton");
  const heroPlay = replaceButton("heroPlay");

  playButton.addEventListener("click", play);
  restartButton.addEventListener("click", () => { stopSpeech(); setTimeout(play, 100); });
  pauseButton.addEventListener("click", () => {
    if (!state.speaking) return;
    if (state.paused) {
      if (state.aiAudioMode === "ai" && state.aiAudioEl) state.aiAudioEl.play();
      else if ("speechSynthesis" in window) speechSynthesis.resume();
      setUI(true, false);
    } else {
      if (state.aiAudioMode === "ai" && state.aiAudioEl) state.aiAudioEl.pause();
      else if ("speechSynthesis" in window) speechSynthesis.pause();
      setUI(true, true);
    }
  });

  voiceSelect.addEventListener("change", () => {
    stopSpeech();
    ensureDisclosure().textContent = voiceSelect.value === "ai"
      ? "✦ AI-generated voice · soft, calm and designed for PaceScene"
      : "Device voice · quality depends on your browser";
  });

  heroPlay.addEventListener("click", async () => {
    const sample = "The effort rises. You notice the urge to panic. One long exhale. Loose hands. Eyes forward. Next two hundred. You know this response.";
    stopSpeech();
    try {
      const url = await audioUrl(sample);
      const audio = new Audio(url);
      state.aiAudioEl = audio;
      state.aiAudioMode = "ai";
      audio.playbackRate = 0.94;
      await audio.play();
    } catch {
      if (!("speechSynthesis" in window)) return;
      const u = new SpeechSynthesisUtterance(sample);
      u.rate = 0.88;
      u.pitch = 0.96;
      const voice = state.voices[0] || null;
      if (voice) u.voice = voice;
      speechSynthesis.speak(u);
    }
  });
})();
