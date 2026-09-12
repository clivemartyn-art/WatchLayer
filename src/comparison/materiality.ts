export const MATERIALITY = { moderatePercent: 5, majorPercent: 25 } as const;
export function contentMateriality(previousWordCount: number, currentWordCount: number) {
  const percentageDifference = previousWordCount === 0 ? currentWordCount === 0 ? 0 : 100 : Math.round(Math.abs(currentWordCount-previousWordCount)/previousWordCount*10000)/100;
  const materiality = percentageDifference < MATERIALITY.moderatePercent ? 'minor' : percentageDifference <= MATERIALITY.majorPercent ? 'moderate' : 'major';
  return {materiality, context:{previousWordCount,currentWordCount,percentageDifference}} as const;
}
