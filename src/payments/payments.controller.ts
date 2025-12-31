import { Controller, Get, Post, Put, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { Transaction } from './entities/transaction.entity';
import { SupabaseGuard } from '../auth/supabase.guard';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('mobile-money')
  @UseGuards(SupabaseGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Process mobile money payment' })
  async processMobileMoney(@Body() paymentData: any): Promise<Transaction> {
    return this.paymentsService.processMobileMoneyPayment(paymentData.orderId, paymentData);
  }

  @Post('bank-transfer')
  @UseGuards(SupabaseGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Process bank transfer payment' })
  async processBankTransfer(@Body() paymentData: any): Promise<Transaction> {
    return this.paymentsService.processBankTransfer(paymentData.orderId, paymentData);
  }

  @Get('order/:orderId')
  @UseGuards(SupabaseGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get transaction by order ID' })
  async getTransactionByOrder(@Param('orderId') orderId: string): Promise<Transaction> {
    return this.paymentsService.findByOrderId(orderId);
  }

  @Put(':id/status')
  @UseGuards(SupabaseGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update transaction status' })
  async updateStatus(@Param('id') id: string, @Body() statusData: { status: string }): Promise<Transaction> {
    return this.paymentsService.updateTransactionStatus(id, statusData.status);
  }
}