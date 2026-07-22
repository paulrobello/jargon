import adjRaw from './data/adj.txt?raw';
import advRaw from './data/adv.txt?raw';
import repRaw from './data/rep.txt?raw';
import senRaw from './data/sen.txt?raw';
import { parseAdvTable, parseWordList, type JargonData } from './jargonate';

export function loadJargonData(): JargonData {
  return {
    adj: parseWordList(adjRaw),
    sen: parseWordList(senRaw),
    adv: parseAdvTable(advRaw, repRaw),
  };
}
