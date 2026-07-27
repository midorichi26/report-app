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

  // Canvasを作成してテキスト部分を描画
  const dpi = 2 // 高解像度用
  const canvasWidthPx = contentWidth * dpi * 3.78 // mmをpxに変換 (96dpi基準)
  const pxPerMm = canvasWidthPx / contentWidth

  // --- ヘッダー部分をCanvasで描画 ---
  const headerCanvas = document.createElement('canvas')
  headerCanvas.width = canvasWidthPx
  headerCanvas.height = 400 * dpi
  const hCtx = headerCanvas.getContext('2d')

  hCtx.fillStyle = '#ffffff'
  hCtx.fillRect(0, 0, headerCanvas.width, headerCanvas.height)

  let hY = 40 * dpi

  // タイトル（大きめ: 28pt相当）
  hCtx.font = `bold ${28 * dpi}px "Hiragino Sans", "Noto Sans JP", "Yu Gothic", sans-serif`
  hCtx.fillStyle = '#1a1a1a'
  hCtx.textAlign = 'center'
  hCtx.fillText(report.title || '報告書', headerCanvas.width / 2, hY)
  hY += 20 * dpi

  // 区切り線
  hCtx.strokeStyle = '#4285F4'
  hCtx.lineWidth = 3 * dpi
  hCtx.beginPath()
  hCtx.moveTo(0, hY)
  hCtx.lineTo(headerCanvas.width, hY)
  hCtx.stroke()
  hY += 25 * dpi

  // 日付（大きめ: 16pt相当）
  hCtx.font = `${16 * dpi}px "Hiragino Sans", "Noto Sans JP", "Yu Gothic", sans-serif`
  hCtx.fillStyle = '#333333'
  hCtx.textAlign = 'left'
  hCtx.fillText(`日付: ${report.date || '-'}`, 10 * dpi, hY)
  hY += 18 * dpi

  // 利用者名（大きめ: 16pt相当）
  hCtx.fillText(`利用者: ${report.author || '-'}`, 10 * dpi, hY)
  hY += 25 * dpi

  // ヘッダー画像をPDFに追加
  const headerHeight = hY / pxPerMm
  headerCanvas.height = hY
  const headerImg = headerCanvas.toDataURL('image/png')
  pdf.addImage(headerImg, 'PNG', margin, margin, contentWidth, headerHeight)

  let currentY = margin + headerHeight + 5

  // --- 本文 ---
  if (report.body) {
    const bodyLines = wrapText(report.body, 35) // 1行あたり約35文字（大きめフォント用）
    const lineHeight = 9 // mm（行間を広めに）
    const bodyCanvasHeight = (bodyLines.length + 1) * lineHeight * pxPerMm

    const bodyCanvas = document.createElement('canvas')
    bodyCanvas.width = canvasWidthPx
    bodyCanvas.height = Math.max(bodyCanvasHeight, 50)
    const bCtx = bodyCanvas.getContext('2d')

    bCtx.fillStyle = '#ffffff'
    bCtx.fillRect(0, 0, bodyCanvas.width, bodyCanvas.height)
    bCtx.font = `${15 * dpi}px "Hiragino Sans", "Noto Sans JP", "Yu Gothic", sans-serif`
    bCtx.fillStyle = '#333333'
    bCtx.textAlign = 'left'

    let bY = 15 * dpi
    for (const line of bodyLines) {
      // ページを超える場合は新しいページ
      if (currentY + lineHeight > pageHeight - margin) {
        pdf.addPage()
        currentY = margin
      }
      bY += lineHeight * pxPerMm
    }

    // 本文をまとめて描画
    bodyCanvas.height = bY + 10 * dpi
    const bCtx2 = bodyCanvas.getContext('2d')
    bCtx2.fillStyle = '#ffffff'
    bCtx2.fillRect(0, 0, bodyCanvas.width, bodyCanvas.height)
    bCtx2.font = `${15 * dpi}px "Hiragino Sans", "Noto Sans JP", "Yu Gothic", sans-serif`
    bCtx2.fillStyle = '#333333'
    bCtx2.textAlign = 'left'

    let bY2 = 15 * dpi
    for (const line of bodyLines) {
      bCtx2.fillText(line, 5 * dpi, bY2)
      bY2 += lineHeight * pxPerMm
    }

    const bodyImgHeight = bY2 / pxPerMm

    // 本文がページに収まるか確認
    if (currentY + bodyImgHeight > pageHeight - margin) {
      pdf.addPage()
      currentY = margin
    }

    const bodyImg = bodyCanvas.toDataURL('image/png')
    pdf.addImage(bodyImg, 'PNG', margin, currentY, contentWidth, bodyImgHeight)
    currentY += bodyImgHeight + 5
  }

  // --- 写真 ---
  const photos = report.photos.filter(p => p !== null)
  const photoComments = report.photoComments || []
  // 写真のインデックスとコメントの対応を保持
  const photoDataWithComments = []
  for (let i = 0; i < report.photos.length; i++) {
    if (report.photos[i] !== null) {
      photoDataWithComments.push({
        photo: report.photos[i],
        comment: photoComments[i] || null,
      })
    }
  }

  if (photoDataWithComments.length > 0) {
    if (currentY + 10 > pageHeight - margin) {
      pdf.addPage()
      currentY = margin
    }
    currentY += 5

    const layout = getPhotoLayout(photoDataWithComments.length, contentWidth)
    const commentHeight = 6 // コメント用の高さ (mm)

    for (let i = 0; i < photoDataWithComments.length; i++) {
      const { photo, comment } = photoDataWithComments[i]
      const pos = layout.positions[i]
      const extraTop = comment ? commentHeight : 0
      const photoY = currentY + pos.y + extraTop

      // 新しいページが必要か確認
      if (photoY + pos.h > pageHeight - margin) {
        pdf.addPage()
        currentY = margin
      }

      // コメントを写真の上に描画
      if (comment) {
        const commentCanvas = document.createElement('canvas')
        const commentWidthPx = pos.w * pxPerMm
        commentCanvas.width = commentWidthPx
        commentCanvas.height = commentHeight * pxPerMm
        const cCtx = commentCanvas.getContext('2d')
        cCtx.fillStyle = '#ffffff'
        cCtx.fillRect(0, 0, commentCanvas.width, commentCanvas.height)
        cCtx.font = `${11 * dpi}px "Hiragino Sans", "Noto Sans JP", "Yu Gothic", sans-serif`
        cCtx.fillStyle = '#555555'
        cCtx.textAlign = 'left'
        cCtx.fillText(comment, 2 * dpi, commentHeight * pxPerMm * 0.7)

        const commentImg = commentCanvas.toDataURL('image/png')
        pdf.addImage(commentImg, 'PNG', margin + pos.x, currentY + pos.y, pos.w, commentHeight)
      }

      try {
        pdf.addImage(
          photo,
          'JPEG',
          margin + pos.x,
          photoY,
          pos.w,
          pos.h
        )
      } catch (error) {
        pdf.setDrawColor(200, 200, 200)
        pdf.rect(margin + pos.x, photoY, pos.w, pos.h)
      }
    }

    // コメントがある写真分の余白も考慮
    const hasAnyComment = photoDataWithComments.some(p => p.comment)
    currentY += layout.totalHeight + (hasAnyComment ? commentHeight : 0)
  }

  // --- フッター ---
  const pageCount = pdf.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i)
    pdf.setFontSize(8)
    pdf.setTextColor(150, 150, 150)
    pdf.text(
      `${i} / ${pageCount}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' }
    )
    pdf.setTextColor(0, 0, 0)
  }

  // ダウンロード
  const filename = `report_${report.date}_${report.title || 'untitled'}.pdf`
  pdf.save(filename)
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
  const gap = 3
  const positions = []
  let totalHeight = 0

  switch (count) {
    case 1: {
      const w = Math.min(availableWidth, 160)
      const h = w * 0.65
      positions.push({ x: (availableWidth - w) / 2, y: 0, w, h })
      totalHeight = h
      break
    }
    case 2: {
      const w = (availableWidth - gap) / 2
      const h = w * 0.65
      positions.push({ x: 0, y: 0, w, h })
      positions.push({ x: w + gap, y: 0, w, h })
      totalHeight = h
      break
    }
    case 3: {
      const w1 = availableWidth * 0.6
      const h1 = w1 * 0.6
      positions.push({ x: (availableWidth - w1) / 2, y: 0, w: w1, h: h1 })

      const w2 = (availableWidth - gap) / 2
      const h2 = w2 * 0.55
      positions.push({ x: 0, y: h1 + gap, w: w2, h: h2 })
      positions.push({ x: w2 + gap, y: h1 + gap, w: w2, h: h2 })
      totalHeight = h1 + gap + h2
      break
    }
    case 4: {
      const w = (availableWidth - gap) / 2
      const h = w * 0.6
      positions.push({ x: 0, y: 0, w, h })
      positions.push({ x: w + gap, y: 0, w, h })
      positions.push({ x: 0, y: h + gap, w, h })
      positions.push({ x: w + gap, y: h + gap, w, h })
      totalHeight = h * 2 + gap
      break
    }
    case 5: {
      const w2 = (availableWidth - gap) / 2
      const h2 = w2 * 0.55
      positions.push({ x: 0, y: 0, w: w2, h: h2 })
      positions.push({ x: w2 + gap, y: 0, w: w2, h: h2 })

      const w3 = (availableWidth - gap * 2) / 3
      const h3 = w3 * 0.6
      positions.push({ x: 0, y: h2 + gap, w: w3, h: h3 })
      positions.push({ x: w3 + gap, y: h2 + gap, w: w3, h: h3 })
      positions.push({ x: (w3 + gap) * 2, y: h2 + gap, w: w3, h: h3 })
      totalHeight = h2 + gap + h3
      break
    }
    case 6: {
      const w = (availableWidth - gap * 2) / 3
      const h = w * 0.6
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
      const h = w * 0.6
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
