"use client";

import { useEffect, useState, useRef, useCallback } from "react";

interface WorkflowAnimationProps {
  isBlurred?: boolean;
  hasError?: boolean;
  highlightPeople?: boolean;
}

export default function WorkflowAnimation({
  isBlurred = false,
  hasError = false,
  highlightPeople = false,
}: WorkflowAnimationProps) {
  const [activeCard, setActiveCard] = useState(() => (highlightPeople ? 6 : 0));
  const [, setProgress] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const totalCards = 15;
  const displayTime = 3500; // 3.5 seconds per card

  // Navigate to specific card
  const goToCard = useCallback((index: number) => {
    setActiveCard(index);
    setProgress(0);
  }, []);

  // Navigate to next card
  const nextCard = useCallback(() => {
    setActiveCard((prev) => (prev + 1) % totalCards);
    setProgress(0);
  }, [totalCards]);

  // Navigate to previous card
  const prevCard = useCallback(() => {
    setActiveCard((prev) => (prev - 1 + totalCards) % totalCards);
    setProgress(0);
  }, [totalCards]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!panelRef.current?.contains(document.activeElement) && document.activeElement !== panelRef.current) return;

      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        nextCard();
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        prevCard();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nextCard, prevCard]);

  // Progress bar and auto-rotation (never pauses on hover)
  useEffect(() => {
    if (hasError || isBlurred) {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      return;
    }

    const progressStep = 100 / (displayTime / 50); // Update every 50ms

    progressIntervalRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          nextCard();
          return 0;
        }
        return prev + progressStep;
      });
    }, 50);

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [hasError, isBlurred, nextCard, displayTime]);

  // If highlightPeople turns on, bias to People/Activity card once
  useEffect(() => {
    if (highlightPeople) {
      setActiveCard(6);
      setProgress(0);
    }
  }, [highlightPeople]);

  // Touch/swipe handling
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    const touch = e.targetTouches[0];
    if (touch) setTouchStart(touch.clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const touch = e.targetTouches[0];
    if (touch) setTouchEnd(touch.clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      nextCard();
    } else if (isRightSwipe) {
      prevCard();
    }
  };

  // Card labels for accessibility and dots
  const cardLabels = [
    "Workspace Overview",
    "Hub & Feed",
    "Projects & Tasks",
    "Explorer",
    "Ideas & Teams",
    "Dashboard",
    "People & Activity",
    "Hub Projects Grid",
    "Create Project",
    "Filters & Search",
    "Project Updates",
    "Explorer Composer",
    "Trending & Search",
    "Profile & Network",
    "Saved & Bookmarks",
  ];

  return (
    <div
      ref={panelRef}
      className={`workflow-animation-panel ${isBlurred ? 'blurred' : ''} ${hasError ? 'error-state' : ''}`}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      tabIndex={0}
      role="region"
      aria-label="Feature showcase carousel"
      aria-live="polite"
    >
      {/* Privacy Curtain Overlay */}
      <div className={`privacy-curtain ${isBlurred ? 'active' : ''}`}>
        <div className="curtain-icon">🔒</div>
        <div className="curtain-text">Your password is private</div>
      </div>

      <div className="card-stage">

        {/* CARD 0: APP OVERVIEW */}
        <div className={`card card-overview ${activeCard === 0 ? 'active' : 'exit'}`}>
          <div className="card-label" style={{ color: '#6366f1' }}>Workspace</div>
          <div className="card-title">
            <div className="title-dot overview-dot"></div>
            One place for your work
          </div>
          <div className="overview-layout">
            <div className="overview-sidebar">
              <div className="overview-pill pill-1"></div>
              <div className="overview-pill pill-2"></div>
              <div className="overview-pill pill-3"></div>
            </div>
            <div className="overview-main">
              <div className="overview-row row-1"></div>
              <div className="overview-row row-2"></div>
            </div>
          </div>
        </div>

        {/* CARD 1: HUB & FEED */}
        <div className={`card card-project ${activeCard === 1 ? 'active' : 'exit'}`}>
          <div className="card-label">Hub · Feed</div>
          <div className="card-title">
            <div className="title-dot"></div>
            Live collaboration
          </div>
          <div className="typing-area">
            <div className="type-line line-1"></div>
            <div className="type-line line-2"></div>
            <div className="type-line line-3"></div>
          </div>
        </div>

        {/* CARD 2: PROJECTS & TASKS */}
        <div className={`card card-tasks ${activeCard === 2 ? 'active' : 'exit'}`}>
          <div className="card-label" style={{ color: '#10b981' }}>Projects · Tasks</div>
          <div className="card-title" style={{ marginBottom: '15px' }}>Plan work together</div>

          <div className="task-row task-1">
            <div className="checkbox">
              <svg viewBox="0 0 24 24" fill="none">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <div className="task-text"></div>
          </div>
          <div className="task-row task-2">
            <div className="checkbox">
              <svg viewBox="0 0 24 24" fill="none">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <div className="task-text" style={{ width: '80%' }}></div>
          </div>
        </div>

        {/* CARD 3: EXPLORER */}
        <div className={`card card-code ${activeCard === 3 ? 'active' : 'exit'}`}>
          <div className="card-label" style={{ color: '#a78bfa' }}>Explorer</div>
          <div className="card-title" style={{ color: 'white', marginBottom: '15px' }}>Find ideas & threads</div>
          <div className="code-block">
            <span className="k">open</span> <span className="f">hub</span>();<br />
            <span className="k">explore</span> <span className="s">'ideas'</span>;<br />
            <span className="k">connect</span> <span className="f">people</span>();
          </div>
          <div className="progress-wrapper">
            <div className="status-txt">
              <span>Syncing Repo...</span>
              <span>100%</span>
            </div>
            <div className="progress-bg">
              <div className="progress-fill"></div>
            </div>
          </div>
        </div>

        {/* CARD 4: IDEAS → PROJECTS */}
        <div className={`card card-team ${activeCard === 4 ? 'active' : 'exit'}`}>
          <div className="card-label" style={{ color: '#f59e0b' }}>Ideas · Teams</div>
          <div className="card-title" style={{ marginBottom: '15px' }}>Turn ideas into projects</div>

          <div className="team-avatars">
            <div className="avatar avatar-1"></div>
            <div className="avatar avatar-2"></div>
            <div className="avatar avatar-3"></div>
          </div>

          <div className="chat-bubbles">
            <div className="chat-bubble bubble-1"></div>
            <div className="chat-bubble bubble-2"></div>
          </div>
        </div>

        {/* CARD 5: DASHBOARD */}
        <div className={`card card-analytics ${activeCard === 5 ? 'active' : 'exit'}`}>
          <div className="card-label" style={{ color: '#06b6d4' }}>Dashboard</div>
          <div className="card-title" style={{ marginBottom: '15px' }}>Track momentum</div>

          <div className="chart-bars">
            <div className="bar bar-1"></div>
            <div className="bar bar-2"></div>
            <div className="bar bar-3"></div>
            <div className="bar bar-4"></div>
          </div>

          <div className="stats-row">
            <div className="stat-item">
              <div className="stat-value">87%</div>
              <div className="stat-label">Complete</div>
            </div>
          </div>
        </div>

        {/* CARD 6: PEOPLE & ACTIVITY */}
        <div className={`card card-notifications ${activeCard === 6 ? 'active' : 'exit'}`}>
          <div className="card-label" style={{ color: '#ec4899' }}>People · Activity</div>
          <div className="card-title" style={{ marginBottom: '15px' }}>
            <div className="bell-icon">🔔</div>
            Likes, follows, updates
          </div>

          <div className="notification-items">
            <div className="notif-item notif-1"></div>
            <div className="notif-item notif-2"></div>
            <div className="notif-item notif-3"></div>
          </div>
        </div>

        {/* CARD 7: HUB PROJECT GRID */}
        <div className={`card card-hubgrid ${activeCard === 7 ? 'active' : 'exit'}`}>
          <div className="card-label" style={{ color: '#4f46e5' }}>Hub · Projects</div>
          <div className="card-title">See all your work at a glance</div>
          <div className="hubgrid-grid">
            <div className="hubgrid-card c1"></div>
            <div className="hubgrid-card c2"></div>
            <div className="hubgrid-card c3"></div>
          </div>
        </div>

        {/* CARD 8: CREATE PROJECT */}
        <div className={`card card-create ${activeCard === 8 ? 'active' : 'exit'}`}>
          <div className="card-label" style={{ color: '#6366f1' }}>Create</div>
          <div className="card-title">Start a new project in seconds</div>
          <div className="create-layout">
            <div className="create-button">+ Create project</div>
            <div className="create-pill">Startup · Course · Hackathon · Open Source</div>
          </div>
        </div>

        {/* CARD 9: FILTERS & SEARCH */}
        <div className={`card card-filters ${activeCard === 9 ? 'active' : 'exit'}`}>
          <div className="card-label" style={{ color: '#22c55e' }}>Filters · Search</div>
          <div className="card-title">Find the right project fast</div>
          <div className="filters-row">
            <div className="filter-pill f1"></div>
            <div className="filter-pill f2"></div>
            <div className="filter-pill f3"></div>
          </div>
          <div className="filters-search"></div>
        </div>

        {/* CARD 10: PROJECT UPDATES */}
        <div className={`card card-updates ${activeCard === 10 ? 'active' : 'exit'}`}>
          <div className="card-label" style={{ color: '#f97316' }}>Updates</div>
          <div className="card-title">Make your progress visible</div>
          <div className="updates-card">
            <div className="updates-line l1"></div>
            <div className="updates-line l2"></div>
            <div className="updates-metrics">
              <div className="metric-dot m1"></div>
              <div className="metric-dot m2"></div>
              <div className="metric-dot m3"></div>
            </div>
          </div>
        </div>

        {/* CARD 11: EXPLORER COMPOSER */}
        <div className={`card card-composer ${activeCard === 11 ? 'active' : 'exit'}`}>
          <div className="card-label" style={{ color: '#a855f7' }}>Explorer · Composer</div>
          <div className="card-title">Share ideas, updates, and questions</div>
          <div className="composer-bar">
            <div className="composer-avatar"></div>
            <div className="composer-input"></div>
          </div>
          <div className="composer-actions">
            <div className="composer-chip chip-1"></div>
            <div className="composer-chip chip-2"></div>
            <div className="composer-chip chip-3"></div>
          </div>
        </div>

        {/* CARD 12: TRENDING & SEARCH */}
        <div className={`card card-trending ${activeCard === 12 ? 'active' : 'exit'}`}>
          <div className="card-label" style={{ color: '#0ea5e9' }}>Trending</div>
          <div className="card-title">Discover tags, skills, and topics</div>
          <div className="trending-chips">
            <div className="trend-pill t1"></div>
            <div className="trend-pill t2"></div>
            <div className="trend-pill t3"></div>
          </div>
          <div className="trending-search"></div>
        </div>

        {/* CARD 13: PROFILE & NETWORK */}
        <div className={`card card-profile ${activeCard === 13 ? 'active' : 'exit'}`}>
          <div className="card-label" style={{ color: '#6366f1' }}>Profile · Network</div>
          <div className="card-title">Grow proof-of-skill, not just a résumé</div>
          <div className="profile-mini">
            <div className="profile-circle"></div>
            <div className="profile-text"></div>
          </div>
          <div className="profile-stats">
            <div className="profile-stat ps1"></div>
            <div className="profile-stat ps2"></div>
            <div className="profile-stat ps3"></div>
          </div>
        </div>

        {/* CARD 14: SAVED & BOOKMARKS */}
        <div className={`card card-saved ${activeCard === 14 ? 'active' : 'exit'}`}>
          <div className="card-label" style={{ color: '#f97316' }}>Saved</div>
          <div className="card-title">Keep track of what matters</div>
          <div className="saved-list">
            <div className="saved-row r1"></div>
            <div className="saved-row r2"></div>
          </div>
          <div className="saved-footer"></div>
        </div>

      </div>

      {/* Navigation Dots */}
      <div className="nav-dots" role="tablist" aria-label="Carousel navigation">
        {Array.from({ length: totalCards }).map((_, index) => (
          <button
            key={index}
            className={`nav-dot ${activeCard === index ? 'active' : ''}`}
            onClick={() => goToCard(index)}
            aria-label={cardLabels[index]}
            aria-selected={activeCard === index}
            role="tab"
            title={cardLabels[index]}
          />
        ))}
      </div>

      {/* Navigation Arrows */}
      <button
        className="nav-arrow nav-prev"
        onClick={prevCard}
        aria-label="Previous slide"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </button>
      <button
        className="nav-arrow nav-next"
        onClick={nextCard}
        aria-label="Next slide"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      </button>

      {/* Keyboard hint */}
      <div className="keyboard-hint-panel">
        <span>← →</span> Navigate
      </div>

      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500&display=swap');

        .workflow-animation-panel {
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          position: relative;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          overflow: hidden;
          transition: filter 0.3s ease, opacity 0.3s ease, transform 0.3s ease, box-shadow 0.3s ease;
          contain: layout style paint;
          will-change: transform, opacity;
          outline: none;
        }

        .workflow-animation-panel:focus {
          box-shadow: inset 0 0 0 2px rgba(99, 102, 241, 0.5);
        }

        /* Privacy Curtain */
        .privacy-curtain {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          z-index: 15;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.4s ease;
        }

        .privacy-curtain.active {
          opacity: 1;
        }

        .curtain-icon {
          font-size: 3rem;
          animation: lockBounce 0.6s ease;
        }

        @keyframes lockBounce {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }

        .curtain-text {
          color: rgba(255, 255, 255, 0.8);
          font-size: 0.9rem;
          font-family: 'Inter', sans-serif;
          font-weight: 500;
        }

        /* Blur effect when password is focused */
        .workflow-animation-panel.blurred {
          filter: blur(8px);
          opacity: 0.4;
        }

        /* Subtle emphasis when there is a login error */
        .workflow-animation-panel.error-state {
          box-shadow: 0 24px 60px rgba(239, 68, 68, 0.35);
          animation: errorPulse 0.7s ease-out 1;
        }

        @keyframes errorPulse {
          0% {
            box-shadow: 0 0 0 rgba(239, 68, 68, 0.0);
          }
          40% {
            box-shadow: 0 24px 80px rgba(239, 68, 68, 0.5);
          }
          100% {
            box-shadow: 0 24px 60px rgba(239, 68, 68, 0.3);
          }
        }

        /* Navigation Dots - Show only on hover */
        .nav-dots {
          position: absolute;
          bottom: 16px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 6px;
          z-index: 20;
          padding: 8px 12px;
          background: rgba(0, 0, 0, 0.4);
          border-radius: 999px;
          backdrop-filter: blur(4px);
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .workflow-animation-panel:hover .nav-dots {
          opacity: 1;
        }

        .nav-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.3);
          border: none;
          padding: 0;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .nav-dot:hover {
          background: rgba(255, 255, 255, 0.5);
          transform: scale(1.2);
        }

        .nav-dot.active {
          background: #6366f1;
          transform: scale(1.3);
          box-shadow: 0 0 8px rgba(99, 102, 241, 0.6);
        }

        /* Navigation Arrows */
        .nav-arrow {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: rgba(0, 0, 0, 0.4);
          border: none;
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 20;
          opacity: 0;
          transition: all 0.3s ease;
          backdrop-filter: blur(4px);
        }

        .nav-arrow svg {
          width: 18px;
          height: 18px;
        }

        .nav-prev {
          left: 12px;
        }

        .nav-next {
          right: 12px;
        }

        .workflow-animation-panel:hover .nav-arrow,
        .workflow-animation-panel:focus .nav-arrow {
          opacity: 1;
        }

        .nav-arrow:hover {
          background: rgba(99, 102, 241, 0.8);
          transform: translateY(-50%) scale(1.1);
        }

        /* Keyboard Hint */
        .keyboard-hint-panel {
          position: absolute;
          bottom: 50px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 0.65rem;
          color: rgba(255, 255, 255, 0.4);
          font-family: 'Inter', sans-serif;
          display: flex;
          align-items: center;
          gap: 4px;
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .keyboard-hint-panel span {
          padding: 2px 6px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          font-family: monospace;
        }

        .workflow-animation-panel:focus .keyboard-hint-panel {
          opacity: 1;
        }

        /* Stage: Holds the 3D perspective */
        .card-stage {
          width: 320px;
          height: 200px;
          position: relative;
          perspective: 1000px;
        }

        /* --- CARD BASE STYLES --- */
        .card {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 25px 50px rgba(0,0,0,0.4);
          display: flex;
          flex-direction: column;
          
          /* Initial State (Hidden) */
          opacity: 0;
          transform: translateY(20px) scale(0.95);
          pointer-events: none;
          z-index: 1;
          visibility: hidden;
          
          /* Smooth Transitions */
          transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        /* STATE: Active (Visible) */
        .card.active {
          opacity: 1;
          transform: translateY(0) scale(1);
          z-index: 10;
          visibility: visible;
        }

        /* STATE: Exit (Slide Up & Fade) */
        .card.exit {
          opacity: 0;
          transform: translateY(-30px) scale(0.95);
          z-index: 2;
          visibility: visible;
          transition: all 0.4s ease-out;
        }

        /* --- CARD 0: OVERVIEW --- */
        .card-overview {
          background: #0f172a;
          border-left: 4px solid #6366f1;
        }

        .overview-dot {
          background: #6366f1;
        }

        .overview-layout {
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 12px;
          align-items: stretch;
        }

        .overview-sidebar {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .overview-pill {
          width: 14px;
          height: 10px;
          border-radius: 999px;
        }

        .overview-pill.pill-1 {
          background: #4ade80;
        }
        .overview-pill.pill-2 {
          background: #22c55e;
        }
        .overview-pill.pill-3 {
          background: #a855f7;
        }

        .card-overview.active .overview-pill {
          animation: pulse-pill 1.4s ease-in-out infinite alternate;
        }

        @keyframes pulse-pill {
          from {
            transform: scale(1);
            opacity: 0.9;
          }
          to {
            transform: scale(1.08);
            opacity: 1;
          }
        }

        .overview-main {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .overview-row {
          height: 10px;
          border-radius: 999px;
          background: rgba(148, 163, 184, 0.6);
          width: 0%;
        }

        .card-overview.active .overview-row.row-1 {
          width: 100%;
          transition: width 0.6s ease 0.3s;
        }

        .card-overview.active .overview-row.row-2 {
          width: 70%;
          transition: width 0.6s ease 0.55s;
        }

        /* --- CARD 1: PROJECT (White) --- */
        .card-project {
          background: white;
          border-left: 4px solid #3b82f6;
        }

        .card-label {
          font-size: 0.75rem;
          font-weight: 700;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 8px;
          font-family: 'Inter', sans-serif;
        }

        .card-title {
          font-size: 1.1rem;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: 'Inter', sans-serif;
        }

        .title-dot {
          width: 8px;
          height: 8px;
          background: #3b82f6;
          border-radius: 50%;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
        }

        .typing-area {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .type-line {
          height: 8px;
          background: #e2e8f0;
          border-radius: 4px;
          width: 0%;
        }

        /* Typing Animations */
        .card-project.active .line-1 {
          transition: width 0.5s ease 0.3s;
          width: 90%;
        }

        .card-project.active .line-2 {
          transition: width 0.5s ease 0.5s;
          width: 70%;
        }

        .card-project.active .line-3 {
          transition: width 0.5s ease 0.7s;
          width: 40%;
        }

        /* Reset */
        .card-project:not(.active) .type-line {
          width: 0%;
          transition: none;
        }

        /* --- CARD 2: TASKS (Light Grey) --- */
        .card-tasks {
          background: #f8fafc;
          border-left: 4px solid #10b981;
        }

        .task-row {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
          opacity: 0.4;
          transition: opacity 0.3s;
        }

        .checkbox {
          width: 20px;
          height: 20px;
          border: 2px solid #cbd5e1;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s;
          flex-shrink: 0;
        }

        .checkbox svg {
          width: 14px;
          height: 14px;
          stroke: white;
          stroke-width: 3;
          stroke-dasharray: 20;
          stroke-dashoffset: 20;
          transition: stroke-dashoffset 0.3s;
        }

        .task-text {
          height: 8px;
          width: 140px;
          background: #cbd5e1;
          border-radius: 4px;
        }

        /* Task Animations */
        .card-tasks.active .task-1 {
          opacity: 1;
          transition-delay: 0.3s;
        }

        .card-tasks.active .task-1 .checkbox {
          background: #10b981;
          border-color: #10b981;
          transition-delay: 0.4s;
        }

        .card-tasks.active .task-1 svg {
          stroke-dashoffset: 0;
          transition-delay: 0.5s;
        }

        .card-tasks.active .task-2 {
          opacity: 1;
          transition-delay: 0.8s;
        }

        .card-tasks.active .task-2 .checkbox {
          background: #10b981;
          border-color: #10b981;
          transition-delay: 0.9s;
        }

        .card-tasks.active .task-2 svg {
          stroke-dashoffset: 0;
          transition-delay: 1.0s;
        }

        /* Reset */
        .card-tasks:not(.active) .checkbox {
          background: transparent;
          border-color: #cbd5e1;
        }

        .card-tasks:not(.active) svg {
          stroke-dashoffset: 20;
        }

        .card-tasks:not(.active) .task-row {
          opacity: 0.4;
        }

        /* --- CARD 3: CODE (Dark) --- */
        .card-code {
          background: #1e293b;
          border-left: 4px solid #8b5cf6;
        }

        .code-block {
          font-family: 'Fira Code', monospace;
          font-size: 13px;
          color: #e2e8f0;
          line-height: 1.6;
        }

        .k {
          color: #c084fc;
        } /* keyword */

        .f {
          color: #60a5fa;
        } /* function */

        .s {
          color: #4ade80;
        } /* string */

        .progress-wrapper {
          margin-top: auto;
        }

        .status-txt {
          font-size: 11px;
          color: #94a3b8;
          margin-bottom: 6px;
          display: flex;
          justify-content: space-between;
          font-family: 'Inter', sans-serif;
        }

        .progress-bg {
          width: 100%;
          height: 6px;
          background: rgba(255,255,255,0.1);
          border-radius: 3px;
          overflow: hidden;
        }

        .progress-fill {
          width: 0%;
          height: 100%;
          background: #8b5cf6;
          border-radius: 3px;
        }

        /* Code Animations */
        .card-code.active .progress-fill {
          width: 100%;
          transition: width 1.5s ease 0.5s;
        }

        .card-code:not(.active) .progress-fill {
          width: 0%;
          transition: none;
        }

        /* --- CARD 4: TEAM (Yellow/Orange) --- */
        .card-team {
          background: #fffbeb;
          border-left: 4px solid #f59e0b;
        }

        .team-avatars {
          display: flex;
          gap: -8px;
          margin-bottom: 20px;
        }

        .avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: 3px solid white;
          opacity: 0;
          transform: scale(0);
          transition: all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }

        .avatar-1 {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }

        .avatar-2 {
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
          margin-left: -12px;
        }

        .avatar-3 {
          background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
          margin-left: -12px;
        }

        .card-team.active .avatar-1 {
          opacity: 1;
          transform: scale(1);
          transition-delay: 0.2s;
        }

        .card-team.active .avatar-2 {
          opacity: 1;
          transform: scale(1);
          transition-delay: 0.4s;
        }

        .card-team.active .avatar-3 {
          opacity: 1;
          transform: scale(1);
          transition-delay: 0.6s;
        }

        .chat-bubbles {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .chat-bubble {
          height: 12px;
          border-radius: 12px;
          background: #fbbf24;
          opacity: 0;
          width: 0%;
          transition: all 0.5s ease;
        }

        .bubble-1 {
          width: 70%;
        }

        .bubble-2 {
          width: 50%;
          background: #f59e0b;
        }

        .card-team.active .bubble-1 {
          opacity: 0.6;
          width: 70%;
          transition-delay: 0.8s;
        }

        .card-team.active .bubble-2 {
          opacity: 0.6;
          width: 50%;
          transition-delay: 1.0s;
        }

        /* --- CARD 5: ANALYTICS (Cyan) --- */
        .card-analytics {
          background: #ecfeff;
          border-left: 4px solid #06b6d4;
        }

        .chart-bars {
          display: flex;
          align-items: flex-end;
          gap: 8px;
          height: 80px;
          margin-bottom: 15px;
        }

        .bar {
          width: 100%;
          background: #06b6d4;
          border-radius: 4px 4px 0 0;
          height: 0%;
          transition: height 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }

        .card-analytics.active .bar-1 {
          height: 50%;
          transition-delay: 0.2s;
        }

        .card-analytics.active .bar-2 {
          height: 75%;
          transition-delay: 0.4s;
        }

        .card-analytics.active .bar-3 {
          height: 90%;
          transition-delay: 0.6s;
        }

        .card-analytics.active .bar-4 {
          height: 65%;
          transition-delay: 0.8s;
        }

        .stats-row {
          display: flex;
          justify-content: center;
        }

        .stat-item {
          text-align: center;
          opacity: 0;
          transform: scale(0.8);
          transition: all 0.4s ease;
        }

        .stat-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: #06b6d4;
          font-family: 'Inter', sans-serif;
        }

        .stat-label {
          font-size: 0.7rem;
          color: #64748b;
          text-transform: uppercase;
          font-family: 'Inter', sans-serif;
        }

        .card-analytics.active .stat-item {
          opacity: 1;
          transform: scale(1);
          transition-delay: 1.0s;
        }

        /* --- CARD 6: NOTIFICATIONS (Pink) --- */
        .card-notifications {
          background: #fdf2f8;
          border-left: 4px solid #ec4899;
        }

        .bell-icon {
          font-size: 1.2rem;
        }

        .notification-items {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .notif-item {
          height: 10px;
          background: #fbcfe8;
          border-radius: 8px;
          opacity: 0;
          width: 0%;
          transition: all 0.5s ease;
        }

        .card-notifications.active .notif-1 {
          opacity: 1;
          width: 100%;
          transition-delay: 0.3s;
        }

        .card-notifications.active .notif-2 {
          opacity: 1;
          width: 80%;
          transition-delay: 0.6s;
        }

        .card-notifications.active .notif-3 {
          opacity: 1;
          width: 60%;
          transition-delay: 0.9s;
        }

        /* --- CARD 7: HUB GRID --- */
        .card-hubgrid {
          background: #f9fafb;
          border-left: 4px solid #4f46e5;
        }

        .hubgrid-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
        }

        .hubgrid-card {
          height: 60px;
          border-radius: 10px;
          background: #e5e7eb;
          opacity: 0;
          transform: translateY(10px) scale(0.95);
        }

        .card-hubgrid.active .hubgrid-card.c1 {
          opacity: 1;
          transform: translateY(0) scale(1);
          transition: all 0.35s ease 0.25s;
        }

        .card-hubgrid.active .hubgrid-card.c2 {
          opacity: 1;
          transform: translateY(0) scale(1);
          transition: all 0.35s ease 0.4s;
        }

        .card-hubgrid.active .hubgrid-card.c3 {
          opacity: 1;
          transform: translateY(0) scale(1);
          transition: all 0.35s ease 0.55s;
        }

        /* --- CARD 8: CREATE PROJECT --- */
        .card-create {
          background: #eef2ff;
          border-left: 4px solid #6366f1;
        }

        .create-layout {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .create-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 6px 12px;
          border-radius: 999px;
          background: #4f46e5;
          color: white;
          font-size: 0.8rem;
          font-weight: 600;
          box-shadow: 0 10px 18px rgba(79, 70, 229, 0.35);
          opacity: 0;
          transform: translateY(8px) scale(0.9);
        }

        .card-create.active .create-button {
          opacity: 1;
          transform: translateY(0) scale(1);
          transition: all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55) 0.3s;
        }

        .create-pill {
          font-size: 0.75rem;
          padding: 4px 8px;
          border-radius: 999px;
          background: rgba(79, 70, 229, 0.1);
          color: #312e81;
          opacity: 0;
          transform: translateY(4px);
        }

        .card-create.active .create-pill {
          opacity: 1;
          transform: translateY(0);
          transition: all 0.3s ease 0.7s;
        }

        /* --- CARD 9: FILTERS & SEARCH --- */
        .card-filters {
          background: #ecfdf3;
          border-left: 4px solid #22c55e;
        }

        .filters-row {
          display: flex;
          gap: 6px;
          margin-bottom: 8px;
        }

        .filter-pill {
          height: 20px;
          border-radius: 999px;
          background: rgba(34, 197, 94, 0.1);
          flex: 0 0 auto;
          width: 0;
        }

        .card-filters.active .filter-pill.f1 {
          width: 60px;
          transition: width 0.35s ease 0.3s;
        }
        .card-filters.active .filter-pill.f2 {
          width: 70px;
          transition: width 0.35s ease 0.45s;
        }
        .card-filters.active .filter-pill.f3 {
          width: 65px;
          transition: width 0.35s ease 0.6s;
        }

        .filters-search {
          height: 26px;
          border-radius: 999px;
          background: white;
          border: 1px dashed rgba(34, 197, 94, 0.5);
          width: 0%;
        }

        .card-filters.active .filters-search {
          width: 100%;
          transition: width 0.45s ease 0.75s;
        }

        /* --- CARD 10: PROJECT UPDATES --- */
        .card-updates {
          background: #fff7ed;
          border-left: 4px solid #f97316;
        }

        .updates-card {
          border-radius: 12px;
          background: #fed7aa;
          padding: 10px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .updates-line {
          height: 6px;
          border-radius: 999px;
          background: rgba(124, 45, 18, 0.7);
          width: 0%;
        }

        .card-updates.active .updates-line.l1 {
          width: 90%;
          transition: width 0.4s ease 0.3s;
        }

        .card-updates.active .updates-line.l2 {
          width: 60%;
          transition: width 0.4s ease 0.45s;
        }

        .updates-metrics {
          display: flex;
          gap: 6px;
          margin-top: 4px;
        }

        .metric-dot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          opacity: 0;
        }

        .metric-dot.m1 {
          background: #22c55e;
        }
        .metric-dot.m2 {
          background: #facc15;
        }
        .metric-dot.m3 {
          background: #fb7185;
        }

        .card-updates.active .metric-dot {
          opacity: 1;
          transition: opacity 0.3s ease 0.7s;
        }

        /* --- CARD 11: EXPLORER COMPOSER --- */
        .card-composer {
          background: #eef2ff;
          border-left: 4px solid #a855f7;
        }

        .composer-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }

        .composer-avatar {
          width: 26px;
          height: 26px;
          border-radius: 999px;
          background: linear-gradient(135deg, #6366f1, #a855f7);
          opacity: 0;
          transform: translateY(6px) scale(0.9);
        }

        .composer-input {
          flex: 1;
          height: 26px;
          border-radius: 999px;
          background: white;
          opacity: 0;
          transform: translateY(6px);
        }

        .card-composer.active .composer-avatar,
        .card-composer.active .composer-input {
          opacity: 1;
          transform: translateY(0) scale(1);
          transition: all 0.35s ease 0.3s;
        }

        .composer-actions {
          display: flex;
          gap: 6px;
        }

        .composer-chip {
          height: 16px;
          border-radius: 999px;
          width: 0;
        }

        .composer-chip.chip-1 {
          background: rgba(37, 99, 235, 0.2);
        }
        .composer-chip.chip-2 {
          background: rgba(16, 185, 129, 0.25);
        }
        .composer-chip.chip-3 {
          background: rgba(249, 115, 22, 0.25);
        }

        .card-composer.active .composer-chip.chip-1 {
          width: 40px;
          transition: width 0.35s ease 0.5s;
        }
        .card-composer.active .composer-chip.chip-2 {
          width: 38px;
          transition: width 0.35s ease 0.6s;
        }
        .card-composer.active .composer-chip.chip-3 {
          width: 48px;
          transition: width 0.35s ease 0.7s;
        }

        /* --- CARD 12: TRENDING & SEARCH --- */
        .card-trending {
          background: #f0f9ff;
          border-left: 4px solid #0ea5e9;
        }

        .trending-chips {
          display: flex;
          gap: 6px;
          margin-bottom: 8px;
        }

        .trend-pill {
          height: 18px;
          border-radius: 999px;
          width: 0;
          background: rgba(14, 165, 233, 0.12);
        }

        .card-trending.active .trend-pill.t1 {
          width: 70px;
          transition: width 0.35s ease 0.3s;
        }
        .card-trending.active .trend-pill.t2 {
          width: 60px;
          transition: width 0.35s ease 0.45s;
        }
        .card-trending.active .trend-pill.t3 {
          width: 75px;
          transition: width 0.35s ease 0.6s;
        }

        .trending-search {
          height: 24px;
          border-radius: 999px;
          background: white;
          border: 1px solid rgba(148, 163, 184, 0.7);
          width: 0%;
        }

        .card-trending.active .trending-search {
          width: 100%;
          transition: width 0.45s ease 0.75s;
        }

        /* --- CARD 13: PROFILE & NETWORK --- */
        .card-profile {
          background: #eff6ff;
          border-left: 4px solid #6366f1;
        }

        .profile-mini {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }

        .profile-circle {
          width: 28px;
          height: 28px;
          border-radius: 999px;
          background: linear-gradient(135deg, #6366f1, #a855f7);
          opacity: 0;
          transform: translateY(8px) scale(0.9);
        }

        .profile-text {
          flex: 1;
          height: 10px;
          border-radius: 999px;
          background: #e5e7eb;
          width: 0%;
        }

        .card-profile.active .profile-circle {
          opacity: 1;
          transform: translateY(0) scale(1);
          transition: all 0.4s ease 0.3s;
        }

        .card-profile.active .profile-text {
          width: 70%;
          transition: width 0.45s ease 0.45s;
        }

        .profile-stats {
          display: flex;
          gap: 6px;
        }

        .profile-stat {
          flex: 1;
          height: 26px;
          border-radius: 8px;
          background: white;
          opacity: 0;
          transform: translateY(6px);
        }

        .card-profile.active .profile-stat.ps1,
        .card-profile.active .profile-stat.ps2,
        .card-profile.active .profile-stat.ps3 {
          opacity: 1;
          transform: translateY(0);
          transition: all 0.3s ease 0.7s;
        }

        /* --- CARD 14: SAVED & BOOKMARKS --- */
        .card-saved {
          background: #fff7ed;
          border-left: 4px solid #f97316;
        }

        .saved-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 6px;
        }

        .saved-row {
          height: 10px;
          border-radius: 999px;
          background: rgba(124, 45, 18, 0.7);
          width: 0%;
        }

        .card-saved.active .saved-row.r1 {
          width: 90%;
          transition: width 0.45s ease 0.3s;
        }

        .card-saved.active .saved-row.r2 {
          width: 70%;
          transition: width 0.45s ease 0.45s;
        }

        .saved-footer {
          height: 8px;
          width: 40%;
          border-radius: 999px;
          background: rgba(249, 115, 22, 0.2);
          opacity: 0;
          transform: translateY(6px);
        }

        .card-saved.active .saved-footer {
          opacity: 1;
          transform: translateY(0);
          transition: all 0.3s ease 0.7s;
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
            margin-bottom: 15px;
          }

          .code-block {
            font-size: 11px;
          }

          .nav-dots {
            bottom: 12px;
            gap: 4px;
          }

          .nav-dot {
            width: 6px;
            height: 6px;
          }

          .nav-arrow {
            width: 28px;
            height: 28px;
          }

          .nav-arrow svg {
            width: 14px;
            height: 14px;
          }

          .keyboard-hint-panel {
            display: none;
          }
        }

        /* Respect users who prefer reduced motion */
        @media (prefers-reduced-motion: reduce) {
          .workflow-animation-panel,
          .card,
          .card *,
          .nav-dot,
          .nav-arrow,
          .progress-bar-fill,
          .privacy-curtain {
            transition: none !important;
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
