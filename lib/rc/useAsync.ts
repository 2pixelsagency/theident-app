'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

// Load data for a screen. `fn` re-runs when `deps` change or `reload()` is called;
// results from a stale run are ignored.
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [state, setState] = useState<{ data: T | undefined; loading: boolean; error: string | null }>({ data: undefined, loading: true, error: null })
  const [tick, setTick] = useState(0)
  const fnRef = useRef(fn)
  useEffect(() => { fnRef.current = fn })

  useEffect(() => {
    let live = true
    fnRef.current().then(
      data => { if (live) setState({ data, loading: false, error: null }) },
      (e: unknown) => { if (live) setState(s => ({ ...s, loading: false, error: e instanceof Error ? e.message : String(e) })) },
    )
    return () => { live = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick])

  const reload = useCallback(() => setTick(t => t + 1), [])
  const mutate = useCallback((update: (d: T | undefined) => T | undefined) => setState(s => ({ ...s, data: update(s.data) })), [])
  return { ...state, reload, mutate }
}
