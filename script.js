"use strict";

const envelope = document.querySelector(".envelope");
const hint = document.querySelector("#invitation-hint");
const status = document.querySelector("#invitation-status");
const envelopeScreen = document.querySelector("#envelope-screen");
const detailsScreen = document.querySelector("#details-screen");
const portrait = document.querySelector("#birthday-photo");
const music = document.querySelector("#birthday-music");
const musicControl = document.querySelector("#music-control");
const musicLabel = musicControl.querySelector(".music-label");
let currentScreen = "closed";
let screenTransition = 0;
let screenAnimations = [];
let musicStarted = false;

function updateMusicControl() {
  const isPlaying = !music.paused;
  musicControl.hidden = !musicStarted;
  musicControl.setAttribute("aria-label", isPlaying ? "Pause music" : "Play music");
  musicLabel.textContent = isPlaying ? "Pause music" : "Play music";
}

async function startMusic() {
  if (musicStarted) return;

  try {
    await music.play();
    musicStarted = true;
    updateMusicControl();
  } catch {
    // Playback can still be started later through the music control.
  }
}

// A missing local portrait leaves the styled placeholder visible.
portrait.addEventListener("load", () => {
  portrait.hidden = false;
  portrait.previousElementSibling.hidden = true;
  portrait.parentElement.removeAttribute("role");
  portrait.parentElement.removeAttribute("aria-label");
});
portrait.addEventListener("error", () => { portrait.hidden = true; });
portrait.src = portrait.dataset.src;

function setInvitationOpen(isOpen) {
  envelope.classList.toggle("is-open", isOpen);
  envelope.setAttribute("aria-expanded", String(isOpen));
  envelope.setAttribute("aria-label", isOpen ? "View birthday details" : "Open the invitation");
  if (isOpen) envelope.removeAttribute("aria-describedby");
  else envelope.setAttribute("aria-describedby", "invitation-hint");
  hint.hidden = isOpen;
  envelope.querySelector(".envelope-closed").setAttribute("aria-hidden", String(isOpen));
  envelope.querySelector(".envelope-open").setAttribute("aria-hidden", String(!isOpen));
  status.textContent = isOpen ? "Your invitation is open. Use your browser's Back button to return." : "Your invitation is closed.";
}

async function setScreen(screen, moveFocus = false) {
  currentScreen = screen;
  const transition = ++screenTransition;
  screenAnimations.forEach((animation) => animation.cancel());
  screenAnimations = [];
  const showDetails = screen === "details";
  const outgoing = detailsScreen.hidden ? envelopeScreen : detailsScreen;
  const incoming = showDetails ? detailsScreen : envelopeScreen;
  const animate = outgoing !== incoming && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (animate) {
    outgoing.inert = true;
    const fade = outgoing.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 140, fill: "forwards" });
    screenAnimations.push(fade);
    await fade.finished.catch(() => {});
    if (transition !== screenTransition) return;
  }

  envelopeScreen.hidden = showDetails;
  detailsScreen.hidden = !showDetails;
  envelopeScreen.inert = showDetails;
  detailsScreen.inert = !showDetails;
  setInvitationOpen(screen !== "closed");
  if (showDetails) status.textContent = "Birthday details. Use your browser's Back button to return to the open invitation.";
  screenAnimations.forEach((animation) => animation.cancel());
  screenAnimations = [];
  if (animate) {
    screenAnimations.push(incoming.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 240, easing: "ease-out" }));
  }
  if (moveFocus) {
    (showDetails ? document.querySelector("#details-title") : envelope).focus({ preventScroll: true });
  }
}

// Keep the initial closed state in this page's existing history entry.
history.replaceState({ ...history.state, invitationOpen: false, invitationScreen: "closed" }, "");
setScreen("closed");

window.addEventListener("popstate", (event) => {
  const screen = event.state?.invitationScreen;
  setScreen(["closed", "open", "details"].includes(screen) ? screen : event.state?.invitationOpen === true ? "open" : "closed", true);
});

envelope.addEventListener("click", () => {
  if (currentScreen === "details") return;

  startMusic();
  const nextScreen = currentScreen === "closed" ? "open" : "details";

  // After Back, pushState replaces the previous forward entry on reopening.
  history.pushState({ ...history.state, invitationOpen: true, invitationScreen: nextScreen }, "");
  setScreen(nextScreen, nextScreen === "details");

});


musicControl.addEventListener("click", async () => {
  if (music.paused) {
    try {
      await music.play();
      musicStarted = true;
    } catch {
      return;
    }
  } else {
    music.pause();
  }

  updateMusicControl();
});

music.addEventListener("play", updateMusicControl);
music.addEventListener("pause", updateMusicControl);
