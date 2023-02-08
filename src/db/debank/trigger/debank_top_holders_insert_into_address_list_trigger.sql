CREATE TRIGGER debank_top_holders_insert_into_address_list_trigger
  AFTER INSERT
  ON "debank-top-holders"
  FOR EACH ROW
  EXECUTE PROCEDURE debank_top_holders_insert_into_address_list_func();
