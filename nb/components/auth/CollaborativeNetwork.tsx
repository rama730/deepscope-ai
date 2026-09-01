"use client";

import { useEffect, useRef } from "react";

interface CollaborativeNetworkProps {
  state?: "normal" | "privacy-mode" | "connected" | "disconnected";
  isPasswordActive?: boolean;
}

export default function CollaborativeNetwork({ 
  state = "normal",
  isPasswordActive = false 
}: CollaborativeNetworkProps) {
  const networkRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const networkContainer = networkRef.current;
    if (!networkContainer) return;

    const connectionLines = networkContainer.querySelectorAll(".connection-line") as NodeListOf<SVGLineElement>;
    const satelliteNodes = networkContainer.querySelectorAll(".satellite-node") as NodeListOf<HTMLElement>;

    let mouseX = 0;
    let mouseY = 0;
    let isFrameRequested = false;

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;

      if (!isFrameRequested) {
        requestAnimationFrame(updateNetworkPosition);
        isFrameRequested = true;
      }
    };

    const updateNetworkPosition = () => {
      if (!isPasswordActive && networkContainer) {
        const rect = networkContainer.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        // Calculate angle and distance from center to cursor
        const deltaX = mouseX - centerX;
        const deltaY = mouseY - centerY;
        const angle = Math.atan2(deltaY, deltaX);
        const distance = Math.min(Math.sqrt(deltaX * deltaX + deltaY * deltaY), 150);
        const influence = distance / 150;

        // Apply subtle rotation to entire network based on cursor position
        const tiltX = (deltaY / rect.height) * 5; // max 5deg tilt
        const tiltY = -(deltaX / rect.width) * 5;
        networkContainer.style.transform = `perspective(800px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;

        // Slight parallax effect on satellite nodes
        satelliteNodes.forEach((node) => {
          const currentTransform = node.style.transform;
          const parallaxX = Math.cos(angle) * (4 * influence);
          const parallaxY = Math.sin(angle) * (4 * influence);
          
          // Extract rotation and translateY from current transform
          const rotateMatch = currentTransform.match(/rotate\(([-\d.]+)deg\)/);
          const translateYMatch = currentTransform.match(/translateY\(([-\d.]+)px\)/);
          
          if (rotateMatch && translateYMatch) {
            const rotation = rotateMatch[1];
            const translateY = translateYMatch[1];
            node.style.transform = `translate(-50%, -50%) rotate(${rotation}deg) translateY(${translateY}px) translate(${parallaxX}px, ${parallaxY}px)`;
          }
        });

        // Make connection lines glow near cursor
        connectionLines.forEach((line) => {
          const lineRect = line.getBoundingClientRect();
          const lineCenterX = lineRect.left + lineRect.width / 2;
          const lineCenterY = lineRect.top + lineRect.height / 2;
          const distToLine = Math.sqrt(
            Math.pow(mouseX - lineCenterX, 2) + Math.pow(mouseY - lineCenterY, 2)
          );
          
          if (distToLine < 100) {
            const opacity = 1 - (distToLine / 100);
            line.style.opacity = `${0.6 + opacity * 0.4}`;
            line.style.filter = `drop-shadow(0 0 ${3 + opacity * 5}px rgba(255, 255, 255, ${opacity * 0.8}))`;
          } else {
            line.style.opacity = '0.6';
            line.style.filter = 'drop-shadow(0 0 4px rgba(255, 255, 255, 0.3))';
          }
        });
      }
      isFrameRequested = false;
    };

    document.addEventListener("mousemove", handleMouseMove);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      if (networkContainer) {
        networkContainer.style.transform = 'none';
      }
    };
  }, [isPasswordActive]);

  const getStateClass = () => {
    switch (state) {
      case "privacy-mode": return "privacy-mode";
      case "connected": return "connected";
      case "disconnected": return "disconnected";
      default: return "";
    }
  };

  return (
    <div className="image-section">
      {/* Background ambient nodes */}
      <div className="bg-node node-ambient-1"></div>
      <div className="bg-node node-ambient-2"></div>
      <div className="bg-node node-ambient-3"></div>

      {/* Main Network Container */}
      <div className="network-floater">
        <div 
          ref={networkRef}
          className={`network-container ${getStateClass()}`}
        >
          {/* SVG Canvas for all connections */}
          <svg className="connections-canvas" viewBox="0 0 300 300">
            {/* Inner ring to hub connections */}
            {[0, 1, 2, 3].map((i) => {
              const angle = (i * 90) * (Math.PI / 180);
              const x = 150 + Math.cos(angle) * 50;
              const y = 150 + Math.sin(angle) * 50;
              return (
                <line 
                  key={`inner-${i}`}
                  x1="150" 
                  y1="150" 
                  x2={x} 
                  y2={y}
                  className="connection-line inner-connection"
                  strokeWidth="2"
                />
              );
            })}
            
            {/* Middle ring connections to inner ring */}
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
              const angle = (i * 45) * (Math.PI / 180);
              const innerAngle = (Math.floor(i / 2) * 90) * (Math.PI / 180);
              const x1 = 150 + Math.cos(innerAngle) * 50;
              const y1 = 150 + Math.sin(innerAngle) * 50;
              const x2 = 150 + Math.cos(angle) * 95;
              const y2 = 150 + Math.sin(angle) * 95;
              return (
                <line 
                  key={`middle-${i}`}
                  x1={x1} 
                  y1={y1} 
                  x2={x2} 
                  y2={y2}
                  className="connection-line middle-connection"
                  strokeWidth="1.5"
                />
              );
            })}

            {/* Cross connections between middle ring nodes */}
            {[0, 2, 4, 6].map((i) => {
              const angle1 = (i * 45) * (Math.PI / 180);
              const angle2 = ((i + 1) * 45) * (Math.PI / 180);
              const x1 = 150 + Math.cos(angle1) * 95;
              const y1 = 150 + Math.sin(angle1) * 95;
              const x2 = 150 + Math.cos(angle2) * 95;
              const y2 = 150 + Math.sin(angle2) * 95;
              return (
                <line 
                  key={`cross-${i}`}
                  x1={x1} 
                  y1={y1} 
                  x2={x2} 
                  y2={y2}
                  className="connection-line cross-connection"
                  strokeWidth="1"
                  opacity="0.3"
                />
              );
            })}

            {/* Flowing particles */}
            {[...Array(12)].map((_, i) => (
              <circle
                key={`particle-${i}`}
                className="data-particle"
                r="2"
                fill="#fff"
                style={{
                  animationDelay: `${i * 0.3}s`,
                  animationDuration: `${3 + (i % 3)}s`
                }}
              >
                <animateMotion
                  dur={`${3 + (i % 3)}s`}
                  repeatCount="indefinite"
                  begin={`${i * 0.3}s`}
                >
                  <mpath href={`#path-${i % 4}`} />
                </animateMotion>
              </circle>
            ))}

            {/* Hidden paths for particle animation */}
            <defs>
              {[0, 1, 2, 3].map((i) => {
                const angle = (i * 90) * (Math.PI / 180);
                const x = 150 + Math.cos(angle) * 50;
                const y = 150 + Math.sin(angle) * 50;
                const x2 = 150 + Math.cos(angle) * 95;
                const y2 = 150 + Math.sin(angle) * 95;
                return (
                  <path
                    key={`path-${i}`}
                    id={`path-${i}`}
                    d={`M 150 150 L ${x} ${y} L ${x2} ${y2}`}
                    fill="none"
                  />
                );
              })}
            </defs>
          </svg>

          {/* Central Hub Node */}
          <div className="hub-node" style={{ top: '50%', left: '50%' }}>
            <div className="node-core"></div>
            <div className="node-pulse"></div>
            {state === "privacy-mode" && <div className="lock-icon">🔒</div>}
          </div>

          {/* Inner Ring - 4 nodes */}
          {[0, 1, 2, 3].map((i) => {
            const angle = i * 90;
            return (
              <div
                key={`inner-${i}`}
                className="satellite-node inner-node"
                style={{
                  top: '50%',
                  left: '50%',
                  transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-50px)`
                }}
              >
                <div className="node-core small"></div>
              </div>
            );
          })}

          {/* Middle Ring - 8 nodes */}
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
            const angle = i * 45;
            return (
              <div
                key={`middle-${i}`}
                className="satellite-node middle-node"
                style={{
                  top: '50%',
                  left: '50%',
                  transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-95px)`
                }}
              >
                <div className="node-core medium"></div>
              </div>
            );
          })}
        </div>
      </div>

      <style jsx>{`
        .image-section {
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          position: relative;
          transition: width 1s cubic-bezier(0.8, 0, 0.2, 1);
          z-index: 2;
          display: flex;
          justify-content: center;
          align-items: center;
          overflow: hidden;
        }

        /* Background Ambient Nodes */
        .bg-node {
          position: absolute;
          border-radius: 50%;
          opacity: 0.15;
          z-index: 1;
          backdrop-filter: blur(40px);
          will-change: transform;
        }

        .node-ambient-1 {
          width: 120px;
          height: 120px;
          top: 10%;
          left: 8%;
          background: rgba(255, 255, 255, 0.3);
          animation: float 8s infinite ease-in-out;
        }

        .node-ambient-2 {
          width: 90px;
          height: 90px;
          bottom: 15%;
          right: 10%;
          background: rgba(255, 255, 255, 0.25);
          animation: float 6s infinite ease-in-out reverse;
        }

        .node-ambient-3 {
          width: 70px;
          height: 70px;
          top: 50%;
          right: 15%;
          background: rgba(255, 255, 255, 0.2);
          animation: float 7s infinite ease-in-out;
        }

        @keyframes float {
          0%, 100% {
            transform: translate(0, 0);
          }
          33% {
            transform: translate(15px, -20px);
          }
          66% {
            transform: translate(-15px, 10px);
          }
        }

        /* Main Network Container */
        .network-floater {
          animation: float-gentle 5s ease-in-out infinite;
          position: relative;
          z-index: 10;
          will-change: transform;
        }

        @keyframes float-gentle {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-12px);
          }
        }

        .network-container {
          width: 300px;
          height: 300px;
          position: relative;
          display: flex;
          justify-content: center;
          align-items: center;
          transition: all 0.3s ease;
          transform-style: preserve-3d;
        }

        .connections-canvas {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 1;
        }

        /* Connection Lines Styles */
        .connection-line {
          stroke: rgba(255, 255, 255, 0.6);
          stroke-width: 2;
          fill: none;
          transition: all 0.3s ease;
          will-change: opacity, filter;
          filter: drop-shadow(0 0 4px rgba(255, 255, 255, 0.3));
        }

        .inner-connection {
          stroke: rgba(255, 255, 255, 0.8);
          stroke-width: 2.5;
          animation: pulse-line 3s ease-in-out infinite;
        }

        .middle-connection {
          stroke: rgba(255, 255, 255, 0.5);
          stroke-width: 1.5;
          animation: pulse-line 4s ease-in-out infinite;
          animation-delay: 0.5s;
        }

        .cross-connection {
          stroke: rgba(255, 255, 255, 0.3);
          stroke-width: 1;
          stroke-dasharray: 4, 4;
          animation: dash-flow 2s linear infinite;
        }

        @keyframes pulse-line {
          0%, 100% {
            opacity: 0.6;
          }
          50% {
            opacity: 1;
          }
        }

        @keyframes dash-flow {
          0% {
            stroke-dashoffset: 0;
          }
          100% {
            stroke-dashoffset: -8;
          }
        }

        /* Data Particles */
        .data-particle {
          filter: drop-shadow(0 0 4px rgba(255, 255, 255, 0.8));
          animation: particle-pulse 1s ease-in-out infinite;
        }

        @keyframes particle-pulse {
          0%, 100% {
            opacity: 0.6;
            r: 2;
          }
          50% {
            opacity: 1;
            r: 3;
          }
        }

        /* Privacy Mode */
        .network-container.privacy-mode {
          filter: blur(4px);
          opacity: 0.3;
        }

        .network-container.privacy-mode .connection-line {
          opacity: 0.1;
        }

        .network-container.privacy-mode .data-particle {
          opacity: 0;
        }

        .network-container.privacy-mode .hub-node {
          transform: translate(-50%, -50%) scale(0.9);
        }

        /* Connected State */
        .network-container.connected .node-core {
          background: radial-gradient(circle, #10b981, #059669);
          box-shadow: 0 0 30px rgba(16, 185, 129, 0.9);
          animation: pulse-success 1s ease-in-out infinite;
        }

        .network-container.connected .connection-line {
          stroke: #10b981;
          stroke-width: 3;
          filter: drop-shadow(0 0 10px rgba(16, 185, 129, 0.8));
          animation: connect-pulse 1s ease-out forwards;
        }

        .network-container.connected .data-particle {
          fill: #10b981;
          filter: drop-shadow(0 0 6px rgba(16, 185, 129, 1));
          r: 3;
        }

        /* Disconnected State */
        .network-container.disconnected .node-core {
          background: radial-gradient(circle, #ef4444, #dc2626);
          animation: shake 0.5s ease-in-out;
        }

        .network-container.disconnected .connection-line {
          stroke: #ef4444;
          stroke-dasharray: 5, 5;
          opacity: 0.3;
          animation: disconnect 0.5s ease-out forwards;
        }

        .network-container.disconnected .data-particle {
          opacity: 0;
        }

        @keyframes pulse-success {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.15);
          }
        }

        @keyframes connect-pulse {
          0% {
            stroke-dasharray: 200;
            stroke-dashoffset: 200;
          }
          100% {
            stroke-dasharray: 200;
            stroke-dashoffset: 0;
          }
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }

        @keyframes disconnect {
          0% {
            opacity: 1;
          }
          100% {
            opacity: 0.3;
          }
        }

        /* Central Hub Node */
        .hub-node {
          width: 50px;
          height: 50px;
          position: absolute;
          transform: translate(-50%, -50%);
          z-index: 10;
          transition: transform 0.3s ease;
        }

        .hub-node .node-core {
          width: 100%;
          height: 100%;
          background: radial-gradient(circle at 30% 30%, #ffffff, #e0e7ff);
          border-radius: 50%;
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2),
                      inset 0 2px 8px rgba(255, 255, 255, 0.9);
          position: relative;
          z-index: 2;
          transition: all 0.3s ease;
          animation: hub-rotate 20s linear infinite;
        }

        @keyframes hub-rotate {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        .hub-node .node-pulse {
          position: absolute;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.4);
          animation: pulse-ring 2s ease-out infinite;
          z-index: 1;
        }

        @keyframes pulse-ring {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          100% {
            transform: scale(1.8);
            opacity: 0;
          }
        }

        .lock-icon {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 24px;
          z-index: 3;
          animation: fadeIn 0.3s ease-in;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.5);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }

        /* Satellite Nodes */
        .satellite-node {
          position: absolute;
          transform-origin: center center;
          will-change: transform;
          z-index: 5;
        }

        .satellite-node .node-core {
          width: 100%;
          height: 100%;
          background: radial-gradient(circle at 35% 35%, #ffffff, #c7d2fe);
          border-radius: 50%;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15),
                      inset 0 1px 4px rgba(255, 255, 255, 0.9);
          transition: all 0.3s ease;
          animation: node-pulse 3s ease-in-out infinite;
        }

        .inner-node {
          width: 20px;
          height: 20px;
        }

        .inner-node .node-core {
          animation-delay: 0s;
        }

        .middle-node {
          width: 16px;
          height: 16px;
        }

        .middle-node .node-core {
          animation-delay: 0.5s;
          background: radial-gradient(circle at 35% 35%, #ffffff, #ddd6fe);
        }

        @keyframes node-pulse {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15),
                        inset 0 1px 4px rgba(255, 255, 255, 0.9);
          }
          50% {
            transform: scale(1.1);
            box-shadow: 0 6px 20px rgba(255, 255, 255, 0.4),
                        inset 0 1px 4px rgba(255, 255, 255, 0.9);
          }
        }

        @media (max-width: 768px) {
          .network-container {
            width: 220px;
            height: 220px;
          }

          .hub-node {
            width: 38px;
            height: 38px;
          }

          .inner-node {
            width: 16px;
            height: 16px;
          }

          .middle-node {
            width: 12px;
            height: 12px;
          }

          .lock-icon {
            font-size: 16px;
          }

          .connections-canvas {
            width: 220px;
            height: 220px;
          }
        }
      `}</style>
    </div>
  );
}

