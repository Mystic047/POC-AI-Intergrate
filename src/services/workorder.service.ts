import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import { WoType } from '../types';

export interface WorkOrderCount {
  year: number;
  month: number;
  woType: WoType;
  count: number;
}

export interface WorkOrderFilterCriteria {
  year?: number;
  monthStart?: number;
  monthEnd?: number;
  woType?: WoType;
}

interface RawWorkOrderRow {
  year: string;
  month: string;
  woType: string;
  count: string;
}

/**
 * Service for handling work order count data
 * This is separate from cost data - tracks NUMBER of work orders
 */
@Injectable()
export class WorkOrderService {
  private data: WorkOrderCount[] = [];

  async loadData(filePath?: string): Promise<WorkOrderCount[]> {
    const csvPath = filePath || path.join(process.cwd(), 'data', 'workorder_counts.csv');

    if (!fs.existsSync(csvPath)) {
      console.log('Work order CSV file not found, using sample data');
      this.data = this.generateSampleData();
      return this.data;
    }

    const content = fs.readFileSync(csvPath, 'utf-8');
    const records: RawWorkOrderRow[] = parse(content, {
      columns: true,
      skip_empty_lines: true,
    });

    this.data = records.map(row => ({
      year: parseInt(row.year),
      month: parseInt(row.month),
      woType: row.woType as WoType,
      count: parseInt(row.count),
    }));

    console.log(`Loaded ${this.data.length} work order count records`);
    return this.data;
  }

  filterData(criteria: WorkOrderFilterCriteria): WorkOrderCount[] {
    let result = this.data;

    if (criteria.year) {
      result = result.filter((d) => d.year === criteria.year);
    }

    if (criteria.monthStart && criteria.monthEnd) {
      result = result.filter(
        (d) => d.month >= criteria.monthStart! && d.month <= criteria.monthEnd!
      );
    } else if (criteria.monthStart) {
      result = result.filter((d) => d.month === criteria.monthStart);
    }

    if (criteria.woType) {
      result = result.filter((d) => d.woType === criteria.woType);
    }

    return result;
  }

  /**
   * Get summary of work order counts
   */
  calculateSummary(data: WorkOrderCount[]): {
    totalCount: number;
    byWoType: Record<WoType, number>;
    recordCount: number;
  } {
    const result = {
      totalCount: 0,
      byWoType: { breakdown: 0, corrective: 0, preventive: 0 } as Record<WoType, number>,
      recordCount: data.length,
    };

    for (const record of data) {
      result.totalCount += record.count;
      result.byWoType[record.woType] += record.count;
    }

    return result;
  }

  /**
   * Compare work order counts between two types
   */
  compareWoTypes(
    data: WorkOrderCount[],
    type1: WoType,
    type2: WoType
  ): { type1Count: number; type2Count: number; difference: number } {
    const type1Data = data.filter((d) => d.woType === type1);
    const type2Data = data.filter((d) => d.woType === type2);

    const type1Count = type1Data.reduce((sum, d) => sum + d.count, 0);
    const type2Count = type2Data.reduce((sum, d) => sum + d.count, 0);

    return {
      type1Count,
      type2Count,
      difference: type1Count - type2Count,
    };
  }

  getSummary(): string {
    const years = [...new Set(this.data.map((d) => d.year))].sort();
    const woTypes = [...new Set(this.data.map((d) => d.woType))];
    const totalCount = this.data.reduce((sum, d) => sum + d.count, 0);

    return `Work Orders: ${this.data.length} records, ${totalCount} total WOs, Years: ${years.join(', ')}, Types: ${woTypes.join(', ')}`;
  }

  getAllData(): WorkOrderCount[] {
    return this.data;
  }

  private generateSampleData(): WorkOrderCount[] {
    const sampleData: WorkOrderCount[] = [];
    const woTypes: WoType[] = ['breakdown', 'corrective', 'preventive'];
    const years = [2024, 2025];

    for (const year of years) {
      for (let month = 1; month <= 12; month++) {
        for (const woType of woTypes) {
          sampleData.push({
            year,
            month,
            woType,
            count: Math.floor(Math.random() * 15) + 5,
          });
        }
      }
    }

    return sampleData;
  }
}
