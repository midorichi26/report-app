// 報告書データの保存先を IndexedDB で扱うユーティリティ。
// これまで LocalStorage に保存していたデータは、初回アクセス時に自動で IndexedDB へ移行する。
import { openDB } from 'idb'

const DB_NAME = 'report-app-db'
const DB_VERSION = 1
const STORE_NAME = 'reports'
const LEGACY_KEY = 'reports' // 以前 LocalStorage に保存していたキー
const MIGRATION_FLAG = 'reports-migrated-to-idb' // 移行済みフラグ

// DB接続を1つ使い回す（毎回開かない）
let dbPromise = null

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          // 報告書は id をキーにして保存する
          db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        }
      },
    })
  }
  return dbPromise
}

// LocalStorage に残っている旧データを IndexedDB に移行する（初回のみ）
async function migrateFromLocalStorage(db) {
  try {
    // すでに移行済みなら何もしない
    if (localStorage.getItem(MIGRATION_FLAG) === 'done') return

    const legacy = localStorage.getItem(LEGACY_KEY)
    if (legacy) {
      const reports = JSON.parse(legacy)
      if (Array.isArray(reports) && reports.length > 0) {
        const tx = db.transaction(STORE_NAME, 'readwrite')
        for (const report of reports) {
          if (report && report.id) {
            await tx.store.put(report)
          }
        }
        await tx.done
      }
    }
    // 移行完了フラグを立てる。旧データは念のため消さずに残しておく
    localStorage.setItem(MIGRATION_FLAG, 'done')
  } catch (e) {
    // 移行に失敗しても致命的ではないので、ログのみ
    console.error('LocalStorageからの移行に失敗しました:', e)
  }
}

// 全ての報告書を取得する（更新日時の新しい順）
export async function getAllReports() {
  const db = await getDB()
  await migrateFromLocalStorage(db)
  const all = await db.getAll(STORE_NAME)
  // updatedAt の新しい順に並べる（無い場合は createdAt を使う）
  return all.sort((a, b) => {
    const ta = new Date(a.updatedAt || a.createdAt || 0).getTime()
    const tb = new Date(b.updatedAt || b.createdAt || 0).getTime()
    return tb - ta
  })
}

// 報告書を1件保存（新規・更新の両方に対応）
// 保存に失敗した場合は例外を投げる
export async function saveReport(report) {
  const db = await getDB()
  await db.put(STORE_NAME, report)
}

// 報告書を1件削除
export async function deleteReport(id) {
  const db = await getDB()
  await db.delete(STORE_NAME, id)
}
