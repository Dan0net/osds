import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { usePets, useCreatePet, useUpdatePet, useDeletePet } from '../../lib/queries/pets'
import Modal from '../../components/Modal'
import PetForm from '../../components/account/PetForm'

const FORM_ID = 'pet-form'

export default function AccountPets() {
  const { user } = useAuth()
  const [editing, setEditing] = useState(null) // null | 'new' | pet object
  const [formValid, setFormValid] = useState(false)

  const petsQuery = usePets(user?.id)
  const createPet = useCreatePet()
  const updatePet = useUpdatePet()
  const deletePet = useDeletePet()

  const pets = petsQuery.data || []
  const saving = createPet.isPending || updatePet.isPending

  async function handleSubmit(payload) {
    if (editing === 'new') {
      await createPet.mutateAsync({ userId: user.id, pet: payload })
    } else if (editing?.id) {
      await updatePet.mutateAsync({ petId: editing.id, patch: payload })
    }
    setEditing(null)
  }

  async function remove(id) {
    if (!confirm('Remove this pet?')) return
    await deletePet.mutateAsync(id)
  }

  const modalTitle = editing === 'new' ? 'New pet' : 'Edit pet'

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl">Pets</h1>
        <button
          onClick={() => setEditing('new')}
          className="cursor-pointer bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-indigo-700"
        >
          Add pet
        </button>
      </div>

      <div className="space-y-2">
        {pets.map((pet) => (
          <div key={pet.id} className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between">
            <div>
              <span className="font-semibold">{pet.name}</span>
              {pet.breed && <><span className="text-gray-400 mx-2">·</span><span className="text-gray-600">{pet.breed}</span></>}
              {pet.weight && <><span className="text-gray-400 mx-2">·</span><span className="text-gray-500 text-sm">{pet.weight}kg</span></>}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setEditing(pet)} className="cursor-pointer text-sm text-indigo-600 hover:text-indigo-700">
                Edit
              </button>
              <button onClick={() => remove(pet.id)} className="cursor-pointer text-sm text-red-500 hover:text-red-600">
                Remove
              </button>
            </div>
          </div>
        ))}
        {pets.length === 0 && (
          <p className="text-gray-400 text-center py-8">No pets added yet.</p>
        )}
      </div>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={modalTitle}
        formId={FORM_ID}
        saveDisabled={!formValid}
        saveLoading={saving}
      >
        {editing && (
          <PetForm
            formId={FORM_ID}
            initial={editing === 'new' ? null : editing}
            onValidityChange={setFormValid}
            onSubmit={handleSubmit}
          />
        )}
      </Modal>
    </div>
  )
}
