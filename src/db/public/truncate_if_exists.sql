CREATE OR REPLACE FUNCTION public.truncate_if_exists(_table text, _schema text DEFAULT NULL)
  RETURNS text
  LANGUAGE plpgsql AS
$func$
DECLARE
   _qual_tbl text := concat_ws('.', quote_ident(_schema), quote_ident(_table));
   _row_found bool;
BEGIN
   IF to_regclass(_qual_tbl) IS NOT NULL THEN   -- table exists
      EXECUTE 'SELECT EXISTS (SELECT FROM ' || _qual_tbl || ')'
      INTO _row_found;

      IF _row_found THEN                        -- table is not empty
         EXECUTE 'TRUNCATE ' || _qual_tbl;
         RETURN 'Table truncated: ' || _qual_tbl;
      ELSE  -- optional!
         RETURN 'Table exists but is empty: ' || _qual_tbl;
      END IF;
   ELSE  -- optional!
      RETURN 'Table not found: ' || _qual_tbl;
   END IF;
END
$func$;
