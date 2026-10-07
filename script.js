(() => {
    "use strict";

    const root = document.documentElement;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    // Set by the inline script in <head> so hidden-until-revealed styles apply before first paint
    const motion = root.classList.contains("motion");
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    /* ---------- Footer year ---------- */
    document.querySelectorAll("[data-year]").forEach((el) => {
        el.textContent = new Date().getFullYear();
    });

    /* ---------- Theme toggle ---------- */
    const themeToggle = document.querySelector(".theme-toggle");
    const systemLight = window.matchMedia("(prefers-color-scheme: light)");

    const currentTheme = () =>
        root.getAttribute("data-theme") || (systemLight.matches ? "light" : "dark");

    const syncThemeLabel = () => {
        const next = currentTheme() === "dark" ? "light" : "dark";
        themeToggle.setAttribute("aria-label", `Switch to ${next} theme`);
    };

    if (themeToggle) {
        syncThemeLabel();
        const applyTheme = (next) => {
            root.setAttribute("data-theme", next);
            try {
                localStorage.setItem("theme", next);
            } catch (e) {
                /* storage unavailable: theme still applies for this visit */
            }
            syncThemeLabel();
        };

        themeToggle.addEventListener("click", () => {
            const next = currentTheme() === "dark" ? "light" : "dark";
            if (!motion || !document.startViewTransition) {
                applyTheme(next);
                return;
            }
            // Circular wipe expanding from the toggle button
            const r = themeToggle.getBoundingClientRect();
            const x = r.left + r.width / 2;
            const y = r.top + r.height / 2;
            const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
            document.startViewTransition(() => applyTheme(next)).ready.then(() => {
                root.animate(
                    { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
                    { duration: 650, easing: "cubic-bezier(0.2, 0.7, 0.2, 1)", pseudoElement: "::view-transition-new(root)" }
                );
            });
        });
        systemLight.addEventListener("change", syncThemeLabel);
    }

    /* ---------- Header state + mobile menu ---------- */
    const header = document.querySelector(".site-header");
    const navToggle = document.querySelector(".nav__toggle");
    const navMenu = document.getElementById("nav-menu");

    const onScroll = () => {
        header.classList.toggle("is-scrolled", window.scrollY > 8);
        const max = document.documentElement.scrollHeight - window.innerHeight;
        header.style.setProperty("--progress", max > 0 ? Math.min(window.scrollY / max, 1) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    const setMenu = (open) => {
        navToggle.setAttribute("aria-expanded", String(open));
        navMenu.classList.toggle("is-open", open);
    };

    navToggle.addEventListener("click", () => {
        setMenu(navToggle.getAttribute("aria-expanded") !== "true");
    });

    navMenu.addEventListener("click", (e) => {
        if (e.target.closest("a")) setMenu(false);
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && navMenu.classList.contains("is-open")) {
            setMenu(false);
            navToggle.focus();
        }
    });

    document.addEventListener("click", (e) => {
        if (navMenu.classList.contains("is-open") && !e.target.closest(".nav")) setMenu(false);
    });

    /* ---------- Active section highlighting ---------- */
    const navLinks = [...document.querySelectorAll(".nav__links a")];
    const linkFor = new Map(navLinks.map((a) => [a.getAttribute("href").slice(1), a]));
    const spySections = [...document.querySelectorAll("main section[id]")];

    const setActive = (id) => {
        navLinks.forEach((a) => a.removeAttribute("aria-current"));
        const link = linkFor.get(id);
        if (link) link.setAttribute("aria-current", "true");
    };

    // Pick the last section whose top has passed a line ~35% down the viewport.
    let spyTicking = false;
    const updateSpy = () => {
        spyTicking = false;
        const line = window.innerHeight * 0.35;
        let active = null;
        for (const section of spySections) {
            if (section.getBoundingClientRect().top <= line) active = section.id;
        }
        // Bottom of page: highlight the last section (contact is short)
        if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 4) {
            active = spySections[spySections.length - 1].id;
        }
        setActive(active);
    };

    window.addEventListener(
        "scroll",
        () => {
            if (!spyTicking) {
                spyTicking = true;
                requestAnimationFrame(updateSpy);
            }
        },
        { passive: true }
    );
    window.addEventListener("resize", updateSpy);
    updateSpy();

    /* ---------- Reveal on scroll ---------- */
    if (motion) {
        // Section headings: label types out, heading slides up from a mask
        document.querySelectorAll(".section-head").forEach((el) => el.classList.add("reveal", "reveal--bare"));
        document.querySelectorAll(".section-head h2, .resume h2").forEach((el) => el.classList.add("mask-reveal"));

        // Contact block reveals line by line. The container is the observed
        // element: a fully clipped target never reports as intersecting.
        const contact = document.querySelector(".contact .container");
        contact.classList.add("reveal", "reveal--bare");
        [...contact.children].forEach((el, i) => {
            if (el.classList.contains("contact__title")) {
                el.classList.add("mask-reveal");
                el.style.setProperty("--delay", "120ms");
            } else if (!el.classList.contains("section-head__index")) {
                el.classList.add("st");
                el.style.setProperty("--i", i);
                el.style.setProperty("--base", "250ms");
            }
        });

        // Siblings revealed together get a slight cascade
        document.querySelectorAll(".about, .more__grid, .background, .resume").forEach((group) => {
            [...group.children]
                .filter((el) => el.classList.contains("reveal"))
                .forEach((el, i) => el.style.setProperty("--delay", `${i * 110}ms`));
        });

        // Items inside revealed blocks fade in one after another
        const staggerGroups = [
            ".chips", ".tags", ".bullets", ".stack__layers", ".pipeline ol", ".metrics",
            ".arch__flow", ".arch__row", ".dataflow", ".resume__facts", ".certs", ".skills__row ul",
        ];
        document.querySelectorAll(staggerGroups.join(",")).forEach((group) => {
            [...group.children].forEach((child, i) => {
                if (child.classList.contains("arch__row")) return; // its own children stagger
                child.classList.add("st");
                child.style.setProperty("--i", i);
            });
        });

        // Cards that get a cursor-following border glow
        document
            .querySelectorAll(".case--flagship, .mini, .stack, .edu, .achievements, .pipeline, .dataflow, .arch, .cv-panel")
            .forEach((el) => el.classList.add("spot"));
    }

    const reveals = document.querySelectorAll(".reveal");

    // Once an element has finished revealing, drop the reveal styles so its
    // own hover/transform styles take over again.
    const settle = (el) => {
        const done = () => {
            el.classList.remove("reveal");
            el.querySelectorAll(".st").forEach((c) => c.classList.remove("st"));
        };
        setTimeout(done, 2200);
    };

    if (motion) {
        const revealObserver = new IntersectionObserver(
            (entries, obs) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add("is-visible");
                        settle(entry.target);
                        obs.unobserve(entry.target);
                    }
                });
            },
            { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
        );
        reveals.forEach((el) => revealObserver.observe(el));
    } else {
        reveals.forEach((el) => el.classList.add("is-visible"));
    }

    /* ---------- Pointer effects (mouse / trackpad only) ---------- */
    if (motion && finePointer) {
        const hero = document.querySelector(".hero");
        let pending = null;

        const track = (e) => {
            // Hero grid flashlight
            const hr = hero.getBoundingClientRect();
            if (e.clientY >= hr.top && e.clientY <= hr.bottom) {
                hero.style.setProperty("--mx", `${e.clientX - hr.left}px`);
                hero.style.setProperty("--my", `${e.clientY - hr.top + 80}px`); // ::after starts 80px above
                hero.classList.add("is-pointer");
            } else {
                hero.classList.remove("is-pointer");
            }

            // Card border glow
            const card = e.target.closest && e.target.closest(".spot");
            if (card) {
                const r = card.getBoundingClientRect();
                card.style.setProperty("--mx", `${e.clientX - r.left}px`);
                card.style.setProperty("--my", `${e.clientY - r.top}px`);
            }
        };

        document.addEventListener(
            "pointermove",
            (e) => {
                if (pending) return;
                pending = requestAnimationFrame(() => {
                    track(e);
                    pending = null;
                });
            },
            { passive: true }
        );
        document.addEventListener("pointerleave", () => hero.classList.remove("is-pointer"));

        // Magnetic buttons: drift a few px toward the cursor
        document.querySelectorAll(".hero__ctas .btn, .resume__actions .btn").forEach((btn) => {
            btn.addEventListener("pointermove", (e) => {
                const r = btn.getBoundingClientRect();
                const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
                const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
                btn.style.setProperty("--tx", `${dx * 6}px`);
                btn.style.setProperty("--ty", `${dy * 4}px`);
            });
            btn.addEventListener("pointerleave", () => {
                btn.style.removeProperty("--tx");
                btn.style.removeProperty("--ty");
            });
        });
    }

    /* ---------- Count-up stats ---------- */
    const counters = document.querySelectorAll("[data-count]");
    const runCounter = (el) => {
        const target = Number(el.dataset.count);
        const duration = 1100;
        const start = performance.now();
        const tick = (now) => {
            const p = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - p, 3);
            el.textContent = Math.round(target * eased);
            if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    };

    if (motion) {
        const countObserver = new IntersectionObserver(
            (entries, obs) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        runCounter(entry.target);
                        obs.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.6 }
        );
        counters.forEach((el) => countObserver.observe(el));
    }

    /* ---------- Copy email ---------- */
    const copyBtn = document.querySelector(".copy-btn");
    const copyStatus = document.querySelector("[data-copy-status]");
    if (copyBtn && navigator.clipboard) {
        copyBtn.addEventListener("click", async () => {
            try {
                await navigator.clipboard.writeText(copyBtn.dataset.copy);
                copyBtn.textContent = "copied";
                copyBtn.classList.add("is-copied");
                copyStatus.textContent = "Email address copied to clipboard";
                setTimeout(() => {
                    copyBtn.textContent = "copy";
                    copyBtn.classList.remove("is-copied");
                    copyStatus.textContent = "";
                }, 1800);
            } catch (e) {
                window.location.href = `mailto:${copyBtn.dataset.copy}`;
            }
        });
    } else if (copyBtn) {
        copyBtn.hidden = true;
    }

    /* ---------- Hero pose illustration ----------
       A side-view squat drawn as pose landmarks. The knee angle and
       rep count are computed from the drawn skeleton each frame,
       mirroring how a real pose pipeline derives metrics. */
    const svg = document.querySelector(".pose");
    if (!svg) return;

    const NS = "http://www.w3.org/2000/svg";
    const bonesG = svg.querySelector(".pose__bones");
    const jointsG = svg.querySelector(".pose__joints");
    const bbox = svg.querySelector(".pose__bbox");
    const bboxLabel = svg.querySelector(".pose__bbox-label");
    const arc = svg.querySelector(".pose__arc");
    const angleOut = document.querySelector('[data-readout="angle"]');
    const repsOut = document.querySelector('[data-readout="reps"]');

    // Two key poses (standing / bottom of squat) in viewBox units.
    const STAND = {
        head: [163, 44], neck: [160, 70], shoulder: [158, 80],
        elbow: [161, 116], wrist: [166, 148],
        hip: [156, 150], knee: [160, 198], ankle: [156, 246], toe: [176, 250],
    };
    const SQUAT = {
        head: [186, 92], neck: [180, 114], shoulder: [176, 122],
        elbow: [206, 130], wrist: [238, 126],
        hip: [126, 182], knee: [186, 196], ankle: [158, 246], toe: [178, 250],
    };
    const FAR = [7, -3]; // offset for the far-side limbs

    const BONES = [
        ["head", "neck"], ["neck", "shoulder"], ["shoulder", "hip"],
        ["shoulder", "elbow"], ["elbow", "wrist"],
        ["hip", "knee"], ["knee", "ankle"], ["ankle", "toe"],
    ];
    const LIMB_JOINTS = ["shoulder", "elbow", "wrist", "hip", "knee", "ankle", "toe"];

    const make = (tag, attrs, parent) => {
        const el = document.createElementNS(NS, tag);
        Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
        parent.appendChild(el);
        return el;
    };

    // Far-side limbs first (dimmed), then near side on top.
    const isLimb = ([a, b]) => LIMB_JOINTS.includes(a) && LIMB_JOINTS.includes(b) && !(a === "shoulder" && b === "hip");
    const farLines = BONES.filter(isLimb).map((pair) => ({ pair, el: make("line", { opacity: "0.35" }, bonesG) }));
    const nearLines = BONES.map((pair) => ({ pair, el: make("line", {}, bonesG) }));
    const joints = Object.keys(STAND).map((name) => ({
        name,
        el: make("circle", { r: name === "head" ? 9 : 3.4, class: name === "knee" ? "is-key" : "" }, jointsG),
    }));
    const farJoints = LIMB_JOINTS.map((name) => ({
        name,
        el: make("circle", { r: 2.6, opacity: "0.45" }, jointsG),
    }));

    const lerp = (a, b, t) => a + (b - a) * t;
    const pose = (t) => {
        const p = {};
        for (const k in STAND) {
            p[k] = [lerp(STAND[k][0], SQUAT[k][0], t), lerp(STAND[k][1], SQUAT[k][1], t)];
        }
        return p;
    };
    const far = (pt) => [pt[0] + FAR[0], pt[1] + FAR[1]];

    const angleAt = (a, b, c) => {
        const v1 = [a[0] - b[0], a[1] - b[1]];
        const v2 = [c[0] - b[0], c[1] - b[1]];
        const dot = v1[0] * v2[0] + v1[1] * v2[1];
        const m = Math.hypot(...v1) * Math.hypot(...v2);
        return (Math.acos(Math.max(-1, Math.min(1, dot / m))) * 180) / Math.PI;
    };

    let reps = 0;
    let wasDown = false;

    const draw = (t) => {
        const p = pose(t);

        nearLines.forEach(({ pair: [a, b], el }) => {
            el.setAttribute("x1", p[a][0]); el.setAttribute("y1", p[a][1]);
            el.setAttribute("x2", p[b][0]); el.setAttribute("y2", p[b][1]);
        });
        farLines.forEach(({ pair: [a, b], el }) => {
            const pa = far(p[a]), pb = far(p[b]);
            el.setAttribute("x1", pa[0]); el.setAttribute("y1", pa[1]);
            el.setAttribute("x2", pb[0]); el.setAttribute("y2", pb[1]);
        });
        joints.forEach(({ name, el }) => {
            el.setAttribute("cx", p[name][0]); el.setAttribute("cy", p[name][1]);
        });
        farJoints.forEach(({ name, el }) => {
            const q = far(p[name]);
            el.setAttribute("cx", q[0]); el.setAttribute("cy", q[1]);
        });

        // Bounding box around all landmarks
        const xs = Object.values(p).map((q) => q[0]);
        const ys = Object.values(p).map((q) => q[1]);
        const pad = 16;
        const x = Math.min(...xs) - pad, y = Math.min(...ys) - pad - 6;
        const w = Math.max(...xs) + FAR[0] - x + pad, h = Math.max(...ys) - y + pad / 2;
        bbox.setAttribute("x", x); bbox.setAttribute("y", y);
        bbox.setAttribute("width", w); bbox.setAttribute("height", h);
        bboxLabel.setAttribute("x", x); bboxLabel.setAttribute("y", y - 5);

        // Knee angle + arc wedge
        const deg = angleAt(p.hip, p.knee, p.ankle);
        const r = 16;
        const a1 = Math.atan2(p.hip[1] - p.knee[1], p.hip[0] - p.knee[0]);
        const a2 = Math.atan2(p.ankle[1] - p.knee[1], p.ankle[0] - p.knee[0]);
        const s = [p.knee[0] + r * Math.cos(a1), p.knee[1] + r * Math.sin(a1)];
        const e = [p.knee[0] + r * Math.cos(a2), p.knee[1] + r * Math.sin(a2)];
        const cross = (p.hip[0] - p.knee[0]) * (p.ankle[1] - p.knee[1]) - (p.hip[1] - p.knee[1]) * (p.ankle[0] - p.knee[0]);
        const sweep = cross > 0 ? 1 : 0;
        arc.setAttribute("d", `M${p.knee[0]} ${p.knee[1]} L${s[0]} ${s[1]} A${r} ${r} 0 0 ${sweep} ${e[0]} ${e[1]} Z`);

        if (angleOut) angleOut.textContent = `${Math.round(deg)}°`;

        // Rep counting with hysteresis, like a real rep counter
        if (deg < 100) wasDown = true;
        if (wasDown && deg > 155) {
            wasDown = false;
            reps += 1;
            if (repsOut) repsOut.textContent = reps;
        }
    };

    if (reducedMotion.matches) {
        draw(0.75);
        return;
    }

    const PERIOD = 3400;
    let raf = null;
    let startTime = null;
    let elapsedBeforePause = 0;

    const frame = (now) => {
        if (startTime === null) startTime = now - elapsedBeforePause;
        const elapsed = now - startTime;
        // hold briefly at top and bottom so the motion reads as a squat
        const phase = (elapsed % PERIOD) / PERIOD;
        const t = Math.min(1, Math.max(0, (1 - Math.cos(phase * 2 * Math.PI)) / 2 * 1.12 - 0.06));
        draw(t);
        raf = requestAnimationFrame(frame);
    };

    const play = () => {
        if (raf === null) raf = requestAnimationFrame(frame);
    };
    const pause = () => {
        if (raf !== null) {
            cancelAnimationFrame(raf);
            raf = null;
            if (startTime !== null) elapsedBeforePause = performance.now() - startTime;
            startTime = null;
        }
    };

    draw(0);

    // Only animate while the panel is on screen and the tab is visible.
    let onScreen = true;
    if ("IntersectionObserver" in window) {
        new IntersectionObserver(([entry]) => {
            onScreen = entry.isIntersecting;
            onScreen && !document.hidden ? play() : pause();
        }).observe(svg);
    } else {
        play();
    }
    document.addEventListener("visibilitychange", () => {
        document.hidden || !onScreen ? pause() : play();
    });
})();
