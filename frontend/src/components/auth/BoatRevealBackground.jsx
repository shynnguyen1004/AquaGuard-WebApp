import { useRef, useState, useEffect } from "react";

const BG_SRC = "/images/Aqua_Login_BG.png";

// Sim texture resolution (longest side). Higher = finer waves, more GPU cost.
const SIM_SIZE = 420;
// Stop the render loop this long after the last interaction (waves settled).
const IDLE_TIMEOUT_MS = 5000;
const DROP_INTERVAL_MS = 26;

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

// Wave propagation. sim texture: r = height, g = velocity
const FRAG_UPDATE = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uSim;
uniform vec2 uDelta;
void main() {
  vec4 info = texture2D(uSim, vUv);
  float l = texture2D(uSim, vUv - vec2(uDelta.x, 0.0)).r;
  float r = texture2D(uSim, vUv + vec2(uDelta.x, 0.0)).r;
  float b = texture2D(uSim, vUv - vec2(0.0, uDelta.y)).r;
  float t = texture2D(uSim, vUv + vec2(0.0, uDelta.y)).r;
  float average = (l + r + t + b) * 0.25;
  info.g += (average - info.r) * 1.9;
  info.g *= 0.982;
  info.r += info.g;
  info.r *= 0.996;
  gl_FragColor = info;
}
`;

// Stamp a drop into the height field.
const FRAG_DROP = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uSim;
uniform vec2 uCenter;
uniform float uAspect;
uniform float uRadius;
uniform float uStrength;
const float PI = 3.141592653589793;
void main() {
  vec4 info = texture2D(uSim, vUv);
  vec2 d = vUv - uCenter;
  d.x *= uAspect;
  float dist = length(d);

  float drop = max(0.0, 1.0 - dist / uRadius);
  drop = 0.5 - cos(drop * PI) * 0.5;
  info.r += drop * uStrength;

  gl_FragColor = info;
}
`;

// Refract the photo through the water surface + specular light on wave slopes.
const FRAG_RENDER = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uSim;
uniform sampler2D uHUE;
uniform vec2 uDelta;
uniform vec2 uUvScale;
uniform vec2 uUvOffset;
void main() {
  float hl = texture2D(uSim, vUv - vec2(uDelta.x, 0.0)).r;
  float hr = texture2D(uSim, vUv + vec2(uDelta.x, 0.0)).r;
  float hb = texture2D(uSim, vUv - vec2(0.0, uDelta.y)).r;
  float ht = texture2D(uSim, vUv + vec2(0.0, uDelta.y)).r;
  vec2 grad = vec2(hr - hl, ht - hb);

  vec2 imgUv = vUv * uUvScale + uUvOffset;
  vec2 refracted = imgUv + grad * 0.9;

  vec3 color = texture2D(uHUE, refracted).rgb;

  vec3 normal = normalize(vec3(-grad.x * 4.0, -grad.y * 4.0, 1.0));
  vec3 lightDir = normalize(vec3(-0.35, 0.55, 0.75));
  float spec = pow(max(dot(normal, lightDir), 0.0), 90.0);
  color += spec * 0.45;

  gl_FragColor = vec4(color, 1.0);
}
`;

function compileProgram(gl, fragSrc) {
  const vs = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vs, VERT);
  gl.compileShader(vs);
  const fs = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fs, fragSrc);
  gl.compileShader(fs);
  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(prog) || "Shader link failed");
  }
  return prog;
}

function loadTexture(gl, src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      resolve({ tex, width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = reject;
    img.src = src;
  });
}

function createSimTexture(gl, w, h, type, filter) {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, type, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return tex;
}

export default function BoatRevealBackground({ children }) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const stateRef = useRef(null);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return undefined;

    let destroyed = false;
    const gl =
      canvas.getContext("webgl", { alpha: false, antialias: false }) ||
      canvas.getContext("experimental-webgl", { alpha: false, antialias: false });

    if (!gl) {
      setFallback(true);
      return undefined;
    }

    // Pick a float texture type that supports linear filtering and rendering.
    let simType = null;
    let simFilter = gl.LINEAR;
    const tryType = (type) => {
      const tex = createSimTexture(gl, 4, 4, type, gl.LINEAR);
      const fb = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.deleteFramebuffer(fb);
      gl.deleteTexture(tex);
      return ok;
    };

    const floatExt = gl.getExtension("OES_texture_float");
    const floatLinear = gl.getExtension("OES_texture_float_linear");
    const halfExt = gl.getExtension("OES_texture_half_float");
    const halfLinear = gl.getExtension("OES_texture_half_float_linear");

    if (floatExt && tryType(gl.FLOAT)) {
      simType = gl.FLOAT;
      if (!floatLinear) simFilter = gl.NEAREST;
    } else if (halfExt && tryType(halfExt.HALF_FLOAT_OES)) {
      simType = halfExt.HALF_FLOAT_OES;
      if (!halfLinear) simFilter = gl.NEAREST;
    }

    if (!simType) {
      setFallback(true);
      return undefined;
    }

    let progUpdate;
    let progDrop;
    let progRender;
    try {
      progUpdate = compileProgram(gl, FRAG_UPDATE);
      progDrop = compileProgram(gl, FRAG_DROP);
      progRender = compileProgram(gl, FRAG_RENDER);
    } catch {
      setFallback(true);
      return undefined;
    }

    const quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

    const bindQuad = (prog) => {
      const loc = gl.getAttribLocation(prog, "aPos");
      gl.bindBuffer(gl.ARRAY_BUFFER, quad);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    };

    const state = {
      gl,
      simW: 0,
      simH: 0,
      simTex: [null, null],
      simFb: [null, null],
      simIndex: 0,
      hue: null,
      drops: [],
      lastDropAt: 0,
      lastActivity: performance.now(),
      raf: null,
      running: false,
    };
    stateRef.current = state;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = Math.max(1, Math.round(container.clientWidth * dpr));
      const h = Math.max(1, Math.round(container.clientHeight * dpr));
      // Don't early-return unless sim buffers exist — on HMR remount the canvas
      // keeps its old size but the sim textures still need to be (re)created.
      if (canvas.width === w && canvas.height === h && state.simTex[0]) return;
      canvas.width = w;
      canvas.height = h;

      const aspect = w / h;
      const simW = aspect >= 1 ? SIM_SIZE : Math.max(64, Math.round(SIM_SIZE * aspect));
      const simH = aspect >= 1 ? Math.max(64, Math.round(SIM_SIZE / aspect)) : SIM_SIZE;
      state.simW = simW;
      state.simH = simH;

      for (let i = 0; i < 2; i++) {
        if (state.simTex[i]) gl.deleteTexture(state.simTex[i]);
        if (state.simFb[i]) gl.deleteFramebuffer(state.simFb[i]);
        state.simTex[i] = createSimTexture(gl, simW, simH, simType, simFilter);
        state.simFb[i] = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, state.simFb[i]);
        gl.framebufferTexture2D(
          gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, state.simTex[i], 0
        );
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    };

    // "object-fit: cover" mapping from canvas UV to image UV.
    const coverUv = (imgW, imgH) => {
      const canvasAspect = canvas.width / canvas.height;
      const imgAspect = imgW / imgH;
      let sx = 1;
      let sy = 1;
      if (canvasAspect > imgAspect) {
        sy = imgAspect / canvasAspect;
      } else {
        sx = canvasAspect / imgAspect;
      }
      return { scale: [sx, sy], offset: [(1 - sx) / 2, (1 - sy) / 2] };
    };

    const swap = () => {
      state.simIndex = 1 - state.simIndex;
    };

    const runSimPass = (prog, setUniforms) => {
      const src = state.simTex[state.simIndex];
      const dstFb = state.simFb[1 - state.simIndex];
      gl.useProgram(prog);
      bindQuad(prog);
      gl.bindFramebuffer(gl.FRAMEBUFFER, dstFb);
      gl.viewport(0, 0, state.simW, state.simH);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, src);
      gl.uniform1i(gl.getUniformLocation(prog, "uSim"), 0);
      setUniforms(prog);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      swap();
    };

    const frame = () => {
      state.raf = null;
      if (destroyed) return;

      // Apply queued drops
      while (state.drops.length > 0) {
        const drop = state.drops.shift();
        runSimPass(progDrop, (prog) => {
          gl.uniform2f(gl.getUniformLocation(prog, "uCenter"), drop.x, drop.y);
          gl.uniform1f(gl.getUniformLocation(prog, "uAspect"), state.simW / state.simH);
          gl.uniform1f(gl.getUniformLocation(prog, "uRadius"), drop.radius);
          gl.uniform1f(gl.getUniformLocation(prog, "uStrength"), drop.strength);
        });
      }

      // Wave propagation (2 iterations for livelier water)
      for (let i = 0; i < 2; i++) {
        runSimPass(progUpdate, (prog) => {
          gl.uniform2f(gl.getUniformLocation(prog, "uDelta"), 1 / state.simW, 1 / state.simH);
        });
      }

      // Composite to screen
      gl.useProgram(progRender);
      bindQuad(progRender);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvas.width, canvas.height);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, state.simTex[state.simIndex]);
      gl.uniform1i(gl.getUniformLocation(progRender, "uSim"), 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, state.hue.tex);
      gl.uniform1i(gl.getUniformLocation(progRender, "uHUE"), 1);

      gl.uniform2f(gl.getUniformLocation(progRender, "uDelta"), 1 / state.simW, 1 / state.simH);
      const { scale, offset } = coverUv(state.hue.width, state.hue.height);
      gl.uniform2f(gl.getUniformLocation(progRender, "uUvScale"), scale[0], scale[1]);
      gl.uniform2f(gl.getUniformLocation(progRender, "uUvOffset"), offset[0], offset[1]);

      gl.drawArrays(gl.TRIANGLES, 0, 3);

      if (performance.now() - state.lastActivity < IDLE_TIMEOUT_MS) {
        state.raf = requestAnimationFrame(frame);
      } else {
        state.running = false;
      }
    };

    const wake = () => {
      state.lastActivity = performance.now();
      if (!state.running && state.hue) {
        state.running = true;
        state.raf = requestAnimationFrame(frame);
      }
    };

    state.wake = wake;

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    loadTexture(gl, BG_SRC)
      .then((hue) => {
        if (destroyed) return;
        state.hue = hue;
        wake();
      })
      .catch(() => setFallback(true));

    return () => {
      destroyed = true;
      ro.disconnect();
      if (state.raf) cancelAnimationFrame(state.raf);
      stateRef.current = null;
    };
  }, []);

  const queueDrop = (e, strength, radius) => {
    const state = stateRef.current;
    const container = containerRef.current;
    if (!state || !container) return;

    const now = performance.now();
    if (strength < 0.1 && now - state.lastDropAt < DROP_INTERVAL_MS) return;
    state.lastDropAt = now;

    const rect = container.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = 1 - (e.clientY - rect.top) / rect.height;

    state.drops.push({ x, y, radius, strength });
    if (state.drops.length > 24) state.drops.splice(0, state.drops.length - 24);
    state.wake?.();
  };

  const handleMouseMove = (e) => queueDrop(e, 0.05, 0.022);
  const handleClick = (e) => queueDrop(e, 0.22, 0.035);

  if (fallback) {
    return (
      <div ref={containerRef} className="relative w-full h-full overflow-hidden">
        <img
          src={BG_SRC}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none"
          draggable={false}
        />
        <div className="absolute inset-0 bg-background-dark/25 pointer-events-none" aria-hidden="true" />
        {children}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden"
      onMouseMove={handleMouseMove}
      onClick={handleClick}
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      <div className="absolute inset-0 bg-background-dark/25 pointer-events-none" aria-hidden="true" />
      {children}
    </div>
  );
}
