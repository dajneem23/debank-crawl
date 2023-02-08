CREATE TRIGGER DEBANK_WHALES_INSERT_INTO_ADDRESS_LIST_TRIGGER 
	AFTER
	INSERT
	    ON "debank-whales" FOR EACH ROW
	EXECUTE
	    PROCEDURE debank_whales_insert_into_address_list_func();
