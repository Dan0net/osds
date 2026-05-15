import { useState, useEffect } from 'react'
import Modal from '../Modal'
import SearchList from './SearchList'

const FORM_ID = 'entity-picker-form'

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
  const [formValid, setFormValid] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setMode('list')
      setFormValid(false)
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

  async function handleCreate(payload) {
    setSubmitting(true)
    const created = await onCreate(payload)
    setSubmitting(false)
    if (created) {
      onSelect(created)
      handleClose()
    }
  }

  const isForm = mode === 'add'

  return (
    <Modal
      open={open}
      onClose={handleHeaderClose}
      title={isForm ? `New ${title?.toLowerCase()}` : title}
      formId={isForm ? FORM_ID : undefined}
      saveDisabled={!formValid}
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
        <SearchList
          items={items}
          searchFields={searchFields}
          renderItem={(item) => renderItem(item, () => { onSelect(item); handleClose() })}
          onAdd={() => setMode('add')}
          addLabel={addLabel}
          emptyState={emptyState}
        />
      )}
    </Modal>
  )
}
