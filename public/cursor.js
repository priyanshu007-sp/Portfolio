(function () {
  const canvas = document.getElementById("cursor-canvas");
  if (!canvas) return;

  const isTouch =
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0 ||
    matchMedia("(pointer: coarse)").matches;

  if (isTouch) {
    canvas.remove();
    return;
  }

  const ctx = canvas.getContext("2d");
  let W, H;

  const resize = () => {
    W = canvas.width = innerWidth;
    H = canvas.height = innerHeight;
  };
  addEventListener("resize", resize);
  resize();

  document.head.appendChild(
    Object.assign(document.createElement("style"), {
      textContent: "* { cursor: none !important; }",
    })
  );

  const mouse = { x: W / 2, y: H / 2 };
  const ring = { x: W / 2, y: H / 2 };
  const TRAIL_LEN = 36;
  const trail = Array.from({ length: TRAIL_LEN }, () => ({ x: mouse.x, y: mouse.y }));

  let speed = 0;
  let isHover = false;
  let isClick = false;
  let ringR = 9;
  let hoverT = 0;
  let clickT = 0;
  let visible = true;

  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const lerp = (a, b, t) => a + (b - a) * t;

  const colors = () => {
    const dark = window.isDarkMode;
    return {
      primary: dark ? "96, 165, 250" : "59, 130, 246",
      secondary: dark ? "167, 139, 250" : "121, 40, 202",
      ink: dark ? "255, 255, 255" : "15, 23, 42",
    };
  };

  const isInteractive = (el) =>
    !!(
      el.closest("a, button, [role='button'], input, textarea, select, label") ||
      getComputedStyle(el).cursor === "pointer"
    );

  addEventListener("mousemove", (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    const dx = e.movementX ?? 0;
    const dy = e.movementY ?? 0;
    speed = Math.min(1, speed + Math.hypot(dx, dy) * 0.09);
    visible = true;
  });

  addEventListener("mouseover", (e) => {
    isHover = isInteractive(e.target);
  });

  addEventListener("mousedown", () => {
    isClick = true;
  });
  addEventListener("mouseup", () => {
    isClick = false;
  });

  document.addEventListener("mouseleave", () => {
    visible = false;
  });
  document.addEventListener("mouseenter", () => {
    visible = true;
    ring.x = mouse.x;
    ring.y = mouse.y;
  });

  function smoothPath(points, count) {
    const n = Math.min(count, points.length);
    if (n < 3) return null;

    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 0; i < n - 2; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const mx = (p0.x + p1.x) / 2;
      const my = (p0.y + p1.y) / 2;
      ctx.quadraticCurveTo(p0.x, p0.y, mx, my);
    }
    const a = points[n - 2];
    const b = points[n - 1];
    ctx.quadraticCurveTo(a.x, a.y, b.x, b.y);
    return n;
  }

  function drawTail(points, vel, palette) {
    if (vel < 0.02) return;

    const { primary, secondary, ink } = palette;
    const count = Math.floor(lerp(8, points.length, vel));
    const head = points[0];

    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Tapered segments — each slice gets thinner & fainter toward the tail
    for (let i = 0; i < count - 1; i++) {
      const t = i / (count - 1);
      const p1 = points[i];
      const p2 = points[i + 1];
      const ease = Math.pow(1 - t, 2.4);
      const w = lerp(0.4, 6, 1 - t) * vel;
      const a = ease * 0.5 * vel;

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      const mx = (p1.x + p2.x) / 2;
      const my = (p1.y + p2.y) / 2;
      ctx.quadraticCurveTo(p1.x, p1.y, mx, my);

      // Outer white bloom
      ctx.strokeStyle = `rgba(255, 255, 255, ${a * 0.35})`;
      ctx.lineWidth = w * 2.2;
      ctx.stroke();

      // Brand tint
      ctx.strokeStyle = `rgba(${primary}, ${a * 0.55})`;
      ctx.lineWidth = w * 1.1;
      ctx.stroke();

      // Fine core
      ctx.strokeStyle = `rgba(${ink}, ${a * 0.4})`;
      ctx.lineWidth = Math.max(0.5, w * 0.35);
      ctx.stroke();
    }

    // Full-path soft ribbon (second pass for cohesion)
    ctx.beginPath();
    if (smoothPath(points, count)) {
      const grad = ctx.createLinearGradient(
        head.x,
        head.y,
        points[count - 1].x,
        points[count - 1].y
      );
      grad.addColorStop(0, `rgba(255, 255, 255, ${0.45 * vel})`);
      grad.addColorStop(0.35, `rgba(${primary}, ${0.25 * vel})`);
      grad.addColorStop(0.7, `rgba(${secondary}, ${0.1 * vel})`);
      grad.addColorStop(1, "rgba(255, 255, 255, 0)");

      ctx.strokeStyle = grad;
      ctx.lineWidth = lerp(1.5, 4, vel);
      ctx.shadowColor = "rgba(255, 255, 255, 0.6)";
      ctx.shadowBlur = lerp(2, 12, vel);
      ctx.stroke();
    }

    // Head sparkle
    const spark = ctx.createRadialGradient(head.x, head.y, 0, head.x, head.y, 10 * vel);
    spark.addColorStop(0, `rgba(255, 255, 255, ${0.65 * vel})`);
    spark.addColorStop(0.35, `rgba(${primary}, ${0.2 * vel})`);
    spark.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(head.x, head.y, 10 * vel, 0, Math.PI * 2);
    ctx.fillStyle = spark;
    ctx.fill();

    ctx.restore();
  }

  function drawHoverRing(x, y, r, glow, palette) {
    const { primary } = palette;
    const dark = window.isDarkMode;

    ctx.save();

    // Subtle ambient halo
    const aura = ctx.createRadialGradient(x, y, r * 0.6, x, y, r + 12);
    aura.addColorStop(0, `rgba(${primary}, ${0.1 * glow})`);
    aura.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(x, y, r + 12, 0, Math.PI * 2);
    ctx.fill();

    // Light glass fill
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = dark
      ? `rgba(255, 255, 255, ${0.06 * glow})`
      : `rgba(255, 255, 255, ${0.18 * glow})`;
    ctx.fill();

    // Clean single ring — no heavy shadow
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.lineWidth = 1.25;
    ctx.strokeStyle = `rgba(${primary}, ${0.75 * glow})`;
    ctx.stroke();

    ctx.restore();
  }

  function drawDefaultRing(x, y, r, palette, glow) {
    const { primary, ink } = palette;
    ctx.save();

    const amb = ctx.createRadialGradient(x, y, r * 0.5, x, y, r + 10);
    amb.addColorStop(0, `rgba(${primary}, ${0.12 * glow})`);
    amb.addColorStop(1, `rgba(${primary}, 0)`);
    ctx.fillStyle = amb;
    ctx.beginPath();
    ctx.arc(x, y, r + 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${window.isDarkMode ? 0.04 : 0.12})`;
    ctx.fill();
    ctx.lineWidth = 1.25;
    ctx.strokeStyle = `rgba(${ink}, 0.7)`;
    ctx.stroke();

    ctx.restore();
  }

  function drawDot(x, y, scale, palette) {
    const { primary, ink } = palette;
    const r = 2 * scale;
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 2.5);
    g.addColorStop(0, `rgba(${ink}, 1)`);
    g.addColorStop(0.5, `rgba(${primary}, 0.85)`);
    g.addColorStop(1, `rgba(${primary}, 0)`);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.restore();
  }

  function frame() {
    ctx.clearRect(0, 0, W, H);
    if (!visible) {
      requestAnimationFrame(frame);
      return;
    }

    const palette = colors();
    const ringEase = reducedMotion ? 1 : isHover ? 0.16 : 0.11;
    ring.x = lerp(ring.x, mouse.x, ringEase);
    ring.y = lerp(ring.y, mouse.y, ringEase);

    trail[0].x = ring.x;
    trail[0].y = ring.y;
    for (let i = 1; i < TRAIL_LEN; i++) {
      const k = reducedMotion ? 1 : 0.5 - (i / TRAIL_LEN) * 0.18;
      trail[i].x = lerp(trail[i].x, trail[i - 1].x, k);
      trail[i].y = lerp(trail[i].y, trail[i - 1].y, k);
    }

    speed *= 0.88;
    hoverT = lerp(hoverT, isHover ? 1 : 0, 0.14);
    clickT = lerp(clickT, isClick ? 1 : 0, 0.25);

    drawTail(trail, speed, palette);

    const targetR = isClick ? 6 : isHover ? 11 : 9;
    ringR = lerp(ringR, targetR, 0.2);
    const dotScale = lerp(1, isHover ? 0.85 : 0.65, clickT);

    if (hoverT > 0.04) {
      drawHoverRing(ring.x, ring.y, ringR, hoverT, palette);
    } else {
      drawDefaultRing(ring.x, ring.y, ringR, palette, 1 - hoverT);
    }

    drawDot(mouse.x, mouse.y, dotScale, palette);

    requestAnimationFrame(frame);
  }

  frame();
})();
 
