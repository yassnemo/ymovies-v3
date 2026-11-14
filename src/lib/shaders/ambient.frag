// Ambient background: layered color fields and simplex noise.
// Simplex noise: Ashima Arts / Stefan Gustavson, MIT.
precision highp float;
uniform float uTime;
            uniform vec2 uResolution;
            uniform vec3 uColor0;
            uniform vec3 uColor1;
            uniform vec3 uColor2;
            uniform vec3 uColor3;
            varying vec2 vUv;

            // 3D Simplex perlin noise
            vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
            vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}

            float snoise(vec3 v){
              const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
              const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
              vec3 i  = floor(v + dot(v, C.yyy) );
              vec3 x0 = v - i + dot(i, C.xxx) ;
              vec3 g = step(x0.yzx, x0.xyz);
              vec3 l = 1.0 - g;
              vec3 i1 = min( g.xyz, l.zxy );
              vec3 i2 = max( g.xyz, l.zxy );
              vec3 x1 = x0 - i1 + C.xxx;
              vec3 x2 = x0 - i2 + C.yyy;
              vec3 x3 = x0 - D.yyy;
              i = mod(i, 289.0);
              vec4 p = permute( permute( permute(
                         i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
                       + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
                       + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
              float n_ = 0.142857142857;
              vec3  ns = n_ * D.wyz - D.xzx;
              vec4 j = p - 49.0 * floor(p * ns.z *ns.z);
              vec4 x_ = floor(j * ns.z);
              vec4 y_ = floor(j - 7.0 * x_ );
              vec4 x = x_ *ns.x + ns.yyyy;
              vec4 y = y_ *ns.x + ns.yyyy;
              vec4 h = 1.0 - abs(x) - abs(y);
              vec4 b0 = vec4( x.xy, y.xy );
              vec4 b1 = vec4( x.zw, y.zw );
              vec4 s0 = floor(b0)*2.0 + 1.0;
              vec4 s1 = floor(b1)*2.0 + 1.0;
              vec4 sh = -step(h, vec4(0.0));
              vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
              vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
              vec3 p0 = vec3(a0.xy,h.x);
              vec3 p1 = vec3(a0.zw,h.y);
              vec3 p2 = vec3(a1.xy,h.z);
              vec3 p3 = vec3(a1.zw,h.w);
              vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
              p0 *= norm.x;
              p1 *= norm.y;
              p2 *= norm.z;
              p3 *= norm.w;
              vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
              m = m * m;
              return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
            }

            void main() {
                vec2 p = vUv;
                // Scale UV based on aspect ratio to prevent stretching
                float aspect = uResolution.x / uResolution.y;
                p.x = p.x * aspect;

                float t = uTime * 0.15; // Slow, fluid movement

                // Zoomed-in fluid noise to match the massive, soft waves from the design
                vec2 q;
                q.x = snoise(vec3(p * 1.5, t));
                q.y = snoise(vec3(p * 1.5 + vec2(5.2, 1.3), t * 1.1));

                vec2 r;
                r.x = snoise(vec3(p * 2.5 + q, t * 1.2));
                r.y = snoise(vec3(p * 2.5 + q + vec2(8.3, 2.8), t * 1.3));

                float f = snoise(vec3(p * 1.5 + r, t * 1.5));
                f = (f + 1.0) * 0.5; // normalize to 0..1

                // Color palette from theme (passed as uniforms)
                vec3 c0 = uColor0;
                vec3 c1 = uColor1;
                vec3 c2 = uColor2;
                vec3 c3 = uColor3;

                // Layer the colors smoothly based on fluid noise
                vec3 baseColor = mix(c0, c1, smoothstep(0.0, 0.7, f));
                baseColor = mix(baseColor, c2, smoothstep(0.4, 0.9, f));
                baseColor = mix(baseColor, c3, smoothstep(0.5, 1.0, (q.x + 1.0) * 0.5));

                // Add soft glowing highlights where noise peaks are
                baseColor += c2 * smoothstep(0.7, 1.0, f) * 0.5;

                // Vertical masking for the horizontal wave layout
                // The wave rises and falls gently, fading into black at the bottom
                float waveHeight = 0.3 + sin(p.x * 0.8 + t * 0.5) * 0.15;
                float bottomMask = smoothstep(waveHeight - 0.4, waveHeight + 0.4, vUv.y);

                // Dimming slightly at the absolute top so the brightest part is in the upper middle
                float topMask = smoothstep(1.2, 0.7, vUv.y + sin(p.x * 1.2 - t) * 0.1);

                float mask = bottomMask * topMask;

                // Blend the massive sweeping fluid ribbon out to the pitch black background
                vec3 col = mix(c0, baseColor, mask);

                // Subtle dynamic grain for Grainient premium aesthetic
                float grain = fract(sin(dot(gl_FragCoord.xy + uTime * 10.0, vec2(12.9898, 78.233))) * 43758.5453);
                col += (grain - 0.5) * 0.05;

                gl_FragColor = vec4(col, 1.0);
            }
