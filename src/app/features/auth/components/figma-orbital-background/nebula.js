// Efecto exportado del diseño SUIC.
export function setup(device, frame) {
    var wgsl = `
diagnostic(off,derivative_uniformity);

struct Uniforms {
  travel: vec4f,
  colorA: vec4f,
  colorB: vec4f,
  colorC: vec4f,
  starDensity: vec4f,
  brightness: vec4f,
  seed: vec4f,
  center: vec4f,
};

@group(0) @binding(0) var<uniform> u: Uniforms;

struct VsIn {
  @location(0) pos: vec2f,
  @location(1) uv: vec2f,
};
struct VsOut {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
};

fn N11(n: f32) -> f32 {
  var v1 = vec2f(fract(n*129.3484), fract(n*10.2347+1.4948));
  var v2 = vec2f(49.256, n);
  return fract(dot(v1,v2));
}

fn N12(n: f32) -> vec2f {
  var v1 = vec2f(fract(n*33.24102+1.2847), fract(n*4.70234556-2.5856));
  var v2 = vec2f(39.3823+n, n*3.1938+1.4028);
  return vec2f(fract(dot(v1,v2)), N11(dot(v1,v2)));
}

fn N22(p: vec2f) -> vec2f {
  return vec2f(N11(4.238+p.y+p.x*0.6274), N11(3.4148*p.y-8.29*p.x+1.39558));
}

fn perlin(p: vec2f, scale: f32, seed: f32) -> f32 {
  var pS = p * scale;
  var X1 = floor(p.x * scale);
  var X2 = X1 + 1.0;
  var Y1 = floor(p.y * scale);
  var Y2 = Y1 + 1.0;
  var v11 = vec2f(X1, Y1);
  var gpUnfaded = pS - v11;
  var xCub = pow(gpUnfaded.x, 3.0);
  var yCub = pow(gpUnfaded.y, 3.0);
  var gp = vec2f(
    (6.0*gpUnfaded.x*gpUnfaded.x - 15.0*gpUnfaded.x + 10.0)*xCub,
    (6.0*gpUnfaded.y*gpUnfaded.y - 15.0*gpUnfaded.y + 10.0)*yCub
  );
  var v12 = vec2f(X1, Y2);
  var v21 = vec2f(X2, Y1);
  var v22 = vec2f(X2, Y2);
  var d11 = gp - v11;
  var d12 = gp - v12;
  var d21 = gp - v21;
  var d22 = gp - v22;
  var fact = 1.394 + seed;
  var g11 = (N22(v11*fact) - 0.5) * 2.0;
  var g12 = (N22(v12*fact) - 0.5) * 2.0;
  var g21 = (N22(v21*fact) - 0.5) * 2.0;
  var g22 = (N22(v22*fact) - 0.5) * 2.0;
  var contribY1 = mix(g11, g21, gp.x);
  var contribY2 = mix(g12, g22, gp.x);
  var contrib = mix(contribY1, contribY2, gp.y);
  var value = dot(d11, contrib) + dot(d12, contrib) - dot(d21, contrib) - dot(d22, contrib);
  return mix(0.0, 1.0, value);
}

fn starColorFn(p: vec2f, id: f32, radius: f32) -> vec3f {
  var center = N12(id) - 0.5;
  var color = vec3f(1.0, 1.0, 1.0);
  var v = center - p;
  var dist = length(v);
  var angle = abs(sqrt(abs(v.x*v.y))) * 5.0;
  var star = smoothstep(radius*0.3, radius*0.25, dist);
  var halo = smoothstep(radius*1.2, 0.0, dist) * (0.7 + 0.5 * 0.3);
  var scint = smoothstep(1.0, 0.0, angle) * halo * (0.7 + 0.5 * 0.3);
  return star*vec3f(1.0, 1.0, 1.0) + (scint+halo)*color;
}

fn layerColor(uv: vec2f, layerIndex: f32, scale: f32, starDensity: f32, layerVisible: f32) -> vec3f {
  var uvScaled = uv * scale;
  var uvCell = uvScaled * 10.0;
  let seed = 2.309387 + layerIndex * 1.283374;
  let baseCellFloor = floor(uvCell);
  let baseFrac = fract(uvCell);
  // density=0 → ~zero stars, density=1 → sparse but clearly visible stars (0.5% of cells bright)
  // Wide range + narrow window so the slider has clear visual effect
  let densityThreshold = 0.9999 - starDensity * 0.0999;
  let sizeGrowth = smoothstep(0.0, 0.6, layerVisible);

  var col = vec3f(0.0);
  for (var dx: f32 = -1.0; dx <= 1.0; dx += 1.0) {
    for (var dy: f32 = -1.0; dy <= 1.0; dy += 1.0) {
      let cellFloor = baseCellFloor + vec2f(dx, dy);
      let id = seed * 1.4983 * cellFloor.y + 5.39283 * cellFloor.x;
      let radius = mix(0.1, 0.5, N11(id * 3.82918));
      let effectiveRadius = radius * sizeGrowth;
      let cellVisible = smoothstep(densityThreshold - 0.008, densityThreshold, N11(id * 19.10982));
      // Pixel position relative to this neighbor cell's [-1,1] space
      let gv = (baseFrac - vec2f(dx, dy)) * 2.0 - 1.0;
      let sc = starColorFn(gv, id, effectiveRadius);
      col += sc * cellVisible;
    }
  }
  return col;
}

fn nebula(uv: vec2f, scale: f32, seed: f32, colorA: vec4f, colorB: vec4f, colorC: vec4f) -> vec3f {
  var uvS = uv * scale;
  var blendAB = clamp(perlin(uvS, scale*0.5, seed+10.0), 0.0, 1.0);
  var blendC  = clamp(perlin(uvS, scale*0.3, seed+20.0), 0.0, 1.0);
  var cA = colorA.rgb * colorA.a;
  var cB = colorB.rgb * colorB.a;
  var cC = colorC.rgb * colorC.a;
  var color = mix(mix(cA, cB, blendAB), cC, blendC);
  var valPerlin = perlin(uvS, scale, seed) + 0.6*perlin(uvS, 5.0*scale, seed) + 0.3*perlin(uvS, 7.0*scale, seed);
  var colNebul = smoothstep(-1.0, 1.0, valPerlin) * color * 0.12 * (0.2 + 0.2*length(uvS));
  return colNebul;
}

@vertex fn vs_main(in: VsIn) -> VsOut {
  var out: VsOut;
  out.position = vec4f(in.pos, 0.0, 1.0);
  out.uv = in.uv;
  return out;
}

@fragment fn fs_main(in: VsOut) -> @location(0) vec4f {
  var progress = u.travel.x;
  var aspect = u.travel.y;
  var nbLayers = 20.0;
  var colorA = u.colorA;
  var colorB = u.colorB;
  var colorC = u.colorC;
  var starDensity = u.starDensity.x;
  var globalSeed = u.seed.x;

  // Map progress [0,1] through exactly one full loop period so output is identical at 0 and 1
  var widthMod = nbLayers * 0.5 + 0.5;
  var travel = progress * widthMod;

  // Reconstruct aspect-corrected UV centered at origin, then offset by center point
  var uv = (in.uv * 2.0) - 1.0;
  uv.x *= aspect;
  let cx = u.center.x;
  let cy = u.center.y;
  uv -= vec2f((cx - 50.0) / 50.0 * aspect, (cy - 50.0) / 50.0);

  var col = vec3f(0.0);
  var stepSize = 0.5;
  var width = nbLayers * stepSize;
  for (var i: f32 = 1.0; i < nbLayers; i += 1.0) {
    var raw = width - (travel + i);
    var posI = raw - widthMod * floor(raw / widthMod);
    var scale = posI;
    var visible = clamp(2.0 - abs(posI - 2.0), 0.0, 1.0);
    // Offset by globalSeed to randomize the look; loop still seamless since seed is constant
    let depthSlice = i + globalSeed * 37.0;
    // Per-layer UV offset (fixed per layer, contributes to seamless loop)
    let phaseX = N11(depthSlice * 13.7841 + 1.234) - 0.5;
    let phaseY = N11(depthSlice * 7.2193 + 5.678) - 0.5;
    let uvStaggered = uv + vec2f(phaseX, phaseY) * 0.1;
    let layerAngle = N11(depthSlice * 5.1234 + 3.7) * 0.785;
    let cosA = cos(layerAngle);
    let sinA = sin(layerAngle);
    let uvRotated = vec2f(
        uvStaggered.x * cosA - uvStaggered.y * sinA,
        uvStaggered.x * sinA + uvStaggered.y * cosA
    );
    var nebulVal = nebula(uv, scale, depthSlice, colorA, colorB, colorC) * 0.7;
    col += visible * (layerColor(uvRotated, depthSlice, scale, starDensity, visible) + nebulVal);
  }

  let brightness = u.brightness.x;
  return vec4f(col * brightness, 1.0);
}
`;
    frame.state.module = device.createShaderModule({ code: wgsl });
    frame.state.pipeline = null;
    frame.state.pipelineFormat = null;
    frame.state.quad = device.createBuffer({
        size: 6 * 4 * 4,
        usage: GPUBufferUsage.VERTEX,
        mappedAtCreation: true,
    });
    new Float32Array(frame.state.quad.getMappedRange()).set([
        -1, -1, 0, 1,
        1, -1, 1, 1,
        -1, 1, 0, 0,
        -1, 1, 0, 0,
        1, -1, 1, 1,
        1, 1, 1, 0,
    ]);
    frame.state.quad.unmap();
    // Uniforms layout (128 bytes = 8×vec4f):
    // [0]  travel.x, aspect.y, 0, 0
    // [1]  colorA.rgba
    // [2]  colorB.rgba
    // [3]  colorC.rgba
    // [4]  starDensity.x, 0, 0, 0
    // [5]  brightness.x, 0, 0, 0
    // [6]  seed.x, 0, 0, 0
    // [7]  center.x, center.y, 0, 0
    frame.state.uniformBuf = device.createBuffer({
        size: 128,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
}
export function render(device, frame) {
    var travel = frame.params.travel;
    var aspect = frame.output.width / frame.output.height;
    var cA = frame.params.colorA;
    var cB = frame.params.colorB;
    var cC = frame.params.colorC;
    var starDensity = frame.params.starDensity;
    var brightness = frame.params.brightness;
    var seed = frame.params.seed;
    var center = frame.params.center;
    device.queue.writeBuffer(frame.state.uniformBuf, 0, new Float32Array([
        travel, aspect, 0, 0,
        cA.r, cA.g, cA.b, cA.a,
        cB.r, cB.g, cB.b, cB.a,
        cC.r, cC.g, cC.b, cC.a,
        starDensity, 0, 0, 0,
        brightness, 0, 0, 0,
        seed, 0, 0, 0,
        center.x, center.y, 0, 0,
    ]));
    var outputFormat = frame.output.format;
    if (frame.state.pipeline == null || frame.state.pipelineFormat !== outputFormat) {
        frame.state.pipeline = device.createRenderPipeline({
            layout: 'auto',
            vertex: {
                module: frame.state.module,
                entryPoint: 'vs_main',
                buffers: [{
                        arrayStride: 16,
                        attributes: [
                            { shaderLocation: 0, format: 'float32x2', offset: 0 },
                            { shaderLocation: 1, format: 'float32x2', offset: 8 },
                        ],
                    }],
            },
            fragment: {
                module: frame.state.module,
                entryPoint: 'fs_main',
                targets: [{ format: outputFormat }],
            },
            primitive: { topology: 'triangle-list' },
        });
        frame.state.pipelineFormat = outputFormat;
    }
    var bindGroup = device.createBindGroup({
        layout: frame.state.pipeline.getBindGroupLayout(0),
        entries: [
            { binding: 0, resource: { buffer: frame.state.uniformBuf } },
        ],
    });
    var encoder = device.createCommandEncoder();
    var pass = encoder.beginRenderPass({
        colorAttachments: [{
                view: frame.output.createView(),
                loadOp: 'clear',
                clearValue: { r: 0, g: 0, b: 0, a: 1 },
                storeOp: 'store',
            }],
    });
    pass.setPipeline(frame.state.pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.setVertexBuffer(0, frame.state.quad);
    pass.draw(6);
    pass.end();
    device.queue.submit([encoder.finish()]);
}
