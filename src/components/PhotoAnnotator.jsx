import React, { useState, useRef } from 'react'

const ANNOTATION_TYPES = [
  { id: 'arrow', label: '→ 矢印' },
  { id: 'line', label: '― 直線' },
  { id: 'rect', label: '□ 四角' },
  { id: 'circle', label: '○ 丸' },
  { id: 'cross', label: '× バツ' },
]

const COLORS = ['#FF0000', '#0000FF', '#00AA00', '#FF8800', '#000000']
const SIZES = [
  { label: 'S', value: 4 },
  { label: 'M', value: 7 },
  { label: 'L', value: 11 },
  { label: 'XL', value: 16 },
]
const STROKES = [
  { label: '細', value: 3 },
  { label: '中', value: 6 },
  { label: '太', value: 10 },
]

const EDIT_MODES = [] // 不要になったが互換性のために残す

function PhotoAnnotator({ photo, annotations = [], onChange, onClose }) {
  const [items, setItems] = useState(annotations)
  const [selectedType, setSelectedType] = useState('arrow')
  const [selectedColor, setSelectedColor] = useState('#FF0000')
  const [selectedSize, setSelectedSize] = useState(7)
  const [selectedStroke, setSelectedStroke] = useState(6)
  const [activeIndex, setActiveIndex] = useState(null)
  const [mode, setMode] = useState(null) // 'move', 'resize', or 'rotate'
  const [startPos, setStartPos] = useState({ x: 0, y: 0 })
  const [startItem, setStartItem] = useState(null)
  const containerRef = useRef(null)

  const addAnnotation = () => {
    const newItem = {
      type: selectedType,
      color: selectedColor,
      x: 50,
      y: 50,
      width: selectedSize * 2,
      height: selectedSize * 1.5,
      rotation: 0,
      stroke: selectedStroke,
    }
    setItems([...items, newItem])
  }

  const removeAnnotation = (index) => {
    setItems(items.filter((_, i) => i !== index))
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
    return { x, y }
  }

  const handleMoveStart = (e, index) => {
    e.preventDefault()
    e.stopPropagation()
    const pos = getPosition(e)
    const item = items[index]

    // タッチ位置が記号のどのエリアかで操作を自動決定
    // 記号の中心からの相対位置で判定
    const relX = (pos.x - item.x) / (item.width / 2)  // -1 ~ 1
    const relY = (pos.y - item.y) / (item.height / 2) // -1 ~ 1
    const dist = Math.sqrt(relX * relX + relY * relY)

    let autoMode
    if (dist < 0.5) {
      // 中央付近 → 移動
      autoMode = 'move'
    } else if (relX > 0.3 && relY < -0.3) {
      // 右上エリア → 回転
      autoMode = 'rotate'
    } else {
      // 外側エリア → サイズ変更
      autoMode = 'resize'
    }

    setActiveIndex(index)
    setMode(autoMode)
    setStartPos(pos)
    setStartItem({ ...item })
  }

  const handlePointerMove = (e) => {
    if (activeIndex === null || !startItem) return
    e.preventDefault()
    const pos = getPosition(e)
    const dx = pos.x - startPos.x
    const dy = pos.y - startPos.y
    const updated = [...items]

    if (mode === 'move') {
      updated[activeIndex] = {
        ...updated[activeIndex],
        x: Math.max(0, Math.min(100, startItem.x + dx)),
        y: Math.max(0, Math.min(100, startItem.y + dy)),
      }
    } else if (mode === 'resize') {
      updated[activeIndex] = {
        ...updated[activeIndex],
        width: Math.max(3, startItem.width + dx),
        height: Math.max(2, startItem.height + dy),
      }
    } else if (mode === 'rotate') {
      // 中心からの角度を計算
      const centerX = startItem.x
      const centerY = startItem.y
      const startAngle = Math.atan2(startPos.y - centerY, startPos.x - centerX)
      const currentAngle = Math.atan2(pos.y - centerY, pos.x - centerX)
      const angleDiff = (currentAngle - startAngle) * (180 / Math.PI)
      updated[activeIndex] = {
        ...updated[activeIndex],
        rotation: (startItem.rotation || 0) + angleDiff,
      }
    }
    setItems(updated)
  }

  const handlePointerUp = () => {
    setActiveIndex(null)
    setMode(null)
    setStartItem(null)
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
      width: `${item.width}%`,
      height: `${item.height}%`,
      cursor: 'grab',
      touchAction: 'none',
      userSelect: 'none',
      zIndex: activeIndex === index ? 20 : 10,
    }

    return (
      <div key={index} style={style}>
        {/* メイン記号 - 選択中のモードで操作 */}
        <div
          className="w-full h-full"
          onMouseDown={(e) => handleMoveStart(e, index)}
          onTouchStart={(e) => handleMoveStart(e, index)}
        >
          <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
            {renderShape(item)}
          </svg>
        </div>

        {/* 削除ボタン（左上） */}
        <button
          onClick={(e) => { e.stopPropagation(); removeAnnotation(index) }}
          className="absolute -top-2 -left-2 bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center font-bold"
          style={{ touchAction: 'none', fontSize: '16px' }}
        >
          ×
        </button>
      </div>
    )
  }

  const renderShape = (item) => {
    const strokeWidth = item.stroke || 5
    switch (item.type) {
      case 'arrow':
        return (
          <>
            <line x1="5" y1="50" x2="75" y2="50" stroke={item.color} strokeWidth={strokeWidth} />
            <polygon points="70,30 95,50 70,70" fill={item.color} />
          </>
        )
      case 'line':
        return <line x1="5" y1="50" x2="95" y2="50" stroke={item.color} strokeWidth={strokeWidth} />
      case 'rect':
        return <rect x="5" y="5" width="90" height="90" stroke={item.color} strokeWidth={strokeWidth} fill="none" />
      case 'circle':
        return <ellipse cx="50" cy="50" rx="45" ry="45" stroke={item.color} strokeWidth={strokeWidth} fill="none" />
      case 'cross':
        return (
          <>
            <line x1="10" y1="10" x2="90" y2="90" stroke={item.color} strokeWidth={strokeWidth} />
            <line x1="90" y1="10" x2="10" y2="90" stroke={item.color} strokeWidth={strokeWidth} />
          </>
        )
      default:
        return null
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex flex-col z-50">
      {/* ツールバー - 記号選択 */}
      <div className="bg-white p-2 flex flex-wrap items-center gap-1 shadow-lg">
        <span className="text-xs font-medium text-gray-700 mr-1">記号:</span>
        {ANNOTATION_TYPES.map((type) => (
          <button
            key={type.id}
            onClick={() => setSelectedType(type.id)}
            className={`px-2 py-1 rounded text-xs border ${
              selectedType === type.id
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-gray-100 text-gray-700 border-gray-300'
            }`}
          >
            {type.label}
          </button>
        ))}
      </div>

      {/* 色 + サイズ + 太さ + 追加 */}
      <div className="bg-white px-2 pb-2 flex flex-wrap items-center gap-2 border-b">
        <span className="text-xs font-medium text-gray-700">色:</span>
        {COLORS.map((color) => (
          <button
            key={color}
            onClick={() => setSelectedColor(color)}
            className={`w-5 h-5 rounded-full border-2 ${
              selectedColor === color ? 'border-gray-800 scale-110' : 'border-gray-300'
            }`}
            style={{ backgroundColor: color }}
          />
        ))}
        <span className="text-xs font-medium text-gray-700 ml-2">サイズ:</span>
        {SIZES.map((size) => (
          <button
            key={size.value}
            onClick={() => setSelectedSize(size.value)}
            className={`px-2 py-0.5 rounded text-xs border ${
              selectedSize === size.value
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-gray-100 text-gray-700 border-gray-300'
            }`}
          >
            {size.label}
          </button>
        ))}
        <span className="text-xs font-medium text-gray-700 ml-2">太さ:</span>
        {STROKES.map((s) => (
          <button
            key={s.value}
            onClick={() => setSelectedStroke(s.value)}
            className={`px-2 py-0.5 rounded text-xs border ${
              selectedStroke === s.value
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-gray-100 text-gray-700 border-gray-300'
            }`}
          >
            {s.label}
          </button>
        ))}
        <button
          onClick={addAnnotation}
          className="ml-auto bg-green-600 text-white px-3 py-1 rounded text-xs font-medium"
        >
          ＋追加
        </button>
      </div>

      {/* 写真エリア */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden m-1"
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
        <p className="absolute bottom-1 left-1 text-white text-xs bg-black/50 px-2 py-0.5 rounded">
          中央ドラッグ: 移動 / 端ドラッグ: サイズ / 右上ドラッグ: 回転
        </p>
      </div>

      {/* 下部ボタン */}
      <div className="bg-white p-2 flex justify-between">
        <button onClick={onClose} className="btn-secondary text-sm">
          キャンセル
        </button>
        <button onClick={handleSave} className="btn-primary text-sm">
          ✓ 保存
        </button>
      </div>
    </div>
  )
}

export default PhotoAnnotator
