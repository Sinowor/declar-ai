interface LicenseModalProps {
  open: boolean
  onClose: () => void
}

export default function LicenseModal({ open, onClose }: LicenseModalProps) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-panel p-8 w-[520px] max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold mb-4">许可与隐私声明</h2>
        <div className="overflow-y-auto flex-1 text-sm text-muted space-y-4 leading-relaxed pr-2">
          <div>
            <h3 className="font-semibold text-ink mb-2">专有软件许可</h3>
            <p>DeclarAI 为 Sinowor 的专有软件，受中华人民共和国著作权法及国际著作权条约保护。</p>
          </div>
          <div>
            <h3 className="font-semibold text-ink mb-2">授权范围</h3>
            <p>本软件仅供 Sinowor 内部授权用户使用。未经 Sinowor 明确的书面授权，任何个人或组织不得复制、修改、分发、传播本软件的全部或部分内容，不得对本软件进行反向工程、反编译或反汇编，不得将本软件用于任何商业目的或向第三方提供。</p>
          </div>
          <div>
            <h3 className="font-semibold text-ink mb-2">所有权</h3>
            <p>本软件的所有权、知识产权和商业机密均归 Sinowor 所有。</p>
          </div>
          <div>
            <h3 className="font-semibold text-ink mb-2">保密义务</h3>
            <p>用户须对本软件及其相关文档承担保密义务，不得向任何第三方披露。</p>
          </div>
          <div>
            <h3 className="font-semibold text-ink mb-2">免责声明</h3>
            <p>本软件按「现状」提供，不提供任何明示或暗示的保证。Sinowor 不对因使用本软件而产生的任何直接或间接损失承担责任。</p>
          </div>
          <div>
            <h3 className="font-semibold text-ink mb-2">隐私声明</h3>
            <ul className="list-disc pl-4 space-y-1">
              <li><strong>本地优先：</strong>所有申报数据存储在用户本地计算机，不会自动上传至任何服务器。</li>
              <li><strong>API 数据传输：</strong>仅在用户主动触发 AI 提取/审核功能时，将单证文本内容发送至 DeepSeek API 处理，采用加密传输（HTTPS）。</li>
              <li><strong>数据控制：</strong>用户可随时删除本地数据库文件来清除所有数据。</li>
              <li><strong>无遥测：</strong>本软件不包含任何遥测、数据收集或用户行为跟踪功能。</li>
              <li><strong>API 密钥：</strong>DeepSeek API Key 存储在本地 .env 文件中，不会上传或分享。</li>
            </ul>
          </div>
        </div>
        <button
          onClick={onClose}
          className="mt-6 h-9 px-6 rounded-sm bg-primary-500 text-white border-none text-sm font-semibold cursor-pointer hover:bg-primary-600 transition-all self-center"
        >
          关闭
        </button>
      </div>
    </div>
  )
}
