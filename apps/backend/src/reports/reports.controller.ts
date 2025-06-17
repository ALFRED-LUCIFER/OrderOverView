import {
  Controller,
  Get,
  Param,
  Query,
  Res,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('quarterly/:year/:quarter')
  @ApiOperation({ summary: 'Generate quarterly analytics report' })
  @ApiResponse({ status: 200, description: 'Quarterly report data' })
  async getQuarterlyReport(
    @Param('year', ParseIntPipe) year: number,
    @Param('quarter', ParseIntPipe) quarter: number,
  ) {
    return this.reportsService.generateQuarterlyReport(year, quarter);
  }

  @Get('quarterly/:year/:quarter/pdf')
  @ApiOperation({ summary: 'Download quarterly report as PDF' })
  @ApiResponse({ status: 200, description: 'PDF file download' })
  async downloadQuarterlyReportPdf(
    @Param('year', ParseIntPipe) year: number,
    @Param('quarter', ParseIntPipe) quarter: number,
    @Res() res: Response,
  ) {
    const pdfBuffer = await this.reportsService.generateQuarterlyReportPdf(year, quarter);
    
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="quarterly-report-Q${quarter}-${year}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    
    res.end(pdfBuffer);
  }

  @Get('customer/:customerId')
  @ApiOperation({ summary: 'Generate customer analytics report' })
  @ApiResponse({ status: 200, description: 'Customer report data' })
  async getCustomerReport(@Param('customerId') customerId: string) {
    return this.reportsService.generateCustomerReport(customerId);
  }

  @Get('customer/:customerId/pdf')
  @ApiOperation({ summary: 'Download customer report as PDF' })
  @ApiResponse({ status: 200, description: 'PDF file download' })
  async downloadCustomerReportPdf(
    @Param('customerId') customerId: string,
    @Res() res: Response,
  ) {
    const customer = await this.reportsService.generateCustomerReport(customerId);
    const pdfBuffer = await this.reportsService.generateCustomerReportPdf(customerId);
    
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="customer-report-${customer.customerName.replace(/[^a-zA-Z0-9]/g, '-')}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    
    res.end(pdfBuffer);
  }

  @Get('analytics/overview')
  @ApiOperation({ summary: 'Get general analytics overview' })
  @ApiResponse({ status: 200, description: 'Analytics overview data' })
  async getAnalyticsOverview() {
    const currentYear = new Date().getFullYear();
    const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3);
    
    // Get current and previous quarter reports
    const currentQuarterReport = await this.reportsService.generateQuarterlyReport(
      currentYear,
      currentQuarter,
    );
    
    let previousQuarterReport;
    try {
      if (currentQuarter === 1) {
        previousQuarterReport = await this.reportsService.generateQuarterlyReport(
          currentYear - 1,
          4,
        );
      } else {
        previousQuarterReport = await this.reportsService.generateQuarterlyReport(
          currentYear,
          currentQuarter - 1,
        );
      }
    } catch (error) {
      previousQuarterReport = null;
    }

    return {
      current: {
        quarter: currentQuarterReport.quarter,
        year: currentQuarterReport.year,
        totalOrders: currentQuarterReport.totalOrders,
        totalRevenue: currentQuarterReport.totalRevenue,
        ordersByStatus: currentQuarterReport.ordersByStatus,
        topCountries: currentQuarterReport.topCountries.slice(0, 5),
        topCustomers: currentQuarterReport.topCustomers.slice(0, 5),
      },
      previous: previousQuarterReport ? {
        quarter: previousQuarterReport.quarter,
        year: previousQuarterReport.year,
        totalOrders: previousQuarterReport.totalOrders,
        totalRevenue: previousQuarterReport.totalRevenue,
      } : null,
      trends: {
        ordersGrowth: previousQuarterReport
          ? ((currentQuarterReport.totalOrders - previousQuarterReport.totalOrders) / previousQuarterReport.totalOrders) * 100
          : 0,
        revenueGrowth: previousQuarterReport
          ? ((currentQuarterReport.totalRevenue - previousQuarterReport.totalRevenue) / previousQuarterReport.totalRevenue) * 100
          : 0,
      },
    };
  }

  @Get('analytics/quarters')
  @ApiOperation({ summary: 'Get available quarters for reporting' })
  @ApiResponse({ status: 200, description: 'Available quarters list' })
  @ApiQuery({ name: 'year', required: false, description: 'Filter by year' })
  async getAvailableQuarters(@Query('year') year?: string) {
    const currentYear = new Date().getFullYear();
    const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3);
    
    const quarters = [];
    const startYear = year ? parseInt(year) : currentYear - 2;
    const endYear = year ? parseInt(year) : currentYear;
    
    for (let y = startYear; y <= endYear; y++) {
      const maxQuarter = y === currentYear ? currentQuarter : 4;
      for (let q = 1; q <= maxQuarter; q++) {
        quarters.push({
          year: y,
          quarter: q,
          label: `Q${q} ${y}`,
          value: `${y}-${q}`,
        });
      }
    }
    
    return quarters.reverse(); // Most recent first
  }
}
