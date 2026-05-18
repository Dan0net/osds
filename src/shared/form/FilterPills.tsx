import PillSelect from './PillSelect'

export default function FilterPills({ value, onChange, options }) {
  return <PillSelect value={value} onChange={onChange} options={options} />
}
