'use client';

import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { X, Send, Copy, Download, Check, AlertCircle } from 'lucide-react';
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
  onOpenSettings?: () => void;
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
  onOpenSettings,
}: QRModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);

  const upiLink = generateUpiUrl(upiId, payeeName, amount, description);

  useEffect(() => {
    if (isOpen && upiLink && canvasRef.current) {
      QRCode.toCanvas(
        canvasRef.current,
        upiLink,
        {
          width: 220,
          margin: 1.5,
          color: {
            dark: '#000000',
            light: '#ffffff',
          },
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
    if (navigator.clipboard && upiLink) {
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-xs transition-opacity p-0 sm:p-4">
      {/* Backdrop tap to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal / Bottom Sheet */}
      <div className="relative w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl border border-white/10 bg-[#12141a] p-5 sm:p-6 shadow-2xl safe-area-bottom z-10 max-h-[90dvh] overflow-y-auto no-scrollbar">
        {/* Mobile handle indicator */}
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
          <h3 className="text-sm font-semibold tracking-tight text-white">
            Payment QR
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:text-white transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {!upiId ? (
          <div className="py-8 text-center space-y-3">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10 text-amber-400">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">UPI ID Required</p>
              <p className="text-xs text-zinc-400 mt-1 max-w-xs mx-auto">
                Set your UPI/GPay ID to generate payment QR codes and payment links.
              </p>
            </div>
            {onOpenSettings && (
              <button
                onClick={() => {
                  onClose();
                  onOpenSettings();
                }}
                className="inline-flex rounded-xl bg-white px-4 py-2 text-xs font-semibold text-zinc-950 hover:bg-zinc-200 transition cursor-pointer"
              >
                Configure Settings
              </button>
            )}
          </div>
        ) : (
          <div className="mt-4 flex flex-col items-center">
            {/* Amount & Description */}
            <div className="text-center mb-4">
              <div className="text-2xl font-bold tracking-tight tabular-nums text-white">
                ₹{Number(amount).toFixed(2)}
              </div>
              <p className="text-xs text-zinc-400 mt-0.5 line-clamp-1">
                {description || 'Payment'}
              </p>
              {personName && (
                <div className="mt-1 flex items-center justify-center gap-1.5 text-xs text-zinc-500">
                  <span>For {personName}</span>
                  {personPhone ? (
                    <span className="text-zinc-400 font-mono">({personPhone})</span>
                  ) : onRequestAddPhone ? (
                    <button
                      onClick={() => onRequestAddPhone(personName, '')}
                      className="text-xs text-zinc-400 hover:text-white underline cursor-pointer"
                    >
                      Add phone
                    </button>
                  ) : null}
                </div>
              )}
            </div>

            {/* QR Canvas Box */}
            <div className="rounded-2xl bg-white p-3.5 shadow-sm">
              <canvas ref={canvasRef} className="h-48 w-48 block" />
            </div>

            <p className="mt-3 text-[11px] text-zinc-500 text-center">
              Scan with GPay, PhonePe, Paytm, or any UPI app
            </p>

            {/* Actions */}
            <div className="mt-5 w-full space-y-2">
              <button
                onClick={handleSendWhatsApp}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 py-3 text-xs font-semibold text-zinc-950 active:scale-[0.98] transition cursor-pointer"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{personPhone ? 'Send via WhatsApp' : 'Send via WhatsApp (Add Phone)'}</span>
              </button>

              <div className="flex gap-2">
                <button
                  onClick={handleCopyLink}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] py-2.5 text-xs font-medium text-zinc-300 hover:bg-white/[0.08] transition cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 text-zinc-400" />
                      <span>Copy UPI Link</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleDownloadQR}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-medium text-zinc-300 hover:bg-white/[0.08] transition cursor-pointer"
                  title="Download Image"
                >
                  <Download className="h-3.5 w-3.5 text-zinc-400" />
                  <span>Save</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
