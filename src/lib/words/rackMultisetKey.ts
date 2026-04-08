/** Sorted multiset key — same for any permutation of the six letters (e.g. hearts / taersh). */

export function rackMultisetKey(rack: string): string {
  return rack
    .slice(0, 6)
    .toLowerCase()
    .split("")
    .sort()
    .join("");
}
