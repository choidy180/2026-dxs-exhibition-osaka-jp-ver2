import assert from 'node:assert/strict';
import test from 'node:test';
import { createExhibitionMaterials, createExhibitionVehicle, createExhibitionVehicleEntries } from '../../data/exhibition-material';
import { fetchInboundStatus } from '../../utils/material-inbound-status-api';
import { fetchRevisions, fetchRevisionDetail, uploadPlan, updateRevisionStatus, savePlanToDatabase, resetMockStore } from '../../utils/production-plan-api';
import { fetchBomExplosion, fetchOrderPlan, fetchPlanRevisionOptions, transferToMes } from '../../utils/lab-api';
import { createMockApiData } from '../../data/smartFactoryViewer';
import { bomRowsToCsv } from '../../utils/bom-row-export';
import { convertBomCsvToXlsx } from '../../utils/bom-csv-excel';
import { toDateKey } from '../../utils/date';

test('exhibition data, dates, mutations and Excel work without a network', async () => {
  const originalFetch = globalThis.fetch;
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const storage = new Map<string, string>();
  Object.defineProperty(globalThis, 'window', { value: { localStorage: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
  } }, configurable: true });
  globalThis.fetch = async () => { throw new Error('Unexpected network call'); };
  try {
    const today = toDateKey(new Date());
    const materials = createExhibitionMaterials();
    assert.equal(materials.length, 18);
    assert.ok(materials.some(row => row.InspConf === 'Y'));
    assert.ok(materials.some(row => row.InspConf !== 'Y'));
    assert.equal((await fetchInboundStatus({ startDate: today, endDate: today }, new AbortController().signal)).length, 18);
    assert.equal(createExhibitionVehicle().FILEPATH, '/truck-image.png');
    assert.equal(createExhibitionVehicleEntries().length, 5);
    assert.equal(createMockApiData().length, 12);
    resetMockStore();
    const revisions = await fetchRevisions();
    assert.equal(new Set(revisions.map(row => row.id)).size, 6);
    assert.equal(revisions[0].uploadDate, today);
    const dataset = await fetchRevisionDetail(revisions[0].id);
    assert.ok(dataset.rows.length > 10 && dataset.days.length > 15);
    assert.ok(dataset.days.every(day => day.date.slice(0, 7) === today.slice(0, 7)));
    const created = await uploadPlan({ uploadDate: today, revision: 2, parsed: {
      ...dataset, fileName: 'exhibition.xlsx', warnings: [],
    } });
    assert.equal((await fetchRevisions()).length, 7);
    assert.equal((await updateRevisionStatus(created.revision.id, 'confirmed')).status, 'confirmed');
    assert.equal((await savePlanToDatabase(created.revision.id)).ok, true);
    assert.ok(storage.size > 0);
    assert.ok((await fetchPlanRevisionOptions()).some(option => option.id === created.revision.id));
    const bom = await fetchBomExplosion({ applyDate: today, pjtCode: 'ET-09057', productNo: '', orderGb: '' });
    assert.equal(bom.rows.length, 766);
    assert.equal((await fetchBomExplosion({ applyDate: today, pjtCode: 'MISSING', productNo: '', orderGb: '' })).rows.length, 0);
    const converted = convertBomCsvToXlsx(bomRowsToCsv(bom.rows));
    assert.equal(converted.rowCount, 766);
    assert.ok(converted.blob.size > 1000);
    const order = await fetchOrderPlan(created.revision.id, today);
    assert.ok(order.rows.length > 100);
    await transferToMes(created.revision.id, [order.rows[0].itemNo]);
    assert.equal((await fetchOrderPlan(created.revision.id, today)).rows[0].note, '전송 완료');
  } finally {
    globalThis.fetch = originalFetch;
    if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
    else Reflect.deleteProperty(globalThis, 'window');
  }
});
