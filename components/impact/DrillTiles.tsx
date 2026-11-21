'use client'

import { useState } from 'react'

export interface DrillTile {
  id: string
  label: string
  value: string
  note?: string
  noteTone?: 'muted' | 'up' | 'down'
  // What opens below the row when the tile is clicked: the names or lessons behind the number.
  detail?: React.ReactNode
  detailTitle?: string
}

// A row of headline numbers. A tile with details is a button: clicking it opens a panel under the
// row listing exactly who or what the number counts; clicking again (or another tile) closes it.
export default function DrillTiles({ tiles }: { tiles: DrillTile[] }) {
  const [openId, setOpenId] = useState<string | null>(null)
  const open = tiles.find(tile => tile.id === openId && tile.detail)

  return (
    <div className="mb-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {tiles.map(tile => {
          const body = (
            <>
              <p className="text-sm text-slate-500">{tile.label}</p>
              <p className="text-3xl font-bold text-slate-900">{tile.value}</p>
              {tile.note && (
                <p className={`mt-1 text-xs font-medium ${
                  tile.noteTone === 'up' ? 'text-green-700' : tile.noteTone === 'down' ? 'text-red-700' : 'text-slate-500'
                }`}>
                  {tile.note}
                </p>
              )}
            </>
          )
          if (!tile.detail) {
            return <div key={tile.id} className="rounded-lg border border-slate-200 bg-white p-4">{body}</div>
          }
          const isOpen = open?.id === tile.id
          return (
            <button
              key={tile.id}
              type="button"
              aria-expanded={isOpen}
              aria-controls={`drill-${tile.id}`}
              onClick={() => setOpenId(isOpen ? null : tile.id)}
              className={`group rounded-lg border bg-white p-4 text-left transition hover:border-slate-400 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 ${
                isOpen ? 'border-slate-800 ring-1 ring-slate-800' : 'border-slate-200'
              }`}
            >
              {body}
              <p className={`mt-2 text-xs font-semibold ${isOpen ? 'text-slate-800' : 'text-blue-700 group-hover:underline'}`}>
                {isOpen ? 'Hide details ▴' : 'See details ▾'}
              </p>
            </button>
          )
        })}
      </div>
      {open && (
        <div id={`drill-${open.id}`} className="mt-3 rounded-lg border border-slate-300 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-start justify-between gap-3">
            <h3 className="text-base font-bold text-slate-900">{open.detailTitle ?? open.label}</h3>
            <button
              type="button"
              onClick={() => setOpenId(null)}
              className="rounded-md px-2 py-1 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            >
              Close ✕
            </button>
          </div>
          {open.detail}
        </div>
      )}
    </div>
  )
}
