-- Multi-tenancy, part 2: rewrite every RLS policy to scope by organization.
-- Several existing policies had NO organization check at all before this
-- (e.g. vendors_select was just "any authenticated user"; the
-- is_procurement_or_admin() branch on requests/purchase_orders/equipment/etc.
-- had no org boundary either) — those were real cross-tenant leaks, not just
-- theoretical, and this migration is the fix, not just an addition.

create policy organizations_select on organizations for select using (id = current_organization_id());

drop policy departments_select on departments;
drop policy departments_write on departments;
create policy departments_select on departments for select using (organization_id = current_organization_id());
create policy departments_write on departments for all
  using (organization_id = current_organization_id() and is_admin_role())
  with check (organization_id = current_organization_id() and is_admin_role());

drop policy profiles_select on profiles;
drop policy profiles_update_self on profiles;
drop policy profiles_delete_admin on profiles;
create policy profiles_select on profiles for select using (organization_id = current_organization_id());
create policy profiles_update_self on profiles for update using (
  id = auth.uid() or (organization_id = current_organization_id() and is_admin_role())
);
create policy profiles_delete_admin on profiles for delete using (
  organization_id = current_organization_id() and is_admin_role()
);

drop policy vendors_select on vendors;
drop policy vendors_write on vendors;
create policy vendors_select on vendors for select using (organization_id = current_organization_id());
create policy vendors_write on vendors for all
  using (organization_id = current_organization_id() and is_procurement_or_admin())
  with check (organization_id = current_organization_id() and is_procurement_or_admin());

drop policy budgets_select on budgets;
drop policy budgets_write on budgets;
create policy budgets_select on budgets for select using (organization_id = current_organization_id());
create policy budgets_write on budgets for all
  using (organization_id = current_organization_id() and is_admin_role())
  with check (organization_id = current_organization_id() and is_admin_role());

drop policy approval_rules_select on approval_rules;
drop policy approval_rules_write on approval_rules;
create policy approval_rules_select on approval_rules for select using (organization_id = current_organization_id());
create policy approval_rules_write on approval_rules for all
  using (organization_id = current_organization_id() and is_admin_role())
  with check (organization_id = current_organization_id() and is_admin_role());

drop policy requests_select on requests;
drop policy requests_insert on requests;
drop policy requests_update on requests;
create policy requests_select on requests for select using (
  organization_id = current_organization_id()
  and (requester_id = auth.uid() or department_id = current_department_id() or is_procurement_or_admin())
);
create policy requests_insert on requests for insert with check (
  organization_id = current_organization_id()
  and requester_id = auth.uid() and department_id = current_department_id()
);
create policy requests_update on requests for update using (
  organization_id = current_organization_id()
  and ((requester_id = auth.uid() and status = 'draft') or is_procurement_or_admin())
);

drop policy attachments_select on request_attachments;
drop policy comments_select on request_comments;
create policy attachments_select on request_attachments for select using (
  exists (select 1 from requests r where r.id = request_id and r.organization_id = current_organization_id() and (
    r.requester_id = auth.uid() or r.department_id = current_department_id() or is_procurement_or_admin()
  ))
);
create policy comments_select on request_comments for select using (
  exists (select 1 from requests r where r.id = request_id and r.organization_id = current_organization_id() and (
    r.requester_id = auth.uid() or r.department_id = current_department_id() or is_procurement_or_admin()
  ))
);

drop policy approvals_select on approvals;
create policy approvals_select on approvals for select using (
  exists (select 1 from requests r where r.id = approvals.request_id and r.organization_id = current_organization_id())
  and (
    approver_role = current_profile_role()
    or is_admin_role()
    or exists (select 1 from requests r where r.id = approvals.request_id and r.requester_id = auth.uid())
  )
);

drop policy delegations_select on delegations;
drop policy delegations_write on delegations;
create policy delegations_select on delegations for select using (
  organization_id = current_organization_id()
  and (approver_id = auth.uid() or delegate_id = auth.uid() or is_admin_role())
);
create policy delegations_write on delegations for all
  using (organization_id = current_organization_id() and (approver_id = auth.uid() or is_admin_role()))
  with check (organization_id = current_organization_id() and (approver_id = auth.uid() or is_admin_role()));

drop policy po_select on purchase_orders;
drop policy po_write on purchase_orders;
create policy po_select on purchase_orders for select using (
  organization_id = current_organization_id()
  and (department_id = current_department_id() or is_procurement_or_admin())
);
create policy po_write on purchase_orders for all
  using (organization_id = current_organization_id() and is_procurement_or_admin())
  with check (organization_id = current_organization_id() and is_procurement_or_admin());

drop policy po_line_select on po_line_items;
drop policy po_line_write on po_line_items;
create policy po_line_select on po_line_items for select using (
  exists (select 1 from purchase_orders po where po.id = po_id and po.organization_id = current_organization_id() and (
    po.department_id = current_department_id() or is_procurement_or_admin()
  ))
);
create policy po_line_write on po_line_items for all
  using (exists (select 1 from purchase_orders po where po.id = po_id and po.organization_id = current_organization_id()) and is_procurement_or_admin())
  with check (exists (select 1 from purchase_orders po where po.id = po_id and po.organization_id = current_organization_id()) and is_procurement_or_admin());

drop policy audit_select on audit_log;
create policy audit_select on audit_log for select using (
  organization_id = current_organization_id() and is_procurement_or_admin()
);

drop policy notifications_select on notifications;
drop policy notifications_update on notifications;
create policy notifications_select on notifications for select using (
  user_id = auth.uid() and organization_id = current_organization_id()
);
create policy notifications_update on notifications for update using (
  user_id = auth.uid() and organization_id = current_organization_id()
);

drop policy equipment_assets_select on equipment_assets;
drop policy equipment_assets_write on equipment_assets;
create policy equipment_assets_select on equipment_assets for select using (organization_id = current_organization_id());
create policy equipment_assets_write on equipment_assets for all
  using (organization_id = current_organization_id() and is_procurement_or_admin())
  with check (organization_id = current_organization_id() and is_procurement_or_admin());

drop policy equipment_leases_select on equipment_leases;
drop policy equipment_leases_write on equipment_leases;
create policy equipment_leases_select on equipment_leases for select using (
  exists (select 1 from equipment_assets a where a.id = asset_id and a.organization_id = current_organization_id())
);
create policy equipment_leases_write on equipment_leases for all
  using (exists (select 1 from equipment_assets a where a.id = asset_id and a.organization_id = current_organization_id()) and is_procurement_or_admin())
  with check (exists (select 1 from equipment_assets a where a.id = asset_id and a.organization_id = current_organization_id()) and is_procurement_or_admin());

drop policy rfqs_select on rfqs;
drop policy rfqs_write on rfqs;
create policy rfqs_select on rfqs for select using (
  exists (select 1 from requests r where r.id = request_id and r.organization_id = current_organization_id())
  and (is_procurement_or_admin() or exists (select 1 from requests r where r.id = rfqs.request_id and r.requester_id = auth.uid()))
);
create policy rfqs_write on rfqs for all
  using (exists (select 1 from requests r where r.id = request_id and r.organization_id = current_organization_id()) and is_procurement_or_admin())
  with check (exists (select 1 from requests r where r.id = request_id and r.organization_id = current_organization_id()) and is_procurement_or_admin());

drop policy rfq_quotes_select on rfq_quotes;
drop policy rfq_quotes_write on rfq_quotes;
create policy rfq_quotes_select on rfq_quotes for select using (
  exists (
    select 1 from rfqs q join requests r on r.id = q.request_id
    where q.id = rfq_id and r.organization_id = current_organization_id()
  )
  and (
    is_procurement_or_admin()
    or exists (select 1 from rfqs q join requests r on r.id = q.request_id where q.id = rfq_quotes.rfq_id and r.requester_id = auth.uid())
  )
);
create policy rfq_quotes_write on rfq_quotes for all
  using (
    exists (select 1 from rfqs q join requests r on r.id = q.request_id where q.id = rfq_id and r.organization_id = current_organization_id())
    and is_procurement_or_admin()
  )
  with check (
    exists (select 1 from rfqs q join requests r on r.id = q.request_id where q.id = rfq_id and r.organization_id = current_organization_id())
    and is_procurement_or_admin()
  );
