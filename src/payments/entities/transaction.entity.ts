import { Order } from '../../orders/entities/order.entity';


export class Transaction {
  id: string;

  order_id: string;

  order: Order;

  amount: number;

  currency: string;

  payment_method: string;

  status: string;

  mobile_money_reference: string;

  bank_transfer_reference: string;

  ecocash_number: string;

  onemoney_number: string;

  payment_date: Date;

  created_at: Date;

  updated_at: Date;
}