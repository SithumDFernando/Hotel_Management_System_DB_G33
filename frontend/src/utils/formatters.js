// =============================================================================
// frontend/src/utils/formatters.js
// =============================================================================
// Purpose:
//   Pure utility functions for formatting data values for display in the UI.
//   Centralised here so that currency formats, date formats, and other
//   presentation concerns are consistent across all components and pages.
//
// Functions to implement:
//
//   /**
//    * Formats a number as a Sri Lankan Rupee string.
//    * @param {number} amount
//    * @returns {string} e.g. "LKR 45,000.00"
//    */
//   export function formatCurrency(amount) {
//     if (amount == null) return '—';
//     return new Intl.NumberFormat('en-LK', {
//       style: 'currency',
//       currency: 'LKR',
//       minimumFractionDigits: 2,
//     }).format(amount);
//   }
//
//   /**
//    * Formats an ISO date string to a human-readable date.
//    * @param {string} dateStr - ISO date or datetime string
//    * @returns {string} e.g. "01 Feb 2026"
//    */
//   export function formatDate(dateStr) {
//     if (!dateStr) return '—';
//     return new Intl.DateTimeFormat('en-GB', {
//       day: '2-digit', month: 'short', year: 'numeric'
//     }).format(new Date(dateStr));
//   }
//
//   /**
//    * Formats an ISO datetime string to a date + time string.
//    * @param {string} datetimeStr
//    * @returns {string} e.g. "01 Feb 2026, 14:30"
//    */
//   export function formatDateTime(datetimeStr) {
//     if (!datetimeStr) return '—';
//     return new Intl.DateTimeFormat('en-GB', {
//       day: '2-digit', month: 'short', year: 'numeric',
//       hour: '2-digit', minute: '2-digit',
//     }).format(new Date(datetimeStr));
//   }
//
//   /**
//    * Calculates the number of nights between two date strings.
//    * Used for the live cost preview on BookingCheckout page.
//    * @param {string} checkIn  - ISO date string "YYYY-MM-DD"
//    * @param {string} checkOut - ISO date string "YYYY-MM-DD"
//    * @returns {number} number of nights (e.g. 3)
//    */
//   export function calculateNights(checkIn, checkOut) {
//     if (!checkIn || !checkOut) return 0;
//     const msPerDay = 24 * 60 * 60 * 1000;
//     return Math.round((new Date(checkOut) - new Date(checkIn)) / msPerDay);
//   }
//
// Usage:
//   import { formatCurrency, formatDate, calculateNights } from '../utils/formatters';
//   formatCurrency(15000)    → "LKR 15,000.00"
//   formatDate('2026-02-01') → "01 Feb 2026"
//   calculateNights('2026-02-01', '2026-02-05') → 4
// =============================================================================

// TODO: Implement formatters.js
