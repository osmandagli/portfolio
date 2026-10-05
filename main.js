(() => {
  "use strict";

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const t0 = performance.now();

  /* ---------------- theme ---------------- */
  const root = document.documentElement;
  $("#theme-toggle").addEventListener("click", () => setTheme());
  function currentTheme() {
    return root.dataset.theme || (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
  }
  function setTheme(next) {
    next = next || (currentTheme() === "dark" ? "light" : "dark");
    root.dataset.theme = next;
    try { localStorage.setItem("theme", next); } catch (e) {}
    return next;
  }

  /* ---------------- uptime + year ---------------- */
  $("#year").textContent = new Date().getFullYear();
  const fmtUp = () => {
    const s = Math.floor((performance.now() - t0) / 1000);
    return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
  };
  setInterval(() => { $("#uptime").textContent = "uptime " + fmtUp(); }, 1000);

  /* ---------------- hero packet capture ---------------- */
  // 203.0.113.0/24 is TEST-NET-3: documentation addresses, never routed.
  const you = "203.0.113." + (2 + Math.floor(Math.random() * 250));
  const port = 49152 + Math.floor(Math.random() * 16000);
  const packets = [
    ["tcp", `${you}.${port} > osman.443: Flags [S], seq 0, win 64240, mss 1460`],
    ["tcp", `osman.443 > ${you}.${port}: Flags [S.], ack 1, win 65160`],
    ["tcp", `${you}.${port} > osman.443: Flags [.], ack 1`],
    ["tls", `ClientHello SNI=osman ALPN=[h2, http/1.1]`],
    ["tls", `ServerHello TLSv1.3 cipher=TLS_AES_128_GCM_SHA256`],
    ["tls", `HTTP/2 200  <b>alt-svc: h3=":443"</b>`],
    ["quic", `${you}.${port} > osman.443: Initial, DCID=8f3a…, CRYPTO`],
    ["quic", `osman.443 > ${you}.${port}: Handshake, 1-RTT keys ready`],
    ["h3", `HEADERS :method GET :path / :authority osman`],
    ["h3", `200 OK  <b>x-role: devops-engineer</b>`],
    ["h3", `<b>x-based:</b> milano, it`],
    ["h3", `<b>x-likes:</b> linux, networking, kernels`],
    ["icmp", `echo request osman: are you hiring? (scroll ↓)`],
  ];
  const cap = $("#capture");
  const capCount = $("#cap-count");
  let pi = 0, pktTime = 0;
  function pushPacket() {
    if (pi >= packets.length) {
      // pause, then restart the "session"
      setTimeout(() => { cap.innerHTML = ""; pi = 0; pktTime = 0; pushPacket(); }, 5000);
      return;
    }
    const [proto, info] = packets[pi++];
    pktTime += 0.004 + Math.random() * 0.03;
    const row = document.createElement("div");
    row.className = "pkt";
    row.innerHTML = `<span class="t">${pktTime.toFixed(6)}</span><span class="proto ${proto}">${proto.toUpperCase()}</span><span class="info">${info}</span>`;
    cap.appendChild(row);
    while (cap.children.length > 11) cap.firstChild.remove();
    capCount.textContent = `${pi} packets`;
    setTimeout(pushPacket, 350 + Math.random() * 550);
  }
  if (reduceMotion) {
    packets.slice(-11).forEach(([proto, info], i) => {
      cap.insertAdjacentHTML("beforeend", `<div class="pkt"><span class="t">${(i * 0.013).toFixed(6)}</span><span class="proto ${proto}">${proto.toUpperCase()}</span><span class="info">${info}</span></div>`);
    });
    capCount.textContent = `${packets.length} packets`;
  } else {
    setTimeout(pushPacket, 600);
  }

  /* ---------------- hexdump helpers ---------------- */
  const toHex = (str) => [...new TextEncoder().encode(str)].map((b) => b.toString(16).padStart(2, "0"));
  $$(".hexline").forEach((el) => {
    const bytes = toHex(el.dataset.hex + "\0");
    el.innerHTML = `<span class="off">0000</span>` + bytes.map((b, i) => `<span class="b" style="--i:${i}">${b}</span>`).join(" ");
  });

  /* ---------------- rail: active section + live hex ---------------- */
  const railLinks = $$(".dissect a");
  const railHex = $("#rail-hex");
  const sections = $$("[data-section]");
  function renderRailHex(name) {
    const bytes = toHex(`osman/${name}`.padEnd(32, "."));
    let out = "";
    for (let i = 0; i < bytes.length; i += 8) {
      const chunk = bytes.slice(i, i + 8);
      const hl = i === 0 ? chunk.map((b) => `<span class="hl">${b}</span>`) : chunk;
      out += `${(i).toString(16).padStart(4, "0")}  ${hl.join(" ")}\n`;
    }
    railHex.innerHTML = out;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const id = e.target.dataset.section;
      railLinks.forEach((a) => a.classList.toggle("active", a.dataset.sec === id));
      const active = railLinks.find((a) => a.dataset.sec === id);
      if (active && matchMedia("(max-width: 960px)").matches) {
        active.scrollIntoView({ block: "nearest", inline: "center", behavior: reduceMotion ? "auto" : "smooth" });
      }
      renderRailHex(id);
    });
  }, { rootMargin: "-40% 0px -55% 0px" });
  sections.forEach((s) => io.observe(s));
  renderRailHex("top");

  /* ---------------- handshake animation ---------------- */
  const hs = $(".handshake");
  new IntersectionObserver((entries, obs) => {
    if (entries[0].isIntersecting) { hs.classList.add("go"); obs.disconnect(); }
  }, { threshold: 0.4 }).observe(hs);

  /* ---------------- benchmark bars ---------------- */
  const bench = $(".bench");
  if (bench) new IntersectionObserver((entries, obs) => {
    if (entries[0].isIntersecting) { bench.classList.add("go"); obs.disconnect(); }
  }, { threshold: 0.5 }).observe(bench);

  /* ---------------- SEU demo: flip a bit, EDDI catches it ---------------- */
  const SEU_VALUE = 0x2a;
  const seuA = $("#seu-a"), seuB = $("#seu-b"), seuStatus = $("#seu-status"), seuReset = $("#seu-reset");
  let seuReg = SEU_VALUE;
  const seuOk = seuStatus ? seuStatus.innerHTML : "";
  function renderSeu() {
    if (!seuA) return;
    seuA.innerHTML = ""; seuB.innerHTML = "";
    for (let i = 7; i >= 0; i--) {
      const v = (seuReg >> i) & 1, orig = (SEU_VALUE >> i) & 1;
      const b = document.createElement("button");
      b.type = "button"; b.className = "bit" + (v !== orig ? " hit" : ""); b.textContent = v;
      b.setAttribute("aria-label", `bit ${i}, value ${v}. Flip it`);
      b.addEventListener("click", () => flipBit(i));
      seuA.appendChild(b);
      seuB.insertAdjacentHTML("beforeend", `<span class="bit${v !== orig ? " diff" : ""}">${orig}</span>`);
    }
    $("#seu-a-hex").textContent = "0x" + seuReg.toString(16).toUpperCase().padStart(2, "0");
    const bad = seuReg !== SEU_VALUE;
    seuStatus.classList.toggle("caught", bad);
    seuStatus.innerHTML = bad
      ? `<code>icmp eq x, x′</code> is false, so it branches to <b>DataCorruption_Handler()</b>. The flip is caught before the wrong value is used.`
      : seuOk;
    seuReset.hidden = !bad;
  }
  function flipBit(i) {
    seuReg ^= 1 << (i ?? Math.floor(Math.random() * 8));
    renderSeu();
  }
  if (seuA) {
    seuReset.addEventListener("click", () => { seuReg = SEU_VALUE; renderSeu(); });
    renderSeu();
  }

  /* ---------------- lsmod -> project filter ---------------- */
  const projects = $$(".proj");
  const filterable = $$(".proj, .hop[data-skills], .thesis[data-skills]");
  const status = $("#filter-status");
  const statusDefault = status.innerHTML;
  let activeSkill = null;
  function applyFilter(skill) {
    activeSkill = skill;
    $$(".lsmod-row[data-skill]").forEach((r) => r.setAttribute("aria-pressed", String(r.dataset.skill === skill)));
    if (!skill) {
      filterable.forEach((p) => p.classList.remove("dim", "match"));
      status.innerHTML = statusDefault;
      return 0;
    }
    let n = 0, jobs = 0, thesis = false;
    filterable.forEach((p) => {
      const hit = p.dataset.skills.split(/\s+/).includes(skill);
      if (hit) {
        if (p.classList.contains("hop")) jobs++;
        else if (p.classList.contains("thesis")) thesis = true;
        else n++;
      }
      p.classList.toggle("dim", !hit);
      p.classList.toggle("match", hit);
    });
    status.innerHTML = `<span class="mono">modinfo ${esc(skill)}</span>: ${thesis ? "the thesis, " : ""}${n} project${n === 1 ? "" : "s"}, ${jobs} hop${jobs === 1 ? "" : "s"} in the traceroute. <button type="button" id="clear-filter">rmmod ✕</button>`;
    $("#clear-filter").addEventListener("click", () => applyFilter(null));
    return n + jobs + (thesis ? 1 : 0);
  }
  $$(".lsmod-row[data-skill]").forEach((row) => {
    row.setAttribute("aria-pressed", "false");
    row.addEventListener("click", () => {
      const s = row.dataset.skill;
      applyFilter(activeSkill === s ? null : s);
      const first = activeSkill && $(".hop.match, .thesis.match, .proj.match");
      if (first) first.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
    });
  });

  /* ============================================================
     SHELL
     ============================================================ */
  const shell = $("#shell");
  const out = $("#shell-out");
  const input = $("#shell-input");
  const history = [];
  let hIdx = 0;
  let booted = false;

  const print = (html, cls = "") => {
    const pre = document.createElement("pre");
    if (cls) pre.className = cls;
    pre.innerHTML = html;
    out.appendChild(pre);
    out.scrollTop = out.scrollHeight;
  };
  const text = (sel) => ($(sel)?.innerText || "").trim();

  function openShell() {
    if (!shell.open) shell.showModal();
    if (!booted) {
      booted = true;
      print(`<span class="dim">Linux osman 6.x #1 SMP PREEMPT_DYNAMIC x86_64</span>

Welcome. This is a (tiny, fake, harmless) shell.
Type <span class="acc">help</span> to see what's here. <span class="dim">tab completes, ↑/↓ for history</span>
`);
    }
    input.focus();
  }
  function closeShell() { if (shell.open) shell.close(); }

  $("#open-shell").addEventListener("click", openShell);
  $$("[data-open-shell]").forEach((b) => b.addEventListener("click", openShell));
  $("#shell-close").addEventListener("click", closeShell);
  shell.addEventListener("click", (e) => { if (e.target === shell) closeShell(); });

  document.addEventListener("keydown", (e) => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName) || document.activeElement?.isContentEditable;
    if ((e.key === "/" || e.key === "`") && !typing && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      openShell();
    }
  });

  const FILES = {
    "about.txt": () => text("#whoami .prose"),
    "skills.txt": () => $$(".lsmod-row[data-skill]").map((r) => r.children[0].textContent.padEnd(22) + r.children[1].textContent).join("\n"),
    "experience.log": () => $$(".hop").map((h) => h.innerText.replace(/\s*\n\s*/g, "  ").trim()).join("\n"),
    "thesis.txt": () => text("#thesis .thesis-title") + "\n\n" + text("#thesis .thesis-abstract"),
    "now.txt": () => $$(".ps-row:not(.head)").map((r) => "• " + r.children[2].innerText).join("\n"),
    "cv.pdf": () => `<a href="OsmanBugraDagli_CV.pdf" download>click to download cv.pdf</a> <span class="dim">(binary file, not dumping it on your terminal)</span>`,
    "contact.txt": () => `email   <a href="mailto:osman.dagli687@gmail.com">osman.dagli687@gmail.com</a>\ngithub  <a href="https://github.com/osmandagli" target="_blank" rel="noopener">github.com/osmandagli</a>`,
    ".secrets": () => `<span class="err">cat: .secrets: Permission denied</span>\n<span class="dim">(good instinct though)</span>`,
  };
  const PROJECTS = () => projects.map((p) => ({
    id: p.id.replace(/^p-/, ""),
    name: $("h3", p).textContent.trim(),
    desc: $("p", p).innerText.trim(),
    el: p,
  }));

  const SECTIONS = { whoami: "#whoami", toolbox: "#toolbox", skills: "#toolbox", route: "#route", experience: "#route", thesis: "#thesis", projects: "#projects", encodings: "#encodings", iconv: "#encodings", languages: "#encodings", now: "#now", connect: "#connect", contact: "#connect", "~": "#top", "/": "#top" };
  const goTo = (sel) => { closeShell(); $(sel).scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" }); };

  const COMMANDS = {
    help: () => `<span class="acc">navigation</span>
  ls [dir]            list files
  cat &lt;file&gt;          read a file
  cd &lt;section&gt;        jump to: whoami, skills, experience, thesis, projects, iconv, now, contact
  open &lt;project&gt;      jump to a project

<span class="acc">about osman</span>
  whoami              who is this
  neofetch            system info, but it's me
  projects            list projects
  traceroute osman    career path
  modinfo &lt;skill&gt;     filter by skill (e.g. modinfo af_xdp)
  bench               thesis numbers
  iconv -l            languages osman speaks
  openssl x509        his certificate
  cosmic-ray          flip a bit in the ASPIS demo

<span class="acc">network</span>
  ping osman          is he up?
  dig osman           resolve him
  curl -I osman       response headers
  ss -tlnp            listening sockets

<span class="acc">misc</span>
  theme [light|dark]  switch theme
  history, clear, exit`,

    ls: (args) => {
      if (args[0] && args[0].replace(/\/$/, "") === "projects") return PROJECTS().map((p) => `<span class="cy">${esc(p.id)}</span>`).join("  ");
      const all = args.includes("-a") || args.includes("-la") || args.includes("-al");
      const names = Object.keys(FILES).filter((f) => all || !f.startsWith("."));
      return `<span class="cy">projects/</span>  ` + names.join("  ");
    },
    ll: () => COMMANDS.ls(["-la"]),
    cat: (args) => {
      if (!args[0]) return `<span class="err">cat: missing operand</span>`;
      const f = args[0].replace(/^\.\//, "");
      if (f.startsWith("projects/")) {
        const p = PROJECTS().find((x) => x.id === f.slice(9).replace(/\/$/, ""));
        return p ? esc(p.desc) : `<span class="err">cat: ${esc(f)}: No such file or directory</span>`;
      }
      if (f === "projects" || f === "projects/") return `<span class="err">cat: projects: Is a directory</span>`;
      if (FILES[f]) { const v = FILES[f](); return ["contact.txt", ".secrets", "cv.pdf"].includes(f) ? v : esc(v); }
      return `<span class="err">cat: ${esc(f)}: No such file or directory</span>`;
    },
    cd: (args) => {
      const k = (args[0] || "~").replace(/\/$/, "");
      if (SECTIONS[k]) { goTo(SECTIONS[k]); return ""; }
      return `<span class="err">cd: ${esc(k)}: No such file or directory</span>\n<span class="dim">try: ${Object.keys(SECTIONS).filter((s) => /^\w/.test(s)).join(", ")}</span>`;
    },
    open: (args) => {
      const p = PROJECTS().find((x) => x.id === (args[0] || "").replace(/^projects\//, ""));
      if (!p) return `<span class="err">open: no such project</span>. try <span class="acc">projects</span>`;
      closeShell();
      p.el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
      p.el.animate?.([{ boxShadow: "0 0 0 3px var(--accent)" }, { boxShadow: "0 0 0 0 transparent" }], { duration: 1400, delay: 400 });
      return "";
    },
    projects: () => PROJECTS().map((p) => `<span class="cy">${esc(p.id.padEnd(16))}</span>${esc(p.desc.split(/(?<=\.)\s/)[0])}`).join("\n") + `\n\n<span class="dim">open &lt;name&gt; to jump there</span>`,
    whoami: () => `osman bugra dagli: DevOps engineer (CKA), MSc @ Politecnico di Milano.\nran kubernetes in production at Turkish Aerospace, now bypasses the kernel for fun and a thesis.`,
    bench: () => {
      const bar = (v) => "█".repeat(Math.round(v / 1.55 * 30)).padEnd(30, "░");
      return `single-core RX, Mpps\n\nkernel recvmmsg+GRO  <span class="dim">${bar(0.65)}</span>  0.65\nAF_XDP zero-copy     <span class="acc">${bar(1.55)}</span>  <span class="acc">1.55</span>\n\n<span class="acc">~2.4x</span> per core. <span class="dim">cd thesis for the full story</span>`;
    },
    neofetch: () => {
      const logo = [
        "   ___  ___  ",
        "  / _ \\/ __| ",
        " | (_) \\__ \\ ",
        "  \\___/|___/ ",
        "  osman os   ",
        "             ",
        "             ",
        "             ",
      ];
      const info = [
        `<span class="acc">osman</span>@<span class="cy">dagli</span>`,
        `-----------`,
        `<span class="acc">Role</span>: DevOps Engineer · CKA`,
        `<span class="acc">Host</span>: Politecnico di Milano (MEng)`,
        `<span class="acc">Prev</span>: TUSAS, ASELSAN`,
        `<span class="acc">Langs</span>: Go, Python, Bash`,
        `<span class="acc">Into</span>: AF_XDP, eBPF/XDP, LLVM, STM32`,
        `<span class="acc">Uptime</span>: ${fmtUp()} (on this page)`,
      ];
      return logo.map((l, i) => `<span class="acc">${esc(l)}</span>  ${info[i] || ""}`).join("\n");
    },
    traceroute: () => {
      const rows = $$(".hop").map((h, i) => {
        const host = $(".hop-host", h).innerText.trim();
        const rtt = $(".hop-rtt", h)?.innerText.trim() || "";
        return ` ${i + 1}  ${esc(host)}  <span class="cy">${esc(rtt)}</span>`;
      });
      return `traceroute to osman (present), 30 hops max\n` + rows.join("\n") + `\n\n<span class="dim">cd experience for details</span>`;
    },
    modinfo: (args) => {
      if (!args[0]) return `<span class="err">modinfo: missing module name</span>`;
      const aliases = { tcp_ip: "networking", tcp: "networking", http3: "quic", k8s: "kubernetes", cka: "kubernetes", gitlab_ci: "cicd", gitlab: "cicd", ci: "cicd", ebpf: "xdp", af_xdp: "afxdp", namespaces: "containers", cgroups: "containers", clang: "llvm", aspis: "llvm", stm32: "embedded", miosix: "embedded", alloy: "formal", "c++": "c", cpp: "c" };
      const skill = aliases[args[0]] || args[0];
      if (!$(`.lsmod-row[data-skill="${CSS.escape(skill)}"]`)) return `<span class="err">modinfo: ERROR: Module ${esc(args[0])} not found.</span>`;
      const n = applyFilter(skill);
      setTimeout(() => goTo("#projects"), 700);
      return `filename:  /lib/modules/osman/${esc(skill)}.ko\nmatches:   ${n}\n<span class="dim">filtering…</span>`;
    },
    rmmod: () => { applyFilter(null); return "filter cleared"; },
    ping: (args) => {
      const host = esc(args[0] || "osman");
      const lines = [`PING ${host} (203.0.113.1) 56(84) bytes of data.`];
      for (let i = 1; i <= 4; i++) lines.push(`64 bytes from ${host}: icmp_seq=${i} ttl=64 time=${(Math.random() * 2 + 0.2).toFixed(2)} ms`);
      lines.push(`\n--- ${host} ping statistics ---\n4 packets transmitted, 4 received, <span class="ok">0% packet loss</span>\n<span class="acc">he's up. send an email → cat contact.txt</span>`);
      return lines.join("\n");
    },
    dig: () => `;; QUESTION SECTION:\n;osman.            IN  A\n\n;; ANSWER SECTION:\nosman.     300  IN  TXT  "devops engineer, CKA"\nosman.     300  IN  TXT  "open to: devops, platform, sre; also network software"\nosman.     300  IN  LOC  "Milano, IT (open to relocate)"\nosman.     300  IN  MX   10 <a href="mailto:osman.dagli687@gmail.com">osman.dagli687@gmail.com</a>\n\n;; Query time: 0 msec`,
    curl: () => `HTTP/3 200\nalt-svc: h3=":443"; ma=86400\nx-role: devops-engineer\nx-cert: CKA\nx-langs: go, python, bash\nx-interests: af_xdp, ebpf, quic, kernels\nx-location: milano; relocate=ok\nx-open-to: devops, platform, sre\nx-also-open-to: network-software\ncache-control: no-store`,
    ss: () => `State   Recv-Q  Send-Q  Local Address:Port   Process\nLISTEN  0       128     0.0.0.0:22           ("sshd")\nLISTEN  0       128     0.0.0.0:443          ("devops-roles")\nLISTEN  0       64      0.0.0.0:8443         ("network-software-roles")\nUNCONN  0       0       0.0.0.0:4433         ("cloud-storage",quic)\nXDP     0       0       eth0:queue0          ("moq-relay",af_xdp,zc)`,
    uname: (args) => args.includes("-a") ? `Linux osman 6.x #1 SMP PREEMPT_DYNAMIC x86_64 GNU/Linux` : `Linux`,
    theme: (args) => `theme: ${setTheme(args[0] === "light" || args[0] === "dark" ? args[0] : undefined)}`,
    history: () => history.map((h, i) => `${String(i + 1).padStart(4)}  ${esc(h)}`).join("\n"),
    clear: () => { out.innerHTML = ""; return ""; },
    exit: () => { closeShell(); return ""; },
    pwd: () => "/home/osman",
    echo: (args) => esc(args.join(" ")),
    date: () => new Date().toString(),
    sudo: (args) => args.join(" ").includes("rm") ? `<span class="err">nice try.</span> this incident will be reported (to nobody).` : `visitor is not in the sudoers file. <span class="dim">hire osman to get root.</span>`,
    rm: () => `<span class="err">rm: cannot remove: Read-only file system</span>`,
    vim: () => `you are now stuck in vim. <span class="dim">(just kidding, type :q)</span>`,
    ":q": () => `<span class="dim">phew.</span>`,
    emacs: () => `<span class="dim">emacs: command not found (the jury is still out)</span>`,
    hire: () => { goTo("#connect"); return ""; },
    iconv: () => `tr_TR.UTF-8   Türkçe     <span class="ok">native</span>\nen_US.UTF-8   English    <span class="ok">professional</span>\nit_IT.UTF-8   Italiano   <span class="acc">B1</span>`,
    openssl: () => `Subject: CN = Osman Bugra Dagli\nIssuer:  O = The Linux Foundation, OU = CNCF\nX509v3 Extended Key Usage:\n    <span class="acc">Certified Kubernetes Administrator (CKA)</span>\nVerify return code: <span class="ok">0 (ok)</span>`,
    "cosmic-ray": () => {
      flipBit();
      closeShell();
      $("#seu").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
      return "";
    },
  };
  COMMANDS.exit.hidden = true;
  COMMANDS.hire.hidden = true;

  function run(line) {
    print(esc(line), "cmd");
    const [cmd, ...args] = line.trim().split(/\s+/);
    if (!cmd) return;
    const fn = COMMANDS[cmd];
    const res = fn ? fn(args) : `<span class="err">${esc(cmd)}: command not found</span>. try <span class="acc">help</span>`;
    if (res) print(res);
  }

  function complete(value) {
    const parts = value.split(/\s+/);
    const last = parts[parts.length - 1];
    const pool = parts.length === 1
      ? Object.keys(COMMANDS)
      : [...Object.keys(FILES), "projects/", ...PROJECTS().map((p) => p.id), ...Object.keys(SECTIONS), ...PROJECTS().map((p) => "projects/" + p.id)];
    const hits = [...new Set(pool.filter((c) => c.startsWith(last)))];
    if (hits.length === 1) { parts[parts.length - 1] = hits[0]; return parts.join(" ") + (hits[0].endsWith("/") ? "" : " "); }
    if (hits.length > 1) print(hits.join("  "), "dim");
    return value;
  }

  $("#shell-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const v = input.value;
    input.value = "";
    if (v.trim()) { history.push(v); hIdx = history.length; }
    run(v);
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowUp") { e.preventDefault(); if (hIdx > 0) input.value = history[--hIdx]; }
    else if (e.key === "ArrowDown") { e.preventDefault(); hIdx = Math.min(history.length, hIdx + 1); input.value = history[hIdx] || ""; }
    else if (e.key === "Tab") { e.preventDefault(); input.value = complete(input.value); }
    else if (e.key === "l" && e.ctrlKey) { e.preventDefault(); out.innerHTML = ""; }
  });
})();
