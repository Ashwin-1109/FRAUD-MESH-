import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { GraphEdge, GraphNode, RiskLevel } from '../types/fraudmesh';
import {
  Download,
  Maximize2,
  RefreshCw,
  Search,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';

interface MoneyTrailGraphProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  selectedAccountId: string;
  selectedTransactionId?: string | null;
  highlightedAccounts?: string[];
  highlightedTxIds?: string[];
  onSelectAccount: (accountId: string) => void;
  onSelectTransaction?: (txId: string) => void;
  height?: number;
  compact?: boolean;
}

interface SimNode extends d3.SimulationNodeDatum, GraphNode {}

interface SimLink extends d3.SimulationLinkDatum<SimNode> {
  id: string;
  source: SimNode | string;
  target: SimNode | string;
  amount: number;
  timestamp: string;
  transaction_type: string;
  risk_score: number;
  risk_level: RiskLevel;
  detected_patterns: string[];
}

export const MoneyTrailGraph: React.FC<MoneyTrailGraphProps> = ({
  nodes,
  edges,
  selectedAccountId,
  selectedTransactionId,
  highlightedAccounts = [],
  highlightedTxIds = [],
  onSelectAccount,
  onSelectTransaction,
  height = 520,
  compact = false,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [degreeHopFilter, setDegreeHopFilter] = useState<1 | 2 | 3 | 99>(2);
  const [minAmountFilter, setMinAmountFilter] = useState<number>(0);
  const [riskFilter, setRiskFilter] = useState<'ALL' | RiskLevel>('ALL');
  const [layoutSeed, setLayoutSeed] = useState(0);
  const [hoveredInfo, setHoveredInfo] = useState<{
    type: 'node' | 'edge';
    title: string;
    subtitle: string;
    meta: string;
  } | null>(null);

  // Compute subgraph around selectedAccountId or highlightedAccounts so graph stays responsive and crisp
  const { activeNodes, activeEdges } = useMemo(() => {
    const focusSet = new Set<string>();
    if (selectedAccountId) focusSet.add(selectedAccountId);
    highlightedAccounts.forEach((a) => focusSet.add(a));

    const reachable = new Set<string>(focusSet);
    if (degreeHopFilter < 99 && reachable.size > 0) {
      // First include all edges directly between highlighted/focused accounts
      edges.forEach((e) => {
        if (focusSet.has(e.source) && focusSet.has(e.target)) {
          reachable.add(e.source);
          reachable.add(e.target);
        }
      });

      // Then expand hops, prioritizing Medium/High risk or high-value edges when focusSet already has >3 nodes
      let frontier = new Set<string>(reachable);
      for (let hop = 0; hop < degreeHopFilter; hop++) {
        const nextFrontier = new Set<string>();
        edges.forEach((e) => {
          if (e.amount < minAmountFilter) return;
          if (riskFilter !== 'ALL' && e.risk_level !== riskFilter) return;
          // If a multi-node pathway is highlighted, prioritize anomalous edges on hop 2+ so random background noise doesn't crowd the pathway
          if (hop >= 1 && focusSet.size >= 4 && e.risk_level === 'Low' && !highlightedTxIds.includes(e.id)) {
            return;
          }
          if (frontier.has(e.source) && !reachable.has(e.target) && reachable.size < 28) {
            reachable.add(e.target);
            nextFrontier.add(e.target);
          }
          if (frontier.has(e.target) && !reachable.has(e.source) && reachable.size < 28) {
            reachable.add(e.source);
            nextFrontier.add(e.source);
          }
        });
        frontier = nextFrontier;
      }
    } else {
      nodes
        .filter((n) => n.risk_level !== 'Low' || focusSet.has(n.id))
        .forEach((n) => reachable.add(n.id));
      nodes.slice(0, 28).forEach((n) => reachable.add(n.id));
    }

    const filteredEdges = edges.filter((e) => {
      if (!reachable.has(e.source) || !reachable.has(e.target)) return false;
      if (e.amount < minAmountFilter) return false;
      if (riskFilter !== 'ALL' && e.risk_level !== riskFilter) return false;
      return true;
    });

    const bestEdgeMap = new Map<string, GraphEdge>();
    filteredEdges.forEach((e) => {
      const key = `${e.source}->${e.target}`;
      const existing = bestEdgeMap.get(key);
      if (
        !existing ||
        highlightedTxIds.includes(e.id) ||
        e.risk_score > existing.risk_score ||
        e.amount > existing.amount
      ) {
        bestEdgeMap.set(key, e);
      }
    });

    const dedupedEdges = Array.from(bestEdgeMap.values())
      .sort((a, b) => b.risk_score - a.risk_score)
      .slice(0, 48);
    const edgeNodeIds = new Set<string>(focusSet);
    dedupedEdges.forEach((e) => {
      edgeNodeIds.add(e.source);
      edgeNodeIds.add(e.target);
    });

    const filteredNodes = nodes.filter((n) => edgeNodeIds.has(n.id));
    return { activeNodes: filteredNodes, activeEdges: dedupedEdges };
  }, [
    nodes,
    edges,
    selectedAccountId,
    highlightedAccounts,
    highlightedTxIds,
    degreeHopFilter,
    minAmountFilter,
    riskFilter,
  ]);

  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;

    const width = svgEl.clientWidth || 860;
    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();

    // Define directional arrow markers for Low, Medium, High, and Cyan Highlighted edges
    const defs = svg.append('defs');
    const markerConfigs = [
      { id: 'arrow-low', color: '#10b981' },
      { id: 'arrow-medium', color: '#f59e0b' },
      { id: 'arrow-high', color: '#ef4444' },
      { id: 'arrow-cyan', color: '#06b6d4' },
    ];

    markerConfigs.forEach((m) => {
      defs
        .append('marker')
        .attr('id', m.id)
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 24)
        .attr('refY', 0)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', m.color);
    });

    const container = svg.append('g').attr('class', 'graph-canvas-group');

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.35, 3.2])
      .on('zoom', (event) => {
        container.attr('transform', event.transform);
      });

    zoomBehaviorRef.current = zoom;
    svg.call(zoom);

    const simNodes: SimNode[] = activeNodes.map((n, idx) => {
      const angle = (idx / Math.max(1, activeNodes.length)) * 2 * Math.PI;
      const radius = n.id === selectedAccountId ? 0 : 140 + (idx % 3) * 45;
      return {
        ...n,
        x: width / 2 + Math.cos(angle) * radius,
        y: height / 2 + Math.sin(angle) * radius,
      };
    });

    const nodeById = new Map<string, SimNode>();
    simNodes.forEach((n) => nodeById.set(n.id, n));

    const simLinks: SimLink[] = activeEdges
      .filter((e) => nodeById.has(e.source) && nodeById.has(e.target))
      .map((e) => ({
        ...e,
        source: nodeById.get(e.source)!,
        target: nodeById.get(e.target)!,
      }));

    const simulation = d3
      .forceSimulation<SimNode>(simNodes)
      .force(
        'link',
        d3
          .forceLink<SimNode, SimLink>(simLinks)
          .id((d) => d.id)
          .distance(105)
      )
      .force('charge', d3.forceManyBody().strength(-260))
      .force('center', d3.forceCenter(width / 2, height * 0.45))
      .force('x', d3.forceX(width / 2).strength(0.14))
      .force('y', d3.forceY(height * 0.45).strength(0.18))
      .force('collide', d3.forceCollide().radius(32));

    // Edge lines
    const linkGroup = container.append('g').attr('class', 'links');
    const linkElements = linkGroup
      .selectAll('line')
      .data(simLinks)
      .enter()
      .append('line')
      .attr('stroke-width', (d) => {
        const isHighlighted =
          highlightedTxIds.includes(d.id) ||
          d.id === selectedTransactionId ||
          (highlightedAccounts.includes((d.source as SimNode).id) &&
            highlightedAccounts.includes((d.target as SimNode).id));
        return isHighlighted ? 3 : d.risk_level === 'High' ? 2.2 : 1.5;
      })
      .attr('stroke', (d) => {
        const isHighlighted =
          highlightedTxIds.includes(d.id) ||
          d.id === selectedTransactionId ||
          (highlightedAccounts.includes((d.source as SimNode).id) &&
            highlightedAccounts.includes((d.target as SimNode).id));
        if (isHighlighted) return '#06b6d4';
        if (d.risk_level === 'High') return '#ef4444';
        if (d.risk_level === 'Medium') return '#f59e0b';
        return '#10b981';
      })
      .attr('stroke-opacity', 0.85)
      .attr('marker-end', (d) => {
        const isHighlighted =
          highlightedTxIds.includes(d.id) ||
          d.id === selectedTransactionId ||
          (highlightedAccounts.includes((d.source as SimNode).id) &&
            highlightedAccounts.includes((d.target as SimNode).id));
        if (isHighlighted) return 'url(#arrow-cyan)';
        if (d.risk_level === 'High') return 'url(#arrow-high)';
        if (d.risk_level === 'Medium') return 'url(#arrow-medium)';
        return 'url(#arrow-low)';
      })
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        event.stopPropagation();
        if (onSelectTransaction) onSelectTransaction(d.id);
      })
      .on('mouseenter', (_event, d) => {
        const sId = (d.source as SimNode).id;
        const tId = (d.target as SimNode).id;
        setHoveredInfo({
          type: 'edge',
          title: `${d.id}: ${sId} → ${tId}`,
          subtitle: `INR ${d.amount.toLocaleString('en-IN')} · ${d.transaction_type}`,
          meta: `Risk Score: ${d.risk_score}/100 (${d.risk_level}) · ${new Date(d.timestamp).toLocaleTimeString('en-IN')}`,
        });
      })
      .on('mouseleave', () => setHoveredInfo(null));

    // Edge amount labels
    const edgeLabels = container
      .append('g')
      .selectAll('text')
      .data(simLinks)
      .enter()
      .append('text')
      .attr('font-size', 9.5)
      .attr('font-family', 'JetBrains Mono, monospace')
      .attr('fill', '#475569')
      .attr('font-weight', '600')
      .attr('text-anchor', 'middle')
      .attr('dy', -5)
      .style('pointer-events', 'none')
      .text((d) =>
        d.amount >= 100000
          ? `INR ${(d.amount / 100000).toFixed(2)}L`
          : `INR ${Math.round(d.amount / 1000)}k`
      );

    // Nodes
    const nodeGroup = container
      .append('g')
      .selectAll('g')
      .data(simNodes)
      .enter()
      .append('g')
      .style('cursor', 'pointer')
      .call(
        d3
          .drag<SVGGElement, SimNode>()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.25).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on('drag', (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      )
      .on('click', (event, d) => {
        event.stopPropagation();
        onSelectAccount(d.id);
      })
      .on('mouseenter', (_event, d) => {
        setHoveredInfo({
          type: 'node',
          title: `${d.id} · ${d.holder_name}`,
          subtitle: `${d.account_type} · Volume: INR ${d.weightedVolume.toLocaleString('en-IN')}`,
          meta: `Risk: ${d.risk_score}/100 (${d.risk_level}) · In:${d.inDegree} Out:${d.outDegree}${d.inCycle ? ' · In Directed Cycle' : ''}`,
        });
      })
      .on('mouseleave', () => setHoveredInfo(null));

    // Outer halo for selected or highlighted path nodes
    nodeGroup
      .append('circle')
      .attr('r', (d) =>
        d.id === selectedAccountId || highlightedAccounts.includes(d.id) ? 21 : 0
      )
      .attr('fill', 'none')
      .attr('stroke', '#2563eb')
      .attr('stroke-width', 2.5)
      .attr('stroke-dasharray', (d) => (d.id === selectedAccountId ? 'none' : '3,2'));

    // Main node circle
    nodeGroup
      .append('circle')
      .attr('r', (d) => (d.id === selectedAccountId ? 16 : 13))
      .attr('fill', (d) => {
        if (d.id === selectedAccountId) return '#2563eb';
        if (d.risk_level === 'High') return '#dc2626';
        if (d.risk_level === 'Medium') return '#d97706';
        return '#059669';
      })
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 2.5)
      .attr('filter', 'drop-shadow(0 2px 4px rgba(15,23,42,0.18))');

    // Risk score inside node
    nodeGroup
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', 3.5)
      .attr('font-size', 9)
      .attr('font-family', 'JetBrains Mono, monospace')
      .attr('font-weight', '700')
      .attr('fill', '#ffffff')
      .style('pointer-events', 'none')
      .text((d) => d.risk_score);

    // Account ID label below node
    nodeGroup
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', 28)
      .attr('font-size', 10.5)
      .attr('font-family', 'JetBrains Mono, monospace')
      .attr('font-weight', (d) => (d.id === selectedAccountId ? '700' : '600'))
      .attr('fill', (d) => (d.id === selectedAccountId ? '#2563eb' : '#0f172a'))
      .style('pointer-events', 'none')
      .text((d) => d.id);

    simulation.on('tick', () => {
      linkElements
        .attr('x1', (d) => (d.source as SimNode).x || 0)
        .attr('y1', (d) => (d.source as SimNode).y || 0)
        .attr('x2', (d) => (d.target as SimNode).x || 0)
        .attr('y2', (d) => (d.target as SimNode).y || 0);

      edgeLabels
        .attr('x', (d) => (((d.source as SimNode).x || 0) + ((d.target as SimNode).x || 0)) / 2)
        .attr('y', (d) => (((d.source as SimNode).y || 0) + ((d.target as SimNode).y || 0)) / 2);

      nodeGroup.attr('transform', (d) => `translate(${d.x || 0},${d.y || 0})`);
    });

    return () => {
      simulation.stop();
    };
  }, [
    activeNodes,
    activeEdges,
    selectedAccountId,
    selectedTransactionId,
    highlightedAccounts,
    highlightedTxIds,
    height,
    layoutSeed,
    onSelectAccount,
    onSelectTransaction,
  ]);

  const handleZoom = (factor: number) => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    d3.select(svgRef.current)
      .transition()
      .duration(180)
      .call(zoomBehaviorRef.current.scaleBy, factor);
  };

  const handleResetZoom = () => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    d3.select(svgRef.current)
      .transition()
      .duration(200)
      .call(zoomBehaviorRef.current.transform, d3.zoomIdentity);
    setLayoutSeed((s) => s + 1);
  };

  const handleExportSVG = () => {
    if (!svgRef.current) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svgRef.current);
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fraudmesh-graph-${selectedAccountId}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    const q = searchTerm.trim().toUpperCase();
    const match = nodes.find(
      (n) => n.id.toUpperCase() === q || n.holder_name.toUpperCase().includes(q)
    );
    if (match) {
      onSelectAccount(match.id);
    }
  };

  return (
    <div className="flex flex-col border border-slate-200 rounded-2xl bg-white shadow-sm overflow-hidden">
      {/* Toolbar */}
      {!compact && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 border-b border-slate-200 bg-slate-50/90">
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Find account (e.g. ACC-050)..."
                aria-label="Search account in graph"
                className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-500 w-48 shadow-2xs"
              />
            </div>
            <button
              type="submit"
              className="px-2.5 py-1.5 text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-2xs"
            >
              Locate Node
            </button>
          </form>

          <div className="flex flex-wrap items-center gap-2">
            {/* Hop Degree Expansion */}
            <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-xl border border-slate-200/80">
              {([1, 2, 3, 99] as const).map((deg) => (
                <button
                  key={deg}
                  type="button"
                  onClick={() => setDegreeHopFilter(deg)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    degreeHopFilter === deg
                      ? 'bg-white text-blue-600 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {deg === 99 ? 'Full Mesh' : `${deg}-Hop`}
                </button>
              ))}
            </div>

            {/* Risk Filter */}
            <select
              aria-label="Filter graph edges by risk level"
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value as 'ALL' | RiskLevel)}
              className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 shadow-2xs font-medium"
            >
              <option value="ALL">All Risk Levels</option>
              <option value="High">High Risk Only</option>
              <option value="Medium">Medium Risk Only</option>
              <option value="Low">Low Risk Only</option>
            </select>

            {/* Min Amount Filter */}
            <select
              aria-label="Filter graph edges by minimum amount"
              value={minAmountFilter}
              onChange={(e) => setMinAmountFilter(Number(e.target.value))}
              className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 shadow-2xs font-medium"
            >
              <option value={0}>All Amounts (INR 0+)</option>
              <option value={25000}>≥ INR 25,000</option>
              <option value={48000}>≥ INR 48,000 (Structuring)</option>
              <option value={100000}>≥ INR 1,00,000</option>
            </select>

            {/* Zoom & Export Controls */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleZoom(1.25)}
                aria-label="Zoom in graph"
                className="p-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-slate-600 shadow-2xs"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleZoom(0.8)}
                aria-label="Zoom out graph"
                className="p-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-slate-600 shadow-2xs"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleResetZoom}
                aria-label="Reset graph layout"
                className="p-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-slate-600 shadow-2xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleExportSVG}
                aria-label="Export graph SVG"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-slate-700 shadow-2xs whitespace-nowrap shrink-0"
              >
                <Download className="w-3.5 h-3.5 text-blue-600" />
                Export SVG
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive SVG Canvas */}
      <div className="relative w-full" style={{ height: `${height}px` }}>
        <svg
          ref={svgRef}
          data-testid="money-trail-svg"
          className="w-full h-full select-none"
          style={{
            background:
              'radial-gradient(circle at 50% 50%, #FFFFFF 0%, #F1F5F9 100%)',
          }}
        />

        {/* Legend Overlay */}
        <div className="absolute bottom-3 left-3 flex flex-wrap items-center gap-4 px-3.5 py-2 rounded-xl bg-white/95 border border-slate-200/90 shadow-sm text-xs text-slate-700 pointer-events-none backdrop-blur-md">
          <span className="font-bold text-slate-900">Risk Legend:</span>
          <span className="text-emerald-700 font-semibold">Low (0–34)</span>
          <span aria-hidden="true" className="text-slate-300">·</span>
          <span className="text-amber-700 font-semibold">Medium (35–69)</span>
          <span aria-hidden="true" className="text-slate-300">·</span>
          <span className="text-rose-700 font-semibold">High (70–100)</span>
          <span aria-hidden="true" className="text-slate-300">·</span>
          <span className="text-blue-700 font-bold">Selected / ARTT Path</span>
          <span aria-hidden="true" className="text-slate-300">·</span>
          <span className="font-mono text-slate-500 font-medium">
            Nodes: {activeNodes.length} · Edges: {activeEdges.length}
          </span>
        </div>

        {/* Hover Tooltip */}
        {hoveredInfo && (
          <div className="absolute top-3 right-3 max-w-xs p-3.5 rounded-xl bg-white/98 border border-slate-200/90 shadow-xl text-xs pointer-events-none backdrop-blur-md space-y-1">
            <div className="font-bold text-blue-700 font-mono text-xs">{hoveredInfo.title}</div>
            <div className="text-slate-800 font-medium">{hoveredInfo.subtitle}</div>
            <div className="text-slate-500 font-mono text-[11px] mt-1">{hoveredInfo.meta}</div>
          </div>
        )}
      </div>
    </div>
  );
};
