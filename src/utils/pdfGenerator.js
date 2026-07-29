/**
 * 報告書データからPDFを生成してダウンロードする
 * Canvas APIを使って日本語テキストを描画し、画像としてPDFに埋め込む
 */
export async function generatePDF(report) {
  const { jsPDF } = await import('jspdf')

  // A4サイズ (mm)
  const pdf = new jsPDF('p', 'mm', 'a4')
  const pageWidth = 210
  const pageHeight = 297
  const margin = 5
  const contentWidth = pageWidth - margin * 2

  // Canvas設定
  const dpi = 2
  const canvasWidthPx = contentWidth * dpi * 3.78
  const pxPerMm = canvasWidthPx / contentWidth

  let currentY = margin

  // --- ヘッダー部分を描画 ---
  currentY = drawHeader(pdf, report, margin, currentY, contentWidth, canvasWidthPx, pxPerMm, dpi)

  // --- 本文 ---
  if (report.body) {
    currentY = drawBody(pdf, report.body, margin, currentY, contentWidth, canvasWidthPx, pxPerMm, dpi, pageHeight)
  }

  // --- 写真 ---
  currentY = await drawPhotos(pdf, report, margin, currentY, contentWidth, pxPerMm, dpi, pageHeight)

  // --- 季節テーマデコレーション ---
  if (report.seasonThemeEnabled) {
    const pageCount0 = pdf.getNumberOfPages()
    for (let i = 1; i <= pageCount0; i++) {
      pdf.setPage(i)
      drawSeasonDecoration(pdf, pageWidth, pageHeight)
    }
  }

  // --- フッター ---
  const pageCount = pdf.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i)
    pdf.setFontSize(8)
    pdf.setTextColor(150, 150, 150)
    pdf.text(`${i} / ${pageCount}`, pageWidth / 2, pageHeight - 8, { align: 'center' })
    pdf.setTextColor(0, 0, 0)
  }

  // ダウンロード
  const filename = `report_${report.date}_${report.title || 'untitled'}.pdf`
  pdf.save(filename)
}

/**
 * PDFを生成してFileオブジェクトとして返す（共有用）
 */
export async function generatePDFFile(report) {
  const { jsPDF } = await import('jspdf')

  const pdf = new jsPDF('p', 'mm', 'a4')
  const pageWidth = 210
  const pageHeight = 297
  const margin = 5
  const contentWidth = pageWidth - margin * 2

  const dpi = 2
  const canvasWidthPx = contentWidth * dpi * 3.78
  const pxPerMm = canvasWidthPx / contentWidth

  let currentY = margin

  currentY = drawHeader(pdf, report, margin, currentY, contentWidth, canvasWidthPx, pxPerMm, dpi)

  if (report.body) {
    currentY = drawBody(pdf, report.body, margin, currentY, contentWidth, canvasWidthPx, pxPerMm, dpi, pageHeight)
  }

  currentY = await drawPhotos(pdf, report, margin, currentY, contentWidth, pxPerMm, dpi, pageHeight)

  // --- 季節テーマデコレーション ---
  if (report.seasonThemeEnabled) {
    const pageCount0 = pdf.getNumberOfPages()
    for (let i = 1; i <= pageCount0; i++) {
      pdf.setPage(i)
      drawSeasonDecoration(pdf, pageWidth, pageHeight)
    }
  }

  const pageCount = pdf.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i)
    pdf.setFontSize(8)
    pdf.setTextColor(150, 150, 150)
    pdf.text(`${i} / ${pageCount}`, pageWidth / 2, pageHeight - 8, { align: 'center' })
    pdf.setTextColor(0, 0, 0)
  }

  const filename = `report_${report.date}_${report.title || 'untitled'}.pdf`
  const blob = pdf.output('blob')
  return new File([blob], filename, { type: 'application/pdf' })
}

/**
 * ヘッダー（タイトル、日付、利用者名）を描画
 */
function drawHeader(pdf, report, margin, currentY, contentWidth, canvasWidthPx, pxPerMm, dpi) {
  // まず高さを計算
  let hY = 40 * dpi
  hY += 20 * dpi // タイトル後
  hY += 25 * dpi // 区切り線後
  hY += 18 * dpi // 日付後
  hY += 25 * dpi // 利用者名後
  const canvasHeight = hY

  // 正しいサイズでCanvasを作成
  const headerCanvas = document.createElement('canvas')
  headerCanvas.width = canvasWidthPx
  headerCanvas.height = canvasHeight
  const ctx = headerCanvas.getContext('2d')

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, headerCanvas.width, headerCanvas.height)

  let y = 40 * dpi

  // タイトル（28pt相当）
  ctx.font = `bold ${28 * dpi}px "Hiragino Sans", "Noto Sans JP", "Yu Gothic", sans-serif`
  ctx.fillStyle = '#1a1a1a'
  ctx.textAlign = 'center'
  ctx.fillText(report.title || '報告書', headerCanvas.width / 2, y)
  y += 20 * dpi

  // 区切り線
  ctx.strokeStyle = '#4285F4'
  ctx.lineWidth = 3 * dpi
  ctx.beginPath()
  ctx.moveTo(0, y)
  ctx.lineTo(headerCanvas.width, y)
  ctx.stroke()
  y += 25 * dpi

  // 日付（16pt相当）
  ctx.font = `${16 * dpi}px "Hiragino Sans", "Noto Sans JP", "Yu Gothic", sans-serif`
  ctx.fillStyle = '#333333'
  ctx.textAlign = 'left'
  ctx.fillText(`日付: ${report.date || '-'}`, 10 * dpi, y)
  y += 18 * dpi

  // 利用者名（16pt相当）
  const authorDisplay = report.author ? `${report.author}様` : '-'
  ctx.fillText(`利用者: ${authorDisplay}`, 10 * dpi, y)

  // PDFに追加
  const headerHeightMm = canvasHeight / pxPerMm
  const headerImg = headerCanvas.toDataURL('image/png')
  pdf.addImage(headerImg, 'PNG', margin, currentY, contentWidth, headerHeightMm)

  return currentY + headerHeightMm + 5
}

/**
 * 本文を描画
 */
function drawBody(pdf, body, margin, currentY, contentWidth, canvasWidthPx, pxPerMm, dpi, pageHeight) {
  const bodyLines = wrapText(body, 35)
  const lineHeightMm = 9
  const lineHeightPx = lineHeightMm * pxPerMm

  // Canvas高さを事前に計算
  const totalHeightPx = (bodyLines.length * lineHeightPx) + 20 * dpi
  const bodyCanvas = document.createElement('canvas')
  bodyCanvas.width = canvasWidthPx
  bodyCanvas.height = totalHeightPx
  const ctx = bodyCanvas.getContext('2d')

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, bodyCanvas.width, bodyCanvas.height)
  ctx.font = `${15 * dpi}px "Hiragino Sans", "Noto Sans JP", "Yu Gothic", sans-serif`
  ctx.fillStyle = '#333333'
  ctx.textAlign = 'left'

  let textY = 15 * dpi
  for (const line of bodyLines) {
    ctx.fillText(line, 5 * dpi, textY)
    textY += lineHeightPx
  }

  const bodyHeightMm = totalHeightPx / pxPerMm

  // ページに収まるか確認
  if (currentY + bodyHeightMm > pageHeight - margin) {
    pdf.addPage()
    currentY = margin
  }

  const bodyImg = bodyCanvas.toDataURL('image/png')
  pdf.addImage(bodyImg, 'PNG', margin, currentY, contentWidth, bodyHeightMm)

  return currentY + bodyHeightMm + 5
}

/**
 * 写真とコメントを描画（グリッドレイアウト）
 */
async function drawPhotos(pdf, report, margin, currentY, contentWidth, pxPerMm, dpi, pageHeight) {
  const photoComments = report.photoComments || []
  const photoAnnotations = report.photoAnnotations || []
  const photoDateStamps = report.photoDateStamps || []
  const photoDataWithComments = []
  for (let i = 0; i < report.photos.length; i++) {
    if (report.photos[i] !== null) {
      photoDataWithComments.push({
        photo: report.photos[i],
        comment: photoComments[i] || null,
        annotations: photoAnnotations[i] || [],
        dateStamp: photoDateStamps[i] || null,
      })
    }
  }

  if (photoDataWithComments.length === 0) return currentY

  // 全写真の実際のサイズを事前に非同期で取得
  const imageSizes = await Promise.all(
    photoDataWithComments.map(({ photo }) => loadImageDimensions(photo))
  )

  if (currentY + 10 > pageHeight - margin) {
    pdf.addPage()
    currentY = margin
  }
  currentY += 3

  const layout = getPhotoLayout(photoDataWithComments.length, contentWidth)
  const commentHeightMm = 7

  // 各行ごとにコメント有無を判定
  const rowGroups = []
  let currentRowY = null
  let currentGroup = []

  for (let i = 0; i < photoDataWithComments.length; i++) {
    const pos = layout.positions[i]
    if (currentRowY === null || Math.abs(pos.y - currentRowY) > 1) {
      if (currentGroup.length > 0) {
        rowGroups.push(currentGroup)
      }
      currentGroup = [i]
      currentRowY = pos.y
    } else {
      currentGroup.push(i)
    }
  }
  if (currentGroup.length > 0) {
    rowGroups.push(currentGroup)
  }

  let offsetY = 0

  for (const group of rowGroups) {
    const rowHasComment = group.some(i => photoDataWithComments[i].comment)
    const rowCommentOffset = rowHasComment ? commentHeightMm : 0

    for (const i of group) {
      const { photo, comment, annotations, dateStamp } = photoDataWithComments[i]
      const pos = layout.positions[i]
      const photoY = currentY + pos.y + offsetY + rowCommentOffset

      // 新しいページが必要か確認
      if (photoY + pos.h > pageHeight - margin) {
        pdf.addPage()
        currentY = margin
        offsetY = -(pos.y)
        const newPhotoY = currentY + rowCommentOffset

        if (comment) {
          drawCommentLabel(pdf, comment, margin + pos.x, currentY, pos.w, commentHeightMm, pxPerMm, dpi)
        }

        try {
          const imgProps = imageSizes[i]
          const fitted = fitImageInBox(pos.w, pos.h, imgProps.width, imgProps.height)
          pdf.addImage(photo, 'JPEG', margin + pos.x + fitted.offsetX, newPhotoY + fitted.offsetY, fitted.w, fitted.h)
          if (annotations.length > 0) {
            drawAnnotationsOnPhoto(pdf, annotations, margin + pos.x + fitted.offsetX, newPhotoY + fitted.offsetY, fitted.w, fitted.h)
          }
          // 日付スタンプ
          if (dateStamp && dateStamp.text) {
            drawDateStamp(pdf, dateStamp, margin + pos.x + fitted.offsetX, newPhotoY + fitted.offsetY, fitted.w, fitted.h, pxPerMm, dpi)
          }
        } catch (error) {
          pdf.setDrawColor(200, 200, 200)
          pdf.rect(margin + pos.x, newPhotoY, pos.w, pos.h)
        }
        continue
      }

      if (comment) {
        const commentY = photoY - commentHeightMm
        drawCommentLabel(pdf, comment, margin + pos.x, commentY, pos.w, commentHeightMm, pxPerMm, dpi)
      }

      try {
        const imgProps = imageSizes[i]
        const fitted = fitImageInBox(pos.w, pos.h, imgProps.width, imgProps.height)
        pdf.addImage(photo, 'JPEG', margin + pos.x + fitted.offsetX, photoY + fitted.offsetY, fitted.w, fitted.h)
        if (annotations.length > 0) {
          drawAnnotationsOnPhoto(pdf, annotations, margin + pos.x + fitted.offsetX, photoY + fitted.offsetY, fitted.w, fitted.h)
        }
        // 日付スタンプ
        if (dateStamp && dateStamp.text) {
          drawDateStamp(pdf, dateStamp, margin + pos.x + fitted.offsetX, photoY + fitted.offsetY, fitted.w, fitted.h, pxPerMm, dpi)
        }
      } catch (error) {
        pdf.setDrawColor(200, 200, 200)
        pdf.rect(margin + pos.x, photoY, pos.w, pos.h)
      }
    }

    offsetY += rowCommentOffset
  }

  currentY += layout.totalHeight + offsetY
  return currentY
}

/**
 * コメントラベルを描画するヘルパー
 */
function drawCommentLabel(pdf, comment, x, y, width, height, pxPerMm, dpi) {
  const commentWidthPx = width * pxPerMm
  const commentHeightPx = height * pxPerMm
  const commentCanvas = document.createElement('canvas')
  commentCanvas.width = commentWidthPx
  commentCanvas.height = commentHeightPx
  const cCtx = commentCanvas.getContext('2d')

  cCtx.fillStyle = '#ffffff'
  cCtx.fillRect(0, 0, commentCanvas.width, commentCanvas.height)
  cCtx.font = `bold ${13 * dpi}px "Hiragino Sans", "Noto Sans JP", "Yu Gothic", sans-serif`
  cCtx.fillStyle = '#333333'
  cCtx.textAlign = 'center'
  cCtx.fillText(comment, commentWidthPx / 2, commentHeightPx * 0.7)

  const commentImg = commentCanvas.toDataURL('image/png')
  pdf.addImage(commentImg, 'PNG', x, y, width, height)
}

/**
 * テキストを指定文字数で折り返す
 */
function wrapText(text, charsPerLine) {
  const lines = []
  const paragraphs = text.split('\n')

  for (const paragraph of paragraphs) {
    if (paragraph.length === 0) {
      lines.push('')
      continue
    }
    let remaining = paragraph
    while (remaining.length > 0) {
      if (remaining.length <= charsPerLine) {
        lines.push(remaining)
        break
      }
      lines.push(remaining.substring(0, charsPerLine))
      remaining = remaining.substring(charsPerLine)
    }
  }
  return lines
}

/**
 * 写真のレイアウト位置を計算
 */
function getPhotoLayout(count, availableWidth) {
  const gap = 2
  const positions = []
  let totalHeight = 0

  switch (count) {
    case 1: {
      const w = availableWidth
      const h = w * 0.9
      positions.push({ x: 0, y: 0, w, h })
      totalHeight = h
      break
    }
    case 2: {
      const w = (availableWidth - gap) / 2
      const h = w * 0.9
      positions.push({ x: 0, y: 0, w, h })
      positions.push({ x: w + gap, y: 0, w, h })
      totalHeight = h
      break
    }
    case 3: {
      const w1 = availableWidth * 0.75
      const h1 = w1 * 0.85
      positions.push({ x: (availableWidth - w1) / 2, y: 0, w: w1, h: h1 })

      const w2 = (availableWidth - gap) / 2
      const h2 = w2 * 0.85
      positions.push({ x: 0, y: h1 + gap, w: w2, h: h2 })
      positions.push({ x: w2 + gap, y: h1 + gap, w: w2, h: h2 })
      totalHeight = h1 + gap + h2
      break
    }
    case 4: {
      const w = (availableWidth - gap) / 2
      const h = w * 0.85
      positions.push({ x: 0, y: 0, w, h })
      positions.push({ x: w + gap, y: 0, w, h })
      positions.push({ x: 0, y: h + gap, w, h })
      positions.push({ x: w + gap, y: h + gap, w, h })
      totalHeight = h * 2 + gap
      break
    }
    case 5: {
      const w2 = (availableWidth - gap) / 2
      const h2 = w2 * 0.8
      positions.push({ x: 0, y: 0, w: w2, h: h2 })
      positions.push({ x: w2 + gap, y: 0, w: w2, h: h2 })

      const w3 = (availableWidth - gap * 2) / 3
      const h3 = w3 * 0.85
      positions.push({ x: 0, y: h2 + gap, w: w3, h: h3 })
      positions.push({ x: w3 + gap, y: h2 + gap, w: w3, h: h3 })
      positions.push({ x: (w3 + gap) * 2, y: h2 + gap, w: w3, h: h3 })
      totalHeight = h2 + gap + h3
      break
    }
    case 6: {
      const w = (availableWidth - gap * 2) / 3
      const h = w * 0.85
      for (let row = 0; row < 2; row++) {
        for (let col = 0; col < 3; col++) {
          positions.push({
            x: col * (w + gap),
            y: row * (h + gap),
            w,
            h,
          })
        }
      }
      totalHeight = h * 2 + gap
      break
    }
    default: {
      const w = (availableWidth - gap) / 2
      const h = w * 0.85
      for (let i = 0; i < count; i++) {
        const row = Math.floor(i / 2)
        const col = i % 2
        positions.push({
          x: col * (w + gap),
          y: row * (h + gap),
          w,
          h,
        })
      }
      totalHeight = Math.ceil(count / 2) * (h + gap)
      break
    }
  }

  return { positions, totalHeight }
}

/**
 * Base64画像のサイズを非同期で取得する
 */
function loadImageDimensions(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
    }
    img.onerror = () => {
      resolve({ width: 4, height: 3 }) // フォールバック
    }
    img.src = dataUrl
  })
}

/**
 * 画像をボックス内にアスペクト比を保持して収める
 * 幅いっぱいに使い、高さは比率に応じて決定
 */
function fitImageInBox(boxW, boxH, imgW, imgH) {
  const imgRatio = imgW / imgH

  // 幅いっぱいに使う
  let w = boxW
  let h = boxW / imgRatio

  // 高さがボックスを超える場合は高さに合わせる
  if (h > boxH) {
    h = boxH
    w = boxH * imgRatio
  }

  const offsetX = (boxW - w) / 2
  const offsetY = (boxH - h) / 2

  return { w, h, offsetX, offsetY }
}


/**
 * 写真上に注釈を描画する
 * annotations: [{type, color, x, y, width, height, rotation, stroke}]
 * photoX, photoY, photoW, photoH: PDF上の写真の位置とサイズ（mm）
 */
function drawAnnotationsOnPhoto(pdf, annotations, photoX, photoY, photoW, photoH) {
  for (const ann of annotations) {
    const centerX = photoX + (ann.x / 100) * photoW
    const centerY = photoY + (ann.y / 100) * photoH

    // テキスト注釈
    if (ann.type === 'text') {
      const fontSize = (ann.fontSize || 18) * 0.7
      const canvasW = fontSize * ann.text.length * 4
      const canvasH = fontSize * 6
      const canvas = document.createElement('canvas')
      canvas.width = canvasW
      canvas.height = canvasH
      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, canvasW, canvasH)

      if (ann.rotation) {
        ctx.translate(canvasW / 2, canvasH / 2)
        ctx.rotate((ann.rotation * Math.PI) / 180)
        ctx.translate(-canvasW / 2, -canvasH / 2)
      }

      ctx.font = `bold ${fontSize * 3}px "Hiragino Sans", "Noto Sans JP", "Yu Gothic", sans-serif`
      ctx.fillStyle = ann.color
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      if (ann.color !== '#000000') {
        ctx.shadowColor = 'rgba(0,0,0,0.7)'
        ctx.shadowBlur = fontSize * 0.4
      } else {
        ctx.shadowColor = 'rgba(255,255,255,0.7)'
        ctx.shadowBlur = fontSize * 0.4
      }
      ctx.fillText(ann.text, canvasW / 2, canvasH / 2)

      const textW = fontSize * ann.text.length * 0.7
      const textH = fontSize * 1.2
      const imgData = canvas.toDataURL('image/png')
      pdf.addImage(imgData, 'PNG', centerX - textW / 2, centerY - textH / 2, textW, textH)
      continue
    }

    // 記号注釈
    const annW = (ann.width / 100) * photoW
    const annH = (ann.height / 100) * photoH
    const strokeWidth = (ann.stroke || 5) * 0.15 // PDFのmm単位に変換
    const rotation = ann.rotation || 0

    pdf.setDrawColor(ann.color)
    pdf.setLineWidth(strokeWidth)

    // 回転を考慮した描画
    // jsPDFでは回転描画が直接サポートされていないため、
    // Canvasで描画してから画像として貼り付ける
    const canvasSize = 200
    const canvas = document.createElement('canvas')
    canvas.width = canvasSize
    canvas.height = canvasSize
    const ctx = canvas.getContext('2d')

    // 背景透明
    ctx.clearRect(0, 0, canvasSize, canvasSize)

    // 回転
    ctx.translate(canvasSize / 2, canvasSize / 2)
    ctx.rotate((rotation * Math.PI) / 180)
    ctx.translate(-canvasSize / 2, -canvasSize / 2)

    // 記号を描画
    const sw = (ann.stroke || 5) * 1.5
    ctx.strokeStyle = ann.color
    ctx.fillStyle = ann.color
    ctx.lineWidth = sw
    ctx.lineCap = 'round'

    switch (ann.type) {
      case 'arrow':
        ctx.beginPath()
        ctx.moveTo(10, canvasSize / 2)
        ctx.lineTo(canvasSize * 0.75, canvasSize / 2)
        ctx.stroke()
        // 矢印の先端
        ctx.beginPath()
        ctx.moveTo(canvasSize * 0.7, canvasSize * 0.3)
        ctx.lineTo(canvasSize * 0.95, canvasSize / 2)
        ctx.lineTo(canvasSize * 0.7, canvasSize * 0.7)
        ctx.closePath()
        ctx.fill()
        break
      case 'line':
        ctx.beginPath()
        ctx.moveTo(10, canvasSize / 2)
        ctx.lineTo(canvasSize - 10, canvasSize / 2)
        ctx.stroke()
        break
      case 'dashed':
        ctx.setLineDash([sw * 3, sw * 3])
        ctx.beginPath()
        ctx.moveTo(10, canvasSize / 2)
        ctx.lineTo(canvasSize - 10, canvasSize / 2)
        ctx.stroke()
        ctx.setLineDash([])
        break
      case 'rect':
        ctx.strokeRect(10, 10, canvasSize - 20, canvasSize - 20)
        break
      case 'box3d':
        // 前面
        ctx.strokeRect(canvasSize * 0.05, canvasSize * 0.3, canvasSize * 0.55, canvasSize * 0.65)
        // 背面（点線）
        ctx.setLineDash([sw * 3, sw * 3])
        ctx.strokeRect(canvasSize * 0.4, canvasSize * 0.05, canvasSize * 0.55, canvasSize * 0.65)
        ctx.setLineDash([])
        // 奥行き線（前面→背面の4辺）
        ctx.beginPath()
        ctx.moveTo(canvasSize * 0.05, canvasSize * 0.3)
        ctx.lineTo(canvasSize * 0.4, canvasSize * 0.05)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(canvasSize * 0.6, canvasSize * 0.3)
        ctx.lineTo(canvasSize * 0.95, canvasSize * 0.05)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(canvasSize * 0.6, canvasSize * 0.95)
        ctx.lineTo(canvasSize * 0.95, canvasSize * 0.7)
        ctx.stroke()
        // 奥の辺（点線）
        ctx.setLineDash([sw * 3, sw * 3])
        ctx.beginPath()
        ctx.moveTo(canvasSize * 0.05, canvasSize * 0.95)
        ctx.lineTo(canvasSize * 0.4, canvasSize * 0.7)
        ctx.stroke()
        ctx.setLineDash([])
        break
      case 'circle':
        ctx.beginPath()
        ctx.ellipse(canvasSize / 2, canvasSize / 2, canvasSize / 2 - 10, canvasSize / 2 - 10, 0, 0, Math.PI * 2)
        ctx.stroke()
        break
      case 'cross':
        ctx.beginPath()
        ctx.moveTo(15, 15)
        ctx.lineTo(canvasSize - 15, canvasSize - 15)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(canvasSize - 15, 15)
        ctx.lineTo(15, canvasSize - 15)
        ctx.stroke()
        break
    }

    // CanvasをPDFに貼り付け（PNG透過対応）
    const imgData = canvas.toDataURL('image/png')
    const drawX = centerX - annW / 2
    const drawY = centerY - annH / 2
    pdf.addImage(imgData, 'PNG', drawX, drawY, annW, annH)
  }
}


/**
 * 写真上に日付スタンプを描画する
 */
function drawDateStamp(pdf, dateStamp, photoX, photoY, photoW, photoH, pxPerMm, dpi) {
  const x = photoX + (dateStamp.x / 100) * photoW
  const y = photoY + (dateStamp.y / 100) * photoH
  const fontSize = dateStamp.size * 0.8 // PDF用に調整

  // Canvasで日付テキストを描画
  const canvas = document.createElement('canvas')
  const textPx = fontSize * dpi * 2
  canvas.width = textPx * dateStamp.text.length * 0.7
  canvas.height = textPx * 1.4
  const ctx = canvas.getContext('2d')

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.font = `bold ${textPx}px "Hiragino Sans", "Noto Sans JP", "Yu Gothic", sans-serif`
  ctx.fillStyle = dateStamp.color
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  // 影（読みやすくするため）
  if (dateStamp.color !== '#000000') {
    ctx.shadowColor = 'rgba(0,0,0,0.7)'
    ctx.shadowBlur = textPx * 0.15
  } else {
    ctx.shadowColor = 'rgba(255,255,255,0.7)'
    ctx.shadowBlur = textPx * 0.15
  }

  ctx.fillText(dateStamp.text, canvas.width / 2, canvas.height / 2)

  const stampW = (canvas.width / pxPerMm) * 0.5
  const stampH = (canvas.height / pxPerMm) * 0.5
  const imgData = canvas.toDataURL('image/png')
  pdf.addImage(imgData, 'PNG', x - stampW / 2, y - stampH / 2, stampW, stampH)
}


/**
 * 季節デコレーションをPDFページに描画
 */
function drawSeasonDecoration(pdf, pageWidth, pageHeight) {
  const month = new Date().getMonth() + 1
  let decorations, color

  if (month >= 3 && month <= 5) {
    decorations = ['🌸', '🌷', '🦋']
    color = [244, 114, 182] // pink
  } else if (month >= 6 && month <= 8) {
    decorations = ['🍉', '🌊', '🐚', '☀️']
    color = [6, 182, 212] // cyan
  } else if (month >= 9 && month <= 11) {
    decorations = ['🍁', '🍂', '🌾']
    color = [249, 115, 22] // orange
  } else {
    decorations = ['❄️', '⛄', '✨']
    color = [79, 70, 229] // indigo
  }

  // Canvasで絵文字を描画して画像としてPDFに配置
  const canvas = document.createElement('canvas')
  canvas.width = 60
  canvas.height = 60
  const ctx = canvas.getContext('2d')

  // 四隅と辺にデコレーションを配置
  const positions = [
    { x: 3, y: 3 },
    { x: pageWidth - 10, y: 3 },
    { x: 3, y: pageHeight - 12 },
    { x: pageWidth - 10, y: pageHeight - 12 },
    { x: pageWidth / 2 - 3, y: 3 },
    { x: pageWidth / 2 - 3, y: pageHeight - 12 },
  ]

  for (let i = 0; i < positions.length; i++) {
    const emoji = decorations[i % decorations.length]
    ctx.clearRect(0, 0, 60, 60)
    ctx.font = '40px serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(emoji, 30, 30)

    const imgData = canvas.toDataURL('image/png')
    pdf.addImage(imgData, 'PNG', positions[i].x, positions[i].y, 7, 7)
  }
}
