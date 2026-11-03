import { reactive, ref, shallowRef, watch } from 'vue'
import { toast } from '@/stores/toast'

// 서버 페이지네이션 목록 공통 로직.
// - filters 변경 시 1페이지로 이동 후 재조회
// - 늦게 도착한 이전 요청 응답은 버림(검색어 빠르게 바꿀 때 깜빡임 방지)
export function usePagedList(fetcher, initialFilters = {}, perPage = 20) {
  const filters = reactive({ ...initialFilters })
  const page = ref(1)
  const rows = shallowRef([])
  const total = ref(0)
  const loading = ref(false)
  let seq = 0

  async function load() {
    const my = ++seq
    loading.value = true
    try {
      const res = await fetcher({ ...filters, page: page.value, perPage })
      if (my !== seq) return
      rows.value = res.rows
      total.value = res.total
    } catch (e) {
      if (my === seq) toast.error(e)
    } finally {
      if (my === seq) loading.value = false
    }
  }

  watch(filters, () => {
    if (page.value !== 1) page.value = 1
    else load()
  })
  watch(page, load)

  return { filters, page, rows, total, loading, perPage, load }
}
