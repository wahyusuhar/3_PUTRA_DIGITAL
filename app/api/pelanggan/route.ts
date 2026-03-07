import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { nama, wa } = await request.json();

  try {
    // Menyimpan ke database
    await sql`
      INSERT INTO pelanggan (nama, no_whatsapp) 
      VALUES (${nama}, ${wa})
    `;
    return NextResponse.json({ message: "Berhasil" }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error }, { status: 500 });
  }
}