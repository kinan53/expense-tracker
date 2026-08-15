export const formatPhoneNumberForWhatsApp = (phone: string): string => {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  // If it's a standard 10-digit number without country code, assume +91 (India)
  if (cleaned.length === 10) {
    return `91${cleaned}`;
  }
  return cleaned;
};

export const generateUpiUrl = (
  upiId: string,
  payeeName: string,
  amount: number,
  note?: string
): string => {
  if (!upiId) return '';
  const safePayee = encodeURIComponent(payeeName || 'Expense Tracker');
  const safeNote = note ? `&tn=${encodeURIComponent(note)}` : '';
  const formattedAmount = Number(amount).toFixed(2);
  return `upi://pay?pa=${upiId}&pn=${safePayee}&am=${formattedAmount}&cu=INR${safeNote}`;
};

export const generateQrImageUrl = (upiUrl: string): string => {
  if (!upiUrl) return '';
  return `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
    upiUrl
  )}`;
};

export const generateExpenseWhatsAppMessage = (params: {
  personName: string;
  amount: number;
  description: string;
  upiId: string;
  payeeName: string;
}): string => {
  const { personName, amount, description, upiId, payeeName } = params;
  const upiUrl = generateUpiUrl(upiId, payeeName, amount, description);
  const qrUrl = generateQrImageUrl(upiUrl);

  let msg = `*Payment Reminder* 💸\n\n`;
  msg += `Hi *${personName || 'there'}*,\n\n`;
  msg += `Please pay *₹${Number(amount).toFixed(2)}* for *"${description}"* via Google Pay / UPI.\n\n`;

  if (upiUrl) {
    msg += `👉 *Pay directly by clicking this UPI link:*\n${upiUrl}\n\n`;
    msg += `📷 *Or scan this QR code:*\n${qrUrl}\n\n`;
  }

  msg += `Thank you!`;
  return msg;
};

export const generatePersonSummaryWhatsAppMessage = (params: {
  personName: string;
  totalPending: number;
  expenses: Array<{
    description: string;
    amount: number;
    created_at: string;
    status: string;
    direction?: string;
  }>;
  upiId: string;
  payeeName: string;
  direction?: 'owes_me' | 'i_owe';
}): string => {
  const { personName, totalPending, expenses, upiId, payeeName, direction = 'owes_me' } = params;

  if (direction === 'i_owe') {
    let msg = `*Payment Settlement Details* 📝\n\n`;
    msg += `Hi *${personName || 'there'}*,\n\n`;
    msg += `Here are the details for the amount I owe you:\n\n`;

    const pendingItems = expenses.filter((e) => e.status === 'pending');
    if (pendingItems.length > 0) {
      msg += `📋 *Pending Entries:*\n`;
      pendingItems.forEach((item, idx) => {
        let dateStr = '';
        try {
          dateStr = new Date(item.created_at).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
          });
        } catch {
          dateStr = '';
        }
        msg += `${idx + 1}. *${item.description}* - ₹${Number(item.amount).toFixed(2)}${dateStr ? ` (${dateStr})` : ''}\n`;
      });
      msg += `\n`;
    }

    msg += `💰 *Total Pending: ₹${Number(totalPending).toFixed(2)}*\n\n`;
    msg += `Please let me know your preferred payment method / UPI ID. Thank you!`;
    return msg;
  }

  // Receivables message (they owe you)
  const upiUrl = generateUpiUrl(
    upiId,
    payeeName,
    totalPending,
    `Settlement for ${personName}`
  );
  const qrUrl = generateQrImageUrl(upiUrl);

  let msg = `*Expense Settlement Reminder* 💸\n\n`;
  msg += `Hi *${personName || 'there'}*,\n\n`;
  msg += `Here is the summary of your pending balance with me:\n\n`;

  const pendingItems = expenses.filter((e) => e.status === 'pending');
  if (pendingItems.length > 0) {
    msg += `📋 *Breakdown of Pending Items:*\n`;
    pendingItems.forEach((item, idx) => {
      let dateStr = '';
      try {
        dateStr = new Date(item.created_at).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
        });
      } catch {
        dateStr = '';
      }
      msg += `${idx + 1}. *${item.description}* - ₹${Number(item.amount).toFixed(2)}${dateStr ? ` (${dateStr})` : ''}\n`;
    });
    msg += `\n`;
  }

  msg += `💰 *Total Pending Amount: ₹${Number(totalPending).toFixed(2)}*\n\n`;

  if (upiUrl) {
    msg += `👉 *Pay directly by clicking this UPI link:*\n${upiUrl}\n\n`;
    msg += `📷 *Or scan this QR Code to pay:*\n${qrUrl}\n\n`;
  }

  msg += `Please settle whenever convenient. Thank you! 🙏`;
  return msg;
};

export const openWhatsApp = (phone: string, message: string): void => {
  const formattedPhone = formatPhoneNumberForWhatsApp(phone);
  const encodedMessage = encodeURIComponent(message);
  const url = formattedPhone
    ? `https://wa.me/${formattedPhone}?text=${encodedMessage}`
    : `https://wa.me/?text=${encodedMessage}`;
  window.open(url, '_blank');
};
