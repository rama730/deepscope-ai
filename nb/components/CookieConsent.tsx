"use client";

import { useEffect, useState } from "react";
import { useCookieConsent } from "./providers/CookieProvider";

export default function CookieConsent() {
  const { consent, setConsent, isLoading } = useCookieConsent();
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

  const totalSlides = 4;

  useEffect(() => {
    if (!isLoading && consent === "none") {
      setShow(true);
    } else {
      setShow(false);
    }
  }, [consent, isLoading]);

  // Auto-rotate slides when expanded
  useEffect(() => {
    if (!isExpanded) return;
    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % totalSlides);
    }, 4000);
    return () => clearInterval(interval);
  }, [isExpanded]);

  async function savePrefs(kind: "all" | "essential") {
    try {
      setSaving(true);
      await setConsent(kind);
    } finally {
      setSaving(false);
      setShow(false);
    }
  }

  if (!show || isLoading) return null;

  return (
    <div className="cookie-consent-wrapper">
      <div className={`cookie-card ${isExpanded ? 'expanded' : ''}`}>
        {/* Cookie Icon Header */}
        <div className="cookie-header">
          <div className="cookie-icon-wrapper">
            <div className="cookie-icon">🍪</div>
            <div className="cookie-crumbs">
              <span className="crumb crumb-1">✨</span>
              <span className="crumb crumb-2">✨</span>
              <span className="crumb crumb-3">✨</span>
            </div>
          </div>
          <div className="header-text">
            <h3>We use cookies</h3>
            <p>To make your experience better</p>
          </div>
        </div>

        {/* Animated Story Section */}
        <div className={`story-section ${isExpanded ? 'visible' : ''}`}>
          <div className="story-carousel">
            {/* Slide 1: Essential Cookies */}
            <div className={`story-slide ${activeSlide === 0 ? 'active' : ''}`}>
              <div className="slide-icon">🔐</div>
              <div className="slide-content">
                <div className="slide-label">Essential</div>
                <div className="slide-title">Keep you logged in</div>
                <div className="slide-desc">
                  Session cookies remember your login so you don't have to sign in every time.
                </div>
                <div className="slide-visual">
                  <div className="visual-row">
                    <div className="lock-icon">🔒</div>
                    <div className="arrow-flow">→</div>
                    <div className="session-badge">Session Active</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Slide 2: Security Cookies */}
            <div className={`story-slide ${activeSlide === 1 ? 'active' : ''}`}>
              <div className="slide-icon">🛡️</div>
              <div className="slide-content">
                <div className="slide-label">Security</div>
                <div className="slide-title">Protect your account</div>
                <div className="slide-desc">
                  CSRF tokens and rate-limit cookies prevent unauthorized actions and attacks.
                </div>
                <div className="slide-visual">
                  <div className="shield-animation">
                    <div className="shield-ring ring-1"></div>
                    <div className="shield-ring ring-2"></div>
                    <div className="shield-center">✓</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Slide 3: Functional Cookies */}
            <div className={`story-slide ${activeSlide === 2 ? 'active' : ''}`}>
              <div className="slide-icon">⚙️</div>
              <div className="slide-content">
                <div className="slide-label">Functional</div>
                <div className="slide-title">Remember your preferences</div>
                <div className="slide-desc">
                  Theme, language, and UI settings so everything looks the way you like it.
                </div>
                <div className="slide-visual">
                  <div className="pref-items">
                    <div className="pref-item pref-1">
                      <span>🌙</span>
                      <span>Dark mode</span>
                    </div>
                    <div className="pref-item pref-2">
                      <span>🌐</span>
                      <span>Language</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Slide 4: Analytics Cookies */}
            <div className={`story-slide ${activeSlide === 3 ? 'active' : ''}`}>
              <div className="slide-icon">📊</div>
              <div className="slide-content">
                <div className="slide-label">Analytics</div>
                <div className="slide-title">Help us improve</div>
                <div className="slide-desc">
                  Anonymous usage data helps us understand what features matter most to you.
                </div>
                <div className="slide-visual">
                  <div className="chart-bars">
                    <div className="bar bar-1"></div>
                    <div className="bar bar-2"></div>
                    <div className="bar bar-3"></div>
                    <div className="bar bar-4"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Slide Indicators */}
          <div className="slide-dots">
            {[0, 1, 2, 3].map((i) => (
              <button
                key={i}
                className={`dot ${activeSlide === i ? 'active' : ''}`}
                onClick={() => setActiveSlide(i)}
              />
            ))}
          </div>

          {/* What we DON'T do */}
          <div className="no-tracking-badge">
            <span className="no-icon">🚫</span>
            <span>We never sell your data or use marketing trackers</span>
          </div>
        </div>

        {/* Toggle to expand/collapse story */}
        <button
          className="learn-more-btn"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? 'Show less' : 'Learn what cookies we use'}
          <svg
            className={`chevron ${isExpanded ? 'up' : ''}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Action Buttons */}
        <div className="cookie-actions">
          <button
            disabled={saving}
            onClick={() => savePrefs("essential")}
            className="btn-essential"
          >
            {saving ? 'Saving...' : 'Essential only'}
          </button>
          <button
            disabled={saving}
            onClick={() => savePrefs("all")}
            className="btn-accept"
          >
            {saving ? 'Saving...' : 'Accept all'}
          </button>
        </div>
      </div>

      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

        .cookie-consent-wrapper {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 9999;
          padding: 16px;
          pointer-events: none;
        }

        .cookie-card {
          max-width: 480px;
          margin: 0 auto;
          background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
          border-radius: 20px;
          padding: 24px;
          box-shadow: 
            0 25px 50px -12px rgba(0, 0, 0, 0.15),
            0 0 0 1px rgba(0, 0, 0, 0.05);
          pointer-events: auto;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          overflow: hidden;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }

        @media (prefers-color-scheme: dark) {
          .cookie-card {
            background: linear-gradient(135deg, #18181b 0%, #27272a 100%);
            box-shadow: 
              0 25px 50px -12px rgba(0, 0, 0, 0.5),
              0 0 0 1px rgba(255, 255, 255, 0.1);
          }
        }

        .cookie-card.expanded {
          max-width: 520px;
        }

        /* Header */
        .cookie-header {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 16px;
        }

        .cookie-icon-wrapper {
          position: relative;
          width: 56px;
          height: 56px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .cookie-icon {
          font-size: 2.5rem;
          animation: cookieBounce 2s ease-in-out infinite;
        }

        @keyframes cookieBounce {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          25% { transform: translateY(-4px) rotate(-5deg); }
          75% { transform: translateY(-2px) rotate(5deg); }
        }

        .cookie-crumbs {
          position: absolute;
          width: 100%;
          height: 100%;
          pointer-events: none;
        }

        .crumb {
          position: absolute;
          font-size: 0.75rem;
          opacity: 0;
          animation: crumbFloat 3s ease-in-out infinite;
        }

        .crumb-1 { top: 0; right: 0; animation-delay: 0s; }
        .crumb-2 { bottom: 10%; left: 0; animation-delay: 1s; }
        .crumb-3 { top: 20%; right: -5px; animation-delay: 2s; }

        @keyframes crumbFloat {
          0%, 100% { opacity: 0; transform: translateY(0) scale(0.5); }
          50% { opacity: 1; transform: translateY(-8px) scale(1); }
        }

        .header-text h3 {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 700;
          color: #18181b;
        }

        @media (prefers-color-scheme: dark) {
          .header-text h3 {
            color: #fafafa;
          }
        }

        .header-text p {
          margin: 4px 0 0;
          font-size: 0.875rem;
          color: #71717a;
        }

        /* Story Section */
        .story-section {
          max-height: 0;
          opacity: 0;
          overflow: hidden;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .story-section.visible {
          max-height: 320px;
          opacity: 1;
          margin-bottom: 16px;
        }

        .story-carousel {
          position: relative;
          height: 200px;
          margin-bottom: 12px;
        }

        .story-slide {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          display: flex;
          gap: 16px;
          padding: 16px;
          background: #f4f4f5;
          border-radius: 16px;
          border: 1px solid #e4e4e7;
          opacity: 0;
          transform: translateX(20px);
          transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
          pointer-events: none;
        }

        @media (prefers-color-scheme: dark) {
          .story-slide {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
          }
        }

        .story-slide.active {
          opacity: 1;
          transform: translateX(0);
          pointer-events: auto;
        }

        .slide-icon {
          font-size: 2rem;
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #e4e4e7;
          border-radius: 12px;
          flex-shrink: 0;
        }

        @media (prefers-color-scheme: dark) {
          .slide-icon {
            background: rgba(255, 255, 255, 0.1);
          }
        }

        .slide-content {
          flex: 1;
          min-width: 0;
        }

        .slide-label {
          font-size: 0.7rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #3b82f6;
          margin-bottom: 4px;
        }

        .slide-title {
          font-size: 1rem;
          font-weight: 600;
          color: #18181b;
          margin-bottom: 6px;
        }

        @media (prefers-color-scheme: dark) {
          .slide-title {
            color: #fafafa;
          }
        }

        .slide-desc {
          font-size: 0.8rem;
          color: #71717a;
          line-height: 1.4;
          margin-bottom: 12px;
        }

        .slide-visual {
          margin-top: auto;
        }

        /* Visual Row for Slide 1 */
        .visual-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .lock-icon {
          font-size: 1.25rem;
          opacity: 0;
          animation: fadeInScale 0.3s ease forwards;
        }

        .story-slide.active .lock-icon {
          animation-delay: 0.3s;
        }

        .arrow-flow {
          color: #71717a;
          font-size: 1rem;
          opacity: 0;
          animation: fadeInScale 0.3s ease forwards;
        }

        .story-slide.active .arrow-flow {
          animation-delay: 0.5s;
        }

        .session-badge {
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          font-size: 0.7rem;
          font-weight: 600;
          padding: 6px 12px;
          border-radius: 20px;
          opacity: 0;
          animation: fadeInScale 0.3s ease forwards;
        }

        .story-slide.active .session-badge {
          animation-delay: 0.7s;
        }

        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.8); }
          to { opacity: 1; transform: scale(1); }
        }

        /* Shield Animation for Slide 2 */
        .shield-animation {
          position: relative;
          width: 60px;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .shield-ring {
          position: absolute;
          border-radius: 50%;
          border: 2px solid #3b82f6;
          opacity: 0;
        }

        .ring-1 {
          width: 100%;
          height: 100%;
        }

        .ring-2 {
          width: 75%;
          height: 75%;
        }

        .story-slide.active .ring-1 {
          animation: ringPulse 2s ease-out infinite;
        }

        .story-slide.active .ring-2 {
          animation: ringPulse 2s ease-out infinite 0.3s;
        }

        @keyframes ringPulse {
          0% { opacity: 0; transform: scale(0.8); }
          50% { opacity: 0.6; }
          100% { opacity: 0; transform: scale(1.2); }
        }

        .shield-center {
          font-size: 1.25rem;
          color: #10b981;
          font-weight: 700;
          z-index: 1;
        }

        /* Preference Items for Slide 3 */
        .pref-items {
          display: flex;
          gap: 8px;
        }

        .pref-item {
          display: flex;
          align-items: center;
          gap: 6px;
          background: #e4e4e7;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 0.75rem;
          color: #18181b;
          opacity: 0;
          transform: translateY(10px);
        }

        @media (prefers-color-scheme: dark) {
          .pref-item {
            background: rgba(255, 255, 255, 0.1);
            color: #fafafa;
          }
        }

        .story-slide.active .pref-1 {
          animation: slideUp 0.4s ease forwards 0.3s;
        }

        .story-slide.active .pref-2 {
          animation: slideUp 0.4s ease forwards 0.5s;
        }

        @keyframes slideUp {
          to { opacity: 1; transform: translateY(0); }
        }

        /* Chart Bars for Slide 4 */
        .chart-bars {
          display: flex;
          align-items: flex-end;
          gap: 6px;
          height: 40px;
        }

        .bar {
          width: 20px;
          background: linear-gradient(to top, #3b82f6, #60a5fa);
          border-radius: 4px 4px 0 0;
          height: 0;
          transition: height 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .story-slide.active .bar-1 { height: 60%; transition-delay: 0.2s; }
        .story-slide.active .bar-2 { height: 100%; transition-delay: 0.3s; }
        .story-slide.active .bar-3 { height: 75%; transition-delay: 0.4s; }
        .story-slide.active .bar-4 { height: 85%; transition-delay: 0.5s; }

        /* Slide Dots */
        .slide-dots {
          display: flex;
          justify-content: center;
          gap: 8px;
          margin-bottom: 12px;
        }

        .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.3);
          border: none;
          cursor: pointer;
          transition: all 0.3s ease;
          padding: 0;
        }

        .dot.active {
          background: #3b82f6;
          transform: scale(1.2);
        }

        .dot:hover {
          background: #a1a1aa;
        }

        /* No Tracking Badge */
        .no-tracking-badge {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px 16px;
          background: #ecfdf5;
          border: 1px solid #a7f3d0;
          border-radius: 12px;
          font-size: 0.75rem;
          color: #059669;
        }

        @media (prefers-color-scheme: dark) {
          .no-tracking-badge {
            background: rgba(16, 185, 129, 0.15);
            border: 1px solid rgba(16, 185, 129, 0.3);
            color: #6ee7b7;
          }
        }

        .no-icon {
          font-size: 1rem;
        }

        /* Learn More Button */
        .learn-more-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 10px;
          background: transparent;
          border: 1px solid #e4e4e7;
          border-radius: 12px;
          color: #52525b;
          font-size: 0.8rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
          margin-bottom: 16px;
        }

        .learn-more-btn:hover {
          background: #f4f4f5;
          border-color: #d4d4d8;
        }

        @media (prefers-color-scheme: dark) {
          .learn-more-btn {
            border: 1px solid rgba(255, 255, 255, 0.2);
            color: rgba(255, 255, 255, 0.8);
          }
          .learn-more-btn:hover {
            background: rgba(255, 255, 255, 0.05);
            border-color: rgba(255, 255, 255, 0.3);
          }
        }

        .chevron {
          width: 16px;
          height: 16px;
          transition: transform 0.3s ease;
        }

        .chevron.up {
          transform: rotate(180deg);
        }

        /* Action Buttons */
        .cookie-actions {
          display: flex;
          gap: 12px;
        }

        .btn-essential,
        .btn-accept {
          flex: 1;
          padding: 14px 20px;
          border-radius: 12px;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          border: none;
        }

        .btn-essential {
          background: #f4f4f5;
          color: #18181b;
          border: 1px solid #e4e4e7;
        }

        .btn-essential:hover:not(:disabled) {
          background: #e4e4e7;
          border-color: #d4d4d8;
        }

        @media (prefers-color-scheme: dark) {
          .btn-essential {
            background: rgba(255, 255, 255, 0.1);
            color: #fafafa;
            border: 1px solid rgba(255, 255, 255, 0.2);
          }
          .btn-essential:hover:not(:disabled) {
            background: rgba(255, 255, 255, 0.15);
            border-color: rgba(255, 255, 255, 0.3);
          }
        }

        .btn-accept {
          background: #18181b;
          color: white;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
        }

        .btn-accept:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
          background: #27272a;
        }

        @media (prefers-color-scheme: dark) {
          .btn-accept {
            background: #fafafa;
            color: #18181b;
            box-shadow: 0 4px 15px rgba(255, 255, 255, 0.1);
          }
          .btn-accept:hover:not(:disabled) {
            background: #e4e4e7;
            box-shadow: 0 6px 20px rgba(255, 255, 255, 0.15);
          }
        }

        .btn-essential:disabled,
        .btn-accept:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* Mobile Responsive */
        @media (max-width: 520px) {
          .cookie-card {
            margin: 0 8px;
            padding: 20px;
          }

          .cookie-header {
            gap: 12px;
          }

          .cookie-icon-wrapper {
            width: 48px;
            height: 48px;
          }

          .cookie-icon {
            font-size: 2rem;
          }

          .header-text h3 {
            font-size: 1.1rem;
          }

          .story-carousel {
            height: 220px;
          }

          .story-slide {
            flex-direction: column;
            gap: 12px;
          }

          .slide-icon {
            width: 40px;
            height: 40px;
            font-size: 1.5rem;
          }

          .cookie-actions {
            flex-direction: column;
            gap: 8px;
          }
        }

        /* Reduced Motion */
        @media (prefers-reduced-motion: reduce) {
          .cookie-icon,
          .crumb,
          .shield-ring,
          .bar,
          .pref-item,
          .lock-icon,
          .arrow-flow,
          .session-badge {
            animation: none !important;
          }
          
          .story-slide.active .bar-1,
          .story-slide.active .bar-2,
          .story-slide.active .bar-3,
          .story-slide.active .bar-4 {
            height: auto;
          }
        }

        /* Dot colors for light mode */
        .dot {
          background: #d4d4d8;
        }

        @media (prefers-color-scheme: dark) {
          .dot {
            background: rgba(255, 255, 255, 0.3);
          }
          .dot:hover {
            background: rgba(255, 255, 255, 0.5);
          }
        }
      `}</style>
    </div>
  );
}
