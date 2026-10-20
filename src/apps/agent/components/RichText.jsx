// Rendu léger du texte de l'agent : paragraphes, listes à puces / numérotées et **gras**.
// Pas de HTML brut : tout est construit en éléments React (aucune injection possible).

const BULLET = /^\s*[-*•]\s+(.*)$/
const NUMBER = /^\s*\d+[.)]\s+(.*)$/

function inline(text) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') && part.length > 4
      ? <strong key={i}>{part.slice(2, -2)}</strong>
      : part
  )
}

function parseBlocks(text) {
  const blocks = []
  for (const line of String(text ?? '').split('\n')) {
    const bullet = line.match(BULLET)
    const number = bullet ? null : line.match(NUMBER)
    const last = blocks[blocks.length - 1]
    if (bullet || number) {
      const type = bullet ? 'ul' : 'ol'
      if (last?.type === type) last.items.push((bullet || number)[1])
      else blocks.push({ type, items: [(bullet || number)[1]] })
    } else if (line.trim() === '') {
      blocks.push({ type: 'gap' })
    } else if (last?.type === 'p') {
      last.lines.push(line)
    } else {
      blocks.push({ type: 'p', lines: [line] })
    }
  }
  return blocks.filter((b, i, all) => b.type !== 'gap' || (i > 0 && i < all.length - 1 && all[i - 1].type !== 'gap'))
}

export default function RichText({ text, style }) {
  const blocks = parseBlocks(text)
  return (
    <div style={style}>
      {blocks.map((b, i) => {
        if (b.type === 'gap') return <div key={i} style={{ height: '6px' }} />
        if (b.type === 'p') {
          return <p key={i} style={{ margin: 0 }}>{b.lines.map((l, j) => <span key={j}>{j > 0 && <br />}{inline(l)}</span>)}</p>
        }
        const List = b.type
        return (
          <List key={i} style={{ margin: '4px 0', paddingLeft: '20px' }}>
            {b.items.map((it, j) => <li key={j} style={{ margin: '2px 0' }}>{inline(it)}</li>)}
          </List>
        )
      })}
    </div>
  )
}
