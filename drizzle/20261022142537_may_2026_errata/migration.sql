-- May 2026 FAQ/Errata corrections to the seeded rules data.

-- p.124 Ball & Chain: append the Chomped sentence to the third paragraph, which
-- is the last paragraph of the skill text.
UPDATE "skill"
SET "rules" = "rules" || E' A player performing a Ball & Chain Action cannot be prevented from moving by the Chomped condition.'
WHERE "name" = 'Ball & Chain'
  AND "rules" NOT LIKE '%cannot be prevented from moving by the Chomped condition.';--> statement-breakpoint

-- p.165 Chaos Renegades Ogre: Loner (4+) becomes Loner (3+).
DELETE FROM "skill_to_position"
WHERE "skill_name" = 'Loner (4+)' AND "position_id" = 'efHYUCp1Amj6SEs';--> statement-breakpoint
INSERT INTO "skill_to_position" ("skill_name", "position_id")
VALUES ('Loner (3+)', 'efHYUCp1Amj6SEs')
ON CONFLICT DO NOTHING;--> statement-breakpoint

-- p.167 Dwarf Runner (Dwarf roster): add Agility (A) to secondary skills.
UPDATE "position"
SET "secondary" = "secondary" | 2
WHERE "id" = 'CH7I8SWRTg2neFD';--> statement-breakpoint

-- p.180 Old World Alliance Altern Forest Treeman: add Loner (4+) to Skills and Traits.
INSERT INTO "skill_to_position" ("skill_name", "position_id")
VALUES ('Loner (4+)', 'yuEYfX6SiXo6mKz')
ON CONFLICT DO NOTHING;--> statement-breakpoint

-- p.181 Orc Goblin Lineman: PA 3+ becomes PA 4+.
UPDATE "position"
SET "pa" = 4
WHERE "id" = '3mXoV0gRGZZa76y';
