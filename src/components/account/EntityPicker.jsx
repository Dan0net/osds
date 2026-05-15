import { useState } from 'react'
import Modal from '../Modal'
import SearchList from './SearchList'

export default function EntityPicker({
  open,
  onClose,
  title,
  items,
  searchFields,
  renderItem,
  FormComponent,
  formProps = {},
  onSelect,
  onCreate,
  addLabel = 'Add new',
  emptyState,
}) {
  const [mode, setMode] = useState('list')

  function handleClose() {
    setMode('list')
    onClose()
  }

  async function handleCreate(payload) {
    const created = await onCreate(payload)
    if (created) {
      onSelect(created)
      setMode('list')
      onClose()
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title={mode === 'list' ? title : `New ${title?.toLowerCase()}`}>
      {mode === 'list' ? (
        <SearchList
          items={items}
          searchFields={searchFields}
          renderItem={(item) => renderItem(item, () => { onSelect(item); handleClose() })}
          onAdd={() => setMode('add')}
          addLabel={addLabel}
          emptyState={emptyState}
        />
      ) : (
        <FormComponent
          {...formProps}
          onCancel={() => setMode('list')}
          onSubmit={handleCreate}
        />
      )}
    </Modal>
  )
}
