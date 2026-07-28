import React, { useRef } from 'react'
import PhotoAnnotator from './PhotoAnnotator.jsx'

function PhotoGrid({ photos, photoCount, onPhotoChange, photoComments, onPhotoCommentChange, photoAnnotations, onPhotoAnnotationsChange }) {
  return (
    <div className={getGridClass(photoCount)}>
      {photos.map((photo, index) => (
        <PhotoSlot
          key={index}
          index={index}
          photo={photo}
          onPhotoChange={onPhotoChange}
          comment={photoComments?.[index] ?? null}
          onCommentChange={onPhotoCommentChange}
          annotations={photoAnnotations?.[index] || []}
          onAnnotationsChange={onPhotoAnnotationsChange}
        />
      ))}
    </div>
  )
}

function PhotoSlot({ index, photo, onPhotoChange, comment, onCommentChange, annotations, onAnnotationsChange }) {
  const cameraInputRef = useRef(null)
  const galleryInputRef = useRef(null)
  const [showMenu, setShowMenu] = React.useState(false)
  const [showAnnotator, setShowAnnotator] = React.useState(false)

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const maxWidth = 1200
        const maxHeight = 1200
        let { width, height } = img

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height)
          width = width * ratio
          height = height * ratio
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)

        const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
        onPhotoChange(index, dataUrl)
      }
      img.src = event.target.result
    }
    reader.readAsDataURL(file)
    setShowMenu(false)
  }

  const handleRemove = (e) => {
    e.stopPropagation()
    onPhotoChange(index, null)
  }

  const handleSlotClick = () => {
    if (!photo) {
      setShowMenu(true)
    }
  }

  const handleCamera = (e) => {
    e.stopPropagation()
    setShowMenu(false)
    cameraInputRef.current?.click()
  }

  const handleGallery = (e) => {
    e.stopPropagation()
    setShowMenu(false)
    galleryInputRef.current?.click()
  }

  // コメント欄の表示: nullなら非表示、文字列なら表示
  const showComment = comment !== null && comment !== undefined
  const handleAddComment = (e) => {
    e.stopPropagation()
    onCommentChange(index, '')
  }
  const handleRemoveComment = (e) => {
    e.stopPropagation()
    onCommentChange(index, null)
  }

  return (
    <div className="flex flex-col gap-1">
      {/* コメント欄（写真の上） */}
      {showComment ? (
        <div className="flex items-center gap-1">
          <input
            type="text"
            value={comment}
            onChange={(e) => onCommentChange(index, e.target.value)}
            placeholder={`写真${index + 1}のコメント`}
            className="input-field text-sm flex-1"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={handleRemoveComment}
            className="text-red-400 hover:text-red-600 text-lg px-1 shrink-0"
            aria-label="コメント欄を削除"
            title="コメント欄を削除"
          >
            ×
          </button>
        </div>
      ) : (
        <button
          onClick={handleAddComment}
          className="text-xs text-blue-500 hover:text-blue-700 text-left px-1"
        >
          + コメントを追加
        </button>
      )}

      {/* 写真スロット */}
      <div
        className="relative border-2 border-dashed border-gray-300 rounded-lg overflow-hidden cursor-pointer hover:border-blue-400 transition-colors bg-gray-50 aspect-[3/2]"
        onClick={handleSlotClick}
      >
        {photo ? (
          <>
            <img
              src={photo}
              alt={`写真 ${index + 1}`}
              className="w-full h-full object-cover"
            />
            {/* 注釈オーバーレイ */}
            {annotations && annotations.length > 0 && (
              <div className="absolute inset-0 pointer-events-none">
                {annotations.map((ann, ai) => (
                  <div
                    key={ai}
                    className="absolute"
                    style={{
                      left: `${ann.x}%`,
                      top: `${ann.y}%`,
                      width: `${ann.width}%`,
                      height: `${ann.height}%`,
                      transform: `translate(-50%, -50%) rotate(${ann.rotation || 0}deg)`,
                    }}
                  >
                    <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                      {renderAnnotationSVG(ann)}
                    </svg>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={handleRemove}
              className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600"
              aria-label="写真を削除"
            >
              ×
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setShowMenu(true) }}
              className="absolute bottom-1 right-1 bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-blue-600"
              aria-label="写真を変更"
            >
              ↻
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setShowAnnotator(true) }}
              className="absolute bottom-1 right-8 bg-yellow-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-yellow-600"
              aria-label="記号を追加"
            >
              ✏
            </button>
            <div className="absolute bottom-1 left-1 bg-black/50 text-white text-xs px-2 py-0.5 rounded">
              {index + 1}
            </div>
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
            <span className="text-3xl mb-1">📷</span>
            <span className="text-sm">写真{index + 1}を追加</span>
            <span className="text-xs mt-1">タップして選択</span>
          </div>
        )}

        {/* 選択メニュー */}
        {showMenu && (
          <div
            className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-3 z-10"
            onClick={(e) => { e.stopPropagation(); setShowMenu(false) }}
          >
            <button
              onClick={handleCamera}
              className="bg-white text-gray-800 font-medium px-5 py-2.5 rounded-lg shadow-lg text-sm hover:bg-gray-100 transition-colors w-40"
            >
              📷 カメラで撮影
            </button>
            <button
              onClick={handleGallery}
              className="bg-white text-gray-800 font-medium px-5 py-2.5 rounded-lg shadow-lg text-sm hover:bg-gray-100 transition-colors w-40"
            >
              🖼️ ギャラリーから選択
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setShowMenu(false) }}
              className="text-white text-sm mt-1 underline"
            >
              キャンセル
            </button>
          </div>
        )}

        {/* カメラ用input */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileSelect}
          className="hidden"
        />
        {/* ギャラリー用input（captureなし） */}
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* 注釈エディタ */}
      {showAnnotator && (
        <PhotoAnnotator
          photo={photo}
          annotations={annotations}
          onChange={(newAnnotations) => onAnnotationsChange(index, newAnnotations)}
          onClose={() => setShowAnnotator(false)}
        />
      )}
    </div>
  )
}

function renderAnnotationSVG(ann) {
  const strokeWidth = ann.stroke || 5
  switch (ann.type) {
    case 'arrow':
      return (
        <>
          <line x1="5" y1="50" x2="75" y2="50" stroke={ann.color} strokeWidth={strokeWidth} />
          <polygon points="70,30 95,50 70,70" fill={ann.color} />
        </>
      )
    case 'line':
      return <line x1="5" y1="50" x2="95" y2="50" stroke={ann.color} strokeWidth={strokeWidth} />
    case 'rect':
      return <rect x="5" y="5" width="90" height="90" stroke={ann.color} strokeWidth={strokeWidth} fill="none" />
    case 'circle':
      return <ellipse cx="50" cy="50" rx="45" ry="45" stroke={ann.color} strokeWidth={strokeWidth} fill="none" />
    case 'cross':
      return (
        <>
          <line x1="10" y1="10" x2="90" y2="90" stroke={ann.color} strokeWidth={strokeWidth} />
          <line x1="90" y1="10" x2="10" y2="90" stroke={ann.color} strokeWidth={strokeWidth} />
        </>
      )
    default:
      return null
  }
}

function getGridClass(count) {
  switch (count) {
    case 1:
      return 'grid grid-cols-1 gap-3 max-w-md mx-auto'
    case 2:
      return 'grid grid-cols-1 sm:grid-cols-2 gap-3'
    case 3:
      return 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3'
    case 4:
      return 'grid grid-cols-2 gap-3'
    case 5:
      return 'grid grid-cols-2 sm:grid-cols-3 gap-3'
    case 6:
      return 'grid grid-cols-2 sm:grid-cols-3 gap-3'
    default:
      return 'grid grid-cols-2 gap-3'
  }
}

export default PhotoGrid
