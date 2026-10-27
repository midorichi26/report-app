import React, { useState, useRef, useEffect } from 'react'
import PhotoGrid from './PhotoGrid.jsx'
import PrintModal from './PrintModal.jsx'
import { generatePDF, generatePDFFile } from '../utils/pdfGenerator.js'

// 月から季節キーを自動判定する
function getAutoSeasonKey() {
  const month = new Date().getMonth() + 1
  if (month >= 3 && month <= 5) return 'spring'
  if (month >= 6 && month <= 8) return 'summer'
  if (month >= 9 && month <= 11) return 'autumn'
  return 'winter'
}

// 季節キー（spring/summer/autumn/winter）からテーマ情報を返す
const SEASON_THEMES = {
  spring: { name: '春', emoji: '🌸', decorations: ['🌸', '🌷', '🌼', '🦋', '🐝', '🌱'], color: '#F472B6' },
  summer: { name: '夏', emoji: '🏖️', decorations: ['🍉', '🌊', '🐚', '☀️', '🌻', '🌺'], color: '#06B6D4' },
  autumn: { name: '秋', emoji: '🍁', decorations: ['🍁', '🍂', '🌰', '🍄', '🌾', '🍇'], color: '#F97316' },
  winter: { name: '冬', emoji: '⛄', decorations: ['❄️', '⛄', '⭐', '🎄', '🧣', '✨'], color: '#4F46E5' },
}

// season（'auto'含む）から表示用テーマを取得
function getSeasonTheme(season) {
  const key = season && season !== 'auto' ? season : getAutoSeasonKey()
  return SEASON_THEMES[key] || SEASON_THEMES.winter
}

// 季節セレクタの選択肢
const SEASON_OPTIONS = [
  { value: 'auto', label: '自動（今の月）' },
  { value: 'spring', label: '🌸 春' },
  { value: 'summer', label: '🏖️ 夏' },
  { value: 'autumn', label: '🍁 秋' },
  { value: 'winter', label: '⛄ 冬' },
]

function ReportEditor({ report, onSave, onSaveOnly, onBack, registerGetData, onSeasonChange }) {
  const [formData, setFormData] = useState({
    ...report,
    photoComments: report.photoComments || Array(report.photoCount).fill(null),
    photoAnnotations: report.photoAnnotations || Array(report.photoCount).fill([]),
    dateStamp: report.dateStamp || { text: '', color: '#FFFFFF', size: 14 },
    photoDateStamps: report.photoDateStamps || Array(report.photoCount).fill(null),
    seasonThemeEnabled: report.seasonThemeEnabled ?? false,
    season: report.season || 'auto',
  })
  const [showPrintModal, setShowPrintModal] = useState(false)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
  // 保存処理中フラグ（二重押し防止・ボタン表示用）
  const [isSaving, setIsSaving] = useState(false)
  // 保存結果のフィードバック表示用 { type: 'success' | 'error', message: string }
  const [feedback, setFeedback] = useState(null)
  const reportRef = useRef(null)
  // 常に最新のformDataを参照するためのref（戻るボタンからの自動保存で使用）
  const formDataRef = useRef(formData)

  // formDataが変わるたびにrefを最新化
  useEffect(() => {
    formDataRef.current = formData
  }, [formData])

  // 親（App）が最新の編集内容を取得できるように、取得関数を登録する
  useEffect(() => {
    if (registerGetData) {
      registerGetData(() => formDataRef.current)
    }
    return () => {
      if (registerGetData) registerGetData(null)
    }
  }, [registerGetData])

  // フィードバックを表示し、成功時は数秒後に自動で消す
  const showFeedback = (type, message) => {
    setFeedback({ type, message })
    if (type === 'success') {
      setTimeout(() => setFeedback(null), 2500)
    }
  }

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handlePhotoChange = (index, dataUrl) => {
    const newPhotos = [...formData.photos]
    newPhotos[index] = dataUrl
    setFormData(prev => ({ ...prev, photos: newPhotos }))
  }

  const handlePhotoCommentChange = (index, value) => {
    const newComments = [...(formData.photoComments || Array(formData.photoCount).fill(null))]
    newComments[index] = value
    setFormData(prev => ({ ...prev, photoComments: newComments }))
  }

  const handlePhotoAnnotationsChange = (index, annotations) => {
    const newAnnotations = [...(formData.photoAnnotations || Array(formData.photoCount).fill([]))]
    newAnnotations[index] = annotations
    setFormData(prev => ({ ...prev, photoAnnotations: newAnnotations }))
  }

  const handleSave = async () => {
    if (isSaving) return // 二重押し防止
    setIsSaving(true)
    try {
      // 保存だけ行い、画面遷移はしない（成否を受け取る）
      // onSaveOnlyがあればそれを使い、なければ従来のonSaveにフォールバック
      const saveFn = onSaveOnly || onSave
      const result = saveFn ? await saveFn(formData) : { success: true }
      if (result && result.success === false) {
        // 保存失敗時はエディタに留まり、エラーを表示する
        showFeedback('error', result.error || '保存に失敗しました。')
        return
      }
      // 保存成功。メッセージを表示してから少し待ってリストに戻る
      showFeedback('success', '保存しました')
      setTimeout(() => {
        if (onBack) onBack(formData)
      }, 1200)
    } finally {
      setIsSaving(false)
    }
  }

  // 「戻る」時の自動保存（A案：何か入力があれば保存）はApp側で判定するため、
  // ここでは最新のformDataを渡すだけ
  const handleBack = () => {
    if (onBack) onBack(formData)
  }

  const handleGeneratePDF = async () => {
    setIsGeneratingPdf(true)
    try {
      await generatePDF(formData)
    } catch (error) {
      alert('PDF生成中にエラーが発生しました: ' + error.message)
    }
    setIsGeneratingPdf(false)
  }

  const handleSharePDF = async () => {
    setIsGeneratingPdf(true)
    try {
      const file = await generatePDFFile(formData)
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: formData.title || '報告書',
          files: [file],
        })
      } else {
        // Web Share APIが使えない場合はダウンロードにフォールバック
        await generatePDF(formData)
        alert('お使いのブラウザでは共有機能が使えないため、PDFをダウンロードしました。メールアプリから添付してください。')
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        alert('共有中にエラーが発生しました: ' + error.message)
      }
    }
    setIsGeneratingPdf(false)
  }

  const handlePrint = () => {
    setShowPrintModal(true)
  }

  return (
    <div className="space-y-6">
      {/* 保存結果のフィードバック（画面上部に固定表示） */}
      {feedback && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-md">
          <div
            className={`rounded-lg shadow-lg px-4 py-3 flex items-start gap-2 text-sm font-medium ${
              feedback.type === 'success'
                ? 'bg-green-600 text-white'
                : 'bg-red-600 text-white'
            }`}
          >
            <span className="text-lg leading-none">
              {feedback.type === 'success' ? '✅' : '⚠️'}
            </span>
            <span className="flex-1">{feedback.message}</span>
            {feedback.type === 'error' && (
              <button
                onClick={() => setFeedback(null)}
                className="text-white/90 hover:text-white font-bold ml-2"
                aria-label="閉じる"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      )}

      {/* 入力フォーム */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">報告書の編集</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">日付</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => handleChange('date', e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">利用者名</label>
            <input
              type="text"
              value={formData.author}
              onChange={(e) => handleChange('author', e.target.value)}
              placeholder="利用者名を入力"
              className="input-field"
            />
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">タイトル</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => handleChange('title', e.target.value)}
            placeholder="報告書のタイトルを入力"
            className="input-field"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">本文</label>
          <textarea
            value={formData.body}
            onChange={(e) => handleChange('body', e.target.value)}
            placeholder="報告内容を入力してください"
            rows={5}
            className="input-field resize-y"
          />
        </div>

        {/* 季節テーマ ON/OFF と季節選択 */}
        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700">
              {getSeasonTheme(formData.season).emoji} 季節デザイン（{getSeasonTheme(formData.season).name}）
            </span>
            <button
              onClick={() => handleChange('seasonThemeEnabled', !formData.seasonThemeEnabled)}
              className={`relative w-12 h-6 rounded-full transition-colors ${formData.seasonThemeEnabled ? 'bg-blue-600' : 'bg-gray-300'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${formData.seasonThemeEnabled ? 'translate-x-6' : ''}`} />
            </button>
            <span className="text-xs text-gray-500">
              {formData.seasonThemeEnabled ? 'PDFに反映する' : 'PDFに反映しない'}
            </span>
          </div>

          {/* 季節の手動選択（デザインON時のみ操作可能） */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">季節:</span>
            <div className="flex flex-wrap gap-1">
              {SEASON_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  disabled={!formData.seasonThemeEnabled}
                  onClick={() => {
                    handleChange('season', opt.value)
                    if (onSeasonChange) onSeasonChange(opt.value)
                  }}
                  className={`px-2.5 py-1 rounded text-sm border transition-colors ${
                    formData.season === opt.value
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                  } ${!formData.seasonThemeEnabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <p className="text-xs text-gray-500">
            ※「自動」は今の月に合わせて季節が切り替わります。春夏秋冬を選ぶとPDFにその季節の飾りが入ります。
          </p>
        </div>
      </div>

      {/* 写真セクション */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-3">
          写真 ({formData.photos.filter(p => p !== null).length}/{formData.photoCount}枚)
        </h3>

        {/* 日付スタンプ設定 */}
        <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-2">📅 写真上の日付（一括入力）</label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={formData.dateStamp.text}
              onChange={(e) => handleChange('dateStamp', { ...formData.dateStamp, text: e.target.value })}
              placeholder="例: 2026/7/28（空欄で非表示）"
              className="input-field text-sm flex-1"
            />
            <button
              onClick={() => {
                if (!formData.dateStamp.text) return
                const newStamps = formData.photoDateStamps.map((existing) => ({
                  text: formData.dateStamp.text,
                  color: formData.dateStamp.color,
                  size: formData.dateStamp.size,
                  x: existing?.x ?? 80,
                  y: existing?.y ?? 90,
                }))
                setFormData(prev => ({ ...prev, photoDateStamps: newStamps }))
              }}
              className="bg-blue-600 text-white px-3 py-1 rounded text-sm font-medium whitespace-nowrap"
            >
              全写真に反映
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-600">色:</span>
              {['#FFFFFF', '#FFFF00', '#FF0000', '#00FF00', '#000000'].map((c) => (
                <button
                  key={c}
                  onClick={() => handleChange('dateStamp', { ...formData.dateStamp, color: c })}
                  className={`w-5 h-5 rounded-full border-2 ${formData.dateStamp.color === c ? 'border-blue-600 scale-110' : 'border-gray-400'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-600">サイズ:</span>
              {[{ label: '小', value: 10 }, { label: '中', value: 14 }, { label: '大', value: 20 }].map((s) => (
                <button
                  key={s.value}
                  onClick={() => handleChange('dateStamp', { ...formData.dateStamp, size: s.value })}
                  className={`px-2 py-0.5 rounded text-xs border ${formData.dateStamp.size === s.value ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-1">※ 写真上の日付はドラッグで位置調整、タップで個別編集できます</p>
        </div>

        <PhotoGrid
          photos={formData.photos}
          photoCount={formData.photoCount}
          onPhotoChange={handlePhotoChange}
          photoComments={formData.photoComments}
          onPhotoCommentChange={handlePhotoCommentChange}
          photoAnnotations={formData.photoAnnotations}
          onPhotoAnnotationsChange={handlePhotoAnnotationsChange}
          photoDateStamps={formData.photoDateStamps}
          onPhotoDateStampChange={(index, stamp) => {
            const newStamps = [...formData.photoDateStamps]
            newStamps[index] = stamp
            setFormData(prev => ({ ...prev, photoDateStamps: newStamps }))
          }}
        />
      </div>

      {/* アクションボタン */}
      <div className="flex flex-wrap gap-3 justify-center pb-6">
        <button onClick={handleSave} disabled={isSaving} className="btn-primary">
          {isSaving ? '⏳ 保存中...' : '💾 保存'}
        </button>
        <button onClick={handleGeneratePDF} disabled={isGeneratingPdf} className="btn-success">
          {isGeneratingPdf ? '⏳ 生成中...' : '📄 PDF保存'}
        </button>
        <button onClick={handleSharePDF} disabled={isGeneratingPdf} className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors font-medium">
          📤 PDFを共有
        </button>
        <button onClick={handlePrint} className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors font-medium">
          🖨️ コンビニプリント
        </button>
        <button onClick={handleBack} className="btn-secondary">
          ← 戻る
        </button>
      </div>

      {/* プリントモーダル */}
      {showPrintModal && (
        <PrintModal
          onClose={() => setShowPrintModal(false)}
          onGeneratePDF={handleGeneratePDF}
        />
      )}
    </div>
  )
}

export default ReportEditor
