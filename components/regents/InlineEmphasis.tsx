export default function InlineEmphasis({ text }: { text: string }) {
  return <>{text.split(/(\*[^*\n]+\*)/g).map((part, index) => (
    part.startsWith('*') && part.endsWith('*') && part.length > 2
      ? <em key={index}>{part.slice(1, -1)}</em>
      : <span key={index}>{part}</span>
  ))}</>
}
