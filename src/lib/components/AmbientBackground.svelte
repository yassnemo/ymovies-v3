<script lang="ts">
  import { onMount } from 'svelte';
  import { useApp } from '#lib/state.ts';
  import fragment from '#lib/shaders/ambient.frag?raw';
  const { preferences } = useApp();
  let canvas = $state<HTMLCanvasElement>(null!);
  onMount(() => {
    const gl = canvas.getContext('webgl', {
      alpha: false,
      antialias: false,
      powerPreference: 'low-power'
    });
    if (!gl) return;
    function shader(type: number, source: string) {
      const shader = gl!.createShader(type)!;
      gl!.shaderSource(shader, source);
      gl!.compileShader(shader);
      if (!gl!.getShaderParameter(shader, gl!.COMPILE_STATUS)) {
        gl!.deleteShader(shader);
        return null;
      }
      return shader;
    }
    const vert = shader(
      gl.VERTEX_SHADER,
      'attribute vec2 position;varying vec2 vUv;void main(){vUv=position*.5+.5;gl_Position=vec4(position,0.,1.);}'
    );
    const frag = shader(gl.FRAGMENT_SHADER, fragment);
    if (!vert || !frag) return;
    const program = gl.createProgram()!;
    gl.attachShader(program, vert);
    gl.attachShader(program, frag);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );
    const position = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const resolution = gl.getUniformLocation(program, 'uResolution');
    const time = gl.getUniformLocation(program, 'uTime');
    [
      [0.01, 0.035, 0.02],
      [0.13, 0.42, 0.12],
      [0.42, 0.72, 0.14],
      [0.55, 0.95, 0.32]
    ].forEach((color, index) =>
      gl.uniform3fv(gl.getUniformLocation(program, 'uColor' + index), color)
    );
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    let last = 0;
    const origin = performance.now();
    function resize() {
      if (!canvas) return;
      const ratio = Math.min(devicePixelRatio, 1.25);
      canvas.width = Math.round(innerWidth * ratio);
      canvas.height = Math.round(innerHeight * ratio);
      gl!.viewport(0, 0, canvas.width, canvas.height);
      gl!.uniform2f(resolution, canvas.width, canvas.height);
    }
    function draw(now: number) {
      frame = requestAnimationFrame(draw);
      if (document.hidden || now - last < 40) return;
      last = now;
      gl!.uniform1f(
        time,
        motion.matches || $preferences.appSettings.reduceMotion
          ? 0
          : (now - origin) * 0.001
      );
      gl!.drawArrays(gl!.TRIANGLES, 0, 6);
    }
    resize();
    frame = requestAnimationFrame(draw);
    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vert);
      gl.deleteShader(frag);
    };
  });
</script>

<div class="ambient-background" aria-hidden="true">
  <canvas bind:this={canvas}></canvas>
</div>
