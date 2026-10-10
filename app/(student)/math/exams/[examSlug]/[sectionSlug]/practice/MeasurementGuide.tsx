import { MATH_MEASUREMENT_GUIDES } from '@/content/math-exams/measurement-guides'

export default function MeasurementGuide({ questionId, isSpanish }: { questionId: string; isSpanish: boolean }) {
  const guide = MATH_MEASUREMENT_GUIDES[questionId]
  if (!guide) return null
  const title = isSpanish ? 'Guía de medición de Vine' : 'Vine measurement guide'
  const description = guide.kind === 'ruler'
    ? (isSpanish ? 'Cada pulgada tiene cuatro intervalos iguales. Compara los extremos con las marcas de la regla.' : 'Each inch has four equal intervals. Compare the endpoints with the ruler marks.')
    : (isSpanish ? 'Lee desde 0° en la semirrecta horizontal hasta la otra semirrecta. Las marcas pequeñas están separadas por un grado.' : 'Read from 0° on the horizontal ray to the other ray. Small marks are one degree apart.')
  const point = (degrees: number, radius: number) => [220 + radius * Math.cos(degrees * Math.PI / 180), 210 - radius * Math.sin(degrees * Math.PI / 180)]
  const titleId = `${questionId}-measure-title`
  const descriptionId = `${questionId}-measure-description`
  const accessiblePosition = guide.kind === 'ruler'
    ? (isSpanish ? 'Después de 0, los extremos coinciden con estas marcas pequeñas: ' : 'Counting small ticks after 0, the endpoints align with ticks: ') + guide.lengths.map(length => length * 4).join(', ') + '.'
    : (isSpanish ? 'La semirrecta inclinada cruza ' : 'The slanted ray crosses ') + (guide.degrees % 10 === 0
        ? (isSpanish ? 'la marca rotulada ' : 'the labeled tick ') + guide.degrees + '°.'
        : (guide.degrees % 10) + (isSpanish ? ' marcas pequeñas después de ' : ' small ticks after ') + Math.floor(guide.degrees / 10) * 10 + '°.')
  return (
    <section aria-label={title} className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-950">
      <h3 className="font-bold">{title}</h3>
      <p className="mt-1">{isSpanish ? 'Esta adaptación reproduce la medida del dibujo original junto a su escala. No uses una regla física sobre la pantalla.' : 'This adaptation reproduces the original measurement beside its scale. Do not use a physical ruler on your screen.'}</p>
      <p className="mt-2">{description}</p>
      {guide.kind === 'ruler' ? (
        <svg viewBox={`0 0 440 ${guide.lengths.length * 44 + 75}`} className="mt-3 h-auto w-full" role="img" aria-labelledby={`${titleId} ${descriptionId}`}>
          <title id={titleId}>{isSpanish ? 'Segmentos y regla en pulgadas' : 'Segments and inch ruler'}</title>
          <desc id={descriptionId}>{description} {accessiblePosition}</desc>
          {guide.lengths.map((length, index) => {
            const y = 25 + index * 44, x = 30 + length * 76
            return <g key={index}>
              <path d={`M30 ${y - 7} V${y + 7} M30 ${y} H${x} M${x} ${y - 7} V${y + 7}`} stroke="#166534" strokeWidth="3" fill="none" />
              <path d={`M${x} ${y + 8} V${guide.lengths.length * 44 + 25}`} stroke="#64748b" strokeDasharray="3 4" />
            </g>
          })}
          <g transform={`translate(30 ${guide.lengths.length * 44 + 25})`} fill="#172554" stroke="#172554">
            <path d="M0 0 H380" />
            {Array.from({ length: 21 }, (_, i) => <g key={i} transform={`translate(${i * 19} 0)`}>
              <path d={`M0 0 V${i % 4 === 0 ? 18 : i % 2 === 0 ? 12 : 8}`} />
              {i % 4 === 0 && <text y="35" textAnchor="middle" stroke="none" fontSize="15">{i / 4}</text>}
            </g>)}
          </g>
        </svg>
      ) : (
        <svg viewBox="0 0 440 235" className="mt-3 h-auto w-full" role="img" aria-labelledby={`${titleId} ${descriptionId}`}>
          <title id={titleId}>{isSpanish ? 'Ángulo y transportador' : 'Angle and protractor'}</title>
          <desc id={descriptionId}>{description} {accessiblePosition}</desc>
          <path d="M30 210 A190 190 0 0 1 410 210 H30" fill="white" stroke="#64748b" />
          {Array.from({ length: 181 }, (_, value) => {
            const angle = guide.zeroSide === 'left' ? 180 - value : value
            const outer = point(angle, 190), inner = point(angle, value % 10 === 0 ? 174 : value % 5 === 0 ? 180 : 185), label = point(angle, 157)
            return <g key={value}>
              <line x1={outer[0]} y1={outer[1]} x2={inner[0]} y2={inner[1]} stroke="#475569" />
              {value % 10 === 0 && <text x={label[0]} y={label[1]} textAnchor="middle" dominantBaseline="middle" fill="#172554" fontSize="12">{value}</text>}
            </g>
          })}
          {[guide.zeroSide === 'left' ? 180 : 0, guide.zeroSide === 'left' ? 180 - guide.degrees : guide.degrees].map((angle, i) => {
            const end = point(angle, 199)
            return <line key={i} x1="220" y1="210" x2={end[0]} y2={end[1]} stroke="#166534" strokeWidth="2.5" />
          })}
          <circle cx="220" cy="210" r="3" fill="#166534" />
        </svg>
      )}
    </section>
  )
}
