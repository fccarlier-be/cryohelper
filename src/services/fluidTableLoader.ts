import { Asset } from 'expo-asset';
import type { FluidTable } from '../types/fluidTable';

// .bin files are registered as raw Metro assets (not inlined into the JS bundle).
// require() here is only for asset registration — the content is loaded on-demand.
/* eslint-disable @typescript-eslint/no-require-imports */
const TABLE_MODULES: Record<string, number> = {
  R134a:   require('../data/tables/R134a.bin') as number,
  R32:     require('../data/tables/R32.bin') as number,
  R22:     require('../data/tables/R22.bin') as number,
  R410A:   require('../data/tables/R410A.bin') as number,
  R407C:   require('../data/tables/R407C.bin') as number,
  R404A:   require('../data/tables/R404A.bin') as number,
  R507A:   require('../data/tables/R507A.bin') as number,
  R1234yf: require('../data/tables/R1234yf.bin') as number,
  R1234ze: require('../data/tables/R1234ze.bin') as number,
  R744:    require('../data/tables/R744.bin') as number,
  R290:    require('../data/tables/R290.bin') as number,
  R600:    require('../data/tables/R600.bin') as number,
  R600a:   require('../data/tables/R600a.bin') as number,
  R717:    require('../data/tables/R717.bin') as number,
  R448A:   require('../data/tables/R448A.bin') as number,
  R449A:   require('../data/tables/R449A.bin') as number,
  R452A:   require('../data/tables/R452A.bin') as number,
  R452B:   require('../data/tables/R452B.bin') as number,
  R454A:   require('../data/tables/R454A.bin') as number,
  R454B:   require('../data/tables/R454B.bin') as number,
  R454C:   require('../data/tables/R454C.bin') as number,
  R455A:   require('../data/tables/R455A.bin') as number,
  R718:    require('../data/tables/R718.bin') as number,
};
/* eslint-enable @typescript-eslint/no-require-imports */

const cache = new Map<string, FluidTable>();

export async function loadFluidTable(id: string): Promise<FluidTable> {
  if (cache.has(id)) return cache.get(id)!;

  const mod = TABLE_MODULES[id];
  if (mod === undefined) throw new Error(`Table non disponible : ${id}`);

  const asset = Asset.fromModule(mod);
  await asset.downloadAsync();

  if (!asset.localUri) throw new Error(`Impossible de charger l'asset : ${id}`);

  const response = await fetch(asset.localUri);
  const data: FluidTable = (await response.json()) as FluidTable;

  cache.set(id, data);
  return data;
}

export function prefetchFluidTable(id: string): void {
  loadFluidTable(id).catch(() => {});
}

export function clearFluidTableCache(): void {
  cache.clear();
}
