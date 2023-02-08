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
	RETURN NEW;
END; 

$$ 