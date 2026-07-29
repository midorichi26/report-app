import React, { useState, useEffect } from 'react'
import ReportList from './components/ReportList.jsx'
import ReportEditor from './components/ReportEditor.jsx'
import TemplateSelector from './components/TemplateSelector.jsx'

// 季節テーマ設定
function getSeasonTheme() {
  const month = new Date().getMonth() + 1 // 1-12
  if (month >= 3 && month <= 5) {
    // 春 (3-5月)
    return {
      name: '春',
      headerBg: 'bg-pink-400',
      headerHover: 'hover:bg-pink-50',
      headerTextBtn: 'text-pink-500',
      bodyBg: 'bg-pink-50',
      emoji: '🌸',
      decorations: ['🌸', '🌷', '🐝', '🦋'],
    }
  } else if (month >= 6 && month <= 8) {
    // 夏 (6-8月)
    return {
      name: '夏',
      headerBg: 'bg-cyan-500',
      headerHover: 'hover:bg-cyan-50',
      headerTextBtn: 'text-cyan-600',
      bodyBg: 'bg-cyan-50',
      emoji: '🏖️',
      decorations: ['🍉', '🌊', '🐚', '☀️', '🌻', '🌺'],
    }
  } else if (month >= 9 && month <= 11) {
    // 秋 (9-11月)
    return {
      name: '秋',
      headerBg: 'bg-orange-500',
      headerHover: 'hover:bg-orange-50',
      headerTextBtn: 'text-orange-600',
      bodyBg: 'bg-orange-50',
      emoji: '🍁',
      decorations: ['🍁', '🍂', '🌾', '🎑'],
    }
  } else {
    // 冬 (12-2月)
    return {
      name: '冬',
      headerBg: 'bg-indigo-600',
      headerHover: 'hover:bg-indigo-50',
      headerTextBtn: 'text-indigo-600',
      bodyBg: 'bg-blue-50',
      emoji: '⛄',
      decorations: ['❄️', '⛄', '🎄', '✨'],
    }
  }
}

function App() {
  const [currentView, setCurrentView] = useState('list')
  const [reports, setReports] = useState([])
  const [editingReport, setEditingReport] = useState(null)
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const theme = getSeasonTheme()

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
    <div className={`min-h-screen ${theme.bodyBg}`}>
      {/* ヘッダー */}
      <header className={`${theme.headerBg} text-white shadow-md`}>
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1
            className="text-xl font-bold cursor-pointer flex items-center gap-2"
            onClick={handleBack}
          >
            <span>{theme.emoji}</span>
            <span>📋 報告書作成ツール</span>
          </h1>
          {currentView === 'list' && (
            <button onClick={handleNewReport} className={`bg-white ${theme.headerTextBtn} px-4 py-2 rounded-lg font-medium ${theme.headerHover} transition-colors`}>
              ＋ 新規作成
            </button>
          )}
          {currentView !== 'list' && (
            <button onClick={handleBack} className="bg-white/20 text-white px-4 py-2 rounded-lg font-medium hover:bg-white/30 transition-colors">
              ← 戻る
            </button>
          )}
        </div>
        {/* 季節デコレーション */}
        <div className="max-w-4xl mx-auto px-4 pb-2 flex gap-2 text-lg opacity-80">
          {theme.decorations.map((d, i) => (
            <span key={i} className="animate-bounce" style={{ animationDelay: `${i * 0.2}s` }}>{d}</span>
          ))}
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
