import { useState } from 'react'
import { IconAI, IconSparkle } from './Icons'

interface ReviewIssue {
  id?: string
  field_path: string
  issue_type: string
  question: string
  severity: string
  suggestion: string
}

interface AiReviewPanelProps {
  issues: ReviewIssue[]
  onAnswer: (index: number, answer: string) => void
  isReviewing: boolean
  onStartReview: () => void
  reviewCompleted: boolean
  onConfirmAll?: () => void
}

const severityColors: Record<string, { icon: string; bg: string; color: string }> = {
  high: { icon: '!', bg: 'bg-red-50', color: 'text-red-500' },
  medium: { icon: 'i', bg: 'bg-amber-50', color: 'text-amber-500' },
  low: { icon: '?', bg: 'bg-sky-50', color: 'text-sky-500' },
}

const severityLabels: Record<string, string> = {
  high: '高',
  medium: '中',
  low: '低',
}

export default function AiReviewPanel({
  issues,
  onAnswer,
  isReviewing,
  onStartReview,
  reviewCompleted,
  onConfirmAll,
}: AiReviewPanelProps) {
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [resolved, setResolved] = useState<Set<number>>(new Set())

  const handleConfirm = (index: number) => {
    const answer = answers[index]
    if (!answer?.trim()) return
    onAnswer(index, answer)
    setResolved(new Set([...resolved, index]))
  }

  if (issues.length === 0 && !isReviewing) {
    return (
      <div className="bg-white border border-gray-200 rounded-[20px] shadow-panel overflow-hidden">
        <div className="px-6 py-[18px] bg-gradient-to-br from-primary-50 via-primary-50/30 to-[#F8FAFC] border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <IconAI /><span>AI 智能审核</span>
          </h3>
          <button
            onClick={onStartReview}
            disabled={isReviewing}
            className="h-7 px-3 rounded-full bg-white text-ink border border-gray-200 text-xs font-semibold cursor-pointer hover:bg-surface transition-all disabled:opacity-50"
          >
            {isReviewing ? '审核中...' : reviewCompleted ? '重新审核' : '开始审核'}
          </button>
        </div>
        <div className="px-6 py-12 text-center text-muted text-sm">
          <div className="flex justify-center mb-2">{reviewCompleted ? <span className="text-3xl opacity-20">✓</span> : <IconSparkle />}</div>
          {isReviewing
            ? 'AI 正在审核申报单数据...'
            : reviewCompleted
              ? 'AI 未发现明显问题，数据质量良好'
              : '点击「开始审核」让 AI 检查数据完整性和一致性'}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-[20px] shadow-panel overflow-hidden">
      <div className="px-6 py-[18px] bg-gradient-to-br from-primary-50 via-primary-50/30 to-[#F8FAFC] border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <IconAI /><span>AI 智能审核</span>
        </h3>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-primary-100 text-primary-600">
            {issues.length - resolved.size} 个待处理
          </span>
          {onConfirmAll && issues.length - resolved.size > 0 && (
            <button
              onClick={onConfirmAll}
              className="h-7 px-3 rounded-full text-xs font-semibold cursor-pointer border border-gray-200 bg-white text-muted hover:text-ink transition-all"
            >
              全部确认
            </button>
          )}
          <button
            onClick={onStartReview}
            disabled={isReviewing}
            className="h-7 px-3 rounded-full text-xs font-semibold cursor-pointer border border-gray-200 bg-white text-muted hover:text-ink transition-all disabled:opacity-50"
          >
            {isReviewing ? '审核中...' : '重新审核'}
          </button>
        </div>
      </div>

      <div>
        {issues.map((issue, i) => {
          const sev = severityColors[issue.severity] || severityColors.medium
          const isResolved = resolved.has(i)

          return (
            <div
              key={i}
              className={`px-6 py-4 border-b border-slate-50 last:border-b-0 flex gap-3.5 items-start transition-all ${
                isResolved ? 'opacity-50' : ''
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 mt-0.5 ${sev.bg} ${sev.color}`}
              >
                {isResolved ? <span className="font-bold">&#10003;</span> : <span className="font-bold">{sev.icon}</span>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-[13px] truncate">{issue.field_path}</span>
                  <span
                    className={`inline-flex px-1.5 py-0.5 rounded text-[11px] font-semibold ${sev.bg} ${sev.color}`}
                  >
                    {severityLabels[issue.severity]}
                  </span>
                </div>
                <p className={`text-[13px] ${isResolved ? 'text-muted line-through' : 'text-muted'}`}>
                  {issue.question}
                </p>
                {issue.suggestion && !isResolved && (
                  <p className="text-[12px] text-sky-600 mt-1">→ {issue.suggestion}</p>
                )}
                {isResolved && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 mt-1 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-600">
                    &#10003; 已处理
                  </span>
                )}
                {isResolved && answers[i] && (
                  <p className="text-[13px] text-emerald-600 mt-1 font-medium">
                    用户确认：{answers[i]}
                  </p>
                )}
                {!isResolved && (
                  <div className="flex gap-2 mt-2">
                    <input
                      type="text"
                      value={answers[i] || ''}
                      onChange={(e) =>
                        setAnswers({ ...answers, [i]: e.target.value })
                      }
                      placeholder="输入您的答复..."
                      className="flex-1 h-9 rounded-md border border-gray-200 px-3 text-[13px] outline-none focus:border-primary-500 focus:ring-[3px] focus:ring-primary-500/10 font-sans"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleConfirm(i)
                      }}
                    />
                    <button
                      onClick={() => handleConfirm(i)}
                      className="h-9 px-4 rounded-sm bg-primary-500 text-white border-none text-[13px] font-semibold cursor-pointer hover:bg-primary-600 transition-all whitespace-nowrap"
                    >
                      确认
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
