'use client'

import TodoList from '@/components/rc/TodoList'
import { BackHeader } from '@/components/rc/ui'

export default function TodoPage() {
  return (
    <>
      <BackHeader title="To do" />
      <div className="px-4 pb-12">
        <p className="mb-4 text-sm text-muted">Self-tapes, contracts and closing roles appear here automatically. Add your own too.</p>
        <TodoList />
      </div>
    </>
  )
}
