export interface Task {
  task_id: string;
  department: string;
  description: string;
  severity: string;
  allocated_time: number;
  track_km_span: string;
  priority_score: number;
  explainability: { feature: string; impact: number }[];
}

export interface Block {
  block_id: string;
  section_id: string;
  scheduled_start: string;
  scheduled_end: string;
  duration: number;
  departments_involved: string[];
  status: 'PENDING_START' | 'ACTIVE' | 'EXTENSION_REQUESTED' | 'CLEARED_EARLY' | 'COMPLETED' | 'APPROVED' | 'OVERRIDDEN';
  priority: string;
  consolidated_tasks: Task[];
  decision?: 'approved' | 'rejected' | null;
  decision_reason?: string | null;
  decision_time?: string;
  operator_role?: string;
}

export interface Train {
  train_no: string;
  train_type: 'Express' | 'Sub-urban' | 'Freight';
  name: string;
  priority: string;
  scheduled_arrival: string;
  expected_arrival: string;
  delay_minutes: number;
}

export interface Alert {
  id: string;
  type: 'WARNING' | 'TRAIN IMPACT' | 'EARLY HANDOVER' | 'CONFLICT' | 'RESOLVED';
  severity: 'high' | 'medium' | 'low';
  title: string;
  message: string;
  timestamp: string;
  related_block_id?: string;
  affected_train?: string;
}

export interface KPI {
  id: string;
  label: string;
  value: string;
  unit: string;
  trend: 'up' | 'down' | 'neutral';
  trend_value: string;
  status: 'good' | 'warning' | 'bad';
}

export interface SimulationResult {
  total_passenger_delay_minutes: number;
  regulated_freight_trains: number;
  punctuality_impact_pct: number;
  conflict_warnings: string[];
  delta_minutes?: number;
}

export interface TelemetryEvent {
  id: string;
  timestamp: string;
  section: string;
  type: string;
  status: string;
  detail: string;
  badge_color: 'blue' | 'yellow' | 'green' | 'red' | string;
}

export interface BlockDecisionRequest {
  decision: 'approved' | 'rejected';
  reason?: string;
  operator_role?: string;
}

export interface BlockDecisionResponse {
  message: string;
  block: Block;
}

export interface DashboardData {
  kpis: KPI[];
  blocks: Block[];
  alerts: Alert[];
  trains: Train[];
  corridors: string[];
  view_mode?: string;
}

export interface RawTMSDefect {
  ticket_id: string;
  track_id: string;
  km_start: number | string;
  km_end: number | string;
  defect_class: string;
  date_detected: string;
  speed_restriction_applied: boolean;
}

export interface RawSMMSFault {
  fault_id: string;
  station_code: string;
  gear_type: string;
  failure_category: string;
  reported_ts: string;
  urgency_code: string;
}

export interface RawTDMSDefect {
  defect_no: string;
  ohe_substation: string;
  mast_from: string;
  mast_to: string;
  issue_type: string;
  scheduled_date: string;
}

export interface MockDataResponse {
  TMS_Engineering: RawTMSDefect[];
  SMMS_Signal_Telecom: RawSMMSFault[];
  TDMS_Traction: RawTDMSDefect[];
}

export interface UnifiedMaintenanceTask {
  id: string;
  department: 'ENGINEERING' | 'SIGNAL_TELECOM' | 'TRACTION' | string;
  section_id: string;
  start_km: number;
  end_km: number;
  base_severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | string;
  estimated_duration_minutes: number;
  due_date: string;
  requires_power_block: boolean;
  requires_traffic_block: boolean;
}

export interface WeatherAssessmentResult {
  viable: boolean;
  risk_multiplier: number;
  warning_reasons: string[];
  mapped_location: {
    lat: number;
    lon: number;
  };
}

