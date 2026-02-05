struct VertexInput {
  @location(0) pos: vec3<f32>,
  @location(1) uv: vec2<f32>,
  @location(2) opacity: f32,
};

struct VertexOutput {
  @builtin(position) pos: vec4<f32>,
  @location(0) uv: vec2<f32>,
  @location(1) opacity: f32,
};

@vertex
fn vs_main(in: VertexInput) -> VertexOutput {
  var out: VertexOutput;
  out.pos = vec4<f32>(in.pos.x, in.pos.y, 0.0, in.pos.z);
  out.uv = in.uv;
  out.opacity = in.opacity;
  return out;
}

@group(0) @binding(0) var tex: texture_2d<f32>;
@group(0) @binding(1) var sam: sampler;

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
  return textureSample(tex, sam, in.uv) * in.opacity;
}
