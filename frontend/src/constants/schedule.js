export const ROW_HEIGHT = 80       
export const ROW_GAP    = 2        

export const SLOTS = [
  { label: '08:30\n11:00', short: '08:30' },
  { label: '11:00\n13:30', short: '11:00' },
  { label: '13:30\n16:00', short: '13:30' },
  { label: '16:00\n18:30', short: '16:00' },
]

export const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi']

export const SESSION_COLORS = [
  'blue', 'orange', 'green', 'purple', 'red',
]

export const colorForIndex = (i) => SESSION_COLORS[i % SESSION_COLORS.length]
