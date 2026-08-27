# 🏢 TENANT SETUP - AristoTest Multi-Tenant System

**Date:** 2025-09-29
**Status:** ✅ Production Ready
**Version:** 1.1.0

---

## 📊 Current Tenant Configuration

### Tenant 1: Dynamtek (Internal)
- **ID:** 1
- **Slug:** `dynamtek`
- **Type:** `internal` (System Administrator)
- **Status:** ✅ Active
- **Max Users:** 1,000
- **Max Storage:** 100 GB
- **AI Credits/Month:** 100,000
- **Features:** ALL (Full Access)
- **Branding:**
  - Primary Color: `#0066CC`
  - Secondary Color: `#00A3FF`
  - Logo: `/images/dynamtek-logo.png`

**Current Data:**
- Users: 4 (1 super_admin, 1 teacher, 2 students)
- Quizzes: 29
- Videos: 30
- Manuals: 4
- Classrooms: 12

### Tenant 2: WBI (Client)
- **ID:** 3
- **Slug:** `wbi`
- **Type:** `client` (External Customer)
- **Status:** ✅ Active
- **Max Users:** 500
- **Max Storage:** 50 GB
- **AI Credits/Month:** 1,000
- **Features:** Quizzes, Videos, Manuals, Classrooms, Training, Certificates
- **Branding:**
  - Primary Color: `#1E40AF`
  - Secondary Color: `#3B82F6`
  - Logo: `/images/wbi-logo.png`

**Current Data:**
- Users: 3 (1 admin, 1 teacher, 1 student)
- Quizzes: 0 (Ready for creation)
- Videos: 0 (Ready for uploads)
- Manuals: 0 (Ready for uploads)
- Classrooms: 0 (Ready for creation)

---

## 👥 User Access

### Dynamtek Users
| Email                     | Role        | Password              | Access Level                |
|--------------------------|-------------|-----------------------|----------------------------|
| admin@aristotest.com     | super_admin | Dynamtek2024!Admin    | Full system access         |
| profesor@aristotest.com  | teacher     | Teacher2024!Pass      | Create content & manage    |
| test@demo.com            | student     | Student2024!Demo      | Participate in activities  |
| alumno@aristotest.com    | student     | Student2024!Juan      | Participate in activities  |

**Note:** All passwords are securely hashed with bcrypt (10 rounds) ✅

### WBI Users
| Email              | Role    | Password          | Access Level              |
|-------------------|---------|-------------------|---------------------------|
| admin@wbi.com     | admin   | WBI2024!Admin     | Tenant administration     |
| teacher@wbi.com   | teacher | WBI2024!Teacher   | Create content & manage   |
| student@wbi.com   | student | WBI2024!Student   | Participate in activities |

**Note:** All passwords are securely hashed with bcrypt (10 rounds) ✅

---

## 🔒 Tenant Isolation Status

### ✅ Verified Isolation
All data is now properly isolated by tenant_id:

| Resource Type           | Status | Dynamtek | WBI | Notes                    |
|------------------------|--------|----------|-----|--------------------------|
| Users                  | ✅ OK  | 4        | 3   | Fully isolated           |
| Quizzes                | ✅ OK  | 29       | 0   | Fixed tenant_id          |
| Videos                 | ✅ OK  | 30       | 0   | Fixed tenant_id          |
| Manuals                | ✅ OK  | 4        | 0   | Already isolated         |
| Classrooms             | ✅ OK  | 12       | 0   | Already isolated         |
| Interactive Layers     | ✅ OK  | All      | 0   | Through video relations  |
| Quiz Sessions          | ✅ OK  | All      | 0   | No cross-tenant access   |
| Training Programs      | ✅ OK  | 0        | 0   | Ready for use            |

### 🔍 Isolation Tests Passed
- ✅ No records without tenant_id
- ✅ No cross-tenant quiz sessions
- ✅ No cross-tenant video uploads
- ✅ All users have tenant association
- ✅ Middleware enforces tenant context

---

## 🛠️ Technical Implementation

### Database Tables with Tenant Isolation (18 tables)
1. `users` - User accounts
2. `quizzes` - Quiz templates
3. `questions` - Quiz questions
4. `quiz_sessions` - Active quiz sessions
5. `participants` - Session participants
6. `answers` - Participant responses
7. `videos` - Video content
8. `interactive_video_layers` - Video interaction layers
9. `interactive_video_results` - Video session results
10. `manuals` - PDF documents
11. `manual_chats` - AI chat history
12. `manual_summaries` - AI-generated summaries
13. `ai_generated_quizzes` - AI-created quizzes
14. `classrooms` - Virtual classrooms
15. `classroom_enrollments` - Student enrollments
16. `training_programs` - Training programs
17. `program_quizzes` - Program-quiz associations
18. `certificates` - Completion certificates

### Middleware Protection
- `tenantMiddleware` - Enforces tenant context on all requests
- `superAdminOnly` - Restricts internal Dynamtek operations
- `tenantAdminOnly` - Restricts admin-level operations
- `instructorOnly` - Restricts content creation
- `crossTenantAccess` - Allows super admins to manage all tenants
- `validateTenantOwnership` - Prevents unauthorized resource access

---

## 📝 How to Test Tenant Isolation

### Quick Test Script
```bash
# Run the comprehensive isolation test
psql "postgresql://aristotest:AristoTest2024@localhost/aristotest" \
  -f test-tenant-isolation.sql
```

### Manual Testing Steps

#### 1. Login as WBI Teacher
```bash
# Use credentials: teacher@wbi.com
# Create a quiz
# Upload a video
# Upload a manual
```

#### 2. Login as Dynamtek Teacher
```bash
# Use credentials: profesor@aristotest.com
# Verify you CANNOT see WBI content
# Verify you CAN see Dynamtek content
```

#### 3. Login as Super Admin
```bash
# Use credentials: admin@aristotest.com
# Verify you CAN see all tenants
# Test cross-tenant operations
```

### Expected Results
- ✅ Users only see their tenant's data
- ✅ Super admins see all data
- ✅ Cross-tenant operations blocked for regular users
- ✅ API enforces tenant filtering

---

## 🚀 Creating Content for WBI

### Step 1: Login as WBI Teacher
```
Email: teacher@wbi.com
Password: [Set a secure password]
```

### Step 2: Create First Quiz
1. Navigate to `/quizzes/create`
2. Fill in quiz details
3. Add questions
4. Publish quiz

### Step 3: Upload First Video
1. Navigate to `/videos/upload`
2. Select video file
3. Add metadata
4. Process and publish

### Step 4: Upload First Manual
1. Navigate to `/manuals/upload`
2. Select PDF file
3. System extracts text
4. Generate AI summary (optional)

### Step 5: Create Classroom
1. Navigate to `/classrooms/create`
2. Set classroom name
3. Generate enrollment code
4. Assign content

---

## 🔑 Password Setup Instructions

### For Production Use
All user passwords should be properly hashed with bcrypt:

```sql
-- Update user password (example)
UPDATE users
SET password = crypt('NewSecurePassword123!', gen_salt('bf'))
WHERE email = 'teacher@wbi.com';
```

### Recommended Password Policy
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- At least 1 special character

---

## 📊 Monitoring Tenant Usage

### Check Tenant Statistics
```sql
SELECT
  t.name as tenant,
  t.type,
  (SELECT COUNT(*) FROM users WHERE tenant_id = t.id) as users,
  (SELECT COUNT(*) FROM quizzes WHERE tenant_id = t.id) as quizzes,
  (SELECT COUNT(*) FROM videos WHERE tenant_id = t.id) as videos,
  (SELECT COUNT(*) FROM manuals WHERE tenant_id = t.id) as manuals,
  (SELECT COUNT(*) FROM classrooms WHERE tenant_id = t.id) as classrooms,
  (settings->>'maxUsers')::int as max_users,
  (settings->>'aiCreditsMonthly')::int as ai_credits
FROM tenants t
WHERE t.is_active = true
ORDER BY t.id;
```

### Check Resource Usage
```sql
-- Videos storage per tenant
SELECT
  t.name,
  COUNT(v.id) as video_count,
  pg_size_pretty(SUM(v.file_size_bytes::bigint)) as total_size,
  (t.settings->>'maxStorage')::bigint as max_storage_bytes
FROM videos v
JOIN tenants t ON v.tenant_id = t.id
GROUP BY t.id, t.name, t.settings;
```

---

## ⚠️ Important Security Notes

### 1. Tenant Isolation
- **NEVER** bypass tenant middleware in production
- **ALWAYS** use `tenantMiddleware` on protected routes
- **VERIFY** user tenant matches resource tenant

### 2. Super Admin Access
- Only Dynamtek (internal) users can be super admins
- Super admins can see/modify all tenant data
- Log all super admin cross-tenant operations

### 3. Data Migration
- When migrating data between tenants, use official procedures
- Maintain audit logs of all data movements
- Verify tenant_id on all records

---

## 🔄 Adding a New Tenant

```sql
INSERT INTO tenants (name, slug, type, settings, branding, is_active)
VALUES (
  'New Client Name',
  'new-client',
  'client',
  '{
    "maxUsers": 250,
    "maxStorage": 26843545600,
    "features": ["quizzes", "videos", "manuals", "classrooms"],
    "allowPublicQuizzes": false,
    "allowVideoUpload": true,
    "aiCreditsMonthly": 500
  }'::jsonb,
  '{
    "primaryColor": "#6366F1",
    "secondaryColor": "#8B5CF6",
    "logo": "/images/client-logo.png"
  }'::jsonb,
  true
) RETURNING id, name, slug;
```

Then create admin user for the new tenant.

---

## 📞 Support & Troubleshooting

### Common Issues

#### Issue: User can see other tenant's data
**Solution:** Check if tenant middleware is applied to the route

#### Issue: Super admin cannot access tenant
**Solution:** Verify user role is 'super_admin' and tenant type is 'internal'

#### Issue: Videos/quizzes without tenant_id
**Solution:** Run the fix script:
```sql
UPDATE quizzes q SET tenant_id = u.tenant_id
FROM users u WHERE q.creator_id = u.id AND q.tenant_id IS NULL;

UPDATE videos v SET tenant_id = u.tenant_id
FROM users u WHERE v.creator_id = u.id AND v.tenant_id IS NULL;
```

---

## ✅ Tenant Setup Checklist

- [x] Dynamtek tenant configured as internal
- [x] WBI tenant created as client
- [x] All users have tenant associations
- [x] Tenant isolation verified (0 records without tenant_id)
- [x] Cross-tenant access tests passed
- [x] Middleware protection active
- [x] Passwords set for all users (Dynamtek & WBI)
- [ ] Test content created for WBI
- [ ] Frontend branding configured per tenant
- [ ] Production monitoring enabled

---

**Document Status:** Ready for Production
**Last Updated:** 2025-09-29
**Next Review:** When adding new tenant