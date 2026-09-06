import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, CheckCircle, 
  Activity, ArrowUpRight, ArrowDownRight, AlertOctagon,
  ThumbsDown, Check, FileDown, Filter, Zap, Radio, Loader2, Layers
} from 'lucide-react';
import { KPI, Block, Alert, Train, SimulationResult, TelemetryEvent } from './types';
import { mockKPIs, mockBlocks, mockAlerts, mockTrains, mockCorridors } from './data/mock';
import { simulationService } from './services/simulationService';
import { NormalizationLab } from './components/NormalizationLab';

// Reusable Components
const Card = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-gray-800 border border-gray-700 rounded-lg p-4 shadow-sm ${className}`}>
    {children}
  </div>
);

const KPICard = ({ kpi }: { kpi: KPI }) => {
  return (
    <Card className="flex flex-col gap-2">
      <div className="flex justify-between items-center text-sm text-gray-400">
        <span className="uppercase tracking-wider font-semibold">{kpi.label}</span>
        {kpi.status === 'good' ? <CheckCircle size={16} className="text-green-500" /> : <AlertTriangle size={16} className="text-yellow-500" />}
      </div>
      <div className="flex items-end gap-2">
        <span className="text-3xl font-bold text-white">{kpi.value}</span>
        {kpi.unit && <span className="text-gray-400 mb-1">{kpi.unit}</span>}
      </div>
      <div className="flex items-center text-xs mt-1">
        {kpi.trend === 'up' ? <ArrowUpRight size={14} className="text-green-400 mr-1" /> : 
         kpi.trend === 'down' ? <ArrowDownRight size={14} className="text-red-400 mr-1" /> : 
         <Activity size={14} className="text-gray-400 mr-1" />}
        <span className="text-gray-400">{kpi.trend_value}</span>
      </div>
    </Card>
  );
};

const Timeline = ({ blocks, corridors, onBlockClick }: { blocks: Block[], corridors: string[], onBlockClick: (b: Block) => void }) => {
  const hours = Array.from({ length: 13 }, (_, i) => i * 2); // 00, 02, 04...24
  
  // Very basic calc for position: 00:00 is 0%, 24:00 is 100%
  const calcPos = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    return ((h + m / 60) / 24) * 100;
  };

  return (
    <Card className="mt-6 overflow-x-auto">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-white">Master Corridor Timeline</h3>
        <div className="flex items-center gap-4 text-xs text-gray-400">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-blue-600 inline-block"></span>
            <span>Engineering</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-orange-600 inline-block"></span>
            <span>Electrical (TRD)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-600 inline-block"></span>
            <span>Signal & Telecom</span>
          </div>
        </div>
      </div>
      <div className="min-w-[800px]">
        {/* Time Header */}
        <div className="flex ml-24 relative h-6 border-b border-gray-700 mb-4">
          {hours.map(h => (
            <div key={h} className="absolute text-xs text-gray-500 transform -translate-x-1/2" style={{ left: `${(h/24)*100}%` }}>
              {h.toString().padStart(2, '0')}:00
            </div>
          ))}
        </div>
        
        {/* Rows */}
        <div className="space-y-4">
          {corridors.map(corridor => {
            const corridorBlocks = blocks.filter(b => b.section_id === corridor);
            return (
              <div key={corridor} className="flex items-center">
                <div className="w-24 text-sm font-medium text-gray-400 shrink-0">{corridor}</div>
                <div className="flex-1 relative h-8 bg-gray-900 rounded border border-gray-800">
                  {corridorBlocks.map(block => {
                    const startPos = calcPos(block.scheduled_start);
                    const endPos = calcPos(block.scheduled_end);
                    const width = Math.max(endPos - startPos, 2);
                    const bg = block.departments_involved.includes('Engineering') && block.departments_involved.includes('Signal & Telecom')
                      ? 'bg-indigo-600'
                      : block.departments_involved.includes('Engineering')
                      ? 'bg-blue-600'
                      : block.departments_involved.includes('Electrical')
                      ? 'bg-orange-600'
                      : 'bg-emerald-600';

                    return (
                      <div 
                        key={block.block_id}
                        onClick={() => onBlockClick(block)}
                        className={`absolute top-1 bottom-1 ${bg} rounded text-xs px-2 flex items-center cursor-pointer hover:brightness-110 shadow-sm border border-black/20 group transition`}
                        style={{ left: `${startPos}%`, width: `${width}%` }}
                        title={`${block.block_id} (${block.scheduled_start} - ${block.scheduled_end})`}
                      >
                        <span className="truncate w-full text-white font-medium flex items-center gap-1">
                          {block.status === 'APPROVED' && <Check size={10} className="text-green-300 shrink-0" />}
                          {block.block_id}
                        </span>
                      </div>
                    );
                  })}
                  {/* Current Time Indicator (Mocked at 10:45) */}
                  <div className="absolute top-[-10px] bottom-[-10px] w-0.5 bg-red-500 z-10" style={{ left: `${calcPos('10:45')}%` }}>
                    <div className="absolute -top-4 -translate-x-1/2 bg-red-500 text-white text-[10px] px-1 rounded font-mono">NOW</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
};

const AlertsPanel = ({ alerts }: { alerts: Alert[] }) => (
  <Card className="h-full flex flex-col">
    <h3 className="text-lg font-semibold mb-4 text-white flex items-center gap-2">
      <AlertOctagon size={18} className="text-red-400" /> Live Alerts
    </h3>
    <div className="space-y-3 overflow-y-auto flex-1 max-h-[380px]">
      {alerts.map(a => (
        <div key={a.id} className="p-3 bg-gray-900 border border-gray-700 rounded text-sm">
          <div className="flex justify-between mb-1">
            <span className={`font-semibold ${
              a.type === 'RESOLVED' ? 'text-green-400' :
              a.type === 'WARNING' ? 'text-yellow-400' : 
              a.type === 'TRAIN IMPACT' ? 'text-red-400' : 
              'text-orange-400'
            }`}>
              {a.type}
            </span>
            <span className="text-gray-500 text-xs font-mono">{a.timestamp}</span>
          </div>
          <p className="text-gray-300 text-xs leading-relaxed">{a.message}</p>
        </div>
      ))}
    </div>
  </Card>
);

const TrainsPanel = ({ trains }: { trains: Train[] }) => (
  <Card className="h-full flex flex-col">
    <h3 className="text-lg font-semibold mb-4 text-white">Active Conflicts / Trains</h3>
    <div className="space-y-3 overflow-y-auto flex-1 max-h-[380px]">
      {trains.map(t => (
        <div key={t.train_no} className="p-3 bg-gray-900 border border-gray-700 rounded text-sm flex flex-col">
          <div className="flex justify-between items-center mb-2">
            <span className="font-bold text-white">{t.train_type} {t.train_no}</span>
            <span className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded text-xs font-semibold">Delay: {t.delay_minutes}m</span>
          </div>
          <div className="text-gray-400 text-xs flex justify-between">
            <span>Name: {t.name}</span>
            <span>Exp: {t.expected_arrival}</span>
          </div>
        </div>
      ))}
    </div>
  </Card>
);

const TelemetryPanel = ({ telemetry, loading }: { telemetry: TelemetryEvent[]; loading: boolean }) => (
  <Card className="h-full flex flex-col">
    <div className="flex justify-between items-center mb-4">
      <h3 className="text-lg font-semibold text-white flex items-center gap-2">
        <Radio size={18} className="text-blue-400 animate-pulse" /> Live Operations Stream
      </h3>
      <span className="px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping"></span> F-06 FEED
      </span>
    </div>
    {loading && telemetry.length === 0 ? (
      <div className="flex flex-col items-center justify-center h-48 text-gray-500 space-y-3">
        <Activity size={32} className="opacity-50 animate-spin" />
        <p className="text-sm">Connecting to F-06 Telemetry...</p>
      </div>
    ) : (
      <div className="space-y-3 overflow-y-auto flex-1 max-h-[380px]">
        {telemetry.map(t => {
          const badgeClass = 
            t.badge_color === 'red' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
            t.badge_color === 'yellow' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
            t.badge_color === 'green' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
            'bg-blue-500/20 text-blue-400 border-blue-500/30';

          return (
            <div key={t.id} className="p-3 bg-gray-900 border border-gray-700 rounded text-sm hover:border-gray-600 transition">
              <div className="flex justify-between items-center mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-xs text-white">{t.section}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${badgeClass}`}>
                    {t.status}
                  </span>
                </div>
                <span className="text-gray-500 text-xs font-mono">{t.timestamp}</span>
              </div>
              <p className="text-gray-300 text-xs leading-relaxed">{t.detail}</p>
            </div>
          );
        })}
      </div>
    )}
  </Card>
);

const BlockModal = ({ 
  block, 
  onClose,
  onDecisionSubmit
}: { 
  block: Block; 
  onClose: () => void;
  onDecisionSubmit: (blockId: string, decision: 'approved' | 'rejected', reason?: string) => Promise<void>;
}) => {
  const [simulating, setSimulating] = useState(false);
  const [simResult, setSimResult] = useState<SimulationResult | null>(null);
  const [simulationError, setSimulationError] = useState<string | null>(null);
  const [newEndTime, setNewEndTime] = useState(block.scheduled_end);
  const [overrideReason, setOverrideReason] = useState(block.decision_reason || '');
  const [overrideStatus, setOverrideStatus] = useState<'pending' | 'approved' | 'rejected'>(
    block.decision ? block.decision : 'pending'
  );
  const [submittingDecision, setSubmittingDecision] = useState(false);
  const [decisionError, setDecisionError] = useState<string | null>(null);

  const handleSimulate = async () => {
    setSimulating(true);
    setSimulationError(null);
    try {
      const res = await simulationService.simulateWhatIf(block.block_id, newEndTime);
      setSimResult(res);
    } catch {
      setSimulationError('Simulation service is unavailable. Try again when the API is online.');
    } finally {
      setSimulating(false);
    }
  };

  const handleDecision = async (decision: 'approved' | 'rejected') => {
    if (decision === 'rejected' && !overrideReason.trim()) {
      alert("Please provide a reason for overriding/rejecting.");
      return;
    }
    setSubmittingDecision(true);
    setDecisionError(null);
    try {
      await onDecisionSubmit(block.block_id, decision, overrideReason.trim());
      setOverrideStatus(decision);
    } catch (err: any) {
      setDecisionError(err.message || 'Failed to submit decision to backend.');
    } finally {
      setSubmittingDecision(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-800">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-white">Block Details: {block.block_id}</h2>
            {block.status === 'APPROVED' && (
              <span className="px-2 py-0.5 bg-green-500/20 text-green-400 border border-green-500/30 rounded text-xs font-semibold flex items-center gap-1">
                <Check size={12} /> APPROVED
              </span>
            )}
            {block.status === 'OVERRIDDEN' && (
              <span className="px-2 py-0.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded text-xs font-semibold flex items-center gap-1">
                <ThumbsDown size={12} /> OVERRIDDEN
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 transition">Close</button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-800 p-3 rounded border border-gray-700">
                <div className="text-xs text-gray-400 mb-1">Section</div>
                <div className="font-semibold text-white">{block.section_id}</div>
              </div>
              <div className="bg-gray-800 p-3 rounded border border-gray-700">
                <div className="text-xs text-gray-400 mb-1">Time Window</div>
                <div className="font-semibold text-white">{block.scheduled_start} - {block.scheduled_end}</div>
              </div>
              <div className="bg-gray-800 p-3 rounded border border-gray-700">
                <div className="text-xs text-gray-400 mb-1">Status</div>
                <div className="font-semibold text-blue-400">{block.status}</div>
              </div>
              <div className="bg-gray-800 p-3 rounded border border-gray-700">
                <div className="text-xs text-gray-400 mb-1">Priority</div>
                <div className="font-semibold text-red-400">{block.priority}</div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-white mb-3">Tasks & SHAP Explainability</h3>
              {block.consolidated_tasks.map(task => (
                <div key={task.task_id} className="bg-gray-800 border border-gray-700 p-4 rounded-lg mb-3">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="font-semibold text-white">{task.task_id} - {task.description}</div>
                      <div className="text-sm text-gray-400 mt-1">Dept: {task.department} | Span: {task.track_km_span}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-orange-400">{task.priority_score.toFixed(1)}</div>
                      <div className="text-xs text-gray-500">Priority Score</div>
                    </div>
                  </div>
                  <div className="bg-gray-900 rounded p-3 text-sm">
                    <div className="text-gray-400 mb-2 font-medium text-xs uppercase tracking-wide">AI Priority Drivers (Base: 45.0)</div>
                    {task.explainability.map((exp, idx) => (
                      <div key={idx} className="flex items-center gap-3 mb-1.5">
                        <div className="w-32 text-gray-300 truncate text-xs">{exp.feature}</div>
                        <div className="flex-1 h-2 bg-gray-800 rounded overflow-hidden flex">
                          <div className="bg-orange-500 h-full" style={{ width: `${Math.min((exp.impact / 30) * 100, 100)}%` }}></div>
                        </div>
                        <div className="w-12 text-right text-green-400 text-xs">+{exp.impact}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-gray-800 border border-gray-700 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-white mb-3 flex items-center gap-2">Safety Information</h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div><span className="text-gray-400 block mb-1">Traffic Block</span> <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded">REQUIRED</span></div>
                <div><span className="text-gray-400 block mb-1">Power Block</span> <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded">NOT REQUIRED</span></div>
                <div><span className="text-gray-400 block mb-1">Safety Disconnection</span> <span className="text-white">Required</span></div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-gray-800 border border-indigo-500/30 p-4 rounded-lg shadow-[0_0_15px_rgba(99,102,241,0.1)]">
              <h3 className="text-lg font-medium text-white mb-3">What-If Simulator</h3>
              <p className="text-sm text-gray-400 mb-4">Extend block end time to simulate downstream network impact.</p>
              
              <div className="mb-4">
                <label className="block text-sm text-gray-300 mb-2">Simulated End Time</label>
                <div className="flex items-center gap-3">
                  <input 
                    type="time" 
                    value={newEndTime}
                    onChange={(e) => setNewEndTime(e.target.value)}
                    className="bg-gray-900 border border-gray-600 text-white rounded p-2 flex-1 outline-none focus:border-indigo-500 transition" 
                  />
                  <button 
                    onClick={handleSimulate}
                    disabled={simulating}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded font-medium disabled:opacity-50 transition"
                  >
                    {simulating ? 'Simulating...' : 'Run'}
                  </button>
                </div>
              </div>

              {simulationError && (
                <div role="alert" className="mb-4 rounded border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-300">
                  {simulationError}
                </div>
              )}

              {simResult && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-gray-900 p-3 rounded border border-gray-700">
                      <div className="text-xs text-gray-400 mb-1">Passenger Delay</div>
                      <div className="text-lg font-bold text-red-400">+{simResult.total_passenger_delay_minutes}m</div>
                    </div>
                    <div className="bg-gray-900 p-3 rounded border border-gray-700">
                      <div className="text-xs text-gray-400 mb-1">Punctuality Impact</div>
                      <div className="text-lg font-bold text-yellow-400">{simResult.punctuality_impact_pct}%</div>
                    </div>
                  </div>
                  <div className="bg-red-500/10 border border-red-500/20 rounded p-3 text-sm">
                    <div className="text-red-400 font-semibold mb-2">Predicted Conflicts</div>
                    <ul className="space-y-1.5 text-gray-300">
                      {simResult.conflict_warnings.map((w, i) => <li key={i}>{w}</li>)}
                    </ul>
                  </div>
                </div>
              )}
            </div>
            
            <div className="bg-gray-800 border border-gray-700 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-white mb-3 flex items-center gap-2">Human-in-the-Loop Approval</h3>
              <div className="space-y-4">
                {decisionError && (
                  <div className="p-2.5 rounded bg-red-900/30 border border-red-500/40 text-red-300 text-xs">
                    {decisionError}
                  </div>
                )}
                {overrideStatus === 'pending' ? (
                  <>
                    <p className="text-sm text-gray-400">Review AI priority and schedule for controller sign-off.</p>
                    <textarea 
                      value={overrideReason}
                      onChange={(e) => setOverrideReason(e.target.value)}
                      placeholder="Reason for decision (Mandatory for rejection/override)..."
                      className="w-full bg-gray-900 border border-gray-600 text-white rounded p-2 text-sm outline-none focus:border-indigo-500 min-h-[60px]"
                    />
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleDecision('approved')}
                        disabled={submittingDecision}
                        className="flex-1 bg-green-600 hover:bg-green-500 text-white px-3 py-2 rounded text-sm font-medium transition flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {submittingDecision ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Approve
                      </button>
                      <button 
                        onClick={() => handleDecision('rejected')}
                        disabled={submittingDecision}
                        className="flex-1 bg-red-600 hover:bg-red-500 text-white px-3 py-2 rounded text-sm font-medium transition flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {submittingDecision ? <Loader2 size={16} className="animate-spin" /> : <ThumbsDown size={16} />} Reject / Override
                      </button>
                    </div>
                  </>
                ) : (
                  <div className={`p-3 rounded-lg border ${overrideStatus === 'approved' ? 'bg-green-900/20 border-green-500/30 text-green-400' : 'bg-red-900/20 border-red-500/30 text-red-400'}`}>
                    <div className="flex items-center gap-2 font-semibold mb-1">
                      {overrideStatus === 'approved' ? <Check size={18} /> : <ThumbsDown size={18} />}
                      {overrideStatus === 'approved' ? 'Block Approved & Synced to Backend' : 'Block Overridden & Synced to Backend'}
                    </div>
                    {overrideReason && (
                      <div className="text-xs text-gray-300 mt-2">
                        <span className="font-semibold text-gray-500">Reason Logged:</span> {overrideReason}
                      </div>
                    )}
                    <button 
                      onClick={() => setOverrideStatus('pending')}
                      className="mt-3 text-xs text-gray-400 hover:text-white underline block"
                    >
                      Change Decision
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'cockpit' | 'lab'>('cockpit');
  const [kpis, setKpis] = useState(mockKPIs);
  const [blocks, setBlocks] = useState(mockBlocks);
  const [alerts, setAlerts] = useState(mockAlerts);
  const [trains, setTrains] = useState(mockTrains);
  const [corridors, setCorridors] = useState(mockCorridors);
  const [telemetry, setTelemetry] = useState<TelemetryEvent[]>([]);
  const [telemetryLoading, setTelemetryLoading] = useState(true);
  const [apiStatus, setApiStatus] = useState<'connecting' | 'live' | 'offline'>('connecting');
  const [selectedBlock, setSelectedBlock] = useState<Block | null>(null);
  const [role, setRole] = useState<'All' | 'Engineering' | 'Signal & Telecom' | 'Electrical' | 'COA'>('All');
  const [viewMode, setViewMode] = useState<'Optimized' | 'Siloed'>('Optimized');

  // Fetch dashboard data whenever viewMode changes
  useEffect(() => {
    setApiStatus('connecting');
    simulationService.getDashboard(viewMode.toLowerCase())
      .then(data => {
        setKpis(data.kpis);
        setBlocks(data.blocks);
        setAlerts(data.alerts);
        setTrains(data.trains);
        setCorridors(data.corridors);
        setApiStatus('live');
      })
      .catch(() => {
        setApiStatus('offline');
      });
  }, [viewMode]);

  // Periodic polling for live operations telemetry
  useEffect(() => {
    let isMounted = true;
    const fetchTelemetry = () => {
      simulationService.getTelemetry()
        .then(data => {
          if (isMounted) {
            setTelemetry(data);
            setTelemetryLoading(false);
          }
        })
        .catch(() => {
          if (isMounted) {
            setTelemetryLoading(false);
          }
        });
    };

    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 6000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleBlockDecision = async (blockId: string, decision: 'approved' | 'rejected', reason?: string) => {
    const res = await simulationService.submitBlockDecision(blockId, decision, reason, role);
    
    // Refresh the dashboard from the backend to update KPIs, resolved alerts, and updated block statuses
    const updatedDashboard = await simulationService.getDashboard(viewMode.toLowerCase());
    setKpis(updatedDashboard.kpis);
    setBlocks(updatedDashboard.blocks);
    setAlerts(updatedDashboard.alerts);
    setTrains(updatedDashboard.trains);

    if (selectedBlock && selectedBlock.block_id === blockId) {
      setSelectedBlock(res.block);
    }
  };

  // Filter blocks based on role
  const displayBlocks = blocks.filter(b =>
    role === 'All' || role === 'COA' || b.departments_involved.includes(role)
  );

  return (
    <div className="min-h-screen bg-gray-950 text-gray-300 font-sans flex flex-col">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 h-16 flex items-center justify-between px-6 shrink-0 sticky top-0 z-40">
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-600/20">
              RS
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center">
              RailSync <span className="text-gray-500 font-normal mx-2">|</span> 
              <span className="text-indigo-400 font-medium text-sm">AI Operations</span>
            </h1>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center bg-gray-800/90 p-1 rounded-lg border border-gray-700">
            <button
              onClick={() => setActiveTab('cockpit')}
              className={`px-3 py-1.5 text-xs font-semibold rounded transition flex items-center gap-1.5 ${
                activeTab === 'cockpit'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Activity size={13} /> Corridor Cockpit
            </button>
            <button
              onClick={() => setActiveTab('lab')}
              className={`px-3 py-1.5 text-xs font-semibold rounded transition flex items-center gap-1.5 ${
                activeTab === 'lab'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Layers size={13} /> AI Ingestion & Normalization
            </button>
          </nav>
        </div>
        
        <div className="flex items-center gap-5">
          {activeTab === 'cockpit' && (
            <>
              {/* View Mode Toggle */}
              <div className="flex bg-gray-800 p-1 rounded-lg border border-gray-700">
                <button 
                  onClick={() => setViewMode('Siloed')}
                  className={`px-3 py-1.5 text-xs font-medium rounded transition ${viewMode === 'Siloed' ? 'bg-gray-700 text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}
                >
                  Manual/Siloed Plan
                </button>
                <button 
                  onClick={() => setViewMode('Optimized')}
                  className={`px-3 py-1.5 text-xs font-medium rounded flex items-center gap-1 transition ${viewMode === 'Optimized' ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}
                >
                  <Zap size={12} /> AI Optimized
                </button>
              </div>

              {/* Role Selector */}
              <div className="flex items-center gap-2">
                <Filter size={14} className="text-gray-400" />
                <select 
                  value={role} 
                  onChange={(e) => setRole(e.target.value as any)}
                  className="bg-gray-800 border border-gray-700 text-sm text-gray-200 rounded px-2 py-1 outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="All">All Departments</option>
                  <option value="Engineering">Engineering Planner</option>
                  <option value="Signal & Telecom">S&T Planner</option>
                  <option value="Electrical">TRD Planner</option>
                  <option value="COA">COA Controller</option>
                </select>
              </div>

              <div className="h-6 border-l border-gray-700"></div>
            </>
          )}

          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.6)] ${apiStatus === 'offline' ? 'bg-yellow-500' : 'bg-green-500 animate-pulse'}`}></div>
            <span className={`text-sm font-medium tracking-wider ${apiStatus === 'offline' ? 'text-yellow-400' : 'text-green-400'}`}>
              {apiStatus === 'connecting' ? 'CONNECTING' : apiStatus === 'live' ? 'LIVE' : 'OFFLINE / MOCK'}
            </span>
          </div>
          
          {activeTab === 'cockpit' && (
            <button 
              onClick={() => simulationService.downloadPlanExport()}
              className="flex items-center gap-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 border border-indigo-400/30 px-3 py-1.5 rounded transition shadow-sm"
              title="Download Master Tactical Maintenance & Corridor Schedule (CSV)"
            >
              <FileDown size={14} /> Export Plan
            </button>
          )}
        </div>
      </header>

      {/* Main View */}
      {activeTab === 'cockpit' ? (
        <main className="flex-1 p-6 flex flex-col overflow-y-auto">
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {kpis.map(kpi => <KPICard key={kpi.id} kpi={kpi} />)}
          </div>

          {/* View mode warning banner */}
          {viewMode === 'Siloed' && (
            <div className="mt-6 bg-red-900/30 border border-red-500/50 text-red-200 p-3 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle size={18} className="text-red-400" />
                <span className="text-sm font-medium">Viewing Manual/Siloed Plan from AI Backend. Uncoordinated multi-department demands increase network downtime.</span>
              </div>
              <div className="text-xs font-bold px-2 py-1 bg-red-800 rounded">18.5 hrs excess block time required</div>
            </div>
          )}

          {/* Master Timeline */}
          <Timeline blocks={displayBlocks} corridors={corridors} onBlockClick={setSelectedBlock} />

          {/* Lower Panels */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6 min-h-[340px]">
            <div className="lg:col-span-1">
              <AlertsPanel alerts={alerts} />
            </div>
            <div className="lg:col-span-1">
              <TrainsPanel trains={trains} />
            </div>
            <div className="lg:col-span-1">
              <TelemetryPanel telemetry={telemetry} loading={telemetryLoading} />
            </div>
          </div>
        </main>
      ) : (
        <NormalizationLab />
      )}

      {/* Block Details Modal */}
      {selectedBlock && (
        <BlockModal 
          block={selectedBlock} 
          onClose={() => setSelectedBlock(null)} 
          onDecisionSubmit={handleBlockDecision}
        />
      )}
    </div>
  );
}

