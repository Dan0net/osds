import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

export default function Signup() {
  const [searchParams] = useSearchParams()
  const role = searchParams.get('role') || 'client'
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [activeRole, setActiveRole] = useState(role)
  const navigate = useNavigate()

  function handleSubmit(e) {
    e.preventDefault()
    // Mock: navigate to relevant dashboard
    navigate(activeRole === 'walker' ? '/admin' : '/my-bookings')
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <h1 className="text-2xl font-bold mb-6 text-center">Create an account</h1>

      {/* Role toggle */}
      <div className="flex rounded-lg border border-gray-300 mb-6 overflow-hidden">
        <button
          type="button"
          onClick={() => setActiveRole('client')}
          className={`flex-1 py-2 text-sm font-medium ${
            activeRole === 'client'
              ? 'bg-indigo-600 text-white'
              : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          Dog Owner
        </button>
        <button
          type="button"
          onClick={() => setActiveRole('walker')}
          className={`flex-1 py-2 text-sm font-medium ${
            activeRole === 'walker'
              ? 'bg-indigo-600 text-white'
              : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          Dog Walker
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {activeRole === 'walker' ? 'Business name' : 'Your name'}
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            placeholder={activeRole === 'walker' ? "Ellie's Dog Walking" : 'Dan'}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            placeholder="••••••••"
          />
        </div>
        <button
          type="submit"
          className="w-full bg-indigo-600 text-white font-semibold py-2.5 rounded-lg hover:bg-indigo-700"
        >
          {activeRole === 'walker' ? 'Create walker account' : 'Create account'}
        </button>
      </form>
      <p className="text-sm text-center text-gray-500 mt-4">
        Already have an account?{' '}
        <Link to="/login" className="text-indigo-600 hover:underline">
          Log in
        </Link>
      </p>
    </div>
  )
}
