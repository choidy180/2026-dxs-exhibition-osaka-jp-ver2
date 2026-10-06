/** Full sentences containing dynamic values; placeholders preserve source data. */
const source = `
계획기간 {0} ~ {1} · Excel 생산계획표를 업로드하여 리비전을 관리합니다.|計画期間 {0}～{1}・Excel生産計画を取り込み、リビジョンを管理します。|Plan period {0} – {1} · Upload an Excel production plan to manage revisions.
품목 {0}개 · 계획일 {1}일|{0}品目・計画日数 {1}日|{0} items · {1} planned days
총 {0}건|合計 {0}件|Total: {0} items
{0} 업로드 · {1}건|{0} アップロード・{1}件|Uploaded {0} · {1} items
Rev {0} 을 확정 처리했습니다.|Rev {0} を確定しました。|Revision {0} confirmed.
Rev {0} 을 리확정 처리했습니다.|Rev {0} を再確定しました。|Revision {0} reconfirmed.
Rev {0} 확정을 취소했습니다.|Rev {0} の確定を取り消しました。|Confirmation canceled for revision {0}.
{0} 업로드 완료 · 품목 {1}개 / 계획일 {2}일 · Rev {3} 생성{4}|{0} 取込完了・{1}品目／{2}計画日・Rev {3} を作成{4}|Uploaded {0} · {1} items / {2} planned days · Revision {3} created{4}
중복된 일자 {0} 열을 건너뛰었습니다.|重複した日付 {0} の列をスキップしました。|Skipped duplicate date column {0}.
품번이 없는 {0}개 행을 건너뛰었습니다.|品番のない{0}行をスキップしました。|Skipped {0} rows with no part number.
엑셀 파일({0})만 업로드할 수 있습니다.|Excelファイル（{0}）のみアップロードできます。|Only Excel files ({0}) can be uploaded.
파일 용량이 너무 큽니다. {0}MB 이하 파일을 사용해주세요.|ファイルが大きすぎます。{0}MB以下のファイルを使用してください。|The file is too large. Use a file no larger than {0} MB.
발주 {0}건의 전송 시뮬레이션을 완료했습니다.|発注{0}件の送信シミュレーションが完了しました。|Completed the local transmission simulation for {0} orders.
질문은 {0}자 이내로 입력해 주세요.|質問は{0}文字以内で入力してください。|Enter a question of no more than {0} characters.
{0} 공정 준비 중|{0}工程 準備中|{0} process in preparation
`;

export const templateCatalog = source.trim().split('\n').map(line => {
  const [ko, ja, en] = line.split('|');
  const indexes: number[] = [];
  const segments = ko.split(/(\{\d+\})/);
  const pattern = segments.map(segment => {
    const placeholder = segment.match(/^\{(\d+)\}$/);
    if (placeholder) { indexes.push(Number(placeholder[1])); return '(.*?)'; }
    return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }).join('');
  return { pattern: new RegExp(`^${pattern}$`), indexes, ja, en };
});
