import React, { useState, useEffect } from 'react'
import ReportList from './components/ReportList.jsx'
import ReportEditor from './components/ReportEditor.jsx'
import TemplateSelector from './components/TemplateSelector.jsx'

function App() {
  const [currentView, setCurrentView] = useState('list') // 'list', 'template', 'editor'
  const [reports, setReports] = useState([])
  const [editingReport, setEditingReport] = useState(null)
  const [selectedTemplate, setSelectedTemplate] = useState(null)

  // LocalStorageから報告書を読み込み
  useEffect(() => {
    const saved = localStorage.getItem('reports')
    if (saved) {
      setReports(JSON.parse(saved))
    }
  }, [])

  // 報告書を保存
  const saveReports = (updatedReports) => {
    setReports(updatedReports)
    localStorage.setItem('reports', JSON.stringify(updatedReports))
  }

  // 新規作成 - テンプレート選択へ
  const handleNewReport = () => {
    setCurrentView('template')
  }

  // テンプレート選択後 - エディタへ
  const handleTemplateSelect = (photoCount) => {
    setSelectedTemplate(photoCount)
    setEditingReport({
      id: Date.now().toString(),
      date: new Date().toISOString().split('T')[0],
      author: '',
      title: '',
      body: '',
      photoCount: photoCount,
      photos: Array(photoCount).fill(null),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    setCurrentView('editor')
  }

  // 既存の報告書を編集
  const handleEditReport = (report) => {
    setEditingReport({ ...report })
    setSelectedTemplate(report.photoCount)
    setCurrentView('editor')
  }

  // 報告書を保存
  const handleSaveReport = (report) => {
    const updated = { ...report, updatedAt: new Date().toISOString() }
    const existingIndex = reports.findIndex(r => r.id === updated.id)
    let updatedReports
    if (existingIndex >= 0) {
      updatedReports = [...reports]
      updatedReports[existingIndex] = updated
    } else {
      updatedReports = [...reports, updated]
    }
    saveReports(updatedReports)
    setCurrentView('list')
    setEditingReport(null)
  }

  // 報告書を削除
  const handleDeleteReport = (id) => {
    const updatedReports = reports.filter(r => r.id !== id)
    saveReports(updatedReports)
  }

  // リストに戻る
  const handleBack = () => {
    setCurrentView('list')
    setEditingReport(null)
    setSelectedTemplate(null)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-blue-600 text-white shadow-md">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1
            className="text-xl font-bold cursor-pointer"
            onClick={handleBack}
          >
            📋 報告書作成ツール
          </h1>
          {currentView === 'list' && (
            <button onClick={handleNewReport} className="bg-white text-blue-600 px-4 py-2 rounded-lg font-medium hover:bg-blue-50 transition-colors">
              ＋ 新規作成
            </button>
          )}
          {currentView !== 'list' && (
            <button onClick={handleBack} className="bg-white/20 text-white px-4 py-2 rounded-lg font-medium hover:bg-white/30 transition-colors">
              ← 戻る
            </button>
          )}
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {currentView === 'list' && (
          <ReportList
            reports={reports}
            onEdit={handleEditReport}
            onDelete={handleDeleteReport}
            onNew={handleNewReport}
          />
        )}
        {currentView === 'template' && (
          <TemplateSelector onSelect={handleTemplateSelect} />
        )}
        {currentView === 'editor' && editingReport && (
          <ReportEditor
            report={editingReport}
            onSave={handleSaveReport}
            onBack={handleBack}
          />
        )}
      </main>
    </div>
  )
}

export default App
