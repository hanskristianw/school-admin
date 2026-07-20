import { NextResponse } from 'next/server';
import { sendGoogleChatMessage } from '@/lib/googleChat';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');

  if (!email) {
    return NextResponse.json({ error: 'Missing email parameter in query string' }, { status: 400 });
  }

  try {
    const text = `Halo! Ini adalah pesan uji coba dari Bot Administrasi Sekolah. Jika Anda menerima pesan ini, artinya integrasi Google Chat sudah berhasil! 🎉`;
    await sendGoogleChatMessage(email, text);
    
    return NextResponse.json({
      success: true,
      message: `Test message sent to ${email}`
    });
  } catch (err) {
    console.error('[TestChat] Error:', err.message);
    return NextResponse.json({
      success: false,
      error: err.message
    }, { status: 500 });
  }
}
