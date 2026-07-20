import { sendGoogleChatMessage } from './src/lib/googleChat.js';

async function run() {
  // Ganti email di bawah ini dengan email guru siapa pun yang ingin Anda tes!
  const targetEmail = 'merry.inggarwati@ccs.sch.id';

  console.log(`Attempting to send test DM to: ${targetEmail}`);

  try {
    await sendGoogleChatMessage(
      targetEmail,
      `Halo! Ini pesan tes otomatis dari bot absensi untuk ${targetEmail}! 🎉`
    );
    console.log('Test message successfully sent!');
  } catch (error) {
    console.error('Test script failed:', error.message);
  }
}

run();
