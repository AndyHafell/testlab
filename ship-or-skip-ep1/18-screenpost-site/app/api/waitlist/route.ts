import { NextResponse } from "next/server";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  let body: { email?: unknown; source?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: "Please enter a valid email address." },
      { status: 400 },
    );
  }

  const source = typeof body.source === "string" ? body.source : "unknown";

  // TODO: Persist the signup. This stub keeps the site runnable with zero
  // credentials. To go live, wire one of these in here:
  //   • Resend audiences / a transactional welcome email
  //   • ConvertKit / Beehiiv / Mailchimp form API
  //   • Supabase / Postgres `waitlist` table insert
  console.log(`[waitlist] new signup: ${email} (source: ${source})`);

  return NextResponse.json({ ok: true });
}
