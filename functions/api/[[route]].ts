import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { createClient } from '@supabase/supabase-js'

// 환경 변수 타입 정의
interface Env {
    SUPABASE_URL: string
    SUPABASE_SERVICE_ROLE_KEY: string
}

// Hono 앱 생성
const app = new Hono<{ Bindings: Env }>()

// CORS 설정
app.use('*', cors({
    origin: ['http://localhost:5173', 'https://crm3.pages.dev'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
}))

// Supabase 클라이언트 미들웨어
app.use('*', async (c, next) => {
    const supabase = createClient(
        c.env.SUPABASE_URL,
        c.env.SUPABASE_SERVICE_ROLE_KEY
    )
    c.set('supabase' as never, supabase)
    await next()
})

// 헬스 체크 엔드포인트
app.get('/api/health', (c) => {
    return c.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// ============ Customers API ============
app.get('/api/customers', async (c) => {
    const supabase = c.get('supabase' as never) as ReturnType<typeof createClient>

    const page = parseInt(c.req.query('page') || '1')
    const limit = parseInt(c.req.query('limit') || '20')
    const search = c.req.query('search') || ''
    const status = c.req.query('status') || ''
    const managerId = c.req.query('managerId') || ''
    const sortBy = c.req.query('sortBy') || 'created_at'
    const sortOrder = c.req.query('sortOrder') || 'desc'

    const offset = (page - 1) * limit

    let query = supabase
        .from('customers')
        .select('*', { count: 'exact' })

    if (search) {
        query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`)
    }
    if (status) {
        query = query.eq('status', status)
    }
    if (managerId) {
        query = query.eq('manager_id', managerId)
    }

    const sortColumn = sortBy === 'createdAt' ? 'created_at' :
        sortBy === 'updatedAt' ? 'updated_at' : sortBy

    query = query.order(sortColumn, { ascending: sortOrder === 'asc' })
    query = query.range(offset, offset + limit - 1)

    const { data, count, error } = await query

    if (error) {
        return c.json({ error: error.message }, 500)
    }

    // 담당자 ID 목록 수집
    const managerIds = [...new Set((data || []).map(c => c.manager_id).filter(Boolean))]

    let managersMap: Record<string, string> = {}
    if (managerIds.length > 0) {
        const { data: managers } = await supabase
            .from('employees')
            .select('id, full_name')
            .in('id', managerIds)

        if (managers) {
            managersMap = Object.fromEntries(managers.map(m => [m.id, m.full_name]))
        }
    }

    // snake_case → camelCase 변환
    const customers = (data || []).map(row => ({
        id: row.id,
        name: row.name,
        phone: row.phone,
        email: row.email,
        address: row.address,
        gender: row.gender,
        birthdate: row.birthdate,
        company: row.company,
        jobTitle: row.job_title,
        source: row.source,
        status: row.status,
        managerId: row.manager_id,
        managerName: managersMap[row.manager_id] || null,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    }))

    return c.json({
        data: customers,
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit),
    })
})

app.get('/api/customers/:id', async (c) => {
    const supabase = c.get('supabase' as never) as ReturnType<typeof createClient>
    const id = c.req.param('id')

    const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .single()

    if (error) {
        return c.json({ error: error.message }, error.code === 'PGRST116' ? 404 : 500)
    }

    // 담당자 이름 조회
    let managerName = null
    if (data.manager_id) {
        const { data: manager } = await supabase
            .from('employees')
            .select('full_name')
            .eq('id', data.manager_id)
            .single()
        managerName = manager?.full_name || null
    }

    return c.json({
        id: data.id,
        name: data.name,
        phone: data.phone,
        email: data.email,
        address: data.address,
        gender: data.gender,
        birthdate: data.birthdate,
        company: data.company,
        jobTitle: data.job_title,
        source: data.source,
        status: data.status,
        managerId: data.manager_id,
        managerName,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
    })
})

app.post('/api/customers', async (c) => {
    const supabase = c.get('supabase' as never) as ReturnType<typeof createClient>
    const body = await c.req.json()

    const dbInput = {
        name: body.name,
        phone: body.phone,
        email: body.email,
        address: body.address,
        gender: body.gender,
        birthdate: body.birthdate,
        company: body.company,
        job_title: body.jobTitle,
        source: body.source,
        status: body.status || 'new',
        manager_id: body.managerId,
    }

    const { data, error } = await supabase
        .from('customers')
        .insert(dbInput)
        .select('*')
        .single()

    if (error) {
        return c.json({ error: error.message }, 500)
    }

    return c.json(data, 201)
})

app.put('/api/customers/:id', async (c) => {
    const supabase = c.get('supabase' as never) as ReturnType<typeof createClient>
    const id = c.req.param('id')
    const body = await c.req.json()

    const dbInput: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
    }

    if (body.name !== undefined) dbInput.name = body.name
    if (body.phone !== undefined) dbInput.phone = body.phone
    if (body.email !== undefined) dbInput.email = body.email
    if (body.address !== undefined) dbInput.address = body.address
    if (body.gender !== undefined) dbInput.gender = body.gender
    if (body.birthdate !== undefined) dbInput.birthdate = body.birthdate
    if (body.company !== undefined) dbInput.company = body.company
    if (body.jobTitle !== undefined) dbInput.job_title = body.jobTitle
    if (body.source !== undefined) dbInput.source = body.source
    if (body.status !== undefined) dbInput.status = body.status
    if (body.managerId !== undefined) dbInput.manager_id = body.managerId

    const { data, error } = await supabase
        .from('customers')
        .update(dbInput)
        .eq('id', id)
        .select('*')
        .single()

    if (error) {
        return c.json({ error: error.message }, 500)
    }

    return c.json(data)
})

app.delete('/api/customers/:id', async (c) => {
    const supabase = c.get('supabase' as never) as ReturnType<typeof createClient>
    const id = c.req.param('id')

    const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id)

    if (error) {
        return c.json({ error: error.message }, 500)
    }

    return c.json({ success: true })
})

// ============ Contracts API ============
app.get('/api/contracts/:customerId', async (c) => {
    const supabase = c.get('supabase' as never) as ReturnType<typeof createClient>
    const customerId = c.req.param('customerId')

    const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })

    if (error) {
        return c.json({ error: error.message }, 500)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const contracts = (data || []).map((row: any) => ({
        id: row.id,
        customerId: row.customer_id,
        insuranceCompany: row.insurance_company,
        productName: row.product_name,
        premium: row.premium,
        paymentPeriod: row.payment_period,
        memo: row.memo,
        createdBy: row.created_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        authorName: '작성자',
    }))

    return c.json(contracts)
})

app.post('/api/contracts', async (c) => {
    const supabase = c.get('supabase' as never) as ReturnType<typeof createClient>
    const body = await c.req.json()

    const { data, error } = await supabase
        .from('contracts')
        .insert({
            customer_id: body.customerId,
            insurance_company: body.insuranceCompany,
            product_name: body.productName,
            premium: body.premium,
            payment_period: body.paymentPeriod,
            memo: body.memo,
            created_by: body.createdBy,
        })
        .select()
        .single()

    if (error) {
        return c.json({ error: error.message }, 500)
    }

    return c.json(data, 201)
})

app.put('/api/contracts/:id', async (c) => {
    const supabase = c.get('supabase' as never) as ReturnType<typeof createClient>
    const id = c.req.param('id')
    const body = await c.req.json()

    const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
    }

    if (body.insuranceCompany !== undefined) updateData.insurance_company = body.insuranceCompany
    if (body.productName !== undefined) updateData.product_name = body.productName
    if (body.premium !== undefined) updateData.premium = body.premium
    if (body.paymentPeriod !== undefined) updateData.payment_period = body.paymentPeriod
    if (body.memo !== undefined) updateData.memo = body.memo

    const { data, error } = await supabase
        .from('contracts')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

    if (error) {
        return c.json({ error: error.message }, 500)
    }

    return c.json(data)
})

app.delete('/api/contracts/:id', async (c) => {
    const supabase = c.get('supabase' as never) as ReturnType<typeof createClient>
    const id = c.req.param('id')

    const { error } = await supabase
        .from('contracts')
        .delete()
        .eq('id', id)

    if (error) {
        return c.json({ error: error.message }, 500)
    }

    return c.json({ success: true })
})

// ============ Notes API ============
app.get('/api/notes/:customerId', async (c) => {
    const supabase = c.get('supabase' as never) as ReturnType<typeof createClient>
    const customerId = c.req.param('customerId')

    const { data, error } = await supabase
        .from('customer_notes')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })

    if (error) {
        return c.json({ error: error.message }, 500)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const notes = (data || []).map((row: any) => ({
        id: row.id,
        customerId: row.customer_id,
        content: row.content,
        createdBy: row.created_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        authorName: '작성자',
    }))

    return c.json(notes)
})

app.post('/api/notes', async (c) => {
    const supabase = c.get('supabase' as never) as ReturnType<typeof createClient>
    const body = await c.req.json()

    const { data, error } = await supabase
        .from('customer_notes')
        .insert({
            customer_id: body.customerId,
            content: body.content,
            created_by: body.createdBy,
        })
        .select()
        .single()

    if (error) {
        return c.json({ error: error.message }, 500)
    }

    return c.json(data, 201)
})

app.put('/api/notes/:id', async (c) => {
    const supabase = c.get('supabase' as never) as ReturnType<typeof createClient>
    const id = c.req.param('id')
    const body = await c.req.json()

    const { data, error } = await supabase
        .from('customer_notes')
        .update({
            content: body.content,
            updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

    if (error) {
        return c.json({ error: error.message }, 500)
    }

    return c.json(data)
})

app.delete('/api/notes/:id', async (c) => {
    const supabase = c.get('supabase' as never) as ReturnType<typeof createClient>
    const id = c.req.param('id')

    const { error } = await supabase
        .from('customer_notes')
        .delete()
        .eq('id', id)

    if (error) {
        return c.json({ error: error.message }, 500)
    }

    return c.json({ success: true })
})

// ============ Employees API ============
app.get('/api/employees', async (c) => {
    const supabase = c.get('supabase' as never) as ReturnType<typeof createClient>

    const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('created_at', { ascending: false })

    if (error) {
        return c.json({ error: error.message }, 500)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const employees = (data || []).map((row: any) => ({
        id: row.id,
        email: row.email,
        fullName: row.full_name,
        securityLevel: row.security_level,
        organizationId: row.organization_id,
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    }))

    return c.json(employees)
})

app.get('/api/employees/email/:email', async (c) => {
    const supabase = c.get('supabase' as never) as ReturnType<typeof createClient>
    const email = c.req.param('email')

    const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('email', email)
        .single()

    if (error) {
        return c.json({ error: error.message }, error.code === 'PGRST116' ? 404 : 500)
    }

    return c.json({
        id: data.id,
        email: data.email,
        fullName: data.full_name,
        securityLevel: data.security_level,
        organizationId: data.organization_id,
        isActive: data.is_active,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
    })
})

app.post('/api/employees', async (c) => {
    const supabase = c.get('supabase' as never) as ReturnType<typeof createClient>
    const body = await c.req.json()

    const { data, error } = await supabase
        .from('employees')
        .insert({
            id: body.id,
            email: body.email,
            full_name: body.fullName,
            security_level: body.securityLevel,
            organization_id: body.organizationId,
            is_active: body.isActive ?? true,
        })
        .select()
        .single()

    if (error) {
        return c.json({ error: error.message }, 500)
    }

    return c.json(data, 201)
})

app.put('/api/employees/:id', async (c) => {
    const supabase = c.get('supabase' as never) as ReturnType<typeof createClient>
    const id = c.req.param('id')
    const body = await c.req.json()

    const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
    }

    if (body.fullName !== undefined) updateData.full_name = body.fullName
    if (body.securityLevel !== undefined) updateData.security_level = body.securityLevel
    if (body.isActive !== undefined) updateData.is_active = body.isActive

    const { data, error } = await supabase
        .from('employees')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

    if (error) {
        return c.json({ error: error.message }, 500)
    }

    return c.json(data)
})

app.delete('/api/employees/:id', async (c) => {
    const supabase = c.get('supabase' as never) as ReturnType<typeof createClient>
    const id = c.req.param('id')

    // Soft delete
    const { error } = await supabase
        .from('employees')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id)

    if (error) {
        return c.json({ error: error.message }, 500)
    }

    return c.json({ success: true })
})

app.put('/api/employees/:id/restore', async (c) => {
    const supabase = c.get('supabase' as never) as ReturnType<typeof createClient>
    const id = c.req.param('id')

    const { data, error } = await supabase
        .from('employees')
        .update({ is_active: true, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

    if (error) {
        return c.json({ error: error.message }, 500)
    }

    return c.json(data)
})

// ============ Sources API ============
app.get('/api/sources', async (c) => {
    const supabase = c.get('supabase' as never) as ReturnType<typeof createClient>

    const { data, error } = await supabase
        .from('sources')
        .select('*')
        .order('name', { ascending: true })

    if (error) {
        return c.json({ error: error.message }, 500)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sources = (data || []).map((row: any) => ({
        id: row.id,
        name: row.name,
        createdAt: row.created_at,
    }))

    return c.json(sources)
})

app.post('/api/sources', async (c) => {
    const supabase = c.get('supabase' as never) as ReturnType<typeof createClient>
    const body = await c.req.json()

    const { data, error } = await supabase
        .from('sources')
        .insert({ name: body.name })
        .select()
        .single()

    if (error) {
        return c.json({ error: error.message }, 500)
    }

    return c.json({ id: data.id, name: data.name, createdAt: data.created_at }, 201)
})

app.put('/api/sources/:id', async (c) => {
    const supabase = c.get('supabase' as never) as ReturnType<typeof createClient>
    const id = c.req.param('id')
    const body = await c.req.json()

    const { data, error } = await supabase
        .from('sources')
        .update({ name: body.name })
        .eq('id', id)
        .select()
        .single()

    if (error) {
        return c.json({ error: error.message }, 500)
    }

    return c.json({ id: data.id, name: data.name, createdAt: data.created_at })
})

app.delete('/api/sources/:id', async (c) => {
    const supabase = c.get('supabase' as never) as ReturnType<typeof createClient>
    const id = c.req.param('id')

    const { error } = await supabase
        .from('sources')
        .delete()
        .eq('id', id)

    if (error) {
        return c.json({ error: error.message }, 500)
    }

    return c.json({ success: true })
})

// ============ Dashboard API ============
app.get('/api/dashboard', async (c) => {
    const supabase = c.get('supabase' as never) as ReturnType<typeof createClient>
    const managerId = c.req.query('managerId') || ''

    let query = supabase
        .from('customers')
        .select('id, status', { count: 'exact' })

    if (managerId) {
        query = query.eq('manager_id', managerId)
    }

    const { data: customers, count } = await query

    const statusCounts = {
        new: 0,
        contacted: 0,
        consulting: 0,
        closed: 0,
    }

    if (customers) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        customers.forEach((customer: any) => {
            const status = customer.status as keyof typeof statusCounts
            if (status in statusCounts) {
                statusCounts[status]++
            }
        })
    }

    // 최근 등록된 고객 5명
    let recentQuery = supabase
        .from('customers')
        .select('id, name, status, created_at, manager_id')
        .order('created_at', { ascending: false })
        .limit(5)

    if (managerId) {
        recentQuery = recentQuery.eq('manager_id', managerId)
    }

    const { data: recentData } = await recentQuery

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const managerIds = [...new Set((recentData || []).map((c: any) => c.manager_id).filter(Boolean))]
    let managersMap: Record<string, string> = {}

    if (managerIds.length > 0) {
        const { data: managers } = await supabase
            .from('employees')
            .select('id, full_name')
            .in('id', managerIds)

        if (managers) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            managersMap = Object.fromEntries(managers.map((m: any) => [m.id, m.full_name]))
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recentCustomers = (recentData || []).map((row: any) => ({
        id: row.id,
        name: row.name,
        status: row.status,
        createdAt: row.created_at,
        managerName: managersMap[row.manager_id] || null,
    }))

    return c.json({
        totalCustomers: count || 0,
        newCustomers: statusCounts.new,
        contactedCustomers: statusCounts.contacted,
        consultingCustomers: statusCounts.consulting,
        closedCustomers: statusCounts.closed,
        recentCustomers,
    })
})

// ============ Pending Approvals API ============
app.get('/api/pending-approvals', async (c) => {
    const supabase = c.get('supabase' as never) as ReturnType<typeof createClient>

    const { data, error } = await supabase
        .from('pending_approvals')
        .select('*')
        .eq('status', 'pending')
        .order('requested_at', { ascending: true })

    if (error) {
        return c.json({ error: error.message }, 500)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const approvals = (data || []).map((row: any) => ({
        id: row.id,
        email: row.email,
        status: row.status,
        requestedAt: row.requested_at,
        processedBy: row.processed_by,
        processedAt: row.processed_at,
    }))

    return c.json(approvals)
})

app.post('/api/pending-approvals', async (c) => {
    const supabase = c.get('supabase' as never) as ReturnType<typeof createClient>
    const body = await c.req.json()

    // Check if already exists
    const { data: existing } = await supabase
        .from('pending_approvals')
        .select('*')
        .eq('email', body.email)
        .eq('status', 'pending')
        .single()

    if (existing) {
        return c.json(existing)
    }

    const { data, error } = await supabase
        .from('pending_approvals')
        .insert({ email: body.email })
        .select()
        .single()

    if (error) {
        return c.json({ error: error.message }, 500)
    }

    return c.json(data, 201)
})

app.put('/api/pending-approvals/:id/approve', async (c) => {
    const supabase = c.get('supabase' as never) as ReturnType<typeof createClient>
    const id = c.req.param('id')
    const body = await c.req.json()

    // Create employee first
    const { data: employee, error: empError } = await supabase
        .from('employees')
        .insert({
            id: body.employeeId,
            email: body.email,
            full_name: body.fullName,
            security_level: body.securityLevel,
            organization_id: body.organizationId,
        })
        .select()
        .single()

    if (empError) {
        return c.json({ error: empError.message }, 500)
    }

    // Update approval status
    await supabase
        .from('pending_approvals')
        .update({
            status: 'approved',
            processed_by: body.approvedBy,
            processed_at: new Date().toISOString(),
        })
        .eq('id', id)

    return c.json(employee)
})

app.put('/api/pending-approvals/:id/reject', async (c) => {
    const supabase = c.get('supabase' as never) as ReturnType<typeof createClient>
    const id = c.req.param('id')
    const body = await c.req.json()

    const { error } = await supabase
        .from('pending_approvals')
        .update({
            status: 'rejected',
            processed_by: body.rejectedBy,
            processed_at: new Date().toISOString(),
        })
        .eq('id', id)

    if (error) {
        return c.json({ error: error.message }, 500)
    }

    return c.json({ success: true })
})

// ============ Organizations API ============
app.get('/api/organizations', async (c) => {
    const supabase = c.get('supabase' as never) as ReturnType<typeof createClient>

    const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .order('name', { ascending: true })

    if (error) {
        return c.json({ error: error.message }, 500)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const managerIds = [...new Set((data || []).map((o: any) => o.manager_id).filter(Boolean))]
    let managersMap: Record<string, string> = {}

    if (managerIds.length > 0) {
        const { data: managers } = await supabase
            .from('employees')
            .select('id, full_name')
            .in('id', managerIds)

        if (managers) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            managersMap = Object.fromEntries(managers.map((m: any) => [m.id, m.full_name]))
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const organizations = (data || []).map((row: any) => ({
        id: row.id,
        name: row.name,
        parentId: row.parent_id,
        managerId: row.manager_id,
        managerName: row.manager_id ? managersMap[row.manager_id] || null : null,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    }))

    return c.json(organizations)
})

app.get('/api/organizations/:id', async (c) => {
    const supabase = c.get('supabase' as never) as ReturnType<typeof createClient>
    const id = c.req.param('id')

    const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', id)
        .single()

    if (error) {
        return c.json({ error: error.message }, error.code === 'PGRST116' ? 404 : 500)
    }

    let managerName = null
    if (data.manager_id) {
        const { data: manager } = await supabase
            .from('employees')
            .select('full_name')
            .eq('id', data.manager_id)
            .single()
        managerName = manager?.full_name || null
    }

    return c.json({
        id: data.id,
        name: data.name,
        parentId: data.parent_id,
        managerId: data.manager_id,
        managerName,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
    })
})

app.post('/api/organizations', async (c) => {
    const supabase = c.get('supabase' as never) as ReturnType<typeof createClient>
    const body = await c.req.json()

    const { data, error } = await supabase
        .from('organizations')
        .insert({
            name: body.name,
            parent_id: body.parentId || null,
            manager_id: body.managerId || null,
        })
        .select()
        .single()

    if (error) {
        return c.json({ error: error.message }, 500)
    }

    return c.json(data, 201)
})

app.put('/api/organizations/:id', async (c) => {
    const supabase = c.get('supabase' as never) as ReturnType<typeof createClient>
    const id = c.req.param('id')
    const body = await c.req.json()

    const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
    }

    if (body.name !== undefined) updateData.name = body.name
    if (body.parentId !== undefined) updateData.parent_id = body.parentId
    if (body.managerId !== undefined) updateData.manager_id = body.managerId

    const { data, error } = await supabase
        .from('organizations')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

    if (error) {
        return c.json({ error: error.message }, 500)
    }

    return c.json(data)
})

app.delete('/api/organizations/:id', async (c) => {
    const supabase = c.get('supabase' as never) as ReturnType<typeof createClient>
    const id = c.req.param('id')

    const { error } = await supabase
        .from('organizations')
        .delete()
        .eq('id', id)

    if (error) {
        return c.json({ error: error.message }, 500)
    }

    return c.json({ success: true })
})

// ============ Team API ============
app.post('/api/team/members', async (c) => {
    const supabase = c.get('supabase' as never) as ReturnType<typeof createClient>
    const body = await c.req.json()
    const { employeeId, securityLevel } = body

    let employeeIds: string[] = [employeeId]

    if (securityLevel === 'F1') {
        const { data: allEmployees, error } = await supabase
            .from('employees')
            .select('id')
            .eq('is_active', true)

        if (error) {
            return c.json({ error: error.message }, 500)
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        employeeIds = (allEmployees || []).map((e: any) => e.id)
    }

    // 각 사원의 고객 통계 조회
    const teamMembers = []
    for (const empId of employeeIds) {
        const { data: emp } = await supabase
            .from('employees')
            .select('*')
            .eq('id', empId)
            .single()

        if (!emp) continue

        const { data: customers } = await supabase
            .from('customers')
            .select('status')
            .eq('manager_id', empId)

        const customersByStatus = { new: 0, contacted: 0, consulting: 0, closed: 0 }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ; (customers || []).forEach((c: any) => {
                const status = c.status as keyof typeof customersByStatus
                if (status in customersByStatus) {
                    customersByStatus[status]++
                }
            })

        teamMembers.push({
            id: emp.id,
            email: emp.email,
            fullName: emp.full_name,
            securityLevel: emp.security_level,
            organizationId: emp.organization_id,
            isActive: emp.is_active,
            customerCount: customers?.length || 0,
            customersByStatus,
        })
    }

    return c.json(teamMembers)
})

app.post('/api/team/stats', async (c) => {
    const supabase = c.get('supabase' as never) as ReturnType<typeof createClient>
    const body = await c.req.json()
    const { memberIds } = body

    const { data: customers, error } = await supabase
        .from('customers')
        .select('status')
        .in('manager_id', memberIds)

    if (error) {
        return c.json({ error: error.message }, 500)
    }

    const byStatus = { new: 0, contacted: 0, consulting: 0, closed: 0 }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ; (customers || []).forEach((c: any) => {
            const status = c.status as keyof typeof byStatus
            if (status in byStatus) {
                byStatus[status]++
            }
        })

    return c.json({
        totalCustomers: customers?.length || 0,
        byStatus,
    })
})

app.put('/api/customers/:id/transfer', async (c) => {
    const supabase = c.get('supabase' as never) as ReturnType<typeof createClient>
    const id = c.req.param('id')
    const body = await c.req.json()

    const { error } = await supabase
        .from('customers')
        .update({
            manager_id: body.newManagerId,
            updated_at: new Date().toISOString(),
        })
        .eq('id', id)

    if (error) {
        return c.json({ error: error.message }, 500)
    }

    return c.json({ success: true })
})

export default app



