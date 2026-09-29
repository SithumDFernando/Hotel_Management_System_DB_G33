// =============================================================================
// frontend/src/components/ReportTable.jsx
// =============================================================================
// Purpose:
//   Generic, reusable table component for displaying any of the 5 management
//   reports. Accepts column definitions and data rows, keeping report pages
//   DRY — each report page only needs to define its columns and pass the data.
//
// Props:
//   title:    string                 — table heading (e.g. "Room Occupancy Report")
//   columns:  Array<{
//     key:    string,                — field name in the data row object
//     label:  string,                — column header text
//     format: function (optional),   — value formatter (e.g. formatCurrency)
//     align:  'left'|'right'|'center' (optional, default 'left')
//   }>
//   data:     Array<Object>          — rows to display (from API response)
//   isLoading: boolean               — shows a loading skeleton when true
//   error:     string | null         — shows an error message if present
//   emptyMessage: string (optional)  — text shown when data is an empty array
//
// What to implement here:
//   - Render a <table> with <thead> (from columns[].label) and <tbody> (from data).
//   - Apply column-specific formatters: e.g. formatCurrency for monetary columns.
//   - Show a loading spinner/skeleton rows when isLoading = true.
//   - Show an error alert when error is not null.
//   - Show emptyMessage when data is [] and not loading.
//   - Optional: sortable columns (click header to sort ascending/descending).
//   - Optional: CSV export button.
//
// Usage example:
//   <ReportTable
//     title="Monthly Revenue"
//     columns={[
//       { key: 'branch_name', label: 'Branch' },
//       { key: 'gross_revenue', label: 'Gross Revenue', format: formatCurrency, align: 'right' },
//     ]}
//     data={revenueData}
//     isLoading={isLoading}
//     error={error}
//   />
//
// Dependencies:
//   - ../utils/formatters (formatCurrency, formatDate, etc.)
// =============================================================================

// TODO: Implement ReportTable.jsx
