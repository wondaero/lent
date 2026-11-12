import { nextTick, onBeforeUnmount, toValue, watch, type WatchSource } from 'vue'

// 안드로이드 백 버튼·Esc 로 모달·바텀 시트를 닫는 CloseWatcher (Chrome 120+). 지원하지 않는 브라우저에서는 아무것도 하지 않음
// 여러 개가 겹쳐 열리면 나중에 연 것부터 닫힘
type CloseWatcherLike = { onclose: (() => void) | null; destroy(): void }
const CloseWatcherCtor = (window as unknown as { CloseWatcher?: new () => CloseWatcherLike }).CloseWatcher

export const closeWatcherSupported = !!CloseWatcherCtor

export function useCloseWatcher(open: WatchSource<boolean>, onClose: () => void) {
  let watcher: CloseWatcherLike | null = null

  // 코드로 닫을 때는 onclose 없이 정리 (닫힘 요청으로 처리되지 않게)
  function stop() {
    if (!watcher) return
    watcher.onclose = null
    watcher.destroy()
    watcher = null
  }

  function start() {
    if (!CloseWatcherCtor) return
    const created = new CloseWatcherCtor()
    created.onclose = () => {
      watcher = null
      onClose()
      // 닫기를 취소하고 계속 열려 있으면(저장 확인 등) 다시 백 버튼을 받을 수 있게 새로 만듦
      nextTick(() => {
        if (!watcher && toValue(open)) start()
      })
    }
    watcher = created
  }

  watch(
    open,
    (isOpen) => {
      stop()
      if (isOpen) start()
    },
    { immediate: true },
  )

  onBeforeUnmount(stop)
}
