--remove record last 6 days
DELETE FROM record WHERE date <  NOW() -INTERVAL '6 DAYS'
