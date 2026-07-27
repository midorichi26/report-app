import React from 'react'

function ReportList({ reports, onEdit, onDelete, onNew }) {
  if (reports.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-6xl mb-4">📋</div>
        <h2 className="text-xl font-bold text-gray-700 mb-2">報告書がまだありません</h2>
        <p className="text-gray-500 mb-6">新しい報告書を作成しましょう</p>
        <button onClick={onNew} className="btn-primary text-lg px-6 py-3">
          ＋ 新規作成
        </button>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-4">保存済み報告書</h2>
      <div className="space-y-3">
        {reports.map((report) => (
          <div
            key={report.id}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex items-center justify-between hover:shadow-md transition-shadow"
          >
            <div className="flex-1 min-w-0" onClick={() => onEdit(report)} role="button" tabIndex={0}>
              <h3 className="font-bold text-gray-800 truncate">
                {report.title || '(タイトルなし)'}
              </h3>
              <div className="flex flex-wrap gap-2 mt-1 text-sm text-gray-500">
                <span>📅 {report.date}</span>
                <span>👤 {report.author || '(未記入)'}</span>
                <span>🖼️ 写真{report.photoCount}枚</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                更新: {new Date(report.updatedAt).toLocaleString('ja-JP')}
              </p>
            </div>
            <div className="flex gap-2 ml-4">
              <button
                onClick={() => onEdit(report)}
                className="btn-primary text-sm px-3 py-1"
              >
                編集
              </button>
              <button
                onClick={() => {
                  if (confirm('この報告書を削除しますか？')) {
                    onDelete(report.id)
                  }
                }}
                className="btn-danger text-sm px-3 py-1"
              >
                削除
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default ReportList
