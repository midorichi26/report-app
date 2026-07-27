import React, { useRef } from 'react'

function PhotoGrid({ photos, photoCount, onPhotoChange, photoComments, onPhotoCommentChange }) {
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
        />
      ))}
    </div>
  )
}

function PhotoSlot({ index, photo, onPhotoChange, comment, onCommentChange }) {
  const cameraInputRef = useRef(null)
  const galleryInputRef = useRef(null)
  const [showMenu, setShowMenu] = React.useState(false)

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
        className="relative border-2 border-dashed border-gray-300 rounded-lg overflow-hidden cursor-pointer hover:border-blue-400 transition-colors bg-gray-50 aspect-[4/3]"
        onClick={handleSlotClick}
      >
        {photo ? (
          <>
            <img
              src={photo}
              alt={`写真 ${index + 1}`}
              className="w-full h-full object-cover"
            />
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
    </div>
  )
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
