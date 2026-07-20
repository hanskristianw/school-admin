import { google } from 'googleapis';

function getPrivateKey() {
  let pk = process.env.GOOGLE_CHAT_PRIVATE_KEY || '';
  if (pk.includes('\\n')) pk = pk.replace(/\\n/g, '\n');
  return pk;
}

function getCredentials() {
  const clientEmail = process.env.GOOGLE_CHAT_CLIENT_EMAIL;
  const privateKey = getPrivateKey();

  if (!clientEmail || !privateKey) {
    throw new Error('Google Chat credentials are not configured in .env.local');
  }

  return { client_email: clientEmail, private_key: privateKey };
}

/**
 * Resolves an email address to a numeric Google User ID using the Admin SDK.
 * Requires Domain-Wide Delegation.
 */
async function getUserIdByEmail(userEmail) {
  const adminEmail = process.env.GOOGLE_WORKSPACE_ADMIN_EMAIL;
  if (!adminEmail) {
    throw new Error('GOOGLE_WORKSPACE_ADMIN_EMAIL is not configured in .env.local');
  }

  const auth = new google.auth.GoogleAuth({
    credentials: getCredentials(),
    scopes: ['https://www.googleapis.com/auth/admin.directory.user.readonly'],
    clientOptions: {
      subject: adminEmail, // Impersonate the admin to read directory
    },
  });

  const admin = google.admin({ version: 'directory_v1', auth });

  try {
    const response = await admin.users.get({
      userKey: userEmail,
      projection: 'basic',
    });
    
    return response.data.id;
  } catch (error) {
    console.error(`[AdminSDK] Failed to get user ID for ${userEmail}:`, error?.response?.data?.error?.message || error.message);
    throw new Error(`User not found in Workspace Directory: ${userEmail}`);
  }
}

export async function sendGoogleChatMessage(userEmail, text) {
  try {
    // 1. Resolve email to Numeric User ID
    const userId = await getUserIdByEmail(userEmail);
    console.log(`[GoogleChat] Resolved ${userEmail} to ID: ${userId}`);

    // 2. We must initialize the DM Space. Google Chat API doesn't allow Bots to proactively start DMs 
    // unless the user has messaged the bot first. To bypass this, we impersonate the user using 
    // Domain-Wide Delegation and make the user "start" the DM with the bot.
    const userAuth = new google.auth.GoogleAuth({
      credentials: getCredentials(),
      scopes: ['https://www.googleapis.com/auth/chat.spaces'],
      clientOptions: {
        subject: userEmail, // Impersonate the target teacher!
      },
    });

    const userChat = google.chat({ version: 'v1', auth: userAuth });
    let spaceName;

    try {
      const setupRes = await userChat.spaces.setup({
        requestBody: {
          space: {
            spaceType: 'DIRECT_MESSAGE',
            singleUserBotDm: true
          }
        }
      });
      spaceName = setupRes.data.name;
      console.log(`[GoogleChat] Space setup successful via impersonation: ${spaceName}`);
    } catch (setupErr) {
      console.error(`[GoogleChat] Could not setup DM space impersonating ${userEmail}:`, setupErr.response?.data?.error?.message || setupErr.message);
      throw new Error(`Failed to initialize DM. Ensure Domain-Wide Delegation includes chat.spaces scope. (${setupErr.message})`);
    }

    // 3. Now that the space exists, the Bot can send a message to it using its own App Authentication.
    const botAuth = new google.auth.GoogleAuth({
      credentials: getCredentials(),
      scopes: ['https://www.googleapis.com/auth/chat.bot'],
    });

    const botChat = google.chat({ version: 'v1', auth: botAuth });

    await botChat.spaces.messages.create({
      parent: spaceName,
      requestBody: {
        text: text,
      }
    });

    console.log(`[GoogleChat] Successfully sent DM to ${userEmail}`);
    return true;
  } catch (error) {
    console.error(`[GoogleChat] Failed to send message to ${userEmail}:`, error?.response?.data?.error?.message || error.message);
    throw error;
  }
}
