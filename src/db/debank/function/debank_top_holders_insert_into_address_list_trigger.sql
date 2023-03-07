CREATE OR REPLACE FUNCTION DEBANK_TOP_HOLDERS_INSERT_INTO_ADDRESS_LIST_FUNC
() RETURNS TRIGGER LANGUAGE PLPGSQL AS
	$$ BEGIN
	INSERT INTO
	    public."debank-user-address-list"(
	        user_address,
	        debank_top_holders_time
	    )
	VALUES (
	        NEW.user_address,
	        NEW.updated_at
	    ) ON CONFLICT (user_address)
	DO
	UPDATE
	SET
	    debank_top_holders_time = NEW.updated_at;
WITH coin AS (
  SELECT
      db_id
  FROM
      public."debank-coins"
  WHERE
      symbol = NEW.symbol
)
insert into "debank-top-holders_link_debank-coins"  (
user_address,coin_id
)
select
NEW.user_address,coin.db_id
from coin
 on conflict do nothing;
	RETURN NEW;
END;

$$
