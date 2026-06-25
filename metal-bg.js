/* ===== M&T Services — animated liquid black-metal background =====
   Real-time WebGL shader: molten obsidian / dark mercury, slow hypnotic drift,
   silver + steel-blue specular highlights, drifting metallic flecks.
   Low motion, locked-off, seamless (continuous — no loop seam).
   Falls back silently to the CSS gradient on .bg-fx if WebGL is unavailable. */
(function () {
  var canvas = document.getElementById("metal-bg");
  if (!canvas) return;
  var gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
  if (!gl) return; // CSS gradient on .bg-fx remains as fallback

  var VERT = "attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }";

  var FRAG = [
    "precision highp float;",
    "uniform vec2 u_res;",
    "uniform float u_time;",
    "float hash(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }",
    "float noise(vec2 p){",
    "  vec2 i=floor(p), f=fract(p);",
    "  float a=hash(i), b=hash(i+vec2(1.0,0.0)), c=hash(i+vec2(0.0,1.0)), d=hash(i+vec2(1.0,1.0));",
    "  vec2 u=f*f*(3.0-2.0*f);",
    "  return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);",
    "}",
    "float fbm(vec2 p){",
    "  float v=0.0, a=0.5;",
    "  for(int i=0;i<5;i++){ v+=a*noise(p); p*=2.0; a*=0.5; }",
    "  return v;",
    "}",
    "void main(){",
    "  vec2 uv=(gl_FragCoord.xy - 0.5*u_res)/u_res.y;",
    "  float t=u_time*0.045;",                       // LOW motion
    "  vec2 q=vec2(fbm(uv*1.4 + vec2(0.0,t)), fbm(uv*1.4 + vec2(5.2,-t)));",
    "  vec2 r=vec2(fbm(uv*1.4 + 2.0*q + vec2(1.7,9.2)+0.12*t), fbm(uv*1.4 + 2.0*q + vec2(8.3,2.8)-0.10*t));",
    "  vec2 w=uv*1.4 + 2.4*r;",
    "  float h=fbm(w);",
    "  float e=0.0025;",
    "  vec2 grad=vec2(fbm(w+vec2(e,0.0))-h, fbm(w+vec2(0.0,e))-h)/e;",
    "  vec3 n=normalize(vec3(-grad*0.18, 1.0));",
    "  vec3 L=normalize(vec3(0.55*sin(t*1.1), 0.45+0.15*cos(t*0.7), 0.85));",
    "  vec3 V=vec3(0.0,0.0,1.0);",
    "  vec3 H=normalize(L+V);",
    "  float spec=pow(max(dot(n,H),0.0), 30.0);",
    "  float spec2=pow(max(dot(n,H),0.0), 8.0)*0.25;",
    "  float fres=pow(1.0-max(dot(n,V),0.0), 3.0);",
    "  vec3 base=mix(vec3(0.008,0.010,0.016), vec3(0.035,0.042,0.058), smoothstep(0.15,0.85,h));",
    "  vec3 silver=vec3(0.80,0.84,0.92);",
    "  vec3 steel=vec3(0.42,0.52,0.68);",
    "  vec3 col=base + (spec+spec2)*silver*0.9 + fres*steel*0.20;",
    "  float fl=hash(floor((uv+vec2(t*0.08,t*0.05))*820.0));",
    "  fl=step(0.9965, fl)*(0.5+0.5*sin(t*5.0+fl*60.0));",
    "  col+=fl*vec3(0.6,0.66,0.78);",
    "  float vig=smoothstep(1.35,0.15,length(uv));",
    "  col*=mix(0.55,1.0,vig);",
    "  col=pow(max(col,0.0), vec3(0.92));",          // gentle contrast
    "  gl_FragColor=vec4(col, 1.0);",
    "}"
  ].join("\n");

  function compile(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { return null; }
    return s;
  }
  var vs = compile(gl.VERTEX_SHADER, VERT);
  var fs = compile(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return;
  var prog = gl.createProgram();
  gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  gl.useProgram(prog);

  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(prog, "p");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  var uRes = gl.getUniformLocation(prog, "u_res");
  var uTime = gl.getUniformLocation(prog, "u_time");

  var SCALE = 0.7; // internal render scale (softer + faster)
  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5) * SCALE;
    var w = Math.max(2, Math.floor(window.innerWidth * dpr));
    var h = Math.max(2, Math.floor(window.innerHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w; canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
    gl.uniform2f(uRes, w, h);
  }
  window.addEventListener("resize", resize, { passive: true });
  resize();

  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var running = true;
  document.addEventListener("visibilitychange", function () { running = !document.hidden; if (running) loop(0); });

  var start = performance.now();
  function draw(now) {
    resize();
    gl.uniform1f(uTime, (now - start) / 1000);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  function loop(now) {
    if (!running) return;
    draw(now);
    requestAnimationFrame(loop);
  }
  if (reduce) { draw(8000); }      // single static frame, no motion
  else { requestAnimationFrame(loop); }
})();
