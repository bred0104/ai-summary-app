// import { NextResponse } from 'next/server';

// export async function GET() {
//   return NextResponse.json({
//     ok: true,
//     message: "Next.js backend is running"
//   });
// }

export async function GET() {
  return Response.json({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? "set" : "missing",
    supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "set" : "missing",
    deepseekKey: process.env.DEEPSEEK_API_KEY ? "set" : "missing",
  });
}