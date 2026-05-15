import { useState } from 'react'
import { Shield } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import Modal from '../Modal'

export default function InviteConsentModal({ open, onAccept, onClose }) {
  const { walkerProfile, refreshProfile } = useAuth()
  const [saving, setSaving] = useState(false)

  async function handleAccept() {
    if (!walkerProfile) return
    setSaving(true)
    await supabase
      .from('walker_profiles')
      .update({ customer_invite_consent_at: new Date().toISOString() })
      .eq('id', walkerProfile.id)
    await refreshProfile()
    setSaving(false)
    onAccept()
  }

  return (
    <Modal open={open} onClose={onClose} title="Before you add a customer">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
          <Shield size={20} />
        </div>
        <p className="text-sm text-gray-600 leading-relaxed">
          When you add a customer, we'll store their contact details and send them an email invite
          so they can manage bookings and pay. Please only add customers who have given you
          permission to share their details with One Stop Dog Shop.
        </p>
      </div>
      <ul className="text-sm text-gray-600 space-y-2 mb-6">
        <li>• They can opt out of emails or request deletion at any time.</li>
        <li>• You're responsible for the accuracy of the email address you enter.</li>
        <li>• Abuse (spam, unsolicited contacts) can lead to your account being suspended.</li>
      </ul>
      <div className="flex gap-2">
        <button
          onClick={handleAccept}
          disabled={saving}
          className="cursor-pointer flex-1 bg-indigo-600 text-white font-semibold py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'I understand'}
        </button>
        <button
          onClick={onClose}
          className="cursor-pointer flex-1 border border-gray-300 text-gray-700 font-semibold py-2.5 rounded-lg hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </Modal>
  )
}
