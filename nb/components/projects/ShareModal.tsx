"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Copy, Check, Twitter, Linkedin, Facebook, QrCode, Mail } from "lucide-react";
import Image from "next/image";
// QR Code will be optional - using a service URL for now

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  title: string;
  description?: string;
}

export default function ShareModal({ isOpen, onClose, url, title, description }: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const shareToTwitter = () => {
    const text = encodeURIComponent(`${title}${description ? ` - ${description}` : ""}`);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(url)}`, "_blank");
  };

  const shareToLinkedIn = () => {
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, "_blank");
  };

  const shareToFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, "_blank");
  };

  const shareViaEmail = () => {
    const subject = encodeURIComponent(`Check out: ${title}`);
    const body = encodeURIComponent(`${description || title}\n\n${url}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-50"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl max-w-md w-full border border-slate-200 dark:border-zinc-800">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-zinc-800">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-zinc-100">Share Project</h2>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-slate-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4">
                {/* URL Input */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-2">
                    Project Link
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={url}
                      readOnly
                      className="flex-1 px-3 py-2 border border-slate-300 dark:border-zinc-700 rounded-lg bg-slate-50 dark:bg-zinc-800 text-sm text-slate-900 dark:text-zinc-100"
                    />
                    <button
                      onClick={handleCopy}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copied ? "Copied!" : "Copy"}
                    </button>
                  </div>
                </div>

                {/* Share Options */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-3">
                    Share to
                  </label>
                  <div className="grid grid-cols-4 gap-3">
                    <button
                      onClick={shareToTwitter}
                      className="flex flex-col items-center gap-2 p-4 border border-slate-200 dark:border-zinc-800 rounded-lg hover:bg-slate-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition-colors"
                      aria-label="Share on Twitter"
                    >
                      <Twitter className="w-6 h-6 text-blue-400" />
                      <span className="text-xs text-slate-600 dark:text-zinc-400">Twitter</span>
                    </button>
                    <button
                      onClick={shareToLinkedIn}
                      className="flex flex-col items-center gap-2 p-4 border border-slate-200 dark:border-zinc-800 rounded-lg hover:bg-slate-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition-colors"
                      aria-label="Share on LinkedIn"
                    >
                      <Linkedin className="w-6 h-6 text-blue-600" />
                      <span className="text-xs text-slate-600 dark:text-zinc-400">LinkedIn</span>
                    </button>
                    <button
                      onClick={shareToFacebook}
                      className="flex flex-col items-center gap-2 p-4 border border-slate-200 dark:border-zinc-800 rounded-lg hover:bg-slate-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition-colors"
                      aria-label="Share on Facebook"
                    >
                      <Facebook className="w-6 h-6 text-blue-600" />
                      <span className="text-xs text-slate-600 dark:text-zinc-400">Facebook</span>
                    </button>
                    <button
                      onClick={shareViaEmail}
                      className="flex flex-col items-center gap-2 p-4 border border-slate-200 dark:border-zinc-800 rounded-lg hover:bg-slate-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition-colors"
                      aria-label="Share via Email"
                    >
                      <Mail className="w-6 h-6 text-slate-600 dark:text-zinc-400" />
                      <span className="text-xs text-slate-600 dark:text-zinc-400">Email</span>
                    </button>
                  </div>
                </div>

                {/* QR Code */}
                <div>
                  <button
                    onClick={() => setShowQR(!showQR)}
                    className="w-full flex items-center justify-center gap-2 p-3 border border-slate-200 dark:border-zinc-800 rounded-lg hover:bg-slate-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <QrCode className="w-5 h-5 text-slate-600 dark:text-zinc-400" />
                    <span className="text-sm font-medium text-slate-700 dark:text-zinc-300">
                      {showQR ? "Hide" : "Show"} QR Code
                    </span>
                  </button>
                  {showQR && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="mt-4 flex justify-center p-4 bg-slate-50 dark:bg-zinc-800 rounded-lg"
                    >
                      <Image
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`}
                        alt="QR Code"
                        width={192}
                        height={192}
                        className="w-48 h-48"
                        unoptimized
                      />
                    </motion.div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

