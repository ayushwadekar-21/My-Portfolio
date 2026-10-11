/* AYUSHVERSE CINEMATIC INTRO CONTROLLER — retained for compatibility. */
document.addEventListener("DOMContentLoaded", () => {
  const introScreen = document.getElementById("intro-screen");
  if (!introScreen) return;
  try {
    if (sessionStorage.getItem("ayushverse-intro-seen") === "1" ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      introScreen.remove();
      return;
    }
  } catch (_) {}
  document.body.style.overflow = "hidden";
  const finish = () => {
    try { sessionStorage.setItem("ayushverse-intro-seen", "1"); } catch (_) {}
    introScreen.remove();
    document.body.style.overflow = "";
  };
  introScreen.querySelector(".av-skip-intro")?.addEventListener("click", finish);
  introScreen.addEventListener("animationend", (event) => {
    if (event.animationName === "intro-exit") finish();
  });
  window.setTimeout(() => { if (introScreen.isConnected) finish(); }, 4800);
});
