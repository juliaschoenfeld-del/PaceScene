(() => {
  const $ = (q, root = document) => root.querySelector(q);

  // Final PaceScene v4 polish for the transitional homepage wrapper.
  const wordmark = $(".cover-wordmark");
  if (wordmark && !wordmark.querySelector("small")) {
    wordmark.insertAdjacentHTML("beforeend", "<small>MENTAL PERFORMANCE REHEARSAL</small>");
  }

  const coverArt = $(".cover .cover-art");
  if (coverArt && !coverArt.querySelector(".cover-brand")) {
    coverArt.insertAdjacentHTML("beforeend", '<div class="cover-brand">Pace<br>Scene<small>MENTAL PERFORMANCE REHEARSAL</small></div>');
  }

  // Older client builds did not collect the sensoryDetails field. Patch the
  // outgoing v4 request only; keep /api/generate as the single production route.
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
    }
    return originalFetch(input, init);
  };

  // Make the demo feel inhabited without adding invented external facts.
  document.addEventListener("click", event => {
    if (event.target?.id === "demoButton") {
      const sensory = $("#sensoryDetails");
      if (sensory && !sensory.value) {
        sensory.value = "The soft click of the watch, the sound of shoes on the road, and the moment breathing settles into rhythm.";
      }
    }
  }, true);
})();
