import { Link } from 'react-router-dom'
import { MOCK_WALKERS } from '../../lib/mockData'

export default function PlatformLanding() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-indigo-600 text-white py-10 md:py-14 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">
            Book trusted dog walkers in your area
          </h1>
          <p className="text-sm md:text-base text-indigo-100 mb-5">
            One Stop Dog Shop connects you with local, vetted dog walkers.
            Book online, pay securely, and keep your pup happy.
          </p>
          <Link
            to="/signup"
            className="inline-block bg-white text-indigo-600 font-semibold px-5 py-2.5 rounded-lg hover:bg-indigo-50 text-sm"
          >
            Get started
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section className="py-8 md:py-10 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-lg font-bold text-center mb-6">How it works</h2>
          <div className="grid grid-cols-3 gap-4 md:gap-6">
            {[
              {
                step: '1',
                title: 'Find your walker',
                desc: 'Browse local dog walkers, read reviews, and check availability.',
              },
              {
                step: '2',
                title: 'Book & pay online',
                desc: 'Pick a service, choose your slot, and pay securely.',
              },
              {
                step: '3',
                title: 'Happy pup, happy you',
                desc: 'Your walker confirms. Track everything from your dashboard.',
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-9 h-9 bg-indigo-100 text-indigo-600 font-bold text-sm rounded-full flex items-center justify-center mx-auto mb-2">
                  {item.step}
                </div>
                <h3 className="font-semibold text-sm mb-1">{item.title}</h3>
                <p className="text-xs text-gray-600 hidden sm:block">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Walkers */}
      <section className="bg-gray-100 py-8 md:py-10 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-lg font-bold text-center mb-5">Our walkers</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {MOCK_WALKERS.map((walker) => (
              <Link
                key={walker.id}
                to={`/w/${walker.slug}`}
                className="bg-white rounded-lg p-4 hover:shadow-md transition flex sm:flex-col items-center sm:text-center gap-3 sm:gap-0"
              >
                <div
                  className="w-11 h-11 sm:w-12 sm:h-12 rounded-full shrink-0 sm:mx-auto sm:mb-2 flex items-center justify-center text-lg font-bold text-white"
                  style={{ backgroundColor: walker.theme_color }}
                >
                  {walker.business_name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-sm">{walker.business_name}</h3>
                  <div className="text-yellow-400 text-xs">
                    {'★'.repeat(Math.round(walker.rating))}
                    <span className="text-gray-400 ml-1">({walker.review_count})</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1 line-clamp-2">{walker.bio}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* For walkers */}
      <section className="py-8 md:py-10 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-lg font-bold mb-2">Are you a dog walker?</h2>
          <p className="text-sm text-gray-600 mb-4">
            Get your own booking page, manage your schedule, accept payments —
            all in one place. No monthly fees.
          </p>
          <Link
            to="/signup"
            className="inline-block bg-indigo-600 text-white font-semibold px-5 py-2.5 rounded-lg hover:bg-indigo-700 text-sm"
          >
            Get started for free
          </Link>
        </div>
      </section>
    </div>
  )
}
