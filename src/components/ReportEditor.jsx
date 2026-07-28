import React, { useState, useRef } from 'react'
import PhotoGrid from './PhotoGrid.jsx'
import PrintModal from './PrintModal.jsx'
import { generatePDF, generatePDFFile } from '../utils/pdfGenerator.js'

function ReportEditor({ report, onSave, onBack }) {
  const [formData, setFormData] = useState({ ...report, photoComments: report.photoComments || Array(report.photoCount).fill(null), photoAnnotations: report.photoAnnotations || Array(report.photoCount).fill([]) })
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
      </div>

      {/* 写真セクション */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-3">
          写真 ({formData.photos.filter(p => p !== null).length}/{formData.photoCount}枚)
        </h3>
        <PhotoGrid
          photos={formData.photos}
          photoCount={formData.photoCount}
          onPhotoChange={handlePhotoChange}
          photoComments={formData.photoComments}
          onPhotoCommentChange={handlePhotoCommentChange}
          photoAnnotations={formData.photoAnnotations}
          onPhotoAnnotationsChange={handlePhotoAnnotationsChange}
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
