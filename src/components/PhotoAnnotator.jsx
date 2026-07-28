import React, { useState, useRef, useEffect } from 'react'

const ANNOTATION_TYPES = [
  { id: 'arrow', label: '→ 矢印', icon: '→' },
  { id: 'line', label: '― 直線', icon: '―' },
  { id: 'rect', label: '□ 四角', icon: '□' },
  { id: 'circle', label: '○ 丸', icon: '○' },
  { id: 'cross', label: '× バツ', icon: '×' },
]

const COLORS = ['#FF0000', '#0000FF', '#00AA00', '#FF8800', '#000000']

function PhotoAnnotator({ photo, annotations = [], onChange, onClose }) {
  const [items, setItems] = useState(annotations)
  const [selectedType, setSelectedType] = useState('arrow')
  const [selectedColor, setSelectedColor] = useState('#FF0000')
  const [draggingIndex, setDraggingIndex] = useState(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const containerRef = useRef(null)

  const addAnnotation = () => {
    const newItem = {
      type: selectedType,
      color: selectedColor,
      x: 50, // パーセント位置
      y: 50,
      rotation: 0,
      size: selectedType === 'rect' || selectedType === 'circle' ? 20 : 15,
    }
    const updated = [...items, newItem]
    setItems(updated)
  }

  const removeAnnotation = (index) => {
    const updated = items.filter((_, i) => i !== index)
    setItems(updated)
  }

  const getPosition = (e) => {
    const rect = containerRef.current.getBoundingClientRect()
    let clientX, clientY
    if (e.touches) {
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else {
      clientX = e.clientX
      clientY = e.clientY
    }
    const x = ((clientX - rect.left) / rect.width) * 100
    const y = ((clientY - rect.top) / rect.height) * 100
    return { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) }
  }

  const handlePointerDown = (e, index) => {
    e.preventDefault()
    e.stopPropagation()
    const pos = getPosition(e)
    setDraggingIndex(index)
    setDragOffset({ x: pos.x - items[index].x, y: pos.y - items[index].y })
  }

  const handlePointerMove = (e) => {
    if (draggingIndex === null) return
    e.preventDefault()
    const pos = getPosition(e)
    const updated = [...items]
    updated[draggingIndex] = {
      ...updated[draggingIndex],
      x: pos.x - dragOffset.x,
      y: pos.y - dragOffset.y,
    }
    setItems(updated)
  }

  const handlePointerUp = () => {
    setDraggingIndex(null)
  }

  const handleSave = () => {
    onChange(items)
    onClose()
  }

  const renderAnnotation = (item, index) => {
    const style = {
      position: 'absolute',
      left: `${item.x}%`,
      top: `${item.y}%`,
      transform: `translate(-50%, -50%) rotate(${item.rotation || 0}deg)`,
      color: item.color,
      fontSize: `${item.size || 15}px`,
      cursor: 'grab',
      touchAction: 'none',
      userSelect: 'none',
      zIndex: draggingIndex === index ? 20 : 10,
      lineHeight: 1,
    }

    let content
    switch (item.type) {
      case 'arrow':
        content = (
          <svg width={item.size * 3} height={item.size * 2} viewBox="0 0 60 40" style={{ overflow: 'visible' }}>
            <line x1="0" y1="20" x2="45" y2="20" stroke={item.color} strokeWidth="4" />
            <polygon points="40,10 60,20 40,30" fill={item.color} />
          </svg>
        )
        break
      case 'line':
        content = (
          <svg width={item.size * 3} height={item.size} viewBox="0 0 60 10" style={{ overflow: 'visible' }}>
            <line x1="0" y1="5" x2="60" y2="5" stroke={item.color} strokeWidth="4" />
          </svg>
        )
        break
      case 'rect':
        content = (
          <svg width={item.size * 2.5} height={item.size * 2} viewBox="0 0 50 40" style={{ overflow: 'visible' }}>
            <rect x="2" y="2" width="46" height="36" stroke={item.color} strokeWidth="3" fill="none" />
          </svg>
        )
        break
      case 'circle':
        content = (
          <svg width={item.size * 2.5} height={item.size * 2.5} viewBox="0 0 50 50" style={{ overflow: 'visible' }}>
            <circle cx="25" cy="25" r="22" stroke={item.color} strokeWidth="3" fill="none" />
          </svg>
        )
        break
      case 'cross':
        content = (
          <svg width={item.size * 2} height={item.size * 2} viewBox="0 0 40 40" style={{ overflow: 'visible' }}>
            <line x1="5" y1="5" x2="35" y2="35" stroke={item.color} strokeWidth="4" />
            <line x1="35" y1="5" x2="5" y2="35" stroke={item.color} strokeWidth="4" />
          </svg>
        )
        break
      default:
        content = <span>{item.type}</span>
    }

    return (
      <div
        key={index}
        style={style}
        onMouseDown={(e) => handlePointerDown(e, index)}
        onTouchStart={(e) => handlePointerDown(e, index)}
      >
        {content}
        {/* 削除ボタン */}
        <button
          onClick={(e) => { e.stopPropagation(); removeAnnotation(index) }}
          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs leading-none"
          style={{ fontSize: '10px' }}
        >
          ×
        </button>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex flex-col z-50">
      {/* ツールバー */}
      <div className="bg-white p-3 flex flex-wrap items-center gap-2 shadow-lg">
        <span className="text-sm font-medium text-gray-700">記号:</span>
        {ANNOTATION_TYPES.map((type) => (
          <button
            key={type.id}
            onClick={() => setSelectedType(type.id)}
            className={`px-2 py-1 rounded text-sm border ${
              selectedType === type.id
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-gray-100 text-gray-700 border-gray-300'
            }`}
          >
            {type.label}
          </button>
        ))}
      </div>

      {/* 色選択 + 追加ボタン */}
      <div className="bg-white px-3 pb-3 flex items-center gap-2 border-b">
        <span className="text-sm font-medium text-gray-700">色:</span>
        {COLORS.map((color) => (
          <button
            key={color}
            onClick={() => setSelectedColor(color)}
            className={`w-6 h-6 rounded-full border-2 ${
              selectedColor === color ? 'border-gray-800 scale-110' : 'border-gray-300'
            }`}
            style={{ backgroundColor: color }}
          />
        ))}
        <button
          onClick={addAnnotation}
          className="ml-auto bg-green-600 text-white px-3 py-1 rounded text-sm font-medium"
        >
          ＋追加
        </button>
      </div>

      {/* 写真エリア */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden m-2"
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
      >
        <img
          src={photo}
          alt="注釈対象"
          className="w-full h-full object-contain"
          draggable={false}
        />
        {items.map((item, index) => renderAnnotation(item, index))}
      </div>

      {/* 下部ボタン */}
      <div className="bg-white p-3 flex justify-between">
        <button onClick={onClose} className="btn-secondary">
          キャンセル
        </button>
        <button onClick={handleSave} className="btn-primary">
          ✓ 保存
        </button>
      </div>
    </div>
  )
}

export default PhotoAnnotator
