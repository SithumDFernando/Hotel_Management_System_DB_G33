-- =============================================================================
-- VIVA 4: Reporting views and a window function
-- =============================================================================

-- Top 3 services per branch: RANK() OVER (PARTITION BY branch ORDER BY qty).
-- Galle has a tie: two services share rank 2, and RANK() keeps both.
SELECT br.name AS branch, t.usage_rank, t.service_name, t.total_quantity
  FROM v_top_services_by_branch t
  JOIN branch br USING (branch_id)
 WHERE t.usage_rank <= 3
 ORDER BY br.name, t.usage_rank;

-- The backend runs a simple SELECT like this; the joins live in the view.
SELECT branch_name, year, month, total_gross_revenue, total_outstanding
  FROM v_monthly_revenue
 WHERE branch_name = 'SkyNest Colombo'
 ORDER BY year DESC, month DESC;
