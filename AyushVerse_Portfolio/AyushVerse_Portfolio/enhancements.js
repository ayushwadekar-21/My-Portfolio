/* AYUSHVERSE — shared, dependency-free interactions */
(() => {
  const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => Array.from(root.querySelectorAll(s));
  const safeSession = {
    get(key) { try { return sessionStorage.getItem(key); } catch (_) { return null; } },
    set(key, value) { try { sessionStorage.setItem(key, value); } catch (_) {} }
  };


  // Repair escaped newline artifacts if an older/generated fragment injects them into the page.
  // This intentionally targets text nodes only; it never edits script or style source.
  const cleanEscapedNewlines = () => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
      if (node.parentElement && !node.parentElement.closest("script, style, textarea, pre, code")) {
        if (node.nodeValue.includes("\\\\n")) node.nodeValue = node.nodeValue.replace(/\\\\n/g, " ");
      }
    });
  };
  cleanEscapedNewlines();
  const escapedNewlineObserver = new MutationObserver(cleanEscapedNewlines);
  escapedNewlineObserver.observe(document.body, { childList: true, subtree: true, characterData: true });

  const intro = $("#intro-screen");
  if (intro) {
    const alreadySeen = safeSession.get("ayushverse-intro-seen") === "1";
    if (alreadySeen || reduced) {
      intro.remove();
    } else {
      const skip = document.createElement("button");
      skip.type = "button";
      skip.className = "av-skip-intro";
      skip.textContent = "Skip intro ↗";
      skip.setAttribute("aria-label", "Skip AyushVerse opening animation");
      intro.append(skip);
      const finish = () => {
        safeSession.set("ayushverse-intro-seen", "1");
        intro.remove();
        document.body.style.overflow = "";
      };
      document.body.style.overflow = "hidden";
      skip.addEventListener("click", finish);
      intro.addEventListener("animationend", event => {
        if (event.animationName === "intro-exit") finish();
      });
      window.setTimeout(() => { if (intro.isConnected) finish(); }, 4800);
    }
  }

  const progress = document.createElement("div");
  progress.className = "av-progress";
  progress.setAttribute("aria-hidden", "true");
  document.body.append(progress);
  const top = document.createElement("button");
  top.className = "av-top";
  top.type = "button";
  top.textContent = "↑";
  top.setAttribute("aria-label", "Back to top");
  top.title = "Back to top";
  document.body.append(top);
  top.addEventListener("click", () => window.scrollTo({top:0, behavior:reduced ? "auto" : "smooth"}));

  const updateScroll = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.width = (max > 0 ? Math.min(100, Math.max(0, window.scrollY / max * 100)) : 0) + "%";
    top.classList.toggle("visible", window.scrollY > 480);
  };
  window.addEventListener("scroll", updateScroll, {passive:true});
  window.addEventListener("resize", updateScroll);
  updateScroll();

  if (window.matchMedia && window.matchMedia("(hover:hover) and (pointer:fine)").matches) {
    const glow = document.createElement("div");
    glow.className = "av-spotlight";
    glow.setAttribute("aria-hidden", "true");
    document.body.prepend(glow);
    window.addEventListener("pointermove", event => {
      glow.style.setProperty("--av-x", event.clientX + "px");
      glow.style.setProperty("--av-y", event.clientY + "px");
    }, {passive:true});
  }

  const revealTargets = $$(".reveal, .section, .feature, .value, .step");
  if ("IntersectionObserver" in window && !reduced) {
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          revealObserver.unobserve(entry.target);
        }
      });
    }, {threshold:.12});
    revealTargets.forEach(el => {
      if (!el.classList.contains("reveal")) el.classList.add("av-reveal");
      revealObserver.observe(el);
    });
  }

  // Make journey stages keyboard-accessible and reveal grounded supporting text.
  const journeyDetails = [
    "Build foundations in coding, design, science, writing, and problem-solving.",
    "Create websites, apps, AI experiments, and creative work while learning from each attempt.",
    "Work toward a future in science and robotics, using technology to explore ideas and solve real problems."
  ];
  const steps = $$(".journey .step");
  if (steps.length) {
    const detail = document.createElement("div");
    detail.className = "av-journey-detail";
    detail.hidden = true;
    detail.setAttribute("aria-live", "polite");
    $(".journey").after(detail);
    steps.forEach((step, index) => {
      step.tabIndex = 0;
      step.setAttribute("role", "button");
      step.setAttribute("aria-expanded", "false");
      step.setAttribute("aria-label", ( $("h3",step)?.textContent || "Journey stage") + " — show details");
      const activate = () => {
        const wasOpen = step.getAttribute("aria-expanded") === "true";
        steps.forEach(item => item.setAttribute("aria-expanded", "false"));
        if (wasOpen) { detail.hidden = true; return; }
        step.setAttribute("aria-expanded", "true");
        detail.textContent = journeyDetails[index] || "";
        detail.hidden = false;
      };
      step.addEventListener("click", activate);
      step.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") { event.preventDefault(); activate(); }
      });
    });
  }

  // Copy-to-clipboard button next to the existing contact email, without changing its destination.
  const emailLink = $('a[href^="mailto:"]');
  if (emailLink) {
    const email = emailLink.getAttribute("href").slice(7).split("?")[0];
    if (email && email.includes("@")) {
      const button = document.createElement("button");
      button.className = "av-copy";
      button.type = "button";
      button.textContent = "Copy email";
      const status = document.createElement("div");
      status.className = "av-copy-status";
      status.setAttribute("aria-live", "polite");
      emailLink.parentElement.append(button, status);
      button.addEventListener("click", async () => {
        try {
          if (!navigator.clipboard || !navigator.clipboard.writeText) throw new Error("Clipboard unavailable");
          await navigator.clipboard.writeText(email);
          button.textContent = "Copied ✓";
          status.textContent = "Email address copied.";
        } catch (_) {
          status.textContent = "Copy is unavailable here. Select the email address and copy it manually.";
        }
        window.setTimeout(() => { button.textContent = "Copy email"; }, 1800);
      });
    }
  }

  // Page transitions are only applied to same-origin HTML links and never to new tabs or anchors.
  document.addEventListener("click", event => {
    const link = event.target.closest("a[href]");
    if (!link || reduced || event.defaultPrevented || event.button !== 0 ||
        event.metaKey || event.ctrlKey || event.shiftKey || event.altKey ||
        link.target === "_blank" || link.hasAttribute("download")) return;
    let target;
    try { target = new URL(link.href, location.href); } catch (_) { return; }
    if (target.origin !== location.origin || target.pathname === location.pathname && target.hash) return;
    if (!/\.html?$/i.test(target.pathname) && target.pathname !== location.pathname) return;
    event.preventDefault();
    document.body.classList.add("av-page-leave");
    window.setTimeout(() => { location.href = target.href; }, 160);
  });

  // Command palette: Ctrl/Cmd+K. All destinations are existing local pages/sections.
  const commands = [
    ["Home","Homepage and hero","index.html","⌂"],
    ["About Ayush","Who I am and what drives me","index.html#about","A"],
    ["The Student","Learning, curiosity, and growth","student.html","01"],
    ["The Developer","Coding and digital experiences","developer.html","</>"],
    ["The Creative Mind","Storytelling, drawing, and design","creative.html","✦"],
    ["The Future Scientist","Science, AI, and robotics","scientist.html","⚛"],
    ["The Young Innovator","Experiments and purposeful ideas","innovator.html","∞"],
    ["My Journey","Explore the next stages","index.html#journey","↗"],
    ["Contact","Get in touch with Ayush","index.html#contact","✉"],
    ["Secret terminal","Open the AyushVerse terminal","__terminal__","$"]
  ];
  const overlay = document.createElement("div");
  overlay.className = "av-overlay";
  overlay.innerHTML = '<section class="av-dialog" role="dialog" aria-modal="true" aria-label="Quick navigation"><div class="av-dialog-head"><strong>Explore AyushVerse</strong><kbd>ESC</kbd><button class="av-dialog-close" type="button" aria-label="Close navigation">×</button></div><input class="av-search" type="search" placeholder="Search pages and sections…" autocomplete="off" aria-label="Search AyushVerse"><div class="av-command-list"></div></section>';
  document.body.append(overlay);
  const search = $(".av-search", overlay), list = $(".av-command-list", overlay);
  let lastFocus = null;
  const closePalette = () => { overlay.classList.remove("open"); if (lastFocus) lastFocus.focus(); };
  const openPalette = () => {
    lastFocus = document.activeElement;
    overlay.classList.add("open"); search.value = ""; renderCommands(""); search.focus();
  };
  const renderCommands = query => {
    const filtered = commands.filter(item => item.slice(0,3).join(" ").toLowerCase().includes(query.toLowerCase()));
    list.replaceChildren();
    if (!filtered.length) { const empty=document.createElement("div"); empty.className="av-empty"; empty.textContent="No matching pages. Try another search."; list.append(empty); return; }
    filtered.forEach(item => {
      const button=document.createElement("button"); button.type="button"; button.className="av-command";
      const icon=document.createElement("span"); icon.className="av-command-icon"; icon.textContent=item[3];
      const textWrap=document.createElement("span"); textWrap.textContent=item[0];
      const small=document.createElement("small"); small.textContent=item[1]; textWrap.append(small);
      button.append(icon,textWrap); button.addEventListener("click",()=>{closePalette(); if(item[2]==="__terminal__") openTerminal(); else navigate(item[2]);});
      list.append(button);
    });
  };
  search.addEventListener("input",()=>renderCommands(search.value));
  $(".av-dialog-close",overlay).addEventListener("click",closePalette);
  overlay.addEventListener("click",event=>{if(event.target===overlay)closePalette();});
  const navigate = href => {
    const target = new URL(href, location.href);
    if (target.pathname === location.pathname && target.hash) { closePalette(); $(target.hash)?.scrollIntoView({behavior:reduced?"auto":"smooth"}); history.replaceState(null,"",target.hash); return; }
    location.href = target.href;
  };

  const terminal = document.createElement("div");
  terminal.className = "av-overlay";
  terminal.innerHTML = '<section class="av-dialog" role="dialog" aria-modal="true" aria-label="AyushVerse terminal"><div class="av-dialog-head"><strong>AYUSHVERSE // TERMINAL</strong><kbd>ESC</kbd><button class="av-dialog-close" type="button" aria-label="Close terminal">×</button></div><div class="av-terminal-body"><p>Welcome to the AyushVerse terminal.</p><p>Type <b>help</b> to see available commands.</p><div class="av-terminal-output" aria-live="polite"></div></div><form class="av-terminal-form"><label for="av-terminal-input">&gt;</label><input id="av-terminal-input" autocomplete="off" spellcheck="false" aria-label="Terminal command"><button type="submit">Run</button></form></section>';
  document.body.append(terminal);
  const terminalInput=$("#av-terminal-input",terminal), terminalOutput=$(".av-terminal-output",terminal);
  const closeTerminal=()=>{terminal.classList.remove("open");};
  const openTerminal=()=>{closePalette();terminal.classList.add("open");terminalInput.focus();};
  $(".av-dialog-close",terminal).addEventListener("click",closeTerminal);
  terminal.addEventListener("click",event=>{if(event.target===terminal)closeTerminal();});
  $(".av-terminal-form",terminal).addEventListener("submit",event=>{
    event.preventDefault();
    const command=terminalInput.value.trim().toLowerCase(); terminalInput.value="";
    const replies={
      help:"Available commands: help, home, about, perspectives, journey, contact, student, developer, creative, scientist, innovator, clear, exit",
      home:"Opening the AyushVerse homepage…",
      about:"Ayush Wadekar is a student and creative thinker interested in coding, design, AI, science, and robotics.",
      perspectives:"Five perspectives: The Student, The Developer, The Creative Mind, The Future Scientist, and The Young Innovator.",
      journey:"Learn & Explore → Build & Experiment → Invent & Contribute.",
      contact:"Use the Contact section on the homepage to get in touch.",
      student:"Opening The Student…", developer:"Opening The Developer…", creative:"Opening The Creative Mind…", scientist:"Opening The Future Scientist…", innovator:"Opening The Young Innovator…",
      clear:"", exit:"Closing terminal…"
    };
    if(command==="clear"){terminalOutput.textContent="";return;}
    if(command==="exit"){closeTerminal();return;}
    if(!Object.prototype.hasOwnProperty.call(replies,command)){terminalOutput.textContent="Unknown command: "+command+"\nType help to see available commands.";return;}
    terminalOutput.textContent=replies[command];
    const paths={home:"index.html",student:"student.html",developer:"developer.html",creative:"creative.html",scientist:"scientist.html",innovator:"innovator.html",about:"index.html#about",perspectives:"index.html#perspectives",journey:"index.html#journey",contact:"index.html#contact"};
    if(paths[command]) window.setTimeout(()=>navigate(paths[command]),250);
  });

  document.addEventListener("keydown",event=>{
    if(event.key==="Escape"){closePalette();closeTerminal();return;}
    if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==="k"){event.preventDefault();openPalette();}
    if((event.ctrlKey||event.metaKey)&&event.shiftKey&&event.key.toLowerCase()==="l"){event.preventDefault();openTerminal();}
  });
})();
