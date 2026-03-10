import { Link } from 'react-router-dom'
import { MOCK_WALKERS } from '../../lib/mockData'

export default function PlatformLanding() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-indigo-600 text-white py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Book trusted dog walkers in your area
          </h1>
          <p className="text-lg md:text-xl text-indigo-100 mb-8">
            One Stop Dog Shop connects you with local, vetted dog walkers.
            Book online, pay securely, and keep your pup happy.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/signup?role=client"
              className="bg-white text-indigo-600 font-semibold px-6 py-3 rounded-lg hover:bg-indigo-50 text-center"
            >
              I need someone to walk my dog!
            </Link>
            <Link
              to="/signup?role=walker"
              className="border-2 border-white text-white font-semibold px-6 py-3 rounded-lg hover:bg-indigo-700 text-center"
            >
              I'm a dog walker
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-12">How it works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '1',
                title: 'Find your walker',
                desc: 'Browse local dog walkers, read reviews, and check their availability.',
              },
              {
                step: '2',
                title: 'Book & pay online',
                desc: 'Pick a service, choose your time slot, and pay securely through Stripe.',
              },
              {
                step: '3',
                title: 'Happy pup, happy you',
                desc: 'Your walker confirms the booking. Track everything from your dashboard.',
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-12 h-12 bg-indigo-100 text-indigo-600 font-bold text-xl rounded-full flex items-center justify-center mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                <p className="text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Walkers */}
      <section className="bg-gray-100 py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">Our walkers</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {MOCK_WALKERS.map((walker) => (
              <Link
                key={walker.id}
                to={`/w/${walker.slug}`}
                className="bg-white rounded-lg p-6 hover:shadow-md transition text-center"
              >
                <div
                  className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center text-2xl font-bold text-white"
                  style={{ backgroundColor: walker.theme_color }}
                >
                  {walker.business_name.charAt(0)}
                </div>
                <h3 className="font-semibold text-lg mb-1">{walker.business_name}</h3>
                <div className="text-yellow-400 text-sm mb-2">
                  {'★'.repeat(Math.round(walker.rating))}
                  <span className="text-gray-400 ml-1">({walker.review_count})</span>
                </div>
                <p className="text-sm text-gray-600">{walker.bio}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* For walkers */}
      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-4">Are you a dog walker?</h2>
          <p className="text-gray-600 mb-6">
            Get your own booking page, manage your schedule, accept payments —
            all in one place. No monthly fees, just a small transaction fee when you get paid.
          </p>
          <Link
            to="/signup?role=walker"
            className="inline-block bg-indigo-600 text-white font-semibold px-6 py-3 rounded-lg hover:bg-indigo-700"
          >
            Get started for free
          </Link>
        </div>
      </section>
    </div>
  )
}
