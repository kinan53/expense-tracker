'use client';

import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { X, Send, AlertTriangle, Check, Copy } from 'lucide-react';

interface QRModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  description: string;
  personName: string;
  personPhone: string;
  upiId: string;
  payeeName: string;
}

export default function QRModal({
  isOpen,
  onClose,
  amount,
  description,
  personName,
  personPhone,
  upiId,
  payeeName,
}: QRModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const upiLink = upiId
    ? `upi://pay?pa=${upiId}&pn=${encodeURIComponent(payeeName)}&am=${amount}&cu=INR`
    : '';

  useEffect(() => {
    if (isOpen && upiLink && canvasRef.current) {
      QRCode.toCanvas(
        canvasRef.current,
        upiLink,
        {
          width: 240,
          margin: 1.5,
          color: {
            dark: '#1e293b', // slate-800
            light: '#ffffff',
          },
        },
        (err) => {
          if (err) {
            console.error('Failed to generate QR code', err);
            setError('Failed to generate QR code');
          }
        }
      );
    }
  }, [isOpen, upiLink]);

  if (!isOpen) return null;

  // Clean phone number format for WhatsApp api (requires digits only, including country code)
  const getFormattedPhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    // If it's a 10-digit number, assume Indian country code (+91)
    if (cleaned.length === 10) {
      return `91${cleaned}`;
    }
    return cleaned;
  };

  const getWhatsAppMessage = () => {
    const formattedUpiLink = upiLink;
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
      formattedUpiLink
    )}`;

    return `*Expense Payment Request* 💸

Hi *${personName || 'there'}*,

Please pay *₹${amount.toFixed(2)}* for *"${description}"* using Google Pay / UPI.

👉 *Pay directly by clicking this link:*
${formattedUpiLink}

📷 *Or Scan this QR Code to Pay:*
${qrImageUrl}

Thank you!`;
  };

  const handleSendWhatsApp = () => {
    const phone = getFormattedPhone(personPhone);
    const message = getWhatsAppMessage();
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${phone}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(upiLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-sm transform overflow-hidden rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl transition-all">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <h3 className="text-lg font-bold text-white">GPay QR Payment</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-white/5 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        {!upiId ? (
          <div className="my-6 flex flex-col items-center justify-center text-center">
            <div className="rounded-full bg-amber-500/10 p-3 text-amber-400 ring-4 ring-amber-500/5">
              <AlertTriangle className="h-8 w-8" />
            </div>
            <p className="mt-4 font-semibold text-white">UPI ID Config Missing</p>
            <p className="mt-2 text-xs text-slate-400 px-4">
              Please go to the app <strong>Settings</strong> (gear icon) and configure your GPay/UPI ID and Payee Name first.
            </p>
          </div>
        ) : (
          <div className="mt-4 flex flex-col items-center">
            {/* Payment Details */}
            <div className="mb-4 text-center">
              <span className="text-3xl font-extrabold text-white">₹{amount.toFixed(2)}</span>
              <p className="text-xs font-medium text-indigo-400 mt-1 uppercase tracking-wider">
                For: {description}
              </p>
              {personName && (
                <p className="text-xs text-slate-400 mt-0.5">
                  To: {personName} ({personPhone || 'No Phone'})
                </p>
              )}
            </div>

            {/* QR Canvas */}
            <div className="relative rounded-2xl bg-white p-4 shadow-inner">
              <canvas ref={canvasRef} className="h-48 w-48" />
            </div>

            {/* QR Scanner info */}
            <p className="mt-3 text-[11px] text-slate-400 text-center">
              Scan with GPay, PhonePe, Paytm, or any UPI App
            </p>

            {/* Actions */}
            <div className="mt-6 flex w-full flex-col gap-2.5">
              {personPhone && (
                <button
                  onClick={handleSendWhatsApp}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-white hover:bg-emerald-600 active:scale-98 transition duration-200"
                >
                  <Send className="h-4.5 w-4.5" />
                  Send to WhatsApp
                </button>
              )}

              <button
                onClick={handleCopyLink}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm font-medium text-slate-200 hover:bg-white/10 hover:text-white transition duration-200"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-400" />
                    Copied UPI Link!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 text-slate-400" />
                    Copy UPI Payment Link
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
