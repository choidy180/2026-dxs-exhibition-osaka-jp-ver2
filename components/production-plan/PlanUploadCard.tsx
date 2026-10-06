'use client';

import { useCallback, useRef, useState } from 'react';
import { FileSpreadsheet, FolderOpen, Loader2, Upload } from 'lucide-react';
import { ACCEPTED_FILE_EXTENSIONS } from '@/constants/production-plan';
import { Card, CardHead, Dropzone, HiddenFileInput, PrimaryButton } from './styles';

type Props = {
  isUploading: boolean;
  onUpload: (file: File) => Promise<boolean>;
  onInvalidDrop: (message: string) => void;
};

/**
 * 엑셀 파일 업로드 카드.
 * 드래그&드롭과 클릭 선택을 모두 지원하고, 선택된 파일은 '업로드' 를 눌러야 반영된다.
 */
export default function PlanUploadCard({ isUploading, onUpload, onInvalidDrop }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const openFileDialog = useCallback(() => {
    if (isUploading) return;
    inputRef.current?.click();
  }, [isUploading]);

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragging(false);
      if (isUploading) return;

      const files = Array.from(event.dataTransfer?.files ?? []);
      if (!files.length) return;
      if (files.length > 1) {
        onInvalidDrop('한 번에 한 개의 파일만 업로드할 수 있습니다.');
        return;
      }

      setSelectedFile(files[0]);
    },
    [isUploading, onInvalidDrop],
  );

  const handleUpload = useCallback(async () => {
    if (!selectedFile) {
      openFileDialog();
      return;
    }

    const succeeded = await onUpload(selectedFile);
    if (succeeded) {
      setSelectedFile(null);
      if (inputRef.current) inputRef.current.value = '';
    }
  }, [onUpload, openFileDialog, selectedFile]);

  return (
    <Card data-demo="plan-upload">
      <CardHead>
        <div className="title-group">
          <FileSpreadsheet size={20} />
          <h2>파일 업로드</h2>
        </div>
      </CardHead>

      <Dropzone
        $dragging={isDragging}
        $hasFile={Boolean(selectedFile)}
        role="button"
        tabIndex={0}
        aria-label="엑셀 파일 선택 영역"
        onClick={openFileDialog}
        onKeyDown={event => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openFileDialog();
          }
        }}
        onDragOver={event => {
          event.preventDefault();
          if (!isUploading) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <div className="drop-icon">
          {selectedFile ? <FileSpreadsheet size={26} /> : <FolderOpen size={26} />}
        </div>

        {selectedFile ? (
          <>
            <strong>선택된 파일</strong>
            <span className="file-name" title={selectedFile.name}>
              {selectedFile.name}
            </span>
            <span>다시 클릭하면 다른 파일을 선택할 수 있습니다.</span>
          </>
        ) : (
          <>
            <strong>엑셀 파일 드래그 &amp; 드롭</strong>
            <span>
              또는 클릭하여 파일 선택 ({ACCEPTED_FILE_EXTENSIONS.join(', ')})
            </span>
          </>
        )}

        <HiddenFileInput
          ref={inputRef}
          type="file"
          accept={ACCEPTED_FILE_EXTENSIONS.join(',')}
          tabIndex={-1}
          onChange={event => {
            const file = event.target.files?.[0] ?? null;
            setSelectedFile(file);
          }}
        />
      </Dropzone>

      <PrimaryButton type="button" onClick={handleUpload} disabled={isUploading}>
        {isUploading ? (
          <>
            <Loader2 size={16} className="spin" /> 업로드 중...
          </>
        ) : (
          <>
            <Upload size={16} /> 업로드
          </>
        )}
      </PrimaryButton>
    </Card>
  );
}
