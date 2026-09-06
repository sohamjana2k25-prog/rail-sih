import csv
import io
import random
from datetime import datetime, timedelta
from enum import Enum
from typing import Literal

import httpx
from faker import Faker
from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, field_validator, model_validator

app = FastAPI(title="RailSync AI Operations & Data Normalization Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

fake = Faker("en_IN")

# ==============================================================================
# SECTION 1: F-01 & F-02 DATA NORMALIZATION & WEATHER RISK ENGINES
# ==============================================================================

# --- ENUMS ---
class Department(str, Enum):
    ENGINEERING = "ENGINEERING"
    SIGNAL_TELECOM = "SIGNAL_TELECOM"
    TRACTION = "TRACTION"


class Severity(str, Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


# --- Output Schemas ---
class UnifiedMaintenanceTask(BaseModel):
    id: str
    department: Department
    section_id: str
    start_km: float
    end_km: float
    base_severity: Severity
    estimated_duration_minutes: int
    due_date: datetime
    requires_power_block: bool
    requires_traffic_block: bool

    model_config = {
        "json_schema_extra": {
            "example": {
                "id": "TASK-1001",
                "department": "ENGINEERING",
                "section_id": "SBC-MYS",
                "start_km": 10.5,
                "end_km": 12.0,
                "base_severity": "CRITICAL",
                "estimated_duration_minutes": 180,
                "due_date": "2026-09-10T12:00:00",
                "requires_power_block": False,
                "requires_traffic_block": True,
            }
        }
    }


class WeatherAssessmentResult(BaseModel):
    viable: bool
    risk_multiplier: float
    warning_reasons: list[str]
    mapped_location: dict[str, float]


# --- Station and Corridor Coordinates Mapping ---
SECTION_COORDINATES: dict[str, dict[str, float]] = {
    "SBC-MYS": {"lat": 12.9716, "lon": 77.5946},
    "HWH-BWN-CHORD-UP": {"lat": 22.5726, "lon": 88.3639},
    "SDAH-KLYM-UP": {"lat": 22.9747, "lon": 88.4337},
    "NDLS-CNB": {"lat": 28.6139, "lon": 77.2090},
    "BCT-ST": {"lat": 18.9696, "lon": 72.8193},
    "MAS-BZA": {"lat": 13.0827, "lon": 80.2707},
    "HWH-KGP": {"lat": 22.5839, "lon": 88.3433},
    "CSTM-Kalyan": {"lat": 18.9401, "lon": 72.8347},
    "HWH-BWN": {"lat": 22.5839, "lon": 88.3433},
    "HWH-BDC": {"lat": 22.7500, "lon": 88.3800},
    "BDC-BWN": {"lat": 23.2300, "lon": 87.8600},
    "BWN-KNJ": {"lat": 23.2500, "lon": 87.9000},
    "NJP-SGU": {"lat": 26.7100, "lon": 88.4200},
    "NDLS": {"lat": 28.6139, "lon": 77.2090},
    "CNB": {"lat": 26.4499, "lon": 80.3319},
    "BCT": {"lat": 18.9696, "lon": 72.8193},
    "ST": {"lat": 21.1702, "lon": 72.8311},
    "MAS": {"lat": 13.0827, "lon": 80.2707},
    "BZA": {"lat": 16.5062, "lon": 80.6480},
    "HWH": {"lat": 22.5839, "lon": 88.3433},
    "KGP": {"lat": 22.3460, "lon": 87.2320},
    "SBC": {"lat": 12.9716, "lon": 77.5946},
    "MYS": {"lat": 12.2958, "lon": 76.6394},
    "CSTM": {"lat": 18.9401, "lon": 72.8347},
    "BWN": {"lat": 23.2300, "lon": 87.8600},
}


# --- Input Schemas ---
class TMSDefect(BaseModel):
    ticket_id: str
    track_id: str
    km_start: float | str
    km_end: float | str
    defect_class: str
    date_detected: datetime
    speed_restriction_applied: bool

    @field_validator("km_start", "km_end", mode="before")
    @classmethod
    def validate_km(cls, v):
        try:
            val = float(v)
            if val < 0:
                return 0.0
            return val
        except (ValueError, TypeError):
            return 0.0

    @model_validator(mode="after")
    def check_km_order(self):
        if float(self.km_start) > float(self.km_end):
            self.km_start, self.km_end = self.km_end, self.km_start
        return self

    model_config = {
        "json_schema_extra": {
            "example": {
                "ticket_id": "TMS-4819201",
                "track_id": "NDLS-CNB",
                "km_start": 12.4,
                "km_end": 14.1,
                "defect_class": "IMR",
                "date_detected": "2026-09-05T10:00:00",
                "speed_restriction_applied": True,
            }
        }
    }


class SMMSFault(BaseModel):
    fault_id: str
    station_code: str
    gear_type: str
    failure_category: str
    reported_ts: datetime
    urgency_code: str

    model_config = {
        "json_schema_extra": {
            "example": {
                "fault_id": "SMMS-7821903",
                "station_code": "NDLS",
                "gear_type": "Point Machine",
                "failure_category": "EQUIPMENT_FAILURE",
                "reported_ts": "2026-09-05T11:30:00",
                "urgency_code": "U1",
            }
        }
    }


class TDMSDefect(BaseModel):
    defect_no: str
    ohe_substation: str
    mast_from: str
    mast_to: str
    issue_type: str
    scheduled_date: datetime

    model_config = {
        "json_schema_extra": {
            "example": {
                "defect_no": "TDMS-9182304",
                "ohe_substation": "TSS-NDLS",
                "mast_from": "120/15",
                "mast_to": "120/35",
                "issue_type": "CONTACT WIRE WEAR",
                "scheduled_date": "2026-09-06T09:00:00",
            }
        }
    }


# --- Parsers ---
def parse_tms(defect: TMSDefect) -> UnifiedMaintenanceTask:
    severity_map = {
        "IMR": Severity.CRITICAL,
        "OBS": Severity.HIGH,
        "WELD_DEFECT": Severity.MEDIUM,
        "MINOR_CRACK": Severity.LOW,
    }
    severity = severity_map.get(defect.defect_class.strip().upper(), Severity.LOW)

    return UnifiedMaintenanceTask(
        id=defect.ticket_id,
        department=Department.ENGINEERING,
        section_id=defect.track_id,
        start_km=float(defect.km_start),
        end_km=float(defect.km_end),
        base_severity=severity,
        estimated_duration_minutes=240 if severity == Severity.CRITICAL else 120,
        due_date=defect.date_detected + timedelta(days=1 if severity == Severity.CRITICAL else 7),
        requires_power_block=(severity == Severity.CRITICAL),
        requires_traffic_block=defect.speed_restriction_applied or severity in (Severity.CRITICAL, Severity.HIGH),
    )


def parse_smms(fault: SMMSFault) -> UnifiedMaintenanceTask:
    severity_map = {
        "U1": Severity.CRITICAL,
        "U2": Severity.HIGH,
        "U3": Severity.MEDIUM,
        "U4": Severity.LOW,
    }
    severity = severity_map.get(fault.urgency_code.strip().upper(), Severity.LOW)

    return UnifiedMaintenanceTask(
        id=fault.fault_id,
        department=Department.SIGNAL_TELECOM,
        section_id=fault.station_code,
        start_km=0.0,
        end_km=0.0,
        base_severity=severity,
        estimated_duration_minutes=180 if severity in (Severity.CRITICAL, Severity.HIGH) else 60,
        due_date=fault.reported_ts + timedelta(hours=4 if severity == Severity.CRITICAL else 24),
        requires_power_block=False,
        requires_traffic_block=(fault.gear_type.lower() == "point machine"),
    )


def _parse_mast(mast_str: str) -> float:
    try:
        parts = mast_str.split("/")
        if len(parts) == 2:
            return float(parts[0]) + float(parts[1]) / 100.0
        return float(mast_str)
    except (ValueError, TypeError, IndexError):
        return 0.0


def parse_tdms(defect: TDMSDefect) -> UnifiedMaintenanceTask:
    severity_map = {
        "CONTACT_WIRE_WEAR": Severity.CRITICAL,
        "CANTILEVER_REPLACEMENT": Severity.HIGH,
        "INSULATOR_CLEANING": Severity.MEDIUM,
    }
    issue = defect.issue_type.strip().upper().replace(" ", "_")
    severity = severity_map.get(issue, Severity.LOW)

    start_km = _parse_mast(defect.mast_from)
    end_km = _parse_mast(defect.mast_to)
    if start_km > end_km:
        start_km, end_km = end_km, start_km

    return UnifiedMaintenanceTask(
        id=defect.defect_no,
        department=Department.TRACTION,
        section_id=defect.ohe_substation,
        start_km=start_km,
        end_km=end_km,
        base_severity=severity,
        estimated_duration_minutes=120,
        due_date=defect.scheduled_date,
        requires_power_block=True,
        requires_traffic_block=True,
    )


# --- Weather Risk Engine ---
def evaluate_weather_rules(
    department: Department | str,
    requires_traffic_block: bool,
    temperature: float,
    wind_speed: float,
    visibility: float,
    rain: float,
) -> tuple[bool, float, list[str]]:
    viable = True
    risk_multiplier = 1.0
    warning_reasons: list[str] = []

    if (department == Department.ENGINEERING or department == "ENGINEERING") and temperature > 42.0:
        viable = False
        warning_reasons.append("Temperature exceeds safety limit. Track buckling risk.")

    if (department == Department.TRACTION or department == "TRACTION") and wind_speed > 50.0:
        viable = False
        warning_reasons.append("High crosswinds. OHE ladder work unsafe.")

    if visibility < 300.0 and requires_traffic_block:
        risk_multiplier += 0.35
        warning_reasons.append("Fog advisory. Increased signal headway required.")

    if rain > 2.0:
        risk_multiplier += 0.2
        warning_reasons.append("Active rainfall. Ground slip hazard.")

    return viable, round(risk_multiplier, 2), warning_reasons


# --- Ingestion Endpoints ---
@app.get("/", include_in_schema=False)
def root():
    return RedirectResponse(url="/docs")


@app.get("/favicon.ico", include_in_schema=False)
def favicon():
    return Response(status_code=204)


@app.get("/api-info")
def api_info():
    return {
        "status": "online",
        "service": "RailSync AI Operations & Data Normalization Service",
        "endpoints": {
            "docs": "/docs",
            "health": "/api/health",
            "dashboard": "/api/dashboard",
            "simulate": "/api/simulate",
            "block_decision": "/api/blocks/{block_id}/decision",
            "telemetry": "/api/telemetry",
            "plan_export": "/api/plan/export",
            "mock_data": "/mock-data",
            "normalize_tms": "/normalize/tms (POST)",
            "normalize_smms": "/normalize/smms (POST)",
            "normalize_tdms": "/normalize/tdms (POST)",
            "normalize_weather_risk": "/normalize/weather-risk (POST)",
        },
    }


@app.post("/api/normalize/tms", response_model=UnifiedMaintenanceTask)
@app.post("/normalize/tms", response_model=UnifiedMaintenanceTask)
def normalize_tms_endpoint(defect: TMSDefect):
    return parse_tms(defect)


@app.post("/api/normalize/smms", response_model=UnifiedMaintenanceTask)
@app.post("/normalize/smms", response_model=UnifiedMaintenanceTask)
def normalize_smms_endpoint(fault: SMMSFault):
    return parse_smms(fault)


@app.post("/api/normalize/tdms", response_model=UnifiedMaintenanceTask)
@app.post("/normalize/tdms", response_model=UnifiedMaintenanceTask)
def normalize_tdms_endpoint(defect: TDMSDefect):
    return parse_tdms(defect)


@app.post("/api/normalize/weather-risk", response_model=WeatherAssessmentResult)
@app.post("/normalize/weather-risk", response_model=WeatherAssessmentResult)
async def normalize_weather_risk(task: UnifiedMaintenanceTask):
    coords = SECTION_COORDINATES.get(task.section_id)
    if not coords:
        coords = SECTION_COORDINATES.get("HWH-BDC", {"lat": 22.7500, "lon": 88.3800})

    lat = coords["lat"]
    lon = coords["lon"]
    url = (
        f"https://api.open-meteo.com/v1/forecast"
        f"?latitude={lat}&longitude={lon}&current=temperature_2m,rain,wind_speed_10m,visibility"
    )

    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            response = await client.get(url)
            response.raise_for_status()
            weather_data = response.json()
    except Exception:
        weather_data = {
            "current": {
                "temperature_2m": 31.2,
                "rain": 0.0,
                "wind_speed_10m": 12.5,
                "visibility": 9000.0,
            }
        }

    current = weather_data.get("current", {})
    temperature = current.get("temperature_2m", 0.0)
    rain = current.get("rain", 0.0)
    wind_speed = current.get("wind_speed_10m", 0.0)
    visibility = current.get("visibility", 10000.0)

    viable, risk_multiplier, warning_reasons = evaluate_weather_rules(
        department=task.department,
        requires_traffic_block=task.requires_traffic_block,
        temperature=temperature,
        wind_speed=wind_speed,
        visibility=visibility,
        rain=rain,
    )

    return WeatherAssessmentResult(
        viable=viable,
        risk_multiplier=risk_multiplier,
        warning_reasons=warning_reasons,
        mapped_location={"lat": lat, "lon": lon},
    )


@app.get("/api/mock-data")
@app.get("/mock-data")
def get_mock_data():
    """Generates sample records per department with realistic Indian Railways sections."""
    ir_sections = ["NDLS-CNB", "BCT-ST", "MAS-BZA", "HWH-KGP", "SBC-MYS", "CSTM-Kalyan", "HWH-BWN"]
    station_codes = ["NDLS", "CNB", "BCT", "ST", "MAS", "BZA", "HWH", "KGP", "SBC", "MYS", "CSTM", "BWN"]
    tms_defects = ["IMR", "OBS", "WELD_DEFECT", "MINOR_CRACK"]
    smms_gears = ["Point Machine", "Track Circuit", "Signal Lamp"]
    smms_urgencies = ["U1", "U2", "U3", "U4"]
    tdms_issues = ["CONTACT WIRE WEAR", "CANTILEVER REPLACEMENT", "INSULATOR CLEANING", "BIRD NEST"]

    mock_tms = []
    mock_smms = []
    mock_tdms = []

    for _ in range(100):
        start = round(random.uniform(0, 500), 2)
        end = round(start + random.uniform(0.1, 2.0), 2)
        km_start_val = start if random.random() > 0.05 else "N/A"

        mock_tms.append(
            TMSDefect(
                ticket_id=f"TMS-{fake.unique.random_number(digits=7)}",
                track_id=random.choice(ir_sections),
                km_start=km_start_val,
                km_end=end,
                defect_class=random.choice(tms_defects),
                date_detected=fake.date_time_between(start_date="-30d", end_date="now"),
                speed_restriction_applied=random.choice([True, False]),
            ).model_dump(mode="json")
        )

        mock_smms.append(
            SMMSFault(
                fault_id=f"SMMS-{fake.unique.random_number(digits=7)}",
                station_code=random.choice(station_codes),
                gear_type=random.choice(smms_gears),
                failure_category="EQUIPMENT_FAILURE",
                reported_ts=fake.date_time_between(start_date="-10d", end_date="now"),
                urgency_code=random.choice(smms_urgencies),
            ).model_dump(mode="json")
        )

        base_mast = random.randint(10, 500)
        mock_tdms.append(
            TDMSDefect(
                defect_no=f"TDMS-{fake.unique.random_number(digits=7)}",
                ohe_substation=f"TSS-{random.choice(station_codes)}",
                mast_from=f"{base_mast}/{random.randint(1, 30)}",
                mast_to=f"{base_mast}/{random.randint(31, 60)}",
                issue_type=random.choice(tdms_issues),
                scheduled_date=fake.date_time_between(start_date="now", end_date="+15d"),
            ).model_dump(mode="json")
        )

    return {
        "TMS_Engineering": mock_tms,
        "SMMS_Signal_Telecom": mock_smms,
        "TDMS_Traction": mock_tdms,
    }


# ==============================================================================
# SECTION 2: RAILSYNC COCKPIT OPERATIONS SUITE (API FOR FRONTEND)
# ==============================================================================

# In-memory primary database for blocks, trains, alerts, and corridors
DATABASE = {
    "blocks": [
        {
            "block_id": "BLK-2026-W36-004",
            "section_id": "HWH-BDC",
            "scheduled_start": "01:30",
            "scheduled_end": "05:00",
            "duration": 210,
            "departments_involved": ["Engineering", "Signal & Telecom"],
            "status": "ACTIVE",
            "priority": "High",
            "consolidated_tasks": [
                {
                    "task_id": "TSK-1092",
                    "department": "Engineering",
                    "description": "Track renewal",
                    "severity": "IMR",
                    "allocated_time": 180,
                    "track_km_span": "Km 12-14",
                    "priority_score": 85.5,
                    "explainability": [
                        {"feature": "IMR Severity Grade", "impact": 28.4},
                        {"feature": "Track Density High", "impact": 12.1},
                        {"feature": "Days Remaining to SLA", "impact": 5.7},
                    ],
                }
            ],
            "decision": None,
            "decision_reason": None,
        },
        {
            "block_id": "BLK-2026-W36-005",
            "section_id": "BDC-BWN",
            "scheduled_start": "10:00",
            "scheduled_end": "14:00",
            "duration": 240,
            "departments_involved": ["Electrical"],
            "status": "PENDING_START",
            "priority": "Medium",
            "consolidated_tasks": [
                {
                    "task_id": "TSK-1093",
                    "department": "Electrical",
                    "description": "OHE Maintenance",
                    "severity": "Normal",
                    "allocated_time": 200,
                    "track_km_span": "Km 45-50",
                    "priority_score": 65.0,
                    "explainability": [
                        {"feature": "Maintenance Cycle", "impact": 15.0},
                        {"feature": "Load Density", "impact": 10.0},
                    ],
                }
            ],
            "decision": None,
            "decision_reason": None,
        },
    ],
    "trains": [
        {
            "train_no": "12303",
            "train_type": "Express",
            "name": "Poorva Express",
            "priority": "High",
            "scheduled_arrival": "14:30",
            "expected_arrival": "14:47",
            "delay_minutes": 17,
        },
        {
            "train_no": "56821",
            "train_type": "Freight",
            "name": "BCN HL",
            "priority": "Low",
            "scheduled_arrival": "15:00",
            "expected_arrival": "15:24",
            "delay_minutes": 24,
        },
    ],
    "alerts": [
        {
            "id": "ALT-01",
            "type": "WARNING",
            "severity": "high",
            "title": "Overdue Defect Flag",
            "message": "Task TSK-1092 (Track renewal) is past due-by date but remains unscheduled in tactical plan.",
            "timestamp": "10:45",
        },
        {
            "id": "ALT-02",
            "type": "CONFLICT",
            "severity": "high",
            "title": "Corridor Slot Conflict",
            "message": "Unresolved slot conflict on HWH-BDC between Engineering and TRD requests. Manual resolution required.",
            "timestamp": "10:50",
            "related_block_id": "BLK-2026-W36-004",
        },
        {
            "id": "ALT-03",
            "type": "TRAIN IMPACT",
            "severity": "medium",
            "title": "Punctuality Risk",
            "message": "Train 12303 expected delay: 17 minutes due to block extension.",
            "timestamp": "11:00",
            "affected_train": "12303",
        },
    ],
    "corridors": ["HWH-BDC", "BDC-BWN", "BWN-KNJ", "NJP-SGU"],
}


class SimulationRequest(BaseModel):
    block_id: str
    new_end_time: str


class DecisionRequest(BaseModel):
    decision: Literal["approved", "rejected"]
    reason: str | None = None
    operator_role: str = "COA"


def parse_minutes(t_str: str) -> int:
    try:
        parts = t_str.strip().split(":")
        return int(parts[0]) * 60 + int(parts[1])
    except Exception:
        return 0


@app.get("/api/health")
def api_health() -> dict:
    return {"status": "ok"}


@app.get("/api/dashboard")
def get_dashboard(view_mode: str = "optimized") -> dict:
    if view_mode == "siloed":
        siloed_blocks = [
            {
                "block_id": "BLK-SILO-ENG-01",
                "section_id": "HWH-BDC",
                "scheduled_start": "01:30",
                "scheduled_end": "04:30",
                "duration": 180,
                "departments_involved": ["Engineering"],
                "status": "PENDING_START",
                "priority": "High",
                "consolidated_tasks": [
                    {
                        "task_id": "TSK-1092",
                        "department": "Engineering",
                        "description": "Track renewal (Siloed request)",
                        "severity": "IMR",
                        "allocated_time": 180,
                        "track_km_span": "Km 12-14",
                        "priority_score": 85.5,
                        "explainability": [],
                    }
                ],
                "decision": None,
                "decision_reason": None,
            },
            {
                "block_id": "BLK-SILO-S&T-02",
                "section_id": "HWH-BDC",
                "scheduled_start": "04:00",
                "scheduled_end": "06:30",
                "duration": 150,
                "departments_involved": ["Signal & Telecom"],
                "status": "CONFLICT",
                "priority": "High",
                "consolidated_tasks": [
                    {
                        "task_id": "TSK-1094",
                        "department": "Signal & Telecom",
                        "description": "Point Machine Overhaul",
                        "severity": "Normal",
                        "allocated_time": 150,
                        "track_km_span": "Km 13-14",
                        "priority_score": 72.0,
                        "explainability": [],
                    }
                ],
                "decision": None,
                "decision_reason": None,
            },
            {
                "block_id": "BLK-SILO-TRD-03",
                "section_id": "BDC-BWN",
                "scheduled_start": "10:00",
                "scheduled_end": "14:00",
                "duration": 240,
                "departments_involved": ["Electrical"],
                "status": "PENDING_START",
                "priority": "Medium",
                "consolidated_tasks": [
                    {
                        "task_id": "TSK-1093",
                        "department": "Electrical",
                        "description": "OHE Maintenance",
                        "severity": "Normal",
                        "allocated_time": 200,
                        "track_km_span": "Km 45-50",
                        "priority_score": 65.0,
                        "explainability": [],
                    }
                ],
                "decision": None,
                "decision_reason": None,
            },
        ]
        siloed_kpis = [
            {"id": "kpi-1", "label": "Total Block Hours Saved", "value": "0.0 hrs", "unit": "hrs", "trend": "down", "trend_value": "Baseline traditional", "status": "warning"},
            {"id": "kpi-2", "label": "Asset Availability", "value": "88.2", "unit": "%", "trend": "down", "trend_value": "-6.5% vs optimized", "status": "warning"},
            {"id": "kpi-3", "label": "Disruption Reduction", "value": "12.0", "unit": "%", "trend": "down", "trend_value": "Frequent corridor closures", "status": "warning"},
            {"id": "kpi-4", "label": "Active Conflicts", "value": "07", "unit": "", "trend": "up", "trend_value": "High department clash", "status": "danger"},
        ]
        siloed_alerts = [
            {
                "id": "ALT-S01",
                "type": "CONFLICT",
                "severity": "high",
                "title": "Overlap Clash: Eng vs S&T",
                "message": "Block BLK-SILO-ENG-01 overlaps with BLK-SILO-S&T-02 on HWH-BDC between 04:00 and 04:30. No joint coordination.",
                "timestamp": "04:00",
            },
            {
                "id": "ALT-S02",
                "type": "TRAIN IMPACT",
                "severity": "high",
                "title": "Multiple Section Closures",
                "message": "Corridor HWH-BDC closed twice within 6 hours. Expect +45 mins cumulative delay for morning passenger rakes.",
                "timestamp": "06:30",
            },
        ]
        return {
            "kpis": siloed_kpis,
            "blocks": siloed_blocks,
            "trains": DATABASE["trains"],
            "alerts": siloed_alerts,
            "corridors": DATABASE["corridors"],
            "view_mode": "siloed",
        }

    # Optimized View Mode
    optimized_kpis = [
        {"id": "kpi-1", "label": "Total Block Hours Saved", "value": "18.5 hrs", "unit": "hrs", "trend": "up", "trend_value": "12.4% vs previous planning", "status": "good"},
        {"id": "kpi-2", "label": "Asset Availability", "value": "94.7", "unit": "%", "trend": "up", "trend_value": "2.1% from baseline", "status": "good"},
        {"id": "kpi-3", "label": "Disruption Reduction", "value": "37.2", "unit": "%", "trend": "down", "trend_value": "5% improvement", "status": "good"},
        {"id": "kpi-4", "label": "Active Conflicts", "value": "03", "unit": "", "trend": "neutral", "trend_value": "Under control", "status": "warning"},
    ]
    return {
        "kpis": optimized_kpis,
        "blocks": DATABASE["blocks"],
        "trains": DATABASE["trains"],
        "alerts": DATABASE["alerts"],
        "corridors": DATABASE["corridors"],
        "view_mode": "optimized",
    }


@app.post("/api/simulate")
def simulate(request: SimulationRequest) -> dict:
    target_block = next((b for b in DATABASE["blocks"] if b["block_id"] == request.block_id), None)
    scheduled_end_min = parse_minutes(target_block["scheduled_end"]) if target_block else parse_minutes("05:00")
    new_end_min = parse_minutes(request.new_end_time)
    delta_minutes = new_end_min - scheduled_end_min

    if delta_minutes <= 0:
        return {
            "total_passenger_delay_minutes": 0,
            "regulated_freight_trains": 0,
            "punctuality_impact_pct": 0.0,
            "conflict_warnings": [
                f"No downstream delays predicted. Block {request.block_id} finishes on/before schedule.",
                "Line capacity clear for scheduled passenger priority slots.",
            ],
            "delta_minutes": delta_minutes,
        }

    passenger_delay = int(delta_minutes * 0.75 + (delta_minutes // 30) * 8)
    freight_trains = max(1, delta_minutes // 20)
    punctuality_drop = round(min(25.0, 5.0 + (delta_minutes / 120.0) * 8.5), 1)

    warnings = [
        f"Express 12303 delayed by ~{passenger_delay} mins downstream restriction after {request.block_id} extension.",
        f"Freight 56821 regulated and held at loop line ({freight_trains} freight trains impacted).",
    ]
    if delta_minutes > 60:
        warnings.append("Critical Alert: Exceeds 60 min extension threshold. Central Operating Approval (COA) required.")
    if delta_minutes > 90:
        warnings.append("Headway compression risk detected near BWN junction.")

    return {
        "total_passenger_delay_minutes": passenger_delay,
        "regulated_freight_trains": freight_trains,
        "punctuality_impact_pct": -punctuality_drop,
        "conflict_warnings": warnings,
        "delta_minutes": delta_minutes,
    }


@app.post("/api/blocks/{block_id}/decision")
def record_decision(block_id: str, request: DecisionRequest) -> dict:
    target_block = next((b for b in DATABASE["blocks"] if b["block_id"] == block_id), None)
    if not target_block:
        raise HTTPException(status_code=404, detail="Block not found")

    target_block["decision"] = request.decision
    target_block["decision_reason"] = request.reason
    target_block["decision_time"] = datetime.now().strftime("%H:%M")
    target_block["operator_role"] = request.operator_role

    if request.decision == "approved":
        target_block["status"] = "APPROVED"
        for alert in DATABASE["alerts"]:
            if alert.get("related_block_id") == block_id:
                alert["type"] = "RESOLVED"
                alert["severity"] = "low"
                alert["message"] = f"Slot conflict resolved: Controller approved joint block {block_id}."
    else:
        target_block["status"] = "OVERRIDDEN"

    return {
        "message": f"Block {block_id} {request.decision.upper()} successfully",
        "block": target_block,
    }


@app.get("/api/telemetry")
@app.get("/api/telemetry/live")
def get_telemetry() -> list[dict]:
    now = datetime.now().strftime("%H:%M:%S")
    return [
        {
            "id": "TEL-01",
            "timestamp": now,
            "section": "HWH-BDC",
            "type": "TRACK_CIRCUIT",
            "status": "OCCUPIED",
            "detail": "Track Circuit TC-124 Active | Machine BCM-08 deployed at Km 13/4",
            "badge_color": "blue",
        },
        {
            "id": "TEL-02",
            "timestamp": now,
            "section": "HWH-BDC",
            "type": "TRACTION_POWER",
            "status": "ISOLATED",
            "detail": "25kV AC OHE switched off between Mst 12/10 - 14/02 | Earth discharge rods placed",
            "badge_color": "yellow",
        },
        {
            "id": "TEL-03",
            "timestamp": now,
            "section": "BDC-BWN",
            "type": "SIGNAL_ASPECT",
            "status": "NORMAL",
            "detail": "Automatic Block Signaling normal | Aspect: Caution for freight rake 56821",
            "badge_color": "green",
        },
        {
            "id": "TEL-04",
            "timestamp": now,
            "section": "HWH-BDC",
            "type": "SPEED_RESTRICTION",
            "status": "PSR_30",
            "detail": "Caution order 30 km/h notified on Down Line Km 12 to 14",
            "badge_color": "red",
        },
    ]


@app.get("/api/plan/export")
def export_plan() -> Response:
    output = io.StringIO()
    writer = csv.writer(output)

    # Metadata
    writer.writerow(["RailSync - Master Tactical Maintenance & Corridor Schedule"])
    writer.writerow(["Exported At", datetime.now().isoformat()])
    writer.writerow([])

    # Blocks
    writer.writerow([
        "Block ID",
        "Section",
        "Start Time",
        "End Time",
        "Duration (mins)",
        "Departments Involved",
        "Status",
        "Priority",
        "Decision",
        "Override Reason",
    ])
    for b in DATABASE["blocks"]:
        writer.writerow([
            b["block_id"],
            b["section_id"],
            b["scheduled_start"],
            b["scheduled_end"],
            b["duration"],
            ", ".join(b["departments_involved"]),
            b["status"],
            b["priority"],
            b.get("decision", "PENDING"),
            b.get("decision_reason", ""),
        ])

    writer.writerow([])
    # Train Impact
    writer.writerow(["Train No", "Type", "Name", "Priority", "Scheduled Arrival", "Expected Arrival", "Predicted Delay (mins)"])
    for t in DATABASE["trains"]:
        writer.writerow([
            t["train_no"],
            t["train_type"],
            t["name"],
            t["priority"],
            t["scheduled_arrival"],
            t["expected_arrival"],
            t["delay_minutes"],
        ])

    csv_data = output.getvalue()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="RailSync_Tactical_Plan.csv"'},
    )


if __name__ == "__main__":
    import os
    import sys
    import uvicorn

    backend_dir = os.path.dirname(os.path.abspath(__file__))
    sys.path.insert(0, backend_dir)
    print("Starting RailSync AI Backend on http://127.0.0.1:8000 ...")
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True, app_dir=backend_dir, log_level="info")
