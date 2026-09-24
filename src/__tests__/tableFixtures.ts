import fs from 'fs';
import path from 'path';
import type { FluidTable } from '../types/fluidTable';

/** Reads a bundled fluid table straight from disk (the app loads it via expo-asset). */
export function readTable(id: string): FluidTable {
  const file = path.join(__dirname, '..', 'data', 'tables', `${id}.bin`);
  return JSON.parse(fs.readFileSync(file, 'utf8')) as FluidTable;
}
