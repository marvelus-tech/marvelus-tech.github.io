import { bindMicrophone } from "./mic.js";

const partialEl = document.getElementById("partial");
const heardLive = document.getElementById("heard-live");
const transcriptEl = document.getElementById("transcript");
const meterEl = document.getElementById("mic-meter");
const statusEl = document.getElementById("mic-status");

bindMicrophone({
  button: document.getElementById("btn-mic"),
  label: document.getElementById("mic-label"),
  onPhase(notice) {
    statusEl.textContent = notice.message;
    const failed = ["denied", "no-device", "insecure", "token-missing", "token-error", "error"].includes(
      notice.phase,
    );
    if (notice.phase === "requesting-permission") {
      transcriptEl.replaceChildren();
      partialEl.textContent = "Waiting for speech.";
      heardLive.textContent = "";
      meterEl.style.width = "0%";
    }
    if (failed) partialEl.textContent = "";
  },
  onPartial(text) {
    partialEl.textContent = text || "Waiting for speech.";
  },
  onFinal(text) {
    partialEl.textContent = "Waiting for speech.";
    heardLive.textContent = text;
    const li = document.createElement("li");
    li.textContent = text;
    transcriptEl.appendChild(li);
    transcriptEl.scrollTop = transcriptEl.scrollHeight;
  },
  onLevel(rms) {
    const width = Math.max(0, Math.min(100, Math.round(rms * 280)));
    meterEl.style.width = `${width}%`;
  },
  onSnapshot() {
    /* Live topics UI lands with hosted session publish (Phase B). */
  },
});