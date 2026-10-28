/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

/**
 * Artwork 1 — FraudMesh Hero Illustration
 * A premium futuristic financial intelligence network floating in a clean pearl-white environment.
 * Featuring glass nodes, directional blue/cyan data pathways, crimson suspicious vector, and central core.
 */
export const HeroNetworkArtwork: React.FC<{ className?: string }> = ({ className = 'w-full h-auto' }) => (
  <svg
    viewBox="0 0 680 380"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    role="img"
    aria-label="FraudMesh Financial Intelligence Directed Network"
  >
    <defs>
      <linearGradient id="hero-bg-grad" x1="0" y1="0" x2="680" y2="380" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="50%" stopColor="#F8FAFC" />
        <stop offset="100%" stopColor="#EEF2F6" />
      </linearGradient>
      <linearGradient id="hero-blue-stream" x1="120" y1="190" x2="340" y2="190" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.4" />
        <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.9" />
      </linearGradient>
      <linearGradient id="hero-red-threat" x1="340" y1="190" x2="560" y2="130" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#F59E0B" />
        <stop offset="100%" stopColor="#DC2626" />
      </linearGradient>
      <filter id="hero-soft-glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="8" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
      <filter id="hero-node-shadow" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="6" stdDeviation="10" floodColor="#0F172A" floodOpacity="0.08" />
      </filter>
    </defs>

    {/* Background Base */}
    <rect width="680" height="380" rx="20" fill="url(#hero-bg-grad)" />
    
    {/* Subtle Grid Matrix */}
    <g opacity="0.4">
      {Array.from({ length: 9 }).map((_, i) => (
        <line key={`vg-${i}`} x1={40 + i * 75} y1="30" x2={40 + i * 75} y2="350" stroke="#E2E8F0" strokeDasharray="3 4" strokeWidth="1" />
      ))}
      {Array.from({ length: 5 }).map((_, i) => (
        <line key={`hg-${i}`} x1="30" y1={50 + i * 70} x2="650" y2={50 + i * 70} stroke="#E2E8F0" strokeDasharray="3 4" strokeWidth="1" />
      ))}
    </g>

    {/* Directed Edge Pathway 1: Normal Inflow */}
    <path d="M 110 120 C 180 140, 240 180, 340 190" stroke="url(#hero-blue-stream)" strokeWidth="2.5" fill="none" />
    <path d="M 120 260 C 200 240, 250 200, 340 190" stroke="#06B6D4" strokeWidth="2" strokeDasharray="6 4" fill="none" opacity="0.7" />
    
    {/* Directed Edge Pathway 2: Normal Corporate Outflow */}
    <path d="M 340 190 C 420 210, 480 270, 560 270" stroke="#3B82F6" strokeWidth="2" fill="none" opacity="0.6" />
    
    {/* Directed Edge Pathway 3: Anomalous Suspicious Route (Red / Amber) */}
    <path d="M 340 190 C 430 140, 480 120, 560 110" stroke="url(#hero-red-threat)" strokeWidth="3" fill="none" filter="url(#hero-soft-glow)" />

    {/* Intermediate Splitting Vectors */}
    <path d="M 340 190 C 390 110, 430 70, 490 60" stroke="#F59E0B" strokeWidth="1.75" strokeDasharray="4 3" fill="none" />
    <path d="M 490 60 C 530 50, 550 80, 560 110" stroke="#DC2626" strokeWidth="2" strokeDasharray="5 3" fill="none" />

    {/* Ambient Glows */}
    <circle cx="340" cy="190" r="54" fill="#06B6D4" opacity="0.12" filter="url(#hero-soft-glow)" />
    <circle cx="560" cy="110" r="44" fill="#DC2626" opacity="0.14" filter="url(#hero-soft-glow)" />

    {/* Peripheral Normal Nodes */}
    <g filter="url(#hero-node-shadow)">
      <circle cx="110" cy="120" r="22" fill="#FFFFFF" stroke="#3B82F6" strokeWidth="2" />
      <text x="110" y="124" textAnchor="middle" fontSize="10" fontWeight="600" fill="#1E40AF" fontFamily="var(--font-mono)">ACC-001</text>

      <circle cx="120" cy="260" r="20" fill="#FFFFFF" stroke="#06B6D4" strokeWidth="2" />
      <text x="120" y="264" textAnchor="middle" fontSize="9" fontWeight="600" fill="#0E7490" fontFamily="var(--font-mono)">ACC-008</text>

      <circle cx="560" cy="270" r="22" fill="#FFFFFF" stroke="#64748B" strokeWidth="2" />
      <text x="560" y="274" textAnchor="middle" fontSize="10" fontWeight="600" fill="#334155" fontFamily="var(--font-mono)">ACC-072</text>
    </g>

    {/* Central Forensic Hub Node (ACC-050) */}
    <g filter="url(#hero-node-shadow)">
      <circle cx="340" cy="190" r="32" fill="#FFFFFF" stroke="#2563EB" strokeWidth="3" />
      <circle cx="340" cy="190" r="26" fill="#EFF6FF" />
      <text x="340" y="188" textAnchor="middle" fontSize="11" fontWeight="700" fill="#1D4ED8" fontFamily="var(--font-mono)">ACC-050</text>
      <text x="340" y="202" textAnchor="middle" fontSize="8.5" fontWeight="500" fill="#64748B">Originator</text>
    </g>

    {/* Intermediary Structuring Conduit */}
    <g filter="url(#hero-node-shadow)">
      <circle cx="490" cy="60" r="18" fill="#FFFFFF" stroke="#F59E0B" strokeWidth="2" />
      <text x="490" y="64" textAnchor="middle" fontSize="8.5" fontWeight="600" fill="#B45309" fontFamily="var(--font-mono)">ACC-051</text>
    </g>

    {/* High-Risk Destination Node (ACC-055) */}
    <g filter="url(#hero-node-shadow)">
      <circle cx="560" cy="110" r="28" fill="#FFFFFF" stroke="#DC2626" strokeWidth="3" />
      <circle cx="560" cy="110" r="22" fill="#FEF2F2" />
      <text x="560" y="108" textAnchor="middle" fontSize="10.5" fontWeight="700" fill="#B91C1C" fontFamily="var(--font-mono)">ACC-055</text>
      <text x="560" y="122" textAnchor="middle" fontSize="8" fontWeight="600" fill="#DC2626">Risk: 93/100</text>
    </g>

    {/* Floating Evidence Badges */}
    <g filter="url(#hero-node-shadow)">
      {/* Badge 1 */}
      <rect x="200" y="75" width="135" height="34" rx="10" fill="#FFFFFF" stroke="#E2E8F0" />
      <circle cx="215" cy="92" r="4" fill="#059669" />
      <text x="226" y="88" fontSize="9" fontWeight="600" fill="#0F172A">Temporal Causality</text>
      <text x="226" y="100" fontSize="8" fill="#64748B">Strict Chronological Validation</text>

      {/* Badge 2 */}
      <rect x="420" y="295" width="165" height="36" rx="10" fill="#FFFFFF" stroke="#E2E8F0" />
      <circle cx="435" cy="313" r="4" fill="#DC2626" />
      <text x="446" y="309" fontSize="9" fontWeight="600" fill="#0F172A">Split-and-Merge Topology</text>
      <text x="446" y="321" fontSize="8" fill="#64748B">4 Conduits · 96% Retention Parity</text>
    </g>
  </svg>
);

/**
 * Artwork 2 — Money Mule Chain
 * Multi-hop linear conduit route showing rapid pass-through transit across newly opened accounts.
 */
export const MoneyMuleArtwork: React.FC<{ className?: string }> = ({ className = 'w-full h-auto' }) => (
  <svg viewBox="0 0 580 200" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <linearGradient id="mule-grad" x1="50" y1="100" x2="530" y2="100" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#3B82F6" />
        <stop offset="50%" stopColor="#F59E0B" />
        <stop offset="100%" stopColor="#DC2626" />
      </linearGradient>
    </defs>
    <rect width="580" height="200" rx="16" fill="#F8FAFC" stroke="#E2E8F0" />
    
    {/* Flowing Connector */}
    <path d="M 80 100 L 190 100 L 300 100 L 410 100 L 510 100" stroke="url(#mule-grad)" strokeWidth="3" strokeDasharray="6 4" />
    
    {/* Hop 1: Origin */}
    <g transform="translate(80, 100)">
      <circle r="24" fill="#FFFFFF" stroke="#3B82F6" strokeWidth="2.5" />
      <text textAnchor="middle" y="4" fontSize="9.5" fontWeight="700" fill="#1E40AF" fontFamily="var(--font-mono)">ACC-021</text>
      <text textAnchor="middle" y="36" fontSize="8.5" fill="#64748B">Origin (INR 5L)</text>
    </g>

    {/* Hop 2: Conduit 1 */}
    <g transform="translate(190, 100)">
      <circle r="22" fill="#FFFFFF" stroke="#F59E0B" strokeWidth="2.5" />
      <text textAnchor="middle" y="4" fontSize="9" fontWeight="700" fill="#B45309" fontFamily="var(--font-mono)">ACC-022</text>
      <text textAnchor="middle" y="36" fontSize="8" fill="#D97706">+12 min (98%)</text>
    </g>

    {/* Hop 3: Conduit 2 */}
    <g transform="translate(300, 100)">
      <circle r="22" fill="#FFFFFF" stroke="#F59E0B" strokeWidth="2.5" />
      <text textAnchor="middle" y="4" fontSize="9" fontWeight="700" fill="#B45309" fontFamily="var(--font-mono)">ACC-023</text>
      <text textAnchor="middle" y="36" fontSize="8" fill="#D97706">+18 min (97%)</text>
    </g>

    {/* Hop 4: Conduit 3 */}
    <g transform="translate(410, 100)">
      <circle r="22" fill="#FFFFFF" stroke="#F97316" strokeWidth="2.5" />
      <text textAnchor="middle" y="4" fontSize="9" fontWeight="700" fill="#C2410C" fontFamily="var(--font-mono)">ACC-024</text>
      <text textAnchor="middle" y="36" fontSize="8" fill="#C2410C">+24 min (96%)</text>
    </g>

    {/* Hop 5: Extraction Node */}
    <g transform="translate(510, 100)">
      <circle r="24" fill="#FFFFFF" stroke="#DC2626" strokeWidth="3" />
      <text textAnchor="middle" y="4" fontSize="9.5" fontWeight="700" fill="#B91C1C" fontFamily="var(--font-mono)">ACC-025</text>
      <text textAnchor="middle" y="36" fontSize="8.5" fontWeight="600" fill="#DC2626">Extraction</text>
    </g>
  </svg>
);

/**
 * Artwork 3 — Circular Wash Network
 * Closed directed circular loop returning 98%+ of funds to originator with timestamp sequencing.
 */
export const CircularWashArtwork: React.FC<{ className?: string }> = ({ className = 'w-full h-auto' }) => (
  <svg viewBox="0 0 420 300" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect width="420" height="300" rx="16" fill="#F8FAFC" stroke="#E2E8F0" />
    
    {/* Circular Directed Flow */}
    <circle cx="210" cy="150" r="85" stroke="#E2E8F0" strokeWidth="4" />
    <path d="M 210 65 A 85 85 0 0 1 295 150" stroke="#DC2626" strokeWidth="3" strokeDasharray="5 3" />
    <path d="M 295 150 A 85 85 0 0 1 210 235" stroke="#F59E0B" strokeWidth="3" strokeDasharray="5 3" />
    <path d="M 210 235 A 85 85 0 0 1 125 150" stroke="#3B82F6" strokeWidth="3" strokeDasharray="5 3" />
    <path d="M 125 150 A 85 85 0 0 1 210 65" stroke="#06B6D4" strokeWidth="3" strokeDasharray="5 3" />

    {/* Center Core Badge */}
    <circle cx="210" cy="150" r="34" fill="#FEF2F2" stroke="#FCA5A5" />
    <text textAnchor="middle" x="210" y="146" fontSize="9" fontWeight="700" fill="#991B1B">CLOSED LOOP</text>
    <text textAnchor="middle" x="210" y="160" fontSize="8" fontWeight="600" fill="#DC2626">Cycle Discovered</text>

    {/* Node 1: ACC-031 (Top) */}
    <g transform="translate(210, 65)">
      <circle r="22" fill="#FFFFFF" stroke="#DC2626" strokeWidth="2.5" />
      <text textAnchor="middle" y="4" fontSize="9" fontWeight="700" fill="#991B1B" fontFamily="var(--font-mono)">ACC-031</text>
    </g>

    {/* Node 2: ACC-032 (Right) */}
    <g transform="translate(295, 150)">
      <circle r="22" fill="#FFFFFF" stroke="#F59E0B" strokeWidth="2.5" />
      <text textAnchor="middle" y="4" fontSize="9" fontWeight="700" fill="#B45309" fontFamily="var(--font-mono)">ACC-032</text>
    </g>

    {/* Node 3: ACC-033 (Bottom) */}
    <g transform="translate(210, 235)">
      <circle r="22" fill="#FFFFFF" stroke="#3B82F6" strokeWidth="2.5" />
      <text textAnchor="middle" y="4" fontSize="9" fontWeight="700" fill="#1E40AF" fontFamily="var(--font-mono)">ACC-033</text>
    </g>

    {/* Node 4: ACC-034 (Left) */}
    <g transform="translate(125, 150)">
      <circle r="22" fill="#FFFFFF" stroke="#06B6D4" strokeWidth="2.5" />
      <text textAnchor="middle" y="4" fontSize="9" fontWeight="700" fill="#0E7490" fontFamily="var(--font-mono)">ACC-034</text>
    </g>
  </svg>
);

/**
 * Artwork 4 — Split-and-Merge Network
 * Fan-out from originator ACC-050 to 4 intermediary conduits and subsequent fan-in consolidation at ACC-055.
 */
export const SplitMergeArtwork: React.FC<{ className?: string }> = ({ className = 'w-full h-auto' }) => (
  <svg viewBox="0 0 540 260" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect width="540" height="260" rx="16" fill="#F8FAFC" stroke="#E2E8F0" />
    
    {/* Fan-Out Paths */}
    <path d="M 80 130 C 140 130, 180 50, 260 50" stroke="#3B82F6" strokeWidth="2" strokeDasharray="4 3" />
    <path d="M 80 130 C 140 130, 180 100, 260 100" stroke="#06B6D4" strokeWidth="2" strokeDasharray="4 3" />
    <path d="M 80 130 C 140 130, 180 160, 260 160" stroke="#06B6D4" strokeWidth="2" strokeDasharray="4 3" />
    <path d="M 80 130 C 140 130, 180 210, 260 210" stroke="#3B82F6" strokeWidth="2" strokeDasharray="4 3" />

    {/* Fan-In Paths */}
    <path d="M 260 50 C 340 50, 380 130, 460 130" stroke="#F59E0B" strokeWidth="2" />
    <path d="M 260 100 C 340 100, 380 130, 460 130" stroke="#F97316" strokeWidth="2" />
    <path d="M 260 160 C 340 160, 380 130, 460 130" stroke="#F97316" strokeWidth="2" />
    <path d="M 260 210 C 340 210, 380 130, 460 130" stroke="#DC2626" strokeWidth="2" />

    {/* Originator Node */}
    <g transform="translate(80, 130)">
      <circle r="26" fill="#FFFFFF" stroke="#2563EB" strokeWidth="3" />
      <text textAnchor="middle" y="4" fontSize="10" fontWeight="700" fill="#1D4ED8" fontFamily="var(--font-mono)">ACC-050</text>
      <text textAnchor="middle" y="38" fontSize="8" fill="#64748B">Origin (INR 12L)</text>
    </g>

    {/* 4 Intermediary Conduit Nodes */}
    {['ACC-051', 'ACC-052', 'ACC-053', 'ACC-054'].map((acc, i) => {
      const y = 50 + i * 53.3;
      return (
        <g key={acc} transform={`translate(260, ${y})`}>
          <circle r="18" fill="#FFFFFF" stroke="#06B6D4" strokeWidth="2" />
          <text textAnchor="middle" y="4" fontSize="8" fontWeight="600" fill="#0E7490" fontFamily="var(--font-mono)">{acc}</text>
        </g>
      );
    })}

    {/* Destination Consolidation Node */}
    <g transform="translate(460, 130)">
      <circle r="26" fill="#FFFFFF" stroke="#DC2626" strokeWidth="3" />
      <text textAnchor="middle" y="4" fontSize="10" fontWeight="700" fill="#B91C1C" fontFamily="var(--font-mono)">ACC-055</text>
      <text textAnchor="middle" y="38" fontSize="8" fontWeight="600" fill="#DC2626">Reconverged Sink</text>
    </g>
  </svg>
);

/**
 * Artwork 5 — Digital DNA
 * 10-Axis Behavioral Fingerprint with historical baseline vs current anomaly.
 */
export const DigitalDnaArtwork: React.FC<{ className?: string }> = ({ className = 'w-full h-auto' }) => (
  <svg viewBox="0 0 380 260" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect width="380" height="260" rx="16" fill="#F8FAFC" stroke="#E2E8F0" />
    
    <g transform="translate(190, 130)">
      {/* 3 Concentric Reference Rings */}
      <circle r="30" stroke="#E2E8F0" strokeWidth="1" />
      <circle r="60" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="3 3" />
      <circle r="90" stroke="#CBD5E1" strokeWidth="1" />

      {/* 10 Axis Lines */}
      {Array.from({ length: 10 }).map((_, i) => {
        const rad = (i * 2 * Math.PI) / 10 - Math.PI / 2;
        return (
          <line
            key={`dna-axis-${i}`}
            x1="0"
            y1="0"
            x2={Math.cos(rad) * 90}
            y2={Math.sin(rad) * 90}
            stroke="#E2E8F0"
            strokeWidth="1"
          />
        );
      })}

      {/* Historical Baseline Polygon (Dashed Cyan/Blue) */}
      <polygon
        points="0,-35 24,-24 35,0 24,24 0,32 -24,24 -32,0 -24,-24"
        fill="#06B6D4"
        fillOpacity="0.12"
        stroke="#06B6D4"
        strokeWidth="1.75"
        strokeDasharray="4 3"
      />

      {/* Anomalous Current Polygon (Solid Red/Amber) */}
      <polygon
        points="0,-82 55,-35 75,10 60,65 0,40 -65,30 -75,-20 -40,-60"
        fill="#DC2626"
        fillOpacity="0.18"
        stroke="#DC2626"
        strokeWidth="2.25"
      />

      <circle cx="0" cy="-82" r="3.5" fill="#DC2626" />
      <circle cx="75" cy="10" r="3.5" fill="#DC2626" />
      <circle cx="60" cy="65" r="3.5" fill="#DC2626" />
      <circle cx="-75" cy="-20" r="3.5" fill="#DC2626" />
    </g>

    {/* Legend */}
    <g transform="translate(24, 22)">
      <line x1="0" y1="6" x2="16" y2="6" stroke="#06B6D4" strokeWidth="2" strokeDasharray="3 2" />
      <text x="22" y="10" fontSize="8.5" fill="#0E7490">Historical Baseline</text>
      
      <line x1="120" y1="6" x2="136" y2="6" stroke="#DC2626" strokeWidth="2" />
      <text x="142" y="10" fontSize="8.5" fontWeight="600" fill="#DC2626">Current Anomaly (81/100)</text>
    </g>
  </svg>
);

/**
 * Artwork 6 — AI Forensic Intelligence Core
 * Visualizing an AI analysis engine connected to verified ledger, graph topology, and case filings.
 */
export const AiCopilotArtwork: React.FC<{ className?: string }> = ({ className = 'w-full h-auto' }) => (
  <svg viewBox="0 0 460 220" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <linearGradient id="ai-core-grad" x1="180" y1="60" x2="280" y2="160" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#2563EB" />
        <stop offset="50%" stopColor="#6366F1" />
        <stop offset="100%" stopColor="#06B6D4" />
      </linearGradient>
    </defs>
    <rect width="460" height="220" rx="16" fill="#F8FAFC" stroke="#E2E8F0" />
    
    {/* Connectors */}
    <path d="M 80 70 C 140 70, 160 110, 230 110" stroke="#94A3B8" strokeWidth="1.5" strokeDasharray="4 3" />
    <path d="M 80 150 C 140 150, 160 110, 230 110" stroke="#94A3B8" strokeWidth="1.5" strokeDasharray="4 3" />
    <path d="M 230 110 C 300 110, 320 110, 380 110" stroke="#2563EB" strokeWidth="2.5" />

    {/* Source 1: Verified Ledger */}
    <g transform="translate(40, 50)">
      <rect width="80" height="40" rx="8" fill="#FFFFFF" stroke="#CBD5E1" />
      <text x="40" y="22" textAnchor="middle" fontSize="8.5" fontWeight="600" fill="#334155">Ledger Txs</text>
      <text x="40" y="32" textAnchor="middle" fontSize="7.5" fill="#64748B">999 Records</text>
    </g>

    {/* Source 2: Graph Engine */}
    <g transform="translate(40, 130)">
      <rect width="80" height="40" rx="8" fill="#FFFFFF" stroke="#CBD5E1" />
      <text x="40" y="22" textAnchor="middle" fontSize="8.5" fontWeight="600" fill="#334155">Graph Topology</text>
      <text x="40" y="32" textAnchor="middle" fontSize="7.5" fill="#64748B">85 Nodes · ARTT</text>
    </g>

    {/* Central AI Forensic Engine */}
    <g transform="translate(230, 110)">
      <circle r="36" fill="url(#ai-core-grad)" />
      <circle r="26" fill="#FFFFFF" />
      <text textAnchor="middle" y="-2" fontSize="9" fontWeight="700" fill="#1D4ED8">GEMINI</text>
      <text textAnchor="middle" y="10" fontSize="7.5" fontWeight="600" fill="#6366F1">COPILOT</text>
    </g>

    {/* Output: Case Dossier & STR */}
    <g transform="translate(340, 85)">
      <rect width="90" height="50" rx="8" fill="#FFFFFF" stroke="#2563EB" strokeWidth="2" />
      <text x="45" y="22" textAnchor="middle" fontSize="8.5" fontWeight="700" fill="#1E40AF">Evidence Dossier</text>
      <text x="45" y="34" textAnchor="middle" fontSize="7.5" fill="#059669">STR Ready</text>
      <text x="45" y="44" textAnchor="middle" fontSize="7" fill="#64748B">Audit Trail Verified</text>
    </g>
  </svg>
);
