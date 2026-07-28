"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import styled, { css, keyframes } from "styled-components";
import { AnimatePresence, LazyMotion, domAnimation, m } from "framer-motion";
import {
  Bot,
  X,
  Send,
  Sparkles,
  MessageSquare,
  ChevronRight,
  BarChart3,
  Download,
  RotateCcw,
  ArrowDown,
  Search,
} from "lucide-react";

/** -----------------------------
 * Types
 * ------------------------------*/
type AgentKey = "/master-dashboard" | "default";
type AgentRole = "manager" | "specialist";
type ChatRole = "assistant" | "user";

type KPI = {
  label: string;
  value: string;
  sub?: string;
  tone?: "good" | "warn" | "bad";
};

type MessageMeta = {
  kpis?: KPI[];
  table?: { headers: string[]; rows: (string | number)[][] };
  download?: { filename: string; mime: string; content: string };
};

type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
  suggestions?: string[];
  meta?: MessageMeta;
};

type Reply = {
  handled: boolean;
  message: Omit<ChatMessage, "id">;
  sideEffect?: () => void;
};

/** -----------------------------
 * Design Tokens (Apple-ish)
 * ------------------------------*/
const ACCENT = "#D31145";
const TEXT = "#0B0B0C";
const MUTED = "#6B7280";
const BORDER = "rgba(17, 17, 17, 0.10)";

/** -----------------------------
 * Agent Context
 * ------------------------------*/
const AGENT_DATA: Record<
  AgentKey,
  {
    role: AgentRole;
    name: string;
    description: string;
    guide: string;
    suggestions: string[];
  }
> = {
  "/master-dashboard": {
    role: "manager",
    name: "GMT 공장장 AI",
    description: "공장 KPI · 라인 상태 · 에너지",
    guide:
      "현재 공장 핵심 지표를 요약했습니다.\n아래에서 보고서를 선택하거나 질문을 입력하세요.",
    suggestions: ["가동률 상세 보고", "금일 생산 목표", "에너지 효율 분석"],
  },
  default: {
    role: "specialist",
    name: "파트장 AI",
    description: "페이지 사용 · 데이터 추출 · 이슈 대응",
    guide:
      "필요한 기능을 빠르게 안내해드릴게요.\n아래 버튼으로 시작해보세요.",
    suggestions: ["이 페이지 사용법", "데이터 내보내기", "오류 리포트"],
  },
};

/** -----------------------------
 * Mock Data
 * ------------------------------*/
type ExportRow = {
  [key: string]: string | number;
  time: string;
  line: string;
  product: string;
  planned: number;
  actual: number;
  defect_pct: number;
  energy_kwh: number;
};

const MOCK_PRODUCTION_LOG: ExportRow[] = [
  { time: "2026-02-20 08:00", line: "A", product: "AX-21", planned: 1200, actual: 1188, defect_pct: 0.6, energy_kwh: 310 },
  { time: "2026-02-20 10:00", line: "A", product: "AX-21", planned: 1200, actual: 1215, defect_pct: 0.5, energy_kwh: 318 },
  { time: "2026-02-20 12:00", line: "B", product: "BX-04", planned: 1050, actual: 1032, defect_pct: 0.9, energy_kwh: 295 },
  { time: "2026-02-20 14:00", line: "B", product: "BX-04", planned: 1050, actual: 1068, defect_pct: 0.8, energy_kwh: 302 },
  { time: "2026-02-20 16:00", line: "C", product: "CX-11", planned: 980, actual: 942, defect_pct: 1.2, energy_kwh: 288 },
  { time: "2026-02-20 18:00", line: "C", product: "CX-11", planned: 980, actual: 990, defect_pct: 1.0, energy_kwh: 291 },
];

const MOCK_ALARM_LOG = [
  { time: "15:12", equip: "Press-2", code: "ALM-17", message: "압력 편차", status: "해결" },
  { time: "14:48", equip: "Robot-1", code: "ALM-08", message: "그리퍼 정렬", status: "모니터링" },
  { time: "13:05", equip: "Oven-3", code: "ALM-21", message: "온도 상승 지연", status: "조치 필요" },
  { time: "10:22", equip: "CNC-4", code: "ALM-04", message: "윤활 부족", status: "해결" },
];

/** -----------------------------
 * Utilities
 * ------------------------------*/
function escapeCSV(value: unknown) {
  const s = String(value ?? "");
  if (s.includes('"') || s.includes(",") || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function toCSV(rows: Array<{ [key: string]: string | number }>) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(","), ...rows.map((r) => headers.map((h) => escapeCSV(r[h])).join(","))];
  return lines.join("\n");
}

function downloadTextFile(filename: string, content: string, mime = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function normalize(s: string) {
  return s.trim().toLowerCase();
}

function isGreetingLike(t: string) {
  return (
    t === "hi" ||
    t === "hello" ||
    t === "hey" ||
    t.includes("안녕") ||
    t.includes("반갑") ||
    t.includes("하이") ||
    t.includes("헬로") ||
    t === "ㅎㅇ"
  );
}

function extractLine(text: string) {
  const m = text.match(/라인\s*([a-z])/i);
  if (m?.[1]) return m[1].toUpperCase();
  const m2 = text.match(/\b([ABC])\b/);
  if (m2?.[1]) return m2[1].toUpperCase();
  return null;
}

type LineSummary = {
  line: string;
  avgDefect: number;
  planned: number;
  actual: number;
  energy: number;
  samples: number;
};

function summarizeByLine(rows: ExportRow[]): LineSummary[] {
  const map = new Map<string, { defectSum: number; planned: number; actual: number; energy: number; samples: number }>();
  for (const r of rows) {
    const key = String(r.line);
    const cur = map.get(key) ?? { defectSum: 0, planned: 0, actual: 0, energy: 0, samples: 0 };
    cur.defectSum += Number(r.defect_pct ?? 0);
    cur.planned += Number(r.planned ?? 0);
    cur.actual += Number(r.actual ?? 0);
    cur.energy += Number(r.energy_kwh ?? 0);
    cur.samples += 1;
    map.set(key, cur);
  }
  const out: LineSummary[] = Array.from(map.entries()).map(([line, v]) => ({
    line,
    avgDefect: v.samples ? v.defectSum / v.samples : 0,
    planned: v.planned,
    actual: v.actual,
    energy: v.energy,
    samples: v.samples,
  }));
  out.sort((a, b) => b.avgDefect - a.avgDefect);
  return out;
}

function fmtPct(n: number) {
  return `${(Math.round(n * 100) / 100).toFixed(2)}%`;
}

/** -----------------------------
 * Local Tool Reply Builder
 * - "품질/불량" 같은 현업 질문은 화면에 있는 도메인 응답만 로컬로 처리
 * ------------------------------*/
function buildReply(inputText: string, agentKey: AgentKey, history?: ChatMessage[]): Reply {
  const t = normalize(inputText);
  const lineStats = summarizeByLine(MOCK_PRODUCTION_LOG);
  const topLine = lineStats[0]?.line ?? "C";
  const topDefect = lineStats[0]?.avgDefect ?? 1.1;

  // 0) 인사/짧은 입력은 로컬로 처리 (Phi의 번역투/어색함 방지)
  if (isGreetingLike(t)) {
    const sug =
      agentKey === "/master-dashboard"
        ? ["가동률 상세 보고", "금일 생산 목표", "에너지 효율 분석", "라인별 불량률 요약"]
        : ["이 페이지 사용법", "데이터 내보내기", "오류 리포트", "라인별 불량률 요약"];

    return {
      handled: true,
      message: {
        role: "assistant",
        text: "반갑습니다. 어떤 내용을 확인해드릴까요?\n아래에서 선택하거나 원하는 내용을 그대로 입력해 주세요.",
        suggestions: sug,
      },
    };
  }

    // ✅ "원인" 단독 입력도 문맥으로 해석해서 로컬 처리
  const isCauseAsk =
    t === "원인" ||
    t.endsWith("원인") ||
    t.includes("원인 알려") ||
    t.includes("원인 뭐") ||
    t.includes("왜") ||
    t.includes("cause");

  if (isCauseAsk) {
    const prevUser =
      history?.slice(0, -1).reverse().find((m) => m.role === "user")?.text ?? "";
    const prevAssistant =
      history?.slice(0, -1).reverse().find((m) => m.role === "assistant")?.text ?? "";

    const ctxNorm = normalize(`${prevUser}\n${prevAssistant}`);

    const ctxLooksLikeDefect =
      ctxNorm.includes("불량") ||
      ctxNorm.includes("품질") ||
      ctxNorm.includes("defect") ||
      ctxNorm.includes("quality") ||
      ctxNorm.includes("불량체크");

    if (ctxLooksLikeDefect || t.includes("불량") || t.includes("품질")) {
      const line = extractLine(inputText) || extractLine(prevUser) || extractLine(prevAssistant);

      const rows = line
        ? MOCK_PRODUCTION_LOG.filter((r) => String(r.line).toUpperCase() === line)
        : MOCK_PRODUCTION_LOG;

      const avg =
        rows.length > 0
          ? rows.reduce((s, r) => s + Number(r.defect_pct ?? 0), 0) / rows.length
          : 0;

      const times = rows
        .map((r) => String(r.time).split(" ")[1] ?? String(r.time))
        .slice(0, 6)
        .join(" / ");

      const needs = MOCK_ALARM_LOG.filter((a) => a.status === "조치 필요");
      const needsText = needs.length
        ? `조치 필요 알람: ${needs.map((n) => `${n.equip}(${n.message})`).join(", ")}`
        : `조치 필요 알람: 없음(샘플 기준)`;

      return {
        handled: true,
        message: {
          role: "assistant",
          text:
            `${line ? `라인 ${line}` : "불량"} 원인 점검을 대시보드 흐름에 맞춰 정리해드릴게요. (샘플 데이터 기준)\n\n` +
            `요약: 평균 불량률 ${avg.toFixed(2)}%${times ? ` · 기록 시각 ${times}` : ""}\n` +
            `${needsText}\n\n` +
            `가능성 우선순위(체크리스트)\n` +
            `1) 열처리/온도: Oven-3 “온도 상승 지연” → 예열/히터 출력/PID/센서 교정\n` +
            `2) 압력/성형: Press-2 “압력 편차” → 압력 설정/유압/누설 점검\n` +
            `3) 정렬/이송: Robot-1 “그리퍼 정렬” → 위치 보정/지그/비전 튜닝\n` +
            `4) 자재/LOT: LOT 변경 구간 비교 → LOT별 불량률/검수 기준 확인\n` +
            `5) 셋업 전환: 전환 직후 편차 → 초반 샘플 집중 확인\n\n` +
            `다음 액션: (1) 오류 리포트에서 “조치 필요”부터 확인 (2) CSV 내보내기로 시간대/품목별 비교`,
          suggestions: ["오류 리포트", "조치 필요 항목만", "데이터 내보내기"],
        },
      };
    }

    // 문맥이 없으면 선택지로 안내
    return {
      handled: true,
      message: {
        role: "assistant",
        text:
          "어떤 항목의 ‘원인’을 말씀하시는지 선택해 주세요.\n" +
          "• 불량(품질) 원인\n" +
          "• 알람(오류) 원인\n" +
          "• 에너지 이상 원인",
        suggestions: ["라인 B 불량률 원인", "오류 리포트", "에너지 효율 분석"],
      },
    };
  }

  // 1) 범위 밖 질문(날씨/뉴스 등)은 로컬 가드
  if (t.includes("날씨") || t.includes("weather") || t.includes("뉴스") || t.includes("주가") || t.includes("stock")) {
    return {
      handled: true,
      message: {
        role: "assistant",
        text:
          "이 챗봇은 **공장 대시보드(생산/KPI/에너지/알람)** 범위에서만 안내할 수 있어요.\n" +
          "대신 아래처럼 질문해주시면 바로 도와드릴게요.\n" +
          "• 라인 B 불량률 원인\n" +
          "• 조치 필요 알람만 보기\n" +
          "• 생산 로그 CSV 내보내기",
        suggestions:
          agentKey === "/master-dashboard"
            ? ["라인별 불량률 요약", "가동률 상세 보고", "에너지 효율 분석"]
            : ["오류 리포트", "데이터 내보내기", "이 페이지 사용법"],
      },
    };
  }

  // 2) 공통 기능(사용법/내보내기/오류리포트/조치필요)은 어디서든 로컬
  if (t.includes("사용법") || t.includes("help") || t.includes("가이드")) {
    return {
      handled: true,
      message: {
        role: "assistant",
        text:
          "이 페이지에서 자주 쓰는 흐름만 깔끔하게 정리해드릴게요.\n\n" +
          "1) 상단 필터에서 **기간 / 라인 / 품목**을 먼저 선택해 범위를 좁혀요.\n" +
          "2) KPI 카드를 클릭하면 상세(추세/원인)로 내려가서 볼 수 있어요.\n" +
          "3) 원본 데이터가 필요하면 **데이터 내보내기**로 CSV를 받으세요.\n" +
          "4) 설비 이슈는 **오류 리포트**에서 최근 알람과 상태(조치 필요/모니터링/해결)를 확인합니다.",
        suggestions: ["데이터 내보내기", "오류 리포트", "라인별 불량률 요약"],
      },
    };
  }

  if (t.includes("내보내기") || t.includes("export") || t.includes("다운로드")) {
    const csv = toCSV(MOCK_PRODUCTION_LOG);
    const filename = `MES_export_production_${new Date().toISOString().slice(0, 10)}.csv`;

    return {
      handled: true,
      message: {
        role: "assistant",
        text:
          "생산 로그(샘플) CSV를 준비했습니다.\n" +
          `• 파일명: ${filename}\n` +
          "• 컬럼: time / line / product / planned / actual / defect_pct / energy_kwh\n\n" +
          "아래 버튼으로 다시 다운로드할 수도 있어요.",
        suggestions: ["오류 리포트", "라인별 불량률 요약", "이 페이지 사용법"],
        meta: {
          download: { filename, mime: "text/csv;charset=utf-8", content: csv },
          table: {
            headers: ["time", "line", "product", "planned", "actual", "defect(%)"],
            rows: MOCK_PRODUCTION_LOG.slice(0, 4).map((r) => [
              r.time,
              r.line,
              r.product,
              r.planned,
              r.actual,
              r.defect_pct,
            ]),
          },
        },
      },
      sideEffect: () => downloadTextFile(filename, csv, "text/csv;charset=utf-8"),
    };
  }

  if (t.includes("오류") || t.includes("에러") || t.includes("버그") || t.includes("report") || t.includes("알람")) {
    return {
      handled: true,
      message: {
        role: "assistant",
        text:
          "최근 알람(샘플)입니다.\n" +
          "• 조치 필요: Oven-3 (온도 상승 지연)\n" +
          "• 모니터링: Robot-1 (그리퍼 정렬)\n\n" +
          "원하시면 “조치 필요 항목만”처럼 필터링해서 보여드릴게요.",
        suggestions: ["조치 필요 항목만", "라인별 불량률 요약", "데이터 내보내기"],
        meta: {
          table: {
            headers: ["시간", "설비", "코드", "내용", "상태"],
            rows: MOCK_ALARM_LOG.map((a) => [a.time, a.equip, a.code, a.message, a.status]),
          },
        },
      },
    };
  }

  if (t.includes("조치 필요")) {
    const needs = MOCK_ALARM_LOG.filter((a) => a.status === "조치 필요");
    return {
      handled: true,
      message: {
        role: "assistant",
        text:
          needs.length
            ? "조치 필요 항목만 추렸습니다. (샘플)\n• 우선순위: Oven-3 → 온도 상승 지연"
            : "현재 조치 필요 항목이 없습니다. (샘플 데이터 기준)",
        suggestions: ["오류 리포트", "라인별 불량률 요약", "데이터 내보내기"],
        meta: needs.length
          ? {
              table: {
                headers: ["시간", "설비", "코드", "내용", "상태"],
                rows: needs.map((a) => [a.time, a.equip, a.code, a.message, a.status]),
              },
            }
          : undefined,
      },
    };
  }

  // 3) ✅ 불량/품질 관련 질문은 로컬로 강제 (여기가 스샷 문제의 핵심 해결)
  if (t.includes("불량") || t.includes("defect") || t.includes("quality") || t.includes("결함")) {
    const line = extractLine(inputText);
    const selected = line ? lineStats.find((s) => s.line === line) : null;

    const tableRows = lineStats.map((s) => [
      `라인 ${s.line}`,
      fmtPct(s.avgDefect),
      s.actual,
      s.planned,
      s.samples,
    ]);

    // 원인 요청
    if (t.includes("원인") || t.includes("왜") || t.includes("cause")) {
      const target = selected ?? lineStats[0];
      return {
        handled: true,
        message: {
          role: "assistant",
          text:
            `${line ? `라인 ${line}` : "라인별"} 불량 이슈를 점검할 때는 아래 순서가 가장 깔끔합니다.\n\n` +
            `1) **기간/품목/라인 필터**로 구간을 먼저 좁혀요.\n` +
            `2) 불량률이 튀는 시점에 **알람(조치 필요/모니터링)**이 같이 있었는지 확인합니다.\n` +
            `3) 그 다음은 원인 체크리스트예요:\n` +
            `   • 공정 조건: 온도/압력/속도 변경\n` +
            `   • 자재: LOT 변경/공급 품질\n` +
            `   • 설비: 센서/정렬/윤활(알람 로그 참고)\n` +
            `   • 작업: 셋업 전환 직후 변동\n\n` +
            `샘플 데이터 기준으로는 **라인 ${target.line}**의 평균 불량률이 가장 높습니다(${fmtPct(
              target.avgDefect
            )}).`,
          suggestions: ["조치 필요 항목만", "오류 리포트", "데이터 내보내기"],
          meta: {
            table: {
              headers: ["라인", "평균 불량(%)", "실적", "계획", "표본 수"],
              rows: tableRows,
            },
          },
        },
      };
    }

    // 단순 체크 요청
    return {
      handled: true,
      message: {
        role: "assistant",
        text:
          "불량(품질) 체크는 아래 흐름으로 보면 가장 빠릅니다.\n\n" +
          "1) 상단 필터에서 **기간 → 라인 → 품목** 순으로 범위를 줄이세요.\n" +
          "2) KPI 카드에서 **불량률(%)**을 확인하고 라인/품목을 바꿔 비교해요.\n" +
          "3) 불량률이 높은 구간이면 **오류 리포트**에서 ‘조치 필요’ 알람이 있었는지도 같이 보세요.\n" +
          "4) 원본 데이터가 필요하면 **데이터 내보내기**로 CSV를 내려받으면 됩니다.\n\n" +
          `샘플 데이터 기준으로는 **라인 ${topLine}**의 평균 불량률이 가장 높습니다(${fmtPct(topDefect)}).`,
        suggestions: ["라인 B 불량률 원인", "오류 리포트", "데이터 내보내기"],
        meta: {
          table: {
            headers: ["라인", "평균 불량(%)", "실적", "계획", "표본 수"],
            rows: tableRows,
          },
        },
      },
    };
  }

  /** --- Manager (master-dashboard) specific --- */
  if (agentKey === "/master-dashboard") {
    if (t.includes("가동률") || t.includes("util")) {
      return {
        handled: true,
        message: {
          role: "assistant",
          text:
            "가동률 상세 보고입니다.\n" +
            "• 전체: 98.0% (목표 97.0% 대비 +1.0p)\n" +
            "• 정지 Top 원인: 자재 대기 / 미세정지 / 셋업 전환",
          suggestions: ["금일 생산 목표", "에너지 효율 분석", "라인별 불량률 요약"],
          meta: {
            kpis: [
              { label: "전체 가동률", value: "98.0%", sub: "목표 대비 +1.0p", tone: "good" },
              { label: "라인 A", value: "99.2%", sub: "정상", tone: "good" },
              { label: "라인 B", value: "97.5%", sub: "단기 변동", tone: "warn" },
              { label: "라인 C", value: "96.8%", sub: "미세정지 ↑", tone: "warn" },
            ],
            table: {
              headers: ["라인", "상태", "비가동(분)", "주요 원인"],
              rows: [
                ["A", "RUN", 18, "자재 대기"],
                ["B", "RUN", 42, "셋업 전환"],
                ["C", "ATTN", 55, "센서 튜닝"],
              ],
            },
          },
        },
      };
    }

    if (t.includes("생산") || t.includes("목표") || t.includes("target")) {
      return {
        handled: true,
        message: {
          role: "assistant",
          text:
            "금일 생산 목표 현황입니다.\n" +
            "• 계획: 32,000 EA\n" +
            "• 실적: 25,600 EA (진도율 80%)\n" +
            "• 예상 완료: 18:40 (현재 속도 기준)",
          suggestions: ["가동률 상세 보고", "에너지 효율 분석", "라인별 불량률 요약"],
          meta: {
            kpis: [
              { label: "계획", value: "32,000 EA" },
              { label: "실적", value: "25,600 EA", sub: "진도율 80%", tone: "good" },
              { label: "잔여", value: "6,400 EA" },
              { label: "예상 완료", value: "18:40", sub: "속도 유지 시", tone: "warn" },
            ],
            table: {
              headers: ["라인", "계획(EA)", "실적(EA)", "불량(%)"],
              rows: [
                ["A", 12000, 9800, 0.6],
                ["B", 11000, 9000, 0.8],
                ["C", 9000, 6800, 1.1],
              ],
            },
          },
        },
      };
    }

    if (t.includes("에너지") || t.includes("효율") || t.includes("energy")) {
      return {
        handled: true,
        message: {
          role: "assistant",
          text:
            "에너지 효율 분석 결과입니다.\n" +
            "• kWh/EA: 0.82 (전일 대비 -2.4%)\n" +
            "• 피크 부하: 14:00 ~ 15:00\n" +
            "• 권장: Oven-3 예열 타이밍 최적화, Press-2 압력 튜닝",
          suggestions: ["가동률 상세 보고", "금일 생산 목표", "라인별 불량률 요약"],
          meta: {
            kpis: [
              { label: "kWh / EA", value: "0.82", sub: "전일 -2.4%", tone: "good" },
              { label: "피크 구간", value: "14~15시", sub: "부하 집중", tone: "warn" },
              { label: "CO₂ 추정", value: "↓ 1.8%", sub: "가정치", tone: "good" },
              { label: "이상 설비", value: "Oven-3", sub: "예열 지연", tone: "warn" },
            ],
            table: {
              headers: ["항목", "현재", "전일", "변화"],
              rows: [
                ["kWh/EA", 0.82, 0.84, "-2.4%"],
                ["피크(kW)", 3120, 3250, "-4.0%"],
                ["유휴전력(kW)", 220, 260, "-15.4%"],
              ],
            },
          },
        },
      };
    }
  }

  // fallback -> local guide
  return {
    handled: false,
    message: {
      role: "assistant",
      text:
        "원하시는 내용을 조금만 더 구체적으로 알려주시면 정확히 도와드릴게요.\n" +
        "예) “라인 B 불량률 원인”, “조치 필요 알람만”, “생산 로그 CSV 내보내기”",
      suggestions:
        agentKey === "/master-dashboard"
          ? ["가동률 상세 보고", "금일 생산 목표", "에너지 효율 분석", "라인 B 불량률 원인"]
          : ["이 페이지 사용법", "데이터 내보내기", "오류 리포트", "라인 B 불량률 원인"],
    },
  };
}

/** -----------------------------
 * Portal
 * ------------------------------*/
function Portal({ children }: { children: React.ReactNode }) {
  if (typeof document === "undefined") return null;
  return createPortal(children, document.body);
}

/** -----------------------------
 * Styled
 * ------------------------------*/
const NavbarTrigger = styled(m.button)<{ $active?: boolean }>`
  position: fixed;
  left: 12px;
  bottom: 15px;
  z-index: 10030;
  width: 60px;
  height: 67px;
  padding: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
  gap: 5px;
  border: 0;
  background: transparent;
  color: ${ACCENT};
  font-weight: 500;
  font-size: 11px;
  line-height: 1.2;
  letter-spacing: -0.03em;
  cursor: pointer;
  white-space: nowrap;
  transition: transform 0.15s ease;

  svg {
    width: 18px;
    height: 18px;
    box-sizing: content-box;
    padding: 10px;
    border-radius: 50%;
    background: ${ACCENT};
    color: #ffffff;
    stroke-width: 2;
  }

  &:hover {
    transform: translateY(-1px);
  }
`;

const ModalOverlay = styled(m.div)`
  position: fixed;
  top: 0;
  left: var(--app-sidebar-offset, 0px);
  right: 0;
  bottom: 0;
  z-index: 9998;
  display: flex;
  align-items: stretch;
  justify-content: flex-end;

  background: rgba(17, 24, 39, 0.48);

  backdrop-filter: blur(7px);
  -webkit-backdrop-filter: blur(7px);
`;

const ModalPanel = styled(m.div)`
  width: min(920px, calc(100vw - 96px));
  height: 100%;

  overflow: hidden;
  position: relative;

  background: #ffffff;
  border-left: 1px solid rgba(17, 24, 39, 0.12);
  box-shadow: -32px 0 90px rgba(15, 23, 42, 0.22);

  &::before {
    content: "";
    position: absolute;
    inset: 0 0 auto 0;
    height: 2px;
    background: linear-gradient(90deg, transparent, ${ACCENT}, transparent);
    opacity: 0.9;
  }

  &::after {
    content: "";
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: radial-gradient(600px 260px at 20% 10%, rgba(255, 255, 255, 0.55), transparent 60%),
      radial-gradient(500px 220px at 90% 40%, rgba(255, 255, 255, 0.35), transparent 62%);
    opacity: 0.55;
    mix-blend-mode: overlay;
  }

  /* ✅ Phone fallback (세로형) */
  @media (max-width: 520px) {
    width: min(560px, calc(100vw - 28px));
    height: min(760px, 100vh);
    height: min(760px, 100dvh);
    border-radius: 20px;
  }

  &::before,
  &::after {
    content: none;
  }

  @media (max-width: 980px) {
    width: min(720px, calc(100vw - 24px));
  }

  @media (max-width: 720px) {
    width: 100vw;
    height: 100%;
    border-left: 0;
    border-radius: 0;
  }
`;

const AdvisorPanelLayout = styled.div`
  height: 100%;
  min-height: 0;
  display: grid;
  grid-template-columns: 342px minmax(0, 1fr);
  background: #ffffff;

  @media (max-width: 980px) {
    grid-template-columns: minmax(0, 1fr);

    .advisor-history {
      display: none;
    }
  }
`;

const HistoryPane = styled.aside`
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  border-right: 1px solid rgba(17, 24, 39, 0.10);
  background: #ffffff;
`;

const HistoryHeader = styled.div`
  flex-shrink: 0;
  padding: 22px 20px 18px;
  border-bottom: 1px solid rgba(17, 24, 39, 0.08);
`;

const HistoryTitleRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
`;

const HistoryTitle = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 800;
  letter-spacing: -0.04em;
  color: #111827;
`;

const HistoryCount = styled.span`
  min-width: 22px;
  height: 22px;
  padding: 0 7px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #eef2f7;
  color: #667085;
  font-size: 12px;
  font-weight: 800;
`;

const HistorySubtitle = styled.div`
  color: #667085;
  font-size: 12px;
  font-weight: 650;
  letter-spacing: -0.02em;
`;

const HistorySearch = styled.div`
  margin-top: 20px;
  height: 40px;
  border-radius: 8px;
  border: 1px solid rgba(17, 24, 39, 0.10);
  background: #f8fafc;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 0 13px;
  color: #98a2b3;

  span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 13px;
    font-weight: 650;
  }
`;

const HistoryList = styled.div`
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 16px 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  scrollbar-width: thin;
  scrollbar-color: #cbd5e1 transparent;
`;

const HistoryItem = styled.button<{ $active?: boolean }>`
  appearance: none;
  width: 100%;
  min-height: 74px;
  border-radius: 8px;
  border: 1px solid ${(p) => (p.$active ? "rgba(211, 17, 69, 0.34)" : "rgba(17, 24, 39, 0.10)")};
  background: ${(p) => (p.$active ? "rgba(255, 241, 245, 0.78)" : "#ffffff")};
  color: #111827;
  cursor: pointer;
  text-align: left;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
  transition: border-color 0.16s ease, background 0.16s ease, transform 0.16s ease;

  &:hover {
    transform: translateY(-1px);
    border-color: rgba(211, 17, 69, 0.28);
    background: rgba(255, 241, 245, 0.48);
  }
`;

const HistoryItemTitle = styled.span`
  display: block;
  color: #111827;
  font-size: 13px;
  font-weight: 760;
  line-height: 1.35;
  letter-spacing: -0.03em;
  word-break: keep-all;
`;

const HistoryItemTime = styled.span<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: ${(p) => (p.$active ? ACCENT : "#98a2b3")};
  font-size: 11px;
  font-weight: 720;
`;

const QuickPromptBar = styled.div`
  flex-shrink: 0;
  padding: 14px 24px 10px;
  background: #f5f6f8;
  border-top: 1px solid rgba(17, 24, 39, 0.08);
  display: flex;
  justify-content: center;
  gap: 8px;
  flex-wrap: wrap;
`;

const QuickPromptButton = styled.button`
  appearance: none;
  min-height: 34px;
  padding: 0 16px;
  border-radius: 999px;
  border: 1px solid rgba(17, 24, 39, 0.10);
  background: #ffffff;
  color: #344054;
  cursor: pointer;
  font-size: 12px;
  font-weight: 720;
  letter-spacing: -0.03em;
  transition: border-color 0.16s ease, color 0.16s ease, transform 0.16s ease;

  &:hover {
    transform: translateY(-1px);
    border-color: rgba(211, 17, 69, 0.32);
    color: ${ACCENT};
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.55;
    transform: none;
  }
`;

const ChatContainer = styled.div`
  height: 100%;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;

  font-family: "Pretendard Variable", "Pretendard", ui-sans-serif, system-ui, -apple-system,
    Segoe UI, Roboto, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif;
  color: ${TEXT};
`;

const Header = styled.div`
  flex-shrink: 0;
  min-height: 88px;
  padding: 18px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;

  background: #ffffff;
  border-bottom: 1px solid ${BORDER};
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
`;

const HeaderRight = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  flex-wrap: nowrap;
  min-width: 0;
`;

const Avatar = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: grid;
  place-items: center;

  background: #fff1f5;
  border: 1px solid rgba(211, 17, 69, 0.10);

  svg {
    color: ${ACCENT};
  }
`;

const HeaderText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;

  .title {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 18px;
    font-weight: 820;
    letter-spacing: -0.3px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .desc {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    font-size: 13px;
    color: ${MUTED};
    letter-spacing: -0.2px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;

const IconButton = styled.button<{ $danger?: boolean }>`
  width: 34px;
  height: 34px;
  border-radius: 12px;
  border: 1px solid ${BORDER};
  background: rgba(255, 255, 255, 0.72);
  cursor: pointer;
  display: grid;
  place-items: center;
  transition: transform 0.12s ease, background 0.12s ease, border-color 0.12s ease;
  color: rgba(17, 17, 17, 0.72);

  &:hover {
    transform: scale(1.03);
    background: rgba(255, 255, 255, 0.95);
  }

  ${(p) =>
    p.$danger
      ? css`
          border-color: rgba(239, 68, 68, 0.22);
          color: rgba(239, 68, 68, 0.92);
          &:hover {
            border-color: rgba(239, 68, 68, 0.35);
          }
        `
      : ""}

  svg {
    color: currentColor;
  }
`;

const Dot = styled.span<{ $tone?: "good" | "warn" | "bad" }>`
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: rgba(107, 114, 128, 0.6);

  ${(p) =>
    p.$tone === "good"
      ? css`background: rgba(16, 185, 129, 0.95);`
      : p.$tone === "warn"
      ? css`background: rgba(245, 158, 11, 0.95);`
      : p.$tone === "bad"
      ? css`background: rgba(239, 68, 68, 0.95);`
      : ""}
`;

const MessageList = styled.div`
  flex: 1;
  min-height: 0;
  padding: 26px 26px 18px;
  overflow: auto;
  background: #f5f6f8;

  display: flex;
  flex-direction: column;
  gap: 16px;

  scrollbar-width: none;
  &::-webkit-scrollbar {
    width: 0px;
    height: 0px;
  }
`;

const Row = styled.div<{ $role: ChatRole }>`
  display: flex;
  flex-direction: column;
  align-items: ${(p) => (p.$role === "user" ? "flex-end" : "flex-start")};
  gap: 8px;
`;

const Bubble = styled(m.div)<{ $role: ChatRole }>`
  max-width: min(82%, 720px);
  padding: 15px 18px;
  border-radius: 18px;
  font-size: 15px;
  line-height: 1.6;
  letter-spacing: -0.2px;
  white-space: pre-wrap;
  word-break: keep-all;

  ${(p) =>
    p.$role === "user"
      ? css`
          background: ${ACCENT};
          color: white;
          border: 1px solid rgba(211, 17, 69, 0.18);
          border-bottom-right-radius: 10px;
          box-shadow: 0 14px 30px rgba(211, 17, 69, 0.18);
        `
      : css`
          background: #ffffff;
          color: ${TEXT};
          border: 1px solid ${BORDER};
          border-bottom-left-radius: 10px;
          box-shadow: 0 18px 42px rgba(15, 23, 42, 0.08);
        `}
`;

const SuggestionArea = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const Chip = styled.button`
  appearance: none;
  border: 1px solid ${BORDER};
  background: rgba(255, 255, 255, 0.78);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);

  padding: 9px 12px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 650;
  letter-spacing: -0.2px;
  color: rgba(17, 17, 17, 0.82);
  cursor: pointer;

  display: inline-flex;
  align-items: center;
  gap: 6px;

  transition: transform 0.12s ease, border-color 0.12s ease, background 0.12s ease;

  &:hover {
    transform: translateY(-1px);
    border-color: rgba(211, 17, 69, 0.35);
    background: rgba(255, 255, 255, 0.96);
  }

  svg {
    opacity: 0.85;
  }
`;

const MetaBlock = styled.div`
  max-width: min(78%, 720px);
`;

const KPIGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
`;

const KPICard = styled.div<{ $tone?: KPI["tone"] }>`
  padding: 12px 12px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.90);
  border: 1px solid ${BORDER};
  box-shadow: 0 10px 22px rgba(0, 0, 0, 0.06);

  .label {
    font-size: 12px;
    color: ${MUTED};
    letter-spacing: -0.2px;
  }
  .value {
    margin-top: 6px;
    font-size: 16px;
    font-weight: 820;
    letter-spacing: -0.3px;
  }
  .sub {
    margin-top: 2px;
    font-size: 12px;
    color: ${MUTED};
    letter-spacing: -0.2px;
  }

  ${(p) =>
    p.$tone === "good"
      ? css`border-color: rgba(16, 185, 129, 0.25);`
      : p.$tone === "warn"
      ? css`border-color: rgba(245, 158, 11, 0.28);`
      : p.$tone === "bad"
      ? css`border-color: rgba(239, 68, 68, 0.28);`
      : ""}
`;

const TableWrap = styled.div`
  margin-top: 10px;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid ${BORDER};
  background: rgba(255, 255, 255, 0.90);
  box-shadow: 0 10px 22px rgba(0, 0, 0, 0.06);

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
  }

  thead th {
    text-align: left;
    padding: 10px 12px;
    color: rgba(17, 17, 17, 0.78);
    background: rgba(245, 245, 247, 0.95);
    border-bottom: 1px solid ${BORDER};
    font-weight: 780;
    letter-spacing: -0.2px;
    white-space: nowrap;
  }

  tbody td {
    padding: 10px 12px;
    border-bottom: 1px solid rgba(17, 17, 17, 0.06);
    color: rgba(17, 17, 17, 0.78);
    letter-spacing: -0.2px;
    vertical-align: top;
  }

  tbody tr:last-child td {
    border-bottom: none;
  }
`;

const DownloadButton = styled.button`
  margin-top: 10px;
  width: fit-content;

  appearance: none;
  border: 1px solid rgba(211, 17, 69, 0.25);
  background: rgba(211, 17, 69, 0.08);
  color: rgba(211, 17, 69, 0.95);

  padding: 10px 12px;
  border-radius: 14px;
  cursor: pointer;

  display: inline-flex;
  align-items: center;
  gap: 8px;

  font-weight: 780;
  letter-spacing: -0.2px;

  transition: transform 0.12s ease, background 0.12s ease;

  &:hover {
    transform: translateY(-1px);
    background: rgba(211, 17, 69, 0.12);
  }
`;

const Composer = styled.form`
  flex-shrink: 0;
  padding: 0 24px 22px;
  background: #f5f6f8;
  border-top: 0;

  display: flex;
  gap: 10px;
  align-items: center;
`;

const Input = styled.input<{ disabled?: boolean }>`
  flex: 1;
  height: 58px;
  border-radius: 16px;
  border: 1px solid ${BORDER};
  background: #ffffff;
  padding: 0 18px;
  font-size: 14px;
  letter-spacing: -0.2px;
  color: ${TEXT};
  outline: none;

  &:focus {
    background: rgba(255, 255, 255, 0.98);
    border-color: rgba(211, 17, 69, 0.35);
    box-shadow: 0 0 0 4px rgba(211, 17, 69, 0.10);
  }

  &::placeholder {
    color: rgba(107, 114, 128, 0.85);
  }

  ${(p) =>
    p.disabled
      ? css`
          opacity: 0.70;
          cursor: not-allowed;
        `
      : ""}
`;

const SendButton = styled.button<{ disabled?: boolean }>`
  width: 50px;
  height: 50px;
  border-radius: 50%;
  border: 1px solid rgba(211, 17, 69, 0.18);
  background: ${ACCENT};
  color: white;
  cursor: pointer;

  display: grid;
  place-items: center;

  transition: transform 0.12s ease, background 0.12s ease, opacity 0.12s ease;

  &:hover {
    transform: translateY(-1px);
    background: rgba(211, 17, 69, 0.92);
  }

  ${(p) =>
    p.disabled
      ? css`
          opacity: 0.4;
          cursor: not-allowed;
          &:hover {
            transform: none;
            background: ${ACCENT};
          }
        `
      : ""}
`;

const floatIn = keyframes`
  from { transform: translateY(8px); opacity: 0; }
  to { transform: translateY(0px); opacity: 1; }
`;

const ScrollFab = styled.button`
  position: absolute;
  right: 16px;
  bottom: 78px;

  width: 44px;
  height: 44px;
  border-radius: 16px;

  border: 1px solid rgba(17, 17, 17, 0.12);
  background: rgba(255, 255, 255, 0.86);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);

  display: grid;
  place-items: center;
  cursor: pointer;

  box-shadow: 0 14px 36px rgba(0, 0, 0, 0.14);

  animation: ${floatIn} 0.18s ease both;
  transition: transform 0.12s ease, background 0.12s ease;

  &:hover {
    transform: translateY(-1px);
    background: rgba(255, 255, 255, 0.98);
  }

  svg {
    color: rgba(17, 17, 17, 0.72);
  }
`;

/** -----------------------------
 * Memoized Message Item
 * ------------------------------*/
const MessageItem = React.memo(function MessageItem({
  message,
  onChipClick,
  onDownload,
}: {
  message: ChatMessage;
  onChipClick: (s: string) => void;
  onDownload: (payload: NonNullable<MessageMeta["download"]>) => void;
}) {
  const isAssistant = message.role === "assistant";

  return (
    <Row $role={message.role}>
      <Bubble
        $role={message.role}
        initial={{ opacity: 0, y: 8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.18 }}
      >
        {message.text}
      </Bubble>

      {isAssistant && message.meta && (
        <MetaBlock>
          {message.meta.kpis && message.meta.kpis.length > 0 && (
            <KPIGrid>
              {message.meta.kpis.map((k) => (
                <KPICard key={`${k.label}-${k.value}`} $tone={k.tone}>
                  <div className="label">{k.label}</div>
                  <div className="value">{k.value}</div>
                  {k.sub && <div className="sub">{k.sub}</div>}
                </KPICard>
              ))}
            </KPIGrid>
          )}

          {message.meta.table && (
            <TableWrap>
              <table>
                <thead>
                  <tr>
                    {message.meta.table.headers.map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {message.meta.table.rows.map((row, idx) => (
                    <tr key={idx}>
                      {row.map((cell, cidx) => (
                        <td key={cidx}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          )}

          {message.meta.download && (
            <DownloadButton type="button" onClick={() => onDownload(message.meta!.download!)}>
              <Download size={16} />
              {message.meta.download.filename}
            </DownloadButton>
          )}
        </MetaBlock>
      )}

      {isAssistant && message.suggestions && message.suggestions.length > 0 && (
        <SuggestionArea>
          {message.suggestions.map((s) => (
            <Chip key={s} type="button" onClick={() => onChipClick(s)}>
              <MessageSquare size={14} />
              {s}
              <ChevronRight size={14} style={{ opacity: 0.45 }} />
            </Chip>
          ))}
        </SuggestionArea>
      )}
    </Row>
  );
});

/** -----------------------------
 * Main Component
 * ------------------------------*/
export default function AIAgentSystem() {

  const pathname = usePathname() || "";
  const isMasterDashboard = pathname.includes("/master-dashboard");

  const agentKey: AgentKey = isMasterDashboard ? "/master-dashboard" : "default";
  const ctx = useMemo(() => AGENT_DATA[agentKey], [agentKey]);

  const idSeq = useRef(0);
  const nextId = useCallback(() => `m_${Date.now()}_${++idSeq.current}`, []);
  const createInitialMessage = useCallback(
    (): ChatMessage => ({
      id: nextId(),
      role: "assistant",
      text: ctx.guide,
      suggestions: ctx.suggestions,
    }),
    [ctx.guide, ctx.suggestions, nextId]
  );

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: `m_initial_${agentKey}`,
      role: "assistant",
      text: ctx.guide,
      suggestions: ctx.suggestions,
    },
  ]);
  const [input, setInput] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    const id = "pretendard-css";
    if (document.getElementById(id)) return;

    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href =
      "https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css";
    document.head.appendChild(link);
  }, [isOpen]);

  const [isAtBottom, setIsAtBottom] = useState(true);

  const scrollEndRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const messagesRef = useRef<ChatMessage[]>([]);
  const agentKeyRef = useRef(agentKey);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Reset when page context changes
  useEffect(() => {
    if (agentKeyRef.current === agentKey) return;
    agentKeyRef.current = agentKey;

    const first = createInitialMessage();
    const timeoutId = window.setTimeout(() => {
      setMessages([first]);
      messagesRef.current = [first];
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [agentKey, createInitialMessage]);

  // Auto-scroll (only if user is already near bottom)
  useEffect(() => {
    if (!isOpen) return;
    if (!isAtBottom) return;
    scrollEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isOpen, isAtBottom]);

  const onScrollList = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    const threshold = 120;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
    setIsAtBottom(atBottom);
  }, []);

  const scrollToBottom = useCallback(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, []);

  // Lock body scroll when open
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  // Focus input when open
  useEffect(() => {
    if (!isOpen) return;
    const raf = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(raf);
  }, [isOpen]);

  // ESC to close
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  const runDownload = useCallback((payload: NonNullable<MessageMeta["download"]>) => {
    downloadTextFile(payload.filename, payload.content, payload.mime);
  }, []);

  /** -----------------------------
   * Actions
   * ------------------------------*/
  const resetChat = useCallback(() => {
    const first: ChatMessage = {
      id: nextId(),
      role: "assistant",
      text: ctx.guide,
      suggestions: ctx.suggestions,
    };
    setMessages([first]);
    messagesRef.current = [first];
  }, [ctx.guide, ctx.suggestions, nextId]);

  const handleSend = useCallback(
    (raw: string) => {
      const text = raw.trim();
      if (!text) return;

      const userMsg: ChatMessage = { id: nextId(), role: "user", text };
      const historySnapshot = [...messagesRef.current, userMsg];
      const reply = buildReply(text, agentKey, historySnapshot);
      const assistantMsg: ChatMessage = { id: nextId(), ...reply.message };

      reply.sideEffect?.();
      setMessages(historySnapshot);
      messagesRef.current = historySnapshot;
      setInput("");
      window.setTimeout(() => {
        setMessages((prev) => [...prev, assistantMsg]);
        messagesRef.current = [...historySnapshot, assistantMsg];
      }, 120);
    },
    [agentKey, nextId]
  );

  const onChipClick = useCallback((s: string) => handleSend(s), [handleSend]);

  const canSend = input.trim().length > 0;
  const tone: 'good' | 'warn' | 'bad' = 'good';

  const advisorTitle = isMasterDashboard ? ctx.name : "AI Advisor 실시간 가이드 파트너";
  const advisorDescription = isMasterDashboard ? ctx.description : "실시간 공정 모니터링 중";

  const quickPrompts = useMemo(
    () =>
      isMasterDashboard
        ? ["전체 KPI 위험 요약", "라인별 병목 원인 분석", "오늘 생산 목표 점검"]
        : ["현재 화면 주요 지표 요약", "이상 요인 상세 원인 분석", "우회 프로세스 가상 테스트"],
    [isMasterDashboard]
  );

  const historyItems = useMemo(
    () => [
      {
        title: "현재 대시보드 화면 실시간 이상 징후 분석 및 가이드",
        time: "오늘 오전 10:10",
        prompt: "현재 화면 주요 지표를 요약하고 이상 징후가 있으면 조치 방안을 알려줘.",
      },
      {
        title: "공정 설비 종합 가동률 및 유지보수 지연 요인 분석",
        time: "어제 오후 03:45",
        prompt: "공정 설비 종합 가동률과 유지보수 지연 요인을 분석해줘.",
      },
      {
        title: "공정 B라인 품질 데이터 연동 결함 원인 파악",
        time: "어제 오전 10:30",
        prompt: "공정 B라인 품질 데이터 기준으로 결함 원인을 파악해줘.",
      },
      {
        title: "출하 대기 물량 적재 지연 위험 조치 건",
        time: "10월 24일 14:15",
        prompt: "출하 대기 물량 적재 지연 위험과 우선 조치 항목을 정리해줘.",
      },
    ],
    []
  );

  const fillPrompt = useCallback((prompt: string) => {
    setInput(prompt);
    if (typeof window === "undefined") return;
    window.requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const HistoryUI = (
    <HistoryPane className="advisor-history">
      <HistoryHeader>
        <HistoryTitleRow>
          <HistoryTitle>
            <MessageSquare size={20} />
            대화 기록
            <HistoryCount>{historyItems.length}</HistoryCount>
          </HistoryTitle>
          <ChevronRight size={18} color="#98A2B3" />
        </HistoryTitleRow>
        <HistorySubtitle>활성화된 대시보드 화면별 실시간 진단 이력</HistorySubtitle>
        <HistorySearch>
          <Search size={16} />
          <span>과거 대화방 검색</span>
        </HistorySearch>
      </HistoryHeader>

      <HistoryList>
        {historyItems.map((item, index) => (
          <HistoryItem
            key={item.title}
            type="button"
            $active={index === 0}
            onClick={() => fillPrompt(item.prompt)}
          >
            <HistoryItemTitle>{item.title}</HistoryItemTitle>
            <HistoryItemTime $active={index === 0}>{item.time}</HistoryItemTime>
          </HistoryItem>
        ))}
      </HistoryList>
    </HistoryPane>
  );

  const ChatUI = (
    <AdvisorPanelLayout>
      {HistoryUI}
      <ChatContainer>
      <Header>
        <HeaderLeft>
          <Avatar>{ctx.role === "manager" ? <BarChart3 size={22} /> : <Bot size={22} />}</Avatar>
          <HeaderText>
            <div className="title">
              {advisorTitle} <Sparkles size={14} color="#FFD700" fill="#FFD700" />
            </div>
            <div className="desc">
              <Dot $tone={tone} />
              {advisorDescription}
            </div>
          </HeaderText>
        </HeaderLeft>

        <HeaderRight>
          <IconButton onClick={resetChat} aria-label="Reset chat" title="대화 초기화">
            <RotateCcw size={16} />
          </IconButton>

          <IconButton
            onClick={() => setIsOpen(false)}
            aria-label="Close"
            title="닫기"
          >
            <X size={18} />
          </IconButton>
        </HeaderRight>
      </Header>

      <MessageList ref={listRef} onScroll={onScrollList}>

        {messages.map((m) => (
          <MessageItem
            key={m.id}
            message={m}
            onChipClick={onChipClick}
            onDownload={runDownload}
          />
        ))}
        <div ref={scrollEndRef} />
      </MessageList>

      {!isAtBottom && (
        <ScrollFab type="button" onClick={scrollToBottom} aria-label="Scroll to bottom">
          <ArrowDown size={18} />
        </ScrollFab>
      )}

      <QuickPromptBar>
        {quickPrompts.map((prompt) => (
          <QuickPromptButton
            key={prompt}
            type="button"
            onClick={() => handleSend(prompt)}
          >
            {prompt}
          </QuickPromptButton>
        ))}
      </QuickPromptBar>

      <Composer
        onSubmit={(e) => {
          e.preventDefault();
          if (canSend) handleSend(input);
        }}
      >
        <Input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="현재 화면에서 분석이 필요한 지표나 작업을 물어보세요"
        />
        <SendButton type="submit" disabled={!canSend} aria-disabled={!canSend}>
          <Send size={18} />
        </SendButton>
      </Composer>
      </ChatContainer>
    </AdvisorPanelLayout>
  );

  return (
    <LazyMotion features={domAnimation}>
      {!isMasterDashboard && (
        <NavbarTrigger
          type="button"
          $active={isOpen}
          aria-expanded={isOpen}
          onClick={() => setIsOpen((prev) => !prev)}
          whileTap={{ scale: 0.98 }}
        >
          <Bot size={18} />
          <span>AI Advisor</span>
        </NavbarTrigger>
      )}

      <Portal>
        <AnimatePresence>
          {isOpen && (
            <ModalOverlay
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
            >
              <ModalPanel
                role="dialog"
                aria-modal="false"
                aria-label="AI Advisor conversation panel"
                onClick={(e) => e.stopPropagation()}
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", stiffness: 320, damping: 34 }}
              >
                {ChatUI}
              </ModalPanel>
            </ModalOverlay>
          )}
        </AnimatePresence>
      </Portal>

      <style jsx global>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </LazyMotion>
  );
}
