import { execSync } from 'child_process'
import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pub = resolve(__dirname, '../public')

function sharp(input, output, ...args) {
  execSync(`npx --yes sharp-cli -i "${input}" -o "${output}" ${args.join(' ')}`, { stdio: 'pipe' })
}

// Icon PNGs (from osds-icon.svg) — used for manifest, push notifications
sharp(`${pub}/osds-icon.svg`, `${pub}/osds-192.png`, 'resize 192 192')
sharp(`${pub}/osds-icon.svg`, `${pub}/osds-512.png`, 'resize 512 512')
console.log('Generated osds-192.png, osds-512.png')

// Logo PNGs (from osds-logo.svg) — used for emails
sharp(`${pub}/osds-logo.svg`, `${pub}/osds-logo-192.png`, 'resize 192')
sharp(`${pub}/osds-logo.svg`, `${pub}/osds-logo-400.png`, 'resize 400')
sharp(`${pub}/osds-logo.svg`, `${pub}/osds-logo-512.png`, 'resize 512')
console.log('Generated osds-logo-192.png, osds-logo-400.png, osds-logo-512.png')

// BIMI SVG (from osds-icon.svg — stripped to SVG Tiny 1.2 PS)
const iconContent = readFileSync(`${pub}/osds-icon.svg`, 'utf-8')

const viewBoxMatch = iconContent.match(/viewBox="([^"]+)"/)
const viewBox = viewBoxMatch ? viewBoxMatch[1] : '0 0 68 68'

const shapes = []
const shapeRegex = /<(circle|path|rect|ellipse|polygon|polyline|line)\b[^>]*\/?>(?:<\/\1>)?/g
let match
while ((match = shapeRegex.exec(iconContent)) !== null) {
  let el = match[0]
  el = el.replace(/style="[^"]*fill:\s*([^;"]+)[^"]*"/, 'fill="$1"')
  el = el.replace(/\s+(style|class|xmlns:\w+|xml:\w+|serif:\w+)="[^"]*"/g, '')
  el = el.replace(/fill="url\([^)]+\)"/, 'fill="#f03e76"')
  shapes.push(el)
}

const bimi = `<svg version="1.2" baseProfile="tiny-ps" xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">
  <title>One Stop Dog Shop</title>
  ${shapes.join('\n  ')}
</svg>
`
writeFileSync(`${pub}/osds-bimi.svg`, bimi)
console.log('Generated osds-bimi.svg')
