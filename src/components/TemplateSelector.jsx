import React from 'react'

const templates = [
  { count: 1, label: '写真1枚', description: '大きめの写真1枚を配置', icon: '🖼️' },
  { count: 2, label: '写真2枚', description: '2枚の写真を横並びで配置', icon: '🖼️🖼️' },
  { count: 3, label: '写真3枚', description: '上1枚＋下2枚のレイアウト', icon: '📸' },
  { count: 4, label: '写真4枚', description: '2×2のグリッドで配置', icon: '📷' },
  { count: 5, label: '写真5枚', description: '上2枚＋下3枚のレイアウト', icon: '📱' },
  { count: 6, label: '写真6枚', description: '2×3のグリッドで配置', icon: '🗂️' },
]

function TemplateSelector({ onSelect }) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-2">テンプレートを選択</h2>
      <p className="text-gray-600 mb-6">報告書に挿入する写真の枚数を選んでください。</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((template) => (
          <button
            key={template.count}
            onClick={() => onSelect(template.count)}
            className="bg-white border-2 border-gray-200 rounded-xl p-6 text-left hover:border-blue-500 hover:shadow-lg transition-all group"
          >
            <div className="text-3xl mb-3">{template.icon}</div>
            <h3 className="text-lg font-bold text-gray-800 group-hover:text-blue-600">
              {template.label}
            </h3>
            <p className="text-sm text-gray-500 mt-1">{template.description}</p>

            {/* プレビュー */}
            <div className="mt-4 border border-gray-200 rounded-lg p-2 bg-gray-50">
              <PhotoLayoutPreview count={template.count} />
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

function PhotoLayoutPreview({ count }) {
  const boxClass = "bg-blue-100 border border-blue-300 rounded flex items-center justify-center text-xs text-blue-500"

  if (count === 1) {
    return <div className={`${boxClass} h-16`}>写真</div>
  }
  if (count === 2) {
    return (
      <div className="grid grid-cols-2 gap-1">
        <div className={`${boxClass} h-12`}>1</div>
        <div className={`${boxClass} h-12`}>2</div>
      </div>
    )
  }
  if (count === 3) {
    return (
      <div className="space-y-1">
        <div className={`${boxClass} h-10`}>1</div>
        <div className="grid grid-cols-2 gap-1">
          <div className={`${boxClass} h-8`}>2</div>
          <div className={`${boxClass} h-8`}>3</div>
        </div>
      </div>
    )
  }
  if (count === 4) {
    return (
      <div className="grid grid-cols-2 gap-1">
        <div className={`${boxClass} h-8`}>1</div>
        <div className={`${boxClass} h-8`}>2</div>
        <div className={`${boxClass} h-8`}>3</div>
        <div className={`${boxClass} h-8`}>4</div>
      </div>
    )
  }
  if (count === 5) {
    return (
      <div className="space-y-1">
        <div className="grid grid-cols-2 gap-1">
          <div className={`${boxClass} h-8`}>1</div>
          <div className={`${boxClass} h-8`}>2</div>
        </div>
        <div className="grid grid-cols-3 gap-1">
          <div className={`${boxClass} h-7`}>3</div>
          <div className={`${boxClass} h-7`}>4</div>
          <div className={`${boxClass} h-7`}>5</div>
        </div>
      </div>
    )
  }
  if (count === 6) {
    return (
      <div className="grid grid-cols-3 gap-1">
        <div className={`${boxClass} h-7`}>1</div>
        <div className={`${boxClass} h-7`}>2</div>
        <div className={`${boxClass} h-7`}>3</div>
        <div className={`${boxClass} h-7`}>4</div>
        <div className={`${boxClass} h-7`}>5</div>
        <div className={`${boxClass} h-7`}>6</div>
      </div>
    )
  }
  return null
}

export default TemplateSelector
