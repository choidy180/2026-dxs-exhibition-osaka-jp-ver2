import Papa from 'papaparse';
import { Zip, ZipDeflate, strToU8 } from 'fflate';

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const MAX_ROWS = 1_048_576;
const MAX_COLUMNS = 16_384;
const MAX_CELL_LENGTH = 32_767;
const XML_CHUNK_LENGTH = 256 * 1024;
const CSV_CHUNK_LENGTH = 1024 * 1024;
const XML_HEADER = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const SPREADSHEET_NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const DOCUMENT_REL_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const PACKAGE_REL_NS = 'http://schemas.openxmlformats.org/package/2006/relationships';

export class BomCsvExportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BomCsvExportError';
  }
}

function columnName(index: number): string {
  let name = '';
  for (let value = index + 1; value > 0; value = Math.floor((value - 1) / 26)) {
    name = String.fromCharCode(65 + ((value - 1) % 26)) + name;
  }
  return name;
}

function escapeCell(value: string, rowNumber: number): string {
  if (value.length > MAX_CELL_LENGTH) {
    throw new BomCsvExportError(
      `${rowNumber.toLocaleString('ko-KR')}행에 엑셀 셀의 최대 글자 수(32,767자)를 넘는 값이 있습니다.`,
    );
  }

  // OOXML이 _xNNNN_을 해석하므로 원문의 밑줄부터 보호한 뒤 제어 문자를
  // 변환한다. 문자열 셀을 사용해 식별자와 수식처럼 보이는 값도 보존한다.
  return value
    .replace(/_(?=x[\da-f]{4}_)/gi, '_x005F_')
    .replace(/[\u0000-\u0008\u000b\u000c\u000d\u000e-\u001f\ufffe\uffff]/g, (match) =>
      `_x${match.charCodeAt(0).toString(16).padStart(4, '0').toUpperCase()}_`,
    )
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** 수백만 개의 셀 객체나 전체 시트 XML을 메모리에 쌓지 않고 XLSX를 생성한다. */
export function convertBomCsvToXlsx(
  csv: string,
  onProgress?: (rows: number) => void,
): { blob: Blob; rowCount: number } {
  const source = csv.charCodeAt(0) === 0xfeff ? csv.slice(1) : csv;
  if (/^\s*$/.test(source)) {
    return { blob: new Blob([], { type: XLSX_MIME }), rowCount: 0 };
  }

  const compressedChunks: BlobPart[] = [];
  let archiveComplete = false;
  const archive = new Zip((error, data, final) => {
    if (error) throw error;
    // 압축된 작은 조각만 보관하고 압축 전 시트 전체는 메모리에 쌓지 않는다.
    compressedChunks.push(new Uint8Array(data).buffer);
    archiveComplete = final;
  });
  const addXml = (name: string, xml: string) => {
    const entry = new ZipDeflate(name, { level: 1 });
    archive.add(entry);
    entry.push(strToU8(XML_HEADER + xml), true);
  };

  addXml('[Content_Types].xml',
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
    '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
    '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
    '</Types>',
  );
  addXml('_rels/.rels',
    `<Relationships xmlns="${PACKAGE_REL_NS}">` +
    `<Relationship Id="rId1" Type="${DOCUMENT_REL_NS}/officeDocument" Target="xl/workbook.xml"/>` +
    '</Relationships>',
  );
  addXml('xl/workbook.xml',
    `<workbook xmlns="${SPREADSHEET_NS}" xmlns:r="${DOCUMENT_REL_NS}">` +
    '<bookViews><workbookView/></bookViews>' +
    '<sheets><sheet name="MES BOM" sheetId="1" r:id="rId1"/></sheets></workbook>',
  );
  addXml('xl/_rels/workbook.xml.rels',
    `<Relationships xmlns="${PACKAGE_REL_NS}">` +
    `<Relationship Id="rId1" Type="${DOCUMENT_REL_NS}/worksheet" Target="worksheets/sheet1.xml"/>` +
    `<Relationship Id="rId2" Type="${DOCUMENT_REL_NS}/styles" Target="styles.xml"/>` +
    '</Relationships>',
  );
  addXml('xl/styles.xml',
    `<styleSheet xmlns="${SPREADSHEET_NS}">` +
    '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>' +
    '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>' +
    '<borders count="1"><border/></borders>' +
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
    '<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
    '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs>' +
    '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>',
  );

  const worksheet = new ZipDeflate('xl/worksheets/sheet1.xml', { level: 1 });
  archive.add(worksheet);
  let xmlParts: string[] = [];
  let xmlLength = 0;
  let worksheetBytes = 0;
  const flushXml = (final = false) => {
    const encoded = strToU8(xmlParts.join(''));
    worksheetBytes += encoded.length;
    // fflate의 일반 ZIP 항목에서 4 GiB 크기가 넘쳐 파일이 손상되는 것을 막는다.
    if (worksheetBytes > 0xffffffff) {
      throw new BomCsvExportError('엑셀 파일의 최대 변환 용량을 초과했습니다. 데이터 범위를 줄여 주세요.');
    }
    worksheet.push(encoded, final);
    xmlParts = [];
    xmlLength = 0;
  };
  const appendXml = (xml: string) => {
    xmlParts.push(xml);
    xmlLength += xml.length;
    if (xmlLength >= XML_CHUNK_LENGTH) flushXml();
  };

  let totalRows = 0;
  let columns: string[] = [];
  const endsWithNewline = /[\r\n]$/.test(source);
  try {
    // StringStreamer도 문자열 청크를 지원하지만 설치된 타입은 파일 설정에만
    // 해당 옵션을 제공하므로 청크 관련 두 옵션의 타입을 직접 명시한다.
    const parseConfig: Papa.ParseConfig<string[]> & {
      chunkSize: number;
      chunk: (results: Papa.ParseResult<string[]>) => void;
    } = {
      delimiter: ',',
      header: false,
      dynamicTyping: false,
      skipEmptyLines: false,
      chunkSize: CSV_CHUNK_LENGTH,
      chunk: (results) => {
        if (results.errors.length > 0) {
          throw new BomCsvExportError('CSV 형식이 올바르지 않아 엑셀로 변환하지 못했습니다.');
        }
        for (let index = 0; index < results.data.length; index += 1) {
          const values = results.data[index];
          // 마지막 줄바꿈 뒤에 PapaParse가 추가한 빈 레코드 하나만 제외한다.
          // 원본의 빈 셀과 레코드, 명시적으로 따옴표를 쓴 "" 값은 보존한다.
          if (endsWithNewline && results.meta.cursor === source.length &&
            index === results.data.length - 1 && values.length === 1 && values[0] === '') {
            continue;
          }

          const rowNumber = totalRows + 1;
          if (rowNumber > MAX_ROWS) {
            throw new BomCsvExportError('엑셀의 최대 행 수(헤더 포함 1,048,576행)를 초과했습니다.');
          }
          if (totalRows === 0) {
            if (values.length > MAX_COLUMNS) {
              throw new BomCsvExportError('엑셀의 최대 열 수(16,384열)를 초과했습니다.');
            }
            columns = Array.from({ length: values.length }, (_, column) => columnName(column));
            appendXml(XML_HEADER + `<worksheet xmlns="${SPREADSHEET_NS}">` +
              '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' +
              '<sheetFormatPr defaultRowHeight="15"/>' +
              `<cols><col min="1" max="${columns.length}" width="20" customWidth="1"/></cols><sheetData>`);
          } else if (values.length !== columns.length) {
            throw new BomCsvExportError(
              `${rowNumber.toLocaleString('ko-KR')}행의 열 수가 헤더와 달라 엑셀로 변환하지 못했습니다.`,
            );
          }
          appendXml(`<row r="${rowNumber}">`);
          for (let column = 0; column < values.length; column += 1) {
            appendXml(`<c r="${columns[column]}${rowNumber}" t="inlineStr"${totalRows === 0 ? ' s="1"' : ''}>` +
              `<is><t xml:space="preserve">${escapeCell(values[column], rowNumber)}</t></is></c>`);
          }
          appendXml('</row>');
          totalRows += 1;
        }
        onProgress?.(Math.max(0, totalRows - 1));
      },
    };
    Papa.parse<string[]>(source, parseConfig);

    if (totalRows <= 1) {
      archive.terminate();
      return { blob: new Blob([], { type: XLSX_MIME }), rowCount: 0 };
    }
    appendXml(`</sheetData><autoFilter ref="A1:${columns[columns.length - 1]}${totalRows}"/></worksheet>`);
    flushXml(true);
    archive.end();
    if (!archiveComplete) {
      throw new BomCsvExportError('엑셀 파일을 완성하지 못했습니다. 다시 시도해 주세요.');
    }
    return { blob: new Blob(compressedChunks, { type: XLSX_MIME }), rowCount: totalRows - 1 };
  } catch (error) {
    archive.terminate();
    throw error;
  }
}
