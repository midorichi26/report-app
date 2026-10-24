import React, { useState, useEffect, useRef } from 'react'
import ReportList from './components/ReportList.jsx'
import ReportEditor from './components/ReportEditor.jsx'
import TemplateSelector from './components/TemplateSelector.jsx'
import { getAllReports, saveReport, deleteReport } from './utils/reportStore.js'

// 月から季節キー（spring/summer/autumn/winter）を自動判定
function getAutoSeasonKey() {
  const month = new Date().getMonth() + 1 // 1-12
  if (month >= 3 && month <= 5) return 'spring'
  if (month >= 6 && month <= 8) return 'summer'
  if (month >= 9 && month <= 11) return 'autumn'
  return 'winter'
}

// 季節キーごとのヘッダーテーマ定義
const SEASON_THEMES = {
  spring: {
    name: '春',
    headerBg: 'bg-pink-400',
    headerHover: 'hover:bg-pink-50',
    headerTextBtn: 'text-pink-500',
    bodyBg: 'bg-pink-50',
    emoji: '🌸',
    decorations: ['🌸', '🌷', '🐝', '🦋'],
  },
  summer: {
    name: '夏',
    headerBg: 'bg-cyan-500',
    headerHover: 'hover:bg-cyan-50',
    headerTextBtn: 'text-cyan-600',
    bodyBg: 'bg-cyan-50',
    emoji: '🏖️',
    decorations: ['🍉', '🌊', '🐚', '☀️', '🌻', '🌺'],
  },
  autumn: {
    name: '秋',
    headerBg: 'bg-orange-500',
    headerHover: 'hover:bg-orange-50',
    headerTextBtn: 'text-orange-600',
    bodyBg: 'bg-orange-50',
    emoji: '🍁',
    decorations: ['🍁', '🍂', '🌾', '🎑'],
  },
  winter: {
    name: '冬',
    headerBg: 'bg-indigo-600',
    headerHover: 'hover:bg-indigo-50',
    headerTextBtn: 'text-indigo-600',
    bodyBg: 'bg-blue-50',
    emoji: '⛄',
    decorations: ['❄️', '⛄', '🎄', '✨'],
  },
}

// 季節テーマ設定。season が 'auto' や未指定なら月から自動判定する
function getSeasonTheme(season) {
  const key = season && season !== 'auto' ? season : getAutoSeasonKey()
  return SEASON_THEMES[key] || SEASON_THEMES.winter
}

function App() {
  const [currentView, setCurrentView] = useState('list')
  const [reports, setReports] = useState([])
  const [editingReport, setEditingReport] = useState(null)
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  // 編集画面で選択中の季節（'auto'含む）。ヘッダーテーマをリアルタイムに追従させるために保持する
  const [activeSeason, setActiveSeason] = useState('auto')
  // editor表示中はその季節でヘッダーを表示し、それ以外は月から自動判定する
  const theme = currentView === 'editor' ? getSeasonTheme(activeSeason) : getSeasonTheme()
  // ReportEditorが保持する最新の編集内容を取得するための関数を格納するref
  const editorGetDataRef = useRef(null)

  // IndexedDBから報告書を読み込み（初回にLocalStorageからの移行も行われる）
  useEffect(() => {
    let mounted = true
    getAllReports()
      .then((list) => {
        if (mounted) setReports(list)
      })
      .catch((e) => {
        console.error('報告書の読み込みに失敗しました:', e)
      })
    return () => {
      mounted = false
    }
  }, [])

  // IndexedDBから最新の一覧を読み直して画面に反映する
  const reloadReports = async () => {
    try {
      const list = await getAllReports()
      setReports(list)
    } catch (e) {
      console.error('報告書の再読み込みに失敗しました:', e)
    }
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
    setActiveSeason('auto')
    setCurrentView('editor')
  }

  // 既存の報告書を編集
  const handleEditReport = (report) => {
    setEditingReport({ ...report })
    setSelectedTemplate(report.photoCount)
    setActiveSeason(report.season || 'auto')
    setCurrentView('editor')
  }

  // 報告書を保存（成否を返す。画面遷移はしない）
  // 戻り値(Promise): { success: true } または { success: false, error: '...' }
  const handleSaveReport = async (report) => {
    const updated = { ...report, updatedAt: new Date().toISOString() }
    try {
      await saveReport(updated)
      // 保存後、一覧を最新化する
      await reloadReports()
      return { success: true }
    } catch (e) {
      // IndexedDBの容量オーバー（QuotaExceededError）などを検知
      const isQuota =
        e && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED')
      const message = isQuota
        ? '保存容量がいっぱいです。不要な報告書を削除してから、もう一度お試しください。'
        : '保存に失敗しました。時間をおいてもう一度お試しください。'
      console.error('報告書の保存に失敗しました:', e)
      return { success: false, error: message }
    }
  }

  // 「保存」ボタンから呼ばれる。保存に成功したらリストへ戻る
  const handleSaveAndClose = async (report) => {
    const result = await handleSaveReport(report)
    if (result.success) {
      setCurrentView('list')
      setEditingReport(null)
    }
    return result
  }

  // 報告書に何か入力があるか判定（A案：空なら自動保存しない）
  const hasContent = (report) => {
    if (!report) return false
    const hasText =
      (report.title && report.title.trim() !== '') ||
      (report.body && report.body.trim() !== '') ||
      (report.author && report.author.trim() !== '')
    const hasPhoto =
      Array.isArray(report.photos) && report.photos.some(p => p !== null && p !== undefined)
    return Boolean(hasText || hasPhoto)
  }

  // 報告書を削除
  const handleDeleteReport = async (id) => {
    try {
      await deleteReport(id)
      await reloadReports()
    } catch (e) {
      console.error('報告書の削除に失敗しました:', e)
    }
  }

  // リストに戻る（保存はしない）
  const handleBack = () => {
    setCurrentView('list')
    setEditingReport(null)
    setSelectedTemplate(null)
  }

  // 編集中の内容を受け取り、必要なら自動保存してからリストに戻る（A案）
  // editor以外の画面ではそのまま戻る
  const handleBackFromEditor = async (currentReport) => {
    if (currentReport && hasContent(currentReport)) {
      // 何か入力があれば保存を試みる。失敗しても戻る操作は妨げない
      await handleSaveReport(currentReport)
    }
    handleBack()
  }

  // ヘッダーの「戻る」用。エディタ表示中は最新の編集内容で自動保存する
  const handleHeaderBack = () => {
    if (currentView === 'editor') {
      // 最新のformDataはReportEditorが保持しているためref経由で取得
      const latest = editorGetDataRef.current ? editorGetDataRef.current() : editingReport
      handleBackFromEditor(latest)
    } else {
      handleBack()
    }
  }

  return (
    <div className={`min-h-screen ${theme.bodyBg}`}>
      {/* ヘッダー */}
      <header className={`${theme.headerBg} text-white shadow-md`}>
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1
            className="text-xl font-bold cursor-pointer flex items-center gap-2"
            onClick={handleHeaderBack}
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
            <button onClick={handleHeaderBack} className="bg-white/20 text-white px-4 py-2 rounded-lg font-medium hover:bg-white/30 transition-colors">
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
            onSave={handleSaveAndClose}
            onSaveOnly={handleSaveReport}
            onBack={handleBackFromEditor}
            registerGetData={(fn) => { editorGetDataRef.current = fn }}
            onSeasonChange={setActiveSeason}
          />
        )}
      </main>
    </div>
  )
}

export default App
