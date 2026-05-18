import { useState, useEffect, useId } from 'react'
import { Plus } from 'lucide-react'
import Modal from './Modal'
import SearchList from './SearchList'
import SearchInput from './SearchInput'

function keyOf(item) {
  return item?.id ?? item?.__tempId
}

function dedupeByKey(list) {
  const seen = new Set()
  const out = []
  for (const item of list) {
    const k = keyOf(item)
    if (k != null && seen.has(k)) continue
    if (k != null) seen.add(k)
    out.push(item)
  }
  return out
}

export default function EntityPicker({
  open,
  onClose,
  title,
  items,
  searchFields,
  renderItem,           // single mode: (item, onSelect) => JSX
  renderItemContent,    // multi mode: (item) => JSX (just the content, picker wraps in checkbox row)
  FormComponent,
  formProps = {},
  onSelect,
  onCreate,
  addLabel = 'Add new',
  emptyState,
  multiple = false,
  initialSelected = [],
}) {
  const FORM_ID = useId()
  const [mode, setMode] = useState('list')
  const [formValid, setFormValid] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [localItems, setLocalItems] = useState([])
  const [selected, setSelected] = useState(initialSelected)
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (open) {
      setMode('list')
      setFormValid(false)
      setLocalItems([])
      setSelected(initialSelected)
      setQuery('')
    }
  }, [open])

  function handleClose() {
    setMode('list')
    onClose()
  }

  function handleHeaderClose() {
    if (mode === 'add') setMode('list')
    else onClose()
  }

  function toggleItem(item) {
    setSelected((s) => {
      const k = keyOf(item)
      const idx = s.findIndex((x) => keyOf(x) === k)
      if (idx >= 0) return [...s.slice(0, idx), ...s.slice(idx + 1)]
      return [...s, item]
    })
  }

  function handleSaveMulti() {
    onSelect(selected)
    handleClose()
  }

  async function handleCreate(payload) {
    setSubmitting(true)
    const created = await onCreate(payload)
    setSubmitting(false)
    if (!created) return

    if (multiple) {
      const withKey = created.id ? created : { ...created, __tempId: `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` }
      setLocalItems((s) => [...s, withKey])
      setSelected((s) => [...s, withKey])
      setMode('list')
    } else {
      onSelect(created)
      handleClose()
    }
  }

  const isForm = mode === 'add'
  const allItems = multiple ? dedupeByKey([...items, ...localItems]) : items
  const showSave = multiple && !isForm

  return (
    <Modal
      open={open}
      onClose={handleHeaderClose}
      title={isForm ? `New ${title?.toLowerCase()}` : title}
      formId={isForm ? FORM_ID : undefined}
      onSave={showSave ? handleSaveMulti : undefined}
      saveDisabled={isForm ? !formValid : (multiple ? selected.length === 0 : false)}
      saveLoading={submitting}
    >
      {isForm ? (
        <FormComponent
          {...formProps}
          formId={FORM_ID}
          onSubmit={handleCreate}
          onValidityChange={setFormValid}
        />
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <SearchInput value={query} onChange={setQuery} />
            </div>
            {onCreate && (
              <button
                type="button"
                onClick={() => setMode('add')}
                className="cursor-pointer h-9 px-3 inline-flex items-center justify-center gap-1.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 shrink-0"
              >
                <Plus size={16} />
                <span className="hidden sm:inline">{addLabel}</span>
              </button>
            )}
          </div>
          <div className="space-y-2">
            <SearchList
              items={allItems}
              query={query}
              searchFields={searchFields}
              renderItem={multiple
                ? (item) => (
                    <label
                      key={keyOf(item) ?? item.name}
                      className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg p-3 hover:border-indigo-300 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selected.some((x) => keyOf(x) === keyOf(item))}
                        onChange={() => toggleItem(item)}
                        className="w-4 h-4 accent-indigo-600"
                      />
                      <div className="flex-1 min-w-0">{renderItemContent(item)}</div>
                    </label>
                  )
                : (item) => renderItem(item, () => { onSelect(item); handleClose() })
              }
              emptyState={emptyState}
            />
          </div>
        </div>
      )}
    </Modal>
  )
}
