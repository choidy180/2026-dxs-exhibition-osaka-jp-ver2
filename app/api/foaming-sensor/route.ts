import { NextResponse } from 'next/server';
import {
  ALLOWED_PROCESSES,
  DEFAULT_PROCESS,
  SENSOR_SEQS,
} from '@/constants/foamingInspection';
import { normalizeSeries } from '@/lib/foamingSensor';
import type {
  FoamingSensorPayload,
  FoamingSensorRawResponse,
  FoamingSensorSeries,
} from '@/types/foamingSensor';

/**
 * 발포 공정 센서 프록시.
 *
 * 브라우저에서 PHP 엔드포인트를 직접 부르지 않고 서버를 경유하는 이유:
 *  1) 해당 PHP는 CORS 헤더를 주지 않으므로 브라우저 fetch가 차단된다.
 *  2) 대시보드가 HTTPS로 서비스되면 http:// 평문 호출은 mixed content로 차단된다.
 *  3) 사내 IP가 클라이언트 번들에 노출되지 않는다.
 */

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const UPSTREAM_BASE =
  process.env.FOAMING_SENSOR_BASE_URL ??
  'http://192.168.0.237:8080/htdocs/rootsite/dashboard/admin';

const UPSTREAM_TIMEOUT_MS = 8000;

async function fetchSeq(
  processCode: string,
  seq: number,
  selectDate: string
): Promise<FoamingSensorSeries | null> {
  const url =
    `${UPSTREAM_BASE}/${processCode}_002_AI2.php` +
    `?json=gomotec2&seq=${encodeURIComponent(seq)}` +
    `&select_date=${encodeURIComponent(selectDate)}`;

  const res = await fetch(url, {
    cache: 'no-store',
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
  });

  if (!res.ok) {
    throw new Error(`upstream ${res.status}`);
  }

  // PHP가 content-type을 text/html로 주는 경우가 있어 text로 받아 직접 파싱한다.
  const text = await res.text();

  let parsed: FoamingSensorRawResponse;
  try {
    parsed = JSON.parse(text) as FoamingSensorRawResponse;
  } catch {
    throw new Error('upstream 응답이 JSON이 아닙니다');
  }

  if (!Array.isArray(parsed.gomotec)) {
    throw new Error('gomotec 배열이 없습니다');
  }

  return normalizeSeries(seq, parsed.gomotec);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  // URL을 직접 입력할 때 붙기 쉬운 공백은 제거하되 허용 공정만 조회한다.
  const requested = (searchParams.get('process') ?? DEFAULT_PROCESS).trim().toUpperCase();
  // 화이트리스트 검증: 값이 PHP 파일 경로에 들어가므로 경로 조작을 막는다.
  const processCode = ALLOWED_PROCESSES.includes(requested)
    ? requested
    : DEFAULT_PROCESS;

  // 원본 API가 빈 select_date를 "오늘"로 처리하므로 기본값은 빈 문자열이다.
  const selectDate = searchParams.get('date') ?? '';

  const seqParam = searchParams.get('seq');
  const seqs = seqParam
    ? seqParam
        .split(',')
        .map((s) => Number(s.trim()))
        .filter((n) => Number.isInteger(n) && n > 0)
    : [...SENSOR_SEQS];

  const settled = await Promise.allSettled(
    seqs.map((seq) => fetchSeq(processCode, seq, selectDate))
  );

  const series: FoamingSensorSeries[] = [];
  const errors: { seq: number; message: string }[] = [];

  settled.forEach((result, index) => {
    const seq = seqs[index];

    if (result.status === 'fulfilled') {
      if (result.value) series.push(result.value);
      return;
    }

    const reason = result.reason;
    errors.push({
      seq,
      message: reason instanceof Error ? reason.message : String(reason),
    });
  });

  const payload: FoamingSensorPayload = {
    // seq 전부 실패했을 때만 실패로 본다 (일부 실패는 부분 성공으로 처리)
    ok: series.length > 0,
    process: processCode,
    fetchedAt: new Date().toISOString(),
    series,
    errors,
  };

  return NextResponse.json(payload, {
    status: payload.ok || errors.length === 0 ? 200 : 502,
    headers: { 'Cache-Control': 'no-store' },
  });
}
