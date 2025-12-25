import { Controller, Get, Query } from '@nestjs/common';
import { CsvService, FilterCriteria } from '../services/csv.service';
import { CalculatorService, CalculationResult } from '../services/calculator.service';
import { WoType, CostType } from '../types';

/**
 * API Response interfaces for the maintenance data
 */
export interface CostSummaryResponse {
  success: boolean;
  data: {
    totalCost: number;
    breakdown: {
      manhrs: number;
      sparepart: number;
      outsource: number;
    };
    byWoType: Record<WoType, number>;
    recordCount: number;
    filters: {
      year?: number;
      monthStart?: number;
      monthEnd?: number;
      woType?: WoType;
      costType?: CostType;
    };
  };
}

export interface CompareWoTypesResponse {
  success: boolean;
  data: {
    type1: {
      name: WoType;
      totalCost: number;
    };
    type2: {
      name: WoType;
      totalCost: number;
    };
    difference: number;
    percentageDiff: number;
    filters: {
      year?: number;
      monthStart?: number;
      monthEnd?: number;
    };
  };
}

export interface DataListResponse {
  success: boolean;
  data: {
    records: any[];
    count: number;
    filters: {
      year?: number;
      monthStart?: number;
      monthEnd?: number;
      woType?: WoType;
    };
  };
}

/**
 * MaintenanceController - REST API for maintenance cost data
 * 
 * This controller provides endpoints that the AI Agent can call
 * using Function Calling to get real data from the CSV file.
 */
@Controller('api/maintenance')
export class MaintenanceController {
  constructor(
    private readonly csvService: CsvService,
    private readonly calculatorService: CalculatorService,
  ) {}

  /**
   * GET /api/maintenance/cost-summary
   * 
   * Get cost summary with optional filters.
   * This is the main endpoint the AI will call for cost-related questions.
   * 
   * @example GET /api/maintenance/cost-summary?year=2025&monthStart=1&monthEnd=3
   * @example GET /api/maintenance/cost-summary?year=2025&woType=preventive
   */
  @Get('cost-summary')
  async getCostSummary(
    @Query('year') year?: string,
    @Query('monthStart') monthStart?: string,
    @Query('monthEnd') monthEnd?: string,
    @Query('woType') woType?: WoType,
    @Query('costType') costType?: CostType,
  ): Promise<CostSummaryResponse> {
    // Build filter criteria
    const criteria: FilterCriteria = {};
    
    if (year) criteria.year = parseInt(year);
    if (monthStart) criteria.monthStart = parseInt(monthStart);
    if (monthEnd) criteria.monthEnd = parseInt(monthEnd);
    if (woType) criteria.woType = woType;
    if (costType) criteria.costType = costType;

    // Filter data
    const filteredData = this.csvService.filterData(criteria);

    // Calculate results
    const result = this.calculatorService.calculate(filteredData, costType);

    return {
      success: true,
      data: {
        totalCost: result.total,
        breakdown: result.breakdown,
        byWoType: result.byWoType,
        recordCount: result.recordCount,
        filters: {
          year: criteria.year,
          monthStart: criteria.monthStart,
          monthEnd: criteria.monthEnd,
          woType: criteria.woType,
          costType: criteria.costType,
        },
      },
    };
  }

  /**
   * GET /api/maintenance/compare
   * 
   * Compare two work order types.
   * AI will call this when user asks to compare (e.g., "breakdown vs preventive")
   * 
   * @example GET /api/maintenance/compare?type1=breakdown&type2=preventive&year=2025
   */
  @Get('compare')
  async compareWoTypes(
    @Query('type1') type1: WoType,
    @Query('type2') type2: WoType,
    @Query('year') year?: string,
    @Query('monthStart') monthStart?: string,
    @Query('monthEnd') monthEnd?: string,
  ): Promise<CompareWoTypesResponse> {
    // Build filter criteria (without woType since we're comparing)
    const criteria: FilterCriteria = {};
    
    if (year) criteria.year = parseInt(year);
    if (monthStart) criteria.monthStart = parseInt(monthStart);
    if (monthEnd) criteria.monthEnd = parseInt(monthEnd);

    // Get all data for the period
    const filteredData = Object.keys(criteria).length > 0 
      ? this.csvService.filterData(criteria)
      : this.csvService.getAllData();

    // Compare the two types
    const comparison = this.calculatorService.compareWoTypes(filteredData, type1, type2);
    
    const percentageDiff = comparison.type2Total !== 0 
      ? ((comparison.type1Total - comparison.type2Total) / comparison.type2Total) * 100 
      : 0;

    return {
      success: true,
      data: {
        type1: {
          name: type1,
          totalCost: comparison.type1Total,
        },
        type2: {
          name: type2,
          totalCost: comparison.type2Total,
        },
        difference: comparison.difference,
        percentageDiff: Math.round(percentageDiff * 100) / 100,
        filters: {
          year: criteria.year,
          monthStart: criteria.monthStart,
          monthEnd: criteria.monthEnd,
        },
      },
    };
  }

  /**
   * GET /api/maintenance/data
   * 
   * Get raw data records with optional filters.
   * Useful when AI needs to list or show detailed records.
   * 
   * @example GET /api/maintenance/data?year=2025&monthStart=1&monthEnd=1
   */
  @Get('data')
  async getData(
    @Query('year') year?: string,
    @Query('monthStart') monthStart?: string,
    @Query('monthEnd') monthEnd?: string,
    @Query('woType') woType?: WoType,
  ): Promise<DataListResponse> {
    const criteria: FilterCriteria = {};
    
    if (year) criteria.year = parseInt(year);
    if (monthStart) criteria.monthStart = parseInt(monthStart);
    if (monthEnd) criteria.monthEnd = parseInt(monthEnd);
    if (woType) criteria.woType = woType;

    const records = Object.keys(criteria).length > 0
      ? this.csvService.filterData(criteria)
      : this.csvService.getAllData();

    return {
      success: true,
      data: {
        records,
        count: records.length,
        filters: {
          year: criteria.year,
          monthStart: criteria.monthStart,
          monthEnd: criteria.monthEnd,
          woType: criteria.woType,
        },
      },
    };
  }

  /**
   * GET /api/maintenance/summary
   * 
   * Get a quick overview of available data.
   */
  @Get('summary')
  async getSummary() {
    const allData = this.csvService.getAllData();
    const years = [...new Set(allData.map(d => d.year))].sort();
    const woTypes = [...new Set(allData.map(d => d.woType))];

    return {
      success: true,
      data: {
        totalRecords: allData.length,
        availableYears: years,
        availableWoTypes: woTypes,
        availableCostTypes: ['manhrs', 'sparepart', 'outsource'],
      },
    };
  }
}
