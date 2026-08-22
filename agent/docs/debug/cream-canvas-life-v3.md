# Debug Script — Life Cream-Canvas Island v3.0 (LivingSubstrate v5.0)

Paste into DevTools Console (Ctrl+Shift+I → Console) on the Life page, then scroll the river.

```js
// Life Cream-Canvas Debug Script v1.0
console.log('=== Life Cream-Canvas Debug ===')
console.log('Timestamp:', new Date().toISOString())

// 1. New code loaded?
const stamp = document.querySelector('[data-page="life"]')
console.log('LifePage v3.0 mounted:', stamp ? '✅' : '❌')

// 2. Cream canvas + ink substrate
const canvas = document.querySelector('[data-page="life"] canvas')
console.log('Substrate canvas present:', canvas ? '✅' : '❌', canvas || '')
const bg = getComputedStyle(stamp).backgroundColor
console.log('Page background:', bg, '(expect rgb(244, 243, 240) = #F4F3F0)')

// 3. Process windows (3 ink cells, cure on scroll)
const cells = document.querySelectorAll('[data-page="life"] .relative.h-40')
console.log('Process windows:', cells.length, '(expect 3)')

// 4. Cured footer
const footer = [...document.querySelectorAll('h2')].find(h => h.textContent.includes('cured'))
console.log('Cured footer:', footer ? '✅' : '❌')

// 5. Hero serif copy
const hero = [...document.querySelectorAll('h1')].find(h => h.textContent.includes('grown to a spec'))
console.log('Serif hero:', hero ? '✅' : '❌', hero?.textContent?.slice(0, 40))

// 6. Knock-out numbers on preview cards
const nums = [...document.querySelectorAll('p.text-\\[\\#F4F3F0\\]')]
console.log('Knock-out numbers:', nums.length, '(expect 3, cream on ink)')

// 7. Interaction: scroll to footer → process windows should freeze (sim cure)
const fb = footer?.getBoundingClientRect()
console.log('Scroll to footer, check cells stop moving:', footer ? 'scroll now' : 'no footer')

console.log('=== Debug Complete ===')
```