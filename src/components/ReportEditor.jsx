import React, { useState, useRef } from 'react'
import PhotoGrid from './PhotoGrid.jsx'
import PrintModal from './PrintModal.jsx'
import { generatePDF, generatePDFFile } from '../utils/pdfGenerator.js'

// 季節テーマ取得（App.jsxと同じロジック）
function getSeasonTheme() {
  const month = new Date().getMonth() + 1
  if (month >= 3 && month <= 5) {
    return { name: '春', emoji: '🌸', decorations: ['🌸', '🌷', '🐝', '🦋'], color: '#F472B6' }
  } else if (month >= 6 && month <= 8) {
    return { name: '夏', emoji: '🏖️', decorations: ['🍉', '🌊', '🐚', '☀️', '🌺'], color: '#06B6D4' }
  } else if (month >= 9 && month <= 11) {
    return { name: '秋', emoji: '🍁', decorations: ['🍁', '🍂', '🌾', '🎑'], color: '#F97316' }
  } else {
    return { name: '冬', emoji: '⛄', decorations: ['❄️', '⛄', '🎄', '✨'], color: '#4F46E5' }
  }
}

function ReportEditor({ report, onSave, onBack }) {
  const [formData, setFormData] = useState({
    ...report,
    photoComments: report.photoComments || Array(report.photoCount).fill(null),
    photoAnnotations: report.photoAnnotations || Array(report.photoCount).fill([]),
    dateStamp: report.dateStamp || { text: '', color: '#FFFFFF', size: 14 },
    photoDateStamps: report.photoDateStamps || Array(report.photoCount).fill(null),
    seasonThemeEnabled: report.seasonThemeEnabled ?? false,
  })
  const [showPrintModal, setShowPrintModal] = useState(false)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
  const reportRef = useRef(null)

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

  const handleSave = () => {
    onSave(formData)
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

        {/* 季節テーマ ON/OFF */}
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <span className="text-sm font-medium text-gray-700">
            {getSeasonTheme().emoji} 季節デザイン（{getSeasonTheme().name}）
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
        <button onClick={handleSave} className="btn-primary">
          💾 保存
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
        <button onClick={onBack} className="btn-secondary">
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
