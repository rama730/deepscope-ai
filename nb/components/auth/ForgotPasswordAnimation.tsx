"use client";

import { useEffect, useState } from "react";

/**
 * ForgotPasswordAnimation
 *
 * A detailed, smooth story of the forgot-password flow:
 * 1) You request a reset from login
 * 2) We run security checks
 * 3) A secure link lands in your inbox
 * 4) You set a stronger password
 * 5) You’re ready to sign in again
 */
export default function ForgotPasswordAnimation() {
  const [activeCard, setActiveCard] = useState(0);
  const totalCards = 5;

  useEffect(() => {
    const displayTime = 3600;
    const interval = setInterval(() => {
      setActiveCard((prev) => (prev + 1) % totalCards);
    }, displayTime);
    return () => clearInterval(interval);
  }, [totalCards]);

  return (
    <div className="workflow-animation-panel">
      <div className="card-stage">
        {/* CARD 1: REQUEST RESET FROM LOGIN */}
        <div className={`card card-request ${activeCard === 0 ? "active" : "exit"}`}>
          <div className="card-label">Step 01 · Request</div>
          <div className="card-title">
            <div className="title-dot dot-request" />
            Tell us it&apos;s you
          </div>
          <div className="request-body">
            <div className="request-field">
              <div className="request-pill">Email</div>
              <div className="request-typing" />
            </div>
            <div className="request-footer">
              <div className="request-chip">Forgot password</div>
              <div className="request-key">↩︎</div>
            </div>
          </div>
        </div>

        {/* CARD 2: SECURITY CHECKS */}
        <div className={`card card-security ${activeCard === 1 ? "active" : "exit"}`}>
          <div className="card-label">Step 02 · Security</div>
          <div className="card-title">
            <div className="title-dot dot-security" />
            We verify your request
          </div>
          <div className="security-row">
            <div className="security-shield">🛡️</div>
            <div className="security-lines">
              <div className="security-line l1" />
              <div className="security-line l2" />
            </div>
          </div>
          <div className="security-checks">
            <div className="security-pill p1">
              <span className="pill-dot" />
              Rate limits
            </div>
            <div className="security-pill p2">
              <span className="pill-dot" />
              IP &amp; device
            </div>
          </div>
        </div>

        {/* CARD 3: EMAIL WITH SECURE LINK */}
        <div className={`card card-email ${activeCard === 2 ? "active" : "exit"}`}>
          <div className="card-label">Step 03 · Inbox</div>
          <div className="card-title">
            <div className="title-dot dot-email" />
            Reset link sent securely
          </div>
          <div className="email-layout">
            <div className="email-envelope">✉️</div>
            <div className="email-meta">
              <div className="email-tag">Password reset</div>
              <div className="email-line el1" />
              <div className="email-line el2" />
            </div>
            <div className="email-badge">1</div>
          </div>
        </div>

        {/* CARD 4: CREATE NEW PASSWORD */}
        <div className={`card card-newpass ${activeCard === 3 ? "active" : "exit"}`}>
          <div className="card-label">Step 04 · New password</div>
          <div className="card-title">
            <div className="title-dot dot-newpass" />
            Choose a stronger key
          </div>
          <div className="password-shell">
            <div className="password-lock">🔐</div>
            <div className="password-dots">
              <div className="pwd-dot" />
              <div className="pwd-dot" />
              <div className="pwd-dot" />
              <div className="pwd-dot" />
              <div className="pwd-dot" />
              <div className="pwd-dot" />
            </div>
          </div>
          <div className="strength-meter">
            <div className="strength-label">Strength</div>
            <div className="strength-bar">
              <div className="strength-fill" />
            </div>
          </div>
        </div>

        {/* CARD 5: READY TO SIGN IN */}
        <div className={`card card-success ${activeCard === 4 ? "active" : "exit"}`}>
          <div className="card-label">Step 05 · Done</div>
          <div className="card-title">
            <div className="title-dot dot-success" />
            Back to your account
          </div>
          <div className="success-main">
            <div className="success-icon">✓</div>
            <div className="success-text-block">
              <div className="success-heading">Password updated</div>
              <div className="success-subtitle">Use your new password to log in.</div>
            </div>
          </div>
          <div className="success-footer">
            <div className="success-pill">Log in again →</div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap");

        .workflow-animation-panel {
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          position: relative;
          display: flex;
          justify-content: center;
          align-items: center;
          overflow: hidden;
        }

        .card-stage {
          width: 320px;
          height: 200px;
          position: relative;
          perspective: 1000px;
        }

        .card {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 25px 50px rgba(0, 0, 0, 0.4);
          display: flex;
          flex-direction: column;
          opacity: 0;
          transform: translateY(20px) scale(0.95);
          pointer-events: none;
          transition: all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
          z-index: 1;
          visibility: hidden;
        }

        .card.active {
          opacity: 1;
          transform: translateY(0) scale(1);
          z-index: 10;
          visibility: visible;
        }

        .card.exit {
          opacity: 0;
          transform: translateY(-26px) scale(0.96);
          z-index: 2;
          visibility: visible;
          transition: all 0.45s ease-out;
        }

        .card-label {
          font-size: 0.75rem;
          font-weight: 700;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: 6px;
          font-family: "Inter", sans-serif;
        }

        .card-title {
          font-size: 1.05rem;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 18px;
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: "Inter", sans-serif;
        }

        .title-dot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          box-shadow: 0 0 0 2px rgba(148, 163, 184, 0.4);
        }

        .dot-request {
          background: #3b82f6;
        }
        .dot-security {
          background: #0ea5e9;
        }
        .dot-email {
          background: #10b981;
        }
        .dot-newpass {
          background: #8b5cf6;
        }
        .dot-success {
          background: #22c55e;
        }

        /* CARD 1: REQUEST RESET */
        .card-request {
          background: #f8fafc;
          border-left: 4px solid #3b82f6;
        }

        .request-body {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .request-field {
          background: #e5e7eb;
          border-radius: 10px;
          padding: 8px 10px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .request-pill {
          display: inline-flex;
          align-items: center;
          padding: 3px 8px;
          border-radius: 999px;
          font-size: 0.7rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          background: white;
          color: #475569;
          opacity: 0;
          transform: translateY(4px);
        }

        .card-request.active .request-pill {
          opacity: 1;
          transform: translateY(0);
          transition: all 0.3s ease 0.25s;
        }

        .request-typing {
          height: 8px;
          border-radius: 999px;
          background: #3b82f6;
          width: 0%;
        }

        .card-request.active .request-typing {
          width: 80%;
          transition: width 0.8s ease 0.4s;
        }

        .request-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 4px;
        }

        .request-chip {
          font-size: 0.75rem;
          padding: 3px 10px;
          border-radius: 999px;
          background: rgba(59, 130, 246, 0.1);
          color: #1d4ed8;
          opacity: 0;
          transform: translateY(4px);
        }

        .request-key {
          font-size: 0.85rem;
          padding: 2px 6px;
          border-radius: 6px;
          border: 1px solid #cbd5f5;
          color: #64748b;
          opacity: 0;
          transform: translateY(4px);
        }

        .card-request.active .request-chip,
        .card-request.active .request-key {
          opacity: 1;
          transform: translateY(0);
          transition: all 0.3s ease 0.8s;
        }

        /* CARD 2: SECURITY CHECKS */
        .card-security {
          background: #eff6ff;
          border-left: 4px solid #0ea5e9;
        }

        .security-row {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 10px;
        }

        .security-shield {
          font-size: 2.4rem;
          opacity: 0;
          transform: translateY(10px) rotate(-10deg);
        }

        .card-security.active .security-shield {
          opacity: 1;
          transform: translateY(0) rotate(0deg);
          transition: all 0.45s ease 0.3s;
        }

        .security-lines {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .security-line {
          height: 6px;
          border-radius: 999px;
          background: rgba(15, 23, 42, 0.08);
          width: 0%;
        }

        .card-security.active .security-line.l1 {
          width: 90%;
          transition: width 0.45s ease 0.45s;
        }
        .card-security.active .security-line.l2 {
          width: 65%;
          transition: width 0.45s ease 0.6s;
        }

        .security-checks {
          display: flex;
          gap: 8px;
          margin-top: 4px;
        }

        .security-pill {
          font-size: 0.75rem;
          padding: 4px 8px;
          border-radius: 999px;
          background: white;
          color: #0f172a;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          box-shadow: 0 8px 16px rgba(15, 23, 42, 0.12);
          opacity: 0;
          transform: translateY(6px);
        }

        .pill-dot {
          width: 6px;
          height: 6px;
          border-radius: 999px;
          background: #22c55e;
        }

        .card-security.active .security-pill.p1 {
          opacity: 1;
          transform: translateY(0);
          transition: all 0.3s ease 0.75s;
        }
        .card-security.active .security-pill.p2 {
          opacity: 1;
          transform: translateY(0);
          transition: all 0.3s ease 0.9s;
        }

        /* CARD 3: EMAIL SENT */
        .card-email {
          background: #ecfdf3;
          border-left: 4px solid #10b981;
        }

        .email-layout {
          position: relative;
          display: grid;
          grid-template-columns: auto 1fr auto;
          gap: 10px;
          align-items: center;
        }

        .email-envelope {
          font-size: 2.8rem;
          opacity: 0;
          transform: translateY(14px);
        }

        .card-email.active .email-envelope {
          opacity: 1;
          transform: translateY(0);
          transition: all 0.45s ease 0.3s;
        }

        .email-meta {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .email-tag {
          font-size: 0.8rem;
          font-weight: 600;
          color: #047857;
          background: rgba(16, 185, 129, 0.1);
          padding: 3px 8px;
          border-radius: 999px;
          width: fit-content;
          opacity: 0;
          transform: translateY(6px);
        }

        .email-line {
          height: 6px;
          border-radius: 999px;
          background: rgba(15, 23, 42, 0.08);
          width: 0%;
        }

        .card-email.active .email-tag {
          opacity: 1;
          transform: translateY(0);
          transition: all 0.3s ease 0.5s;
        }

        .card-email.active .email-line.el1 {
          width: 90%;
          transition: width 0.45s ease 0.6s;
        }

        .card-email.active .email-line.el2 {
          width: 60%;
          transition: width 0.45s ease 0.75s;
        }

        .email-badge {
          width: 26px;
          height: 26px;
          border-radius: 999px;
          background: #ef4444;
          color: white;
          font-size: 0.8rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transform: scale(0.5) translateY(-6px);
        }

        .card-email.active .email-badge {
          opacity: 1;
          transform: scale(1) translateY(-6px);
          transition: all 0.35s cubic-bezier(0.68, -0.55, 0.265, 1.55) 0.9s;
        }

        /* CARD 4: NEW PASSWORD */
        .card-newpass {
          background: #f5f3ff;
          border-left: 4px solid #8b5cf6;
        }

        .password-shell {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 10px;
        }

        .password-lock {
          font-size: 2.4rem;
          opacity: 0;
          transform: translateY(10px) rotate(-10deg);
        }

        .card-newpass.active .password-lock {
          opacity: 1;
          transform: translateY(0) rotate(0deg);
          transition: all 0.45s ease 0.3s;
        }

        .password-dots {
          display: flex;
          gap: 6px;
        }

        .pwd-dot {
          width: 10px;
          height: 10px;
          border-radius: 999px;
          background: #8b5cf6;
          opacity: 0;
          transform: scale(0.6);
        }

        .card-newpass.active .pwd-dot:nth-child(1) {
          opacity: 1;
          transform: scale(1);
          transition: all 0.25s ease 0.45s;
        }
        .card-newpass.active .pwd-dot:nth-child(2) {
          opacity: 1;
          transform: scale(1);
          transition: all 0.25s ease 0.55s;
        }
        .card-newpass.active .pwd-dot:nth-child(3) {
          opacity: 1;
          transform: scale(1);
          transition: all 0.25s ease 0.65s;
        }
        .card-newpass.active .pwd-dot:nth-child(4) {
          opacity: 1;
          transform: scale(1);
          transition: all 0.25s ease 0.75s;
        }
        .card-newpass.active .pwd-dot:nth-child(5) {
          opacity: 1;
          transform: scale(1);
          transition: all 0.25s ease 0.85s;
        }
        .card-newpass.active .pwd-dot:nth-child(6) {
          opacity: 1;
          transform: scale(1);
          transition: all 0.25s ease 0.95s;
        }

        .strength-meter {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .strength-label {
          font-size: 0.75rem;
          color: #6b21a8;
          opacity: 0;
        }

        .strength-bar {
          width: 100%;
          height: 6px;
          border-radius: 999px;
          background: rgba(139, 92, 246, 0.18);
          overflow: hidden;
        }

        .strength-fill {
          width: 0%;
          height: 100%;
          background: linear-gradient(90deg, #22c55e, #a855f7);
          border-radius: inherit;
        }

        .card-newpass.active .strength-label {
          opacity: 1;
          transition: opacity 0.3s ease 0.9s;
        }

        .card-newpass.active .strength-fill {
          width: 100%;
          transition: width 0.9s ease 0.9s;
        }

        /* CARD 5: SUCCESS */
        .card-success {
          background: #ecfdf5;
          border-left: 4px solid #22c55e;
        }

        .success-main {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 10px;
        }

        .success-icon {
          width: 46px;
          height: 46px;
          border-radius: 999px;
          background: #22c55e;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 1.6rem;
          box-shadow: 0 16px 32px rgba(22, 163, 74, 0.55);
          opacity: 0;
          transform: translateY(8px) scale(0.7);
        }

        .card-success.active .success-icon {
          opacity: 1;
          transform: translateY(0) scale(1);
          transition: all 0.45s cubic-bezier(0.68, -0.55, 0.265, 1.55) 0.3s;
        }

        .success-text-block {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .success-heading {
          font-size: 0.95rem;
          font-weight: 600;
          color: #15803d;
          opacity: 0;
        }

        .success-subtitle {
          font-size: 0.8rem;
          color: #4b5563;
          opacity: 0;
        }

        .card-success.active .success-heading {
          opacity: 1;
          transition: opacity 0.3s ease 0.6s;
        }

        .card-success.active .success-subtitle {
          opacity: 1;
          transition: opacity 0.3s ease 0.8s;
        }

        .success-footer {
          margin-top: 4px;
        }

        .success-pill {
          display: inline-flex;
          padding: 4px 12px;
          border-radius: 999px;
          background: rgba(22, 163, 74, 0.08);
          color: #166534;
          font-size: 0.8rem;
          font-weight: 600;
          opacity: 0;
          transform: translateY(6px);
        }

        .card-success.active .success-pill {
          opacity: 1;
          transform: translateY(0);
          transition: all 0.3s ease 1s;
        }

        /* Mobile Responsive */
        @media (max-width: 768px) {
          .card-stage {
            width: 280px;
            height: 180px;
          }
          .card {
            padding: 20px;
          }
          .card-title {
            font-size: 1rem;
            margin-bottom: 14px;
          }
        }

        /* Reduced motion */
        @media (prefers-reduced-motion: reduce) {
          .card,
          .card * {
            transition: none !important;
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}

