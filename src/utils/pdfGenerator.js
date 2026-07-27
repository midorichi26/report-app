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
  const margin = 15
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
  currentY = drawPhotos(pdf, report, margin, currentY, contentWidth, pxPerMm, dpi, pageHeight)

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
 * 写真とコメントを描画
 */
function drawPhotos(pdf, report, margin, currentY, contentWidth, pxPerMm, dpi, pageHeight) {
  const photoComments = report.photoComments || []
  const photoDataWithComments = []
  for (let i = 0; i < report.photos.length; i++) {
    if (report.photos[i] !== null) {
      photoDataWithComments.push({
        photo: report.photos[i],
        comment: photoComments[i] || null,
      })
    }
  }

  if (photoDataWithComments.length === 0) return currentY

  if (currentY + 10 > pageHeight - margin) {
    pdf.addPage()
    currentY = margin
  }
  currentY += 5

  const layout = getPhotoLayout(photoDataWithComments.length, contentWidth)
  const commentHeightMm = 7

  // 各行ごとにコメント有無を判定し、行全体にコメント分のオフセットを適用
  // まず、同じY座標（同じ行）の写真をグループ化する
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

  // 各行ごとに描画し、コメントがある行は行全体にオフセットを追加
  let offsetY = 0

  for (const group of rowGroups) {
    // この行にコメントがあるか判定
    const rowHasComment = group.some(i => photoDataWithComments[i].comment)
    const rowCommentOffset = rowHasComment ? commentHeightMm : 0

    for (const i of group) {
      const { photo, comment } = photoDataWithComments[i]
      const pos = layout.positions[i]
      const photoY = currentY + pos.y + offsetY + rowCommentOffset

      // 新しいページが必要か確認
      if (photoY + pos.h > pageHeight - margin) {
        pdf.addPage()
        currentY = margin
        offsetY = -(pos.y)
        const newPhotoY = currentY + rowCommentOffset
        
        // コメントを写真の上に描画
        if (comment) {
          drawCommentLabel(pdf, comment, margin + pos.x, currentY, pos.w, commentHeightMm, pxPerMm, dpi)
        }

        try {
          pdf.addImage(photo, 'JPEG', margin + pos.x, newPhotoY, pos.w, pos.h)
        } catch (error) {
          pdf.setDrawColor(200, 200, 200)
          pdf.rect(margin + pos.x, newPhotoY, pos.w, pos.h)
        }
        continue
      }

      // コメントを写真の上に描画
      if (comment) {
        const commentY = currentY + pos.y + offsetY
        drawCommentLabel(pdf, comment, margin + pos.x, commentY, pos.w, commentHeightMm, pxPerMm, dpi)
      }

      try {
        pdf.addImage(photo, 'JPEG', margin + pos.x, photoY, pos.w, pos.h)
      } catch (error) {
        pdf.setDrawColor(200, 200, 200)
        pdf.rect(margin + pos.x, photoY, pos.w, pos.h)
      }
    }

    // この行の分のオフセットを加算
    offsetY += rowCommentOffset
  }

  // 全体の高さ更新
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
      const w = Math.min(availableWidth, 140)
      const h = w * 0.6
      positions.push({ x: (availableWidth - w) / 2, y: 0, w, h })
      totalHeight = h
      break
    }
    case 2: {
      const w = (availableWidth - gap) / 2
      const h = w * 0.6
      positions.push({ x: 0, y: 0, w, h })
      positions.push({ x: w + gap, y: 0, w, h })
      totalHeight = h
      break
    }
    case 3: {
      const w1 = availableWidth * 0.55
      const h1 = w1 * 0.55
      positions.push({ x: (availableWidth - w1) / 2, y: 0, w: w1, h: h1 })

      const w2 = (availableWidth - gap) / 2
      const h2 = w2 * 0.5
      positions.push({ x: 0, y: h1 + gap, w: w2, h: h2 })
      positions.push({ x: w2 + gap, y: h1 + gap, w: w2, h: h2 })
      totalHeight = h1 + gap + h2
      break
    }
    case 4: {
      const w = (availableWidth - gap) / 2
      const h = w * 0.55
      positions.push({ x: 0, y: 0, w, h })
      positions.push({ x: w + gap, y: 0, w, h })
      positions.push({ x: 0, y: h + gap, w, h })
      positions.push({ x: w + gap, y: h + gap, w, h })
      totalHeight = h * 2 + gap
      break
    }
    case 5: {
      const w2 = (availableWidth - gap) / 2
      const h2 = w2 * 0.5
      positions.push({ x: 0, y: 0, w: w2, h: h2 })
      positions.push({ x: w2 + gap, y: 0, w: w2, h: h2 })

      const w3 = (availableWidth - gap * 2) / 3
      const h3 = w3 * 0.55
      positions.push({ x: 0, y: h2 + gap, w: w3, h: h3 })
      positions.push({ x: w3 + gap, y: h2 + gap, w: w3, h: h3 })
      positions.push({ x: (w3 + gap) * 2, y: h2 + gap, w: w3, h: h3 })
      totalHeight = h2 + gap + h3
      break
    }
    case 6: {
      const w = (availableWidth - gap * 2) / 3
      const h = w * 0.55
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
      const h = w * 0.55
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
