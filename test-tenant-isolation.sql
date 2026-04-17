-- ============================================
-- TENANT ISOLATION TESTING SCRIPT
-- AristoTest Multi-Tenant System
-- ============================================

\echo '=== TENANT SETUP VERIFICATION ==='
\echo ''

-- 1. Verify tenants exist
\echo '1. Current Tenants:'
SELECT id, name, slug, type, is_active,
       (settings->>'maxUsers')::int as max_users,
       (settings->>'aiCreditsMonthly')::int as ai_credits
FROM tenants
ORDER BY id;

\echo ''
\echo '2. Users per Tenant:'
SELECT
  t.name as tenant_name,
  u.role,
  COUNT(*) as user_count
FROM users u
JOIN tenants t ON u.tenant_id = t.id
GROUP BY t.name, u.role
ORDER BY t.name, u.role;

\echo ''
\echo '=== DATA ISOLATION TESTING ==='
\echo ''

-- 2. Test Quiz Isolation
\echo '3. Quizzes per Tenant:'
SELECT
  COALESCE(t.name, 'NO TENANT') as tenant_name,
  COUNT(q.id) as quiz_count,
  COUNT(DISTINCT q.creator_id) as unique_creators
FROM quizzes q
LEFT JOIN tenants t ON q.tenant_id = t.id
GROUP BY t.name
ORDER BY t.name;

-- 3. Test Video Isolation
\echo ''
\echo '4. Videos per Tenant:'
SELECT
  COALESCE(t.name, 'NO TENANT') as tenant_name,
  COUNT(v.id) as video_count,
  COUNT(DISTINCT v.creator_id) as unique_creators,
  pg_size_pretty(SUM(v.file_size_bytes::bigint)) as total_size
FROM videos v
LEFT JOIN tenants t ON v.tenant_id = t.id
GROUP BY t.name
ORDER BY t.name;

-- 4. Test Manual Isolation
\echo ''
\echo '5. Manuals per Tenant:'
SELECT
  COALESCE(t.name, 'NO TENANT') as tenant_name,
  COUNT(m.id) as manual_count,
  COUNT(DISTINCT m.user_id) as unique_uploaders
FROM manuals m
LEFT JOIN tenants t ON m.tenant_id = t.id
GROUP BY t.name
ORDER BY t.name;

-- 5. Test Classroom Isolation
\echo ''
\echo '6. Classrooms per Tenant:'
SELECT
  COALESCE(t.name, 'NO TENANT') as tenant_name,
  COUNT(c.id) as classroom_count,
  SUM((SELECT COUNT(*) FROM classroom_enrollments WHERE classroom_id = c.id)) as total_enrollments
FROM classrooms c
LEFT JOIN tenants t ON c.tenant_id = t.id
GROUP BY t.name
ORDER BY t.name;

-- 6. Test Training Program Isolation
\echo ''
\echo '7. Training Programs per Tenant:'
SELECT
  COALESCE(t.name, 'NO TENANT') as tenant_name,
  COUNT(tp.id) as program_count
FROM training_programs tp
LEFT JOIN tenants t ON tp.tenant_id = t.id
GROUP BY t.name
ORDER BY t.name;

-- 7. Test Interactive Video Isolation
\echo ''
\echo '8. Interactive Video Layers per Tenant:'
SELECT
  COALESCE(t.name, 'NO TENANT') as tenant_name,
  COUNT(ivl.id) as layer_count,
  COUNT(DISTINCT ivl.video_id) as videos_with_layers
FROM interactive_video_layers ivl
LEFT JOIN videos v ON ivl.video_id = v.id
LEFT JOIN tenants t ON v.tenant_id = t.id
GROUP BY t.name
ORDER BY t.name;

-- 8. Test AI Generated Quiz Isolation
\echo ''
\echo '9. AI Generated Quizzes per Tenant:'
SELECT
  COALESCE(t.name, 'NO TENANT') as tenant_name,
  COUNT(agq.id) as ai_quiz_count
FROM ai_generated_quizzes agq
LEFT JOIN manuals m ON agq.manual_id = m.id
LEFT JOIN tenants t ON m.tenant_id = t.id
GROUP BY t.name
ORDER BY t.name;

\echo ''
\echo '=== POTENTIAL ISOLATION ISSUES ==='
\echo ''

-- 9. Find records without tenant_id
\echo '10. Records WITHOUT tenant_id (Should be 0 or justified):'
\echo ''
\echo 'Quizzes without tenant:'
SELECT COUNT(*) as count, 'quizzes' as table_name FROM quizzes WHERE tenant_id IS NULL;

\echo 'Videos without tenant:'
SELECT COUNT(*) as count, 'videos' as table_name FROM videos WHERE tenant_id IS NULL;

\echo 'Manuals without tenant:'
SELECT COUNT(*) as count, 'manuals' as table_name FROM manuals WHERE tenant_id IS NULL;

\echo 'Users without tenant:'
SELECT COUNT(*) as count, 'users' as table_name FROM users WHERE tenant_id IS NULL;

\echo 'Classrooms without tenant:'
SELECT COUNT(*) as count, 'classrooms' as table_name FROM classrooms WHERE tenant_id IS NULL;

\echo ''
\echo '=== CROSS-TENANT ACCESS TEST ==='
\echo ''

-- 10. Verify no cross-tenant references
\echo '11. Cross-tenant Quiz Sessions (Should be 0):'
SELECT COUNT(*) as cross_tenant_sessions
FROM quiz_sessions qs
JOIN quizzes q ON qs.quiz_id = q.id
JOIN users u ON qs.host_id = u.id
WHERE q.tenant_id != u.tenant_id;

\echo ''
\echo '12. Cross-tenant Video Uploads (Should be 0):'
SELECT COUNT(*) as cross_tenant_videos
FROM videos v
JOIN users u ON v.creator_id = u.id
WHERE v.tenant_id != u.tenant_id;

\echo ''
\echo '=== SUMMARY ==='
\echo ''

-- Summary statistics
\echo '13. Overall System Statistics:'
SELECT
  t.name as tenant,
  t.type as tenant_type,
  (SELECT COUNT(*) FROM users WHERE tenant_id = t.id) as users,
  (SELECT COUNT(*) FROM quizzes WHERE tenant_id = t.id) as quizzes,
  (SELECT COUNT(*) FROM videos WHERE tenant_id = t.id) as videos,
  (SELECT COUNT(*) FROM manuals WHERE tenant_id = t.id) as manuals,
  (SELECT COUNT(*) FROM classrooms WHERE tenant_id = t.id) as classrooms
FROM tenants t
WHERE t.is_active = true
ORDER BY t.id;

\echo ''
\echo '=== TEST COMPLETE ==='