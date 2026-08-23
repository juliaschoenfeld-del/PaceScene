(() => {
  const $ = (q, root = document) => root.querySelector(q);

  // Stronger Pace Scene cover treatment.
  const wordmark = $(".cover-wordmark");
  if (wordmark && !wordmark.querySelector("small")) {
    wordmark.insertAdjacentHTML("beforeend", "<small>MENTAL PERFORMANCE REHEARSAL</small>");
  }
  const previewKicker = $(".preview-kicker");
  if (previewKicker) previewKicker.textContent = "10K · CALM CONFIDENCE · 6 MIN";
  const previewTitle = $(".preview-card h3");
  if (previewTitle) previewTitle.textContent = "Meet the hard moment before race day.";

  const coverArt = $(".cover .cover-art");
  if (coverArt && !coverArt.querySelector(".cover-brand")) {
    coverArt.insertAdjacentHTML("beforeend", '<div class="cover-brand">Pace<br>Scene<small>MENTAL PERFORMANCE REHEARSAL</small></div>');
  }

  // Explain the neuroscience while the athlete enters information.
  const step1 = $('[data-step="1"]');
  if (step1 && !step1.querySelector(".science-deep")) {
    const lead = $(".lead", step1);
    lead?.insertAdjacentHTML("afterend", '<div class="neuro-inline science-deep"><span>◌</span><p><b>What your brain is rehearsing:</b> imagined and executed actions are not identical, but they recruit overlapping motor-planning networks. A scene that matches your real task, timing and sensations gives the rehearsal more useful structure.</p></div>');
  }

  const course = $("#course");
  if (course && !$("#sensoryDetails")) {
    course.closest(".field")?.insertAdjacentHTML("afterend", '<div class="field"><label for="sensoryDetails">What tiny details make this feel like <em>your</em> scene? <span>(optional)</span></label><textarea id="sensoryDetails" placeholder="The click of my watch, cold air in my nose, shoes tapping the road, hearing my breathing settle. Only include details you genuinely expect."></textarea><small>Small, true details make a rehearsal feel human without inventing a movie around you.</small></div>');
  }

  const step5 = $('[data-step="5"]');
  if (step5 && !step5.querySelector(".lavender-note")) {
    const lead = $(".lead", step5);
    lead?.insertAdjacentHTML("afterend", '<div class="neuro-inline lavender-note"><span>✦</span><p><b>Believable confidence beats forced positivity:</b> confidence is more durable when the scene can point to real preparation, familiar cues and actions you can repeat. Positive language should strengthen execution, not pretend nerves disappear or guarantee a result.</p></div>');
  }

  // Send the richer detail to the humanized v3.1 writer without replacing the rest of the app.
  const originalFetch = window.fetch.bind(window);
  window.fetch = (input, init = {}) => {
    const url = typeof input === "string" ? input : input?.url || "";
    if (url === "/api/generate") {
      try {
        const body = JSON.parse(init.body || "{}");
        const sensory = $("#sensoryDetails")?.value?.trim();
        if (sensory) body.sensoryDetails = sensory;
        init = { ...init, body: JSON.stringify(body) };
      } catch (_) {}
      input = "/api/generate-v31";
    }
    return originalFetch(input, init);
  };
})();
