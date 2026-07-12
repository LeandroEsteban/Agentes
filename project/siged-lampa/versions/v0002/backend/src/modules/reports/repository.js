const { query } = require('../../database/pool');

async function countOpen(table, alias, dateColumn, departmentColumn, filters, extra = '') {
    const params = [];
    const conditions = [`${alias}.deleted_at IS NULL`, extra];
    if (filters.from) { params.push(filters.from); conditions.push(`${alias}.${dateColumn} >= $${params.length}`); }
    if (filters.to) { params.push(filters.to); conditions.push(`${alias}.${dateColumn} <= $${params.length}`); }
    if (filters.department_id && departmentColumn) { params.push(filters.department_id); conditions.push(`${alias}.${departmentColumn} = $${params.length}`); }
    const join = alias === 'd' ? 'JOIN document_statuses ds ON ds.id = d.status_id' : '';
    const result = await query(`SELECT count(*)::int AS total FROM ${table} ${alias} ${join} WHERE ${conditions.filter(Boolean).join(' AND ')}`, params);
    return result.rows[0].total;
}

async function dashboard(filters) {
    const [documentsOpen, expedientsOpen, oirsOpen, citizenRequestsOpen] = await Promise.all([
        countOpen('documents', 'd', 'created_at', 'department_id', filters, "ds.code NOT IN ('signed', 'issued', 'archived')"),
        countOpen('expedients', 'e', 'opened_at', 'department_id', filters, "e.status NOT IN ('closed', 'archived')"),
        countOpen('oirs_cases', 'o', 'submitted_at', 'assigned_department_id', filters, "o.status NOT IN ('closed', 'cancelled')"),
        countOpen('citizen_requests', 'cr', 'submitted_at', 'assigned_department_id', filters, "cr.status NOT IN ('resolved', 'closed', 'cancelled')"),
    ]);
    return { documents_open: documentsOpen, expedients_open: expedientsOpen, oirs_open: oirsOpen, citizen_requests_open: citizenRequestsOpen };
}

module.exports = { dashboard };
