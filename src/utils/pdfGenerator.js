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
 * 写真とコメントを描画（写真の元のアスペクト比で幅いっぱいに表示）
 */
async function drawPhotos(pdf, report, margin, currentY, contentWidth, pxPerMm, dpi, pageHeight) {
  const photoComments = report.photoComments || []
  const photoAnnotations = report.photoAnnotations || []
  const photoDataWithComments = []
  for (let i = 0; i < report.photos.length; i++) {
    if (report.photos[i] !== null) {
      photoDataWithComments.push({
        photo: report.photos[i],
        comment: photoComments[i] || null,
        annotations: photoAnnotations[i] || [],
      })
    }
  }

  if (photoDataWithComments.length === 0) return currentY

  // 全写真の実際のサイズを事前に非同期で取得
  const imageSizes = await Promise.all(
    photoDataWithComments.map(({ photo }) => loadImageDimensions(photo))
  )

  const commentHeightMm = 7
  const gap = 3

  // 写真を1枚ずつ、実際のアスペクト比で幅いっぱいに配置
  for (let i = 0; i < photoDataWithComments.length; i++) {
    const { photo, comment, annotations } = photoDataWithComments[i]
    const imgProps = imageSizes[i]
    const imgRatio = imgProps.width / imgProps.height

    // 幅いっぱいに使い、高さはアスペクト比で計算
    let photoW = contentWidth
    let photoH = contentWidth / imgRatio

    // 高さがページに収まらない場合はページ高さに合わせる
    const maxH = pageHeight - margin * 2 - (comment ? commentHeightMm : 0)
    if (photoH > maxH) {
      photoH = maxH
      photoW = maxH * imgRatio
    }

    // コメント分の高さ
    const extraTop = comment ? commentHeightMm : 0
    const totalNeeded = extraTop + photoH + gap

    // ページに収まるか確認
    if (currentY + totalNeeded > pageHeight - margin) {
      pdf.addPage()
      currentY = margin
    }

    // コメントを写真の真上に描画
    if (comment) {
      drawCommentLabel(pdf, comment, margin, currentY, photoW, commentHeightMm, pxPerMm, dpi)
      currentY += commentHeightMm
    }

    // 写真を中央寄せで描画
    const photoX = margin + (contentWidth - photoW) / 2

    try {
      pdf.addImage(photo, 'JPEG', photoX, currentY, photoW, photoH)
      // 注釈を描画
      if (annotations.length > 0) {
        drawAnnotationsOnPhoto(pdf, annotations, photoX, currentY, photoW, photoH)
      }
    } catch (error) {
      pdf.setDrawColor(200, 200, 200)
      pdf.rect(photoX, currentY, photoW, photoH)
    }

    currentY += photoH + gap
  }

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
  cCtx.font = `${11 * dpi}px "Hiragino Sans", "Noto Sans JP", "Yu Gothic", sans-serif`
  cCtx.fillStyle = '#444444'
  cCtx.textAlign = 'left'
  cCtx.fillText(comment, 2 * dpi, commentHeightPx * 0.7)

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
    // 注釈の位置を写真座標系からPDF座標系に変換
    // ann.x, ann.y はパーセント（0-100）で中心位置
    const centerX = photoX + (ann.x / 100) * photoW
    const centerY = photoY + (ann.y / 100) * photoH
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
      case 'rect':
        ctx.strokeRect(10, 10, canvasSize - 20, canvasSize - 20)
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
