import React from 'react'

const printServices = [
  {
    name: 'セブンイレブン（かんたんnetprint）',
    description: 'かんたんnetprintアプリでPDFを登録して、セブンイレブンで印刷',
    icon: '🏪',
    appUrl: {
      ios: 'https://apps.apple.com/jp/app/id1552990358',
      android: 'https://play.google.com/store/apps/details?id=jp.co.fujixerox.np.kantan.android',
    },
    steps: [
      '下の「PDF保存」ボタンでPDFをスマホに保存',
      'かんたんnetprintアプリを開く（未インストールならアプリストアからダウンロード）',
      'アプリでPDFファイルを登録',
      '発行されたプリント予約番号をメモ',
      'セブンイレブンのマルチコピー機で予約番号を入力して印刷',
    ]
  },
  {
    name: 'ローソン・ファミマ（ネットワークプリント）',
    description: 'ネットワークプリントアプリでPDFを登録して印刷',
    icon: '🏬',
    appUrl: {
      ios: 'https://apps.apple.com/jp/app/id454644833',
      android: 'https://play.google.com/store/apps/details?id=jp.co.sharp.networkprint',
    },
    steps: [
      '下の「PDF保存」ボタンでPDFをスマホに保存',
      'ネットワークプリントアプリを開く（未インストールならアプリストアからダウンロード）',
      'アプリでPDFファイルを登録',
      '発行されたユーザー番号を確認',
      'ローソンまたはファミマのマルチコピー機で番号を入力して印刷',
    ]
  },
]

function PrintModal({ onClose, onGeneratePDF }) {
  // iOS/Android判定
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
  const isAndroid = /Android/.test(navigator.userAgent)

  const getAppLink = (service) => {
    if (isIOS) return service.appUrl.ios
    if (isAndroid) return service.appUrl.android
    // PCなどの場合はiOS優先で表示
    return service.appUrl.ios
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800">🖨️ コンビニプリント</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
              aria-label="閉じる"
            >
              ×
            </button>
          </div>

          <p className="text-gray-600 text-sm mb-4">
            PDFを保存してから、各コンビニのプリントアプリに登録してください。
          </p>

          {/* PDF保存ボタン */}
          <button
            onClick={onGeneratePDF}
            className="w-full btn-success text-lg py-3 mb-6"
          >
            📄 PDFを保存する
          </button>

          {/* プリントサービス一覧 */}
          <div className="space-y-4">
            {printServices.map((service, idx) => (
              <div key={idx} className="border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{service.icon}</span>
                  <h3 className="font-bold text-gray-800">{service.name}</h3>
                </div>
                <p className="text-sm text-gray-600 mb-3">{service.description}</p>

                <div className="flex flex-wrap gap-2 mb-3">
                  <a
                    href={getAppLink(service)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                  >
                    📲 アプリを入手 / 開く
                  </a>
                </div>

                <details className="text-sm">
                  <summary className="cursor-pointer text-blue-600 font-medium">
                    印刷手順を見る
                  </summary>
                  <ol className="mt-2 space-y-1 text-gray-600 list-decimal list-inside">
                    {service.steps.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ol>
                </details>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default PrintModal
