import { Injectable } from '@nestjs/common';
import { MaintenanceCost, CostType, WoType } from '../types';

export interface CalculationResult {
  total: number;
  breakdown: {
    manhrs: number;
    sparepart: number;
    outsource: number;
  };
  byWoType: Record<WoType, number>;
  recordCount: number;
}

@Injectable()
export class CalculatorService {
  calculate(data: MaintenanceCost[], costType?: CostType): CalculationResult {
    const result: CalculationResult = {
      total: 0,
      breakdown: { manhrs: 0, sparepart: 0, outsource: 0 },
      byWoType: { breakdown: 0, corrective: 0, preventive: 0 },
      recordCount: data.length,
    };

    for (const record of data) {
      result.breakdown.manhrs += record.manhrs;
      result.breakdown.sparepart += record.sparepart;
      result.breakdown.outsource += record.outsource;

      const recordTotal = record.manhrs + record.sparepart + record.outsource;
      result.byWoType[record.woType] += recordTotal;
    }

    if (costType) {
      result.total = result.breakdown[costType];
    } else {
      result.total =
        result.breakdown.manhrs +
        result.breakdown.sparepart +
        result.breakdown.outsource;
    }

    return result;
  }

  compareWoTypes(
    data: MaintenanceCost[],
    type1: WoType,
    type2: WoType
  ): { type1Total: number; type2Total: number; difference: number } {
    const type1Data = data.filter((d) => d.woType === type1);
    const type2Data = data.filter((d) => d.woType === type2);

    const type1Total = this.calculate(type1Data).total;
    const type2Total = this.calculate(type2Data).total;

    return {
      type1Total,
      type2Total,
      difference: type1Total - type2Total,
    };
  }

  formatNumber(num: number): string {
    return num.toLocaleString('en-US');
  }

  buildResultContext(
    criteria: any,
    result: CalculationResult,
    comparison?: { type1Total: number; type2Total: number; difference: number }
  ): string {
    let context = `CALCULATION RESULTS (100% ACCURATE):\n`;
    context += `=====================================\n`;
    context += `Records analyzed: ${result.recordCount}\n`;
    context += `\nCost Breakdown:\n`;
    context += `- Manhours: ${this.formatNumber(result.breakdown.manhrs)} THB\n`;
    context += `- Spare Parts: ${this.formatNumber(result.breakdown.sparepart)} THB\n`;
    context += `- Outsource: ${this.formatNumber(result.breakdown.outsource)} THB\n`;
    context += `- TOTAL: ${this.formatNumber(result.total)} THB\n`;

    context += `\nBy Work Order Type:\n`;
    context += `- Breakdown: ${this.formatNumber(result.byWoType.breakdown)} THB\n`;
    context += `- Corrective: ${this.formatNumber(result.byWoType.corrective)} THB\n`;
    context += `- Preventive: ${this.formatNumber(result.byWoType.preventive)} THB\n`;

    if (comparison) {
      context += `\nCOMPARISON:\n`;
      context += `- ${criteria.compareWoTypes[0]}: ${this.formatNumber(comparison.type1Total)} THB\n`;
      context += `- ${criteria.compareWoTypes[1]}: ${this.formatNumber(comparison.type2Total)} THB\n`;
      context += `- Difference: ${this.formatNumber(comparison.difference)} THB\n`;
    }

    return context;
  }
}
