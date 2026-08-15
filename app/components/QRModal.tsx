'use client';

import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { X, Send, AlertTriangle, Check, Copy, Download, Plus } from 'lucide-react';
import { generateUpiUrl, generateExpenseWhatsAppMessage, openWhatsApp } from '../lib/whatsapp';

interface QRModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  description: string;
  personName: string;
  personPhone: string;
  upiId: string;
  payeeName: string;
  onRequestAddPhone?: (personName: string, currentPhone?: string) => void;
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
  onRequestAddPhone,
}: QRModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const upiLink = generateUpiUrl(upiId, payeeName, amount, description);

  useEffect(() => {
    if (isOpen && upiLink && canvasRef.current) {
      QRCode.toCanvas(
        canvasRef.current,
        upiLink,
        {
          width: 240,
          margin: 1.5,
          color: {
            dark: '#0f172a', // slate-900
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

  const handleSendWhatsApp = () => {
    if (!personPhone && onRequestAddPhone) {
      onRequestAddPhone(personName, '');
      return;
    }

    const message = generateExpenseWhatsAppMessage({
      personName,
      amount,
      description,
      upiId,
      payeeName,
    });

    openWhatsApp(personPhone, message);
  };

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(upiLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadQR = () => {
    if (canvasRef.current) {
      const url = canvasRef.current.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `UPI-QR-${personName || 'Payment'}-${amount}.png`;
      a.click();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-sm transform overflow-hidden rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl transition-all">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <h3 className="text-lg font-bold text-white">Payment QR Code</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-white/5 hover:text-white transition-colors cursor-pointer"
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
              Please click the <strong>Settings</strong> icon in the header to set your UPI/GPay ID and Payee Name.
            </p>
          </div>
        ) : (
          <div className="mt-4 flex flex-col items-center">
            {/* Payment Details */}
            <div className="mb-4 text-center">
              <span className="text-3xl font-extrabold text-emerald-400">₹{amount.toFixed(2)}</span>
              <p className="text-xs font-semibold text-slate-300 mt-1 line-clamp-1">
                {description || 'Expense Payment'}
              </p>
              {personName && (
                <div className="flex items-center justify-center gap-1.5 mt-1">
                  <span className="text-xs text-slate-400">For: {personName}</span>
                  {personPhone ? (
                    <span className="text-[11px] text-emerald-400 font-mono">({personPhone})</span>
                  ) : onRequestAddPhone ? (
                    <button
                      onClick={() => onRequestAddPhone(personName, '')}
                      className="text-[10px] text-indigo-400 hover:underline inline-flex items-center gap-0.5 cursor-pointer"
                    >
                      <Plus className="h-2.5 w-2.5" />
                      Add Phone
                    </button>
                  ) : null}
                </div>
              )}
            </div>

            {/* QR Canvas */}
            <div className="relative rounded-2xl bg-white p-4 shadow-inner">
              <canvas ref={canvasRef} className="h-48 w-48" />
            </div>

            {error && (
              <p className="mt-2 text-xs text-red-400">{error}</p>
            )}

            {/* QR Scanner info */}
            <p className="mt-3 text-[11px] text-slate-400 text-center">
              Scan with GPay, PhonePe, Paytm, or any UPI App
            </p>

            {/* Actions */}
            <div className="mt-5 flex w-full flex-col gap-2">
              {/* WhatsApp Action Button */}
              <button
                onClick={handleSendWhatsApp}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-2.5 text-xs font-bold text-white hover:bg-emerald-600 active:scale-98 transition duration-150 cursor-pointer shadow-md shadow-emerald-500/20"
              >
                <Send className="h-3.5 w-3.5" />
                {personPhone ? 'Send via WhatsApp' : 'Send via WhatsApp (Add Phone)'}
              </button>

              <div className="flex gap-2">
                {/* Copy UPI Link */}
                <button
                  onClick={handleCopyLink}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 py-2 text-xs font-medium text-slate-200 hover:bg-white/10 hover:text-white transition duration-150 cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 text-slate-400" />
                      Copy Link
                    </>
                  )}
                </button>

                {/* Download QR Image */}
                <button
                  onClick={handleDownloadQR}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-white/10 hover:text-white transition duration-150 cursor-pointer"
                  title="Download QR Image"
                >
                  <Download className="h-3.5 w-3.5 text-slate-400" />
                  Save Image
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
