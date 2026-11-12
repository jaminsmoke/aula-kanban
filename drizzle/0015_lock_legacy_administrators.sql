CREATE TRIGGER legacy_admin_lock_insert BEFORE INSERT ON administrators
WHEN EXISTS (SELECT 1 FROM transition_state WHERE id = 'administrators-v2')
BEGIN SELECT RAISE(ABORT, 'Administrator migration in progress'); END;
--> statement-breakpoint
CREATE TRIGGER legacy_admin_lock_update BEFORE UPDATE ON administrators
WHEN EXISTS (SELECT 1 FROM transition_state WHERE id = 'administrators-v2')
BEGIN SELECT RAISE(ABORT, 'Administrator migration in progress'); END;
--> statement-breakpoint
CREATE TRIGGER legacy_admin_lock_delete BEFORE DELETE ON administrators
WHEN EXISTS (SELECT 1 FROM transition_state WHERE id = 'administrators-v2')
BEGIN SELECT RAISE(ABORT, 'Administrator migration in progress'); END;
--> statement-breakpoint
CREATE TRIGGER legacy_profile_lock_insert BEFORE INSERT ON administrator_profiles
WHEN EXISTS (SELECT 1 FROM transition_state WHERE id = 'administrators-v2')
BEGIN SELECT RAISE(ABORT, 'Administrator migration in progress'); END;
--> statement-breakpoint
CREATE TRIGGER legacy_profile_lock_update BEFORE UPDATE ON administrator_profiles
WHEN EXISTS (SELECT 1 FROM transition_state WHERE id = 'administrators-v2')
BEGIN SELECT RAISE(ABORT, 'Administrator migration in progress'); END;
--> statement-breakpoint
CREATE TRIGGER legacy_profile_lock_delete BEFORE DELETE ON administrator_profiles
WHEN EXISTS (SELECT 1 FROM transition_state WHERE id = 'administrators-v2')
BEGIN SELECT RAISE(ABORT, 'Administrator migration in progress'); END;
