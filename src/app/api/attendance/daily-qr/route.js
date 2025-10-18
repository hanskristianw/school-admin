import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { supabaseAdmin } from '@/lib/supabase-updated'

export async function GET(request) {
  try {
    if (!supabaseAdmin) {
      console.error('[daily-qr] No admin client available');
      return NextResponse.json({ error: 'no_admin_client' }, { status: 500 })
    }

    const url = new URL(request.url)
    const requestedDay = url.searchParams.get('day')

    // Determine target weekday (WIB/GMT+7) or use explicit override
    let day
    let dayOfWeek
    let wibTime
    const now = new Date();

    if (requestedDay) {
      const parsed = parseInt(requestedDay, 10)
      console.log('[daily-qr] Requested day override:', requestedDay)
      if (Number.isNaN(parsed) || parsed < 1 || parsed > 7) {
        console.warn('[daily-qr] Invalid requested day:', requestedDay)
        return NextResponse.json({ error: 'invalid_day' }, { status: 400 })
      }
      day = parsed
      // Map back to JS weekday for consistent logging (1=Mon => 1, 7=Sun => 0)
      dayOfWeek = day === 7 ? 0 : day
      wibTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }))
    } else {
      // Use proper timezone conversion when not explicitly requested
      wibTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
      dayOfWeek = wibTime.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
      day = dayOfWeek === 0 ? 7 : dayOfWeek; // Convert to 1=Mon, 7=Sun
    }

    console.log('[daily-qr] Request received');
    console.log('[daily-qr] Server time:', now.toISOString());
    console.log('[daily-qr] WIB time:', wibTime.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }));
    console.log('[daily-qr] Day of week:', dayOfWeek, '(0=Sun, 1=Mon, ...6=Sat)');
    console.log('[daily-qr] Converted day:', day, '(1=Mon, 7=Sun)');
    console.log('[daily-qr] Day name:', ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][dayOfWeek]);

    // Support all 7 days (1=Mon, 7=Sun)
    if (day < 1 || day > 7) {
      console.warn('[daily-qr] Invalid day:', day);
      return NextResponse.json({ error: 'invalid_day' }, { status: 400 })
    }

    // Fetch daily secrets from settings or env
    const secretKey = `ATTENDANCE_SECRET_${['MON','TUE','WED','THU','FRI','SAT','SUN'][day-1]}`
    const dbKey = secretKey.toLowerCase();
    
    console.log('[daily-qr] Looking for secret:', secretKey);
    
    let secret = process.env[secretKey]
    if (secret) {
      console.log('[daily-qr] Secret found in ENV');
    }

    // Fallback: try to fetch from database settings table (if exists)
    if (!secret) {
      console.log('[daily-qr] Checking database for key:', dbKey);
      const { data: setting, error: dbError } = await supabaseAdmin
        .from('settings')
        .select('value')
        .eq('key', dbKey)
        .maybeSingle()
      
      if (dbError) {
        console.error('[daily-qr] Database error:', dbError);
      } else if (setting) {
        secret = setting.value;
        console.log('[daily-qr] Secret found in DB, length:', secret?.length || 0);
      } else {
        console.warn('[daily-qr] No setting found in DB for key:', dbKey);
      }
    }

    if (!secret || secret.trim() === '') {
      console.error('[daily-qr] Secret not configured for', secretKey);
      return NextResponse.json({ error: 'not_configured' }, { status: 500 })
    }

    // Generate static token for this day (HMAC of day number with secret)
    const payload = `daily:${day}`
    const token = crypto.createHmac('sha256', secret).update(payload).digest('hex').slice(0, 16)

    console.log('[daily-qr] Token generated successfully for day', day);
    return NextResponse.json({ token, day })
  } catch (e) {
    console.error('[daily-qr] Unexpected error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
