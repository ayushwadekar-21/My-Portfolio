
/* AYUSHVERSE INTRO CONTROLLER */

document.addEventListener("DOMContentLoaded", () => {
  const introScreen = document.getElementById("intro-screen");

  if (!introScreen) return;

  document.body.style.overflow = "hidden";

  introScreen.addEventListener("animationend", (event) => {
    if (event.animationName === "intro-exit") {
      introScreen.remove();
      document.body.style.overflow = "";
    }
  });
});
