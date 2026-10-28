import React from 'react';
import { DigitalDNAProfile } from '../types/fraudmesh';

interface DigitalDNARadarProps {
  profile: DigitalDNAProfile;
  comparisonProfile?: DigitalDNAProfile | null;
  size?: number;
}

export const DigitalDNARadar: React.FC<DigitalDNARadarProps> = ({
  profile,
  comparisonProfile,
  size = 360,
}) => {
  const axes = profile.axes;
  const count = axes.length;
  const center = size / 2;
  const radius = size * 0.34;

  const getCoordinates = (index: number, value: number) => {
    const angle = (Math.PI * 2 * index) / count - Math.PI / 2;
    const r = (Math.max(0, Math.min(100, value)) / 100) * radius;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };

  const baselinePoints = axes
    .map((a, i) => {
      const pt = getCoordinates(i, a.baselineNormalized);
      return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
    })
    .join(' ');

  const currentPoints = axes
    .map((a, i) => {
      const pt = getCoordinates(i, a.currentNormalized);
      return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
    })
    .join(' ');

  const comparePoints = comparisonProfile
    ? comparisonProfile.axes
        .map((a, i) => {
          const pt = getCoordinates(i, a.currentNormalized);
          return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
        })
        .join(' ')
    : null;

  const currentStrokeColor =
    profile.risk_level === 'High'
      ? '#f43f5e'
      : profile.risk_level === 'Medium'
      ? '#f59e0b'
      : '#10b981';

  const currentFillColor =
    profile.risk_level === 'High'
      ? 'rgba(244, 63, 94, 0.22)'
      : profile.risk_level === 'Medium'
      ? 'rgba(245, 158, 11, 0.22)'
      : 'rgba(16, 185, 129, 0.20)';

  return (
    <div className="flex flex-col items-center">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        data-testid="digital-dna-radar-svg"
        className="overflow-visible"
      >
        {/* Concentric Web Rings */}
        {[25, 50, 75, 100].map((level) => {
          const ringPoints = axes
            .map((_, i) => {
              const pt = getCoordinates(i, level);
              return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
            })
            .join(' ');
          return (
            <polygon
              key={level}
              points={ringPoints}
              fill={level === 100 ? 'rgba(241, 245, 249, 0.5)' : 'none'}
              stroke="rgba(148, 163, 184, 0.35)"
              strokeWidth={1}
            />
          );
        })}

        {/* Radial Spokes & Labels */}
        {axes.map((axis, i) => {
          const endPt = getCoordinates(i, 100);
          const labelPt = getCoordinates(i, 122);
          return (
            <g key={axis.key}>
              <line
                x1={center}
                y1={center}
                x2={endPt.x}
                y2={endPt.y}
                stroke="rgba(148, 163, 184, 0.4)"
                strokeWidth={1}
              />
              <text
                x={labelPt.x}
                y={labelPt.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={10.5}
                fill="#334155"
                className="font-semibold"
              >
                {axis.feature}
              </text>
            </g>
          );
        })}

        {/* Historical Baseline Polygon */}
        <polygon
          points={baselinePoints}
          fill="rgba(6, 182, 212, 0.16)"
          stroke="#0891b2"
          strokeWidth={2}
          strokeDasharray="4,2"
        />

        {/* Optional Comparison Account Polygon */}
        {comparePoints && (
          <polygon
            points={comparePoints}
            fill="rgba(168, 85, 247, 0.18)"
            stroke="#9333ea"
            strokeWidth={1.8}
          />
        )}

        {/* Current Behavioral Fingerprint Polygon */}
        <polygon
          points={currentPoints}
          fill={currentFillColor}
          stroke={currentStrokeColor}
          strokeWidth={2.5}
        />

        {/* Vertices for Current Behavior */}
        {axes.map((a, i) => {
          const pt = getCoordinates(i, a.currentNormalized);
          return (
            <circle
              key={a.key}
              cx={pt.x}
              cy={pt.y}
              r={3.8}
              fill={currentStrokeColor}
              stroke="#ffffff"
              strokeWidth={1.5}
            />
          );
        })}
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-medium text-slate-700 mt-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg">
        <span className="text-cyan-700 font-semibold flex items-center gap-1.5">
          <span className="w-2.5 h-0.5 bg-cyan-600 inline-block border-b border-dashed border-cyan-800" />
          Historical Baseline
        </span>
        <span aria-hidden="true" className="text-slate-300">·</span>
        <span
          className={`flex items-center gap-1.5 font-semibold ${
            profile.risk_level === 'High'
              ? 'text-rose-700'
              : profile.risk_level === 'Medium'
              ? 'text-amber-700'
              : 'text-emerald-700'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full inline-block ${
              profile.risk_level === 'High'
                ? 'bg-rose-600'
                : profile.risk_level === 'Medium'
                ? 'bg-amber-500'
                : 'bg-emerald-600'
            }`}
          />
          Current Fingerprint ({profile.account_id})
        </span>
        {comparisonProfile && (
          <>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span className="text-purple-700 font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full inline-block bg-purple-600" />
              Compare ({comparisonProfile.account_id})
            </span>
          </>
        )}
      </div>
    </div>
  );
};
