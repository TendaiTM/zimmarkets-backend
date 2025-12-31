import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { Transaction } from './entities/transaction.entity'; // Keep if this is an interface now

@Injectable()
export class PaymentsService {
  constructor(
    private readonly supabaseService: SupabaseService
  ) {}

  async createTransaction(transactionData: any): Promise<Transaction> {
    const supabase = this.supabaseService.getClient();
    
    const { data: transaction, error } = await supabase
      .from('transactions')
      .insert({
        ...transactionData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    // ✅ ADDED: Error handling for createTransaction
    if (error) {
      throw new BadRequestException(`Failed to create transaction: ${error.message}`);
    }

    if (!transaction) {
      throw new BadRequestException('Transaction creation failed');
    }

    return transaction;
  }

  async processMobileMoneyPayment(orderId: string, paymentData: any): Promise<Transaction> {
    const supabase = this.supabaseService.getClient();
    
    // Create transaction with initial status
    const transactionData = {
      order_id: orderId,
      amount: paymentData.amount,
      currency: paymentData.currency || 'USD',
      payment_method: paymentData.provider, // ecocash, onemoney, telecash
      status: 'pending',
      // Add provider-specific fields
      ...(paymentData.provider === 'ecocash' && { ecocash_number: paymentData.phoneNumber }),
      ...(paymentData.provider === 'onemoney' && { onemoney_number: paymentData.phoneNumber }),
      ...(paymentData.provider === 'telecash' && { telecash_number: paymentData.phoneNumber }),
      // Common mobile money fields
      mobile_money_reference: paymentData.reference || `MM${Date.now()}`,
      network: paymentData.network || 'Econet', // Econet, NetOne, Telecel
    };

    const transaction = await this.createTransaction(transactionData);

    const { data: updatedTransaction, error } = await supabase
      .from('transactions')
      .update({
        status: 'completed',
        payment_date: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', transaction.id)
      .select()
      .single();

    if (error) {
      throw new BadRequestException(`Failed to process payment: ${error.message}`);
    }

    return updatedTransaction;
  }

  async processBankTransfer(orderId: string, paymentData: any): Promise<Transaction> {
    const supabase = this.supabaseService.getClient();
    
    const transaction = await this.createTransaction({
      order_id: orderId,
      amount: paymentData.amount,
      currency: paymentData.currency || 'USD',
      payment_method: 'bank_transfer',
      status: 'pending',
      bank_transfer_reference: paymentData.reference,
      bank_name: paymentData.bankName,
      account_number: paymentData.accountNumber,
      branch_code: paymentData.branchCode,
      // Bank transfers might remain pending until manually verified
      requires_manual_verification: true,
    });

    // Return the pending transaction (admin will verify later)
    return transaction;
  }

  async findByOrderId(orderId: string): Promise<Transaction> {
    const supabase = this.supabaseService.getClient();
    
    const { data: transaction, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('order_id', orderId)
      .single();

    if (error || !transaction) {
      throw new NotFoundException('Transaction not found');
    }

    return transaction;
  }

  async updateTransactionStatus(id: string, status: string, adminId?: string): Promise<Transaction> {
    const supabase = this.supabaseService.getClient();
    
    const updateData: any = { 
      status,
      updated_at: new Date().toISOString(),
    };

    // Add admin verification info if provided
    if (adminId) {
      updateData.verified_by = adminId;
      updateData.verified_at = new Date().toISOString();
    }

    const { data: transaction, error } = await supabase
      .from('transactions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !transaction) {
      throw new NotFoundException('Transaction not found or update failed');
    }

    return transaction;
  }

  // ✅ ADDED: Additional useful methods for payments

  async findByUser(userId: string): Promise<Transaction[]> {
    const supabase = this.supabaseService.getClient();
    
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select(`
        *,
        order:orders (*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new BadRequestException(`Failed to fetch user transactions: ${error.message}`);
    }

    return transactions || [];
  }

  async verifyBankTransfer(transactionId: string, adminId: string, verificationData: any): Promise<Transaction> {
    const supabase = this.supabaseService.getClient();
    
    const { data: transaction, error } = await supabase
      .from('transactions')
      .update({
        status: 'completed',
        verified_by: adminId,
        verified_at: new Date().toISOString(),
        payment_date: new Date().toISOString(),
        bank_confirmation_reference: verificationData.confirmationReference,
        notes: verificationData.notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', transactionId)
      .eq('payment_method', 'bank_transfer')
      .select()
      .single();

    if (error || !transaction) {
      throw new BadRequestException('Failed to verify bank transfer');
    }

    return transaction;
  }

  async getPaymentStats(userId?: string): Promise<{
    total: number;
    completed: number;
    pending: number;
    failed: number;
    totalAmount: number;
  }> {
    const supabase = this.supabaseService.getClient();
    
    let query = supabase
      .from('transactions')
      .select('status, amount');

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: transactions, error } = await query;

    if (error) {
      throw new BadRequestException(`Failed to get payment stats: ${error.message}`);
    }

    if (!transactions || transactions.length === 0) {
      return {
        total: 0,
        completed: 0,
        pending: 0,
        failed: 0,
        totalAmount: 0,
      };
    }

    const stats = {
      total: transactions.length,
      completed: transactions.filter(t => t.status === 'completed').length,
      pending: transactions.filter(t => t.status === 'pending').length,
      failed: transactions.filter(t => t.status === 'failed').length,
      totalAmount: transactions
        .filter(t => t.status === 'completed')
        .reduce((sum, t) => sum + (t.amount || 0), 0),
    };

    return stats;
  }
}