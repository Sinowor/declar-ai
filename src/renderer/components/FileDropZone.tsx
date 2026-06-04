import { useState, useCallback, useRef } from 'react'
import { IconFile } from './Icons'

interface ImportedFile {
  id?: string
  file_name: string
  extracted_text?: string
  error?: string
}

interface FileDropZoneProps {
  declarationId: string
  onFilesImported: (files: ImportedFile[]) => void
  files: ImportedFile[]
  onRemoveFile: (index: number, fileId?: string) => void
  isExtracting: boolean
}

export default function FileDropZone({
  declarationId,
  onFilesImported,
  files,
  onRemoveFile,
  isExtracting,
}: FileDropZoneProps) {
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)

      const droppedFiles = Array.from(e.dataTransfer.files)
      console.log('[FileDropZone] drop event, files:', droppedFiles.length, droppedFiles.map(f => f.name))
      if (!droppedFiles.length) return

      const paths: string[] = []
      for (const f of droppedFiles) {
        try {
          const p = window.api.getFilePath(f)
          if (p) paths.push(p)
        } catch (err: any) {
          console.error('[FileDropZone] getFilePath failed:', err?.message || err)
        }
      }
      if (paths.length) {
        try {
          const result = await window.api.importFiles(declarationId, paths)
          onFilesImported(result)
        } catch (err: any) {
          console.error('Import error:', err)
        }
      }
    },
    [onFilesImported, declarationId]
  )

  const handleClick = async () => {
    try {
      const paths = await window.api.openFileDialog()
      if (paths?.length) {
        const result = await window.api.importFiles(declarationId, paths)
        onFilesImported(result)
      }
    } catch (err: any) {
      console.error('File dialog/import error:', err)
      fileInputRef.current?.click()
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-card">
      <div className="p-6">
        {/* Drop zone */}
        <div
          className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${
            dragOver
              ? 'border-primary-500 border-solid bg-primary-50 shadow-[0_0_0_4px_rgba(var(--primary-rgb), 0.06)]'
              : 'border-gray-300 bg-surface hover:border-primary-500 hover:border-solid hover:bg-primary-50 hover:shadow-[0_0_0_4px_rgba(var(--primary-rgb), 0.06)]'
          }`}
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={handleClick}
        >
          <div className="flex justify-center mb-3"><IconFile /></div>
          <div className="font-semibold text-[15px] mb-1.5">
            拖拽单证文件到此处
          </div>
          <div className="text-[13px] text-muted">
            支持箱单、发票、合同、运单、提单等 · PDF / Excel / Word / 图片 · 也支持 ZIP 压缩包（RAR 请先解压）
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            hidden
            accept=".pdf,.xlsx,.xls,.doc,.docx,.txt,.csv,.zip,.rar,.jpg,.png,.jpeg"
            onChange={async (e) => {
              const selectedFiles = Array.from(e.target.files || [])
              const paths: string[] = []
              for (const f of selectedFiles) {
                try {
                  const p = window.api.getFilePath(f)
                  if (p) paths.push(p)
                } catch {}
              }
              if (paths.length) {
                try {
                  const result = await window.api.importFiles(declarationId, paths)
                  onFilesImported(result)
                } catch (err: any) {
                  console.error('Import error:', err)
                }
              }
            }}
          />
        </div>

        {/* File tags */}
        {files.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {files.map((f, i) => (
              <span
                key={i}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] border transition-all ${
                  f.error
                    ? 'bg-red-50 border-red-200 text-red-600'
                    : 'bg-white border-gray-200'
                }`}
              >
                {f.error ? '!' : ''} {f.file_name}
                <button
                  className="text-muted text-base leading-none cursor-pointer hover:text-red-500 ml-0.5"
                  onClick={() => onRemoveFile(i, f.id)}
                >
                  &times;
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
