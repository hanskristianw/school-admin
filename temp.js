import { sendGoogleChatMessage } from './src/lib/googleChat.js';

async function run() {
  try {
    await sendGoogleChatMessage('hans@ccs.sch.id', 'Testing DM after setup modification!');
    console.log('Success!');
  } catch (error) {
    console.error('Failed:', error);
  }
}

run();
