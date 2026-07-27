import React, { useRef } from 'react'

function PhotoGrid({ photos, photoCount, onPhotoChange }) {
  return (
    <div className={getGridClass(photoCount)}>
      {photos.map((photo, index) => (
        <PhotoSlot
          key={index}
          index={index}
          photo={photo}
          onPhotoChange={onPhotoChange}
        />
      ))}
    </div>
  )
}

function PhotoSlot({ index, photo, onPhotoChange }) {
  const fileInputRef = useRef(null)

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (!file) return

    // 画像を圧縮して保存
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
  }

  const handleRemove = (e) => {
    e.stopPropagation()
    onPhotoChange(index, null)
  }

  return (
    <div
      className="relative border-2 border-dashed border-gray-300 rounded-lg overflow-hidden cursor-pointer hover:border-blue-400 transition-colors bg-gray-50 aspect-[4/3]"
      onClick={() => fileInputRef.current?.click()}
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
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
      />
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
