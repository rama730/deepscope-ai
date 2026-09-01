"use client";

import { ReactNode, Suspense } from "react";
import nextDynamic from "next/dynamic";

const WorkflowAnimation = nextDynamic(() => import("@/components/auth/WorkflowAnimation"), {
  loading: () => <div className="animation-skeleton" />,
  ssr: false,
});

export default function FlowBAuthLayout({
  title,
  subtitle,
  children,
  animation,
  animationBlurred = false,
  animationHasError = false,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  animation?: ReactNode;
  animationBlurred?: boolean;
  animationHasError?: boolean;
}) {
  return (
    <div className="auth-shell">
      <div className="login-card active">
        <div className="image-section">
          <Suspense fallback={<div className="animation-skeleton" />}>
            {animation || <WorkflowAnimation isBlurred={animationBlurred} hasError={animationHasError} />}
          </Suspense>
        </div>

        <div className="form-section">
          <h2>{title}</h2>
          {subtitle ? <p className="subtitle">{subtitle}</p> : null}
          {children}
        </div>
      </div>

      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;900&display=swap');

        .auth-shell {
          min-height: 100vh;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          background: #f4f5f7;
        }

        .login-card {
          background: white;
          border-radius: 30px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.05);
          width: 900px;
          max-width: 95vw;
          height: 600px;
          max-height: 95vh;
          display: flex;
          overflow: hidden;
          position: relative;
        }

        @media (prefers-color-scheme: dark) {
          .auth-shell {
            background: #0f0f12;
          }
          .login-card {
            background: #1a1a1a;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.35);
          }
        }

        .image-section {
          width: 50%;
          min-width: 50%;
          height: 100%;
          background-color: #e0e5ec;
          position: relative;
          display: flex;
          justify-content: center;
          align-items: center;
          overflow: hidden;
        }

        .form-section {
          width: 50%;
          min-width: 50%;
          padding: 40px;
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
          align-items: center;
          overflow-y: auto;
          overflow-x: hidden;
        }

        h2 {
          font-size: 1.8rem;
          margin: 0 0 6px 0;
          color: #1a1a1a;
          font-family: 'Poppins', sans-serif;
        }

        .subtitle {
          color: #888;
          font-size: 0.9rem;
          margin: 0 0 24px 0;
          font-family: 'Poppins', sans-serif;
          text-align: center;
        }

        @media (prefers-color-scheme: dark) {
          h2 {
            color: #f5f5f5;
          }
          .subtitle {
            color: #aaa;
          }
        }

        .animation-skeleton {
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, rgba(0,0,0,0.06), rgba(0,0,0,0.02), rgba(0,0,0,0.06));
          background-size: 200% 100%;
          animation: shimmer 1.2s ease-in-out infinite;
        }

        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        @media (max-width: 768px) {
          .login-card {
            flex-direction: column;
            height: auto;
            min-height: 600px;
          }
          .image-section {
            width: 100%;
            min-width: 100%;
            height: 280px;
          }
          .form-section {
            width: 100%;
            min-width: 100%;
            padding: 30px 20px;
          }
        }
      `}</style>
    </div>
  );
}


