import { Controller, Get, Query } from '@nestjs/common';
import { WorkOrderService, WorkOrderFilterCriteria } from '../services/workorder.service';
import { WoType } from '../types';

/**
 * API Response interfaces for work order data
 */
export interface WorkOrderSummaryResponse {
  success: boolean;
  data: {
    totalCount: number;
    byWoType: Record<WoType, number>;
    recordCount: number;
    filters: {
      year?: number;
      monthStart?: number;
      monthEnd?: number;
      woType?: WoType;
    };
  };
}

export interface WorkOrderCompareResponse {
  success: boolean;
  data: {
    type1: {
      name: WoType;
      count: number;
    };
    type2: {
      name: WoType;
      count: number;
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

/**
 * WorkOrderController - REST API for work order count data
 * 
 * This controller provides endpoints for work order COUNT queries.
 * Different from MaintenanceController which handles COST queries.
 */
@Controller('api/workorders')
export class WorkOrderController {
  constructor(private readonly workOrderService: WorkOrderService) {}

  /**
   * GET /api/workorders/summary
   * 
   * Get work order count summary with optional filters.
   * Use this for questions about NUMBER of work orders.
   * 
   * @example GET /api/workorders/summary?year=2025
   * @example GET /api/workorders/summary?year=2025&woType=breakdown
   */
  @Get('summary')
  async getWorkOrderSummary(
    @Query('year') year?: string,
    @Query('monthStart') monthStart?: string,
    @Query('monthEnd') monthEnd?: string,
    @Query('woType') woType?: WoType,
  ): Promise<WorkOrderSummaryResponse> {
    const criteria: WorkOrderFilterCriteria = {};
    
    if (year) criteria.year = parseInt(year);
    if (monthStart) criteria.monthStart = parseInt(monthStart);
    if (monthEnd) criteria.monthEnd = parseInt(monthEnd);
    if (woType) criteria.woType = woType;

    const filteredData = this.workOrderService.filterData(criteria);
    const summary = this.workOrderService.calculateSummary(filteredData);

    return {
      success: true,
      data: {
        totalCount: summary.totalCount,
        byWoType: summary.byWoType,
        recordCount: summary.recordCount,
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
   * GET /api/workorders/compare
   * 
   * Compare work order counts between two types.
   * 
   * @example GET /api/workorders/compare?type1=breakdown&type2=preventive&year=2025
   */
  @Get('compare')
  async compareWoTypes(
    @Query('type1') type1: WoType,
    @Query('type2') type2: WoType,
    @Query('year') year?: string,
    @Query('monthStart') monthStart?: string,
    @Query('monthEnd') monthEnd?: string,
  ): Promise<WorkOrderCompareResponse> {
    const criteria: WorkOrderFilterCriteria = {};
    
    if (year) criteria.year = parseInt(year);
    if (monthStart) criteria.monthStart = parseInt(monthStart);
    if (monthEnd) criteria.monthEnd = parseInt(monthEnd);

    const filteredData = Object.keys(criteria).length > 0 
      ? this.workOrderService.filterData(criteria)
      : this.workOrderService.getAllData();

    const comparison = this.workOrderService.compareWoTypes(filteredData, type1, type2);
    
    const percentageDiff = comparison.type2Count !== 0 
      ? ((comparison.type1Count - comparison.type2Count) / comparison.type2Count) * 100 
      : 0;

    return {
      success: true,
      data: {
        type1: {
          name: type1,
          count: comparison.type1Count,
        },
        type2: {
          name: type2,
          count: comparison.type2Count,
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
   * GET /api/workorders/data
   * 
   * Get raw work order count records.
   */
  @Get('data')
  async getData(
    @Query('year') year?: string,
    @Query('monthStart') monthStart?: string,
    @Query('monthEnd') monthEnd?: string,
    @Query('woType') woType?: WoType,
  ) {
    const criteria: WorkOrderFilterCriteria = {};
    
    if (year) criteria.year = parseInt(year);
    if (monthStart) criteria.monthStart = parseInt(monthStart);
    if (monthEnd) criteria.monthEnd = parseInt(monthEnd);
    if (woType) criteria.woType = woType;

    const records = Object.keys(criteria).length > 0
      ? this.workOrderService.filterData(criteria)
      : this.workOrderService.getAllData();

    return {
      success: true,
      data: {
        records,
        count: records.length,
        totalWorkOrders: records.reduce((sum, r) => sum + r.count, 0),
        filters: criteria,
      },
    };
  }

  /**
   * GET /api/workorders/overview
   * 
   * Get overview of available work order data.
   */
  @Get('overview')
  async getOverview() {
    const allData = this.workOrderService.getAllData();
    const years = [...new Set(allData.map(d => d.year))].sort();
    const woTypes = [...new Set(allData.map(d => d.woType))];
    const totalWorkOrders = allData.reduce((sum, d) => sum + d.count, 0);

    return {
      success: true,
      data: {
        totalRecords: allData.length,
        totalWorkOrders,
        availableYears: years,
        availableWoTypes: woTypes,
      },
    };
  }
}
