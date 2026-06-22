export const runtime = "edge";

export async function POST() {
  return new Response(JSON.stringify({ ok: true, test: "hello" }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
