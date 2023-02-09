CREATE OR REPLACE FUNCTION DEBANK_RANKING_INSERT_INTO_ADDRESS_LIST_FUNC
() RETURNS TRIGGER LANGUAGE PLPGSQL AS 
	$$ BEGIN
	INSERT INTO
	    public."debank-user-address-list"(
	        user_address,
	        last_crawl_id,
	        debank_ranking_time
	    )
	VALUES (
	        NEW.user_address,
	        NEW.crawl_id,
	        NEW.updated_at
	    ) ON CONFLICT (user_address)
	DO
	UPDATE
	SET
	    debank_ranking_time = NEW.updated_at,
	    last_crawl_id = NEW.crawl_id;
	RETURN NEW;
END; 

$$ 