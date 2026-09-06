import React, { useState, useEffect } from 'react';
import { 
  CloudRain, CheckCircle2, 
  RefreshCw, Play, Layers, AlertTriangle, 
  Zap, Wrench, Radio
} from 'lucide-react';
import { 
  RawTMSDefect, 
  RawSMMSFault, 
  RawTDMSDefect, 
  UnifiedMaintenanceTask, 
  WeatherAssessmentResult 
} from '../types';
import { simulationService } from '../services/simulationService';

export const NormalizationLab: React.FC = () => {
  const [tmsList, setTmsList] = useState<RawTMSDefect[]>([]);
  const [smmsList, setSmmsList] = useState<RawSMMSFault[]>([]);
  const [tdmsList, setTdmsList] = useState<RawTDMSDefect[]>([]);
  
  const [normalizedTasks, setNormalizedTasks] = useState<UnifiedMaintenanceTask[]>([]);
  const [loadingFeeds, setLoadingFeeds] = useState(false);
  const [normalizing, setNormalizing] = useState(false);
  const [selectedTaskWeather, setSelectedTaskWeather] = useState<{
    task: UnifiedMaintenanceTask;
    result: WeatherAssessmentResult | null;
    loading: boolean;
    error: string | null;
  } | null>(null);

  // Fetch initial sample feed
  const fetchFeeds = async () => {
    setLoadingFeeds(true);
    try {
      const data = await simulationService.getMockData();
      setTmsList(data.TMS_Engineering.slice(0, 5));
      setSmmsList(data.SMMS_Signal_Telecom.slice(0, 5));
      setTdmsList(data.TDMS_Traction.slice(0, 5));
    } catch (err) {
      console.error("Failed to fetch mock data feed", err);
    } finally {
      setLoadingFeeds(false);
    }
  };

  useEffect(() => {
    fetchFeeds();
  }, []);

  // Run batch normalization
  const handleBatchNormalize = async () => {
    setNormalizing(true);
    const results: UnifiedMaintenanceTask[] = [];

    try {
      // Normalize TMS
      for (const tms of tmsList) {
        try {
          const task = await simulationService.normalizeTMS(tms);
          results.push(task);
        } catch (e) {
          console.error("TMS normalize error", e);
        }
      }
      // Normalize SMMS
      for (const smms of smmsList) {
        try {
          const task = await simulationService.normalizeSMMS(smms);
          results.push(task);
        } catch (e) {
          console.error("SMMS normalize error", e);
        }
      }
      // Normalize TDMS
      for (const tdms of tdmsList) {
        try {
          const task = await simulationService.normalizeTDMS(tdms);
          results.push(task);
        } catch (e) {
          console.error("TDMS normalize error", e);
        }
      }
      setNormalizedTasks(results);
    } finally {
      setNormalizing(false);
    }
  };

  // Run weather risk check
  const handleCheckWeather = async (task: UnifiedMaintenanceTask) => {
    setSelectedTaskWeather({ task, result: null, loading: true, error: null });
    try {
      const res = await simulationService.assessWeatherRisk(task);
      setSelectedTaskWeather({ task, result: res, loading: false, error: null });
    } catch (err: any) {
      setSelectedTaskWeather({ 
        task, 
        result: null, 
        loading: false, 
        error: err.message || 'Weather evaluation failed' 
      });
    }
  };

  const severityBadge = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-500/20 text-red-400 border-red-500/40';
      case 'HIGH':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/40';
      case 'MEDIUM':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40';
      default:
        return 'bg-blue-500/20 text-blue-400 border-blue-500/40';
    }
  };

  return (
    <div className="flex-1 p-6 flex flex-col space-y-6 overflow-y-auto">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-900 border border-gray-800 p-4 rounded-lg shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="text-indigo-400" size={20} />
            <h2 className="text-lg font-bold text-white tracking-tight">
              Cross-Department AI Data Normalization Lab
            </h2>
            <span className="px-2 py-0.5 bg-indigo-900/50 text-indigo-300 border border-indigo-700/50 rounded text-xs font-mono font-medium">
              F-01 & F-02 Engine
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Ingests heterogeneous defect tickets from Indian Railways legacy feeds (TMS, SMMS, TDMS), normalizes schemas, and assesses real-time corridor weather risk via Open-Meteo.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchFeeds}
            disabled={loadingFeeds}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 rounded text-xs font-medium transition disabled:opacity-50"
          >
            <RefreshCw size={13} className={loadingFeeds ? "animate-spin" : ""} />
            {loadingFeeds ? "Fetching Feeds..." : "Refresh Raw Feeds"}
          </button>
          <button
            onClick={handleBatchNormalize}
            disabled={normalizing || (tmsList.length === 0 && smmsList.length === 0 && tdmsList.length === 0)}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-semibold shadow-md shadow-indigo-600/20 transition disabled:opacity-50"
          >
            <Play size={13} />
            {normalizing ? "Normalizing..." : "Run AI Normalization"}
          </button>
        </div>
      </div>

      {/* Raw Departmental Ingestion Feeds */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* TMS Feed (Engineering) */}
        <div className="bg-gray-900/80 border border-gray-800 rounded-lg p-4 flex flex-col">
          <div className="flex justify-between items-center pb-3 border-b border-gray-800">
            <div className="flex items-center gap-2">
              <Wrench size={16} className="text-blue-400" />
              <h3 className="font-semibold text-white text-sm">TMS (Civil & Track)</h3>
            </div>
            <span className="text-[11px] font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
              {tmsList.length} Tickets
            </span>
          </div>
          <div className="space-y-2.5 mt-3 overflow-y-auto max-h-72">
            {tmsList.map((item, idx) => (
              <div key={idx} className="bg-gray-800/60 p-2.5 rounded border border-gray-700/60 text-xs space-y-1">
                <div className="flex justify-between font-mono font-medium text-white">
                  <span>{item.ticket_id}</span>
                  <span className="text-yellow-400 font-bold">{item.defect_class}</span>
                </div>
                <div className="flex justify-between text-gray-400 text-[11px]">
                  <span>Track: {item.track_id}</span>
                  <span>Km {item.km_start} - {item.km_end}</span>
                </div>
                <div className="text-gray-500 text-[10px]">
                  Speed Restriction: {item.speed_restriction_applied ? "YES" : "NO"}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SMMS Feed (Signal & Telecom) */}
        <div className="bg-gray-900/80 border border-gray-800 rounded-lg p-4 flex flex-col">
          <div className="flex justify-between items-center pb-3 border-b border-gray-800">
            <div className="flex items-center gap-2">
              <Radio size={16} className="text-emerald-400" />
              <h3 className="font-semibold text-white text-sm">SMMS (Signal & Telecom)</h3>
            </div>
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              {smmsList.length} Faults
            </span>
          </div>
          <div className="space-y-2.5 mt-3 overflow-y-auto max-h-72">
            {smmsList.map((item, idx) => (
              <div key={idx} className="bg-gray-800/60 p-2.5 rounded border border-gray-700/60 text-xs space-y-1">
                <div className="flex justify-between font-mono font-medium text-white">
                  <span>{item.fault_id}</span>
                  <span className="text-emerald-400 font-bold">{item.urgency_code}</span>
                </div>
                <div className="flex justify-between text-gray-400 text-[11px]">
                  <span>Station: {item.station_code}</span>
                  <span>Gear: {item.gear_type}</span>
                </div>
                <div className="text-gray-500 text-[10px]">
                  Cat: {item.failure_category}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* TDMS Feed (Traction / Electrical) */}
        <div className="bg-gray-900/80 border border-gray-800 rounded-lg p-4 flex flex-col">
          <div className="flex justify-between items-center pb-3 border-b border-gray-800">
            <div className="flex items-center gap-2">
              <Zap size={16} className="text-orange-400" />
              <h3 className="font-semibold text-white text-sm">TDMS (Traction OHE)</h3>
            </div>
            <span className="text-[11px] font-mono text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20">
              {tdmsList.length} Defects
            </span>
          </div>
          <div className="space-y-2.5 mt-3 overflow-y-auto max-h-72">
            {tdmsList.map((item, idx) => (
              <div key={idx} className="bg-gray-800/60 p-2.5 rounded border border-gray-700/60 text-xs space-y-1">
                <div className="flex justify-between font-mono font-medium text-white">
                  <span>{item.defect_no}</span>
                  <span className="text-orange-400 font-bold">{item.issue_type}</span>
                </div>
                <div className="flex justify-between text-gray-400 text-[11px]">
                  <span>Substation: {item.ohe_substation}</span>
                  <span>Mast: {item.mast_from} - {item.mast_to}</span>
                </div>
                <div className="text-gray-500 text-[10px]">
                  Target: {new Date(item.scheduled_date).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Output: AI Normalized Unified Maintenance Tasks */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-5 flex flex-col">
        <div className="flex justify-between items-center pb-4 border-b border-gray-800">
          <div>
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <CheckCircle2 size={18} className="text-green-400" />
              Unified Maintenance Tasks
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Standardized output ready for corridor slot consolidation and conflict resolution.
            </p>
          </div>
          <span className="px-3 py-1 bg-green-500/10 text-green-400 border border-green-500/20 rounded font-mono text-xs font-semibold">
            {normalizedTasks.length} Normalized Tasks
          </span>
        </div>

        {normalizedTasks.length === 0 ? (
          <div className="py-12 text-center text-gray-500 text-sm flex flex-col items-center">
            <Layers size={36} className="text-gray-600 mb-2 opacity-50" />
            <span>Click <strong>"Run AI Normalization"</strong> to standardize the heterogeneous feeds.</span>
          </div>
        ) : (
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400 uppercase font-mono text-[11px]">
                  <th className="py-2.5 px-3">Task ID</th>
                  <th className="py-2.5 px-3">Department</th>
                  <th className="py-2.5 px-3">Section / Station</th>
                  <th className="py-2.5 px-3">Km Span</th>
                  <th className="py-2.5 px-3">Base Severity</th>
                  <th className="py-2.5 px-3">Est Duration</th>
                  <th className="py-2.5 px-3">Blocks Required</th>
                  <th className="py-2.5 px-3 text-right">Weather Risk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {normalizedTasks.map((task) => (
                  <tr key={task.id} className="hover:bg-gray-800/40 transition">
                    <td className="py-3 px-3 font-mono font-medium text-white">{task.id}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                        task.department === 'ENGINEERING' 
                          ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' 
                          : task.department === 'SIGNAL_TELECOM' 
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                          : 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                      }`}>
                        {task.department}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-gray-200 font-medium">{task.section_id}</td>
                    <td className="py-3 px-3 text-gray-400 font-mono">
                      {task.start_km > 0 || task.end_km > 0 ? `${task.start_km} - ${task.end_km}` : 'Station Area'}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${severityBadge(task.base_severity)}`}>
                        {task.base_severity}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-gray-300 font-mono">{task.estimated_duration_minutes}m</td>
                    <td className="py-3 px-3">
                      <div className="flex gap-1.5">
                        {task.requires_traffic_block && (
                          <span className="px-1.5 py-0.5 bg-red-500/20 text-red-300 border border-red-500/30 rounded text-[10px]">
                            Traffic
                          </span>
                        )}
                        {task.requires_power_block && (
                          <span className="px-1.5 py-0.5 bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 rounded text-[10px]">
                            Power (OHE)
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => handleCheckWeather(task)}
                        className="inline-flex items-center gap-1 text-[11px] font-medium bg-gray-800 hover:bg-gray-700 text-indigo-300 hover:text-indigo-200 px-2.5 py-1 rounded border border-gray-700 transition"
                      >
                        <CloudRain size={12} />
                        Assess Risk
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Weather Risk Assessment Modal */}
      {selectedTaskWeather && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-800 pb-3">
              <div className="flex items-center gap-2">
                <CloudRain className="text-indigo-400" size={20} />
                <h3 className="font-bold text-white text-base">
                  Corridor Weather Assessment: {selectedTaskWeather.task.section_id}
                </h3>
              </div>
              <button
                onClick={() => setSelectedTaskWeather(null)}
                className="text-gray-400 hover:text-white px-2 py-1 bg-gray-800 rounded text-xs"
              >
                Close
              </button>
            </div>

            {selectedTaskWeather.loading ? (
              <div className="py-8 text-center text-gray-400 text-sm flex flex-col items-center">
                <RefreshCw size={24} className="animate-spin text-indigo-500 mb-2" />
                <span>Querying Open-Meteo live atmospheric conditions...</span>
              </div>
            ) : selectedTaskWeather.error ? (
              <div className="bg-red-900/30 border border-red-500/40 p-3 rounded text-red-300 text-xs">
                {selectedTaskWeather.error}
              </div>
            ) : selectedTaskWeather.result && (
              <div className="space-y-4 text-xs">
                {/* Viability Status */}
                <div className={`p-3 rounded-lg border flex items-center justify-between ${
                  selectedTaskWeather.result.viable
                    ? 'bg-green-900/20 border-green-500/40 text-green-300'
                    : 'bg-red-900/20 border-red-500/40 text-red-300'
                }`}>
                  <div className="flex items-center gap-2 font-semibold text-sm">
                    {selectedTaskWeather.result.viable ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                    <span>{selectedTaskWeather.result.viable ? "Corridor Execution Viable" : "Safety Alert: Non-Viable Window"}</span>
                  </div>
                  <span className="font-mono text-xs px-2 py-0.5 bg-gray-800 rounded text-white">
                    Risk Multiplier: {selectedTaskWeather.result.risk_multiplier}x
                  </span>
                </div>

                {/* Location & Task info */}
                <div className="grid grid-cols-2 gap-3 text-gray-300 bg-gray-800/60 p-3 rounded border border-gray-700">
                  <div>
                    <span className="text-gray-500 block text-[10px]">Department</span>
                    <span className="font-semibold text-white">{selectedTaskWeather.task.department}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[10px]">Coordinates</span>
                    <span className="font-mono text-white">
                      {selectedTaskWeather.result.mapped_location.lat}°N, {selectedTaskWeather.result.mapped_location.lon}°E
                    </span>
                  </div>
                </div>

                {/* Warning Reasons */}
                {selectedTaskWeather.result.warning_reasons.length > 0 ? (
                  <div className="space-y-2">
                    <span className="text-gray-400 font-semibold uppercase text-[10px] tracking-wider">
                      Advisories & Safety Restrictions
                    </span>
                    <div className="space-y-1.5">
                      {selectedTaskWeather.result.warning_reasons.map((w, idx) => (
                        <div key={idx} className="bg-yellow-900/20 border border-yellow-500/30 text-yellow-300 p-2 rounded flex items-center gap-2">
                          <AlertTriangle size={14} className="shrink-0" />
                          <span>{w}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-800/40 border border-gray-700/60 text-gray-400 p-2.5 rounded text-center">
                    All atmospheric safety parameters (temperature, crosswind, rainfall, visibility) within nominal limits.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
