import type {
  CctvBuildingId,
  CctvCamera,
  CctvCameraGroup,
} from '@/types/cctv-monitoring';

const cameraCollator = new Intl.Collator('ko-KR', { numeric: true, sensitivity: 'base' });

/** 표시용 목록 순서가 아닌 실제 카메라 번호로 사내 IP를 계산한다. */
export const deriveCctvCameraIpAddress = (
  number: string | null | undefined,
): string | null => {
  const label = (number ?? '').normalize('NFKC').trim();
  const match = label.match(/^(\D*?)(\d+)\s*(?:번|호)?$/u);
  if (!match) return null;

  const cameraNumber = Number(match[2]);
  const prefix = match[1].replace(/[\s_:.-]/gu, '');
  const isPlateReader = /^(?:차번인식|차량번호인식|번호판인식)기?(?:카메라)?$/u.test(prefix);
  // 차번인식기 1~9는 171~179로 만들고, 이미 171~179인 번호는 그대로 사용한다.
  const lastOctet = isPlateReader && cameraNumber >= 1 && cameraNumber <= 9
    ? Number(`17${cameraNumber}`)
    : cameraNumber;

  if (!Number.isInteger(lastOctet) || lastOctet < 1 || lastOctet > 254) return null;
  if (isPlateReader && (lastOctet < 171 || lastOctet > 179)) return null;

  return `192.168.200.${lastOctet}`;
};

const getBuildingGroup = (buildingId: CctvBuildingId): CctvCameraGroup => ({
  id: `building:${buildingId}`,
  label: `${buildingId}동`,
  kind: 'building',
});

const getUnclassifiedGroup = (): CctvCameraGroup => ({
  id: 'unclassified',
  label: '미분류',
  kind: 'unclassified',
});

/**
 * API의 number에 명시된 동 또는 용도만 분류한다.
 * 공통 name(예: Entrance), 스트림 ID 또는 목록 순서로 동을 추측하지 않는다.
 */
export const classifyCctvCamera = (
  number: string | null | undefined,
): { buildingId: CctvBuildingId | null; group: CctvCameraGroup } => {
  const label = (number ?? '').normalize('NFKC').trim().replace(/\s+/gu, ' ');
  const buildingMatch = label.match(/^([A-Z])\s*동(?=$|[\s\d:._-])/iu);

  if (buildingMatch) {
    const buildingId = buildingMatch[1].toUpperCase() as CctvBuildingId;
    return { buildingId, group: getBuildingGroup(buildingId) };
  }

  // '차번인식 171', '외곽 101'처럼 번호 앞에 명시된 용도를 보존한다.
  const purposeMatch = label.match(/^(.+?)\s*[-_:]?\s*\d+(?:[-_.]\d+)*$/u);
  let purpose = purposeMatch?.[1]?.trim() ?? '';
  const compactPurpose = (purpose || label).replace(/\s/gu, '');

  if (/^(?:차번인식|차량번호인식|번호판인식)$/u.test(compactPurpose)) {
    purpose = '차번인식';
  }

  // 누락된 번호의 표시용 기본값이나 의미 없는 장치 코드에는 용도를 만들지 않는다.
  if (
    purpose
    && /[가-힣A-Za-z]/u.test(purpose)
    && !/^(?:카메라|camera|cam|cctv|미분류|unknown|[A-Z])$/iu.test(purpose)
  ) {
    return {
      buildingId: null,
      group: {
        id: `purpose:${purpose.toLocaleLowerCase('ko-KR')}`,
        label: purpose,
        kind: 'purpose',
      },
    };
  }

  return { buildingId: null, group: getUnclassifiedGroup() };
};

/** 기존 목업의 명시적인 buildingId도 같은 그룹 모델로 변환한다. */
export const getCctvCameraGroup = (camera: CctvCamera): CctvCameraGroup => {
  if (camera.group) return camera.group;
  if (camera.buildingId) return getBuildingGroup(camera.buildingId);
  return classifyCctvCamera(camera.code).group;
};

/** 동은 알파벳 순, 용도는 이름 순, 미분류는 마지막에 표시한다. */
export const compareCctvGroups = (a: CctvCameraGroup, b: CctvCameraGroup): number => {
  const kindOrder = { building: 0, purpose: 1, unclassified: 2 };
  return kindOrder[a.kind] - kindOrder[b.kind]
    || cameraCollator.compare(a.label, b.label)
    || cameraCollator.compare(a.id, b.id);
};

export const groupCctvCameras = (
  cameras: readonly CctvCamera[],
): Array<CctvCameraGroup & { cameras: CctvCamera[] }> => {
  const groups = new Map<string, CctvCameraGroup & { cameras: CctvCamera[] }>();

  for (const camera of cameras) {
    const group = getCctvCameraGroup(camera);
    const existing = groups.get(group.id);
    if (existing) {
      existing.cameras.push(camera);
    } else {
      groups.set(group.id, { ...group, cameras: [camera] });
    }
  }

  return Array.from(groups.values())
    .sort(compareCctvGroups)
    .map(group => ({
      ...group,
      cameras: group.cameras.sort((a, b) =>
        cameraCollator.compare(a.code, b.code)
        || cameraCollator.compare(a.name, b.name)
        || cameraCollator.compare(a.id, b.id)),
    }));
};
