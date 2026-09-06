import { 
  DashboardData, 
  SimulationResult, 
  BlockDecisionResponse, 
  TelemetryEvent,
  MockDataResponse,
  RawTMSDefect,
  RawSMMSFault,
  RawTDMSDefect,
  UnifiedMaintenanceTask,
  WeatherAssessmentResult
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? '';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!response.ok) throw new Error(`API request failed: ${response.status}`);
  return response.json() as Promise<T>;
}

export const simulationService = {
  getDashboard: (viewMode: string = 'optimized'): Promise<DashboardData> => 
    request<DashboardData>(`/api/dashboard?view_mode=${encodeURIComponent(viewMode)}`),

  simulateWhatIf: async (blockId: string, newEndTime: string): Promise<SimulationResult> => {
    return request<SimulationResult>('/api/simulate', {
      method: 'POST',
      body: JSON.stringify({ block_id: blockId, new_end_time: newEndTime }),
    });
  },

  submitBlockDecision: async (
    blockId: string,
    decision: 'approved' | 'rejected',
    reason?: string,
    operatorRole: string = 'COA'
  ): Promise<BlockDecisionResponse> => {
    return request<BlockDecisionResponse>(`/api/blocks/${encodeURIComponent(blockId)}/decision`, {
      method: 'POST',
      body: JSON.stringify({
        decision,
        reason: reason || undefined,
        operator_role: operatorRole,
      }),
    });
  },

  getTelemetry: (): Promise<TelemetryEvent[]> => 
    request<TelemetryEvent[]>('/api/telemetry'),

  getMockData: (): Promise<MockDataResponse> =>
    request<MockDataResponse>('/api/mock-data'),

  normalizeTMS: (defect: RawTMSDefect): Promise<UnifiedMaintenanceTask> =>
    request<UnifiedMaintenanceTask>('/api/normalize/tms', {
      method: 'POST',
      body: JSON.stringify(defect),
    }),

  normalizeSMMS: (fault: RawSMMSFault): Promise<UnifiedMaintenanceTask> =>
    request<UnifiedMaintenanceTask>('/api/normalize/smms', {
      method: 'POST',
      body: JSON.stringify(fault),
    }),

  normalizeTDMS: (defect: RawTDMSDefect): Promise<UnifiedMaintenanceTask> =>
    request<UnifiedMaintenanceTask>('/api/normalize/tdms', {
      method: 'POST',
      body: JSON.stringify(defect),
    }),

  assessWeatherRisk: (task: UnifiedMaintenanceTask): Promise<WeatherAssessmentResult> =>
    request<WeatherAssessmentResult>('/api/normalize/weather-risk', {
      method: 'POST',
      body: JSON.stringify(task),
    }),

  downloadPlanExport: () => {
    const url = `${API_BASE_URL}/api/plan/export`;
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'RailSync_Tactical_Plan.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },
};

