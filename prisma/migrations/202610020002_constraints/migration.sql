-- Forward-only validation: these constraints fail rather than discard existing data.
ALTER TABLE "WorkshopSession" ADD CONSTRAINT "session_capacity_positive" CHECK (capacity > 0), ADD CONSTRAINT "session_times_valid" CHECK ("endsAt" > "startsAt" AND "registerDeadline" <= "startsAt");
ALTER TABLE "Workshop" ADD CONSTRAINT "workshop_prices_valid" CHECK ("priceAdult" >= 0 AND "priceChild" >= 0 AND "durationMin" > 0 AND "minAge" >= 0);
ALTER TABLE "Registration" ADD CONSTRAINT "registration_counts_valid" CHECK (adults >= 0 AND children >= 0 AND adults + children > 0), ADD CONSTRAINT "registration_price_snapshot" CHECK ("totalAmount" = adults * "priceAdult" + children * "priceChild" AND "priceAdult" >= 0 AND "priceChild" >= 0);
ALTER TABLE "Video" ADD CONSTRAINT "video_duration_valid" CHECK ("durationSec" >= 0 AND "viewCount" >= 0);
CREATE FUNCTION audit_append_only() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'AuditLog is append-only'; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER audit_no_update_delete BEFORE UPDATE OR DELETE ON "AuditLog" FOR EACH ROW EXECUTE FUNCTION audit_append_only();
