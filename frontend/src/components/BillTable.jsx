// =============================================================================
// frontend/src/components/BillTable.jsx
// =============================================================================
// Purpose:
//   Displays the full bill breakdown for a booking in a structured table.
//   Shows room charges, service charges, discount, tax, total, amount paid,
//   and outstanding balance. Also lists individual payment transactions.
//   Used in the ReceptionistDashboard and ManagerDashboard.
//
// Props:
//   bill: {
//     bill_id:             string (UUID)
//     booking_id:          string (UUID)
//     room_charges:        number
//     service_charges:     number
//     discount_amount:     number
//     tax_amount:          number
//     total_amount:        number
//     amount_paid:         number
//     outstanding_balance: number
//     balance_flag:        boolean   — true = unpaid balance exists
//     generated_at:        string    — ISO timestamp
//   }
//   payments: Array<{
//     payment_id:     string
//     amount:         number
//     payment_method: string
//     paid_at:        string    — ISO timestamp
//     notes:          string | null
//   }>
//   onRecordPayment: function (optional) — opens a payment form modal/inline form
//
// What to implement here:
//   - A breakdown table with rows for each charge component.
//   - Highlight the "Outstanding Balance" row in red if balance_flag = true,
//     green if fully paid.
//   - A separate "Payment History" section listing each payment in `payments`.
//   - A "Record Payment" button (if onRecordPayment is provided).
//
// Dependencies:
//   - ../utils/formatters (formatCurrency, formatDateTime)
// =============================================================================

// TODO: Implement BillTable.jsx
