const getColorFromName = (name) => {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }

  const hue = Math.abs(hash % 360)
  return `hsl(${hue}, 60%, 55%)`
}

export const generateInitialsAvatar = (firstName, lastName) => {
  const initial1 = firstName.charAt(0).toUpperCase()
  const initial2 = lastName.charAt(0).toUpperCase()
  const initials = `${initial1}${initial2}`

  const nameKey = `${firstName} ${lastName}`
  const backgroundColor = getColorFromName(nameKey)

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
  <rect width="200" height="200" fill="${backgroundColor}" rx="20"/>
  <text x="100" y="120" font-family="Arial, sans-serif" font-size="80" fill="white" text-anchor="middle" dominant-baseline="middle">${initials}</text>
</svg>`

  return svg
}
