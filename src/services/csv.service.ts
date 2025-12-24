import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import { MaintenanceCost, WoType, CostType } from '../types';

export interface FilterCriteria {
  year?: number;
  monthStart?: number;
  monthEnd?: number;
  woType?: WoType;
  costType?: CostType;
}

@Injectable()
export class CsvService {
  private data: MaintenanceCost[] = [];

  async loadData(filePath?: string): Promise<MaintenanceCost[]> {
    const csvPath = filePath || path.join(process.cwd(), 'data', 'maintenance.csv');

    if (!fs.existsSync(csvPath)) {
      console.log('CSV file not found, using sample data');
      this.data = this.generateSampleData();
      return this.data;
    }

    const content = fs.readFileSync(csvPath, 'utf-8');
    const records = parse(content, {
      columns: true,
      skip_empty_lines: true,
    });

    this.data = records.map((row: any) => ({
      year: parseInt(row.year),
      month: parseInt(row.month),
      woType: row.wo_type as WoType,
      manhrs: parseFloat(row.manhrs) || 0,
      sparepart: parseFloat(row.sparepart) || 0,
      outsource: parseFloat(row.outsource) || 0,
    }));

    return this.data;
  }

  filterData(criteria: FilterCriteria): MaintenanceCost[] {
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

  getSummary(): string {
    const years = [...new Set(this.data.map((d) => d.year))].sort();
    const woTypes = [...new Set(this.data.map((d) => d.woType))];

    return `Data loaded: ${this.data.length} records, Years: ${years.join(', ')}, WO Types: ${woTypes.join(', ')}`;
  }

  getDataAsContext(): string {
    return JSON.stringify(this.data, null, 2);
  }

  getAllData(): MaintenanceCost[] {
    return this.data;
  }

  private generateSampleData(): MaintenanceCost[] {
    const sampleData: MaintenanceCost[] = [];
    const woTypes: WoType[] = ['breakdown', 'corrective', 'preventive'];
    const years = [2024, 2025];

    for (const year of years) {
      for (let month = 1; month <= 12; month++) {
        for (const woType of woTypes) {
          sampleData.push({
            year,
            month,
            woType,
            manhrs: Math.floor(Math.random() * 50000) + 10000,
            sparepart: Math.floor(Math.random() * 100000) + 20000,
            outsource: Math.floor(Math.random() * 80000) + 15000,
          });
        }
      }
    }

    return sampleData;
  }
}
