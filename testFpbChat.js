import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { sendGoogleChatMessage } from './src/lib/googleChat.js';

function buildGoogleChatMessage(type, params) {
  const { fpbNumber, fpbType, appUrl } = params;
  const fmtCurrency = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0);
  const link = appUrl || 'https://manageccs.online/data/fpb';
  
  if (type === 'fpbPendingApproval') {
    return `Hi *${params.approverName}*,\n\nA new Purchase Request Form (FPB) requires your action at the *${params.stepName}* stage.\n\n*FPB Number:* ${fpbNumber}\n*Type:* ${fpbType || '-'}\n*Requested By:* ${params.submitterName}\n*Division:* ${params.division || '-'}\n*Total Amount:* ${fmtCurrency(params.grandTotal)}\n\nPlease review it here: ${link}`;
  }
  return null;
}

async function run() {
  const targetEmail = 'hans@ccs.sch.id'; // the user's test email
  const params = {
    approverName: 'Hans',
    stepName: 'Approval',
    submitterName: 'Budi',
    fpbNumber: '08/YPMS/FPB/VII/2026',
    fpbType: 'Operasional',
    division: 'IT',
    grandTotal: 1500000
  };

  const text = buildGoogleChatMessage('fpbPendingApproval', params);
  console.log('Sending text:', text);

  try {
    await sendGoogleChatMessage(targetEmail, text);
    console.log('Test message successfully sent!');
  } catch (error) {
    console.error('Test script failed:', error.message);
  }
}

run();
