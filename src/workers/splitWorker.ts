import {
  prepareItems,
  splitPreparedItems,
  type DedupeMode,
  type InputDelimiter,
  type PrepareItemsStats,
  type SplitMode,
  type ValidationMode,
} from '@/utils/splitter';
import type { SplitGroup } from '@/types';

interface SplitWorkerRequest {
  rawInput: string;
  delimiter: InputDelimiter;
  dedupeMode: DedupeMode;
  validationMode: ValidationMode;
  customValidationPattern?: string;
  splitMode: SplitMode;
  splitValue: number;
}

interface SplitWorkerResponse {
  groups: SplitGroup[];
  stats: PrepareItemsStats;
}

self.onmessage = (event: MessageEvent<SplitWorkerRequest>) => {
  try {
    const payload = event.data;
    const prepared = prepareItems(payload.rawInput, {
      delimiter: payload.delimiter,
      dedupeMode: payload.dedupeMode,
      validationMode: payload.validationMode,
      customValidationPattern: payload.customValidationPattern,
    });

    const groups = splitPreparedItems(prepared.items, payload.splitMode, payload.splitValue);
    const response: SplitWorkerResponse = {
      groups,
      stats: prepared.stats,
    };

    self.postMessage(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown split error';
    self.postMessage({ error: message });
  }
};
