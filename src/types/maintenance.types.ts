export type WoType = 'breakdown' | 'corrective' | 'preventive';
export type CostType = 'manhrs' | 'sparepart' | 'outsource';

export interface MaintenanceCost {
  year: number;
  month: number;
  woType: WoType;
  manhrs: number;
  sparepart: number;
  outsource: number;
}

export interface QueryResult {
  question: string;
  parsedQuery: any;
  calculationResult: any;
  answer: string;
  rawContext: string;
}
