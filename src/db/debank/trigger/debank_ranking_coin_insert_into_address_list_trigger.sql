CREATE OR REPLACE TRIGGER DEBANK_RANKING_COIN_INSERT_INTO_ADDRESS_LIST_TRIGGER 
AFTER INSERT ON "DEBANK-USER-ASSET-PORTFOLIO-COINS" 
	FOR EACH ROW
	EXECUTE
	    PROCEDURE DEBANK_RANKING_INSERT_INTO_ADDRESS_LIST_FUNC();
