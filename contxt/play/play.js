const FEED_TYPES = new Set([
  "topic-grouped",
  "page-created",
  "page-updated",
  "claim-not-checkable",
  "duplicate-merged",
]);

const audio = document.getElementById("audio");
const feedEl = document.getElementById("feed");
const topicsEl = document.getElementById("topics");
const metaStrip = document.getElementById("meta-strip");

const [timeline, pages, meta] = await Promise.all([
  fetch("timeline.json").then((r) => r.json()),
  fetch("pages.json").then((r) => r.json()),
  fetch("meta.json").then((r) => r.json()),
]);

const pageTitleById = new Map(pages.map((p) => [p.id, p.title]));

metaStrip.textContent = `${meta.pagesCreated} pages · ${meta.uniqueClaims} unique claims · research: ${meta.researcher} (${meta.researchRequests} Tavily calls)`;

const feedEvents = timeline.filter((e) => FEED_TYPES.has(e.type));
const feedNodes = feedEvents.map((event) => {
  const li = document.createElement("li");
  li.dataset.mediaMs = String(event.mediaMs ?? 0);
  const t = ((event.mediaMs ?? 0) / 1000).toFixed(1);
  li.innerHTML = `<time>${t}s</time><span class="stage">${event.stage}</span> ${escapeHtml(event.detail)}`;
  feedEl.appendChild(li);
  return li;
});

const topicCards = new Map();

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function ensureTopicCard(pageId, title, mediaMs) {
  if (topicCards.has(pageId)) return;
  const card = document.createElement("article");
  card.className = "topic-card";
  card.dataset.mediaMs = String(mediaMs);
  card.innerHTML = `<h3>${escapeHtml(title)}</h3><a href="deck.html#${escapeHtml(pageId)}">Read topic page</a>`;
  topicsEl.appendChild(card);
  topicCards.set(pageId, card);
}

let lastHot = null;

function syncToMedia(ms) {
  for (const li of feedNodes) {
    const at = Number(li.dataset.mediaMs);
    if (at <= ms) li.classList.add("visible");
    else li.classList.remove("visible", "hot");
  }
  let hottest = null;
  for (const li of feedNodes) {
    if (!li.classList.contains("visible")) continue;
    const at = Number(li.dataset.mediaMs);
    if (at <= ms && (!hottest || at >= Number(hottest.dataset.mediaMs))) hottest = li;
  }
  if (lastHot && lastHot !== hottest) lastHot.classList.remove("hot");
  if (hottest) {
    hottest.classList.add("hot");
    lastHot = hottest;
  }

  for (const event of feedEvents) {
    if (event.type !== "page-created") continue;
    const at = event.mediaMs ?? 0;
    if (at > ms) continue;
    const pageId = event.refId ?? "";
    const title = pageTitleById.get(pageId) ?? event.detail.replace(/^Created /, "");
    ensureTopicCard(pageId, title, at);
  }

  for (const card of topicCards.values()) {
    const at = Number(card.dataset.mediaMs);
    if (at <= ms) card.classList.add("visible");
    else card.classList.remove("visible");
  }
}

function tick() {
  syncToMedia(audio.currentTime * 1000);
}

audio.addEventListener("timeupdate", tick);
audio.addEventListener("seeked", tick);
document.addEventListener("keydown", (e) => {
  if (e.code === "Space" && e.target === document.body) {
    e.preventDefault();
    if (audio.paused) audio.play();
    else audio.pause();
  }
});

tick();