// Scènes pour « Où est-il ? » : des catégories différentes sont mélangées d'une manche à l'autre
// (l'entrelacement aide pour le matériel visuel, Brunmair & Richter, 2019).

export const SCENES = [
  { name: 'La cuisine', bg: '#fde8d7', objects: '🍳 🥄 🍴 🧂 🍞 🧀 🥕 🍅 🫖 🥛 🍯 🔪 🥚 🍋' },
  { name: 'Le bureau', bg: '#e3e9fb', objects: '✏️ 📎 📌 📏 ✂️ 📒 🖊️ 💡 📱 ⌨️ 🗂️ ☕ 🖇️ 📐' },
  { name: 'La plage', bg: '#fdf3c8', objects: '🐚 ⛱️ 🩴 🕶️ 🏐 🦀 🪣 🍦 🐬 🌴 ⛵ 🧴 🪁 🏄' },
  { name: 'Le jardin', bg: '#e1f4dc', objects: '🌷 🐌 🍄 🐞 🪴 🦋 🌻 🐝 🍓 🐦 🪨 🐸 🌵 🦔' },
  { name: 'La salle de bain', bg: '#dcf1f4', objects: '🧼 🪥 🧽 🛁 🪒 🧻 🪞 🦆 🚿 🧺 💈 🫧 🩹 🧴' },
  { name: 'L’atelier', bg: '#efe6dc', objects: '🔨 🔧 🪛 🪚 🔩 🧰 🪜 🧲 ⚙️ 🪓 📐 🧯 🪤 🔦' },
  { name: 'La chambre d’enfant', bg: '#f6e3f3', objects: '🧸 🪀 🎈 🚂 🪁 🎨 🦖 🎲 🧩 🤖 🛼 🪅 🎺 🚀' },
].map((s) => ({ ...s, objects: s.objects.split(' ') }));
