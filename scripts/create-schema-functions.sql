-- Schema bilgilerini döndüren RPC fonksiyonları

-- 1. Trigger'ları getiren fonksiyon
CREATE OR REPLACE FUNCTION get_schema_triggers()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_agg(
        json_build_object(
            'trigger_name', t.tgname,
            'table_name', c.relname,
            'function_name', p.proname,
            'timing', CASE t.tgtype & 66
                WHEN 2 THEN 'BEFORE'
                WHEN 64 THEN 'INSTEAD OF'
                ELSE 'AFTER'
            END,
            'events', CASE t.tgtype & 28
                WHEN 4 THEN 'INSERT'
                WHEN 8 THEN 'DELETE'
                WHEN 16 THEN 'UPDATE'
                WHEN 12 THEN 'INSERT, DELETE'
                WHEN 20 THEN 'INSERT, UPDATE'
                WHEN 24 THEN 'DELETE, UPDATE'
                WHEN 28 THEN 'INSERT, DELETE, UPDATE'
            END,
            'description', obj_description(t.oid, 'pg_trigger')
        )
    ) INTO result
    FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_proc p ON t.tgfoid = p.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public'
      AND NOT t.tgisinternal
    ORDER BY c.relname, t.tgname;

    RETURN COALESCE(result, '[]'::json);
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'Error in get_schema_triggers: %', SQLERRM;
        RETURN '[]'::json;
END;
$$;

-- 2. Index'leri getiren fonksiyon
CREATE OR REPLACE FUNCTION get_schema_indexes()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_agg(
        json_build_object(
            'index_name', i.relname,
            'table_name', t.relname,
            'columns', array_agg(a.attname ORDER BY a.attnum),
            'description', obj_description(i.oid, 'pg_class'),
            'definition', pg_get_indexdef(i.oid),
            'is_unique', x.indisunique,
            'is_primary', x.indisprimary
        )
    ) INTO result
    FROM pg_index x
    JOIN pg_class i ON i.oid = x.indexrelid
    JOIN pg_class t ON t.oid = x.indrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    LEFT JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(x.indkey)
    WHERE n.nspname = 'public'
      AND i.relname NOT LIKE 'pg_%'
    GROUP BY i.relname, t.relname, i.oid, x.indisunique, x.indisprimary
    ORDER BY t.relname, i.relname;

    RETURN COALESCE(result, '[]'::json);
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'Error in get_schema_indexes: %', SQLERRM;
        RETURN '[]'::json;
END;
$$;

-- 3. RLS Policy'lerini getiren fonksiyon
CREATE OR REPLACE FUNCTION get_schema_policies()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_agg(
        json_build_object(
            'policy_name', pol.polname,
            'table_name', c.relname,
            'command', pol.polcmd,
            'permissive', pol.polpermissive,
            'roles', pol.polroles,
            'qual_expression', pol.polqual,
            'with_check_expression', pol.polwithcheck
        )
    ) INTO result
    FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
    ORDER BY c.relname, pol.polname;

    RETURN COALESCE(result, '[]'::json);
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'Error in get_schema_policies: %', SQLERRM;
        RETURN '[]'::json;
END;
$$;

-- 4. Tüm tabloları getiren fonksiyon
CREATE OR REPLACE FUNCTION get_schema_tables()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_agg(
        json_build_object(
            'table_name', tablename,
            'schema_name', schemaname,
            'has_indexes', (
                SELECT COUNT(*) > 0
                FROM pg_indexes
                WHERE schemaname = 'public' AND tablename = t.tablename
            ),
            'has_triggers', (
                SELECT COUNT(*) > 0
                FROM pg_trigger tr
                JOIN pg_class c ON tr.tgrelid = c.oid
                JOIN pg_namespace n ON c.relnamespace = n.oid
                WHERE n.nspname = 'public' AND c.relname = t.tablename
                AND NOT tr.tgisinternal
            )
        )
    ) INTO result
    FROM pg_tables t
    WHERE schemaname = 'public'
    ORDER BY tablename;

    RETURN COALESCE(result, '[]'::json);
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'Error in get_schema_tables: %', SQLERRM;
        RETURN '[]'::json;
END;
$$;