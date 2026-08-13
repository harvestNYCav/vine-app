export default function CheckInDatePicker({ date }: { date: string }) {
  return (
    <form method="get" className="mb-6 flex flex-wrap items-end gap-3">
      <label className="block text-xs font-semibold text-slate-600">
        <span className="mb-1 block">Session date</span>
        <input
          type="date"
          name="date"
          defaultValue={date}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
        />
      </label>
      <button
        type="submit"
        className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900"
      >
        Show
      </button>
    </form>
  )
}
