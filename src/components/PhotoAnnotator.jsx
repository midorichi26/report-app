import React, { useState, useRef } from 'react'

const ANNOTATION_TYPES = [
  { id: 'arrow', label: '→ 矢印' },
  { id: 'line', label: '― 直線' },
  { id: 'dashed', label: '┄ 点線' },
  { id: 'rect', label: '□ 四角' },
  { id: 'box3d', label: '⬡ 立体' },
  { id: 'circle', label: '○ 丸' },
  { id: 'cross', label: '× バツ' },
  { id: 'text', label: 'A 文字' },
]

const COLORS = ['#FF0000', '#0000FF', '#00AA00', '#FF8800', '#000000', '#FFFFFF']
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
const TEXT_SIZES = [
  { label: '小', value: 12 },
  { label: '中', value: 18 },
  { label: '大', value: 26 },
]

/**
 * 3D直方体の8頂点を回転角度から計算してSVG座標(0-100)に変換
 */
function getBox3DPoints(rotateX, rotateY) {
  const radX = (rotateX * Math.PI) / 180
  const radY = (rotateY * Math.PI) / 180

  // 単位立方体の8頂点 (-1〜1)
  const vertices = [
    [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], // 前面
    [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1],     // 背面
  ]

  // Y軸回転 → X軸回転
  const rotated = vertices.map(([x, y, z]) => {
    // Y軸回転
    const x1 = x * Math.cos(radY) - z * Math.sin(radY)
    const z1 = x * Math.sin(radY) + z * Math.cos(radY)
    // X軸回転
    const y1 = y * Math.cos(radX) - z1 * Math.sin(radX)
    const z2 = y * Math.sin(radX) + z1 * Math.cos(radX)
    return [x1, y1, z2]
  })

  // 投影 (簡易パース)
  const scale = 30
  const points = rotated.map(([x, y]) => ({
    x: 50 + x * scale,
    y: 50 + y * scale,
  }))

  return points
}

function PhotoAnnotator({ photo, annotations = [], onChange, onClose }) {
  const [items, setItems] = useState(annotations)
  const [selectedType, setSelectedType] = useState('arrow')
  const [selectedColor, setSelectedColor] = useState('#FF0000')
  const [selectedSize, setSelectedSize] = useState(7)
  const [selectedStroke, setSelectedStroke] = useState(6)
  const [textInput, setTextInput] = useState('')
  const [selectedTextSize, setSelectedTextSize] = useState(18)
  const [activeIndex, setActiveIndex] = useState(null)
  const [editingIndex, setEditingIndex] = useState(null)
  const [mode, setMode] = useState(null)
  const [startPos, setStartPos] = useState({ x: 0, y: 0 })
  const [startItem, setStartItem] = useState(null)
  const [hasDragged, setHasDragged] = useState(false)
  const containerRef = useRef(null)

  const addAnnotation = () => {
    if (selectedType === 'text') {
      if (!textInput.trim()) return
      const newItem = {
        type: 'text',
        text: textInput,
        color: selectedColor,
        x: 50,
        y: 50,
        fontSize: selectedTextSize,
        rotation: 0,
      }
      setItems([...items, newItem])
      setTextInput('')
    } else {
      const newItem = {
        type: selectedType,
        color: selectedColor,
        x: 50,
        y: 50,
        width: selectedSize * 2,
        height: selectedSize * 1.5,
        rotation: 0,
        stroke: selectedStroke,
        rotateX: selectedType === 'box3d' ? 25 : undefined,
        rotateY: selectedType === 'box3d' ? 35 : undefined,
      }
      setItems([...items, newItem])
    }
  }

  const removeAnnotation = (index) => {
    setItems(items.filter((_, i) => i !== index))
    if (editingIndex === index) setEditingIndex(null)
  }

  const updateAnnotation = (index, updates) => {
    const updated = [...items]
    updated[index] = { ...updated[index], ...updates }
    setItems(updated)
  }

  const getPosition = (e) => {
    // 写真の実際の表示領域を基準に計算する
    const img = containerRef.current.querySelector('img')
    if (!img) return { x: 50, y: 50 }
    const rect = img.getBoundingClientRect()
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

    let autoMode = 'move'
    if (item.type !== 'text') {
      const relX = (pos.x - item.x) / (item.width / 2)
      const relY = (pos.y - item.y) / (item.height / 2)
      const dist = Math.sqrt(relX * relX + relY * relY)
      if (dist >= 0.5) {
        if (relX > 0.3 && relY < -0.3) {
          autoMode = 'rotate'
        } else {
          autoMode = 'resize'
        }
      }
    }

    setActiveIndex(index)
    setMode(autoMode)
    setStartPos(pos)
    setStartItem({ ...item })
    setHasDragged(false)
  }

  const handleRotateStart = (e, index) => {
    e.preventDefault()
    e.stopPropagation()
    setActiveIndex(index)
    setMode('rotate')
    setStartPos(getPosition(e))
    setStartItem({ ...items[index] })
    setHasDragged(false)
  }

  const handlePointerMove = (e) => {
    if (activeIndex === null || !startItem) return
    e.preventDefault()
    setHasDragged(true)
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

  const handlePointerUp = (e) => {
    if (activeIndex !== null && !hasDragged) {
      setEditingIndex(activeIndex)
      // クリックイベントのバブルを防ぐためにフラグを使用
      e?.stopPropagation?.()
    }
    setActiveIndex(null)
    setMode(null)
    setStartItem(null)
  }

  const handleContainerClick = (e) => {
    // 記号上でなく背景をクリックした場合のみ編集パネルを閉じる
    if (e.target === containerRef.current || e.target.tagName === 'IMG') {
      setEditingIndex(null)
    }
  }

  const handleSave = () => {
    onChange(items)
    onClose()
  }

  const renderAnnotation = (item, index) => {
    const isEditing = editingIndex === index

    if (item.type === 'text') {
      const style = {
        position: 'absolute',
        left: `${item.x}%`,
        top: `${item.y}%`,
        transform: `translate(-50%, -50%) rotate(${item.rotation || 0}deg)`,
        color: item.color,
        fontSize: `${item.fontSize || 18}px`,
        fontWeight: 'bold',
        textShadow: item.color === '#000000' ? '0 0 3px white' : '0 0 3px rgba(0,0,0,0.7)',
        whiteSpace: 'nowrap',
        cursor: 'grab',
        touchAction: 'none',
        userSelect: 'none',
        zIndex: activeIndex === index ? 20 : 10,
        outline: isEditing ? '2px solid #3b82f6' : 'none',
        padding: '2px 4px',
      }
      return (
        <div key={index} style={style}
          onMouseDown={(e) => handleMoveStart(e, index)}
          onTouchStart={(e) => handleMoveStart(e, index)}
        >
          {item.text}
          {isEditing && (
            <button
              onClick={(e) => { e.stopPropagation(); removeAnnotation(index) }}
              className="absolute -top-2 -left-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center"
              style={{ fontSize: '14px', touchAction: 'none' }}
            >×</button>
          )}
        </div>
      )
    }

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
      outline: isEditing ? '2px solid #3b82f6' : 'none',
    }

    return (
      <div key={index} style={style}>
        <div
          className="w-full h-full"
          onMouseDown={(e) => handleMoveStart(e, index)}
          onTouchStart={(e) => handleMoveStart(e, index)}
        >
          <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
            {renderShape(item)}
          </svg>
        </div>
        {isEditing && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); removeAnnotation(index) }}
              className="absolute -top-2 -left-2 bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center font-bold"
              style={{ touchAction: 'none', fontSize: '16px' }}
            >×</button>
            <div
              className="absolute -top-2 -right-2 w-7 h-7 bg-white border-2 border-green-500 rounded-full cursor-crosshair flex items-center justify-center"
              onMouseDown={(e) => handleRotateStart(e, index)}
              onTouchStart={(e) => handleRotateStart(e, index)}
              style={{ touchAction: 'none', fontSize: '14px' }}
            >↻</div>
          </>
        )}
      </div>
    )
  }

  const renderShape = (item) => {
    const strokeWidth = item.stroke || 5
    switch (item.type) {
      case 'arrow':
        return (<>
          <line x1="5" y1="50" x2="75" y2="50" stroke={item.color} strokeWidth={strokeWidth} />
          <polygon points="70,30 95,50 70,70" fill={item.color} />
        </>)
      case 'line':
        return <line x1="5" y1="50" x2="95" y2="50" stroke={item.color} strokeWidth={strokeWidth} />
      case 'dashed':
        return <line x1="5" y1="50" x2="95" y2="50" stroke={item.color} strokeWidth={strokeWidth} strokeDasharray={`${strokeWidth * 2} ${strokeWidth * 2}`} />
      case 'rect':
        return <rect x="5" y="5" width="90" height="90" stroke={item.color} strokeWidth={strokeWidth} fill="none" />
      case 'box3d': {
        const pts = getBox3DPoints(item.rotateX || 25, item.rotateY || 35)
        return (<>
          {/* 前面 */}
          <line x1={pts[0].x} y1={pts[0].y} x2={pts[1].x} y2={pts[1].y} stroke={item.color} strokeWidth={strokeWidth} />
          <line x1={pts[1].x} y1={pts[1].y} x2={pts[2].x} y2={pts[2].y} stroke={item.color} strokeWidth={strokeWidth} />
          <line x1={pts[2].x} y1={pts[2].y} x2={pts[3].x} y2={pts[3].y} stroke={item.color} strokeWidth={strokeWidth} />
          <line x1={pts[3].x} y1={pts[3].y} x2={pts[0].x} y2={pts[0].y} stroke={item.color} strokeWidth={strokeWidth} />
          {/* 背面 */}
          <line x1={pts[4].x} y1={pts[4].y} x2={pts[5].x} y2={pts[5].y} stroke={item.color} strokeWidth={strokeWidth} strokeDasharray={`${strokeWidth * 2}`} />
          <line x1={pts[5].x} y1={pts[5].y} x2={pts[6].x} y2={pts[6].y} stroke={item.color} strokeWidth={strokeWidth} strokeDasharray={`${strokeWidth * 2}`} />
          <line x1={pts[6].x} y1={pts[6].y} x2={pts[7].x} y2={pts[7].y} stroke={item.color} strokeWidth={strokeWidth} strokeDasharray={`${strokeWidth * 2}`} />
          <line x1={pts[7].x} y1={pts[7].y} x2={pts[4].x} y2={pts[4].y} stroke={item.color} strokeWidth={strokeWidth} strokeDasharray={`${strokeWidth * 2}`} />
          {/* 接続線 */}
          <line x1={pts[0].x} y1={pts[0].y} x2={pts[4].x} y2={pts[4].y} stroke={item.color} strokeWidth={strokeWidth} />
          <line x1={pts[1].x} y1={pts[1].y} x2={pts[5].x} y2={pts[5].y} stroke={item.color} strokeWidth={strokeWidth} />
          <line x1={pts[2].x} y1={pts[2].y} x2={pts[6].x} y2={pts[6].y} stroke={item.color} strokeWidth={strokeWidth} strokeDasharray={`${strokeWidth * 2}`} />
          <line x1={pts[3].x} y1={pts[3].y} x2={pts[7].x} y2={pts[7].y} stroke={item.color} strokeWidth={strokeWidth} />
        </>)
      }
      case 'circle':
        return <ellipse cx="50" cy="50" rx="45" ry="45" stroke={item.color} strokeWidth={strokeWidth} fill="none" />
      case 'cross':
        return (<>
          <line x1="10" y1="10" x2="90" y2="90" stroke={item.color} strokeWidth={strokeWidth} />
          <line x1="90" y1="10" x2="10" y2="90" stroke={item.color} strokeWidth={strokeWidth} />
        </>)
      default:
        return null
    }
  }

  // 編集パネルの内容
  const renderEditPanel = () => {
    if (editingIndex === null || !items[editingIndex]) return null
    const item = items[editingIndex]
    const isText = item.type === 'text'

    return (
      <div className="bg-yellow-50 px-2 py-2 flex flex-wrap items-center gap-2 border-b border-yellow-300">
        <span className="text-xs font-bold text-yellow-800">
          {isText ? `文字「${item.text}」を編集:` : `記号${editingIndex + 1}を編集:`}
        </span>
        <span className="text-xs text-gray-600">色:</span>
        {COLORS.map((color) => (
          <button
            key={color}
            onClick={() => updateAnnotation(editingIndex, { color })}
            className={`w-5 h-5 rounded-full border-2 ${item.color === color ? 'border-gray-800 scale-110' : 'border-gray-300'}`}
            style={{ backgroundColor: color }}
          />
        ))}
        {isText ? (
          <>
            <span className="text-xs text-gray-600 ml-2">サイズ:</span>
            {TEXT_SIZES.map((s) => (
              <button
                key={s.value}
                onClick={() => updateAnnotation(editingIndex, { fontSize: s.value })}
                className={`px-2 py-0.5 rounded text-xs border ${item.fontSize === s.value ? 'bg-yellow-600 text-white border-yellow-600' : 'bg-white text-gray-700 border-gray-300'}`}
              >{s.label}</button>
            ))}
            <input
              type="text"
              value={item.text}
              onChange={(e) => updateAnnotation(editingIndex, { text: e.target.value })}
              className="ml-2 border border-gray-300 rounded px-2 py-0.5 text-xs w-24"
            />
          </>
        ) : item.type === 'box3d' ? (
          <>
            <span className="text-xs text-gray-600 ml-1">太さ:</span>
            {STROKES.map((s) => (
              <button
                key={s.value}
                onClick={() => updateAnnotation(editingIndex, { stroke: s.value })}
                className={`px-2 py-0.5 rounded text-xs border ${item.stroke === s.value ? 'bg-yellow-600 text-white border-yellow-600' : 'bg-white text-gray-700 border-gray-300'}`}
              >{s.label}</button>
            ))}
            <div className="flex items-center gap-1 ml-2 w-full mt-1">
              <span className="text-xs text-gray-600 whitespace-nowrap">横回転:</span>
              <input type="range" min="-90" max="90" value={item.rotateY || 35}
                onChange={(e) => updateAnnotation(editingIndex, { rotateY: Number(e.target.value) })}
                className="flex-1 h-4"
              />
              <span className="text-xs text-gray-600 whitespace-nowrap ml-2">縦回転:</span>
              <input type="range" min="-90" max="90" value={item.rotateX || 25}
                onChange={(e) => updateAnnotation(editingIndex, { rotateX: Number(e.target.value) })}
                className="flex-1 h-4"
              />
            </div>
          </>
        ) : (
          <>
            <span className="text-xs text-gray-600 ml-2">太さ:</span>
            {STROKES.map((s) => (
              <button
                key={s.value}
                onClick={() => updateAnnotation(editingIndex, { stroke: s.value })}
                className={`px-2 py-0.5 rounded text-xs border ${item.stroke === s.value ? 'bg-yellow-600 text-white border-yellow-600' : 'bg-white text-gray-700 border-gray-300'}`}
              >{s.label}</button>
            ))}
          </>
        )}
        <button onClick={() => setEditingIndex(null)} className="ml-auto text-xs text-gray-500 underline">閉じる</button>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex flex-col z-50">
      {/* ツールバー */}
      <div className="bg-white p-2 flex flex-wrap items-center gap-1 shadow-lg">
        <span className="text-xs font-medium text-gray-700 mr-1">追加:</span>
        {ANNOTATION_TYPES.map((type) => (
          <button
            key={type.id}
            onClick={() => setSelectedType(type.id)}
            className={`px-2 py-1 rounded text-xs border ${selectedType === type.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-100 text-gray-700 border-gray-300'}`}
          >{type.label}</button>
        ))}
      </div>

      {/* 色・サイズ・追加 */}
      <div className="bg-white px-2 pb-2 flex flex-wrap items-center gap-2 border-b">
        <span className="text-xs text-gray-600">色:</span>
        {COLORS.map((color) => (
          <button
            key={color}
            onClick={() => setSelectedColor(color)}
            className={`w-5 h-5 rounded-full border-2 ${selectedColor === color ? 'border-gray-800 scale-110' : 'border-gray-300'}`}
            style={{ backgroundColor: color }}
          />
        ))}
        {selectedType === 'text' ? (
          <>
            <span className="text-xs text-gray-600 ml-2">サイズ:</span>
            {TEXT_SIZES.map((s) => (
              <button key={s.value} onClick={() => setSelectedTextSize(s.value)}
                className={`px-2 py-0.5 rounded text-xs border ${selectedTextSize === s.value ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-100 text-gray-700 border-gray-300'}`}
              >{s.label}</button>
            ))}
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="文字を入力"
              className="ml-2 border border-gray-300 rounded px-2 py-0.5 text-xs w-24"
            />
          </>
        ) : (
          <>
            <span className="text-xs text-gray-600 ml-2">サイズ:</span>
            {SIZES.map((size) => (
              <button key={size.value} onClick={() => setSelectedSize(size.value)}
                className={`px-2 py-0.5 rounded text-xs border ${selectedSize === size.value ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-100 text-gray-700 border-gray-300'}`}
              >{size.label}</button>
            ))}
            <span className="text-xs text-gray-600 ml-2">太さ:</span>
            {STROKES.map((s) => (
              <button key={s.value} onClick={() => setSelectedStroke(s.value)}
                className={`px-2 py-0.5 rounded text-xs border ${selectedStroke === s.value ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-100 text-gray-700 border-gray-300'}`}
              >{s.label}</button>
            ))}
          </>
        )}
        <button onClick={addAnnotation} className="ml-auto bg-green-600 text-white px-3 py-1 rounded text-xs font-medium">＋追加</button>
      </div>

      {/* 編集パネル */}
      {renderEditPanel()}

      {/* 写真エリア */}
      <div
        className="flex-1 overflow-auto m-1 flex items-center justify-center"
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
        onClick={handleContainerClick}
      >
        <div ref={containerRef} className="relative inline-block max-w-full max-h-full">
          <img src={photo} alt="注釈対象" className="max-w-full max-h-[70vh] block" draggable={false} />
          {items.map((item, index) => renderAnnotation(item, index))}
        </div>
      </div>

      {/* 下部ボタン */}
      <div className="bg-white p-2 flex justify-between">
        <button onClick={onClose} className="btn-secondary text-sm">キャンセル</button>
        <button onClick={handleSave} className="btn-primary text-sm">✓ 保存</button>
      </div>
    </div>
  )
}

export default PhotoAnnotator
