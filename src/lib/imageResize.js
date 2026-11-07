// 게시판 사진을 업로드 전에 브라우저에서 줄여 다시 압축한다.
// - Supabase 서버 쪽 이미지 변환은 유료 기능 → 올리기 전에 처리(업로드 시간·저장공간 모두 절약)
// - canvas로 다시 그리면 EXIF(촬영 위치 등)가 빠진다. 아이 사진의 위치정보가 남지 않아 오히려 안전.
//   대신 회전 정보도 빠지므로 createImageBitmap에서 먼저 회전을 반영한다(세로 사진이 눕지 않게).
import { POST_PHOTO } from './constants'

async function decode(file) {
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    // 예: 크롬에서 아이폰 HEIC 원본. 아이폰 사파리에서 고르면 JPEG로 바뀌어 올라온다
    throw new Error(`${file.name}: 열 수 없는 이미지 형식입니다. JPG·PNG·WebP로 올려 주세요.`)
  }
}

const toBlob = (canvas, type, quality) => new Promise((r) => canvas.toBlob(r, type, quality))

async function render(bmp, maxSide, quality) {
  const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height))
  const width = Math.max(1, Math.round(bmp.width * scale))
  const height = Math.max(1, Math.round(bmp.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  // 투명 PNG를 JPEG로 저장하면 배경이 검게 나오므로 흰 바탕을 먼저 깐다
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, width, height)
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bmp, 0, 0, width, height)
  let blob = await toBlob(canvas, 'image/webp', quality)
  // WebP 인코딩을 못 하는 브라우저(일부 사파리)는 PNG로 돌려줘서 오히려 커진다 → JPEG로
  if (!blob || blob.type !== 'image/webp') blob = await toBlob(canvas, 'image/jpeg', quality)
  canvas.width = canvas.height = 0 // 큰 canvas 메모리 즉시 해제(모바일 사파리)
  return { blob, width, height }
}

// 원본 1장 → 본문용(긴 변 maxSide) + 목록용(긴 변 thumbSide). 디코딩은 한 번만
export async function preparePhoto(file, opt = POST_PHOTO) {
  const bmp = await decode(file)
  try {
    const full = await render(bmp, opt.maxSide, opt.quality)
    const thumb = await render(bmp, opt.thumbSide, opt.quality)
    return { blob: full.blob, thumbBlob: thumb.blob, width: full.width, height: full.height, size: full.blob.size, originalSize: file.size }
  } finally {
    bmp.close()
  }
}

export function fmtBytes(n) {
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))}KB`
  return `${(n / 1024 / 1024).toFixed(1)}MB`
}
